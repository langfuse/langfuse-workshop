# 06 Experiments

## Why experiments

A trace tells you about *one* turn. An experiment tells you about behavior *across the dataset*. Every experiment run does the same three things:

1. **Pulls each item from the dataset.**
2. **Runs the item's input through the agent** — same `runSupportConversation(...)` the web app uses, so the trace shape is the same as production.
3. **Scores the actual output against the expected output** with one or more evaluators.

Different evaluators answer different questions. For a broader tour of evaluator types and when to pick which, see the [Langfuse Academy lesson on evaluate](https://langfuse.com/academy/evaluate). For this workshop we use two that give a quick first read on answer quality:

- **Keyword match** (deterministic) — *did the answer cover the steps we expected?* Fast, cheap, no model call.
- **Correctness** (LLM-as-a-judge) — *is the answer actually correct?* More expressive, especially when wording can vary but the underlying answer has to match the ideal.

In this chapter we run both. Keyword match is already wired into the script; the LLM-as-a-judge correctness evaluator is set up in the Langfuse UI.

## Goal

By the end of this step you can run the full dataset against the agent on demand. Every item gets both a **`keyword_overlap`** score (deterministic, attached by the script) and a **`correctness`** score (LLM-as-a-judge, attached by Langfuse). The two scores plus the per-item traces are visible in Langfuse and ready to compare against future runs.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/06-experiments
```

Your dataset is seeded in Langfuse. `scripts/run-dataset.ts` is already in the repo — we don't touch the script in this chapter.

## Step 1 — Understand the run script

Open `scripts/run-dataset.ts`. The file is annotated with numbered comments (`// --- 1. Boot the OpenTelemetry SDK ...`, etc.) so you can read it section by section. The structure:

1. Load the hosted dataset from Langfuse by `DATASET_NAME`.
2. For each item, call the same `runSupportConversation(...)` the web app calls — no separate "experiment app."
3. Use `dataset.runExperiment(...)` to roll all the per-item traces into one run row.
4. Compute a simple `keyword_overlap` score from `expectedKeywords` and the model's answer, and attach it to the trace.

The crucial point: we are not running a *different* implementation. The traces produced here are the same shape as production traces — same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans. That's what makes monitoring + experiments cumulative rather than parallel.

## Step 2 — Set up the correctness evaluator in Langfuse

Langfuse ships a **Correctness** LLM-as-a-judge template that compares an actual answer to an ideal answer and returns a score. We wire it up against the experiment runs so every item gets both a deterministic keyword score and a model-judged correctness score.

1. In Langfuse, open **Evaluators → New evaluator** and pick the **Correctness** template.
2. Target the dataset's runs:
   - Scope: **Dataset runs**
   - Dataset: `dad-it-support-workshop`
3. Map the template's variables to the trace input/output and the dataset item's expected output:
   - `question` (the user's query) ← `$.input.messages[-1].content` *or* `$.input.messages`
   - `actual_output` (what the agent answered) ← `$.output`
   - `expected_output` (the ideal answer) ← `$.expectedOutput.idealAnswer`
4. Pick the judge model (e.g. `gpt-5.5-2026-04-23`) and save.
5. Enable the evaluator.

If the template's exact variable names differ from `question` / `actual_output` / `expected_output`, only the names on the template side change — the JSONPaths above stay the same.

## Step 3 — Run the dataset

```bash
npm run dataset:run
```

The script reports progress per item and finishes with a summary line. Each item produces one trace plus the `keyword_overlap` score. The Correctness evaluator you set up in Step 2 then runs asynchronously over the new run rows shortly after.

## What to inspect in Langfuse

- The new **Run** under your dataset — one row per item with **two** scores (`keyword_overlap` and `correctness`) and a trace link.
- Item-level traces — identical shape to the production traces from earlier steps.
- The dataset's chart view — per-run averages for both scores, ready for side-by-side comparison after future changes.

## Teaching point

Experiments are not a separate app. They are the same application logic run repeatedly on a scoped dataset so behavior can be compared over time. The two scoring approaches give two angles on the same run: **keyword match** for "did we cover the right steps?" and **correctness** for "is the answer actually right?" Real evaluation programs typically combine deterministic and judge-based checks like this.

The [**Langfuse Claude Code skill**](https://langfuse.com/docs) (`/langfuse`) knows the recommended evaluator shapes and how to wire them into `runExperiment` — this walkthrough exists so you understand what the skill is doing under the hood. Learn more in the [Langfuse Academy lesson on experiments](https://langfuse.com/academy/experiments).
