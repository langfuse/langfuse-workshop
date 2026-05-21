# 03 Prompt Management

## Why manage prompts

Keeping the system prompt in code means every prompt change is a code change: pull request, review, build, deploy. With Langfuse prompt management the prompt lives in Langfuse — versioned, labelled, and editable in the UI — and the app fetches it at request time. That means non-engineers can iterate on prompts, changes ship independent of release cycles, and every version is preserved and linked to the traces it produced.

Learn more in the [Langfuse prompts docs](https://langfuse.com/docs/prompts).

## Goal

By the end of this step, the running app loads its system prompt from Langfuse instead of from the code. If Langfuse is unreachable the app silently falls back to the local copy so the dev loop never breaks. Every OpenAI generation in Langfuse carries a link back to the exact prompt version that produced it.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

The app traces every chat turn and uses `SYSTEM_PROMPT` (a constant in `src/server/support-agent.ts`) as its system message. The Langfuse client package (`@langfuse/client`) and the `scripts/publish-prompt.ts` helper are already in the repo. Two steps:

1. **Publish** the local `SYSTEM_PROMPT` to Langfuse so a versioned copy lives there.
2. **Fetch and link** the prompt back inside the agent and pass it to `observeOpenAI` so traces carry the version badge.

Set these env vars in `.env`:

```bash
LANGFUSE_PROMPT_NAME=dad-it-support-agent
LANGFUSE_PROMPT_LABEL=production
```

## Step 1 — Publish the prompt (Langfuse UI)

The fastest way to create a prompt is to add it manually in the UI — same workflow your team will use for every future iteration.

1. In Langfuse, open **Prompts → New prompt**.
2. Name it `dad-it-support-agent` (matching `LANGFUSE_PROMPT_NAME`).
3. Type: `text`.
4. Paste the body of `SYSTEM_PROMPT` from `src/server/support-agent.ts`.
5. Label the version `production` (matching `LANGFUSE_PROMPT_LABEL`).
6. Save.

![Creating the dad-it-support-agent prompt in Langfuse.](./images/prompt-management/03-prompt-management-new-prompt-form.png)

> 💡 *Alternative — publish via script.* `scripts/publish-prompt.ts` pushes the local `SYSTEM_PROMPT` constant to Langfuse for you (`npm run prompt:publish`). The manual UI flow above is the same workflow your team will use for ongoing iteration, so we lead with it.

## Step 2 — Fetch the prompt and link it to the generation

The agent currently uses `SYSTEM_PROMPT` directly. We want it to fetch from Langfuse at request time and to pass the prompt object through to `observeOpenAI` so the generation gets linked to the version.

The whole change in `src/server/support-agent.ts`:

```ts
import { LangfuseClient } from "@langfuse/client";

let langfuse: LangfuseClient | null = null;

async function getPrompt() {
  if (!isLangfuseConfigured() || !env.langfusePromptName) {
    return null;
  }
  langfuse ??= new LangfuseClient();
  return await langfuse.prompt.get(env.langfusePromptName, {
    fallback: SYSTEM_PROMPT,
    cacheTtlSeconds: process.env.NODE_ENV === "development" ? 0 : 60
  });
}

// inside runSupportConversationInner:
const langfusePrompt = await getPrompt();
const systemPrompt = langfusePrompt ? langfusePrompt.compile() : SYSTEM_PROMPT;

const openai = getOpenAIClient({
  generationName: "openai-chat-completion",
  ...(langfusePrompt ? { langfusePrompt } : {})
});

const transcript = [
  { role: "system", content: systemPrompt },
  ...toOpenAIMessages(request.messages)
];
```

Three things to notice:

- `langfuse.prompt.get(name, { fallback })` — the `fallback` option means the call always resolves: if Langfuse is unreachable or the prompt is missing, the returned object's compiled body is the local `SYSTEM_PROMPT`. No throws, no degradation in user experience.
- `langfusePrompt.compile()` returns the system prompt as a string for our text prompt. (For chat prompts it returns a `messages` array.)
- Passing `langfusePrompt` into `observeOpenAI`'s options is what makes every generation carry the **Prompt** badge linking back to the exact published version. The [Langfuse OpenAI JS integration docs](https://langfuse.com/integrations/model-providers/openai-js) show the canonical pattern.

## Run and verify

```bash
npm run dev
```

Ask a question, then in Langfuse:

1. Open the trace. The OpenAI generation row should show a small **Prompt** badge linking to `dad-it-support-agent` at the version you just published.
2. Open `dad-it-support-agent` in Prompts → scroll to "Used in" → your trace appears.

![A traced openai-chat-completion with the Prompt badge linking back to dad-it-support-agent · v1.](./images/prompt-management/03-prompt-management-prompt-badge.png)

If your `.env` doesn't have Langfuse keys, `getPrompt()` returns `null` and the app uses `SYSTEM_PROMPT` directly — same answers, no Prompt badge on the generation.

## Teaching point

Tracing without prompt management is a one-way street: you can see what the model did but you can't tell which prompt change caused which behavior. Prompt management closes the loop. Now every change in the Langfuse UI is a new version, every trace points at its version, and the eval and monitoring steps can compare versions head-to-head.

A more straightforward way to wire prompt management in line with Langfuse best practices is the [**Langfuse skill**](https://langfuse.com/docs) (`/langfuse`). It applies the recommended caching, fallback, and linking patterns automatically. The hand-rolled walkthrough in this step exists so you understand what the skill is doing under the hood.
