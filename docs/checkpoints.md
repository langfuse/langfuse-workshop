# Checkpoint strategy

The workshop wants two things at once:

1. A clean linear story that matches the Langfuse AI engineering loop.
2. The ability to jump ahead when a live workshop runs out of time.

The recommended repo strategy is:

- Keep one linear git history.
- Create milestone checkouts or tags for each finished workshop step.
- Make every later step runnable through explicit fallbacks.

## Canonical milestone list

- `checkpoint/00-setup`
- `checkpoint/01-base-app`
- `checkpoint/02-tracing`
- `checkpoint/03-prompt-management`
- `checkpoint/04-monitoring`
- `checkpoint/05-dataset`
- `checkpoint/06-experiments`
- `checkpoint/07-evaluation`
- `checkpoint/08-wrap-up`

## Canonical progression

Each checkpoint is the finished output of the previous module and the starting point of the next one.

- `00-setup`
  Setup, keys, Langfuse Cloud EU, Langfuse CLI, Langfuse skill, and workshop framing.

- `01-base-app`
  A working Dad IT Support Agent on the official OpenAI SDK, with one fixed Dad context, two local tools, and no Langfuse tracing yet.

- `02-tracing`
  The learner manually adds Langfuse tracing on top of the base app using:
  - OpenTelemetry setup
  - `observeOpenAI(new OpenAI())`
  - `observe(...)` wrappers on the app and tool functions

  The finished tracing state is the starting point for prompt management and monitoring.

- `03-prompt-management`
  The learner replaces the code-only prompt path with a Langfuse-managed prompt plus local fallback.

- `04-monitoring`
  Starts from the traced app and stable message-array trace shape.
  This step is mostly about detection design, variable mapping, and UI setup in Langfuse.

- `05-dataset`
  Adds a starter dataset that matches the app scope and uses message-array inputs plus expected outputs.

- `06-experiments`
  Runs the app against the Langfuse dataset with the SDK experiment runner and one simple evaluator.

- `07-evaluation`
  Changes the prompt, reruns the same dataset, and compares runs side by side.

- `08-wrap-up`
  Recaps the mental model and points to next steps.

## What makes the checkpoints stitchable

- The OpenAI SDK is already in place before tracing starts, so step 2 is only about observability.
- Prompt management falls back to the local prompt if the Langfuse prompt is absent.
- Monitoring depends on a stable `messages` array and root `answer` field, not on provider-specific internals.
- Dataset and experiment scripts reuse the same app logic as the web UI.

## Recommended jump patterns

- Short workshop:
  Start at `checkpoint/01-base-app`, build tracing live, explain prompt management, and finish with monitoring.

- Full workshop:
  Walk through all checkpoints in order.

- Catch-up jump:
  If a group gets stuck in tracing, jump straight to `checkpoint/04-monitoring` or `checkpoint/05-dataset` and continue from there.
