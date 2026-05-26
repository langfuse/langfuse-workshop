# Workshop docs

The workshop has **two parallel paths** through the same nine modules. Pick the one that matches what you're doing.

## 🧑‍💻 Learner path — start here

If you're a workshop participant doing the modules, follow [`docs/learner/`](./learner/). Each file is the step-by-step build/configure guide for that module: what to check out, what to change in code, what to do in the Langfuse UI, and how to verify you're done.

`main` contains the complete reference app. Run setup from `main` to confirm your environment, then check out the checkpoint named at the top of the chapter you want to work through.

| Step | Branch (`git checkout …`) |
| --- | --- |
| [00 Setup](./learner/00-setup.md) | `main` *(complete reference app)* |
| [01 Base App](./learner/01-base-app.md) | `checkpoint/01-base-app` |
| [02 Tracing](./learner/02-tracing.md) | `checkpoint/02-tracing` |
| [03 Prompt Management](./learner/03-prompt-management.md) | `checkpoint/03-prompt-management` |
| [04 Monitoring](./learner/04-monitoring.md) | `checkpoint/04-monitoring` |
| [05 Dataset](./learner/05-dataset.md) | `checkpoint/05-dataset` |
| [06 Experiments](./learner/06-experiments.md) | `checkpoint/06-experiments` |
| [07 Evaluation](./learner/07-evaluation.md) | `checkpoint/07-evaluation` |
| [08 Wrap-up](./learner/08-wrap-up.md) | `checkpoint/08-wrap-up` |

Each build checkpoint from `checkpoint/01-base-app` onward represents the **starting state of that lesson** — i.e. the code you'd have if you'd finished every previous module. See [`./checkpoints.md`](./checkpoints.md) for the full convention.

## 🎤 Instructor notes

If you're running the workshop, [`docs/instructor/`](./instructor/) has the same nine modules with extra narration: how to think about each step, the teaching point, demo suggestions. Use them as facilitator notes alongside the learner path.

## Image assets

All screenshots and diagrams live under [`docs/images/`](./images/), grouped by lesson (`tracing/`, `prompt-management/`, `monitoring/`, `datasets/`, `evaluate-a-change/`).
