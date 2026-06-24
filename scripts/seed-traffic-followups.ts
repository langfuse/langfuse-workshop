/**
 * Fire a batch of synthetic conversations at the live Dad IT Support Agent,
 * where ~20% of them include a follow-up turn. This reproduces the Module 08
 * symptom: "high volume of follow-up questions".
 *
 * The conversations live in data/seed-traffic-followups.json. Each entry is a
 * question; the harder ones also carry a `followUp` string. When a follow-up
 * is present the script runs a real two-turn conversation in ONE session:
 *
 *   1. Send the question, capture the agent's answer.
 *   2. Append that answer + the follow-up ("where do I actually find that?")
 *      and send again with the SAME sessionId/userId.
 *
 * So Langfuse sees a genuine multi-turn session, and any follow-up evaluator
 * (e.g. asks_follow_up) has authentic traffic to score. Questions without a
 * follow-up stay as normal single-turn conversations.
 *
 * Uses the same runSupportConversation path as the web app and dataset runner,
 * so no server needs to be running.
 *
 * Usage:
 *   npm run traffic:seed:followups                    # send every conversation
 *   npm run traffic:seed:followups -- --limit 20      # only the first 20
 *   npm run traffic:seed:followups -- --concurrency 1 # one at a time (default 4)
 */
import "../src/server/load-env";

import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ChatMessage } from "../src/shared/types";
import { env } from "../src/server/env";
import { runSupportConversation } from "../src/server/support-agent";

const langfuseSpanProcessor = new LangfuseSpanProcessor();
const sdk = new NodeSDK({ spanProcessors: [langfuseSpanProcessor] });
sdk.start();

type TrafficQuestion = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  content: string;
  followUp?: string;
};

type TrafficFile = {
  description?: string;
  questions: TrafficQuestion[];
};

// Tiny --flag value parser so the script stays dependency-free.
function readNumberFlag(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : undefined;
}

async function loadQuestions() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const dataPath = path.resolve(currentDir, "../data/seed-traffic-followups.json");
  const raw = await readFile(dataPath, "utf8");
  const parsed = JSON.parse(raw) as TrafficFile;
  return parsed.questions;
}

function userMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: "user",
    content,
    timestamp: new Date().toISOString()
  };
}

// Run one conversation: the question, plus a follow-up turn if present.
// Both turns share the same sessionId/userId so Langfuse sees one session.
async function sendConversation(question: TrafficQuestion) {
  const sessionId = `traffic-${question.id}-${randomUUID()}`;
  const userId = `traffic-user-${question.id}`;

  // Tag every trace with the question difficulty so the asks_follow_up
  // score can be sliced by difficulty in Langfuse (easy vs medium vs hard).
  const metadata = { difficulty: question.difficulty };

  const messages: ChatMessage[] = [userMessage(`${question.id}-q`, question.content)];
  const first = await runSupportConversation({ sessionId, userId, messages, metadata });

  if (!question.followUp) {
    return { turns: 1 };
  }

  // Carry the agent's first answer into the transcript, then ask the
  // follow-up as a second user turn in the same session.
  messages.push({
    id: `${question.id}-a`,
    role: "assistant",
    content: first.answer,
    timestamp: new Date().toISOString()
  });
  messages.push(userMessage(`${question.id}-followup`, question.followUp));
  await runSupportConversation({ sessionId, userId, messages, metadata });

  return { turns: 2 };
}

async function main() {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required to send traffic to the agent.");
  }
  if (!env.langfusePublicKey || !env.langfuseSecretKey) {
    console.warn(
      "Langfuse credentials are not set — conversations will still run, but no traces will be recorded."
    );
  }

  const allQuestions = await loadQuestions();
  const limit = readNumberFlag("--limit") ?? allQuestions.length;
  const concurrency = Math.max(1, readNumberFlag("--concurrency") ?? 4);
  const questions = allQuestions.slice(0, limit);

  const followUpCount = questions.filter((q) => q.followUp).length;
  console.log(
    `Sending ${questions.length} conversations to the Dad IT Support Agent ` +
      `(${followUpCount} with a follow-up turn, ${questions.length - followUpCount} single-turn) ` +
      `with concurrency ${concurrency}.`
  );

  let completed = 0;
  let failed = 0;

  // Shared queue so exactly `concurrency` conversations are in flight at once.
  let cursor = 0;
  async function worker() {
    while (cursor < questions.length) {
      const question = questions[cursor];
      cursor += 1;
      try {
        const { turns } = await sendConversation(question);
        completed += 1;
        const tag = turns === 2 ? `${question.difficulty}, +follow-up` : question.difficulty;
        console.log(`  [${completed + failed}/${questions.length}] ${question.id} (${tag}) ✓`);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  [${completed + failed}/${questions.length}] ${question.id} ✗ ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(`Done. ${completed} succeeded, ${failed} failed.`);

  // Flush pending spans so the traces land in Langfuse before we exit.
  await langfuseSpanProcessor.forceFlush();
  await sdk.shutdown();
}

void main();
