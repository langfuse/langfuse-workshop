# Learner path

This folder is the participant-facing build guide for the workshop.

Use it like this:

1. Start from the checkpoint named at the top of the module.
2. Make the missing changes yourself.
3. Verify that your code behaves like the end state described in the module.
4. Use that finished state as the input to the next module.

The important mental model for this repo is:

- `00-setup` uses `checkpoint/00-setup` for keys, install, and a known-good local run.
- `01-base-app` is read-only orientation. The base app is already in the repo; this chapter just tells you what's on screen.
- `02-tracing` starts from that untraced app and adds Langfuse instrumentation.
- `03-prompt-management` starts from the traced app and adds Langfuse-managed prompts.
- `04-monitoring` uses the trace shape you created in tracing.
- `05-dataset` turns the app scope into reusable examples.
- `06-experiments` runs the same app logic on the dataset.
- `07-evaluation` changes the prompt and compares runs.

When you read a module, pay special attention to:

- `Exact changes by file`
- `What the finished file should contain`
- `How to verify you are done`

Modules:

- [00 Setup](./00-setup.md)
- [01 Base App](./01-base-app.md)
- [02 Tracing](./02-tracing.md)
- [03 Prompt Management](./03-prompt-management.md)
- [04 Monitoring](./04-monitoring.md)
- [05 Dataset](./05-dataset.md)
- [06 Experiments](./06-experiments.md)
- [07 Evaluation](./07-evaluation.md)
- [08 Wrap-up](./08-wrap-up.md)
