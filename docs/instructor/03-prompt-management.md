# 03 Prompt Management

## Why manage prompts

Keeping the system prompt in code means every prompt change is a code change: pull request, review, build, deploy. With Langfuse prompt management the prompt lives in Langfuse — versioned, labelled, and editable in the UI — and the app fetches it at request time. That means non-engineers can iterate on prompts, changes ship independent of release cycles, and every version is preserved and linked to the traces it produced.

Learn more in the [Langfuse prompts docs](https://langfuse.com/docs/prompts).

## Goal

By the end of this step, the running app loads its system prompt from Langfuse instead of from the code. If Langfuse is unreachable or the prompt is missing, the app silently falls back to the local copy so the dev loop never breaks. Every OpenAI generation in Langfuse carries a link back to the exact prompt version that produced it.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

You should have a working traced app: every chat turn lands in Langfuse as a nested trace with `dad-it-support-chat-turn` → OpenAI generation → tool spans.

The Langfuse client package (`@langfuse/client`) and the helper files (`src/server/prompt-manager.ts`, `scripts/publish-prompt.ts`) are already in the repo. We wire them in three steps:

1. **Publish the prompt** to Langfuse so a versioned copy lives there.
2. **Resolve the prompt at request time** from Langfuse, with the local copy as fallback.
3. **Link the OpenAI generation to the prompt version** so traces and prompts cross-reference each other.

Set these env vars in `.env`:

```bash
LANGFUSE_PROMPT_NAME=dad-it-support-agent
LANGFUSE_PROMPT_LABEL=production
WORKSHOP_PROMPT_VARIANT=baseline
```

## Step 1 — Publish the prompt (Langfuse UI)

The fastest way to create a prompt is to add it manually in the UI — and it's the same workflow your team will use for every future iteration. We lead with that.

1. In Langfuse, open **Prompts → New prompt**.
2. Name it `dad-it-support-agent` (matching `LANGFUSE_PROMPT_NAME`).
3. Type: `text`.
4. Paste the body below into the prompt content:

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

5. Label the version `production` (matching `LANGFUSE_PROMPT_LABEL`).
6. Save.

The `{{context_summary}}`, `{{response_style}}`, and `{{scope_summary}}` placeholders are template variables — the app fills them in at request time from Dad's context.

![Creating the dad-it-support-agent prompt in Langfuse — name, type, body with template variables, and the production label.](./images/prompt-management/03-prompt-management-new-prompt-form.png)

> 💡 *Alternative — publish via script.* `scripts/publish-prompt.ts` pushes the local template up for you (`npm run prompt:publish`). The manual UI flow above is the same workflow your team will use for ongoing iteration, so we lead with it.

## Step 2 — Resolve the prompt at request time

Right now the system prompt is read from `src/server/local-prompt.ts`. We want the app to fetch from Langfuse instead — but only when Langfuse is reachable. If keys are missing or the network is down, the local template still works.

`src/server/prompt-manager.ts` already implements that logic in `resolveSupportPrompt(context)`. In plain terms:

- If you don't have Langfuse keys set, use the local template.
- If you do, fetch from Langfuse by `LANGFUSE_PROMPT_NAME` + `LANGFUSE_PROMPT_LABEL`. If the call fails for any reason, fall back to the local template.
- Either way, fill in the template variables and return the finished prompt text plus a flag (`promptSource`) saying whether it came from Langfuse or local.

In `src/server/support-agent.ts`, replace the inline prompt compilation with a call to the resolver:

```ts
import { resolveSupportPrompt } from "./prompt-manager";

async function runSupportConversationInner(request: ChatRequest): Promise<ChatResponse> {
  const context = getSupportContext();
  const prompt = await resolveSupportPrompt(context);

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

Tracing is already capturing every OpenAI call. But Langfuse doesn't yet know which prompt version produced each generation — the prompt is just text in the request. We fix that by handing the resolved prompt object to `observeOpenAI(...)`, which records the link on every generation it captures.

Concretely, this gives you three things:

- Each generation in Langfuse gets a clickable **Prompt** badge linking back to the exact version that produced it.
- The Prompts view shows a "Used in" section listing every trace that ran against that version.
- Later steps (monitoring, experiments) can filter or compare by prompt version with no extra wiring.

Move the `observeOpenAI` wrap **inside** `runSupportConversationInner` so it has access to the resolved prompt, and pass `langfusePrompt`:

```ts
const openai = observeOpenAI(getRawOpenAIClient(), {
  ...(prompt.langfusePrompt ? { langfusePrompt: prompt.langfusePrompt as never } : {})
});
```

`getRawOpenAIClient` is just the plain factory that returns `new OpenAI({ apiKey })` — rename your old module-level helper if needed. Drop the module-level `const openai = observeOpenAI(...)` from step 02; the wrap now happens per request because it needs the per-request prompt.

## Run and verify

```bash
npm run dev
```

Ask a question, then in Langfuse:

1. Open the trace. The OpenAI generation row should show a small **Prompt** badge linking to `dad-it-support-agent` at the version you just published.
2. The root observation's output `promptSource` should now read `langfuse`.
3. Go to Prompts, open `dad-it-support-agent`, scroll down — your trace appears under "Used in".

![A traced openai-chat-completion with the Prompt badge in the top-right linking back to dad-it-support-agent · v1.](./images/prompt-management/03-prompt-management-prompt-badge.png)

If your env doesn't have Langfuse keys, `promptSource` reads `local` and the app gracefully degrades.

## Teaching point

Tracing without prompt management is a one-way street: you can see what the model did but you can't tell which prompt change caused which behavior. Prompt management closes the loop. Now every change in the Langfuse UI is a new version, every trace points at its version, and the eval and monitoring steps can compare versions head-to-head.

A more straightforward way to wire prompt management in line with Langfuse best practices is the [**Langfuse skill**](https://langfuse.com/docs) (`/langfuse`). It knows the recommended caching defaults, fallback patterns, and how to attach prompts to generations across all the SDKs. The hand-rolled walkthrough in this step exists so you understand what the skill is doing under the hood.
