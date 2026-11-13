---
title: "Workshop: Instructor Notes for Build Eval Datasets"
description: "Facilitator notes for deciding what an eval dataset should evaluate, building it from error analysis, and seeding it into Langfuse."
---

# 05 Build eval datasets

Learner guide: [05 Build eval datasets](../learner/05-dataset.md)

## Instructor notes

- Start with the goal, not the items: decide what you want to evaluate (for Specs, correct answers and the right reply/defer/follow-up behavior), then pick cases that exercise it.
- Point out that 9 of the 25 items come from the 4.1 error analysis traces (`"source": "error-analysis"`), including multi-turn conversations where an out-of-scope question arrives after a normal fix. The other 16 cover cases error analysis didn't include, so the step 07 prompt is also measured on cases it wasn't written from.
- The code path is intentionally simple: seed curated JSON into Langfuse, then inspect the hosted dataset.
- Call out why `expectedOutput` has two fields: `idealAnswer` feeds the `correctness` LLM-as-a-judge callback, and `expectedBehavior` (`reply`, `defer_question`, or `ask_follow_up`) feeds the `behavior_match` callback in the next chapter.
- Connect this chapter back to monitoring: good dataset items often come from surprising production traces. Show one error-analysis trace next to its dataset item.

## Demo rhythm

1. Open `data/seed-dataset.json` and point out `input`, `expectedOutput`, and `metadata`, including one multi-turn item.
2. Run `npm run dataset:seed`.
3. Open the dataset list and item table in Langfuse.

## Watch for

- Learners expecting exact-answer matching. The ideal answer is reference material for evaluators, not a string equality target.
- Duplicate dataset items if the seed script is run repeatedly against the same project.
