# 04 Monitoring

## How to think about this step

Tracing helps us understand one request. Monitoring helps us notice the requests that deserve attention. The point is not to score everything. The point is to catch the kinds of events that help us decide what to improve next.

To make those signals usable, we first add a small bit of attribution to the trace — `userId`, `sessionId`, tags, and metadata — so monitors and dashboards can slice traffic.

## Scope of the sample app

In scope:

- practical iPhone help for Dad
- Bluetooth, Wi-Fi, photos, maps, messages

Out of scope:

- taxes
- travel booking on Dad's behalf
- anything that requires live account access, passwords, or live location

## Step 1 — Add user/session/tag attribution

File: `src/server/support-agent.ts`. So far the agent loop is wrapped only in `observe(...)` and `observeOpenAI(...)`. To enable user-level monitoring and the session view in Langfuse, attach attributes that propagate to every child span:

```ts
import { observe, propagateAttributes } from "@langfuse/tracing";

const observedRunSupportConversation = observe(
  async (request: ChatRequest): Promise<ChatResponse> => {
    const context = getSupportContext();
    const userId = request.userId ?? `workshop-${context.id}`;

    return propagateAttributes(
      {
        userId,
        sessionId: request.sessionId,
        traceName: "dad-it-support-chat-turn",
        tags: ["langfuse-workshop", "dad-it-support"],
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
          tags: ["langfuse-workshop", "dad-it-support"]
        });

        // ...existing tool-calling loop...
      }
    );
  },
  { name: "dad-it-support-chat-turn", asType: "agent" }
);
```

What each piece buys you:

- `userId` — enables per-user filters and the “users” view in Langfuse.
- `sessionId` — groups multi-turn conversations into one session timeline.
- `tags` — coarse filtering (`langfuse-workshop`, `dad-it-support`).
- `metadata` — anything you want to filter by later that does not deserve its own first-class field.

## Step 2 — Suggested first two monitors

- **Out-of-scope request**
- **User disagreement**

Both are high-signal and easy to explain live.

## Recommended evaluator target

Use an observation-level evaluator on:

- observation type: `agent`
- observation name: `dad-it-support-chat-turn`

## Where to find the fields in the trace

Because `observe(...)` auto-captures the function argument and return value:

- root observation input is the full `ChatRequest`:
  - `messages`
  - `sessionId`
  - `userId` (optional)
- root observation output is the full `ChatResponse`:
  - `answer`
  - `promptSource`
  - `usedTools`
  - `traceMeta`

The system prompt is not on the root — it is on the child `openai-chat-completion` generation, which has the full prompt + completion captured by `observeOpenAI`.

## Useful mappings

For monitors that read from the root observation:

- `messages` → `$.messages`
- `assistant_output` → `$.answer`

For disagreement detection, pass the whole `messages` array plus the final `answer`. That avoids brittle “last user message” mappings and keeps the evaluator grounded in the whole conversation.

## Demo suggestion

1. Ask a clearly out-of-scope question:
   - “Can you file my taxes for me?”
2. Ask a question, get an answer, then disagree:
   - “No, that menu is not there.”
3. Show how those traces become review candidates in Langfuse, sliced by `userId` and `sessionId`.

## Teaching point

Monitoring is the bridge from production traffic to future datasets and experiments. Attribution (`userId`, `sessionId`, tags) is what makes that bridge navigable.
