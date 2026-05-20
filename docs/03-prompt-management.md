# 03 Prompt Management

## How to think about this step

Prompt management is not a separate product from tracing. It becomes useful because traces tell us which prompt version produced which behavior. After this step, every generation in Langfuse carries the version of the prompt that produced it, so you can change a prompt in the UI and see the effect on the very next trace.

## Goal

By the end of this step, the running app loads its system prompt from Langfuse instead of from the code. If Langfuse is unreachable or the prompt is missing, the app silently falls back to the local copy so the dev loop never breaks.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/02-tracing
```

You should have a working traced app: every chat turn lands in Langfuse as a nested trace with `dad-it-support-chat-turn` → OpenAI generation → tool spans.

The packages we need (`@langfuse/client`) and the helper files (`src/server/prompt-manager.ts`, `scripts/publish-prompt.ts`) are already in the repo at this checkpoint. We will wire them in three steps:

1. **Publish the local prompt** so a versioned copy exists in Langfuse.
2. **Resolve the prompt at request time** from Langfuse, with the local copy as fallback.
3. **Link the OpenAI generation to the prompt version** so traces and prompts cross-reference each other.

Set these env vars in `.env` so the prompt has a stable name and label:

```bash
LANGFUSE_PROMPT_NAME=dad-it-support-agent
LANGFUSE_PROMPT_LABEL=production
WORKSHOP_PROMPT_VARIANT=baseline
```

## Step 1 — Publish the prompt

As a first step we want a versioned copy of the system prompt living in Langfuse. Until that's done there's nothing to fetch — the resolver would just fall through to the local copy on every request. Publishing puts the prompt under version control and gives every generation a stable reference to point at.

`scripts/publish-prompt.ts` already wraps this with a one-liner. Read it once to understand what it does:

```ts
import "dotenv/config";
import { publishSupportPrompt } from "../src/server/prompt-manager";
import type { PromptVariant } from "../src/server/local-prompt";

async function main() {
  const variant = (process.env.WORKSHOP_PROMPT_VARIANT ?? "baseline") as PromptVariant;
  const result = await publishSupportPrompt(variant);
  console.log(`Published prompt "${result.name}" with label "${result.label}" ...`);
}

void main();
```

Run it:

```bash
npm run prompt:publish
```

Open the Langfuse UI → **Prompts** → you should see `dad-it-support-agent` with one version labelled `production`. The body matches whatever is in `src/server/local-prompt.ts` for the active variant.

## Step 2 — Resolve the prompt at request time

The agent still reads from the local template. To flip that, we move the prompt selection out of the request handler and into a resolver that asks Langfuse first.

`src/server/prompt-manager.ts` already implements that resolver. The key function is `resolveSupportPrompt(context)`:

```ts
export async function resolveSupportPrompt(context: SupportContext): Promise<ResolvedPrompt> {
  const variant = (env.workshopPromptVariant as PromptVariant) || "baseline";
  const fallback = getLocalPromptTemplate(variant);
  const variables = buildPromptVariables(context);
  const langfuse = getLangfuseClient();

  if (!langfuse || !env.langfusePromptName) {
    return {
      promptText: compileLocalPrompt(fallback, variables),
      promptSource: "local",
      variant
    };
  }

  const prompt = await langfuse.prompt.get(env.langfusePromptName, {
    type: "text",
    label: env.langfusePromptLabel || undefined,
    fallback,
    cacheTtlSeconds: process.env.NODE_ENV === "development" ? 0 : 60
  });

  return {
    promptText: prompt.compile(variables),
    promptSource: prompt.isFallback ? "local" : "langfuse",
    linkedPrompt: { name: prompt.name, version: prompt.version, isFallback: prompt.isFallback },
    langfusePrompt: prompt,
    variant
  };
}
```

Two important behaviors:

- If Langfuse keys are missing **or** the prompt doesn't exist, the resolver compiles the local template and returns `promptSource: "local"`. The app keeps working.
- The `fallback` option to `langfuse.prompt.get` means even with keys configured, a network error or missing label silently uses the local template instead of throwing.

In `src/server/support-agent.ts`, replace the inline prompt compilation with a call to the resolver. **Replace your existing function body**:

```ts
import { resolveSupportPrompt } from "./prompt-manager";

async function runSupportConversationInner(request: ChatRequest): Promise<ChatResponse> {
  const context = getSupportContext();
  const prompt = await resolveSupportPrompt(context);

  // ...use prompt.promptText in the system message...
  const transcript: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt.promptText },
    ...toOpenAIMessages(request.messages)
  ];

  // ...rest of the loop unchanged...

  return {
    answer: finalAnswer,
    promptSource: prompt.promptSource,
    usedTools: [...usedTools],
    traceMeta: { /* unchanged */ }
  };
}
```

We also surface `prompt.promptSource` on the response so the UI can show whether the active turn used the Langfuse-managed prompt or the local fallback.

## Step 3 — Link the generation to the prompt version

Tracing is already in place, but the OpenAI generation has no notion of which prompt produced it. We fix that by passing `langfusePrompt` through to `observeOpenAI(...)`. The wrapper records the link as part of every generation it captures.

In the same `runSupportConversationInner`, move the `observeOpenAI` call **inside** the function and forward the resolved prompt:

```ts
const openai = observeOpenAI(getRawOpenAIClient(), {
  ...(prompt.langfusePrompt ? { langfusePrompt: prompt.langfusePrompt as never } : {})
});
```

`getRawOpenAIClient` is just the plain factory that returns `new OpenAI({ apiKey })` — rename your old module-level helper if needed.

## Run and verify

```bash
npm run dev
```

Ask a question, then in Langfuse:

1. Open the new trace. The OpenAI generation row should show a small **Prompt** badge linking to `dad-it-support-agent` at the version you just published.
2. The root observation's output `promptSource` should now read `langfuse` (vs `local` before this step).
3. Go to Prompts, open `dad-it-support-agent`, scroll down — you should see the trace listed under "Used in".

If your env doesn't have Langfuse keys, `promptSource` will still read `local` and that's fine — the app gracefully degrades.

## Teaching point

Tracing without prompt management is a one-way street: you can see what the model did but you can't tell which prompt change caused which behavior. Prompt management closes the loop. Now every change in the Langfuse UI is a new version, every trace points at its version, and the eval and monitoring steps can compare versions head-to-head.

A more straightforward way to wire prompt management in line with Langfuse best practices is to use the **Langfuse skill** (`/langfuse`). It knows the recommended caching defaults, fallback patterns, and how to attach prompts to generations across all the SDKs. The hand-rolled walkthrough in this step exists so you understand what the skill is doing under the hood.
