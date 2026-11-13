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
| Shared tooling / config present on every milestone (`package.json` scripts, root tooling, env loading helpers used before a step diverges) | Yes: every tag that still has the old state | Checkout each tag, apply the same change, commit, force-move the tag, push |
| `docs/` or `README.md` | Yes: every tag | `./scripts/sync-checkpoint-docs.sh --push` after the change is on the source branch/`main` |
| `AGENTS.md` | Yes: every tag | Included in `./scripts/sync-checkpoint-docs.sh` |
| Milestone-only app code (for example tracing wrappers that only exist from `02-tracing` onward) | Only tags that already contain that code path | Patch those tags; do not invent the feature on earlier milestones |
| Docs-only clarification with no app impact | Yes: all tags via the docs sync script | Keep milestone app trees unchanged |

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

- `00-setup`: setup, keys, Langfuse Cloud EU, organization AI Features and Halo (usually on for new orgs unless someone opted out), Langfuse CLI, Langfuse skill, and workshop framing on the same untraced app state as `01-base-app`.
- `01-base-app`: working Dad IT Support Agent on the official OpenAI SDK, with one fixed Dad context, two local tools, and no Langfuse tracing yet.
- `02-tracing`: learners add Langfuse tracing on top of the base app with OpenTelemetry setup, `observeOpenAI(new OpenAI())`, `observe(...)` wrappers around app/tool functions, and optional `propagateAttributes(...)` for user/session metadata.
- `03-prompt-management`: learners replace the code-only prompt path with a Langfuse-managed prompt plus local fallback.
- `04-monitoring`: starts from the traced app and stable message-array trace shape. The overview introduces dashboards, error analysis, and production signals. Error analysis seeds 20 traces with `npm run langfuse:seed:error-analysis` (7 ordinary one-turn answers and 13 single-failure traces: out-of-scope replies, impersonation, and lengthy responses), then an annotation queue with open coding (Text) and pass/fail (Categorical), and Halo clusters the notes, creates the category scores, and builds the frequency dashboard. Capturing signals is the evaluator setup: learners add the model connection (gateway key with the gateway base URL, or an OpenAI key with the base URL left blank), then variable mapping and Langfuse UI, on those message-array observations.
- `05-dataset` ("Build eval datasets"): decides what to evaluate (correct answers and reply/defer/follow-up behavior), then seeds 25 items with message-array inputs plus expected outputs. 9 come from the `04-monitoring` error-analysis traces, including multi-turn ones (`metadata.source: "error-analysis"`); 16 are starter cases (`"starter"`).
- `06-experiments`: runs the app against the Langfuse dataset with the SDK experiment runner and two `runExperiment` callback evaluators, one per goal from `05-dataset`: `behavior_match` (OpenAI Decisions API label plus deterministic exact match against `expectedBehavior`) and an in-script LLM-as-a-judge `correctness` score used as the regression check. Platform evaluators are optional bonus only (they need existing experiment data to configure).
- `07-evaluation`: publishes the more specific prompt from the end of `04-monitoring` error analysis (`WORKSHOP_PROMPT_VARIANT=error-analysis`), reruns the same dataset, and compares the baseline run from `06-experiments` against it with the same `behavior_match` and `correctness` callback scores side by side.
- `08-wrap-up`: recaps the mental model and points to next steps.

What makes the checkpoints stitchable:

- The OpenAI SDK is already in place before tracing starts, so step 2 is only about observability. `chatClientOptions()` uses `LANGFUSE_GATEWAY_KEY` when it is set, and `OPENAI_API_KEY` against `https://api.openai.com/v1` when only that key is set.
- Prompt management falls back to the local prompt if the Langfuse prompt is absent.
- Monitoring depends on stable message arrays on the agent/generation observations and the root `answer` field, not provider-specific internals.
- Dataset items carry both `idealAnswer` and `expectedBehavior`, which feed the step-06 `correctness` and `behavior_match` callback evaluators.
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

The `Sync checkpoint tags` GitHub Action (`.github/workflows/sync-checkpoints.yml`) runs this script with `--push` on every push to `main` that touches `docs/`, `README.md`, or `AGENTS.md`, and can also be started by hand. When a push changes other files, it only posts a warning listing them; those still need the manual tag patches below.

For shared implementation changes that are not covered by that script (for example `package.json` scripts), update each affected checkpoint tag manually: checkout the tag, apply the same change, commit, force-move the tag, and push it. Then still run the docs sync if docs or `AGENTS.md` also changed.
