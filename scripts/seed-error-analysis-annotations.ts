/**
 * Write the open-coding notes and pass/fail marks for the error-analysis seed.
 *
 * Finds the root observations tagged error-analysis-seed, adds any that are
 * missing from the "error analysis" queue, and writes two annotation scores
 * on each: open coding (text) and pass or fail. Those queue items are then
 * marked completed. Other items already in the queue are left alone.
 *
 * The notes describe what the reply did. They do not name the clusters, so
 * Halo still has to find them. A pass is a short numbered list of iPhone taps.
 * A fail answers something other than the iPhone, speaks as family, or runs
 * on as one long paragraph.
 *
 * Idempotent. Each score uses a stable id and the observation start time, so
 * a second run updates the same scores instead of adding another pair.
 *
 *   npm run langfuse:seed:error-analysis:annotations
 *   npm run langfuse:seed:error-analysis:annotations -- --dry-run
 *   npx tsx scripts/seed-error-analysis-annotations.ts --check
 */
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/server/env";
import { hasFlag, readStringFlag } from "./langfuse-trace-seed-lib";
import { SCENARIOS, type ErrorAnalysisScenario } from "./seed-error-analysis-traces";

const SEED_TAG = "error-analysis-seed";
const DEFAULT_QUEUE_NAME = "error analysis";
const OPEN_CODING_NAME = "open coding";
const PASS_FAIL_NAME = "pass or fail";

type PassFail = "pass" | "fail";

type Annotation = {
  key: string;
  passFail: PassFail;
  note: string;
};

type QueueItem = {
  id: string;
  objectId: string;
  objectType: string;
  status: string;
};

type ScoreConfig = {
  id: string;
  name: string;
  dataType: string;
  categories?: Array<{ label: string }> | null;
};

type RootObservation = {
  id: string;
  traceId: string;
  startTime: string;
  environment?: string;
  input: unknown;
  output: unknown;
};

export function annotationFor(scenario: ErrorAnalysisScenario): Annotation {
  const ask = lastUserContent(scenario.turns.map((turn) => ({ role: turn.role, content: turn.content })));
  const quoted = `He asked "${ask}".`;
  if (scenario.mode === "good") {
    return {
      key: annotationKey(ask, scenario.finalAnswer),
      passFail: "pass",
      note: `${quoted} The reply is a short numbered list of taps for his iPhone.`
    };
  }
  if (scenario.mode === "out-of-scope") {
    return {
      key: annotationKey(ask, scenario.finalAnswer),
      passFail: "fail",
      note: `${quoted} The reply answers it anyway, and the answer is not about his iPhone.`
    };
  }
  if (scenario.mode === "impersonation") {
    const detail = scenario.obviousIdentity
      ? `${quoted} The reply is "I'm your kid."`
      : scenario.finalAnswer.includes("garden")
        ? `${quoted} The taps are right, but it calls him Dad and mentions the garden pictures as if it was there.`
        : `${quoted} The taps are right, but it calls him Dad and talks as if it had already shown him that panel.`;
    return {
      key: annotationKey(ask, scenario.finalAnswer),
      passFail: "fail",
      note: `${detail} The reply speaks as if it were someone in his family.`
    };
  }
  return {
    key: annotationKey(ask, scenario.finalAnswer),
    passFail: "fail",
    note: `${quoted} The reply is one long paragraph, not a short list of taps.`
  };
}

export function assertAnnotationTemplates() {
  const annotations = SCENARIOS.map(annotationFor);
  const keys = new Set(annotations.map((annotation) => annotation.key));
  if (keys.size !== SCENARIOS.length) {
    throw new Error(`Expected ${SCENARIOS.length} distinct annotation keys, got ${keys.size}.`);
  }
  const passes = annotations.filter((annotation) => annotation.passFail === "pass").length;
  if (passes !== 7) throw new Error(`Expected 7 pass annotations, got ${passes}.`);
  for (const annotation of annotations) {
    if (annotation.note.length < 1 || annotation.note.length > 500) {
      throw new Error(`Open coding note has length ${annotation.note.length}.`);
    }
    if (/out of scope|impersonat|lengthy/i.test(annotation.note)) {
      throw new Error(`Open coding note names a cluster: ${annotation.note}`);
    }
  }
}

function annotationKey(question: string, answer: string) {
  return `${question.trim()}\n${answer.trim()}`;
}

function lastUserContent(messages: Array<{ role?: string; content?: unknown }>) {
  const message = [...messages].reverse().find((entry) => entry.role === "user" && typeof entry.content === "string");
  return typeof message?.content === "string" ? message.content.trim() : "";
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function messagesFromInput(input: unknown) {
  const parsed = parseJson(input);
  if (!parsed || typeof parsed !== "object") return [];
  const messages = (parsed as { messages?: unknown }).messages;
  return Array.isArray(messages) ? messages : [];
}

function answerFromOutput(output: unknown) {
  const parsed = parseJson(output);
  if (parsed && typeof parsed === "object" && typeof (parsed as { answer?: unknown }).answer === "string") {
    return (parsed as { answer: string }).answer.trim();
  }
  return "";
}

function scoreId(observationId: string, name: string) {
  const hash = createHash("sha256").update(`error-analysis:${observationId}:${name}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function requireCredentials() {
  if (!env.langfusePublicKey || !env.langfuseSecretKey) {
    throw new Error("Langfuse credentials are required to seed annotations.");
  }
}

async function api(method: string, pathname: string, body?: unknown, query?: Record<string, string>) {
  const url = new URL(pathname, env.langfuseBaseUrl);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.langfusePublicKey}:${env.langfuseSecretKey}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;
  if (response.status === 207) {
    throw new Error(`${method} ${pathname} partially rejected scores: ${text.slice(0, 800)}`);
  }
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed (${response.status}): ${text.slice(0, 800)}`);
  }
  return parsed;
}

async function listPages<T>(pathname: string, query: Record<string, string> = {}) {
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const body = (await api("GET", pathname, undefined, { ...query, page: String(page), limit: "100" })) as {
      data: T[];
      meta?: { totalPages?: number };
    };
    rows.push(...body.data);
    if (!body.meta?.totalPages || page >= body.meta.totalPages) return rows;
    page += 1;
  }
}

async function listObservations() {
  const rows: RootObservation[] = [];
  let cursor: string | undefined;
  const filter = JSON.stringify([
    { type: "arrayOptions", column: "traceTags", operator: "any of", value: [SEED_TAG] },
    { type: "string", column: "name", operator: "=", value: "dad-it-support-chat-turn" },
    { type: "boolean", column: "isRootObservation", operator: "=", value: true }
  ]);
  for (;;) {
    const query: Record<string, string> = {
      fields: "core,basic,io",
      fromStartTime: "2020-01-01T00:00:00.000Z",
      limit: "100",
      filter
    };
    if (cursor) query.cursor = cursor;
    const body = (await api("GET", "/api/public/v2/observations", undefined, query)) as {
      data: RootObservation[];
      meta?: { cursor?: string | null };
    };
    rows.push(...body.data);
    if (!body.meta?.cursor) return rows;
    cursor = body.meta.cursor;
  }
}

function queueConfigs(configs: ScoreConfig[]) {
  const openCoding = configs.find((config) => config.dataType === "TEXT" && config.name === OPEN_CODING_NAME);
  const passFail = configs.find((config) => {
    const labels = (config.categories ?? []).map((category) => category.label.toLowerCase());
    return config.dataType === "CATEGORICAL" && config.name === PASS_FAIL_NAME && labels.includes("pass") && labels.includes("fail");
  });
  if (!openCoding || !passFail) {
    throw new Error(`Queue needs a text config "${OPEN_CODING_NAME}" and a categorical config "${PASS_FAIL_NAME}" with pass and fail.`);
  }
  return { openCoding, passFail };
}

async function main() {
  if (hasFlag("--check")) {
    assertAnnotationTemplates();
    console.log(`Error-analysis annotations OK: ${SCENARIOS.length} notes, 7 pass and 13 fail.`);
    return;
  }

  requireCredentials();
  const queueName = readStringFlag("--queue") ?? DEFAULT_QUEUE_NAME;
  const dryRun = hasFlag("--dry-run");
  const templates = new Map(SCENARIOS.map(annotationFor).map((annotation) => [annotation.key, annotation]));

  const queues = await listPages<{ id: string; name: string; scoreConfigIds: string[] }>("/api/public/annotation-queues");
  const queue = queues.find((entry) => entry.name === queueName);
  if (!queue) {
    throw new Error(`No annotation queue named "${queueName}". Found: ${queues.map((entry) => entry.name).join(", ") || "none"}.`);
  }
  const configs = await Promise.all(
    queue.scoreConfigIds.map((configId) => api("GET", `/api/public/score-configs/${configId}`) as Promise<ScoreConfig>)
  );
  const { openCoding, passFail } = queueConfigs(configs);
  const observations = await listObservations();
  if (observations.length === 0) {
    throw new Error(`No root observations tagged ${SEED_TAG}. Run npm run langfuse:seed:error-analysis first.`);
  }

  const planned = observations.map((observation) => {
    const ask = lastUserContent(messagesFromInput(observation.input) as Array<{ role?: string; content?: unknown }>);
    const answer = answerFromOutput(observation.output);
    const annotation = templates.get(annotationKey(ask, answer));
    if (!annotation) {
      throw new Error(`Observation ${observation.id} does not match an error-analysis scenario. Last question: ${ask.slice(0, 80)}`);
    }
    return { observation, annotation };
  });

  const counts = { pass: 0, fail: 0 };
  for (const entry of planned) counts[entry.annotation.passFail] += 1;
  console.log(
    `${dryRun ? "Would annotate" : "Annotating"} ${planned.length} observations on "${queue.name}": ${counts.pass} pass, ${counts.fail} fail.`
  );
  if (dryRun) {
    for (const entry of planned) {
      console.log(`- ${entry.annotation.passFail}: ${entry.annotation.note}`);
    }
    return;
  }

  const items = await listPages<QueueItem>(`/api/public/annotation-queues/${queue.id}/items`);
  const itemsByObject = new Map(items.filter((item) => item.objectType === "OBSERVATION").map((item) => [item.objectId, item]));

  const scores: Array<Record<string, unknown>> = [];
  for (const entry of planned) {
    let item = itemsByObject.get(entry.observation.id);
    if (!item) {
      item = (await api("POST", `/api/public/annotation-queues/${queue.id}/items`, {
        objectId: entry.observation.id,
        objectType: "OBSERVATION",
        status: "PENDING"
      })) as QueueItem;
      itemsByObject.set(entry.observation.id, item);
    }
    const shared = {
      traceId: entry.observation.traceId,
      observationId: entry.observation.id,
      queueId: queue.id,
      source: "ANNOTATION",
      timestamp: entry.observation.startTime,
      environment: entry.observation.environment
    };
    scores.push({
      ...shared,
      id: scoreId(entry.observation.id, openCoding.name),
      name: openCoding.name,
      configId: openCoding.id,
      dataType: "TEXT",
      value: entry.annotation.note
    });
    scores.push({
      ...shared,
      id: scoreId(entry.observation.id, passFail.name),
      name: passFail.name,
      configId: passFail.id,
      dataType: "CATEGORICAL",
      value: entry.annotation.passFail
    });
  }

  for (let index = 0; index < scores.length; index += 20) {
    await api("POST", "/api/public/scores", scores.slice(index, index + 20));
  }

  for (const entry of planned) {
    const item = itemsByObject.get(entry.observation.id);
    if (!item) throw new Error(`Queue item missing for observation ${entry.observation.id}.`);
    if (item.status !== "COMPLETED") {
      await api("PATCH", `/api/public/annotation-queues/${queue.id}/items/${item.id}`, { status: "COMPLETED" });
    }
  }

  console.log(`Wrote ${scores.length} scores and completed ${planned.length} queue items.`);
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
