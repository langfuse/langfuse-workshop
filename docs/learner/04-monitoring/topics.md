---
title: "Workshop: Topics and Issues"
description: "Set up Topics so production traces are grouped by intent, sentiment, outcome, and issues."
---

# Topics and issues

Part of [04 Monitoring](../04-monitoring.md).

Topics labels every trace by intent, sentiment, outcome, and issues, then groups the ones that belong together. This section seeds its own traces, then sets that up.

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

## Seed this section

This loads 200 traces spread over the last five days. Most are ordinary iPhone questions, some one turn and some two or three. Two patterns are hidden in the mix for Topics to surface. The seed writes no scores, and every trace is tagged `topics-seed`.

```bash
npm run langfuse:seed:topics
```

> ⚠️ The seed is **not idempotent**. OpenTelemetry mints fresh trace IDs on every run, so re-running doubles the data. Run it once. If you need a clean slate, delete the prior seed traces in Langfuse before seeding again.

Open [Tracing](https://cloud.langfuse.com/project/~/traces) and filter to the `production` environment. Then open [Topics](https://cloud.langfuse.com/project/~/topics).

The model list comes from the project's LLM connections. If the dropdowns in the next step are empty, add an OpenAI connection first: Project Settings → LLM Connections → Add LLM Connection. The [capturing signals](./capturing-signals.md) section uses that same connection.

## Set up topics

1. On the empty Topics page, click **Set up topics**.

   ![See what your traces are about, then set up topics.](../../images/topics/setup-topics.png)

2. Under **What to look for**, leave all four checked:

   - **Intent** — what the run was asked to do.
   - **Sentiment** — how the end user felt about the interaction.
   - **Outcome** — where the run ended, and whether that is confirmed.
   - **Issues** — the main problem in how the run was handled.

   Under **Select models for analysis**, keep the models marked **Recommended**: summaries, embeddings (`text-embedding-3-small`), and grouping. Click **Next**.

   ![Choose intent, sentiment, outcome, and issues, and keep the recommended models.](../../images/topics/setup-look-for.png)

3. On **Select traces to analyze**, leave the sample rate at **100%**. Trace filters are not available yet. Click **Next**.

   ![Analyze new traces at a 100% sample rate.](../../images/topics/setup-traces.png)

4. On **Review**, check that **Look for** is Intent, Sentiment, Outcome, and Issues, then click **Start analyzing**.

   The review tells you how many traces from the last 7 days it can use. Topics need about 100 traces before the groups settle, so a smaller batch can take longer to form. New traces show up about 5 minutes after their last activity. If the review says there are no past traces, the seed in this section has not landed in that window yet.

   ![Review what Topics will look for, then start analyzing.](../../images/topics/setup-review.png)

## Read the groups

When the page fills in, the tabs are **Intent**, **Sentiment**, **Outcome**, and **Issues**. **Visualize as** can stay on **Treemap**. **Auto-analyze** stays on, so later traces are labeled the same way.

Click a tile. The list under it is the traces in that group, each with a one-line summary. **Open in Tracing** shows those same traces in the trace table.

![Intent groups for the Dad IT Support Agent, with the traces inside Perform WhatsApp Tasks.](../../images/topics/intent-treemap.png)

Do that once for each tab. Intent is the kind of help Dad asked for. Issues is the problem that showed up, including when the same problem sits under more than one intent. Sentiment and outcome are the other two cuts of the same traces.

## What to find

Look for two things: one gap in what Specs knows, and one way it fails.

- **Laptop questions.** Intent should show a group of laptop requests: Wi-Fi, updates, printing, sound, and so on. Open it. Every answer is "That depends on which laptop you have", because the support context only lists Dad's iPhone. That is in scope, so the fix is not a refusal. Add Dad's laptop to the support context (`DEFAULT_SUPPORT_CONTEXT` in `src/server/support-data.ts`) so Specs can give real steps.
- **Stuck follow-ups.** Issues and Outcome should show sessions where Dad says the steps did not work ("I did that, but nothing changed", "I can't find that option") and Specs sends the same numbered list again. These are two- and three-turn sessions, so they hide inside ordinary intents like Bluetooth or WhatsApp. The fix belongs in the system prompt: when Dad says a step failed, ask what he sees on screen and offer a different path instead of repeating the list.

Both patterns appear across many intents, which is why grouping beats reading traces one by one here.

[Capturing signals](./capturing-signals.md) is the next section. It attaches scores to new turns so disagreement and all-caps frustration stand out in the trace table.
