# Checkpoint strategy

The workshop wants two things at once:

1. A clean linear story that matches the Langfuse AI engineering loop.
2. The ability to jump ahead when a live workshop runs out of time.

The recommended repo strategy is:

- Keep `main` as the complete reference app plus current docs.
- Keep `checkpoint/00-setup` equivalent to `checkpoint/01-base-app` for environment validation.
- Create milestone checkouts or tags for each workshop step.
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

`checkpoint/00-setup` is a setup checkpoint, not the finished output of an earlier build module. It should be equivalent to `checkpoint/01-base-app`: the untraced base app before any Langfuse instrumentation. Learners validate credentials, dependencies, and local ports on `00-setup`, then use the same app state for the `01-base-app` orientation.

`checkpoint/02-tracing` also starts from that same base app because tracing is the first code-changing chapter. Later checkpoints represent the starting state for their lessons.

- `00-setup`
  Setup, keys, Langfuse Cloud EU, [Langfuse CLI](https://langfuse.com/docs/api-and-data-platform/features/cli), [Langfuse skill](https://github.com/langfuse/skills), and workshop framing on the same untraced app state as `01-base-app`.

- `01-base-app`
  A working Dad IT Support Agent on the official OpenAI SDK, with one fixed Dad context, two local tools, and no Langfuse tracing yet.

- `02-tracing`
  The learner manually adds Langfuse tracing on top of the base app using:
  - OpenTelemetry setup
  - `observeOpenAI(new OpenAI())`
  - `observe(...)` wrappers on the app and tool functions
  - optional `propagateAttributes(...)` for user/session metadata, included in later checkpoints

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
- Monitoring depends on stable message arrays on the agent/generation observations and the root `answer` field, not on provider-specific internals.
- Dataset and experiment scripts reuse the same app logic as the web UI.

## Recommended jump patterns

- Short workshop:
  Start at `checkpoint/01-base-app`, build tracing live, explain prompt management, and finish with monitoring.

- Full workshop:
  Walk through all checkpoints in order.

- Catch-up jump:
  If a group gets stuck in tracing, jump straight to `checkpoint/04-monitoring` or `checkpoint/05-dataset` and continue from there.
