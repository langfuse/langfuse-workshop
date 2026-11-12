---
title: "Workshop: Instructor Notes for Evaluating a Change"
description: "Facilitator notes for evidence-driven prompt iteration: inspect low-scoring items, change one thing, rerun, and compare regressions."
---

# 07 Evaluate a Change

Learner guide: [07 Evaluate a Change](../learner/07-evaluation.md)

## Instructor notes

- Make learners inspect run 1 before changing anything. The change should respond to evidence, not vibes.
- Run 1 from 06 is the baseline experiment on the production prompt. The comparison is the more specific prompt from the end of 4.1 Error analysis, published with `WORKSHOP_PROMPT_VARIANT=error-analysis npm run prompt:publish` or pasted as a new version in the UI. That connects the failure categories from monitoring to a measured result.
- Expect roughly `behavior_match` 0.68–0.72 → 1.00 and `correctness` 0.68 → 0.84. The baseline answers the out-of-scope requests, including the ones that arrive mid-conversation (pasta after Bluetooth, a laptop after Wi-Fi), and answers the vague items without a follow-up question. The answers also get shorter, but nothing scores that here: read a few side by side.
- Keep the iteration deliberately small: one prompt version, one rerun, one comparison.
- Emphasize regressions. The most useful comparison is often the item that got worse.
- Remind learners that both experiment scores come from `runExperiment` callbacks in `scripts/run-dataset.ts`, so a missing score usually means the script hit an OpenAI/Langfuse error: check the terminal output first.

## Demo rhythm

1. Read low-scoring items from the first run.
2. Publish the error-analysis prompt as a new version promoted to `production`.
3. Run `npm run dataset:run` again.
4. Compare both runs side by side and decide whether the change is worth shipping.

## Watch for

- Learners changing both model and prompt at the same time, making the comparison hard to interpret.
- Learners editing the prompt in the UI but forgetting they need a new saved version promoted to the label the app fetches.
