/**
 * Run the hosted Langfuse dataset against the live agent.
 *
 * For each item in the dataset:
 *   1. Call the same runSupportConversation(...) the web app uses.
 *   2. Roll the per-item traces into one experiment run row.
 *   3. Attach a deterministic keyword_overlap score per item.
 *
 * Additional scores (for example the Correctness LLM-as-a-judge
 * evaluator configured in Langfuse) run asynchronously over the
 * dataset runs after this script finishes.
 *
 * Usage:
 *   npm run dataset:run
 */
import "../src/server/load-env";

// --- 1. Boot the OpenTelemetry SDK so every observe(...) call inside
//        the agent emits spans to Langfuse, exactly like the live server.
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { randomUUID } from "node:crypto";
import { LangfuseClient } from "@langfuse/client";
import type { ChatMessage } from "../src/shared/types";
import { env } from "../src/server/env";
import { runSupportConversation } from "../src/server/support-agent";

const langfuseSpanProcessor = new LangfuseSpanProcessor();
const sdk = new NodeSDK({ spanProcessors: [langfuseSpanProcessor] });
sdk.start();

// --- 2. Dataset item shape (must match data/seed-dataset.json).
type DatasetInput = {
  messages: Array<{
    role: ChatMessage["role"];
    content: string;
  }>;
};

type DatasetExpectation = {
  idealAnswer: string;
  expectedKeywords: string[];
};

// --- 3. The deterministic evaluator.
//        Fraction of expected keywords that show up (case-insensitive)
//        in the agent's answer. 1 means every expected keyword landed;
//        0 means none did.
function keywordOverlap(answer: string, expectedKeywords: string[]) {
  if (expectedKeywords.length === 0) {
    return 1;
  }

  const normalizedAnswer = answer.toLowerCase();
  const matches = expectedKeywords.filter((keyword) =>
    normalizedAnswer.includes(keyword.toLowerCase())
  );

  return matches.length / expectedKeywords.length;
}

// --- 3b. The "first answer grounding" evaluator.
//        The module-08 follow-up triage found that ~all "where do I
//        actually find that?" follow-ups came from first answers that tell
//        Dad to open an app or Settings WITHOUT saying where it lives. This
//        evaluator scores 1 when an answer that sends Dad into an app also
//        grounds the starting point (Home Screen / gray gear icon /
//        swipe-down search / a deep-path breadcrumb), and 0 when it opens
//        something "blind". Answers that need no app-opening score 1 (n/a).
const OPENS_APP = /\b(open|go to|launch|head (?:in)?to)\b.*\b(settings|health|app|photos|safari|messages|maps|mail)\b/i;
const GROUNDING_CUES = [
  "home screen",
  "gray gear",
  "gear",
  "swipe down",
  "search",
  "look for",
  "find the",
  "app icon",
  "control center",
  "top-right",
  "top right",
  "→" // breadcrumb path arrow
];

function firstAnswerGrounding(answer: string) {
  const normalized = answer.toLowerCase();
  // If the answer never tells Dad to open an app, grounding isn't required.
  if (!OPENS_APP.test(normalized)) {
    return { value: 1, grounded: true, applicable: false };
  }
  const grounded = GROUNDING_CUES.some((cue) => normalized.includes(cue.toLowerCase()));
  return { value: grounded ? 1 : 0, grounded, applicable: true };
}

// Convert a dataset item's messages array into the ChatMessage shape
// the live server uses (adds id + timestamp on each message).
function toRuntimeMessages(input: DatasetInput) {
  return input.messages.map((message, index) => ({
    id: `dataset-message-${index + 1}`,
    role: message.role,
    content: message.content,
    timestamp: new Date().toISOString()
  }));
}

async function main() {
  if (!env.langfusePublicKey || !env.langfuseSecretKey) {
    throw new Error("Langfuse credentials are required to run dataset experiments.");
  }

  // --- 4. Pull the hosted dataset by DATASET_NAME from .env.
  const langfuse = new LangfuseClient({
    publicKey: env.langfusePublicKey,
    secretKey: env.langfuseSecretKey,
    baseUrl: env.langfuseBaseUrl
  });

  const dataset = await langfuse.dataset.get(env.datasetName);
  const runName = `dad-it-support-${env.langfusePromptLabel}-${new Date().toISOString()}`;

  // --- 5. runExperiment iterates the dataset, calls `task` for each
  //        item, and records every per-item trace + score under a
  //        single run row identified by `runName`.
  const result = await dataset.runExperiment({
    name: "Dad IT Support Agent experiment",
    runName,
    description: "Workshop dataset run for the Dad IT Support Agent",
    metadata: {
      model: env.openaiModel
    },
    maxConcurrency: 1,
    // `task` runs the agent on one dataset item. The return value
    // becomes the experiment item's `output` and is what the
    // evaluators below score.
    task: async (item) => {
      const input = item.input as DatasetInput;
      const response = await runSupportConversation({
        sessionId: `dataset-${randomUUID()}`,
        userId: "dataset-runner",
        messages: toRuntimeMessages(input)
      });

      return response.answer;
    },
    // Each evaluator returns a Langfuse score that gets attached to
    // the item's trace. Add more evaluators here as the program grows.
    evaluators: [
      async ({ output, expectedOutput }) => {
        const expected = expectedOutput as DatasetExpectation;
        const overlap = keywordOverlap(output as string, expected.expectedKeywords);

        return {
          name: "keyword_overlap",
          value: overlap,
          comment: `Matched ${Math.round(
            overlap * expected.expectedKeywords.length
          )} of ${expected.expectedKeywords.length} expected keywords.`
        };
      },
      async ({ output }) => {
        const grounding = firstAnswerGrounding(output as string);
        const comment = !grounding.applicable
          ? "No app/Settings open required — grounding n/a (scored 1)."
          : grounding.grounded
            ? "Answer opens an app/Settings and grounds where to find it (Home Screen / icon / search / breadcrumb)."
            : "Answer opens an app/Settings WITHOUT saying where to find it — likely to trigger a 'where do I find that?' follow-up.";

        return {
          name: "first_answer_grounding",
          value: grounding.value,
          comment
        };
      }
    ]
  });

  // --- 6. Pretty-print the summary table and flush any pending spans
  //        before the process exits.
  console.log(await result.format());
  await langfuse.flush();
  await langfuseSpanProcessor.forceFlush();
  await sdk.shutdown();
}

void main();
