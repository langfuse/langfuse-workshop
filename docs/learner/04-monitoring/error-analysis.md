---
title: "Workshop: Error Analysis"
description: "Read a sample of production traces and group what went wrong into failure categories a person can act on."
---

# Error analysis

Part of [04 Monitoring](../04-monitoring.md).

## Why do error analysis

The failures in this app are specific. Specs sends Dad to a menu that is not on his iPhone, answers a question it should have refused, or gives steps that only work after a follow-up. A generic score such as "helpfulness" does not name any of that.

Error analysis is a structured way to do the reading. You look at real traces first, write down what went wrong in your own words, and let the failure categories come out of those notes. The output is a small taxonomy for this app, plus a sense of which categories show up often enough to matter.

A person does this. The reading is the point: an evaluator or a topic cluster can suggest where to look, and the decision about what is actually broken stays a human one.

Complementary materials:

- Academy: [Error analysis](https://langfuse.com/academy/monitoring/error-analysis)
- Guide: [Error analysis for LLM applications](https://langfuse.com/guides/cookbook/error-analysis-llm-applications)

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

Use the `production` traces loaded from the [monitoring overview](../04-monitoring.md). If that environment is empty, run the seed command there once before you start.

## The process

Five steps, each one using the notes from the step before:

1. **Gather traces.** Take a sample that covers ordinary turns and anything that already looks off.
2. **Open coding.** For each trace, write the first thing that went wrong. No category list yet.
3. **Cluster.** Group notes that describe the same failure, and name the groups.
4. **Label and measure.** Mark the sample against those names and see which categories are common.
5. **Decide.** For each category, fix it, turn it into an evaluator, or keep watching it.

The full version of this targets on the order of 100 traces and an [annotation queue](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues) so a team can label them in Langfuse. In the workshop, do a short pass on about 15 traces. The mechanic is the same.

## Step 1 — Gather a sample

In Langfuse, open **Tracing** and filter to the `production` environment.

Read about 15 traces. Include ordinary iPhone questions and traces that already look different: a long thread, an odd request, all caps, or a "that menu isn't there" follow-up. The goal is coverage of what the batch contains. A purely random slice of the calmest turns will hide the failures.

## Step 2 — Open coding

For each trace, write one sentence: the first thing that went wrong, in your own words. Describe what you see. If the answer was fine, write that too.

Leave the sentences ungrouped. A predefined list ("hallucination", "tone", "tool use") will make you file traces into buckets that may not match this app.

## Step 3 — Cluster

Read the sentences back and group the ones that describe the same failure. Name each group so that two different causes do not share a label. "Wrong answer" is too broad if one case is a bad Settings path and another is Specs helping with something other than the iPhone.

Expect a handful of names, not a dozen. Split a group when the fix would be different.

## Step 4 — Label the sample

Go back over the 15 traces and mark each one with the category names that apply, or with "nothing wrong". Count them.

The count is the priority. A failure you saw once is a candidate to fix if the cause is obvious. A failure you saw several times is a candidate to measure from here on.

## Step 5 — Decide what to do

For each category, pick one:

- **Fix it** when the cause is a prompt line or a tool result you can change directly.
- **Capture it** when it will keep happening and you want it flagged on future traces. [Capturing signals](./capturing-signals.md) is that setup for disagreement and all-caps frustration.
- **Watch it** when you are not ready to automate it. The notes are enough until the next pass.

When the sample grows past what you want to track in a doc, put the labeling in Langfuse. An annotation queue is a list of traces with the score fields you defined, so the notes and the counts live on the traces. The [annotation queue docs](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues) cover creating the queue and adding traces to it.

## What you should leave with

A short list of failure categories for Specs, with one you would fix or measure first.

[Topics and issues](./topics.md) is the aggregate view of the same traffic. The categories you just named are also the raw material for `05-dataset`: real traces of behavior you want to lock in or fix.
