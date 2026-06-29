/**
 * OTel-based trace seed importer.
 *
 * Unlike scripts/import-trace-seed.ts (which uses the public batch ingestion REST
 * API and can therefore only ever create SPAN/GENERATION/EVENT observations), this
 * importer replays each snapshot trace through the Langfuse OpenTelemetry SDK. That
 * is the only ingestion path that preserves the richer observation types — AGENT,
 * TOOL, CHAIN, RETRIEVER, EVALUATOR, GUARDRAIL, EMBEDDING — exactly as the live agent
 * emits them and as the export captured them.
 *
 * How it works per trace bundle:
 *   1. propagateAttributes(...) sets trace-level attrs (name, sessionId, userId, tags,
 *      version, metadata) on every span created inside the callback.
 *   2. Observations are created parent-first via startObservation(name, attrs, {asType,
 *      startTime, parentSpanContext}). The first (root) observation starts a fresh OTel
 *      trace; every other observation is attached to its parent's captured span context,
 *      so the whole tree lands in one trace. Timestamps are backdated via startTime/end().
 *   3. The root sets trace input/output via setTraceIO(...).
 *   4. OTel-generated trace/observation IDs are captured so scores (which have no OTel
 *      path) can be re-pointed and sent via the REST score-create batch afterwards.
 *
 * All timestamps are shifted uniformly so the newest seeded event lands at "now",
 * preserving the original spread — same behaviour as the REST importer.
 *
 * NOT idempotent: OpenTelemetry generates fresh trace/span ids on every run, so each
 * invocation creates a brand-new set of traces (re-running doubles the data). This is
 * the inherent tradeoff of the OTel path vs the REST importer, which pins ids and can
 * be re-run safely. Run once, or clean up prior seed traces before re-running.
 *
 * Usage:
 *   npm run langfuse:seed:otel -- --input data/seed-traffic-followups-traces.json
 *   npm run langfuse:seed:otel -- --input <file> --limit 10
 *   npm run langfuse:seed:otel -- --input <file> --dry-run
 *   npm run langfuse:seed:otel -- --no-scores   (replay traces + observations only)
 */
import "../src/server/load-env";

// Stamp the same environment the REST importer uses ("production" by default) before
// the span processor is constructed, so seeded spans carry the expected environment.
const SEED_ENVIRONMENT = process.env.LANGFUSE_SEED_ENVIRONMENT || "production";
process.env.LANGFUSE_TRACING_ENVIRONMENT = process.env.LANGFUSE_TRACING_ENVIRONMENT || SEED_ENVIRONMENT;

import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseClient } from "@langfuse/client";
import {
  propagateAttributes,
  startObservation,
  type LangfuseObservation,
  type LangfuseObservationType,
  type ObservationLevel
} from "@langfuse/tracing";
import { randomUUID } from "node:crypto";
import { env } from "../src/server/env";
import {
  TraceSeedObservation,
  TraceSeedScore,
  TraceSeedSnapshot,
  TraceSeedTraceBundle,
  chunkIngestionBatch,
  defaultTraceSeedPath,
  hasFlag,
  orderObservationsParentFirst,
  readNumberFlag,
  readStringFlag,
  readTraceSeedSnapshot
} from "./langfuse-trace-seed-lib";

type SpanCtx = ReturnType<LangfuseObservation["otelSpan"]["spanContext"]>;
type ScoreEvent = Parameters<LangfuseClient["api"]["ingestion"]["batch"]>[0]["batch"][number];

// startObservation has per-asType overloads; we drive asType dynamically from the
// snapshot, so wrap it in a single loose signature to keep the call site simple.
const startObs = startObservation as unknown as (
  name: string,
  attributes: Record<string, unknown>,
  options: { asType?: LangfuseObservationType; startTime?: Date; parentSpanContext?: SpanCtx }
) => LangfuseObservation;

const langfuseSpanProcessor = new LangfuseSpanProcessor();
const sdk = new NodeSDK({ spanProcessors: [langfuseSpanProcessor] });

async function main() {
  const inputPath = readStringFlag("--input") ?? defaultTraceSeedPath(import.meta.url);
  const limit = readNumberFlag("--limit");
  const dryRun = hasFlag("--dry-run");
  const includeScores = !hasFlag("--no-scores");

  if (!env.langfusePublicKey || !env.langfuseSecretKey) {
    throw new Error("LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are required to seed traces.");
  }

  const snapshot = await readTraceSeedSnapshot(inputPath);
  validateSnapshot(snapshot, inputPath);

  const bundles = typeof limit === "number" ? snapshot.traces.slice(0, limit) : snapshot.traces;
  const offsetMs = computeTimestampOffsetMs(snapshot, Date.now());
  logTimestampShift(snapshot, offsetMs);

  const totalObservations = bundles.reduce((sum, b) => sum + b.observations.length, 0);
  const totalScores = includeScores ? bundles.reduce((sum, b) => sum + b.scores.length, 0) : 0;
  const typeCounts = countObservationTypes(bundles);
  console.log(
    `Replaying ${bundles.length} traces via OTel ` +
      `(${totalObservations} observations, ${includeScores ? `${totalScores} scores` : "scores skipped"}) into ${env.langfuseBaseUrl}.`
  );
  console.log(`Observation types preserved: ${formatTypeCounts(typeCounts)}.`);

  if (dryRun) {
    console.log("Dry run only. No spans or scores were sent.");
    return;
  }

  sdk.start();

  const scoreEvents: ScoreEvent[] = [];
  for (const [index, bundle] of bundles.entries()) {
    const { realTraceId, realObservationIds } = await replayTrace(bundle, offsetMs);
    if (includeScores) {
      for (const score of bundle.scores) {
        scoreEvents.push(buildScoreEvent(score, offsetMs, realTraceId, realObservationIds));
      }
    }
    console.log(`  [${index + 1}/${bundles.length}] ${bundle.trace.name ?? "trace"} (${bundle.observations.length} obs) ✓`);
  }

  // Flush spans first so the traces exist before their scores reference them.
  await langfuseSpanProcessor.forceFlush();
  if (includeScores) {
    await sendScores(scoreEvents);
  }
  await sdk.shutdown();

  console.log(
    `Done. Seeded ${bundles.length} traces, ${totalObservations} observations, ` +
      `${includeScores ? `${scoreEvents.length} scores` : "0 scores (skipped)"}.`
  );
}

// Replays a single trace bundle through OTel, returning the real (OTel-generated)
// trace id and a snapshot-observation-id -> real-observation-id map for scores.
async function replayTrace(bundle: TraceSeedTraceBundle, offsetMs: number) {
  const { trace } = bundle;
  const ordered = orderObservationsParentFirst(bundle.observations);

  const spanCtxBySnapshotId = new Map<string, SpanCtx>();
  const realObservationIds = new Map<string, string>();
  let realTraceId = "";

  await propagateAttributes(
    {
      traceName: trace.name ?? undefined,
      sessionId: trace.sessionId ?? undefined,
      userId: trace.userId ?? undefined,
      tags: trace.tags.length > 0 ? trace.tags : undefined,
      version: trace.version ?? undefined,
      metadata: toStringMetadata(trace.metadata)
    },
    async () => {
      let rootCtx: SpanCtx | undefined;

      for (const observation of ordered) {
        const startTime = new Date(Date.parse(observation.startTime) + offsetMs);
        const endTime = observation.endTime
          ? new Date(Date.parse(observation.endTime) + offsetMs)
          : startTime;

        // Parent-first ordering guarantees the parent already exists. Anything whose
        // parent can't be resolved (orphan / extra root) is attached to the first root
        // so the bundle stays a single trace instead of fragmenting.
        const explicitParent = observation.parentObservationId
          ? spanCtxBySnapshotId.get(observation.parentObservationId)
          : undefined;
        const parentSpanContext = explicitParent ?? rootCtx;

        const created = startObs(observation.name ?? "observation", buildAttributes(observation, offsetMs), {
          asType: toAsType(observation.type),
          startTime,
          parentSpanContext
        });

        const spanContext = created.otelSpan.spanContext();
        spanCtxBySnapshotId.set(observation.id, spanContext);
        realObservationIds.set(observation.id, created.id);

        if (!rootCtx) {
          rootCtx = spanContext;
          realTraceId = created.traceId;
          created.setTraceIO({ input: trace.input, output: trace.output });
        }

        created.end(endTime);
      }
    }
  );

  return { realTraceId, realObservationIds };
}

function buildAttributes(observation: TraceSeedObservation, offsetMs: number): Record<string, unknown> {
  const base: Record<string, unknown> = {
    input: observation.input,
    output: observation.output,
    metadata: buildObservationMetadata(observation.metadata),
    level: (observation.level as ObservationLevel) ?? "DEFAULT",
    environment: SEED_ENVIRONMENT,
    version: observation.version ?? undefined,
    statusMessage: observation.statusMessage ?? undefined
  };

  if (observation.type === "GENERATION" || observation.type === "EMBEDDING") {
    return {
      ...base,
      model: observation.model ?? undefined,
      modelParameters: observation.modelParameters as Record<string, string | number> | undefined,
      usageDetails: observation.usageDetails,
      costDetails: observation.costDetails,
      completionStartTime: observation.completionStartTime
        ? new Date(Date.parse(observation.completionStartTime) + offsetMs)
        : undefined,
      prompt: observation.prompt
        ? { name: observation.prompt.name, version: observation.prompt.version }
        : undefined
    };
  }

  return base;
}

function buildScoreEvent(
  score: TraceSeedScore,
  offsetMs: number,
  realTraceId: string,
  realObservationIds: Map<string, string>
): ScoreEvent {
  const timestamp = new Date(Date.parse(score.timestamp) + offsetMs).toISOString();
  const observationId = score.observationId ? realObservationIds.get(score.observationId) : undefined;

  return {
    type: "score-create",
    id: randomUUID(),
    timestamp,
    body: {
      // Fresh id, not the snapshot's score id: OTel replay generates new trace ids
      // each run, and scores are upserted by id. Reusing a snapshot score id that a
      // previous import already created would upsert the OLD score (leaving it pointed
      // at the old trace) instead of attaching a score to this run's new trace.
      id: randomUUID(),
      traceId: realTraceId,
      observationId: observationId ?? undefined,
      name: score.name,
      // value is number for NUMERIC/BOOLEAN, string for CATEGORICAL/TEXT/CORRECTION.
      value: score.value as never,
      comment: score.comment ?? undefined,
      metadata: score.metadata,
      dataType: score.dataType,
      environment: SEED_ENVIRONMENT,
      timestamp
    }
  } as ScoreEvent;
}

async function sendScores(scoreEvents: ScoreEvent[]) {
  if (scoreEvents.length === 0) return;

  const client = new LangfuseClient({
    publicKey: env.langfusePublicKey,
    secretKey: env.langfuseSecretKey,
    baseUrl: env.langfuseBaseUrl
  });

  const batches = chunkIngestionBatch(scoreEvents);
  for (const [index, batch] of batches.entries()) {
    console.log(`Sending score batch ${index + 1}/${batches.length} (${batch.length} scores)...`);
    const response = await client.api.ingestion.batch({ batch });
    if (response.errors.length > 0) {
      const details = response.errors
        .map((error) => `- ${error.id}: ${error.message ?? JSON.stringify(error.error ?? null)}`)
        .join("\n");
      throw new Error(`Score import failed with ${response.errors.length} ingestion errors:\n${details}`);
    }
  }
}

// Snapshot stores types uppercase (AGENT/TOOL/...); the SDK asType option is lowercase.
function toAsType(type: string): LangfuseObservationType {
  return type.toLowerCase() as LangfuseObservationType;
}

// Observation metadata accepts arbitrary values; tag the seed source for traceability.
function buildObservationMetadata(metadata: unknown): Record<string, unknown> {
  const marker = { langfuseSeedSource: "otel-import" };
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...(metadata as Record<string, unknown>), ...marker };
  }
  if (metadata === undefined || metadata === null) {
    return marker;
  }
  return { value: metadata, ...marker };
}

// Trace-level metadata via propagateAttributes only accepts string values <=200 chars.
function toStringMetadata(metadata: unknown): Record<string, string> | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    const asString = typeof value === "string" ? value : JSON.stringify(value);
    out[key] = asString.length > 200 ? asString.slice(0, 200) : asString;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function countObservationTypes(bundles: TraceSeedTraceBundle[]) {
  const counts: Record<string, number> = {};
  for (const bundle of bundles) {
    for (const observation of bundle.observations) {
      counts[observation.type] = (counts[observation.type] ?? 0) + 1;
    }
  }
  return counts;
}

function formatTypeCounts(counts: Record<string, number>) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type} x${count}`)
    .join(", ");
}

// Uniformly shifts every seeded timestamp so the most recent lands at `nowMs`,
// preserving the original spread and each trace's internal timing.
function computeTimestampOffsetMs(snapshot: TraceSeedSnapshot, nowMs: number) {
  let latestMs = Number.NEGATIVE_INFINITY;

  const consider = (value: string | null | undefined) => {
    if (!value) return;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > latestMs) latestMs = parsed;
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

function logTimestampShift(snapshot: TraceSeedSnapshot, offsetMs: number) {
  const days = (offsetMs / (1000 * 60 * 60 * 24)).toFixed(1);
  console.log(
    `Shifting all timestamps forward by ${days} day(s) so the newest of ${snapshot.traces.length} traces lands now.`
  );
}

function validateSnapshot(snapshot: TraceSeedSnapshot, inputPath: string) {
  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported snapshot schema version ${snapshot.schemaVersion} in ${inputPath}.`);
  }
  if (!Array.isArray(snapshot.traces)) {
    throw new Error(`Snapshot ${inputPath} has no traces array.`);
  }
}

void main();
