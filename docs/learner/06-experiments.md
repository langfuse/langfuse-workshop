---
title: "Workshop: Run Langfuse Experiments"
description: "Run the support agent across the Langfuse dataset, attach a deterministic score in the experiment script, and inspect scored experiment runs."
---

# 06 Experiments

## Starting point

```bash
git checkout checkpoint/06-experiments
```

Your dataset is seeded in Langfuse. `scripts/run-dataset.ts` is already in the repo.

## Why experiments

A trace tells you about *one* turn. An experiment tells you about behavior *across the dataset*. Every experiment run does the same three things:

1. **Pulls each item from the dataset.**
2. **Runs the item's input through the agent** — same `runSupportConversation(...)` the web app uses, so the trace shape is the same as production.
3. **Scores the actual output against the expected output** with one or more evaluators.

Different evaluators answer different questions. For a broader tour of evaluator types and when to pick which, see the [Langfuse Academy lesson on evaluate](https://langfuse.com/academy/evaluate). For this workshop we use two that give a quick first read on answer quality:

- **`keyword_overlap`** (deterministic) — *did the answer cover the steps we expected?* Fast, cheap, and computed directly in the experiment script.
- **`correctness`** (LLM-as-a-judge) — *is the answer actually correct?* More expressive, especially when the wording can vary but the underlying answer has to match the ideal.

This chapter uses a mixed setup on purpose: the cheap deterministic check lives in code right next to the experiment runner, while the semantic judge lives in Langfuse.

## Goal

By the end of this chapter:

1. You can run the full dataset against the agent on demand.
2. Every item gets a **`keyword_overlap`** score (deterministic) and a **`correctness`** score (LLM-as-a-judge).
3. The two scores plus the per-item traces are visible in Langfuse and ready to compare against future runs.

## Step 1 — Understand the run script

Open `scripts/run-dataset.ts`. The file is annotated with numbered comments (`// --- 1. Boot the OpenTelemetry SDK ...`, `// --- 3. The deterministic evaluator ...`, etc.) so you can read it section by section. At a high level:

- Loads the hosted dataset from Langfuse by `DATASET_NAME`.
- For each item, calls the same `runSupportConversation(...)` the web app uses.
- Uses `dataset.runExperiment(...)` to roll all per-item traces into a single run row.
- Attaches a `keyword_overlap` score per item by comparing `expectedKeywords` against the agent's answer.

The traces produced are the same shape as production traces — same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans. We do not need extra UI setup for the deterministic score because it already lives in the script.

### `dataset.runExperiment(...)` — the moving parts

The whole run is one call to `runExperiment`. The shape boils down to:

```ts
await dataset.runExperiment({
  name: "Dad IT Support Agent experiment",
  runName,           // unique label for this run; shows up in the Runs tab
  description: "...",
  metadata: { model: env.openaiModel },
  maxConcurrency: 1, // run items one at a time

  task: async (item) => {
    const response = await runSupportConversation({ /* item.input */ });
    return response.answer;
  },

  evaluators: [
    async ({ output, expectedOutput }) => ({
      name: "keyword_overlap",
      value: keywordOverlap(output as string, (expectedOutput as any).expectedKeywords),
      comment: "..."
    })
  ]
});
```

Three things to understand:

- **`task`** is *your application logic* — we call straight into `runSupportConversation(...)`, which means every trace this script produces looks identical to a production trace.
- **`evaluators`** is a list. Each evaluator runs after `task` returns and attaches a score to the item trace. Here we use one deterministic evaluator, but you can add more over time.
- **`runName`** groups every per-item trace into one row in the Langfuse Runs view. Pick a name that changes per run (we include the timestamp) so two runs don't collide.

## Step 2 — Review the deterministic `keyword_overlap` evaluator

Inside `scripts/run-dataset.ts`, the helper function looks for the dataset item's `expectedKeywords` inside the model answer and returns the fraction that matched.

Why keep it in the script?

- It is easy to read alongside the rest of the experiment code.
- It uses the same version control and review flow as the app.
- It is deterministic, so there is no reason to spend an LLM call on it.

This is also a good default pattern for teams that want experiment logic to stay in the repo.

> Alternative: this same deterministic check could also be moved into a Langfuse code evaluator if you want to manage it in the platform instead of in the script. See the [Code evaluators docs](https://langfuse.com/docs/evaluation/evaluation-methods/code-evaluators) and the [Experiments via SDK docs](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk).

## Step 3 — Set up the `correctness` evaluator in Langfuse

Langfuse ships a **Correctness** LLM-as-a-judge template that compares an actual answer to an ideal answer and returns a score. We wire it up against the dataset runs so every item gets both the local deterministic score and a model-judged correctness score that shows up in the run comparison view.

> Fresh project check: Correctness is an LLM-as-a-judge evaluator. If you did not configure the default evaluator model in session 4, do it now: open **Project Settings → LLM Connections**, add your OpenAI key, then return to **Evaluators → Set up evaluator** and save a default evaluator model such as `openai / gpt-4.1`. Keep the API key in the Langfuse secret field only; do not paste it into workshop transcripts or shared notes.

1. In Langfuse, open **Evaluators → New evaluator** and pick the **Correctness** template.
2. Target the runs from this dataset:
   - Run on: **Experiments** (Default is observation, make sure to select the right 'Run on')
   - Filter where: Dataset is 'dad-it-support-workshop'
3. Map the template variables. In the UI, set the **Source** dropdown first, then add JsonPath only where needed:

   | Variable | Object Field | JsonPath |
   | --- | --- | --- |
   | `query` | **Input** | `$.messages[-1].content` |
   | `generation` | **Output** | Leave blank |
   | `ground_truth` | **Expected Output** | `$.idealAnswer` |

   A common broken setup is leaving all three variables on **Input** because that dropdown shows up first. If `generation` or `ground_truth` point to **Input**, the evaluator reads the wrong data for every run.
4. Use the default judge model you configured in session 4 or in the fresh project check above, or pick another structured-output-capable judge model, and save.
5. Enable the evaluator.

Why target **Dataset runs** here? Because for this workshop we want `correctness` to appear on the dataset run items and in the run comparison view.

![Correctness Variable Mapping](../images/experiments/correctness-variable-mapping.png)

## Step 4 — Run the dataset

```bash
npm run dataset:run
```

The script finishes by printing a formatted run summary in the console. Item-level traces and scores show up in Langfuse as the run executes, and the Correctness evaluator may continue filling in scores for a short time afterward because it runs asynchronously.

The script attaches `keyword_overlap` itself. The Correctness evaluator you set up in Step 3 runs asynchronously in Langfuse over the new run rows shortly after.

## What to inspect in Langfuse

- The new **Run** under your dataset → one row per item with **two** scores: `keyword_overlap` and `correctness`, plus a trace link.
- **Item-level traces** — identical shape to production traces.
- The dataset's **chart view** → per-run averages for both scores, ready for side-by-side comparison after future changes.

![Experiment Results](../images/experiments/experiment-results.png)

## How to verify you are done

- One run row appears under the dataset.
- Every item has a trace and both scores attached.
- Trace shape matches a normal production trace.

## Wrap-up

The two scoring approaches give you two angles on the same run: **keyword match** for "did we cover the right steps?" and **correctness** for "is the answer actually right?" Real evaluation programs often combine deterministic and judge-based checks like this.

If your team prefers more evaluator logic in the Langfuse UI, the deterministic check could also be migrated into a code evaluator later. The [Code evaluators docs](https://langfuse.com/docs/evaluation/evaluation-methods/code-evaluators) cover that path, and the [Experiments via SDK docs](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk) show how the code-side setup fits together.

The [**Langfuse skill**](https://github.com/langfuse/skills) (`/langfuse`) knows the recommended evaluator shapes and setup patterns — this walkthrough exists so you see what the skill is doing under the hood. Learn more about experiments in the [Langfuse Academy lesson](https://langfuse.com/academy/experiments).

## End state

This is the starting point for `07-evaluation`.
