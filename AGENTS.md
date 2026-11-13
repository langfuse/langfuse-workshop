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
| Anything outside the milestone files (`docs/`, `README.md`, `AGENTS.md`, `package.json`, `scripts/`, `data/`, client code, shared server code) | Yes: every tag | Automatic: the `Sync checkpoint tags` action copies `main` onto every tag |
| Shared content inside a milestone file (for example the `SYSTEM_PROMPT`) | Yes: every tag | Keep it between `// checkpoint-sync:begin <name>` and `// checkpoint-sync:end <name>`; the sync copies that region |
| Milestone-only app code (for example tracing wrappers that only exist from `02-tracing` onward) | Only tags that already contain that code path | Lives in the milestone files, which the sync leaves alone; patch those tags by hand and do not invent the feature on earlier milestones |

Do not stop at a PR to `main` when checkpoints still carry the old shared state. After the merge, check that the action run succeeded. Document force-moved tag tips in the PR when you update tags by hand.

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
- `04-monitoring`: starts from the traced app and stable message-array trace shape. The overview introduces dashboards, error analysis, and production signals. Error analysis seeds 20 traces with `npm run langfuse:seed:error-analysis` (7 ordinary one-turn answers and 13 single-failure traces: out-of-scope replies, impersonation, and lengthy responses), then an annotation queue with open coding (Text) and pass/fail (Categorical), and Halo clusters the notes, creates the category scores, and builds the frequency dashboard. Capturing signals is the evaluator setup: learners add the OpenAI connection, then variable mapping and Langfuse UI, on those message-array observations.
- `05-dataset` ("Build eval datasets"): decides what to evaluate (correct answers and reply/defer/follow-up behavior), then seeds 25 items with message-array inputs plus expected outputs. 9 come from the `04-monitoring` error-analysis traces, including multi-turn ones (`metadata.source: "error-analysis"`); 16 are starter cases (`"starter"`).
- `06-experiments`: runs the app against the Langfuse dataset with the SDK experiment runner and two `runExperiment` callback evaluators, one per goal from `05-dataset`: `behavior_match` (OpenAI Decisions API label plus deterministic exact match against `expectedBehavior`) and an in-script LLM-as-a-judge `correctness` score used as the regression check. Platform evaluators are optional bonus only (they need existing experiment data to configure).
- `07-evaluation`: publishes the more specific prompt from the end of `04-monitoring` error analysis (`WORKSHOP_PROMPT_VARIANT=error-analysis`), reruns the same dataset, and compares the baseline run from `06-experiments` against it with the same `behavior_match` and `correctness` callback scores side by side.
- `08-wrap-up`: recaps the mental model and points to next steps.

What makes the checkpoints stitchable:

- The OpenAI SDK is already in place before tracing starts, so step 2 is only about observability.
- Prompt management falls back to the local prompt if the Langfuse prompt is absent.
- Monitoring depends on stable message arrays on the agent/generation observations and the root `answer` field, not provider-specific internals.
- Dataset items carry both `idealAnswer` and `expectedBehavior`, which feed the step-06 `correctness` and `behavior_match` callback evaluators.
- Dataset and experiment scripts reuse the same app logic as the web UI; experiment scores are produced by `runExperiment` callbacks in the runner process.

Recommended jump patterns:

- Short workshop: start at `checkpoint/01-base-app`, build tracing live, explain prompt management, and finish with monitoring.
- Full workshop: walk through all checkpoints in order.
- Catch-up jump: if a group gets stuck in tracing, jump straight to `checkpoint/04-monitoring` or `checkpoint/05-dataset` and continue from there.

## Syncing checkpoint tags

Every `checkpoint/*` tag is `main`'s tree except for its milestone files: the files whose code the next lesson changes. `scripts/sync-checkpoints.sh` sets this list in `milestone_files()`:

| Tags | Milestone files (kept from the tag) |
| --- | --- |
| `00-setup`, `01-base-app`, `02-tracing` | `src/server/index.ts`, `src/server/support-agent.ts`, `src/server/tools.ts` (untraced) |
| `03-prompt-management` | `src/server/support-agent.ts`, `src/server/tools.ts` (no Langfuse prompt fetch) |
| `04-monitoring` onward | none (equal to `main`) |

Inside a milestone file, regions marked `// checkpoint-sync:begin <name>` / `// checkpoint-sync:end <name>` still come from `main`. The sync fails if `main` has a region that a tag's milestone file lacks. When a new lesson starts editing a file, add it to `milestone_files()` for the earlier tags.

The `Sync checkpoint tags` GitHub Action (`.github/workflows/sync-checkpoints.yml`) runs on every push to `main` (and by hand). It runs `npm ci`, then `./scripts/sync-checkpoints.sh --verify --push`. Each changed tag gets one commit, must pass `npm run typecheck`, and is force-moved. All moved tags are pushed together, and only once every tag has passed. `.github/` stays on `main` only.

To run it locally (clean working tree required):

```bash
./scripts/sync-checkpoints.sh --verify          # update local tags only
./scripts/sync-checkpoints.sh --verify --push   # also force-push them
SOURCE_REF=my-branch ./scripts/sync-checkpoints.sh --verify
```
