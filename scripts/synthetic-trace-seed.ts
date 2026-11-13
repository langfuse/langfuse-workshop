import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  readTraceSeedSnapshot,
  resolveFromScript,
  type TraceSeedSnapshot,
  type TraceSeedTraceBundle
} from "./langfuse-trace-seed-lib";

// Real exported turns from data/seed-traffic-followups-traces.json. Cloning them keeps
// the AGENT -> GENERATION/TOOL tree, token usage, and cost identical to live traffic.
const SINGLE_TURN_TEMPLATE_ID = "b63ac42cd5e2207efd6b3b54e7d8aa8b";
const FOLLOW_UP_TEMPLATE_ID = "ec538daf8f726dc969e901a85bda329b";
const TEMPLATE_FILE = resolveFromScript(import.meta.url, "../data/seed-traffic-followups-traces.json");
const TEMPLATE_CONVERSATION_MARKERS = [
  "How do I pin a chat to the top in WhatsApp?",
  "How do I set up a second email account",
  "How do I get there from the start?"
];

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type Guide = { title: string; summary: string; steps: string[] };

export type SyntheticTurn = {
  turns: ChatTurn[];
  finalAnswer: string;
  searchQuestion: string;
  guide: Guide | null;
};

export type SyntheticSeedOptions = {
  tag: string;
  seedSource: string;
  sessionPrefix: string;
  spacingMs: number;
};

type Templates = { single: TraceSeedTraceBundle; followUp: TraceSeedTraceBundle };

type MessageRecord = Record<string, unknown> & {
  role?: string;
  content?: unknown;
  tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
};

export function stepsAnswer(intro: string, steps: string[]): string {
  const lines = steps.map((step, index) => `${index + 1}. ${step}`);
  return `${intro}\n\n${lines.join("\n")}`;
}

export function userTurnCount(turns: ChatTurn[]) {
  return turns.filter((turn) => turn.role === "user").length;
}

export async function buildSyntheticSnapshot(
  scenarios: SyntheticTurn[],
  options: SyntheticSeedOptions
): Promise<TraceSeedSnapshot> {
  const templates = await loadTemplates();
  const traces = scenarios.map((scenario, index) => buildBundle(scenario, index, templates, options));
  const exportedObservations = traces.reduce((sum, bundle) => sum + bundle.observations.length, 0);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    filters: {
      traceName: "dad-it-support-chat-turn",
      includeSynthetic: true,
      exclusionRules: [`built by ${options.seedSource} seed`]
    },
    summary: {
      requestedLimit: traces.length,
      exportedTraces: traces.length,
      exportedObservations,
      exportedScores: 0,
      excludedSyntheticTraces: 0,
      excludedByReason: {}
    },
    traces
  };
}

async function loadTemplates(): Promise<Templates> {
  const snapshot = await readTraceSeedSnapshot(TEMPLATE_FILE);
  const find = (id: string) => {
    const bundle = snapshot.traces.find((entry) => entry.trace.id === id);
    if (!bundle) throw new Error(`Template trace ${id} was not found in ${TEMPLATE_FILE}.`);
    return bundle;
  };
  return { single: find(SINGLE_TURN_TEMPLATE_ID), followUp: find(FOLLOW_UP_TEMPLATE_ID) };
}

function buildBundle(
  scenario: SyntheticTurn,
  index: number,
  templates: Templates,
  options: SyntheticSeedOptions
): TraceSeedTraceBundle {
  const template = userTurnCount(scenario.turns) === 1 ? templates.single : templates.followUp;
  const bundle = JSON.parse(JSON.stringify(template)) as TraceSeedTraceBundle;
  const targetTimestamp = Date.parse("2026-06-19T12:00:00.000Z") + index * options.spacingMs;
  shiftTimestamps(bundle, targetTimestamp - Date.parse(bundle.trace.timestamp));

  const sessionId = `seed-session-${options.sessionPrefix}-${String(index + 1).padStart(3, "0")}`;
  const userId = "seed-user-dad";
  const messages = conversationMessages(scenario.turns, targetTimestamp);

  bundle.trace.input = { ...(asRecord(bundle.trace.input) ?? {}), messages, sessionId, userId };
  bundle.trace.output = { ...(asRecord(bundle.trace.output) ?? {}), answer: scenario.finalAnswer };
  bundle.trace.sessionId = sessionId;
  bundle.trace.userId = userId;
  bundle.trace.tags = [...new Set([...(bundle.trace.tags ?? []), "dad-it-support", "langfuse-workshop", options.tag])];
  bundle.trace.metadata = { ...(asRecord(bundle.trace.metadata) ?? {}), seedSource: options.seedSource };
  bundle.scores = [];

  const searchOutput = scenario.guide
    ? {
        ok: true,
        results: [
          {
            id: `${options.seedSource}-guide`,
            title: scenario.guide.title,
            summary: scenario.guide.summary,
            steps: scenario.guide.steps,
            caution: null
          }
        ]
      }
    : { ok: true, results: [] };

  for (const observation of bundle.observations) {
    if (observation.type === "AGENT") {
      observation.input = { ...(asRecord(observation.input) ?? {}), messages, sessionId, userId };
      observation.output = { ...(asRecord(observation.output) ?? {}), answer: scenario.finalAnswer };
    }

    if (observation.type === "GENERATION") {
      const input = asRecord(observation.input);
      if (input && Array.isArray(input.messages)) {
        input.messages = replaceConversationPrefix(input.messages as MessageRecord[], scenario.turns);
        syncSearchToolMessages(input.messages as MessageRecord[], scenario.searchQuestion, searchOutput);
      }
      const output = asRecord(observation.output);
      if (output && typeof output.content === "string" && !Array.isArray(output.tool_calls)) {
        output.content = scenario.finalAnswer;
      }
    }

    if (observation.name === "search_help_library") {
      observation.input = { question: scenario.searchQuestion };
      observation.output = searchOutput;
    }
  }

  return bundle;
}

function conversationMessages(turns: ChatTurn[], endMs: number) {
  return turns.map((turn, index) => ({
    role: turn.role,
    content: turn.content,
    id: `turn-${index}`,
    timestamp: new Date(endMs - (turns.length - index) * 20_000).toISOString()
  }));
}

function replaceConversationPrefix(messages: MessageRecord[], turns: ChatTurn[]) {
  const hasSystem = messages[0]?.role === "system";
  const start = hasSystem ? 1 : 0;
  let end = start;
  while (end < messages.length && !isToolLoopMessage(messages[end])) end += 1;
  const conversation = turns.map((turn) => ({ role: turn.role, content: turn.content }));
  return [...(hasSystem ? [messages[0]] : []), ...conversation, ...messages.slice(end)];
}

function isToolLoopMessage(message: MessageRecord) {
  return message.role === "tool" || (message.role === "assistant" && Array.isArray(message.tool_calls));
}

function syncSearchToolMessages(messages: MessageRecord[], question: string, output: unknown) {
  for (let index = 0; index < messages.length; index += 1) {
    const calls = messages[index].tool_calls;
    if (!Array.isArray(calls)) continue;
    if (!calls.some((call) => call.function?.name === "search_help_library")) continue;
    for (const call of calls) {
      if (call.function?.name === "search_help_library") {
        call.function.arguments = JSON.stringify({ question });
      }
    }
    const next = messages[index + 1];
    if (next?.role === "tool") next.content = JSON.stringify(output);
  }
}

function shiftTimestamps(value: unknown, deltaMs: number) {
  if (Array.isArray(value)) {
    value.forEach((entry) => shiftTimestamps(entry, deltaMs));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(entry)) {
      (value as Record<string, unknown>)[key] = new Date(Date.parse(entry) + deltaMs).toISOString();
    } else {
      shiftTimestamps(entry, deltaMs);
    }
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

// Checks every bundle carries its own conversation end to end, so no template text leaks.
export function assertBundlesMatch(snapshot: TraceSeedSnapshot, scenarios: SyntheticTurn[], tag: string) {
  if (snapshot.traces.length !== scenarios.length) {
    throw new Error(`Expected ${scenarios.length} traces, got ${snapshot.traces.length}.`);
  }
  snapshot.traces.forEach((bundle, index) => {
    const scenario = scenarios[index];
    if (bundle.scores.length !== 0) throw new Error(`Trace ${index} still has scores.`);
    if (!bundle.trace.tags.includes(tag)) throw new Error(`Trace ${index} is missing ${tag}.`);

    const messages = (asRecord(bundle.trace.input)?.messages ?? []) as ChatTurn[];
    if (messages.length !== scenario.turns.length) {
      throw new Error(`Trace ${index} has ${messages.length} messages, expected ${scenario.turns.length}.`);
    }
    if (String(asRecord(bundle.trace.output)?.answer ?? "") !== scenario.finalAnswer) {
      throw new Error(`Trace ${index} answer was not applied.`);
    }

    const agent = bundle.observations.find((observation) => observation.type === "AGENT");
    if (((asRecord(agent?.input)?.messages ?? []) as ChatTurn[]).length !== scenario.turns.length) {
      throw new Error(`Trace ${index} agent input was not rewritten.`);
    }
    const search = bundle.observations.find((observation) => observation.name === "search_help_library");
    if (asRecord(search?.input)?.question !== scenario.searchQuestion) {
      throw new Error(`Trace ${index} searched for the template question.`);
    }
    const lastUser = [...scenario.turns].reverse().find((turn) => turn.role === "user");
    const lastGeneration = [...bundle.observations].reverse().find((observation) => observation.type === "GENERATION");
    if (!lastUser || !JSON.stringify(lastGeneration?.input ?? {}).includes(lastUser.content)) {
      throw new Error(`Trace ${index} generation is missing the latest user message.`);
    }

    const ownText = JSON.stringify(scenario);
    const leaked = bundle.observations.some((observation) => {
      const serialized = JSON.stringify(observation.input ?? {});
      return TEMPLATE_CONVERSATION_MARKERS.some((marker) => serialized.includes(marker) && !ownText.includes(marker));
    });
    if (leaked) throw new Error(`Trace ${index} still contains the template conversation.`);
  });
}

export async function replaySnapshot(snapshot: TraceSeedSnapshot, label: string, dryRun: boolean) {
  const directory = await mkdtemp(path.join(tmpdir(), `${label}-seed-`));
  const file = path.join(directory, "traces.json");
  await writeFile(file, JSON.stringify(snapshot));
  const args = ["scripts/import-trace-seed-otel.ts", "--input", file, "--no-scores", "--no-edge-cases"];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync(resolveFromScript(import.meta.url, "../node_modules/.bin/tsx"), args, {
    cwd: resolveFromScript(import.meta.url, ".."),
    stdio: "inherit"
  });
  return result.status ?? 1;
}
