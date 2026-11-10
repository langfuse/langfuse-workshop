---
title: "Workshop: Monitoring AI Agent Behavior"
description: "Make sense of production traces: aggregate cost, latency, and quality, read failures by hand, see topics and issues, and capture signals."
---

# 04 Monitoring

## Why we monitor

Tracing gives you a record of every step your agent takes. As soon as the system is in production, the volume grows quickly to a point where reviewing every trace one by one is no longer feasible.

Monitoring is how you look at that tracing data at scale. It covers aggregate metrics and trends over time, and it covers signals that pick out individual executions worth a closer look.

## Ways to work with production traces

There are a few different ways to work with production data at scale.

### Cost, latency, and quality

[Dashboards](https://langfuse.com/docs/metrics/features/custom-dashboards) are where cost, latency, and quality show up as aggregates over time.

Those aggregates only exist because the information is on the trace. Latency and token cost are recorded with each model call. A quality score has to be written onto the same trace before a dashboard can show it.

### Error analysis

Error analysis is a structured approach to identify failure modes in your application. The Academy page on [error analysis](https://langfuse.com/academy/monitoring/error-analysis) goes deeper into how to run this approach.

In the hands-on lab in [section 4.1](./04-monitoring/error-analysis.md), we run through error analysis for the Dad IT Support Agent together.

### Topics and issues

Error analysis derives general concepts from individual traces, and a person does that reading. Topics and issue detection is the scalable approach: it clusters incoming traces into intent, sentiment, outcome, and issue categories. That shows the current state of the system, and how that state changes over time.

[Topics and issues](./04-monitoring/topics.md) is that view for Specs.

### Capturing signals

A signal is something the user does or says that indicates how the turn felt, stored on the trace as a score. It is a judgment from the moment of use.

Chat agents benefit from capturing signals. Any agent that interacts with a person can attach signals of success, completion, or problems as scores on its traces.

For Specs, we start with two conversation signals. We identify whether Dad disagrees with the steps, and whether Dad is writing in all caps. Both are strong signs that the last answer failed, or at least that the conversation is worth looking into. [Capturing signals](./04-monitoring/capturing-signals.md) sets those two up.

Check out the Academy page on [capturing signals](https://langfuse.com/academy/monitoring/capturing-signals) for the broader map of explicit ratings, behavioral signals, conversation signals, and outcomes.

Each section seeds the traces it uses. Do not load one batch here for all three.

1. [4.1 Error analysis](./04-monitoring/error-analysis.md) — seed 22 traces, annotate them, and cluster the failures.
2. [Topics and issues](./04-monitoring/topics.md) — group traces by intent, sentiment, outcome, and issues.
3. [Capturing signals](./04-monitoring/capturing-signals.md) — score disagreement and all-caps frustration as they arrive.
