---
title: "Workshop: Instructor Notes for Experiments"
description: "Facilitator notes for running Langfuse experiments, contrasting deterministic and LLM-as-a-judge scores, and inspecting run results."
---

# 06 Experiments

Learner guide: [06 Experiments](../learner/06-experiments.md)

## Instructor notes

- The key idea is reuse: the experiment runner calls the same `runSupportConversation(...)` as the web app.
- Contrast deterministic scoring (`keyword_overlap`) with LLM-as-a-judge scoring (`correctness`).
- Confirm the default evaluator model before the Correctness setup. If learners skipped setup, send them to **Project Settings → LLM Connections** first.
- Keep concurrency at one for workshops so traces and console output are easy to follow.

## Demo rhythm

1. Skim the numbered sections in `scripts/run-dataset.ts`.
2. Configure the Correctness evaluator for dataset runs.
3. Run `npm run dataset:run`.
4. Open the run table, per-item traces, and chart view.

## Watch for

- Correctness evaluator mapping. `query` comes from dataset input, `generation` from run output, and `ground_truth` from expected output.
- "No default model set" means Langfuse needs an LLM connection/default evaluator model; it is not fixed by editing `.env`.
- Slow asynchronous evaluator results; refresh after the run finishes.
