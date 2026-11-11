---
title: "Workshop: 4.1 Error Analysis"
description: "Seed 20 traces, annotate them in a queue, and use Halo to cluster failure modes, create category scores, and chart how often each one appears."
---

# 4.1 Error analysis

Part of [04 Monitoring](../04-monitoring.md).

Error analysis is a structured approach to find failure modes by open-coding traces, then clustering those notes, and checking the number of occurrences. In this lab we will do error analysis on 20 example traces of the sample application. Usually 50–100 traces are recommended as a starting point. The process should be repeated over and over again as system usage and failure modes can shift.

```bash
git checkout checkpoint/04-monitoring
```

If you are new to error analysis, check out the Academy page on [error analysis](https://langfuse.com/academy/monitoring/error-analysis).

To be able to judge the outputs, we need to establish a few expectations towards the application:

- The agent shall always respond in a structured and easy to understand manner, so the user can follow.
- The agent is made specifically for IT support questions, more specifically for phone help.
- The agent should talk about itself as an AI agent and not pretend to be something or someone else.

## Seed the traces

This lab seeds 20 traces to work with.

```bash
npm run langfuse:seed:error-analysis
```

The seed is **not idempotent**: running it again adds another 20 traces. Run it once. The new traces are tagged `error-analysis-seed`, and they are the newest traces in the project.

## Annotate

1. In [Tracing](https://cloud.langfuse.com/project/~/traces), select the last 20 traces and add them to an annotation queue. The queue has two score configs: **open coding** (Text) and **pass/fail** (Categorical, with the categories pass and fail). Create the queue with those configs, then add the traces. A queue keeps the score configs it was created with.

   ![Select the traces, then add them to an annotation queue.](../../images/monitoring/add-to-annotation-queue.png)

2. Open the queue and choose **Process queue**.
3. For each trace, mark pass or fail. Check the initial question, the answers of the agent, and also the turns and tool calls in between.
4. When it fails, describe what went wrong and where. Do not assign categories yet.
5. After the set, ask Halo to find clusters. Stay on the annotation queue so the current page is in context, open Halo, and ask it to cluster the annotations.

   ![Ask Halo to cluster the annotations into failure modes.](../../images/monitoring/halo-cluster-annotations.png)

   <details>
   <summary>The clusters should look roughly like this</summary>

   - Out of scope request that is responded to
   - Impersonation
   - Lengthy responses

   </details>

6. Ask Halo to create categorical scores for the clusters it found.
7. Go through the queue again and assign each failing trace to a category.
8. Ask Halo to build a dashboard for the frequency of each category. One bar per failure. The longest bar is the failure that shows up most often.

   ![Failure categories, with one bar per failure mode.](../../images/monitoring/failure-categories.png)

9. Decide what to do with each category. Is it something that can be fixed through improving the specification in the system prompt? Is it something that needs to be monitored in production?

   - **Out of scope request that is responded to.** Fix the behavior so Specs declines an out-of-scope request in a friendly way and points Dad back to iPhone help. Also monitor this on production traffic, so a later reply that answers a recipe, an investment question, or a laptop problem still shows up.
   - **Impersonation.** Fix it in the system prompt, so Specs answers as the support agent. Optionally monitor over time, as this should be avoided.
   - **Lengthy responses.** Fix it in the system prompt, so answers stay short and in numbered steps. Optionally monitor long replies in production as well.
