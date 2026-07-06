---
title: "Workshop: Instructor Notes for Experiments"
description: "Facilitator notes for running Langfuse experiments, combining an in-script deterministic score with an LLM-as-a-judge evaluator, and inspecting run results."
---

# 06 Experiments

Learner guide: [06 Experiments](../learner/06-experiments.md)

## Instructor notes

- The key idea is reuse: the experiment runner calls the same `runSupportConversation(...)` as the web app.
- Contrast deterministic scoring in the script (`keyword_overlap`) with LLM-as-a-judge scoring (`correctness`).
- Confirm the default evaluator model before the Correctness setup. If learners did not configure it in session 4, send them to **Project Settings → LLM Connections** first.
- Emphasize the mixed setup: the script owns the cheap deterministic check, while Langfuse owns the semantic judge.
- Keep concurrency at one for workshops so traces and the final run summary are easy to follow.

## Demo rhythm

1. Skim the numbered sections in `scripts/run-dataset.ts`.
2. Point out the `keyword_overlap` evaluator inside the script.
3. Configure the Correctness evaluator as a dataset-run evaluator.
4. Run `npm run dataset:run`.
5. Open the run table, per-item traces, and chart view.

## Watch for

- Correctness evaluator target. Keep it on **Dataset runs** if you want the score to show up on the run rows and in run comparison.
- Have learners switch from the default **Observations** view to **Dataset runs** before they configure anything else.
- If no experiment run exists yet, the review table or prompt preview may be empty. That is expected before `npm run dataset:run` creates the first run.
- Correctness evaluator mapping uses three different source dropdowns: `query` is **Input** with `$.messages[-1].content`, `generation` is **Output** with no JsonPath, and `ground_truth` is **Expected Output** with `$.idealAnswer`.
- A common misconfiguration is leaving all three variables on **Input**, which silently makes the evaluator read the wrong data for every field.
- Learners assuming the deterministic check must live in Langfuse now. It does not; mention the code-evaluator docs only as an alternative.
- "No default model set" means Langfuse needs an LLM connection/default evaluator model; it is not fixed by editing `.env`.
- Slow asynchronous evaluator results; the console only shows the final summary, so refresh Langfuse after the run finishes if `correctness` is still pending.
