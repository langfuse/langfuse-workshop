# 07 Prompt Iteration

## Starting point

```bash
git checkout checkpoint/06-experiments
```

Your app is traced, attributed, monitored, has a hosted dataset, and at least one experiment run. Now you change the prompt and run it again.

## Goal

Three passes:

1. **Change one thing** — swap the prompt variant or edit in the Langfuse UI.
2. **Rerun the dataset** against the new prompt.
3. **Compare runs** side by side.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Change the prompt

Two options:

**Option A — Code-side (republish a different variant):**

```bash
WORKSHOP_PROMPT_VARIANT=gentler npm run prompt:publish
```

This publishes a new version of `dad-it-support-agent` under the same label. The resolver picks it up on the next request.

**Option B — Langfuse-side (edit in the UI):**

Prompts → `dad-it-support-agent` → edit body → save as new version → promote to `production` label.

## Step 2 — Rerun the dataset

```bash
npm run dataset:run
```

You now have two runs under the same dataset, each linked to a different prompt version.

## Step 3 — Compare

In Langfuse:

- Dataset → **Runs** tab → both rows visible.
- `keyword_overlap` averages give the broad direction.
- Dataset chart view → per-run averages side by side.
- Open a handful of items and read both answers — qualitative diffs are where the real signal usually is.

Things to look for:

- Which items improved (intentional).
- Which items regressed.
- Whether the prompt change shifted scope (more refusals? more confident answers?).

## How to verify you are done

- Two runs appear under the dataset, linked to different prompt versions.
- You can name one item that improved and one that didn't.
- You can articulate why a single score isn't enough — it's the comparison that matters.

## Wrap-up

The `/langfuse` Claude Code skill bumps prompt versions, links runs to versions, and produces a comparison chart automatically — the walkthrough exists so you see what the skill is doing under the hood.

## End state

This is the starting point for `08-wrap-up`.
