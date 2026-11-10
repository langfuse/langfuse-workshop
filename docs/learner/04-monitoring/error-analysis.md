---
title: "Workshop: 4.1 Error Analysis"
description: "Annotate 10 to 15 production traces in a queue, cluster the failures, and decide what to fix or measure."
---

# 4.1 Error analysis

Part of [04 Monitoring](../04-monitoring.md).

> **TODO:** Figure out how learners get 10 to 15 traces where something is actually going wrong. A random slice of the seeded batch is mostly successful turns, so the annotation pass can come back with nothing to cluster.

If you have not seeded production data yet, go back to [Seed production traffic](../04-monitoring.md#seed-production-traffic) and do that first.

Error analysis finds failure modes by open-coding traces, then clustering those notes. Work through 10 to 15 traces:

1. Create two score configs and add them to a new annotation queue: **open coding** (text) and **pass/fail** (boolean). In Langfuse, open **Human Annotation → New queue**, select those configs, and create the queue. A queue keeps the score configs it was created with.
2. In [Tracing](https://cloud.langfuse.com/project/~/traces), filter to the `production` environment. Select 10 to 15 traces and choose **Add to Annotation Queue**.
3. Open the queue and choose **Process queue**.
4. For each trace, mark pass or fail.
5. When it fails, inspect the trace and write the failure in open coding. Describe what went wrong. Leave the notes ungrouped.
6. After the set, open Halo and ask it to cluster the failure modes from the open-coding notes.
7. Name those groups, then assign each failing trace to a group. Create a categorical score config with those names and set it on the traces.
8. Look at how often each category appears.
9. For each category, fix it or turn it into an evaluator.

The full version of this targets on the order of 100 traces. This lab uses 10 to 15. The [annotation queue docs](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues) cover the queue controls, and the Academy page on [error analysis](https://langfuse.com/academy/monitoring/error-analysis) is the longer method.
