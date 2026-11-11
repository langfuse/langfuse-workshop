---
title: "Workshop: Instructor Notes for Monitoring"
description: "Facilitator notes for the monitoring overview, error analysis, topics, and the disagreement and all-caps signal evaluators."
---

# 04 Monitoring

Learner guide: [04 Monitoring](../learner/04-monitoring.md)

- [4.1 Error analysis](../learner/04-monitoring/error-analysis.md)
- [Detect topics and issues](../learner/04-monitoring/topics.md)
- [Capturing signals](../learner/04-monitoring/capturing-signals.md)

## Instructor notes

The chapter opens on the overview and goes straight into the four ways to work with production traces. There is no checkout block on that page. Dashboards are a link out, not a build exercise. Error analysis (section 4.1), topics, and capturing signals each have their own page.

Each section seeds its own traces. Do not seed once on the overview for all three.

Demo order:

1. Error analysis, on its own 20 traces, while the room still has to read them.
2. Topics, on the 200 traces that section seeds.
3. Capturing signals, so the two evaluators are the last thing they turn on.

### Error analysis

- Section 4.1 seeds its own 20 traces with `npm run langfuse:seed:error-analysis`. Seven are ordinary one-turn answers. The other 13 each have exactly one failure: 5 out-of-scope replies (a recipe, investment advice, or laptop support), 2 replies in a family voice, 2 replies where Dad asks who this is and the agent says "I'm your kid.", and 4 long unstructured replies. The family voice still gives the right steps. It never says "I am your kid." The tell is personal knowledge, such as having used this phone before. The two identity replies are the obvious version of that same failure. Longer sessions are two or three turns, and the failure is only on the latest answer. Do not substitute the topics snapshot.
- The queue is created with **open coding** (Text) and **pass/fail** (Categorical: pass and fail). Select the last 20 traces, tagged `error-analysis-seed`. A queue does not pick up score configs added later.
- Do not hand them the cluster names before they have written the open-coding notes. After the set, they ask Halo to find clusters. The expected names (out of scope, impersonation, and lengthy responses) are in a collapsed block on the page. That list is a check, not the Halo prompt. They judge each trace against three expectations: structured and easy to follow, phone IT support only, and the agent talks about itself as an AI agent.
- Ask Halo to create categorical scores for the clusters it found. If Halo words them differently, map those names to the three decisions before the second pass. They then assign each failing trace.
- Halo builds the frequency dashboard. The page shows the shape: one bar per failure category, and the longest bar is the failure that shows up most often. The picture is the layout, not the counts from this 20-trace lab.
- Close on the three decisions. First ask whether the fix belongs in the system prompt or in production monitoring. Out of scope: a friendly decline that points Dad back to iPhone help, plus a production monitor. Impersonation: a system-prompt fix so Specs answers as the support agent, with optional monitoring because it should be avoided. Lengthy responses: a system-prompt fix toward short numbered steps, with an optional production monitor.
- Then read the takeaway. Error analysis finds concrete failures from real cases, often where the system prompt was underspecified on format, scope, or how to handle the interaction. Counting the failures is how you prioritize. The same read gives engineers, domain experts, and PMs a shared picture of how the agent behaves in production. Hand off to topics.

### Detect topics and issues

- This is a setup walkthrough, not a concept lecture. Open Topics, click **Set up topics**, keep Intent, Sentiment, Outcome, and Issues checked, keep the recommended models, leave the sample rate at 100%, and click **Start analyzing**.
- The section seeds 200 traces over the last five days with `npm run langfuse:seed:topics`: 110 ordinary iPhone requests at one to three turns, 60 laptop requests split evenly between a printer-and-paper cluster and a laptop Wi-Fi cluster, and 30 two- or three-turn sessions where Dad says the steps failed and Specs repeats the same list. The laptop wording varies. Each laptop answer says the steps depend on which laptop it is, then gives a Windows way and an Apple way. At least 40% of the traces have Dad sounding frustrated, mostly on the unresolved ones. A few are all caps, and a few disagree with the steps. Each trace carries at most one of those problems.
- Land the insights in this order. First, walk Intent, Sentiment, Outcome, and Issues as a map of how the system is used in production: classes of requests, how they felt, where they ended, and what went wrong. Some groups are the product working. Insight 1 is Intent: laptop Wi-Fi, and printing from the laptop. In this run the printing tile is "Laptop Printing Assistance" (29). Open the traces. Every answer hedges with a Windows way and an Apple way. The move is to add the laptop next to the iPhone in `devices` on `DEFAULT_SUPPORT_CONTEXT`, which `get_support_context` returns. Specs is trying to help and is missing that context. Do not turn this into the error-analysis refusal. A tile summary may call the laptop replies out of scope. Insight 2 is Sentiment. The largest tile is still neutral. Frustration is split across a few tiles. Open the one close to "Frustration with connectivity difficulties" (about 25). The summaries say Dad was frustrated that the laptop would not reconnect to Wi-Fi. Mention the all-caps lines and the "No, that menu isn't there" pushback, then hand off to capturing signals, which scores disagreement and all-caps frustration. Insight 3 is "Repeated Failed Troubleshooting" (30 in this run): Dad says the steps failed while Specs sends the same list again. The page shows that tile. That one could be fixed in the system prompt. Insight 4 is "Mismatched Help Search Queries" (39 in this run), the lookup that does not match while the final answer still does. Do not send them to fix those answers. Ask how helpful the help library is, and where it is missing articles, including the laptop requests the library cannot cover. Tile names vary. The page says the clustering is non-deterministic, so this walkthrough is one run.
- Add the OpenAI connection in this section, before **Set up topics**, so the model dropdowns are filled. Capturing signals reuses that connection and only picks **5.6 Luna**.
- The review step says Topics need about 100 traces and that new traces show up about 5 minutes after their last activity. The seed already places the newest trace more than 5 minutes before now. If the review says there are no traces in the last 7 days, do not start analyzing on an empty window.
- After it fills in, click one tile on each tab (Intent, Sentiment, Outcome, Issues) and use **Open in Tracing**. Auto-analyze stays on.
- The page closes on a general takeaway. Topics is a map of what the agent handles in production, how users feel, and where it fails. The facets are a starting point: expansion opportunities, things that look like failures but point at a change to the system, and inspiration for which evaluators to set up. Then hand off to capturing signals.

### Capturing signals

- Two signals: **Detect User Disagreement** uses LLM-as-a-judge, and **Detect User Frustration (ALL CAPS)** uses deterministic TypeScript.
- The API keys in `.env` do not configure the judge model inside Langfuse. The disagreement evaluator needs the LLM connection.
- Both evaluators target the logical root `dad-it-support-chat-turn` agent observation, because that observation carries the conversation input and the final answer.
- The disagreement judge should run on **5.6 Luna** (`gpt-5.6-luna`) from the OpenAI connection.
- Have learners use the right-side sample panel, filtered to `production`. In **Map variables to data**, bind variables with **Use** on the observation tree: `conversation_history` on **Input → messages**, `last_user_message` on **Input → messages → last**. Do not have them type a JSONPath. Test before saving.
- `{{system_prompt}}` belongs to **Detect Out-of-Scope Request**. This section maps `conversation_history` on **Detect User Disagreement**.
- After **Create evaluator**, review filters, estimated weekly volume and cost, and sampling rate, then click **Execute**.
- Execute scores observations that arrive afterwards. Traces already in the project are the mapping sample, not an automatic backfill. The two chat turns in Verify are what should light up. Historical scoring is batch evaluation, and re-running a seed is the wrong way to get scores.
- The ALL-CAPS template is there to show a deterministic signal that needs no model call.
- The bonus is optional. In the evaluator library, **Detect conversation signals** is a decision-model template: one call scores several conversation signals at once. Have them test one or two examples and save. Do not replace the disagreement judge or the all-caps evaluator with it.

## Demo rhythm

1. Walk the overview: volume, dashboards, error analysis, topics, signals. Open the dashboards docs only long enough to show where cost and latency aggregates live, and say why those fields have to be on the trace.
2. Error analysis: run `npm run langfuse:seed:error-analysis` once, queue the last 20 with open coding (Text) and pass/fail (Categorical), mark pass or fail, write the notes, ask Halo to find clusters, compare them with the rough list on the page, ask Halo to create categorical scores for those clusters, assign them on a second pass, ask Halo for the frequency dashboard, then land the three decisions: friendly out-of-scope decline plus a production monitor, a system-prompt fix for impersonation, and a system-prompt fix for lengthy replies with an optional production monitor. Close on the takeaway: concrete failures, an underspecified system prompt, a count you can prioritize, and a shared picture for engineers, domain experts, and PMs.
3. Topics: add the OpenAI connection, run that section's seed once, open Topics, run **Set up topics** with all four labels and the recommended models, then walk the four tabs. Open the laptop printing tile as missing context. On Sentiment, open "Frustration with connectivity difficulties" and point ahead to disagreement and all-caps scores. Then repeated failed troubleshooting as a prompt fix, and mismatched searches that did not change the answer. Close on the general takeaway: a map of production, then the facets as a starting point for scope, system changes, and evaluators.
4. Capturing signals: the OpenAI connection is already in place from Topics. Pick **5.6 Luna**, create **Detect User Disagreement** on a production root observation, map both variables, test, create, and execute.
5. Create **Detect User Frustration (ALL CAPS)** on the same root, test, create, and execute.
6. Send one disagreement turn and one ALL-CAPS turn. In **Tracing**, filter by the evaluator score to find them.
7. If time remains, open the bonus: evaluator library → **Detect conversation signals**, test on one or two examples, save.

## Watch for

- Re-running a section's seed, or running the topics seed again to fill error analysis or capturing signals. Each run mints new trace IDs.
- Treating dashboards as a configuration step. The overview only points at them.
- Skipping the reading in error analysis and jumping straight to evaluator templates.
- Starting Topics with empty model dropdowns. Those lists are the project's LLM connections.
- Clicking **Start analyzing** when the review still says there are no traces in the last 7 days.
- Accidentally choosing **Out-of-Scope Request** instead of **Detect User Disagreement**. Out-of-Scope Request's first variable is `system_prompt`.
- Selecting a child generation instead of the root agent observation. The evaluator only receives the observation it targets.
- Mapping `conversation_history` to a single message, or `last_user_message` to every message.
- Clicking **Create evaluator** and not **Execute**, which leaves the live evaluator inactive.
- Expecting scores on the seeded traces immediately after Execute. New turns are the check.
- Treating the all-caps score as proof of anger. Frame it as a triage signal.
