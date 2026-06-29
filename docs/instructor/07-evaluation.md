---
title: "Workshop: Instructor Notes for Evaluating a Change"
description: "Facilitator notes for evidence-driven prompt iteration: inspect low-scoring items, change one thing, rerun, and compare regressions."
---

# 07 Evaluate a Change

Learner guide: [07 Evaluate a Change](../learner/07-evaluation.md)

## Instructor notes

- Make learners inspect run 1 before changing anything. The change should respond to evidence, not vibes.
- Keep the iteration deliberately small: one prompt rule, one rerun, one comparison.
- Emphasize regressions. The most useful comparison is often the item that got worse.
- Remind learners that both experiment scores are platform-side now, so a missing score usually means "still pending" or "evaluator target mismatch," not a bug in `scripts/run-dataset.ts`.

## Demo rhythm

1. Read low-scoring items from the first run.
2. Add or promote a new prompt version.
3. Run `npm run dataset:run` again.
4. Compare both runs side by side and decide whether the change is worth shipping.

## Watch for

- Learners changing both model and prompt at the same time, making the comparison hard to interpret.
- New prompt versions that are saved but not promoted to the label the app fetches.
