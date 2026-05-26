---
title: "Workshop: Dad IT Support Agent Base App"
description: "Tour the TypeScript support agent before instrumentation: chat UI, Express API, OpenAI tool loop, local tools, and support data."
---

# 01 Base App

> The base app is already in the repo. Nothing to build in this chapter — just orient yourself before tracing starts in `02-tracing`.

## What the running app does

- Dad himself is the user. Specs (the agent) talks directly to him about his iPhone.
- One OpenAI tool-calling loop. Two local tools (`get_support_context`, `search_help_library`).
- The system prompt is rendered locally from `src/server/support-agent.ts`. No Langfuse yet.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Where to look in the code

- `src/client/App.tsx` — chat UI + side panel
- `src/server/index.ts` — Express routes
- `src/server/support-agent.ts` — the tool-calling loop you'll instrument in `02-tracing`
- `src/server/tools.ts` — tool definitions and `executeTool(...)`
- `src/server/support-data.ts` — Dad's fixed context + guide library
- `src/server/support-agent.ts` — system-prompt template


## Bonus

You can customize your experience by changing the phone specs in support-data.ts file. Adding your dad's phone information means, you will get replies for the right type of phone.

## End state

You are ready to start `02-tracing`.
