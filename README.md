# Langfuse Parent Support Workshop

This repository is a compact TypeScript workshop app built around one concrete sample application: a parent-support agent for everyday device questions.

The app at this checkpoint is intentionally small:

- `React + Vite` for a minimal but memorable web chat
- `Express + TypeScript` for the server-side agent loop
- `Anthropic` as the model provider
- local tools and profile context so the app already feels practical

## Workshop goals

- Make the sample app concrete before introducing Langfuse.
- Keep the runtime small enough that every later step stays easy to explain.
- Build toward tracing, prompt management, monitoring, datasets, experiments, and iteration.

## Quickstart

1. Copy `.env.example` to `.env`.
2. Add `ANTHROPIC_API_KEY`.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.
5. Open [http://127.0.0.1:3333](http://127.0.0.1:3333).

## Workshop map

- [Setup](./docs/00-setup.md)
- [Base App](./docs/01-base-app.md)

## Repo layout

- `src/client`: the web chat UI
- `src/server`: the agent loop, tools, prompt loading, and server routes
- `docs`: workshop narration for each milestone
