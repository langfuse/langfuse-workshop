# 04 Monitoring

## Starting point

Start from `checkpoint/03-prompt-management`. You now have:

- a traced app
- optional Langfuse-managed prompts

The trace shape so far is minimal: one root `agent` observation, one OpenAI generation, two tool observations. No user or session attribution yet.

## Goal

1. Add user/session/tag attribution to the trace so monitors can slice traffic.
2. Define the first production signals you want to monitor and map them from the trace structure.

## Exact work to do

### `src/server/support-agent.ts`

1. Import `propagateAttributes` from `@langfuse/tracing` (you already have `observe`).
2. Inside the `observe(...)`-wrapped function, wrap the body in `propagateAttributes(...)`:
   - `userId` — from `request.userId`, with a workshop fallback like `workshop-${context.id}`
   - `sessionId` — from `request.sessionId`
   - `traceName` — `"dad-it-support-chat-turn"`
   - `tags` — `["langfuse-workshop", "dad-it-support"]`
   - `metadata` — `{ contextId, contextLabel }` for later filtering
3. Pass the same `userId`, `sessionId`, and `tags` into the `observeOpenAI(...)` options so the generation row also carries them.
4. Optional: give the generation a clearer name via `generationName: "openai-chat-completion"`.

You do not need to change the tool wrappers.

### Langfuse UI

This is where most of the actual work happens.

1. Confirm new traces show up with `userId`, `sessionId`, and tags populated.
2. Open the session view for one user and confirm the multi-turn timeline.
3. Create or select an LLM-as-a-judge template for out-of-scope detection.
4. Set the target to observation type `agent`, name `dad-it-support-chat-turn`.
5. Map variables from the root observation:
   - `messages` from `$.messages`
   - `assistant_output` from `$.answer`
6. Repeat the same setup for disagreement detection.

Use the whole `messages` array instead of trying to build separate custom fields like `last_user_message` unless you truly need them.

## Where the fields live in the trace

`observe(...)` captures the function input/output automatically, so:

- root input is the full `ChatRequest` (`messages`, `sessionId`, optional `userId`)
- root output is the full `ChatResponse` (`answer`, `promptSource`, `usedTools`, `traceMeta`)
- the system prompt and the full model response live on the child `openai-chat-completion` generation

## What you should not do in this step

- Do not redesign the app.
- Do not change the dataset yet.
- Do not add lots of custom code-side monitors.

## How to verify you are done

- New traces show `userId` and `sessionId` in the Langfuse UI.
- A multi-turn conversation appears as a single session.
- You can name the exact observation target for the monitors.
- You can name the exact JSON paths you will use.
- You can produce one out-of-scope example and one disagreement example in the app.

## End state

This finished understanding becomes the starting point for `05-dataset`.
