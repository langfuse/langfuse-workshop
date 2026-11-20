---
title: "Workshop: 4.2 Detect topics and issues"
description: "Configure a topic map for 200 sample traces, then explore model-generated groups by intent, sentiment, outcome, and issues."
---

# 4.2 Detect topics and issues

## Why topics and issue detection

Topics turns trace-level data into a map of what your agent handles, where runs end, and what goes wrong. It is useful when the trace volume is too large to read one by one.

The map is a starting point for questions such as:

- Which requests are we handling in production?
- Which groups suggest an opportunity to expand the product?
- Which recurring issues should become prompt changes, tools, or evaluators?

Topic names come from a model after the groups form. Your result will be close to the examples in this lesson, and it will not be identical.

## Goal

Configure a topic map for 200 sample traces, then read the groups for what Specs is asked to do, how Dad feels, and where the handling goes wrong.

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

## Step 1: Seed the traces

```bash
npm run langfuse:seed:topics
```

The seed is **not idempotent**. OpenTelemetry mints fresh trace IDs on every run, so re-running doubles the data. Run it once. If you need a clean slate, delete the prior seed traces in Langfuse before seeding again.

Open [Tracing](https://cloud.langfuse.com/project/~/traces) if you want to inspect the seeded traces first. Then open [Topics](https://cloud.langfuse.com/project/~/topics).

## Step 2: Add the model connection

Topics needs an LLM connection in the project. Add an OpenAI connection before editing the map. [Section 4.3 Capturing signals](./capturing-signals.md) uses this same connection.

1. In Langfuse, open **Project Settings → LLM Connections**.
2. Click **Add LLM Connection**.
3. Choose OpenAI, name the connection, and paste your OpenAI API key into the secret field.
4. Save the connection.

If a connection is already there, keep it and continue.

Keep the API key in the Langfuse secret field only. Do not paste it into workshop transcripts or shared notes.

## Step 3: Set up topics from the empty state

On a new project, Topics opens with **See what your traces are about** and a **Set up topics** button. Start there. The first-run setup is a three-step wizard; after the map exists, use **Edit map** to change the same settings.

![The empty Topics state before the first map is created.](../../images/topics/empty-setup.png)

1. Click **Set up topics**. In **Facets · What to look for**, leave all four facets checked:

   - **Intent:** what the run was asked to do.
   - **Sentiment:** how the end user felt about the interaction.
   - **Outcome:** where the run ended and whether that is confirmed.
   - **Issues:** the main problem in how the run was handled.

   A project may have a different selection, so do not assume that every facet is present in every map.

   Keep the recommended models: `gpt-6-luna` for summaries, `text-embedding-3-small` for embeddings, and `gpt-6.1-terra` for grouping. Click **Next**.

   ![Choose the four facets and the recommended analysis models.](../../images/topics/setup-look-for-current.png)

2. On **Select traces to analyze**, use **Query** or **Builder** to limit the map to the traces for this app. Topics runs on trace-level data. If the project contains several agents or applications, filtering keeps them from being mixed into one map. For this workshop, leave the filter empty so all seeded traces match.

   Leave the **Sampling rate** at `100%`. The wizard shows the matching-trace window and count on the review step; in the current UI capture, it reports the last 30 days. After a map exists, the **Edit map** preview may report a 7-day window instead. New traces can take about 5 minutes after their last activity to become eligible; the seed timestamps its newest trace more than 5 minutes in the past.

   ![Select the traces and sampling rate before analysis.](../../images/topics/select-traces-current.png)

   Click **Next**.

3. On **Review**, confirm the four facets, the three models, and `100% sampling rate`. The review also shows how many traces match. Topics needs about 100 traces to form stable groups, so a smaller batch may take longer. If the project contains traces from more than this workshop, the first result can include those traces too; use a trace filter when you need an app-specific map.

   ![Review the facets, models, sampling rate, and matching-trace count.](../../images/topics/review-current.png)

   Click **Start analyzing**. The analysis runs in the background and may take a few minutes. New traces appear about 5 minutes after their last activity.

After the first map exists, **Edit map** opens these settings again. Use it to rename the map, change facets or filters, toggle **Live updates**, or adjust the sampling rate.

If the map is marked **PAUSED**, it is not analyzing new traces. The header status tells you whether the selected map is active. The map selector can contain more than one map.

## Step 4: Explore the map

When analysis is ready, choose a facet from the tabs under **Analyze**. Only enabled facets appear. Choose **Treemap** for a size-based overview or **Scatter** for an embedding view of the groups.

The **Unassigned** toggle controls whether traces without a topic are included. The tiles show model-generated names, counts, and percentages. Click a tile to see the matching traces and their summaries. **Open in Tracing** takes you to the corresponding trace list.

![A loaded Topics treemap with model-generated topic tiles and the matching trace table.](../../images/topics/result-treemap.png)

On **Scatter**, inspect the groups and the trace list together. You can search the results with filters such as an assignment or topic, then open the matching traces in Tracing.

![Scatter shows the embedding map, topic counts, and matching traces.](../../images/topics/result-scatter.png)

On **Issues**, open a group and read several traces before calling it a failure. A model-generated issue can be too broad, can overlap with an intent, or can describe a symptom rather than the cause.

![The loaded Issues facet with model-generated issue labels and trace summaries.](../../images/topics/result-issues.png)

![The loaded Sentiment facet with model-generated sentiment labels and trace summaries.](../../images/topics/result-sentiment.png)

## Step 5: Apply the map to the Dad IT Support Agent

Walk through the enabled facets before choosing a fix. Intent shows the kinds of help Dad requested. Sentiment shows how conversations felt. Outcome shows where they ended. Issues shows recurring problems in the handling. Some groups will show the agent working as expected. Topics are a map of use, including the requests that succeed.

The groups are close to deterministic. A model names and describes them afterward, so the names and counts below describe one run of this data. Yours may be different. Treat the labels as hypotheses: open representative traces, decide what the group means, and then turn the useful patterns into prompt changes, tools, or evaluators.

### Insight 1: Laptop help is a chance to widen what Specs supports

On **Intent**, look for two larger groups that are not iPhone tasks: one about the laptop's Wi-Fi, and one about printing from the laptop, including paper jams and paper in the tray.

The iPhone is the device Specs is built for. These requests sit outside that, and Specs answers them anyway. Open several traces. The answer does not ask which laptop Dad has. It hedges every time: if it is Windows, do this; if it is a Mac, do this.

The agent is trying to be helpful, and it is missing the context it needs. This is a context problem, and we can provide that context through the `get_support_context` tool. `DEFAULT_SUPPORT_CONTEXT` in `src/server/support-data.ts` already lists Dad's iPhone under `devices`, and that is what the tool returns. Add the laptop there, next to the phone. Specs can then give the steps for that machine.

A tile summary may describe these replies as unsupported and suggest sending Dad back to iPhone help. Read the traces before taking that suggestion. Specs is already trying to help. Telling it which laptop Dad uses makes those answers specific.

The prompt still names only the iPhone. A more specific prompt version based on these laptop requests could look like this:

> You are Dad IT Support Agent.
> You are talking to Dad. He opened this chat himself to get help with his phone and his laptop.
>
> Look up which phone and laptop he has, and search the help library, so the steps match that device. Then tell him what to do: what to tap, and what he should see on the screen.
>
> Use plain language.
>
> Rules:
> - Keep the reply to a short numbered list.
> - If he asks for something other than IT help, say so briefly, point him back to his phone or his laptop, and ask one short redirect question. Do not answer that request.
> - If you can't tell what he needs, ask one short clarifying question before giving any steps.
> - Use clear instructions on what to tap
> - You are the support agent. Do not speak as someone in his family.

Leave the running prompt as it is for now. The laptop belongs in the prompt because Dad is already asking about it. The prompt you publish in [07 Evaluate a change](../07-evaluation.md) is the one from [section 4.1 Error analysis](./error-analysis.md), which still points non-IT requests back to his phone.

### Insight 2: Sentiment shows the frustration

On **Sentiment**, the largest group may still be calm or neutral. Frustration does not land as one block. It can split across several groups with names such as "Frustration with Task Difficulties", "Frustration with connectivity difficulties", "Frustration With Ineffective Guidance", or "Frustration and Annoyance."

Open the group that is about connectivity or troubleshooting. The summaries should include Dad being frustrated that the laptop would not reconnect to Wi-Fi, or that the Wi-Fi troubleshooting did not work.

A few messages are in all caps, such as "THIS STILL ISNT WORKING", and a few push back: "No, that menu isn't there." [Section 4.3 Capturing signals](./capturing-signals.md) is next, and it turns this feeling into two scores: Dad disagreeing with the steps, and Dad writing in all caps.

### Insight 3: Repeated steps after Dad says they failed

On **Issues**, look for a group about repeated failed troubleshooting. The description should say that the response repeats prior instructions instead of adapting to the reported problem or investigating why they did not work.

These are the two- and three-turn sessions where Dad says the steps did not work ("I did that, but nothing changed" or "I can't find that option") and Specs sends the same numbered list again. They hide inside ordinary intents such as Bluetooth or WhatsApp, which is why they show up together here.

The fix could live in the system prompt: when Dad says a step failed, ask what he sees on screen and try a different path.

### Insight 4: A search that looks wrong, and an answer that still works

On **Issues**, you may find a group about mismatched help-library searches. The tile can describe traces where the lookup query or result does not match the request, while the final answer still covers what Dad asked.

Open a few traces. The help-library query or result may be unrelated, and the final answer can still be useful. Leave this tile for a later look at the library. How often does `search_help_library` actually help, and which requests does it have nothing useful for? Look at the guides in `src/server/support-data.ts` before treating the tile as a broken answer.

Read enough traces to decide whether the group is a prompt problem, a tool problem, or missing library content. Halo can help with that reading. From the Topics page, ask it to open a group, point at the step in the trace that led to the issue, and flag tiles that look like false positives.

[Section 4.3 Capturing signals](./capturing-signals.md) is next. It turns the frustration and disagreement patterns into production signals.
