# 03 Prompt Management

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

You have a working traced app. The system prompt currently lives in code as a constant called `SYSTEM_PROMPT` in `src/server/support-agent.ts`. In this chapter we move it into Langfuse so it's versioned and editable in the UI, then have the app fetch it back at request time.

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
2. **Fetch it back at request time** and link each OpenAI generation to the version that produced it.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Publish the prompt (Langfuse UI)

The most direct way to create a prompt is to add it manually in the UI — it's the same workflow your team will use for every future iteration.

1. In Langfuse, open **Prompts → New prompt**.
2. **Name** it `dad-it-support-agent` (matching `LANGFUSE_PROMPT_NAME` in your `.env`).
3. **Type** is `text`.
4. **Paste** the body below — it's the same string as `SYSTEM_PROMPT` in `src/server/support-agent.ts`:

```
You are Dad IT Support Agent.
You are talking directly to Dad. He opened this chat himself to get help with his iPhone.

You do not yet know which iPhone Dad has or which apps he uses — call get_support_context to find out before giving any device-specific instructions.

Rules:
- Speak directly to Dad in second person ("you", "your iPhone"). Never refer to Dad in the third person.
- Call get_support_context as your very first tool call on each turn so you know which iPhone, iOS, and apps Dad has.
- For step-by-step help, call search_help_library before giving the final answer.
- Use short numbered steps with one action per line.
- Mention what Dad should expect to see on his screen after important taps.
- Be honest about limits. You cannot see his screen, passwords, or real-time location.
- If the request is out of scope, say so kindly and redirect to the closest iPhone-help you can give.
- Do not invent button names or settings paths that were not confirmed by tool results.
```

5. **Label** the version `production` (matching `LANGFUSE_PROMPT_LABEL` in your `.env`).
6. **Save**.

![Creating the dad-it-support-agent prompt in Langfuse.](../images/prompt-management/03-prompt-management-new-prompt-form.png)

> 💡 *Alternative — publish via script.* `scripts/publish-prompt.ts` pushes the local `SYSTEM_PROMPT` constant up to Langfuse (`npm run prompt:publish`). Same outcome.
>
> *Production tip — auto-publish on dev start.* In CI or a `predev` npm script you can hook `npm run prompt:publish` so every dev-server start pushes the current `SYSTEM_PROMPT` to Langfuse. Pair that with a stable label and you'll never run with a stale fallback.

## Step 2 — Fetch the prompt and link it to the generation

Now wire the app to read from Langfuse instead of the constant. The whole change in `src/server/support-agent.ts` is:

**Add the import:**

```ts
import { LangfuseClient } from "@langfuse/client";
```

**Add a `getPrompt()` helper at module scope** that fetches the prompt with the local `SYSTEM_PROMPT` as a fallback:

```ts
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
```

**Use it inside `runSupportConversationInner`** — fetch the prompt, compile to a string, and forward the prompt object to `observeOpenAI` so the generation row in Langfuse gets a Prompt badge linking back to the exact version:

```ts
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

- `langfuse.prompt.get(name, { fallback })` returns a prompt object even when Langfuse is unreachable — `fallback` kicks in silently, and the app keeps working.
- `langfusePrompt.compile()` returns the prompt body as a string. (For chat prompts it would return a `messages` array; we use a text prompt.)
- Passing `langfusePrompt` into `observeOpenAI` is what makes every generation under that client carry the **Prompt** badge linking back to the exact published version.

## Verify

```bash
npm run dev
```

Ask one question, then in Langfuse:

- Open the trace, click the OpenAI generation. It should show a **Prompt** badge linking to `dad-it-support-agent` at the version you published.
- In the Prompts view for `dad-it-support-agent`, scroll to "Used in" and your trace appears.

![A traced openai-chat-completion with the Prompt badge in the top-right linking back to dad-it-support-agent · v1.](../images/prompt-management/03-prompt-management-prompt-badge.png)

If your `.env` doesn't have Langfuse keys, `getPrompt()` returns `null` and the app uses `SYSTEM_PROMPT` directly — same answers, just no Prompt badge on the generation.

## Wrap-up

Prompt management is what closes the trace ↔ prompt loop. Every prompt version is preserved, every generation knows which version produced it, and you can iterate prompts independent of code deploys.

A more straightforward way to wire prompt management in line with Langfuse best practices is the [**Langfuse skill**](https://langfuse.com/docs) (`/langfuse`). The skill applies the recommended caching, fallback, and linking patterns to your codebase without you hand-rolling each piece. This walkthrough exists so you can see what the skill is doing under the hood.

## End state

This is the starting point for `04-monitoring`.
