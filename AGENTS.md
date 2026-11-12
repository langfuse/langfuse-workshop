# Agent notes for this repo

This file tells agents and maintainers how to change the Langfuse workshop repository safely.

## How to handle changes

### Rule 1: Propagate changes across checkpoints

`main` alone is not enough. Learners check out `checkpoint/*` tags during the workshop. If you change something those checkouts need, update every affected checkpoint tag before considering the work done.

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

What to propagate:

| Change type | Propagate to checkpoints? | How |
| --- | --- | --- |
| Shared tooling / config present on every milestone (`package.json` scripts, root tooling, env loading helpers used before a step diverges) | Yes — every tag that still has the old state | Checkout each tag, apply the same change, commit, force-move the tag, push |
| `docs/` or `README.md` | Yes — every tag | `./scripts/sync-checkpoint-docs.sh --push` after the change is on the source branch/`main` |
| `AGENTS.md` | Yes — every tag | Included in `./scripts/sync-checkpoint-docs.sh` |
| Milestone-only app code (for example tracing wrappers that only exist from `02-tracing` onward) | Only tags that already contain that code path | Patch those tags; do not invent the feature on earlier milestones |
| Docs-only clarification with no app impact | Yes — all tags via the docs sync script | Keep milestone app trees unchanged |

Do not stop at a PR to `main` when checkpoints still carry the old shared state. Document force-moved tag tips in the PR when you update them.

### Other change rules

- Keep `main` as the complete reference app plus current docs.
- Keep `checkpoint/00-setup` equivalent to `checkpoint/01-base-app` for environment validation.
- Keep one milestone tag for each workshop step.
- Make every later step runnable through explicit fallbacks (local prompt fallback, shared scripts, stable trace shape, and so on).
- Prefer small, workshop-safe diffs. Do not rebuild overview docs that learners do not need.

## Documentation scope

- Keep the root `README.md` focused on learners and instructors: workshop scope, entry points, module map, and minimal checkpoint usage.
- Do not recreate overview files such as `docs/README.md`, `docs/learner/README.md`, or `docs/checkpoints.md`. Put learner-facing overview content in the root README or the learner lessons; put facilitator content in instructor lessons; put maintainer-only checkpoint strategy here.

## Checkpoint strategy

The workshop needs two things at once:

1. A clean linear story that matches the Langfuse AI engineering loop.
2. The ability to jump ahead when a live workshop runs out of time.

Canonical progression:

- `00-setup`: setup, keys, Langfuse Cloud EU, Langfuse CLI, Langfuse skill, and workshop framing on the same untraced app state as `01-base-app`.
- `01-base-app`: working Dad IT Support Agent on the official OpenAI SDK, with one fixed Dad context, two local tools, and no Langfuse tracing yet.
- `02-tracing`: learners add Langfuse tracing on top of the base app with OpenTelemetry setup, `observeOpenAI(new OpenAI())`, `observe(...)` wrappers around app/tool functions, and optional `propagateAttributes(...)` for user/session metadata.
- `03-prompt-management`: learners replace the code-only prompt path with a Langfuse-managed prompt plus local fallback.
- `04-monitoring`: starts from the traced app and stable message-array trace shape; this step is mostly evaluator design, variable mapping, and Langfuse UI setup.
- `05-dataset`: adds a starter dataset that matches the app scope and uses message-array inputs plus expected outputs.
- `06-experiments`: runs the app against the Langfuse dataset with the SDK experiment runner and two `runExperiment` callback evaluators — deterministic `keyword_overlap` plus an in-script LLM-as-a-judge `correctness` score. Platform evaluators are optional bonus only (they need existing experiment data to configure).
- `07-evaluation`: changes the prompt, reruns the same dataset, and compares the same `keyword_overlap` + `correctness` callback scores side by side.
- `08-wrap-up`: recaps the mental model and points to next steps.

What makes the checkpoints stitchable:

- The OpenAI SDK is already in place before tracing starts, so step 2 is only about observability.
- Prompt management falls back to the local prompt if the Langfuse prompt is absent.
- Monitoring depends on stable message arrays on the agent/generation observations and the root `answer` field, not provider-specific internals.
- Dataset items carry both `idealAnswer` and `expectedKeywords`, which feed the step-06 `correctness` and `keyword_overlap` callback evaluators.
- Dataset and experiment scripts reuse the same app logic as the web UI; experiment scores are produced by `runExperiment` callbacks in the runner process.

Recommended jump patterns:

- Short workshop: start at `checkpoint/01-base-app`, build tracing live, explain prompt management, and finish with monitoring.
- Full workshop: walk through all checkpoints in order.
- Catch-up jump: if a group gets stuck in tracing, jump straight to `checkpoint/04-monitoring` or `checkpoint/05-dataset` and continue from there.

## Refreshing checkpoint docs and agent notes

Learner/instructor docs, `README.md`, and `AGENTS.md` live on `main` and are copied onto every `checkpoint/*` tag so a mid-workshop checkout still shows current instructions and maintainer rules. App code at each checkpoint stays on that milestone; only `docs/`, `README.md`, and `AGENTS.md` move forward with `main` through this script.

After those files land on `main` (or on the branch you want to sync from), refresh the tags:

```bash
./scripts/sync-checkpoint-docs.sh --push
```

Without `--push`, the script updates local tags only. The script requires a clean working tree and force-moves the canonical checkpoint tags.

For shared implementation changes that are not covered by that script (for example `package.json` scripts), update each affected checkpoint tag manually: checkout the tag, apply the same change, commit, force-move the tag, and push it. Then still run the docs sync if docs or `AGENTS.md` also changed.
