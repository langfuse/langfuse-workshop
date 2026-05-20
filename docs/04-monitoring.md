# 04 Monitoring

## How to think about this step

Tracing helps us understand *one* request. Monitoring helps us notice the requests that deserve attention. The point is not to score everything — it's to catch the kinds of events that help us decide what to improve next.

Before monitoring becomes useful we add a small bit of attribution to the trace — `userId`, `sessionId`, tags, metadata — so monitors and dashboards can actually slice traffic.

## Goal

By the end of this step:

1. Every chat turn in Langfuse carries `userId`, `sessionId`, and workshop tags so we can filter and group it.
2. At least one observation-level evaluator is wired up against the agent's root span (`dad-it-support-chat-turn`), watching for out-of-scope requests and user disagreement.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

Your app traces every chat turn and links each generation to a Langfuse-managed prompt. No attribution yet.

We will build this step in two passes:

1. **Attribute the trace** — wrap the agent body in `propagateAttributes(...)` and forward the same fields into `observeOpenAI(...)`.
2. **Wire the first two monitors** — define them in the Langfuse UI against the now-attributed agent observation.

## Step 1 — Attribute the trace

So far the agent loop is wrapped only in `observe(...)` and `observeOpenAI(...)`. The trace shows up in Langfuse but there's no way to slice it by user, by session, or by tag. We fix that by wrapping the body in `propagateAttributes(...)` from `@langfuse/tracing`.

**Add `propagateAttributes` to the import** in `src/server/support-agent.ts`:

```ts
import { observe, propagateAttributes } from "@langfuse/tracing";
```

**Wrap the body** of `runSupportConversationInner` in `propagateAttributes(...)` and pass the same attribution into `observeOpenAI(...)`:

```ts
async function runSupportConversationInner(request: ChatRequest): Promise<ChatResponse> {
  const context = getSupportContext();
  const prompt = await resolveSupportPrompt(context);
  const userId = request.userId ?? `workshop-${context.id}`;

  return propagateAttributes(
    {
      userId,
      sessionId: request.sessionId,
      traceName: "dad-it-support-chat-turn",
      tags: ["langfuse-workshop", "dad-it-support"],
      version: "0.2.0",
      metadata: {
        contextId: context.id,
        contextLabel: context.label
      }
    },
    async () => {
      const openai = observeOpenAI(getRawOpenAIClient(), {
        generationName: "openai-chat-completion",
        userId,
        sessionId: request.sessionId,
        tags: ["langfuse-workshop", "dad-it-support"],
        generationMetadata: {
          promptSource: prompt.promptSource,
          contextId: context.id,
          contextLabel: context.label
        },
        ...(prompt.langfusePrompt ? { langfusePrompt: prompt.langfusePrompt as never } : {})
      });

      // ...the existing tool-calling loop, unchanged...
    }
  );
}
```

What each piece buys you:

- `userId` — enables per-user filters and the "Users" view in Langfuse.
- `sessionId` — groups multi-turn conversations into one session timeline.
- `tags` — coarse filtering (`langfuse-workshop`, `dad-it-support`).
- `metadata` — anything you want to filter by later that does not deserve its own first-class field.
- Same attribution passed to `observeOpenAI` so the generation row carries it too, not just the root.

## Step 2 — Wire the first two monitors

Most of the actual work for this step happens in the Langfuse UI, against the observation shape we just attributed.

**Pick the evaluator target:**

- Observation type: `agent`
- Observation name: `dad-it-support-chat-turn`

**Pick the first two monitors:**

- **Out-of-scope request** — catches things like "Can you file my taxes for me?"
- **User disagreement** — catches things like "No, that menu is not there"

Both are high-signal and easy to explain live.

**Useful mappings** for the LLM-as-a-judge templates:

- `messages` → `$.messages`
- `assistant_output` → `$.answer`

For disagreement detection, pass the whole `messages` array plus the final `answer`. That avoids brittle "last user message" mappings and keeps the evaluator grounded in the whole conversation.

## Where to find the fields in the trace

Because `observe(...)` auto-captures the function argument and return value:

- root observation input is the full `ChatRequest` (`messages`, `sessionId`, optional `userId`)
- root observation output is the full `ChatResponse` (`answer`, `promptSource`, `usedTools`, `traceMeta`)

The system prompt is *not* on the root — it lives on the child `openai-chat-completion` generation captured by `observeOpenAI`.

## Run and verify

```bash
npm run dev
```

1. Send one in-scope question and one out-of-scope question ("Can you file my taxes for me?").
2. Then push a disagreement ("No, that menu is not there").
3. Open Langfuse:
   - Filter traces by tag `langfuse-workshop` — you should see your traffic.
   - Open a session and confirm consecutive turns roll up into one session timeline.
   - Open the Users view and see your synthetic `workshop-dad-default` user.
   - Wait for the evaluator to score — out-of-scope and disagreement traces should bubble to the top.

## Teaching point

Monitoring is the bridge from production traffic to future datasets and experiments. Attribution (`userId`, `sessionId`, tags) is what makes that bridge navigable — without it, every trace is an island.

A more straightforward way to wire attribution and judge templates in line with Langfuse best practices is to use the **Langfuse skill** (`/langfuse`). The hand-rolled walkthrough in this step exists so you understand what the skill is doing under the hood.
