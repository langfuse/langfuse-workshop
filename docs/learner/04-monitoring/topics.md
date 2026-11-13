---
title: "Workshop: Detect topics and issues"
description: "Detect topics and issues in 200 sample traces, grouped by intent, sentiment, outcome, and issues."
---

# Detect topics and issues

Topics and issue detection is an approach that analyzes trace data at scale by intent, sentiment, outcome, and issues, then groups the ones that belong together.

In this lab we will detect topics and issues in 200 sample traces.

```bash
git checkout checkpoint/04-monitoring
```

## Seed the traces

```bash
npm run langfuse:seed:topics
```

> ⚠️ The seed is **not idempotent**. OpenTelemetry mints fresh trace IDs on every run, so re-running doubles the data. Run it once. If you need a clean slate, delete the prior seed traces in Langfuse before seeding again.

Open [Tracing](https://cloud.langfuse.com/project/~/traces) if you want to inspect the seeded traces first. Then open [Topics](https://cloud.langfuse.com/project/~/topics).

## Add the model connection

The model list in the next step comes from the project's LLM connections. Add an OpenAI connection now. [Capturing signals](./capturing-signals.md) uses this same connection.

1. In Langfuse, open **Project Settings → LLM Connections**.
2. Click **Add LLM Connection**.
3. Choose OpenAI, name the connection, and paste your OpenAI API key into the secret field.
4. Save the connection.

If a connection is already there, keep it and continue.

Keep the API key in the Langfuse secret field only. Do not paste it into workshop transcripts or shared notes.

## Set up topics

1. On the empty Topics page, click **Set up topics**.

   ![See what your traces are about, then set up topics.](../../images/topics/setup-topics.png)

2. Under **What to look for**, leave all four checked:

   - **Intent:** what the agent was asked to do.
   - **Sentiment:** how the end user felt about the interaction.
   - **Outcome:** where the run ended, and whether that is confirmed.
   - **Issues:** the main problem in how the run was handled.

   Under **Select models for analysis**, keep the models marked **Recommended**: summaries, embeddings (`text-embedding-3-small`), and grouping. Click **Next**.

   ![Choose intent, sentiment, outcome, and issues, and keep the recommended models.](../../images/topics/setup-look-for.png)

3. On **Select traces to analyze**, leave the sample rate at **100%**. Click **Next**.

   ![Analyze new traces at a 100% sample rate.](../../images/topics/setup-traces.png)

4. On **Review**, check that **Look for** is Intent, Sentiment, Outcome, and Issues, then click **Start analyzing**.

   The review tells you how many traces from the last 7 days it can use. Topics need about 100 traces before the groups settle, so a smaller batch can take longer to form. New traces show up about 5 minutes after their last activity. This seed already places the newest trace more than 5 minutes before now, so the batch is past that wait. If the review says there are no past traces, the seed in this section has not landed in that window yet.

   ![Review what Topics will look for, then start analyzing.](../../images/topics/setup-review.png)

## Insights

When the page fills in, the tabs are **Intent**, **Sentiment**, **Outcome**, and **Issues**. There are different approaches to visualize the data. The default is Treemap.

Click a tile. The list under it is the traces in that group, each with a one-line summary. **Open in Tracing** shows those same traces in the trace table. Tile names come from the model, so yours will be close to the ones below, not necessarily identical.

![Intent groups for the Dad IT Support Agent, with the traces inside Perform WhatsApp Tasks.](../../images/topics/intent-treemap.png)

### The four tabs are a map of the system

Start by walking the tabs, before looking for something to fix. Intent is the kinds of help Dad asked for. Sentiment is how the conversation felt. Outcome is where it ended. Issues is what went wrong in the handling, including when the same problem sits under more than one intent.

A few hundred traces become a handful of classes you can name. Some of what you see is the product working: iPhone tasks grouping together, ordinary requests landing cleanly. You are learning about the shape of how the system is used in production, not only hunting failures. It also helps to understand how the system is used over time. Some topics that might have been important last month because there was a special event might now be less requested.

Every generation of topics is non-deterministic, because the clustering is done by an LLM. Below is a walkthrough of the topics and issues we found on one run of this data.

### Insight 1: Laptop help is a chance to widen what Specs supports

On **Intent**, look for two of the larger groups that are not iPhone tasks: one about the laptop's Wi-Fi, and one about printing from the laptop, including paper jams and paper in the tray. The iPhone is the device Specs is built for. These requests sit outside that, and Specs answers them anyway.

In this run the printing tile is **Laptop Printing Assistance**, 29 traces. The summaries are print jobs, a flashing printer light, and paper that comes out sideways.

![Intent treemap with Laptop Printing Assistance open, 29 traces.](../../images/topics/laptop-printing.png)

Open a few of those traces. The answer does not ask which laptop Dad has. It hedges every time: if it is Windows, do this; if it is a Mac, do this.

The agent is trying to be helpful, while it is missing the context it needs to answer the question. This is a context problem, and we can provide that context through the `get_support_context` tool. `DEFAULT_SUPPORT_CONTEXT` in `src/server/support-data.ts` already lists Dad's iPhone under `devices`, and that is what the tool returns. Add the laptop there, next to the phone. Specs can then give the steps for that machine instead of both.

A tile summary may describe these replies as unsupported and suggest sending Dad back to iPhone help. Read the traces before you take that suggestion. Specs is already trying to help. Telling it which laptop Dad uses makes those answers specific.

### Insight 2: Sentiment shows the frustration

On **Sentiment**, the largest tile is still calm. The name is close to "Neutral, Unemotional Tone". Frustration does not land as one block. It splits into a few tiles, with names close to "Frustration with Task Difficulties", "Frustration with connectivity difficulties", "Frustration With Ineffective Guidance", and "Frustration and Annoyance".

Click the connectivity one. It is about 25 traces. The summaries say Dad was frustrated that the laptop would not reconnect to Wi-Fi, or that the Wi-Fi troubleshooting did not work.

![Sentiment groups, with Frustration with connectivity difficulties open.](../../images/topics/sentiment-frustration.png)

A few of those messages are in all caps ("THIS STILL ISNT WORKING"), and a few push back ("No, that menu isn't there"). [Capturing signals](./capturing-signals.md) is the next section, and it turns this feeling into two scores: Dad disagreeing with the steps, and Dad writing in all caps.

### Insight 3: Repeated steps after Dad says it failed

On **Issues**, one tile in this run is **Repeated Failed Troubleshooting**, 30 traces. The tile says the response repeats prior instructions instead of adapting to the reported problem or investigating why they did not work.

![Issues treemap with Repeated Failed Troubleshooting open, 30 traces.](../../images/topics/repeated-failed-troubleshooting.png)

These are the two- and three-turn sessions where Dad says the steps did not work ("I did that, but nothing changed", "I can't find that option") and Specs sends the same numbered list again. They hide inside ordinary intents such as Bluetooth or WhatsApp, which is why they show up together here and not as their own intent.

The fix could live in the system prompt: when Dad says a step failed, ask what he sees on screen and try a different path instead of repeating the list.

### Insight 4: A search that looks wrong, and an answer that still works

On **Issues**, one tile in this run is **Mismatched Help Search Queries**, 39 traces. The tile says most of these traces used an unrelated or mismatched search query during the help lookup, and often still recovered with relevant instructions.

![Issues treemap with Mismatched Help Search Queries open, 39 traces.](../../images/topics/mismatched-help-search.png)

Open a few traces. The help-library query or result is unrelated, and the final answer still covers what Dad asked. The summaries say the mismatch was an extra step, not the thing that decided the turn.

That is not a failure to patch in this session. It raises a question about the library. How often does `search_help_library` actually help, and which requests does it have nothing useful for? That is worth a closer look at the guides in `src/server/support-data.ts` before treating the tile as a broken answer.

## Takeaway

Topics gives you a map of what your agent is handling in production, how users are feeling about the system, and where it fails.

The facets give you a starting point to dig deeper and explore.

- There might be insights on expansion opportunities for your system.
- Some things might show up as failures but are actually an indication that you could change your system.
- They can give you inspiration for what kind of evaluators to set up.

[Capturing signals](./capturing-signals.md) is the next section. It is one of those evaluators: a score for disagreement, and a score for all-caps frustration.
