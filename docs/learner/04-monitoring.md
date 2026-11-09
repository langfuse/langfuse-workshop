---
title: "Workshop: Monitoring AI Agent Behavior"
description: "Make sense of production traces: aggregate cost, latency, and quality, read failures by hand, see topics and issues, and capture signals."
---

# 04 Monitoring

## Why we monitor

Tracing gives you a record of every turn. As soon as many traces hit the system in production, that record is too big to read one by one. Monitoring is how you deal with the data: aggregate it, read it on purpose, and pull out the traces that are worth a closer look.

Complementary materials:

- Docs: [Custom dashboards](https://langfuse.com/docs/metrics/features/custom-dashboards)
- Academy: [Monitoring](https://langfuse.com/academy/monitoring)

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

You have a traced app with optional Langfuse-managed prompts. Every chat turn lands in Langfuse as a nested trace.

If you want to use prompt management but have skipped module 3, run the following command to publish the prompt:

```bash
npm run prompt:publish
```

You don't need to change any code in this step. The trace shape from `02-tracing` already carries the conversation, the answer, and the model usage these views read.

## Ways to work with production traces

A few different things are worth doing once the traces are there.

### Cost, latency, and quality

You want aggregate cost, latency, and quality over time, so a change in the app shows up as a trend instead of a feeling. [Dashboards](https://langfuse.com/docs/metrics/features/custom-dashboards) are where those aggregates live, including curated views for latency and cost.

Those charts can only show what the trace actually stores. Latency and token cost are on the trace because each model call was logged with its usage. Quality shows up once a score is attached to the same trace. That is why the tracing step records the conversation, the answer, and the usage on each observation: the aggregate view has nothing to read otherwise.

### Error analysis

One approach is error analysis: work through traces and figure out what is actually going wrong. This is a human process. A person reads a sample, writes down the first thing that failed, and groups those notes into failure categories. The categories should come from the traces.

[Error analysis](./04-monitoring/error-analysis.md) goes deeper into how to run it.

### Topics and issues

Another approach is an aggregate view of the topics the application is handling and the issues that keep coming up in them. Topics groups traces by what users are trying to do and by the problems in those runs, so you can see the shape of production without opening every row.

[Topics and issues](./04-monitoring/topics.md) is that view.

### Capturing signals

A final approach is capturing signals from production. A signal is something the user does or says that indicates how the turn felt, stored on that trace as a score. It is a judgment from the moment of use, which makes it a way to find traces worth reading once there are too many to open by hand.

For Specs, two conversation signals are enough to start. Dad disagrees with the steps ("No, that menu isn't there"). Dad writes in all caps ("THIS STILL ISNT WORKING"). Disagreement is a strong sign the last answer failed. All caps is a cheaper, rougher clue that the conversation may need a look.

[Capturing signals](./04-monitoring/capturing-signals.md) sets both up on the live app. The Academy page on [capturing signals](https://langfuse.com/academy/monitoring/capturing-signals) is the broader map of explicit ratings, behavioral signals, conversation signals, and outcomes.

## Load production traffic

These views need production traffic to work on.

```bash
npm run langfuse:seed:otel:no-scores
```

This replays a snapshot of Dad IT support traffic, plus a handful of synthesized edge cases (out-of-scope asks, ALL-CAPS messages, and "no, that menu isn't there" disagreements), into the `production` environment of your Langfuse project. It uses the Langfuse keys already in your `.env` and shifts every timestamp so the newest trace lands at now.

> ⚠️ The seed is **not idempotent**. OpenTelemetry mints fresh trace IDs on every run, so re-running doubles the data. Run it once. If you need a clean slate, delete the prior seed traces in Langfuse before seeding again.

Open **Tracing** and filter to the `production` environment. There is now a full set of traces in the project. The next sections work with this batch:

1. [Error analysis](./04-monitoring/error-analysis.md) — read a sample and name the failures.
2. [Topics and issues](./04-monitoring/topics.md) — see the intents and issues across the batch.
3. [Capturing signals](./04-monitoring/capturing-signals.md) — score disagreement and all-caps frustration as they arrive.
