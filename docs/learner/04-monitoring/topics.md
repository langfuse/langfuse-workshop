---
title: "Workshop: Topics and Issues"
description: "Look across production traces for the topics Specs is asked about and the issues that keep showing up."
---

# Topics and issues

Part of [04 Monitoring](../04-monitoring.md).

## Why look across traces

Error analysis reads traces one at a time. Topics is the aggregate view: which requests the application is handling, and which issues show up across those requests.

Langfuse summarizes each trace along a few facets, then groups similar summaries. Two facets matter for this pass:

- **Intent** — what the user was trying to get done, including when the run went badly. For Specs, that is the kind of help Dad asked for.
- **Issues** — the mistake that did the most damage to the result, in one sentence. Traces with a similar mistake land together, so a problem that is spread across many different questions shows up as one group.

Sentiment and outcome are built-in facets too. This section stays on intent and issues.

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

Use the `production` traces loaded from the [monitoring overview](../04-monitoring.md). If that environment is empty, run the seed command there once before you start.

Topics calls a model to summarize traces and to name the groups, and it needs an embedding model so similar traces can be placed together. If the project has no LLM connection yet, add one before you run it:

1. In Langfuse, open Project Settings → LLM Connections.
2. Click Add LLM Connection.
3. Choose OpenAI, name the connection, and paste your OpenAI API key into the secret field.
4. Save the connection.

Keep the API key in the Langfuse secret field only. The [capturing signals](./capturing-signals.md) section uses this same connection for the disagreement judge.

If **Topics** is not in the project sidebar, the feature is not enabled on this project yet. The rest of the monitoring module does not depend on it. Continue with [error analysis](./error-analysis.md) and [capturing signals](./capturing-signals.md).

## Step 1 — Set the models

Open **Topics** and set the models. There are three slots: summaries, embeddings, and clustering (the model that names the groups). Use the OpenAI connection. Pick a chat model for summaries and clustering, and an embedding model for embeddings. Saving runs a test call against each slot.

## Step 2 — Run it on the production traces

Use the first-run flow on the Topics page so it processes traces already in the project and builds the groups. That pass is what turns the seeded batch into an intent view and an issue view.

If you are running it by hand instead of the first-run flow:

1. Choose **Process traces** and select the `production` environment, so the summaries are built from the seeded batch.
2. Choose **Update topics** so those summaries are grouped and named.

Processing writes a summary per trace. Updating topics is the step that groups and names them. Until that second step, the summaries are saved and the topic view is still empty.

## Step 3 — Read the groups

Open **Intent**. Each group is a kind of request Dad makes. Open one group and then one trace in it, and check that the traces in the group are actually about the same goal.

Open **Issues**. Each group is a kind of problem, not a kind of question. Open one group and compare a few traces. The useful outcome is a problem that appears under more than one intent: the same failure, asked in different ways.

The page can show the same results as a treemap, a grid, or a cluster map. The groups are the same in each view. The map is a picture of the discovery pass. Traces processed later show up in the trace list for their group.

## What you should leave with

A few intents that describe what Specs is being asked, and at least one issue group you would want a person to read. That issue group is a good input to [error analysis](./error-analysis.md): the aggregate view tells you where the reading time goes.

[Capturing signals](./capturing-signals.md) is the next section. It attaches scores to new turns so disagreement and all-caps frustration stand out in the trace table.
