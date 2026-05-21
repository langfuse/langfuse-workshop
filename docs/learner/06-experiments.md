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

- **Keyword match** (deterministic) — *did the answer cover the steps we expected?* Fast, cheap, no model call.
- **Correctness** (LLM-as-a-judge) — *is the answer actually correct?* More expressive, especially when the wording can vary but the underlying answer has to match the ideal.

In this chapter you'll run both. The keyword match is already wired into the script. Evaluations like the keyword match can be run outside of Langfuse and written back as scores via API. The LLM-as-a-judge correctness evaluator you set yourself in the Langfuse UI.

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

The traces produced are the same shape as production traces — same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans. We don't touch the script in this chapter.

### `dataset.runExperiment(...)` — the moving parts

The whole run is one call to `runExperiment`. The shape boils down to:

```ts
await dataset.runExperiment({
  // 1. Identity
  name: "Dad IT Support Agent experiment",
  runName,           // unique label for this run; shows up in the Runs tab
  description: "...",
  metadata: { model: env.openaiModel },
  maxConcurrency: 1, // run items one at a time

  // 2. task — runs the agent on one dataset item.
  //    Whatever you return becomes that item's `output` and is what the
  //    evaluators below score.
  task: async (item) => {
    const response = await runSupportConversation({ /* item.input */ });
    return response.answer;
  },

  // 3. evaluators — one entry per score. Each runs after task returns
  //    and gets { input, output, expectedOutput, metadata }. Return
  //    { name, value, comment } to attach the score to the item's trace.
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
- **`evaluators`** is a list. Add more entries to attach more scores. Each evaluator is independent and runs against the same output, so combining a deterministic check like `keyword_overlap` with an LLM-as-a-judge check like the Correctness evaluator we set up below is just two list entries.
- **`runName`** is what groups every per-item trace into one row in the Langfuse Runs view. Pick a name that changes per run (we include the timestamp) so two runs don't collide.

## Step 2 — Set up the correctness evaluator in Langfuse

Langfuse ships a **Correctness** LLM-as-a-judge template that compares an actual answer to an ideal answer and returns a score. We wire it up against the experiment runs so every item gets both a deterministic keyword score and a model-judged correctness score.

1. In Langfuse, open **Evaluators → New evaluator** and pick the **Correctness** template.
2. **Target** the runs from this dataset:
   - Scope: **Dataset runs**
   - Dataset: `dad-it-support-workshop`
3. **Map the template variables** to the trace's input/output and the dataset item's expected output:
   - `question` (the user's query) ← `$.input.messages[-1].content` *or* `$.input.messages` (the template can usually accept either)
   - `actual_output` (what the agent answered) ← `$.output` (the experiment run records the agent's answer here)
   - `expected_output` (the ideal answer) ← `$.expectedOutput.idealAnswer` from the dataset item
4. Pick the model you want the judge to use (e.g. `gpt-5.5-2026-04-23`) and save.
5. Enable the evaluator.

> If the template's exact variable names differ from `question` / `actual_output` / `expected_output`, only the names on the template side change — the JSONPaths above stay the same.

## Step 3 — Run the dataset

```bash
npm run dataset:run
```

Watch progress per item in the console; finishes with a summary line.

The script attaches `keyword_overlap` itself. The Correctness evaluator you set up in Step 2 runs asynchronously in Langfuse over the new run rows shortly after.

## What to inspect in Langfuse

- The new **Run** under your dataset → one row per item with **two** scores: `keyword_overlap` and `correctness`, plus a trace link.
- **Item-level traces** — identical shape to production traces.
- The dataset's **chart view** → per-run averages for both scores, ready for side-by-side comparison after future changes.

## How to verify you are done

- One run row appears under the dataset.
- Every item has a trace and both scores attached.
- Trace shape matches a normal production trace.

## Wrap-up

The two scoring approaches give you two angles on the same run: **keyword match** for "did we cover the right steps?" and **correctness** for "is the answer actually right?" Real evaluation programs typically combine deterministic and judge-based checks like this.

The [**Langfuse skill**](https://langfuse.com/docs) (`/langfuse`) knows the recommended evaluator shapes and how to wire them into `runExperiment` — this walkthrough exists so you see what the skill is doing under the hood. Learn more about experiments in the [Langfuse Academy lesson](https://langfuse.com/academy/experiments).

## End state

This is the starting point for `07-evaluation`.
