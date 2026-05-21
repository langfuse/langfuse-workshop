# 03 Prompt Management

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

You have a working traced app. The Langfuse client package (`@langfuse/client`) and the helper files (`src/server/prompt-manager.ts`, `scripts/publish-prompt.ts`) are already in the repo — you wire them up in this step.

Make sure `.env` has:

```bash
LANGFUSE_PROMPT_NAME=dad-it-support-agent
LANGFUSE_PROMPT_LABEL=production
WORKSHOP_PROMPT_VARIANT=baseline
```

## Why manage prompts

Keeping the system prompt in code means every prompt change is a code change: pull request, review, build, deploy. With Langfuse prompt management the prompt lives in Langfuse — versioned, labelled, and editable in the UI — and the app fetches it at request time. That means non-engineers can iterate on prompts, changes ship independent of release cycles, and every version is preserved and linked to the traces it produced.

Learn more in the [Langfuse prompts docs](https://langfuse.com/docs/prompts).

## Goal

Three steps that match the three things prompt management does:

1. **First prompt** — publish the system prompt to Langfuse so a versioned copy lives there.
2. **Resolve from Langfuse at request time** — read the prompt from Langfuse instead of from the file, with a local fallback if Langfuse is unreachable.
3. **Link generations to the prompt version** — so every trace points back at the prompt that produced it.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Publish the prompt (Langfuse UI)

Without this, there's nothing in Langfuse for the resolver to fetch. The most direct way to create a prompt is to add it manually in the UI — it's the same workflow your team will use for every future iteration.

1. In Langfuse, open **Prompts → New prompt**.
2. **Name** it `dad-it-support-agent` (matching `LANGFUSE_PROMPT_NAME` in your `.env`).
3. **Type** is `text`.
4. **Paste** the body below into the prompt content:

```
You are Dad IT Support Agent.
You are talking directly to Dad. He opened this chat himself to get help with his iPhone.

Known setup:
{{context_summary}}

Response style:
{{response_style}}

Support scope:
{{scope_summary}}

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

The `{{context_summary}}`, `{{response_style}}`, and `{{scope_summary}}` placeholders are template variables — the app fills them in at request time from Dad's context.

![Creating the dad-it-support-agent prompt in Langfuse — name, type, body with template variables, and the production label.](../images/prompt-management/03-prompt-management-new-prompt-form.png)

> 💡 *Alternative — publish via script.* If you prefer to keep prompt content under version control in code, `scripts/publish-prompt.ts` pushes the local `SYSTEM_PROMPT` constant from `src/server/support-agent.ts` up to Langfuse (`npm run prompt:publish`). The manual UI flow above is the same workflow your team will use for ongoing iteration, so we lead with it.
>
> *Production tip — auto-publish on dev start.* In CI or in a `predev` npm script you can hook `npm run prompt:publish` so every time the app boots, the current `SYSTEM_PROMPT` is pushed to Langfuse as a new version. Pair that with a stable label (`production`, `staging`) and you'll never run a workshop with a stale fallback. Skip this for the workshop — but worth knowing for your own app.

## Step 2 — Resolve the prompt at request time

Right now the system prompt is read from `src/server/local-prompt.ts`. We need the app to fetch from Langfuse instead — but only if Langfuse is reachable. If keys are missing or the network is down, the local template still works.

`src/server/prompt-manager.ts` already implements that logic in a function called `resolveSupportPrompt(context)`. Read it once — at a high level it does this:

- If you don't have Langfuse keys set, use the local template.
- If you do, fetch from Langfuse using the `LANGFUSE_PROMPT_NAME` + `LANGFUSE_PROMPT_LABEL` from `.env`. If that call fails for any reason, fall back to the local template.
- Either way, fill in the template variables (Dad's context, response style, scope) and return the finished prompt text — plus a flag (`promptSource`) saying whether it came from Langfuse or local.

Now wire it into the agent. In `src/server/support-agent.ts`:

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

Tracing is already capturing every OpenAI call. But right now Langfuse has no way of knowing *which prompt version produced this generation* — the prompt is just text the app sent. We fix that by handing the resolved prompt object to `observeOpenAI(...)`, which records the link on every generation it captures.

Concretely, this does three things:

- Each generation row in Langfuse gets a clickable **Prompt** badge linking back to the exact version that produced it.
- The Prompts view shows a "Used in" section listing every trace that ran against that version — useful for sanity-checking a prompt change.
- Later steps (monitoring, experiments) can filter or compare by prompt version with no extra wiring.

Move the `observeOpenAI` wrap **inside** `runSupportConversationInner` so it has access to the resolved `prompt` object, and pass `langfusePrompt`:

```ts
const openai = observeOpenAI(getRawOpenAIClient(), {
  ...(prompt.langfusePrompt ? { langfusePrompt: prompt.langfusePrompt as never } : {})
});
```

`getRawOpenAIClient()` is your existing factory that returns `new OpenAI({ apiKey })` — rename `getOpenAIClient` from step 02 to `getRawOpenAIClient` if you haven't already. Drop the module-level `const openai = observeOpenAI(...)` from step 02; the wrap now happens per request because it needs the per-request prompt.

## Verify

```bash
npm run dev
```

Ask one question, then in Langfuse:

- Open the trace, click the OpenAI generation. It should show a **Prompt** badge linking to `dad-it-support-agent` at the version you published.
- The root observation's output `promptSource` reads `langfuse`.
- In the Prompts view for `dad-it-support-agent`, scroll to "Used in" and your trace appears.

![A traced openai-chat-completion with the Prompt badge in the top-right linking back to dad-it-support-agent · v1.](../images/prompt-management/03-prompt-management-prompt-badge.png)

## Wrap-up

Prompt management is what closes the trace ↔ prompt loop. Every prompt version is preserved, every generation knows which version produced it, and you can iterate prompts independent of code deploys.

A more straightforward way to wire prompt management in line with Langfuse best practices is the [**Langfuse skill**](https://langfuse.com/docs) (`/langfuse`). The skill applies the recommended caching, fallback, and linking patterns to your codebase without you hand-rolling each piece. This walkthrough exists so you can see what the skill is doing under the hood.

## End state

This is the starting point for `04-monitoring`.
