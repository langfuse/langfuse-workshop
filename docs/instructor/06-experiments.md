---
title: "Workshop: Instructor Notes for Experiments"
description: "Facilitator notes for running Langfuse experiments with callback evaluators inside runExperiment, and optionally mentioning platform evaluators as a bonus."
---

# 06 Experiments

Learner guide: [06 Experiments](../learner/06-experiments.md)

## Instructor notes

- The key idea is reuse: the experiment runner calls the same `runSupportConversation(...)` as the web app.
- Explain why these evaluators differ from the monitoring ones: production traffic has no reference answer, so 4.2 uses judges that read only the conversation (user disagreement, all caps). A dataset has expected outputs, so `behavior_match` and `correctness` each compare against a field in `expectedOutput`.
- Tie the two evaluators to the two goals from 05: `behavior_match` (Decisions API label plus exact match) checks the right behavior and shows whether a change fixed what it targeted; `correctness` (LLM-as-a-judge) checks the answer is correct and is the regression check that catches a fix making answers worse. Both are **callbacks** on `runExperiment`.
- Frame the set as a starting point: the simplest check per goal. Not every error-analysis category gets an offline evaluator (impersonation and lengthy replies don't here), and the suite should grow as error analysis surfaces failures worth tracking. A word-count check for length is the obvious next one if a group asks.
- Point at the semantic-equivalence judge prompt in `scripts/run-dataset.ts`: expected output is the source of truth; paraphrases pass; missing material meaning fails.
- Call out why this chapter avoids Langfuse Platform evaluators as the primary path: configuring one needs existing experiment data to preview mappings, which blocks a clean first run.
- The correctness judge and the `behavior_match` decision use the same model credential as the agent: `LANGFUSE_GATEWAY_KEY` when it is set, otherwise `OPENAI_API_KEY`. `correctness` uses `OPENAI_MODEL`. `behavior_match` uses `gpt-6-luna` on the Decisions API. Session 4's Langfuse default evaluator model is **not** required here.
- Emphasize that both scores should appear in the console summary when `npm run dataset:run` finishes.
- Keep concurrency at one for workshops so traces and the final run summary are easy to follow.
- Before running the dataset, confirm both the OpenAI and Langfuse credentials point to active projects. The runner can finish with exit code 0 after skipping every item, so always check that the console prints experiment results rather than only SDK errors.
- Optional bonus only if you have time: show that Platform evaluators can still target experiment observations after the first run exists.

## Demo rhythm

1. Skim the numbered sections in `scripts/run-dataset.ts`.
2. Point out the two callback evaluators in the `evaluators` array.
3. Run `npm run dataset:run`.
4. Open the run table, per-item traces, and chart view: both scores should already be present.
5. (Optional) Mention Platform evaluators / **Check Correctness** as a later add-on once experiment data exists.

## Watch for

- Learners trying to set up **Check Correctness** in the UI before the first run. Redirect them to the script callbacks; platform setup is bonus-only.
- The ideal answers are written in the shape the step 07 prompt asks for, but only with the steps that matter. The generic semantic-equivalence judge treated every detail as required (Face ID without "or passcode", a decline that didn't name the topic, a clarifying question with different examples), so the judge prompt has a short "What Is Material For This Support Agent" section. Without it, `correctness` sat around 0.6 for both prompts. Use this as the live example of checking a judge against your own labels.
- Do not use `expectedBehavior` as the correctness reference. That field belongs to `behavior_match`; correctness uses `idealAnswer`.
- Expect a first run around `behavior_match` 0.68–0.72 and `correctness` 0.68. The current prompt walks Dad through the out-of-scope requests instead of deferring, including the ones that arrive mid-conversation, and rarely asks a follow-up on the vague items. That gap is what step 07 fixes.
- Missing `behavior_match` usually means the Decisions call failed, for example because the model credential has no access to `gpt-6-luna`. Check the terminal error.
- `401 The project you are requesting has been archived` followed by `No experiment results to display` means the OpenAI key belongs to an archived project. Replace `OPENAI_API_KEY` locally with a key from an active project, then rerun.
- A 401 `Invalid gateway credential` means `LANGFUSE_GATEWAY_KEY` is missing, expired, or revoked. Issue a new gateway key, or clear it and use `OPENAI_API_KEY`.
- Missing `correctness` in the console usually means the judge call failed (bad key, model, or JSON parse). Check the terminal error rather than refreshing Langfuse for a pending platform score.
