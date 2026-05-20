# 02 Tracing

## How to think about this step

This is the first real Langfuse moment. We take a working but opaque app and turn it into something we can inspect. The goal is not "add telemetry because telemetry is good." The goal is "make one chat turn explain itself."

## Goal

By the end of this step, one chat turn shows up in Langfuse as a nested trace that captures every part of the agent: the OpenAI generation, the tool calls, and the agent run that ties them together.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/02-tracing-start
```

This tag is the blank slate for this step: the base app from `checkpoint/01-base-app`, with no Langfuse wiring yet. The Langfuse packages are already in `package.json` (`@langfuse/otel`, `@langfuse/openai`, `@langfuse/tracing`, `@opentelemetry/sdk-node`). Run `npm install` if you haven't. Make sure `.env` has your `OPENAI_API_KEY` and Langfuse keys.

We will build up the trace in three steps that map directly onto the diagram above:

1. **First trace** — log the OpenAI generations themselves.
2. **Nested traces** — group the generations under a single agent run per turn.
3. **Recording tool calls** — make each tool invocation its own observation.

User/session attribution, tags, and metadata are intentionally left for `04-monitoring`.

## Step 1 — First trace

As a first step we want to log the generations themselves. Without this we have no telemetry at all: the OpenAI call leaves the process, the model thinks, the answer comes back, and we have no record of any of it. Two small changes are enough to fix that.

**Start the Langfuse span processor.** In `src/server/index.ts`, near the top:

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] }).start();
```

The processor reads `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` from the environment.

**Wrap the OpenAI client.** In `src/server/support-agent.ts`, add the import and define a wrapped client at module scope:

```ts
import { observeOpenAI } from "@langfuse/openai";

const openai = observeOpenAI(new OpenAI({ apiKey: env.openaiApiKey }));
```

**Then actually use it.** Find this line in `runSupportConversation`:

```ts
const response = await getOpenAIClient().chat.completions.create({
```

and replace it with:

```ts
const response = await openai.chat.completions.create({
```

Without this swap, the wrapped `openai` is a dead variable and no traces are emitted. The old `getOpenAIClient()` helper becomes unused and can be deleted.

Run `npm run dev`, ask one question in the UI, open Langfuse, and you should see one generation per OpenAI call with the prompt, response, model, tokens, and latency. That's already a real telemetry surface — but every generation shows up as its own top-level trace, and we have no view of "one chat turn" yet.

![Langfuse Traces view after Step 1 — each chat turn appears as standalone openai-chat-completion generations.](./images/02-tracing-step-1.png)

## Step 2 — Nested traces

To set those generations into context we now want to group and nest them together. A single chat turn often involves more than one OpenAI call (the model decides to use a tool, we run the tool, we call OpenAI again with the tool result, and so on). Without grouping, those calls fly past in Langfuse as separate, disconnected traces. With grouping, one chat turn is one trace, and the OpenAI calls live underneath as children.

We do that by wrapping `runSupportConversation` with `observe(...)`. The key insight: `observe(fn, opts)` accepts any async function reference and returns a wrapped version with the same signature. That means three surgical edits — we do not touch the function body.

**1. Add the import** to `src/server/support-agent.ts`:

```ts
import { observe } from "@langfuse/tracing";
```

**2. Demote the existing function.** Find:

```ts
export async function runSupportConversation(request: ChatRequest): Promise<ChatResponse> {
```

Drop the `export` and rename it:

```ts
async function runSupportConversationInner(request: ChatRequest): Promise<ChatResponse> {
```

The body stays exactly as it is.

**3. Add the wrapped export at the bottom of the file:**

```ts
export const runSupportConversation = observe(runSupportConversationInner, {
  name: "dad-it-support-chat-turn",
  asType: "agent"
});
```

`index.ts` still imports `runSupportConversation` the same way — it just happens to be a `const` now. `observe(...)` auto-captures the function argument as the trace input and the return value as the trace output.

Refresh Langfuse and you should now see one root `dad-it-support-chat-turn` observation per turn, with the OpenAI generation nested underneath it.

![Trace tree after Step 2 — one dad-it-support-chat-turn agent root with the OpenAI generation as a child.](./images/02-tracing-step-2.png)

## Step 3 — Recording tool calls

Our agent is using tools — that's how we designed it initially. While we can already see the tool calls in the generation output (they appear in the `tool_calls` field of the OpenAI response), we are not yet logging the tool inputs and outputs as their own observations. The actual tool execution is invisible: if a tool returns the wrong data, we'd see a confused final answer in the trace and have no way to point at the line where it went wrong.

We see a pattern now: we import `observe` from `@langfuse/tracing` and wrap the functions we want to log. The inline switch bodies in `executeTool` can't be observed in place — each tool needs to be its own function so `observe` has something to wrap. Add the import and the two observed helpers above `executeTool`, then redirect the switch at them.

```ts
import { observe } from "@langfuse/tracing";

const getSupportContextTool = observe(
  async () => {
    const context = getSupportContext();

    return {
      ok: true,
      context: {
        id: context.id,
        label: context.label,
        devices: context.devices,
        deviceSummary: context.deviceSummary,
        responseStyle: context.responseStyle,
        scopeHighlights: context.scopeHighlights,
        notableApps: context.notableApps
      }
    };
  },
  { name: "get_support_context", asType: "tool" }
);

const searchHelpLibraryTool = observe(
  async (input: { question: string }) => {
    const guides = searchGuides(input.question);

    return {
      ok: true,
      results: guides.map((guide) => ({
        id: guide.id,
        title: guide.title,
        summary: guide.summary,
        steps: guide.steps,
        caution: guide.caution ?? null
      }))
    };
  },
  { name: "search_help_library", asType: "tool" }
);

export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "get_support_context":
      return getSupportContextTool();

    case "search_help_library":
      return searchHelpLibraryTool({ question: String(input.question ?? "") });

    default:
      return { ok: false, error: `Unsupported tool: ${name}` };
  }
}
```

`TOOL_DEFINITIONS` at the top of the file stays untouched.

![Full trace after Step 3 — dad-it-support-chat-turn (agent) with the OpenAI generation and get_support_context + search_help_library tool observations as siblings underneath.](./images/02-tracing-step-3.png)

## Run and verify

```bash
npm run dev
```

Ask one question that triggers both tools — for example, *"How do I reconnect my iPhone to Wi-Fi?"* — then open Langfuse and check:

1. One root `dad-it-support-chat-turn` observation per turn (type `agent`).
2. One nested OpenAI generation per model call, with prompt, response, tokens, latency.
3. Two nested tool observations (`get_support_context`, `search_help_library`) with their inputs and outputs.

## Teaching point

Same pattern, different observation types, same concept. `observe(fn, { asType: "agent" })` for the chat turn, `observe(fn, { asType: "tool" })` for each tool, and `observeOpenAI(client)` is essentially a specialized version of the same wrap-and-emit pattern, packaged for the OpenAI SDK. Once you internalize *"wrap the thing you want to see, give it a name, give it a type,"* you can structure any application this way.

A more straightforward way to add rich tracing in line with Langfuse best practices is to use the **Langfuse Skill** (`/langfuse`). The skill knows the recommended observation types, naming conventions, and SDK integration patterns, and applies them to your codebase without you hand-rolling each wrap. The hand-rolled walkthrough in this step is here so you understand what the skill is doing under the hood — once you've seen it once, leaning on the skill for the next project is the fast path.
