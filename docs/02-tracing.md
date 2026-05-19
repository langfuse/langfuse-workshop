# 02 Tracing

## How to think about this step

This is the first real Langfuse moment. We take a working but opaque app and turn it into something we can inspect. We do it in two passes: get one trace flowing, then add the structure that makes the trace useful.

## Goal

By the end of this step:

- every OpenAI call in the app shows up as a trace in Langfuse
- one chat turn is a nested trace with an agent root, the OpenAI generation, and the two tool calls

User/session attribution, tags, and metadata are intentionally left for `04-monitoring`.

## Starting point

```bash
git checkout checkpoint/01-base-app
```

The Langfuse packages are already in `package.json` (`@langfuse/otel`, `@langfuse/openai`, `@langfuse/tracing`, `@opentelemetry/sdk-node`). Run `npm install` if you haven't. Make sure `.env` has your `OPENAI_API_KEY` and Langfuse keys.

## Logging the first trace

Two changes, and every OpenAI call in the app is traced.

**Start the Langfuse span processor.** In `src/server/index.ts`, near the top:

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] }).start();
```

The processor reads `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` from the environment.

**Wrap the OpenAI client.** In `src/server/support-agent.ts`:

```ts
import { observeOpenAI } from "@langfuse/openai";

const openai = observeOpenAI(new OpenAI({ apiKey: env.openaiApiKey }));
```

Then use `openai.chat.completions.create(...)` exactly as before.

That is the whole minimum. Run `npm run dev`, ask one question in the UI, open Langfuse, and you should see one generation with the prompt, the response, the model, tokens, and latency.

## Richer trace structure

The first-trace version shows each OpenAI call as its own top-level generation. Tool calls live inside the generation’s `tool_calls` field, and there is no “one turn” parent grouping everything. We fix both with `observe(...)`.

**Wrap the agent function** to create a single root observation per turn. In `src/server/support-agent.ts`:

```ts
import { observe } from "@langfuse/tracing";

const observedRunSupportConversation = observe(
  async (request: ChatRequest): Promise<ChatResponse> => {
    // existing logic, including observeOpenAI(...)
  },
  { name: "dad-it-support-chat-turn", asType: "agent" }
);

export async function runSupportConversation(request: ChatRequest) {
  return observedRunSupportConversation(request);
}
```

`observe(...)` auto-captures the function argument as the trace input and the return value as the trace output.

**Wrap each tool** so the model’s tool calls become their own spans. In `src/server/tools.ts`:

```ts
import { observe } from "@langfuse/tracing";

const getSupportContextTool = observe(
  async () => { /* existing body */ },
  { name: "get_support_context", asType: "tool" }
);

const searchHelpLibraryTool = observe(
  async (input: { question: string }) => { /* existing body */ },
  { name: "search_help_library", asType: "tool" }
);
```

Then make `executeTool(...)` delegate to those wrapped functions.

## Where the bootstrap lives in this repo

For production use it's nicer to skip tracing cleanly when Langfuse keys are missing and to flush on shutdown. In this repo that's factored into `src/server/instrumentation.ts`, which exposes `ensureTracingInitialized()` and `shutdownTracing()`. The body is the same `LangfuseSpanProcessor` + `NodeSDK.start()` you saw above. `src/server/index.ts` calls those helpers instead of inlining.

You don't have to write `instrumentation.ts` to follow this step — the inline snippet works. Reading it once is enough.

## Run and verify

```bash
npm run dev
```

Ask one question that triggers both tools — for example, *“How do I reconnect my iPhone to Wi-Fi?”* — then open Langfuse and check:

1. One root `dad-it-support-chat-turn` observation per turn.
2. One nested OpenAI generation showing prompt, response, tokens, latency.
3. Two nested tool observations (`get_support_context`, `search_help_library`) with their inputs and outputs.

## Teaching point

Two lines (`LangfuseSpanProcessor.start()` + `observeOpenAI(...)`) are enough to see *that* the model was called. `observe(...)` on the agent and tools is what turns that flat generation log into a structured trace you can actually debug — and is what monitoring, datasets, and experiments hang off in the later steps.
