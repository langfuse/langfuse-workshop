# 04 Monitoring

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

You have a traced app with optional Langfuse-managed prompts. No attribution yet on the trace.

## Goal

Two passes that mirror what monitoring needs:

1. **Attribute the trace** — add `userId`, `sessionId`, tags, metadata via `propagateAttributes(...)`.
2. **Wire the first two monitors** in the Langfuse UI: out-of-scope requests and user disagreement.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Attribute the trace

### `src/server/support-agent.ts`

**Add `propagateAttributes` to the import:**

```ts
import { observe, propagateAttributes } from "@langfuse/tracing";
```

**Wrap the body of `runSupportConversationInner` in `propagateAttributes(...)`** and forward the same fields into `observeOpenAI(...)`:

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

      // ...existing tool-calling loop, unchanged...
    }
  );
}
```

What each piece buys you:

- `userId` → "Users" view in Langfuse
- `sessionId` → groups multi-turn conversations into a single session
- `tags` → coarse filtering
- `metadata` → secondary filter dimensions

## Step 2 — Wire the first two monitors (Langfuse UI)

Most work happens in the Langfuse UI now.

1. Open Evaluators → create an LLM-as-a-judge template for **out-of-scope detection**.
2. Target observation type `agent`, name `dad-it-support-chat-turn`.
3. Map variables from the root observation:
   - `messages` from `$.messages`
   - `assistant_output` from `$.answer`
4. Repeat for **user disagreement** detection.

The system prompt isn't on the root — it lives on the child `openai-chat-completion` generation. Map from there if your judge needs it.

## Verify

```bash
npm run dev
```

1. Ask one in-scope question, one out-of-scope ("Can you file my taxes?"), and one with disagreement ("No, that menu is not there").
2. Filter traces in Langfuse by tag `langfuse-workshop` — your traffic should show up.
3. Open the session view, confirm consecutive turns roll up.
4. After the evaluator scores, the out-of-scope and disagreement traces should bubble to the top.

## What you should not do

- Don't redesign the app.
- Don't add lots of code-side custom monitors.
- Don't change the dataset yet.

## Wrap-up

The `/langfuse` Claude Code skill applies these attribution and evaluator patterns automatically — this walkthrough exists so you see what the skill is doing under the hood.

## End state

This is the starting point for `05-dataset`.
