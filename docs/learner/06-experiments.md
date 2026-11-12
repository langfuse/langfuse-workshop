---
title: "Workshop: Run Langfuse Experiments"
description: "Run the support agent across the Langfuse dataset, score every item with callback evaluators inside runExperiment, and inspect scored experiment runs."
---

# 06 Experiments

## Why experiments

A trace tells you about *one* turn. An experiment tells you about behavior *across the dataset*. Every experiment run does the same three things:

1. **Pulls each item from the dataset.**
2. **Runs the item's input through the agent**: same `runSupportConversation(...)` the web app uses, so the trace shape is the same as production.
3. **Scores the actual output against the expected output** with one or more evaluators.

Different evaluators answer different questions. For this workshop we use two that give a quick first read on answer quality:

- **`behavior_match`** (decision model + deterministic match): *did Specs reply, defer, or ask a follow-up when we expected it to?* The OpenAI Decisions API picks one of three fixed labels, and the script compares that label with `expectedBehavior`.
- **`correctness`** (LLM-as-a-judge): *does the answer preserve the material meaning of the ideal answer?* A semantic-equivalence check: paraphrases pass, missing required detail or a contradicted fact fails.

Both scores are **callback evaluators** inside `runExperiment`. They run in your process right after each item finishes, so the console summary and the Langfuse run already include both scores when the script exits. We intentionally avoid Langfuse Platform evaluators in this chapter: configuring one needs existing experiment data to preview and map variables, which creates a chicken-and-egg problem before your first run.

Complementary materials:

- Docs: [Experiments via SDK](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)
- Academy: [Experiments](https://langfuse.com/academy/experiments) and [Evaluate](https://langfuse.com/academy/evaluate)

## Starting point

```bash
git checkout checkpoint/06-experiments
```

Your dataset is seeded in Langfuse. `scripts/run-dataset.ts` is already in the repo.

## Goal

By the end of this chapter:

1. You can run the full dataset against the agent on demand.
2. Every item gets a **`behavior_match`** score (decision model + deterministic match) and a **`correctness`** score (LLM-as-a-judge), both from `runExperiment` callbacks.
3. The two scores plus the per-item traces are visible in Langfuse and ready to compare against future runs.

## Step 1: Understand the run script

Open `scripts/run-dataset.ts`. The file is annotated with numbered comments (`// --- 1. Boot the OpenTelemetry SDK ...`, `// --- 3. The behavior_match evaluator ...`, etc.) so you can read it section by section. At a high level:

- Loads the hosted dataset from Langfuse by `DATASET_NAME`.
- For each item, calls the same `runSupportConversation(...)` the web app uses.
- Uses `dataset.runExperiment(...)` to roll all per-item traces into a single run row.
- Attaches `behavior_match` and `correctness` as callback evaluators on that same call.

The traces produced are the same shape as production traces: same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans. No extra Langfuse UI setup is required for either score.

### `dataset.runExperiment(...)`: the moving parts

The whole run is one call to `runExperiment`. The shape boils down to:

```ts
await dataset.runExperiment({
  name: "Dad IT Support Agent experiment",
  runName,           // unique label for this run; shows up in the Experiments tab
  description: "...",
  metadata: { model: env.openaiModel },
  maxConcurrency: 1, // run items one at a time

  task: async (item) => {
    const response = await runSupportConversation({ /* item.input */ });
    return response.answer;
  },

  evaluators: [
    async ({ input, output, expectedOutput }) => ({
      name: "behavior_match",
      value: /* 1 if decideBehavior(...) === expectedOutput.expectedBehavior, else 0 */,
      comment: "..."
    }),
    async ({ output, expectedOutput }) => ({
      name: "correctness",
      value: /* 0 or 1 from the LLM judge */,
      comment: "..."
    })
  ]
});
```

Three things to understand:

- **`task`** is *your application logic*: we call straight into `runSupportConversation(...)`, which means every trace this script produces looks identical to a production trace.
- **`evaluators`** is a list of callbacks. Each evaluator runs after `task` returns and attaches a score to the item trace. Here we use one behavior check and one LLM-as-a-judge check.
- **`runName`** groups every per-item trace into one row in the Langfuse Experiments view. Pick a name that changes per run (we include the timestamp) so two runs don't collide.

## Step 2: Review the `behavior_match` evaluator

`behavior_match` has two parts:

1. **A decision model.** `decideBehavior(...)` sends the conversation plus the agent's answer to the [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions) (`POST /v1/decisions`, model `gpt-6-luna`) as one `choice` question. The API can only answer with one of the supplied values, `reply`, `defer_question`, or `ask_follow_up`, and returns a confidence alongside it.
2. **A deterministic match.** The callback compares that label with the item's `expectedBehavior`: `1` on a match, `0` otherwise. The comment records both labels and the confidence, for example `Expected defer_question, got reply (confidence 0.85).`

Why split it this way?

- The model only does the part that needs judgement: labelling the answer. It never sees the expected label, so it can't be nudged towards it.
- The score itself is a plain equality check, so it is easy to read and to trust.
- Decisions returns a bounded answer fast and cheaply, so this second model call barely adds to the run time.

Low-confidence labels are worth reading by hand. They usually mean the answer mixes behaviors, for example declining an out-of-scope request and then walking Dad through it anyway.

## Step 3: Review the `correctness` LLM-as-a-judge callback

The second callback in `evaluators` calls OpenAI with a **semantic-equivalence** judge prompt. It treats `idealAnswer` as the source of truth and asks whether the agent answer preserves every material meaning, fact, and constraint: paraphrases are fine; missing required detail or a contradicted fact is not. The callback maps the judge's true/false result to a `correctness` score of `0` or `1` plus a short reasoning comment.

Why run the judge as a callback instead of a Langfuse Platform evaluator?

- You can score the **first** experiment run without waiting for preview data in the Evaluators UI.
- The judge prompt and model live next to the experiment runner in git.
- Both scores appear in the script's printed summary as soon as the run finishes.

The judge uses your existing `OPENAI_API_KEY` / `OPENAI_MODEL` from `.env`: the same credentials the agent already uses. `behavior_match` uses the same `OPENAI_API_KEY`, with `gpt-6-luna` fixed in the script. You do **not** need the Langfuse-side default evaluator model from session 4 for this chapter.

## Step 4: Run the dataset

```bash
npm run dataset:run
```

The script finishes by printing a formatted run summary in the console. Item-level traces and both scores show up in Langfuse as the run executes. Because the evaluators are callbacks, you should already see `behavior_match` and `correctness` in that console summary, not as a later async fill-in.

This first run is your **baseline experiment**. It uses the production `dad-it-support-agent` prompt from monitoring, so expect misses on the out-of-scope and vague items. In 07 you compare it against the prompt suggested at the end of error analysis.

## What to inspect in Langfuse

- The new **Run** under your dataset → one row per item with **two** scores: `behavior_match` and `correctness`, plus a trace link.
- **Item-level traces**: identical shape to production traces.
- The dataset's **chart view** → per-run averages for both scores, ready for side-by-side comparison after future changes.

## How to verify you are done

- One run row appears under the dataset.
- Every item has a trace and both scores attached.
- The console summary printed both `behavior_match` and `correctness`.
- Trace shape matches a normal production trace.

## Optional bonus: Langfuse Platform evaluators on experiment runs

Once you have at least one experiment run, you can also attach Langfuse Platform evaluators (for example **Check Correctness** from the Template Gallery) so Langfuse scores future runs asynchronously in the UI. That path is useful when you want managed judges shared across the team, but it needs existing experiment observations to preview variable mapping, which is why this workshop starts with callbacks.

If you try the bonus later:

1. Open **Evaluators → New Evaluator** and pick **Check Correctness**.
2. Filter for observations created by experiments.
3. Map `output` → **Output**, and `expected_output` → **Expected Output → idealAnswer**.
4. Save and execute the evaluator, then rerun `npm run dataset:run`.

![Filter for observations created by experiments in the evaluator setup panel.](../images/experiments/correctness-experiment-observation-filter.png)

![Map the Correctness evaluator variables to the experiment output and expected ideal answer.](../images/experiments/correctness-variable-mapping.png)

See the [LLM-as-a-Judge docs](https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge) and the [Experiments via SDK docs](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk) for the full platform vs SDK picture.

## Wrap-up

The two scoring approaches give you two angles on the same run: **behavior match** for "did Specs reply, defer, or ask a follow-up when it should?" and **correctness** for "is the answer actually right?" Both run as callbacks on `runExperiment`, so the first workshop run is fully scored without platform evaluator setup.

The [**Langfuse skill**](https://github.com/langfuse/skills) (`/langfuse`) knows the recommended evaluator shapes and setup patterns: this walkthrough exists so you see what the skill is doing under the hood.

## End state

This is the starting point for `07-evaluation`.
