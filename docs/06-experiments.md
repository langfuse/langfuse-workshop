# 06 Experiments

## How to think about this step

Now we stop looking at single traces and start looking at *repeated* behavior on the same task set. This is where the AI engineering loop starts to feel systematic — same agent code, same dataset, run it again, compare.

The dataset we seeded in step 05 becomes the input. The same `runSupportConversation(...)` the web chat calls is what gets run. The output is one trace per item, scored by an evaluator, all rolled up into one run row.

## Goal

By the end of this step you can run the full dataset against the agent on demand, attach a simple `keyword_overlap` score to every item, and look at the run summary in Langfuse — including item-level traces.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/05-dataset
```

Your dataset is seeded in Langfuse. The script that actually runs the agent against it (`scripts/run-dataset.ts`) is already in the repo. You don't write it — you read it and run it.

## Step 1 — Understand the run script

Open `scripts/run-dataset.ts`. The structure:

1. Load the hosted dataset from Langfuse by `DATASET_NAME`.
2. For each item, call the same `runSupportConversation(...)` the web app calls — no separate "experiment app."
3. Use `dataset.runExperiment(...)` to roll all the per-item traces into one run row.
4. After each item, compute a simple `keyword_overlap` score from `expectedKeywords` and the model's answer, and attach it to the trace.

The crucial point: we are not running a *different* implementation. The traces produced here are the same shape as production traces — same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans. That's what makes monitoring + experiments cumulative rather than parallel.

## Step 2 — Run the dataset

```bash
npm run dataset:run
```

The script reports progress per item and finishes with a summary line. Each item produces one trace plus one score.

## What to inspect in Langfuse

- The new **Run** under your dataset — one row per item, including `keyword_overlap` and a link to the trace.
- Item-level traces — identical shape to the production traces from earlier steps.
- The dataset's chart view — per-run averages so you can compare future runs side by side.

## Teaching point

Experiments are not a separate app. They are the same application logic run repeatedly on a scoped dataset so behavior can be compared over time. The cost of running them is low precisely because no separate code path exists — every improvement you make to the live app shows up in the next experiment automatically.

A more straightforward way to design experiments and evaluators in line with Langfuse best practices is to use the **Langfuse skill** (`/langfuse`). It knows the recommended evaluator shapes (deterministic checks vs LLM-as-a-judge), how to wire them into `runExperiment`, and how to chart results. The walkthrough exists so you understand what the skill is doing under the hood.
