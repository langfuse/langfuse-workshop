---
title: "Workshop: Instructor Notes for Experiments"
description: "Facilitator notes for running Langfuse experiments with callback evaluators inside runExperiment, and optionally mentioning platform evaluators as a bonus."
---

# 06 Experiments

Learner guide: [06 Experiments](../learner/06-experiments.md)

## Instructor notes

- The key idea is reuse: the experiment runner calls the same `runSupportConversation(...)` as the web app.
- Contrast deterministic scoring (`keyword_overlap`) with LLM-as-a-judge scoring (`correctness`) — both as **callbacks** on `runExperiment`.
- Point at the semantic-equivalence judge prompt in `scripts/run-dataset.ts`: expected output is the source of truth; paraphrases pass; missing material meaning fails.
- Call out why this chapter avoids Langfuse Platform evaluators as the primary path: configuring one needs existing experiment data to preview mappings, which blocks a clean first run.
- The correctness judge uses the learner's `OPENAI_API_KEY` / `OPENAI_MODEL`. Session 4's Langfuse default evaluator model is **not** required here.
- Emphasize that both scores should appear in the console summary when `npm run dataset:run` finishes.
- Keep concurrency at one for workshops so traces and the final run summary are easy to follow.
- Before running the dataset, confirm both the OpenAI and Langfuse credentials point to active projects. The runner can finish with exit code 0 after skipping every item, so always check that the console prints experiment results rather than only SDK errors.
- Optional bonus only if you have time: show that Platform evaluators can still target experiment observations after the first run exists.

## Demo rhythm

1. Skim the numbered sections in `scripts/run-dataset.ts`.
2. Point out both callback evaluators in the `evaluators` array.
3. Run `npm run dataset:run`.
4. Open the run table, per-item traces, and chart view — both scores should already be present.
5. (Optional) Mention Platform evaluators / **Check Correctness** as a later add-on once experiment data exists.

## Watch for

- Learners trying to set up **Check Correctness** in the UI before the first run. Redirect them to the script callbacks; platform setup is bonus-only.
- Do not use `expectedKeywords` as the correctness reference. That field belongs to `keyword_overlap`; correctness uses `idealAnswer`.
- `401 The project you are requesting has been archived` followed by `No experiment results to display` means the OpenAI key belongs to an archived project. Replace `OPENAI_API_KEY` locally with a key from an active project, then rerun.
- Missing `correctness` in the console usually means the judge call failed (bad key, model, or JSON parse). Check the terminal error rather than refreshing Langfuse for a pending platform score.
