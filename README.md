# Langfuse Parent Support Workshop

This repository is a compact TypeScript workshop app that teaches the Langfuse AI engineering loop end to end around one concrete sample: a parent-support agent that helps with everyday device questions.

The app is intentionally small:

- `React + Vite` gives us a memorable but lightweight web chat.
- `Express + TypeScript` keeps model calls, tools, tracing, and dataset runs on the server where they are easy to inspect.
- `Anthropic` is the model provider.
- `Langfuse Cloud EU` is the default setup target.

## Workshop goals

- Make tracing feel concrete, not abstract.
- Show prompt management as a collaboration tool, not just a config trick.
- Show monitoring as a way to catch interesting production behavior.
- Show datasets and experiments as the bridge from production insight to systematic improvement.

## Quickstart

1. Copy `.env.example` to `.env`.
2. Add `ANTHROPIC_API_KEY`.
3. Add Langfuse keys if you want tracing, prompts, datasets, and experiments.
4. Install dependencies with `npm install`.
5. Run `npm run dev`.
6. Open [http://127.0.0.1:3333](http://127.0.0.1:3333).

If only `ANTHROPIC_API_KEY` is configured, the app still runs with the local fallback prompt.

## Workshop map

- [Setup](./docs/00-setup.md)
- [Base App](./docs/01-base-app.md)
- [Tracing](./docs/02-tracing.md)
- [Prompt Management](./docs/03-prompt-management.md)
- [Monitoring](./docs/04-monitoring.md)
- [Dataset](./docs/05-dataset.md)
- [Experiments](./docs/06-experiments.md)
- [Prompt Iteration](./docs/07-prompt-iteration.md)
- [Wrap-up](./docs/08-wrap-up.md)
- [Checkpoint strategy](./docs/checkpoints.md)

## Repo layout

- `src/client`: the web chat UI
- `src/server`: the parent-support agent, tools, prompt loading, and tracing hooks
- `scripts`: prompt publishing, dataset seeding, and dataset runs
- `data/seed-dataset.json`: the initial workshop dataset
- `docs`: the narration and milestone notes

## Stitchable checkpoints

The workshop is being structured so later milestones can still run if an earlier section is skipped:

- Tracing is optional at runtime. Without Langfuse keys, the app still works.
- Prompt management falls back to the local prompt if the Langfuse prompt is absent.
- Dataset runs use the same server-side app logic as the web UI, so experiments do not depend on a separate path.
- Monitoring docs target the root `agent` observation structure, which stays stable even when the prompt source changes.

That means a later checkpoint can include previous work but remain internally consistent when you jump forward in a workshop.

