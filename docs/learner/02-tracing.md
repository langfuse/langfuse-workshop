# 02 Tracing

## Starting point

```bash
git checkout checkpoint/01-base-app
```

The Langfuse packages are already in `package.json` — run `npm install` if you haven't. Make sure `.env` has your `OPENAI_API_KEY` and Langfuse keys.

## Goal

In two passes:

1. **Logging the first trace** — every OpenAI call shows up in Langfuse.
2. **Richer trace structure** — one chat turn becomes a nested trace with an agent root, the OpenAI generation, and the two tool calls.

User/session attribution and tags come in `04-monitoring`.

## Logging the first trace

### `src/server/index.ts`

Start the Langfuse span processor near the top of the file:

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] }).start();
```

The processor reads `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` from the environment.

### `src/server/support-agent.ts`

Wrap the OpenAI client:

```ts
import { observeOpenAI } from "@langfuse/openai";

const openai = observeOpenAI(new OpenAI({ apiKey: env.openaiApiKey }));
```

Use `openai.chat.completions.create(...)` as before.

**Verify:** `npm run dev`, ask one question in the UI, refresh Langfuse — you should see one generation with prompt, response, tokens, and latency.

## Richer trace structure

### `src/server/support-agent.ts`

Wrap the chat-turn function with `observe(...)` so each turn becomes one root observation:

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

### `src/server/tools.ts`

Wrap each tool body so tool calls become their own spans:

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

Make `executeTool(...)` delegate to those wrapped functions.

## Where the bootstrap lives in this repo

`src/server/instrumentation.ts` already wraps the inline `NodeSDK.start()` snippet from above with two helpers, `ensureTracingInitialized()` (no-op when keys are missing) and `shutdownTracing()` (flushes spans on exit), and `index.ts` calls those instead of inlining. You do not need to edit either file — read `instrumentation.ts` once and move on.

## How to verify you are done

- A single user turn creates a trace in Langfuse.
- Root observation: `dad-it-support-chat-turn` (type `agent`).
- Child generation from `observeOpenAI(...)` with prompt, response, tokens, latency.
- Child tool observations: `get_support_context`, `search_help_library`.
- Root input is the chat request; root output is the chat response.

## End state

This finished traced app is the starting point for `03-prompt-management` and `04-monitoring`.
