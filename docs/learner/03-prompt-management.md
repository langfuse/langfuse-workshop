# 03 Prompt Management

## Starting point

```bash
git checkout checkpoint/02-tracing
```

You have a working traced app. The Langfuse client package (`@langfuse/client`) and the helper files (`src/server/prompt-manager.ts`, `scripts/publish-prompt.ts`) are already in the repo — you wire them up in this step.

Make sure `.env` has:

```bash
LANGFUSE_PROMPT_NAME=dad-it-support-agent
LANGFUSE_PROMPT_LABEL=production
WORKSHOP_PROMPT_VARIANT=baseline
```

## Goal

Three steps that match the three things prompt management does:

1. **First prompt** — publish the local template to Langfuse so a versioned copy exists there.
2. **Resolve from Langfuse at request time** — read the prompt from Langfuse with a local fallback.
3. **Link generations to the prompt version** — so every trace points back at the prompt that produced it.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Publish the prompt

Without this, there's nothing in Langfuse for the resolver to fetch. `scripts/publish-prompt.ts` already does the work — run it:

```bash
npm run prompt:publish
```

Open Langfuse → **Prompts** → confirm `dad-it-support-agent` exists with a version labelled `production`. The body should match `local-prompt.ts`'s baseline variant.

## Step 2 — Resolve the prompt at request time

`src/server/prompt-manager.ts` already implements `resolveSupportPrompt(context)`. Read it once — it:

- returns the local prompt if Langfuse keys are missing
- fetches from Langfuse otherwise, with the local template as fallback if the network call fails
- returns `promptSource` (`langfuse` vs `local`) so the UI/response can show which path was taken

In `src/server/support-agent.ts`, swap the inline prompt compilation for a call to the resolver.

**Add the import:**

```ts
import { resolveSupportPrompt } from "./prompt-manager";
```

**Replace the prompt compilation lines** at the top of `runSupportConversationInner` with:

```ts
const context = getSupportContext();
const prompt = await resolveSupportPrompt(context);
```

**Use `prompt.promptText`** in the system message:

```ts
const transcript: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: "system", content: prompt.promptText },
  ...toOpenAIMessages(request.messages)
];
```

**Update the response** to flow `promptSource` through:

```ts
return {
  answer: finalAnswer,
  promptSource: prompt.promptSource,
  // ...
};
```

You can delete the now-unused imports from `./local-prompt` (`buildPromptVariables`, `compileLocalPrompt`, `getLocalPromptTemplate`) from `support-agent.ts` — they only live inside the resolver now.

## Step 3 — Link the generation to the prompt version

Move the `observeOpenAI` wrap **inside** `runSupportConversationInner` so it can carry the active prompt:

```ts
const openai = observeOpenAI(getRawOpenAIClient(), {
  ...(prompt.langfusePrompt ? { langfusePrompt: prompt.langfusePrompt as never } : {})
});
```

`getRawOpenAIClient()` is your existing factory that returns `new OpenAI({ apiKey })` — rename `getOpenAIClient` from step 02 to `getRawOpenAIClient` if you haven't already. Drop the module-level `const openai = observeOpenAI(...)` from step 02 since the wrap now happens per request.

## Verify

```bash
npm run dev
```

Ask one question, then in Langfuse:

- Open the trace, click the OpenAI generation. It should show a **Prompt** badge linking to `dad-it-support-agent` at the published version.
- The root observation's output `promptSource` reads `langfuse`.
- In the Prompts view for `dad-it-support-agent`, scroll to "Used in" and your trace appears.

## Wrap-up

Prompt management is what closes the trace ↔ prompt loop. The `/langfuse` Claude Code skill applies the recommended pattern (caching, fallbacks, linking) automatically — this walkthrough exists so you can see what the skill is doing under the hood.

## End state

This is the starting point for `04-monitoring`.
