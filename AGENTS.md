# Repository Notes

- Keep `main` and the `checkpoint/0X-*` tags consistent for implementation changes. When changing workshop code or docs, inspect and update any checkpoint tags that contain the same affected state before considering the task done.

## Documentation Scope

- Keep the root `README.md` focused on learners and instructors: workshop scope, entry points, module map, and minimal checkpoint usage.
- Do not recreate overview files such as `docs/README.md`, `docs/learner/README.md`, or `docs/checkpoints.md`. Put learner-facing overview content in the root README or the learner lessons; put facilitator content in instructor lessons; put maintainer-only checkpoint strategy here.

## Checkpoint Strategy

The workshop needs two things at once:

1. A clean linear story that matches the Langfuse AI engineering loop.
2. The ability to jump ahead when a live workshop runs out of time.

Maintain this repo strategy:

- Keep `main` as the complete reference app plus current docs.
- Keep `checkpoint/00-setup` equivalent to `checkpoint/01-base-app` for environment validation.
- Keep one milestone tag for each workshop step.
- Make every later step runnable through explicit fallbacks.

Canonical checkpoint tags:

- `checkpoint/00-setup`
- `checkpoint/01-base-app`
- `checkpoint/02-tracing`
- `checkpoint/03-prompt-management`
- `checkpoint/04-monitoring`
- `checkpoint/05-dataset`
- `checkpoint/06-experiments`
- `checkpoint/07-evaluation`
- `checkpoint/08-wrap-up`

Canonical progression:

- `00-setup`: setup, keys, Langfuse Cloud EU, Langfuse CLI, Langfuse skill, and workshop framing on the same untraced app state as `01-base-app`.
- `01-base-app`: working Dad IT Support Agent on the official OpenAI SDK, with one fixed Dad context, two local tools, and no Langfuse tracing yet.
- `02-tracing`: learners add Langfuse tracing on top of the base app with OpenTelemetry setup, `observeOpenAI(new OpenAI())`, `observe(...)` wrappers around app/tool functions, and optional `propagateAttributes(...)` for user/session metadata.
- `03-prompt-management`: learners replace the code-only prompt path with a Langfuse-managed prompt plus local fallback.
- `04-monitoring`: starts from the traced app and stable message-array trace shape; this step is mostly evaluator design, variable mapping, and Langfuse UI setup.
- `05-dataset`: adds a starter dataset that matches the app scope and uses message-array inputs plus expected outputs.
- `06-experiments`: runs the app against the Langfuse dataset with the SDK experiment runner and one simple evaluator.
- `07-evaluation`: changes the prompt, reruns the same dataset, and compares runs side by side.
- `08-wrap-up`: recaps the mental model and points to next steps.

What makes the checkpoints stitchable:

- The OpenAI SDK is already in place before tracing starts, so step 2 is only about observability.
- Prompt management falls back to the local prompt if the Langfuse prompt is absent.
- Monitoring depends on stable message arrays on the agent/generation observations and the root `answer` field, not provider-specific internals.
- Dataset and experiment scripts reuse the same app logic as the web UI.

Recommended jump patterns:

- Short workshop: start at `checkpoint/01-base-app`, build tracing live, explain prompt management, and finish with monitoring.
- Full workshop: walk through all checkpoints in order.
- Catch-up jump: if a group gets stuck in tracing, jump straight to `checkpoint/04-monitoring` or `checkpoint/05-dataset` and continue from there.
