---
title: "Workshop: 4.1 Error Analysis"
description: "Seed 20 traces, annotate them in a queue, and use Halo to cluster failure modes, create category scores, and chart how often each one appears."
---

# 4.1 Error analysis

Part of [04 Monitoring](../04-monitoring.md).

Error analysis finds failure modes by open-coding traces, then clustering those notes. This lab uses its own batch of 20 traces.

## Seed the traces

> **TODO:** Decide which 20 traces this seed includes.

Seed 20 traces for this lab. They need to be the newest traces in the project, because the next step selects the last 20.

The seed is **not idempotent**. Running it again adds another 20 traces. Run it once.

## Annotate

1. In [Tracing](https://cloud.langfuse.com/project/~/traces), select the last 20 traces and add them to an annotation queue. The queue has two score configs: **open coding** (Text) and **pass/fail** (Categorical, with the categories pass and fail). Create the queue with those configs, then add the traces. A queue keeps the score configs it was created with.
2. Open the queue and choose **Process queue**.
3. For each trace, mark pass or fail.
4. When it fails, inspect the trace and write the failure in open coding. Describe what went wrong. Leave the notes ungrouped.
5. Finish the set before you cluster. The notes are the input to the next step.
6. After the set, ask Halo to cluster the failure modes. Stay on the annotation queue so the current page is in context, open Halo, and ask: "Can you help me cluster my annotations into failure modes?"

   ![Ask Halo to cluster the annotations into failure modes.](../../images/monitoring/halo-cluster-annotations.png)

7. Ask Halo to create these categories as categorical scores.

   > **TODO:** Add the rough categories Halo should create.

8. Go through the queue again and assign each failing trace to a category.
9. Ask Halo to build a dashboard for the frequency of each category.

   > **TODO:** Add how that dashboard should look.

10. For each category, decide whether to fix it or turn it into an evaluator.

    > **TODO:** Add the results of that decision.

The full version of this targets on the order of 100 traces. This lab uses 20. The [annotation queue docs](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues) cover the queue controls, and the Academy page on [error analysis](https://langfuse.com/academy/monitoring/error-analysis) is the longer method.
