---
title: "Workshop: Run Langfuse Experiments"
description: "Run the support agent across the Langfuse dataset, score every item with callback evaluators inside runExperiment, and inspect scored experiment runs."
---

# 06 Experiments

## Why experiments

A trace tells you about *one* turn. An experiment tells you about behavior *across the dataset*. Every experiment run does the same three things:

1. **Pulls each item from the dataset.**
2. **Runs the item's input through the agent**: same `runSupportConversation(...)` the web app uses, so the trace shape is the same as production.
3. **Scores the actual output** with one or more evaluators, either against the expected output or on a reference-free quality criterion.

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
2. Every item gets a **`behavior_match`** score (decision model + deterministic match) and a **`correctness`** score (LLM-as-a-judge regression check), both from `runExperiment` callbacks.
3. Both scores plus the per-item traces are visible in Langfuse and ready to compare against future runs.

## Step 1: Choose the evaluators

In 05 you decided what the dataset should evaluate: correct answers, and the right behavior (reply, defer, or ask a follow-up). Each goal gets one evaluator, and each reads its own field from `expectedOutput`:

- **`behavior_match`** (decision model + deterministic match): *did Specs reply, defer, or ask a follow-up when we expected it to?* The OpenAI Decisions API picks one of three fixed labels, and the script compares that label with `expectedBehavior`.
- **`correctness`** (LLM-as-a-judge regression check): *is the answer still correct, or did a change make it worse?* A semantic-equivalence check against `idealAnswer`: paraphrases pass, missing required detail or a contradicted fact fails. A prompt fix that makes the agent refuse too much, or drop a step, shows up here.

Treat this set as a **starting point**, not the finished eval suite. It covers the two goals from 05, with the simplest check for each. Not every error-analysis category needs an offline evaluator: impersonation and lengthy replies don't get one here, and reading traces covers them for now. If one becomes worth tracking, add an evaluator for it, for example a plain word-count check for length, and check any judge against your own labels before you rely on it.

## Step 2: Understand the run script

Open `scripts/run-dataset.ts`. The file is annotated with numbered comments (`// --- 1. Boot the OpenTelemetry SDK ...`, `// --- 3. The behavior_match evaluator ...`, etc.) so you can read it section by section. At a high level:

- Loads the hosted dataset from Langfuse by `DATASET_NAME`.
- For each item, calls the same `runSupportConversation(...)` the web app uses.
- Uses `dataset.runExperiment(...)` to roll all per-item traces into a single run row.
- Attaches `behavior_match` and `correctness` as callback evaluators on that same call.

The traces produced are the same shape as production traces: same `dad-it-support-chat-turn` root, same OpenAI generation, same tool spans. No extra Langfuse UI setup is required for any of the scores.

Both scores are **callback evaluators** inside `runExperiment`. They run in your process right after each item finishes, so the console summary and the Langfuse run already include every score when the script exits. We intentionally avoid Langfuse Platform evaluators in this chapter: configuring one needs existing experiment data to preview and map variables, which creates a chicken-and-egg problem before your first run.

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
- **`evaluators`** is a list of callbacks. Each evaluator runs after `task` returns and attaches a score to the item trace. Here we use one behavior check and one LLM-as-a-judge regression check.
- **`runName`** groups every per-item trace into one row in the Langfuse Experiments view. Pick a name that changes per run (we include the timestamp) so two runs don't collide.

## Step 3: Review the `behavior_match` evaluator

`behavior_match` has two parts:

1. **A decision model.** `decideBehavior(...)` sends the conversation plus the agent's answer to the [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions) (`POST /v1/decisions`, model `gpt-6-luna`) as one `choice` question. The API can only answer with one of the supplied values, `reply`, `defer_question`, or `ask_follow_up`, and returns a confidence alongside it.
2. **A deterministic match.** The callback compares that label with the item's `expectedBehavior`: `1` on a match, `0` otherwise. The comment records both labels and the confidence, for example `Expected defer_question, got reply (confidence 0.85).`

Why split it this way?

- The model only does the part that needs judgement: labelling the answer. It never sees the expected label, so it can't be nudged towards it.
- The score itself is a plain equality check, so it is easy to read and to trust.
- Decisions returns a bounded answer fast and cheaply, so this second model call barely adds to the run time.

Low-confidence labels are worth reading by hand. They usually mean the answer mixes behaviors, for example declining an out-of-scope request and then walking Dad through it anyway.

## Step 4: Review the `correctness` regression check

The last callback in `evaluators` calls OpenAI with a **semantic-equivalence** judge prompt. It treats `idealAnswer` as the source of truth and asks whether the agent answer preserves every material meaning, fact, and constraint: paraphrases are fine; missing required detail or a contradicted fact is not. The callback maps the judge's true/false result to a `correctness` score of `0` or `1` plus a short reasoning comment.

A generic equivalence judge treats every detail as required. Its prompt therefore has a short section on what is material for this agent: the kind of reply, any stated limitation, and the steps needed to finish the task. Confirmations of what Dad will see, optional alternatives, and the wording of a decline don't count. Without that section, the judge failed good answers for leaving out "or your passcode". This is what checking a judge against your own labels looks like in practice.

Its job in this workshop is the **regression check**. `behavior_match` tells you whether a change fixed what it was meant to fix. `correctness` tells you whether the answers are still right after the fix. If a stricter prompt makes Specs refuse a question it should have helped with, or cut a step Dad needs, `correctness` drops on that item even when `behavior_match` goes up.

Why run the judge as a callback instead of a Langfuse Platform evaluator?

- You can score the **first** experiment run without waiting for preview data in the Evaluators UI.
- The judge prompt and model live next to the experiment runner in git.
- Every score appears in the script's printed summary as soon as the run finishes.

The judge and the behavior decision use the same model credential as the agent: `LANGFUSE_GATEWAY_KEY` when it is set, otherwise `OPENAI_API_KEY`. `correctness` uses `OPENAI_MODEL`. `behavior_match` uses `gpt-6-luna` on the Decisions API. You do **not** need the Langfuse-side default evaluator model from session 4 for this chapter.

## Step 5: Run the dataset

```bash
npm run dataset:run
```

The script finishes by printing a formatted run summary in the console. Item-level traces and both scores show up in Langfuse as the run executes. Because the evaluators are callbacks, you should already see `behavior_match` and `correctness` in that console summary, not as a later async fill-in.

This first run is your **baseline experiment**. It uses the production `dad-it-support-agent` prompt from monitoring, so expect misses on the out-of-scope and vague items, including out-of-scope questions that come up mid-conversation. In 07 you compare it against the prompt suggested at the end of error analysis.

## What to inspect in Langfuse

- The new **Run** under your dataset → one row per item with **two** scores: `behavior_match` and `correctness`, plus a trace link.
- **Item-level traces**: identical shape to production traces.
- The dataset's **chart view** → per-run averages for every score, ready for side-by-side comparison after future changes.

## How to verify you are done

- One run row appears under the dataset.
- Every item has a trace and both scores attached.
- The console summary printed both `behavior_match` and `correctness`.
- Trace shape matches a normal production trace.

## Wrap-up

The two scores match the two goals from 05: **behavior match** for "did Specs reply, defer, or ask a follow-up when it should?" and **correctness** for "is the answer still correct, or did the change make it worse?" Both run as callbacks on `runExperiment`, so the first workshop run is fully scored without platform evaluator setup.

They are a starting point. The suite grows with your error analysis: each new failure category you decide to track becomes a dataset item and, where needed, an evaluator.

The [**Langfuse skill**](https://github.com/langfuse/skills) (`/langfuse`) knows the recommended evaluator shapes and setup patterns: this walkthrough exists so you see what the skill is doing under the hood.

## End state

This is the starting point for `07-evaluation`.
