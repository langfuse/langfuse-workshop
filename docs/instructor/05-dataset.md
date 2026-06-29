---
title: "Workshop: Instructor Notes for Datasets"
description: "Facilitator notes for framing datasets as product scope, seeding curated examples into Langfuse, and connecting items back to monitoring."
---

# 05 Dataset

Learner guide: [05 Dataset](../learner/05-dataset.md)

## Instructor notes

- Frame the dataset as product scope written down: expected user inputs, expected behavior, and metadata for slicing.
- The code path is intentionally simple: seed curated JSON into Langfuse, then inspect the hosted dataset.
- Call out why `expectedOutput` has two fields: `idealAnswer` feeds the Correctness judge, and `expectedKeywords` feeds the deterministic `keyword_overlap` check in the next chapter.
- Connect this chapter back to monitoring: good dataset items often come from surprising production traces.

## Demo rhythm

1. Open `data/seed-dataset.json` and point out `input`, `expectedOutput`, and `metadata`.
2. Run `npm run dataset:seed`.
3. Open the dataset list and item table in Langfuse.

## Watch for

- Learners expecting exact-answer matching. The ideal answer is reference material for evaluators, not a string equality target.
- Duplicate dataset items if the seed script is run repeatedly against the same project.
