# Langfuse Workshop — the AI engineering loop, end to end

This is a **step-by-step Langfuse workshop** built around a small sample application. Working through it takes you through every Langfuse module along the **AI engineering loop**: tracing, prompt management, monitoring, datasets, experiments, and evaluation.

By the end you'll be able to answer:

- How do I log my first trace?
- What does a good trace look like?
- How do I set up prompt management so non-engineers can iterate?
- How do I know what's happening in production?
- How do I use datasets, experiments, and evaluations to continuously improve my application?

## The sample app — Dad IT Support Agent

The workshop is anchored on a small web chat called **Dad IT Support Agent**. Dad himself opens the chat to get help with his iPhone — Wi-Fi, Bluetooth, photos, messages, maps. The agent is named **Specs** and replies with grounded step-by-step instructions.

Under the hood it's a normal OpenAI tool-calling loop. Specs has two tools available:

- `get_support_context` — fetches Dad's iPhone setup (model, iOS version, installed apps, etc.)
- `search_help_library` — returns step-by-step articles from a small local manual.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./docs/images/sample_app.png)

This is deliberately a small app. It exists so each Langfuse layer (trace, prompt, monitor, dataset, experiment) feels concrete instead of abstract, and so workshop participants can finish every module in a sitting.

## Quickstart

1. **Get an OpenAI API key** from [platform.openai.com](https://platform.openai.com).
2. **Sign up for Langfuse Cloud EU** at [langfuse.com](https://langfuse.com), create a project, and copy the public + secret keys.
3. **Configure `.env`:**

   ```bash
   cp .env.example .env
   ```

   Fill in:

   ```bash
   OPENAI_API_KEY=sk-...
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_BASE_URL=https://cloud.langfuse.com
   ```
4. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```
5. **Open [http://127.0.0.1:3333](http://127.0.0.1:3333)** — you should land in the Specs chat.

For the full setup walkthrough, see [`docs/00-setup.md`](./docs/00-setup.md).

## How this workshop works

This workshop lives in a GitHub repository. The walkthrough is split into modules — one per step of the AI engineering loop — and each module is independent:

- **Every step has a git checkpoint.** You can `git checkout checkpoint/02-tracing` to start with a clean, traced app instead of building the previous steps yourself.
- **Modules can be done individually.** If you only care about prompt management, jump straight there. The starting checkpoint puts you in the right state.
- **Every module has a paired learner's guide** (`docs/learner/0X-*.md`) that gives the *exact* steps a participant should run and the reasoning behind each, in checklist form.

### Modules

| Step | What you'll learn |
| --- | --- |
| [00 Setup](./docs/00-setup.md) | Keys, install, run the app. |
| [01 Base App](./docs/01-base-app.md) | A one-minute tour of the running app. Nothing to build — orientation only. |
| [02 Tracing](./docs/02-tracing.md) | Log every step the agent takes. Logger + nested traces + tool spans. |
| [03 Prompt Management](./docs/03-prompt-management.md) | Move the system prompt into Langfuse so non-engineers can iterate. |
| [04 Monitoring](./docs/04-monitoring.md) | Catch interesting production events automatically (out-of-scope, disagreement). |
| [05 Dataset](./docs/05-dataset.md) | Turn product scope into a starter dataset of realistic examples. |
| [06 Experiments](./docs/06-experiments.md) | Run the agent against the dataset, score every item. |
| [07 Evaluate a change](./docs/07-prompt-iteration.md) | Change one thing, rerun the dataset, compare runs side by side. |
| [08 Wrap-up](./docs/08-wrap-up.md) | What you should take home, how to apply this to your own app. |

Learner guides for the same steps live in [`docs/learner/`](./docs/learner/).

## Architecture at a glance

- `React + Vite` — the chat UI in `src/client/`.
- `Express + TypeScript` — model calls, tool execution, traces, and experiment runs in `src/server/`.
- `OpenAI` — the model provider from the very first runnable app.
- `Langfuse Cloud EU` — the default observability + prompt + dataset + experiment target.

Repo layout:

- `src/client/` — the web chat UI (Specs mascot, suggestion chips, phone panel)
- `src/server/` — the agent, tools, prompt resolver, and tracing setup
- `scripts/` — prompt publishing, dataset seeding, and experiment runs
- `data/seed-dataset.json` — the starter workshop dataset
- `docs/` — instructor docs and the `docs/learner/` step-by-step guides

## Stitchable checkpoints

The repo is structured so any module can be the starting point:

- `checkpoint/01-base-app` and `checkpoint/02-tracing-start` — base app, no Langfuse wiring yet.
- `checkpoint/02-tracing` — tracing added.
- `checkpoint/03-prompt-management` — + Langfuse-managed prompts.
- `checkpoint/04-monitoring` through `checkpoint/08-wrap-up` — full code state; the remaining work is in the Langfuse UI (monitors, datasets, experiments, prompt iterations).

Each finished step is also the natural starting point for the next one. See [`docs/checkpoints.md`](./docs/checkpoints.md) for details.

## Where to go next

- Start with [`docs/00-setup.md`](./docs/00-setup.md) and walk the modules in order, **or**
- Skip to whichever module matches what you want to learn, **or**
- Install the [**Langfuse Claude Code skill**](https://langfuse.com/docs) (`/langfuse`) to apply the patterns from this workshop to your own codebase.

For the bigger-picture material, the [Langfuse Academy](https://langfuse.com/academy) has a dedicated lesson per workshop module.
