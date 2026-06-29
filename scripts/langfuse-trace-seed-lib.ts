import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TRACE_SEED_SCHEMA_VERSION = 1;
export const DEFAULT_TRACE_SEED_LIMIT = 100;
export const DEFAULT_TRACE_SEED_NAME = "dad-it-support-chat-turn";
export const DEFAULT_TRACE_SEED_TAG = "workshop-seed";
export const DEFAULT_TRACE_SEED_FILE = "../data/seed-production-traces.json";
export const MAX_INGESTION_BATCH_BYTES = 3_000_000;

export type TraceSeedValue = string | number | boolean | null | TraceSeedValue[] | { [key: string]: TraceSeedValue };

export type TraceSeedPromptInfo = {
  name: string;
  version: number;
};

export type TraceSeedTrace = {
  id: string;
  timestamp: string;
  name: string | null;
  input?: TraceSeedValue;
  output?: TraceSeedValue;
  sessionId: string | null;
  release: string | null;
  version: string | null;
  userId: string | null;
  metadata?: TraceSeedValue;
  tags: string[];
  public: boolean;
  environment: string;
};

export type TraceSeedObservation = {
  id: string;
  traceId: string;
  type: string;
  name: string | null;
  startTime: string;
  endTime: string | null;
  completionStartTime: string | null;
  model: string | null;
  modelParameters?: TraceSeedValue;
  input?: TraceSeedValue;
  version: string | null;
  metadata?: TraceSeedValue;
  output?: TraceSeedValue;
  usageDetails?: Record<string, number>;
  costDetails?: Record<string, number>;
  level: string;
  statusMessage: string | null;
  parentObservationId: string | null;
  environment: string;
  prompt?: TraceSeedPromptInfo | null;
};

export type TraceSeedScore = {
  id: string;
  traceId: string;
  observationId: string | null;
  name: string;
  value: string | number;
  timestamp: string;
  comment: string | null;
  metadata?: TraceSeedValue;
  dataType: "NUMERIC" | "BOOLEAN" | "CATEGORICAL" | "CORRECTION" | "TEXT";
  environment: string;
};

export type TraceSeedTraceBundle = {
  trace: TraceSeedTrace;
  observations: TraceSeedObservation[];
  scores: TraceSeedScore[];
};

export type TraceSeedSummary = {
  requestedLimit: number;
  exportedTraces: number;
  exportedObservations: number;
  exportedScores: number;
  excludedSyntheticTraces: number;
  excludedByReason: Record<string, number>;
};

export type TraceSeedFilters = {
  traceName: string;
  includeSynthetic: boolean;
  exclusionRules: string[];
  fromTimestamp?: string;
  toTimestamp?: string;
};

export type TraceSeedSnapshot = {
  schemaVersion: number;
  exportedAt: string;
  filters: TraceSeedFilters;
  summary: TraceSeedSummary;
  traces: TraceSeedTraceBundle[];
};

export type TraceSeedIdMaps = {
  traceIds: ReadonlyMap<string, string>;
  observationIds: ReadonlyMap<string, string>;
  scoreIds: ReadonlyMap<string, string>;
  userIds: ReadonlyMap<string, string>;
  sessionIds: ReadonlyMap<string, string>;
};

export function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

export function readStringFlag(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

export function readNumberFlag(flag: string) {
  const value = readStringFlag(flag);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function todayRange(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    fromTimestamp: start.toISOString(),
    toTimestamp: end.toISOString()
  };
}

export function resolveFromScript(scriptUrl: string, relativePath: string) {
  const currentDir = path.dirname(fileURLToPath(scriptUrl));
  return path.resolve(currentDir, relativePath);
}

export function defaultTraceSeedPath(scriptUrl: string) {
  return resolveFromScript(scriptUrl, DEFAULT_TRACE_SEED_FILE);
}

export function createTraceSeedIdMaps(params: {
  traceIds: Iterable<string>;
  observationIds: Iterable<string>;
  scoreIds: Iterable<string>;
  userIds: Iterable<string | null | undefined>;
  sessionIds: Iterable<string | null | undefined>;
}): TraceSeedIdMaps {
  return {
    traceIds: createDeterministicHexMap(params.traceIds, "trace", 32),
    observationIds: createDeterministicHexMap(params.observationIds, "observation", 16),
    scoreIds: createDeterministicHexMap(params.scoreIds, "score", 32),
    userIds: createDeterministicAliasMap(params.userIds, "user", "seed-user"),
    sessionIds: createDeterministicAliasMap(params.sessionIds, "session", "seed-session")
  };
}

function createDeterministicHexMap(values: Iterable<string>, namespace: string, length: number) {
  const map = new Map<string, string>();
  const used = new Set<string>();

  for (const rawValue of uniqueSortedStrings(values)) {
    map.set(rawValue, stableUniqueHex(`${namespace}:${rawValue}`, length, used));
  }

  return map;
}

function createDeterministicAliasMap(
  values: Iterable<string | null | undefined>,
  namespace: string,
  prefix: string
) {
  const map = new Map<string, string>();
  const used = new Set<string>();

  for (const rawValue of uniqueSortedStrings(values)) {
    const suffix = stableUniqueHex(`${namespace}:${rawValue}`, 12, used);
    map.set(rawValue, `${prefix}-${suffix}`);
  }

  return map;
}

function uniqueSortedStrings(values: Iterable<string | null | undefined>) {
  return [...new Set([...values].filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function stableUniqueHex(seed: string, length: number, used: Set<string>) {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const digest = sha256Hex(`${seed}:${attempt}`).slice(0, length);
    if (!used.has(digest)) {
      used.add(digest);
      return digest;
    }
  }

  throw new Error(`Could not create a stable unique hex id for seed "${seed}".`);
}

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

type SanitizeOptions = {
  idMaps: TraceSeedIdMaps;
};

export function sanitizeUnknown(value: unknown, options: SanitizeOptions): TraceSeedValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") {
    return sanitizeString(value, options.idMaps);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, options) ?? null);
  }
  if (isPlainObject(value)) {
    const sanitizedEntries: Array<[string, TraceSeedValue]> = [];

    for (const [rawKey, rawValue] of Object.entries(value)) {
      const key = rawKey;
      const lowerKey = key.toLowerCase();

      if (lowerKey === "projectid" || lowerKey === "project_id") {
        sanitizedEntries.push([key, "[project]"]);
        continue;
      }

      if (looksSensitiveKey(lowerKey)) {
        sanitizedEntries.push([key, "[secret]"]);
        continue;
      }

      if (lowerKey === "id" && typeof rawValue === "string" && looksOpaqueId(rawValue)) {
        sanitizedEntries.push([key, sanitizeOpaqueId(rawValue)]);
        continue;
      }

      if (rawValue === undefined) {
        continue;
      }

      const exactMapped =
        typeof rawValue === "string" ? mapExactIdValue(rawValue, key, options.idMaps) : undefined;
      const sanitizedValue =
        exactMapped ?? sanitizeUnknown(rawValue, options);

      if (sanitizedValue !== undefined) {
        sanitizedEntries.push([key, sanitizedValue]);
      }
    }

    return Object.fromEntries(sanitizedEntries);
  }

  return sanitizeString(String(value), options.idMaps);
}

function looksSensitiveKey(lowerKey: string) {
  return (
    lowerKey.includes("apikey") ||
    lowerKey.includes("api_key") ||
    lowerKey.includes("secret") ||
    lowerKey.includes("token") ||
    lowerKey.includes("authorization") ||
    lowerKey.includes("authheader") ||
    lowerKey === "host.id" ||
    lowerKey === "host.name" ||
    lowerKey === "process.command" ||
    lowerKey === "process.command_args" ||
    lowerKey === "process.executable.name" ||
    lowerKey === "process.executable.path" ||
    lowerKey === "process.owner" ||
    lowerKey === "service.name"
  );
}

function sanitizeString(value: string, idMaps: TraceSeedIdMaps) {
  const exactMapped = mapAnyExactValue(value, idMaps);
  if (exactMapped) {
    return exactMapped;
  }

  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(?:\+?\d{1,2}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, "[phone]")
    .replace(/\b(?:pk-lf|sk-lf)-[A-Za-z0-9_-]+\b/g, "[secret]")
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi, "Bearer [secret]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[secret]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\bcall_[A-Za-z0-9]+\b/g, "[tool-call-id]")
    .replace(/file:\/\/\/Users\/[^\s"]+/g, "[path]")
    .replace(/\/Users\/[^\s"]+/g, "[path]")
    .replace(/https?:\/\/(?:[a-z0-9-]+\.)*langfuse\.com\/project\/[^\s)]+/gi, "[langfuse-url]");
}

function looksOpaqueId(value: string) {
  return (
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(value) ||
    /^call_[A-Za-z0-9]+$/.test(value) ||
    /^[0-9a-f]{16,32}$/i.test(value)
  );
}

function sanitizeOpaqueId(value: string) {
  return `seed-local-id-${sha256Hex(`opaque:${value}`).slice(0, 12)}`;
}

function mapExactIdValue(value: string, key: string, idMaps: TraceSeedIdMaps) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "traceid" || normalizedKey === "trace_id") {
    return idMaps.traceIds.get(value) ?? "[trace]";
  }
  if (
    normalizedKey === "observationid" ||
    normalizedKey === "observation_id" ||
    normalizedKey === "parentobservationid" ||
    normalizedKey === "parent_observation_id"
  ) {
    return idMaps.observationIds.get(value) ?? "[observation]";
  }
  if (normalizedKey === "scoreid" || normalizedKey === "score_id") {
    return idMaps.scoreIds.get(value) ?? "[score]";
  }
  if (normalizedKey === "userid" || normalizedKey === "user_id") {
    return idMaps.userIds.get(value) ?? "[user]";
  }
  if (normalizedKey === "sessionid" || normalizedKey === "session_id") {
    return idMaps.sessionIds.get(value) ?? "[session]";
  }

  return undefined;
}

function mapAnyExactValue(value: string, idMaps: TraceSeedIdMaps) {
  return (
    idMaps.traceIds.get(value) ??
    idMaps.observationIds.get(value) ??
    idMaps.scoreIds.get(value) ??
    idMaps.userIds.get(value) ??
    idMaps.sessionIds.get(value)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeNumberRecord(value: unknown) {
  if (!isPlainObject(value)) return undefined;

  const entries = Object.entries(value).filter(([, rawValue]) => typeof rawValue === "number");
  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries) as Record<string, number>;
}

export function withSeedSourcePromptMetadata(
  metadata: TraceSeedValue | undefined,
  prompt: TraceSeedPromptInfo | null | undefined
) {
  if (!prompt) return metadata;

  const seedSourcePrompt = {
    name: prompt.name,
    version: prompt.version
  };

  if (isPlainObject(metadata)) {
    return {
      ...metadata,
      seedSourcePrompt
    } as TraceSeedValue;
  }

  return {
    seedSourcePrompt,
    sourceMetadata: metadata ?? null
  } as TraceSeedValue;
}

export function orderObservationsParentFirst(observations: TraceSeedObservation[]) {
  const childrenByParent = new Map<string | null, TraceSeedObservation[]>();

  for (const observation of observations) {
    const parentId = observation.parentObservationId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(observation);
    childrenByParent.set(parentId, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(compareObservations);
  }

  const ordered: TraceSeedObservation[] = [];
  const seen = new Set<string>();

  function visit(parentId: string | null) {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      ordered.push(child);
      visit(child.id);
    }
  }

  visit(null);

  for (const observation of [...observations].sort(compareObservations)) {
    if (!seen.has(observation.id)) {
      seen.add(observation.id);
      ordered.push(observation);
      visit(observation.id);
    }
  }

  return ordered;
}

function compareObservations(left: TraceSeedObservation, right: TraceSeedObservation) {
  if (left.startTime !== right.startTime) {
    return left.startTime.localeCompare(right.startTime);
  }
  return left.id.localeCompare(right.id);
}

export function stableJsonStringify(value: unknown) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (isPlainObject(value)) {
    const sortedEntries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, rawValue]) => [key, sortJson(rawValue)]);
    return Object.fromEntries(sortedEntries);
  }
  return value;
}

export async function writeStableJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, stableJsonStringify(value), "utf8");
}

export async function readTraceSeedSnapshot(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as TraceSeedSnapshot;
}

export function jsonSizeInBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function chunkIngestionBatch<T>(events: T[], maxBytes = MAX_INGESTION_BATCH_BYTES) {
  const batches: T[][] = [];
  let current: T[] = [];

  for (const event of events) {
    const candidate = [...current, event];
    const candidateBytes = jsonSizeInBytes({ batch: candidate });

    if (candidateBytes > maxBytes) {
      if (current.length === 0) {
        throw new Error(
          `A single ingestion event is too large (${candidateBytes} bytes) for the ${maxBytes}-byte batch limit.`
        );
      }

      batches.push(current);
      current = [event];
      continue;
    }

    current = candidate;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

export function countBy(items: Iterable<string>) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}
