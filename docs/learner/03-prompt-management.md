---
title: "Workshop: Prompt Management with Langfuse"
description: "Move the system prompt into Langfuse, fetch the production prompt at runtime, and link every traced generation to its prompt version."
---

# 03 Prompt Management

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

You have a working traced app. The system prompt lives as a constant called `SYSTEM_PROMPT` in `src/server/support-agent.ts` and is used directly as the system message.

In this chapter we move that prompt into Langfuse so it's versioned and editable in the UI, and we fetch it back at request time. The local constant stays in the file as a fallback for when Langfuse isn't reachable.

Make sure `.env` has:

```bash
LANGFUSE_PROMPT_NAME=dad-it-support-agent
LANGFUSE_PROMPT_LABEL=production
```

## Why manage prompts

Keeping the system prompt in code means every prompt change is a code change: pull request, review, build, deploy. With Langfuse prompt management the prompt lives in Langfuse — versioned, labelled, and editable in the UI — and the app fetches it at request time. That means non-engineers can iterate on prompts, changes ship independent of release cycles, and every version is preserved and linked to the traces it produced.

Learn more in the [Langfuse prompts docs](https://langfuse.com/docs/prompts).

## Goal

Two steps:

1. **Publish the system prompt to Langfuse** so a versioned copy lives there.
2. **Fetch it back at request time**, and link each OpenAI generation to the version that produced it.

## Step 1 — Publish the prompt (Langfuse UI)

The most direct way to create a prompt is to add it manually in the UI — it's the same workflow your team will use for every future iteration.

1. In Langfuse, open **Prompts → New prompt**.
2. **Name** it `dad-it-support-agent` (matching `LANGFUSE_PROMPT_NAME` in your `.env`).
3. **Type** is `text`.
4. **Paste** the body of `SYSTEM_PROMPT` from `src/server/support-agent.ts`.
5. **Label** the version `production` (matching `LANGFUSE_PROMPT_LABEL` in your `.env`).
6. **Save**.

![Creating the dad-it-support-agent prompt in Langfuse.](../images/prompt-management/03-prompt-management-new-prompt-form.png)

> 💡 *Alternative — publish via script.* `scripts/publish-prompt.ts` pushes the `SYSTEM_PROMPT` constant up to Langfuse (`npm run prompt:publish`). Same outcome.

## Step 2 — Fetch the prompt from Langfuse

**Add the import** in `src/server/support-agent.ts`:

```ts
import { LangfuseClient } from "@langfuse/client";
```

**Construct the client at module scope:**

```ts
const langfuse = new LangfuseClient();
```

**Add a `getPrompt` helper** that fetches from Langfuse, returning `null` on any failure so the chat can fall back to the local `SYSTEM_PROMPT`:

```ts
async function getPrompt() {
  try { return await langfuse.prompt.get(env.langfusePromptName); }
  catch { return null; }
}
```

**Use it in `runSupportConversation`** — fetch, then fall back to the local constant if the fetch returned null:

```ts
const langfusePrompt = await getPrompt();
const systemPrompt = langfusePrompt?.prompt ?? SYSTEM_PROMPT;
```

**Pass `langfusePrompt` to the existing `observeOpenAI` call** so the generation gets linked to the published prompt version — only when we actually have one:

```ts
const openai = observeOpenAI(
  new OpenAI({ apiKey: env.openaiApiKey }),
  langfusePrompt ? { langfusePrompt } : undefined
);
```

Three things to notice:

- The `observeOpenAI(new OpenAI(...))` call itself didn't change — same inline wrap from step 02. We just added a conditional second argument carrying the `langfusePrompt`.
- The local `SYSTEM_PROMPT` constant stays in the file as the fallback. If Langfuse is misconfigured or the prompt isn't published yet, the chat keeps working — it just won't carry the Prompt badge on that turn.
- Passing `langfusePrompt` into `observeOpenAI` is what makes every generation under that client carry the **Prompt** badge linking back to the exact published version.

## Verify

```bash
npm run dev
```

Ask one question, then in Langfuse:

- Open the trace, click the OpenAI generation. It should show a **Prompt** badge linking to `dad-it-support-agent` at the version you published.
- In the Prompts view for `dad-it-support-agent`, scroll to "Used in" and your trace appears.

![A traced openai-chat-completion with the Prompt badge in the top-right linking back to dad-it-support-agent · v1.](../images/prompt-management/03-prompt-management-prompt-badge.png)

## Wrap-up

Prompt management is what closes the trace ↔ prompt loop. Every prompt version is preserved, every generation knows which version produced it, and you can iterate prompts independent of code deploys.

A more straightforward way to wire prompt management in line with Langfuse best practices is the [**Langfuse skill**](https://github.com/langfuse/skills) (`/langfuse`). The skill applies the recommended patterns to your codebase without you hand-rolling each piece. This walkthrough exists so you can see what the skill is doing under the hood.

## End state

This is the starting point for `04-monitoring`.
