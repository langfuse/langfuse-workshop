import "../src/server/load-env";

import { LangfuseClient } from "@langfuse/client";
import { env } from "../src/server/env";
import {
  DEFAULT_TRACE_SEED_LIMIT,
  DEFAULT_TRACE_SEED_NAME,
  TraceSeedObservation,
  TraceSeedScore,
  TraceSeedSnapshot,
  TraceSeedTrace,
  TraceSeedTraceBundle,
  TRACE_SEED_SCHEMA_VERSION,
  countBy,
  createTraceSeedIdMaps,
  defaultTraceSeedPath,
  hasFlag,
  orderObservationsParentFirst,
  readNumberFlag,
  readStringFlag,
  sanitizeNumberRecord,
  sanitizeUnknown,
  todayRange,
  writeStableJson
} from "./langfuse-trace-seed-lib";

type SourceTraceListItem = {
  id: string;
  timestamp: string;
  name: string | null;
  sessionId: string | null;
  release: string | null;
  version: string | null;
  userId: string | null;
  tags: string[];
  public: boolean;
  environment: string;
};

type SourceObservation = {
  id: string;
  traceId: string | null;
  type: string;
  name: string | null;
  startTime: string;
  endTime: string | null;
  completionStartTime: string | null;
  model: string | null;
  modelParameters?: unknown;
  input?: unknown;
  version: string | null;
  metadata?: unknown;
  output?: unknown;
  level: string;
  statusMessage: string | null;
  parentObservationId: string | null;
  usageDetails?: unknown;
  costDetails?: unknown;
  environment: string;
  promptName?: string | null;
  promptVersion?: number | null;
};

type SourceScore = {
  id: string;
  traceId?: string | null;
  observationId?: string | null;
  name: string;
  value: number;
  stringValue?: string;
  timestamp: string;
  comment: string | null;
  metadata?: unknown;
  dataType: "NUMERIC" | "BOOLEAN" | "CATEGORICAL" | "CORRECTION" | "TEXT";
  environment: string;
};

type SourceTraceDetail = SourceTraceListItem & {
  input?: unknown;
  output?: unknown;
  metadata?: unknown;
  observations?: SourceObservation[] | null;
  scores?: SourceScore[] | null;
};

const SYNTHETIC_EXCLUSION_RULES = [
  "sessionId starts with dataset-",
  "sessionId starts with traffic-",
  "userId equals dataset-runner"
] as const;

async function main() {
  const requestedLimit = Math.max(1, readNumberFlag("--limit") ?? DEFAULT_TRACE_SEED_LIMIT);
  const outputPath = readStringFlag("--output") ?? defaultTraceSeedPath(import.meta.url);
  const includeSynthetic = hasFlag("--include-synthetic");
  const dryRun = hasFlag("--dry-run");
  const dateRange = readDateRangeFlags();

  if (!env.langfusePublicKey || !env.langfuseSecretKey) {
    throw new Error("LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are required to export trace seed data.");
  }

  const langfuse = new LangfuseClient({
    publicKey: env.langfusePublicKey,
    secretKey: env.langfuseSecretKey,
    baseUrl: env.langfuseBaseUrl
  });

  const { selected, excludedReasons } = await listCandidateTraces({
    client: langfuse,
    dateRange,
    includeSynthetic,
    requestedLimit
  });

  console.log(
    `Selected ${selected.length} traces for export (${countExcluded(excludedReasons)} synthetic traces excluded).`
  );

  const hydratedTraces: SourceTraceDetail[] = [];

  for (const [index, trace] of selected.entries()) {
    console.log(`Hydrating trace ${index + 1}/${selected.length}: ${trace.id}`);
    const detail = (await langfuse.api.trace.get(trace.id, {
      fields: "core,io,scores,observations,metrics"
    })) as unknown as SourceTraceDetail;
    hydratedTraces.push(detail);
  }

  const snapshot = buildSnapshot({
    dateRange,
    traces: hydratedTraces,
    exportedAt: new Date().toISOString(),
    includeSynthetic,
    requestedLimit,
    excludedReasons
  });

  if (dryRun) {
    console.log(`Dry run only. Snapshot would be written to ${outputPath}.`);
  } else {
    await writeStableJson(outputPath, snapshot);
    console.log(`Wrote sanitized trace seed snapshot to ${outputPath}.`);
  }

  console.log(
    `Snapshot summary: ${snapshot.summary.exportedTraces} traces, ` +
      `${snapshot.summary.exportedObservations} observations, ` +
      `${snapshot.summary.exportedScores} scores.`
  );
}

async function listCandidateTraces(params: {
  client: LangfuseClient;
  dateRange: { fromTimestamp?: string; toTimestamp?: string };
  includeSynthetic: boolean;
  requestedLimit: number;
}) {
  const selected: SourceTraceListItem[] = [];
  const excludedReasons: string[] = [];
  let page = 1;
  const pageSize = Math.max(100, params.requestedLimit);

  while (selected.length < params.requestedLimit) {
    const response = (await params.client.api.trace.list({
      name: DEFAULT_TRACE_SEED_NAME,
      fromTimestamp: params.dateRange.fromTimestamp,
      toTimestamp: params.dateRange.toTimestamp,
      limit: pageSize,
      page,
      orderBy: "timestamp.desc",
      fields: "core"
    })) as unknown as { data: SourceTraceListItem[]; meta: { totalPages: number } };

    if (response.data.length === 0) {
      break;
    }

    for (const trace of response.data) {
      const exclusionReason = params.includeSynthetic ? null : readSyntheticExclusionReason(trace);
      if (exclusionReason) {
        excludedReasons.push(exclusionReason);
        continue;
      }

      selected.push(trace);
      if (selected.length >= params.requestedLimit) {
        break;
      }
    }

    if (page >= response.meta.totalPages) {
      break;
    }

    page += 1;
  }

  return { selected, excludedReasons };
}

function readSyntheticExclusionReason(trace: SourceTraceListItem) {
  if (trace.sessionId?.startsWith("dataset-")) {
    return SYNTHETIC_EXCLUSION_RULES[0];
  }
  if (trace.sessionId?.startsWith("traffic-")) {
    return SYNTHETIC_EXCLUSION_RULES[1];
  }
  if (trace.userId === "dataset-runner") {
    return SYNTHETIC_EXCLUSION_RULES[2];
  }
  return null;
}

function buildSnapshot(params: {
  dateRange: { fromTimestamp?: string; toTimestamp?: string };
  traces: SourceTraceDetail[];
  exportedAt: string;
  includeSynthetic: boolean;
  requestedLimit: number;
  excludedReasons: string[];
}): TraceSeedSnapshot {
  const idMaps = createTraceSeedIdMaps({
    traceIds: params.traces.map((trace) => trace.id),
    observationIds: params.traces.flatMap((trace) => (trace.observations ?? []).map((observation) => observation.id)),
    scoreIds: params.traces.flatMap((trace) => (trace.scores ?? []).map((score) => score.id)),
    userIds: params.traces.map((trace) => trace.userId),
    sessionIds: params.traces.map((trace) => trace.sessionId)
  });

  const bundles = params.traces.map((trace) => sanitizeTraceBundle(trace, idMaps));
  const exportedObservations = bundles.reduce(
    (count, bundle) => count + bundle.observations.length,
    0
  );
  const exportedScores = bundles.reduce((count, bundle) => count + bundle.scores.length, 0);

  return {
    schemaVersion: TRACE_SEED_SCHEMA_VERSION,
    exportedAt: params.exportedAt,
    filters: {
      traceName: DEFAULT_TRACE_SEED_NAME,
      includeSynthetic: params.includeSynthetic,
      exclusionRules: [...SYNTHETIC_EXCLUSION_RULES],
      fromTimestamp: params.dateRange.fromTimestamp,
      toTimestamp: params.dateRange.toTimestamp
    },
    summary: {
      requestedLimit: params.requestedLimit,
      exportedTraces: bundles.length,
      exportedObservations,
      exportedScores,
      excludedSyntheticTraces: countExcluded(params.excludedReasons),
      excludedByReason: countBy(params.excludedReasons)
    },
    traces: bundles
  };
}

function sanitizeTraceBundle(sourceTrace: SourceTraceDetail, idMaps: ReturnType<typeof createTraceSeedIdMaps>) {
  const trace = sanitizeTrace(sourceTrace, idMaps);
  const observations = orderObservationsParentFirst(
    (sourceTrace.observations ?? []).map((observation) => sanitizeObservation(observation, idMaps))
  );
  const scores = (sourceTrace.scores ?? [])
    .map((score) => sanitizeScore(score, idMaps))
    .sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return left.timestamp.localeCompare(right.timestamp);
      }
      return left.id.localeCompare(right.id);
    });

  return {
    trace,
    observations,
    scores
  } satisfies TraceSeedTraceBundle;
}

function sanitizeTrace(sourceTrace: SourceTraceDetail, idMaps: ReturnType<typeof createTraceSeedIdMaps>) {
  return {
    id: mustMap(idMaps.traceIds, sourceTrace.id, "trace"),
    timestamp: sourceTrace.timestamp,
    name: sourceTrace.name,
    input: sanitizeUnknown(sourceTrace.input, { idMaps }),
    output: sanitizeUnknown(sourceTrace.output, { idMaps }),
    sessionId: sourceTrace.sessionId ? mustMap(idMaps.sessionIds, sourceTrace.sessionId, "session") : null,
    release: sourceTrace.release,
    version: sourceTrace.version,
    userId: sourceTrace.userId ? mustMap(idMaps.userIds, sourceTrace.userId, "user") : null,
    metadata: sanitizeUnknown(sourceTrace.metadata, { idMaps }),
    tags: sourceTrace.tags.map((tag) => String(sanitizeUnknown(tag, { idMaps }))),
    public: sourceTrace.public,
    environment: sourceTrace.environment
  } satisfies TraceSeedTrace;
}

function sanitizeObservation(
  sourceObservation: SourceObservation,
  idMaps: ReturnType<typeof createTraceSeedIdMaps>
) {
  return {
    id: mustMap(idMaps.observationIds, sourceObservation.id, "observation"),
    traceId: mustMap(
      idMaps.traceIds,
      sourceObservation.traceId ?? "",
      "trace"
    ),
    type: sourceObservation.type,
    name: sourceObservation.name,
    startTime: sourceObservation.startTime,
    endTime: sourceObservation.endTime,
    completionStartTime: sourceObservation.completionStartTime,
    model: sourceObservation.model,
    modelParameters: sanitizeUnknown(sourceObservation.modelParameters, { idMaps }),
    input: sanitizeUnknown(sourceObservation.input, { idMaps }),
    version: sourceObservation.version,
    metadata: sanitizeUnknown(sourceObservation.metadata, { idMaps }),
    output: sanitizeUnknown(sourceObservation.output, { idMaps }),
    usageDetails: sanitizeNumberRecord(sourceObservation.usageDetails),
    costDetails: sanitizeNumberRecord(sourceObservation.costDetails),
    level: sourceObservation.level,
    statusMessage: sourceObservation.statusMessage
      ? String(sanitizeUnknown(sourceObservation.statusMessage, { idMaps }))
      : null,
    parentObservationId: sourceObservation.parentObservationId
      ? mustMap(idMaps.observationIds, sourceObservation.parentObservationId, "observation")
      : null,
    environment: sourceObservation.environment,
    prompt:
      sourceObservation.promptName && typeof sourceObservation.promptVersion === "number"
        ? {
            name: sourceObservation.promptName,
            version: sourceObservation.promptVersion
          }
        : null
  } satisfies TraceSeedObservation;
}

function sanitizeScore(sourceScore: SourceScore, idMaps: ReturnType<typeof createTraceSeedIdMaps>) {
  return {
    id: mustMap(idMaps.scoreIds, sourceScore.id, "score"),
    traceId: mustMap(idMaps.traceIds, sourceScore.traceId ?? "", "trace"),
    observationId: sourceScore.observationId
      ? idMaps.observationIds.get(sourceScore.observationId) ?? null
      : null,
    name: sourceScore.name,
    value: normalizeScoreValue(sourceScore),
    timestamp: sourceScore.timestamp,
    comment: sourceScore.comment ? String(sanitizeUnknown(sourceScore.comment, { idMaps })) : null,
    metadata: sanitizeUnknown(sourceScore.metadata, { idMaps }),
    dataType: sourceScore.dataType,
    environment: sourceScore.environment
  } satisfies TraceSeedScore;
}

function normalizeScoreValue(score: SourceScore) {
  if (score.dataType === "CATEGORICAL" || score.dataType === "CORRECTION" || score.dataType === "TEXT") {
    return score.stringValue ?? "";
  }
  return score.value;
}

function mustMap(map: ReadonlyMap<string, string>, rawValue: string, label: string) {
  const mapped = map.get(rawValue);
  if (!mapped) {
    throw new Error(`Missing sanitized ${label} id mapping for "${rawValue}".`);
  }
  return mapped;
}

function countExcluded(excludedReasons: string[]) {
  return excludedReasons.length;
}

function readDateRangeFlags() {
  const fromTimestamp = readStringFlag("--from-timestamp");
  const toTimestamp = readStringFlag("--to-timestamp");

  if (hasFlag("--today")) {
    return todayRange();
  }

  return {
    fromTimestamp,
    toTimestamp
  };
}

void main();
