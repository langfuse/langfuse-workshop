# Checkpoint strategy

The workshop wants two things at once:

1. A linear story that matches the Langfuse AI engineering loop.
2. The ability to jump ahead when a live workshop runs out of time.

The recommended strategy for this repo is:

- Use a single linear git history.
- Add milestone tags rather than long-lived branches.
- Keep later checkpoints self-sufficient through fallbacks.

## Proposed milestone tags

- `checkpoint/00-setup`
- `checkpoint/01-base-app`
- `checkpoint/02-tracing`
- `checkpoint/03-prompt-management`
- `checkpoint/04-monitoring`
- `checkpoint/05-dataset`
- `checkpoint/06-experiments`
- `checkpoint/07-prompt-iteration`
- `checkpoint/08-wrap-up`

## Why tags are a good fit

- They preserve the simple “step 1 becomes step 2” narrative.
- They are easy to demo live.
- They let participants jump straight to a known state.
- They avoid the maintenance cost of several branches drifting apart.

## What makes the checkpoints stitchable

- Prompt management has a local fallback prompt.
- Tracing is runtime-configurable, not a structural requirement.
- Dataset and experiment scripts call the same agent runner as the web app.
- Monitoring is based on stable observation inputs and outputs rather than UI-only conventions.

## Suggested workshop jumps

- Short workshop:
  Start at `checkpoint/01-base-app`, do `checkpoint/02-tracing`, explain `checkpoint/03-prompt-management`, finish at `checkpoint/04-monitoring`.

- Full workshop:
  Walk through all checkpoints in order.

- Catch-up jump:
  If the room gets stuck in tracing, jump straight to `checkpoint/04-monitoring` or `checkpoint/05-dataset` and continue from there.

