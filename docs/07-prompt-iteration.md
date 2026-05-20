# 07 Prompt Iteration

## How to think about this step

This is where the loop closes. We found behavior in traces, defined scope with a dataset, ran an experiment, and now we change something on purpose to see whether it improves results. The point is not the absolute score — it's that *one change* can now be inspected, compared, and discussed systematically.

## Goal

Make one prompt change, rerun the same dataset, and compare the two runs side by side in Langfuse.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/06-experiments
```

You have an agent that is traced, attributed, monitored, and runs against a hosted dataset with a `keyword_overlap` evaluator. Now you change the prompt and run it again.

## Step 1 — Pick what to change

The repo ships two prompt variants in `src/server/local-prompt.ts`: `baseline` and `gentler`. The `gentler` variant adds a short reassuring opener if Dad sounds stressed. Either change the variant or edit the prompt body directly in Langfuse — both flows are real-world: code-side iteration during development, Langfuse-side iteration in production.

Two ways to swap:

**Option A — Switch variants by env (code-side):**

```bash
WORKSHOP_PROMPT_VARIANT=gentler npm run prompt:publish
```

This publishes the `gentler` variant under the same name and label, creating a new version in Langfuse.

**Option B — Edit in the Langfuse UI (production-side):**

Open Prompts → `dad-it-support-agent` → edit the body → save as a new version → promote the new version to the `production` label.

Either way you should end up with a new prompt version that the resolver will pick up on the next request, because the resolver fetches by label.

## Step 2 — Rerun the dataset

```bash
npm run dataset:run
```

Now there are two runs under the same dataset, each linked to a different prompt version.

## Step 3 — Compare

In Langfuse:

- Open the dataset → **Runs** tab → check both rows.
- `keyword_overlap` averages tell you the broad direction.
- Open the dataset's chart view to see per-run summaries side by side.
- Pick a handful of items and read both answers — qualitative diffs are where the real signal usually is.

Things to look for:

- which items improved (intentional)
- which items regressed (the part that makes evaluation feel useful)
- whether the change shifted scope (does the agent now refuse fewer out-of-scope requests? answer more confidently?)

## Teaching point

This step makes "evaluation" click for a lot of people. A single score in isolation doesn't tell you much, but the same score *paired with a prompt change* is suddenly informative. Once you've done this loop once — change → rerun → compare — every future change has a free baseline to measure against.

A more straightforward way to manage prompt versions and rerun experiments in line with Langfuse best practices is to use the **Langfuse skill** (`/langfuse`). It knows how to bump prompt versions, link runs to versions, and produce a comparison chart. The walkthrough exists so you understand what the skill is doing under the hood.
