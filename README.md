# Langfuse Workshop — the AI engineering loop, end to end

## Introduction

This is a **step-by-step Langfuse workshop** built on a small sample application — the *Dad IT Support Agent*. Working through it takes you through every Langfuse module along the **AI engineering loop**: tracing, prompt management, monitoring, datasets, experiments, and evaluation.

![The AI Engineering Loop](./docs/images/AI-engineering-loop.png)

The sample app is a small web chat where Dad himself opens the chat to get iPhone help. The agent is named **Specs** and answers with step-by-step instructions. Under the hood it's a normal OpenAI tool-calling loop with two tools.

![The Dad IT Support Agent sample app — Specs greeting Dad, suggestion chips, and the iPhone side panel.](./docs/images/sample_app.png)

## Should I work through this?

If you can answer "yes" to any of these, yes:

- I want to **log my first trace** from a real LLM app and understand what I'm looking at.
- I want **prompt management** my whole team can edit — versioned and linked to traces.
- I want to **know what's happening in production** without reading every trace by hand.
- I want **datasets, experiments, and evaluations** wired up so every change ships with evidence.
- I want a **complete reference implementation** in TypeScript I can copy patterns from.

The workshop is small enough to finish in a sitting and every module is independent — if you only care about one chapter, jump straight there.

## How does it work?

This workshop lives in a GitHub repository. `main` contains the complete reference app and the current workshop docs. Use it to inspect the finished implementation or compare your work against the end state.

The exercises themselves start from checkpoint tags. Each learner chapter tells you which checkpoint to check out before making changes. The walkthrough is split into nine modules, each with a paired guide:

- **Learner path** (you, if you're doing the workshop) — [`docs/learner/`](./docs/learner/). Each chapter is the build/configure guide: what to check out, what to change, what to do in the Langfuse UI.
- **Instructor notes** (if you're running the workshop for others) — [`docs/instructor/`](./docs/instructor/). Same chapters with extra narration, demo suggestions, teaching points.

Every workshop step has a **git checkpoint** named for the lesson it kicks off. `checkpoint/00-setup` is the known-good setup/reference checkout for validating local credentials. The build checkpoints from `checkpoint/01-base-app` onward then put you in the right starting state for that chapter — i.e. the code you'd have at the end of the previous chapter. That means you can start any module from scratch without losing the complete reference on `main`.


## Modules

| Step | Branch (`git checkout …`) | What you'll learn |
| --- | --- | --- |
| [00 Setup](./docs/learner/00-setup.md) | `checkpoint/00-setup` *(setup/reference app)* | Keys, install, run the app. |
| [01 Base App](./docs/learner/01-base-app.md) | `checkpoint/01-base-app` | One-minute tour of the running app. Nothing to build. |
| [02 Tracing](./docs/learner/02-tracing.md) | `checkpoint/02-tracing` | Log every step the agent takes — generations, agent root, tool spans. |
| [03 Prompt Management](./docs/learner/03-prompt-management.md) | `checkpoint/03-prompt-management` | Move the system prompt into Langfuse so non-engineers can iterate. |
| [04 Monitoring](./docs/learner/04-monitoring.md) | `checkpoint/04-monitoring` | Catch interesting production events (out-of-scope, disagreement). |
| [05 Dataset](./docs/learner/05-dataset.md) | `checkpoint/05-dataset` | Turn product scope into a starter dataset. |
| [06 Experiments](./docs/learner/06-experiments.md) | `checkpoint/06-experiments` | Run the agent against the dataset, score every item. |
| [07 Evaluation](./docs/learner/07-evaluation.md) | `checkpoint/07-evaluation` | Change one thing, rerun the dataset, compare runs side by side. |
| [08 Wrap-up](./docs/learner/08-wrap-up.md) | `checkpoint/08-wrap-up` | What to take home, how to apply this to your own app. |

Each `checkpoint/0X-…` tag is the **starting state of that lesson**. `checkpoint/00-setup` is intentionally equivalent to the complete reference setup state at release time; build checkpoints then follow the cumulative lesson-by-lesson progression. See [`docs/checkpoints.md`](./docs/checkpoints.md) for the convention.

Instructor notes for the same modules live in [`docs/instructor/`](./docs/instructor/).

## Where to go next

- Walk the modules in order starting from [`docs/learner/00-setup.md`](./docs/learner/00-setup.md), **or**
- Jump to whichever chapter matches what you want to learn, **or**
- Install the [**Langfuse skill**](https://github.com/langfuse/skills) (`/langfuse`) to apply the patterns from this workshop to your own codebase.

For the bigger-picture material on each chapter, the [Langfuse Academy](https://langfuse.com/academy) has a dedicated lesson per module.
