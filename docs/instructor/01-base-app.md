# 01 Base App

> The base app is already in the repo. There is nothing to build in this chapter — it's a one-minute orientation so the rest of the workshop makes sense.

## What you're looking at

The Dad IT Support Agent is a small web chat where **Dad himself** is the user. The agent's name is **Specs**. It only helps with Dad's iPhone — Wi-Fi, Bluetooth, photos, messages, maps.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## What's in the box

- **One OpenAI tool-calling loop.** Specs sends a turn to OpenAI, optionally calls a tool, sends the tool result back, and returns a final answer.
- **Two local tools** that the model can call:
  - `get_support_context` — fetches Dad's known iPhone setup, apps, and response style
  - `search_help_library` — returns step-by-step articles from a small local manual
- **One local prompt template** that compiles in Dad's context.
- **A side panel** with Dad's iPhone details, hardcoded for the workshop atmosphere.
- **No Langfuse wiring yet.** That gets added one step at a time, starting in `02-tracing`.

## Where the code lives

- `src/client/App.tsx` — the chat UI, mascot, side panel
- `src/server/index.ts` — Express routes (`/api/chat`, `/api/support-context`)
- `src/server/support-agent.ts` — the tool-calling loop you'll instrument next
- `src/server/tools.ts` — `TOOL_DEFINITIONS` and `executeTool(...)`
- `src/server/support-data.ts` — Dad's fixed setup and the local guide library
- `src/server/support-agent.ts` — the local system-prompt template

## Try it before you go further

Ask one of the suggestion chips. You should get a numbered iPhone walkthrough. Open `src/server/support-agent.ts` next to it so you can see the loop that produced the answer — that's the loop we wrap with Langfuse in the next chapter.

## End state

Same as your starting state — the app is running. Move on to `02-tracing`.
