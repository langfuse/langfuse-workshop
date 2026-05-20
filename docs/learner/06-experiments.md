# 06 Experiments

## Starting point

```bash
git checkout checkpoint/05-dataset
```

Your dataset is seeded in Langfuse. `scripts/run-dataset.ts` is already in the repo.

## Goal

Two passes:

1. **Understand the run script** — same `runSupportConversation(...)` the web app calls, but driven by dataset items.
2. **Run the dataset** and inspect the resulting run + scores in Langfuse.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Understand the run script

Open `scripts/run-dataset.ts`. Key points:

- Loads the hosted dataset from Langfuse by `DATASET_NAME`.
- For each item, calls the same `runSupportConversation(...)` the web app uses.
- Uses `dataset.runExperiment(...)` to roll all per-item traces into a single run row.
- Attaches a `keyword_overlap` score per item from `expectedKeywords` vs the answer.

The traces produced are the same shape as production traces — same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans.

## Step 2 — Run the dataset

```bash
npm run dataset:run
```

Watch progress per item in the console; finishes with a summary line.

## What to inspect in Langfuse

- The new **Run** under your dataset → one row per item with `keyword_overlap` and a trace link.
- Item-level traces — identical shape to production traces.
- The dataset's chart view → per-run averages for future side-by-side comparisons.

## How to verify you are done

- One run row appears under the dataset.
- Every item has a trace and a score.
- Trace shape matches a normal production trace.

## Wrap-up

The `/langfuse` Claude Code skill knows recommended evaluator shapes (deterministic vs LLM-as-a-judge) and how to wire them into `runExperiment` — the walkthrough exists so you see what the skill is doing under the hood.

## End state

This is the starting point for `07-prompt-iteration`.
