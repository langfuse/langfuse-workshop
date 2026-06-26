import "../src/server/load-env";

import { randomUUID } from "node:crypto";
import { LangfuseClient } from "@langfuse/client";
import type { MapValue, ObservationLevel } from "@langfuse/core";
import { env } from "../src/server/env";
import {
  DEFAULT_TRACE_SEED_TAG,
  TraceSeedObservation,
  TraceSeedScore,
  TraceSeedSnapshot,
  TraceSeedTraceBundle,
  chunkIngestionBatch,
  countBy,
  defaultTraceSeedPath,
  hasFlag,
  orderObservationsParentFirst,
  readStringFlag,
  readTraceSeedSnapshot,
  withSeedSourcePromptMetadata
} from "./langfuse-trace-seed-lib";

type SeedIngestionEvent = Parameters<LangfuseClient["api"]["ingestion"]["batch"]>[0]["batch"][number];

async function main() {
  const inputPath = readStringFlag("--input") ?? defaultTraceSeedPath(import.meta.url);
  const dryRun = hasFlag("--dry-run");

  const snapshot = await readTraceSeedSnapshot(inputPath);
  validateSnapshot(snapshot, inputPath);

  const offsetMs = computeTimestampOffsetMs(snapshot, Date.now());
  logTimestampShift(snapshot, offsetMs);

  const events = buildIngestionEvents(snapshot, offsetMs);
  const batches = chunkIngestionBatch(events);
  const eventSummaryById = new Map(events.map((event) => [event.id, summarizeEvent(event)]));

  console.log(
    `Prepared ${events.length} ingestion events across ${batches.length} batches ` +
      `for ${snapshot.summary.exportedTraces} traces.`
  );
  console.log(`Event counts: ${JSON.stringify(countBy(events.map((event) => event.type)), null, 2)}`);

  if (dryRun) {
    console.log(`Dry run only. No data was imported from ${inputPath}.`);
    return;
  }

  const targetPublicKey =
    process.env.LANGFUSE_TARGET_PUBLIC_KEY ?? process.env.LANGFUSE_PUBLIC_KEY ?? "";
  const targetSecretKey =
    process.env.LANGFUSE_TARGET_SECRET_KEY ?? process.env.LANGFUSE_SECRET_KEY ?? "";
  const targetBaseUrl = process.env.LANGFUSE_TARGET_BASE_URL ?? env.langfuseBaseUrl;

  if (!targetPublicKey || !targetSecretKey) {
    throw new Error(
      "Import requires Langfuse credentials. Set LANGFUSE_TARGET_PUBLIC_KEY and LANGFUSE_TARGET_SECRET_KEY, or rely on LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY as a fallback."
    );
  }

  const usingFallbackCredentials =
    !process.env.LANGFUSE_TARGET_PUBLIC_KEY && !process.env.LANGFUSE_TARGET_SECRET_KEY;
  if (usingFallbackCredentials) {
    console.log("LANGFUSE_TARGET_* not set. Falling back to LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY.");
  }

  const langfuse = new LangfuseClient({
    publicKey: targetPublicKey,
    secretKey: targetSecretKey,
    baseUrl: targetBaseUrl
  });

  for (const [index, batch] of batches.entries()) {
    console.log(`Importing batch ${index + 1}/${batches.length} (${batch.length} events)...`);
    const response = await langfuse.api.ingestion.batch({ batch });

    if (response.errors.length > 0) {
      const details = response.errors
        .map((error) => {
          const summary = eventSummaryById.get(error.id);
          const label = summary ? `${error.id} (${summary})` : error.id;
          return `- ${label}: ${error.message ?? JSON.stringify(error.error ?? null)}`;
        })
        .join("\n");
      throw new Error(`Langfuse import failed with ${response.errors.length} ingestion errors:\n${details}`);
    }
  }

  console.log(`Imported ${snapshot.summary.exportedTraces} traces into ${targetBaseUrl}.`);
}

function validateSnapshot(snapshot: TraceSeedSnapshot, inputPath: string) {
  if (snapshot.schemaVersion !== 1) {
    throw new Error(
      `Unsupported trace seed schema version ${snapshot.schemaVersion} in ${inputPath}. Expected version 1.`
    );
  }
}

function buildIngestionEvents(snapshot: TraceSeedSnapshot, offsetMs: number) {
  const traceEvents = snapshot.traces.map((bundle) => buildTraceCreateEvent(bundle, offsetMs));
  const observationEvents = snapshot.traces.flatMap((bundle) =>
    orderObservationsParentFirst(bundle.observations).map((observation) =>
      buildObservationIngestionEvent(bundle, observation, offsetMs)
    )
  );
  const scoreEvents = snapshot.traces.flatMap((bundle) =>
    bundle.scores.map((score) => buildScoreCreateEvent(score, offsetMs))
  );

  return [...traceEvents, ...observationEvents, ...scoreEvents];
}

// Uniformly shifts every seeded timestamp so the most recent one lands at `nowMs`,
// preserving the original multi-day spread and each trace's internal timing.
function computeTimestampOffsetMs(snapshot: TraceSeedSnapshot, nowMs: number) {
  let latestMs = Number.NEGATIVE_INFINITY;

  const consider = (value: string | null | undefined) => {
    if (!value) return;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > latestMs) {
      latestMs = parsed;
    }
  };

  for (const bundle of snapshot.traces) {
    consider(bundle.trace.timestamp);
    for (const observation of bundle.observations) {
      consider(observation.startTime);
      consider(observation.endTime);
      consider(observation.completionStartTime);
    }
    for (const score of bundle.scores) {
      consider(score.timestamp);
    }
  }

  return Number.isFinite(latestMs) ? nowMs - latestMs : 0;
}

function shiftTimestamp(value: string, offsetMs: number) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed + offsetMs).toISOString();
}

function logTimestampShift(snapshot: TraceSeedSnapshot, offsetMs: number) {
  const days = (offsetMs / (1000 * 60 * 60 * 24)).toFixed(1);
  console.log(
    `Shifting all timestamps forward by ${days} day(s) so the newest of ${snapshot.summary.exportedTraces} traces lands at the current time.`
  );
}

// Environment all seeded data is ingested into. Overridable via env var; defaults to "production".
const SEED_ENVIRONMENT = process.env.LANGFUSE_SEED_ENVIRONMENT || "production";

function buildTraceCreateEvent(bundle: TraceSeedTraceBundle, offsetMs: number): SeedIngestionEvent {
  const tags = bundle.trace.tags.includes(DEFAULT_TRACE_SEED_TAG)
    ? bundle.trace.tags
    : [...bundle.trace.tags, DEFAULT_TRACE_SEED_TAG];

  const timestamp = shiftTimestamp(bundle.trace.timestamp, offsetMs);

  return {
    type: "trace-create",
    id: randomUUID(),
    timestamp,
    body: {
      id: bundle.trace.id,
      timestamp,
      name: bundle.trace.name ?? undefined,
      userId: bundle.trace.userId ?? undefined,
      input: bundle.trace.input,
      output: bundle.trace.output,
      sessionId: bundle.trace.sessionId ?? undefined,
      release: bundle.trace.release ?? undefined,
      version: bundle.trace.version ?? undefined,
      metadata: bundle.trace.metadata,
      tags,
      environment: SEED_ENVIRONMENT,
      public: false
    }
  };
}

function buildObservationIngestionEvent(
  bundle: TraceSeedTraceBundle,
  observation: TraceSeedObservation,
  offsetMs: number
): SeedIngestionEvent {
  const metadata = withImportedObservationMetadata(observation);
  const level = observation.level as ObservationLevel;
  const startTime = shiftTimestamp(observation.startTime, offsetMs);
  const endTime = observation.endTime ? shiftTimestamp(observation.endTime, offsetMs) : undefined;
  const completionStartTime = observation.completionStartTime
    ? shiftTimestamp(observation.completionStartTime, offsetMs)
    : undefined;
  const commonBody = {
    id: observation.id,
    traceId: bundle.trace.id,
    name: observation.name ?? undefined,
    startTime,
    endTime,
    input: observation.input,
    output: observation.output,
    metadata,
    level,
    statusMessage: observation.statusMessage ?? undefined,
    parentObservationId: observation.parentObservationId ?? undefined,
    version: observation.version ?? undefined,
    environment: SEED_ENVIRONMENT
  };

  if (observation.type === "GENERATION") {
    return {
      type: "generation-create",
      id: randomUUID(),
      timestamp: startTime,
      body: {
        ...commonBody,
        completionStartTime,
        model: observation.model ?? undefined,
        modelParameters: asPlainRecord(observation.modelParameters),
        usage: toLegacyUsage(observation.usageDetails),
        usageDetails: observation.usageDetails,
        costDetails: observation.costDetails
      }
    };
  }

  if (observation.type === "EVENT") {
    return {
      type: "event-create",
      id: randomUUID(),
      timestamp: startTime,
      body: {
        id: observation.id,
        traceId: bundle.trace.id,
        name: observation.name ?? undefined,
        startTime,
        metadata,
        input: observation.input,
        output: observation.output,
        level,
        statusMessage: observation.statusMessage ?? undefined,
        parentObservationId: observation.parentObservationId ?? undefined,
        version: observation.version ?? undefined,
        environment: SEED_ENVIRONMENT
      }
    };
  }

  // NOTE: The public batch ingestion API only accepts observation types
  // GENERATION/SPAN/EVENT (verified: `observation-create` with type AGENT/TOOL/etc.
  // is rejected 400 "Invalid request data"). Richer types like AGENT/TOOL are only
  // settable via the OTel ingestion path (span attribute `langfuse.observation.type`),
  // which is how the live agent produces them. So everything non-GENERATION/EVENT is
  // imported as a plain SPAN here.
  return {
    type: "span-create",
    id: randomUUID(),
    timestamp: startTime,
    body: {
      id: observation.id,
      traceId: bundle.trace.id,
      name: observation.name ?? undefined,
      startTime,
      endTime,
      metadata,
      input: observation.input,
      output: observation.output,
      level,
      statusMessage: observation.statusMessage ?? undefined,
      parentObservationId: observation.parentObservationId ?? undefined,
      version: observation.version ?? undefined,
      environment: SEED_ENVIRONMENT
    }
  };
}

function buildScoreCreateEvent(score: TraceSeedScore, offsetMs: number): SeedIngestionEvent {
  return {
    type: "score-create",
    id: randomUUID(),
    timestamp: shiftTimestamp(score.timestamp, offsetMs),
    body: {
      id: score.id,
      traceId: score.traceId,
      observationId: score.observationId ?? undefined,
      name: score.name,
      value: score.value,
      comment: score.comment ?? undefined,
      metadata: score.metadata,
      dataType: score.dataType,
      environment: SEED_ENVIRONMENT
    }
  };
}

function toLegacyUsage(usageDetails: Record<string, number> | undefined) {
  if (!usageDetails) return undefined;

  const input =
    usageDetails.input ??
    usageDetails.input_tokens ??
    usageDetails.prompt_tokens;
  const output =
    usageDetails.output ??
    usageDetails.output_tokens ??
    usageDetails.completion_tokens;

  if (typeof input !== "number" || typeof output !== "number") {
    return undefined;
  }

  return {
    input,
    output,
    total: usageDetails.total ?? usageDetails.total_tokens ?? input + output,
    unit: null
  };
}

function withImportedObservationMetadata(observation: TraceSeedObservation) {
  const metadata = withSeedSourcePromptMetadata(observation.metadata, observation.prompt);
  const seedSourceObservation = buildSeedSourceObservationMetadata(observation);

  if (!seedSourceObservation) {
    return metadata;
  }

  if (isPlainRecord(metadata)) {
    return {
      ...metadata,
      seedSourceObservation
    };
  }

  return {
    seedSourceObservation,
    sourceMetadata: metadata ?? null
  };
}

function buildSeedSourceObservationMetadata(observation: TraceSeedObservation) {
  const details: Record<string, unknown> = {};

  if (observation.type !== "SPAN") {
    details.type = observation.type;
  }

  if (observation.completionStartTime) {
    details.completionStartTime = observation.completionStartTime;
  }

  if (observation.model) {
    details.model = observation.model;
  }

  const modelParameters = asPlainRecord(observation.modelParameters);
  if (modelParameters) {
    details.modelParameters = modelParameters;
  }

  if (observation.usageDetails) {
    details.usageDetails = observation.usageDetails;
  }

  if (observation.costDetails) {
    details.costDetails = observation.costDetails;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

function summarizeEvent(event: SeedIngestionEvent) {
  const body = event.body as Record<string, unknown>;
  const bodyId = typeof body.id === "string" ? body.id : "unknown";
  const name = typeof body.name === "string" ? body.name : undefined;
  const traceId = typeof body.traceId === "string" ? body.traceId : undefined;

  return [event.type, bodyId, name, traceId].filter(Boolean).join(" | ");
}

function asPlainRecord(value: unknown) {
  if (!isPlainRecord(value)) {
    return undefined;
  }

  return value as Record<string, MapValue>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

void main();
