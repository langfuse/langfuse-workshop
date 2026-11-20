---
title: "Workshop: Instructor Notes for Monitoring"
description: "Facilitator notes for the monitoring overview, error analysis, topics, and the disagreement and all-caps signal evaluators."
---

# 04 Monitoring

Learner guide: [04 Monitoring](../learner/04-monitoring.md)

- [4.1 Error analysis](../learner/04-monitoring/error-analysis.md)
- [4.2 Detect topics and issues](../learner/04-monitoring/topics.md)
- [4.3 Capturing signals](../learner/04-monitoring/capturing-signals.md)

## Instructor notes

The chapter opens on the overview and goes straight into the four ways to work with production traces. There is no checkout block on that page. Dashboards are a link out, not a build exercise. Sections 4.1 Error analysis, 4.2 Detect topics and issues, and 4.3 Capturing signals each have their own page.

Each section seeds its own traces. Do not seed once on the overview for all three.

Demo order:

1. Error analysis, on its own 20 traces, while the room still has to read them.
2. Topics, on the 200 traces that section seeds.
3. Capturing signals, so the two evaluators are the last thing they turn on.

### 4.1 Error analysis

- Section 4.1 seeds its own 20 traces with `npm run langfuse:seed:error-analysis`. Seven are ordinary one-turn answers. The other 13 each have exactly one failure: 5 out-of-scope replies (a recipe, investment advice, or laptop support), 2 replies in a family voice, 2 replies where Dad asks who this is and the agent says "I'm your kid.", and 4 long unstructured replies. The family voice still gives the right steps. It never says "I am your kid." The tell is personal knowledge, such as having used this phone before. The two identity replies are the obvious version of that same failure. Longer sessions are two or three turns, and the failure is only on the latest answer. Do not substitute the topics snapshot.
- The queue is created with **open coding** (Text) and **pass/fail** (Categorical: pass and fail). Select the last 20 traces, tagged `error-analysis-seed`. A queue does not pick up score configs added later.
- `npm run langfuse:seed:error-analysis:annotations` fills that queue for a demo. It adds the tagged root observations, writes an open-coding note and a pass or fail mark on each, and marks those items completed. The notes describe the reply and do not name the clusters. Learners still write their own notes in the lab. Running it again updates the same scores.
- Do not hand them the cluster names before they have written the open-coding notes. After the set, they ask Halo to find clusters. The expected names (out of scope, impersonation, and lengthy responses) are in a collapsed block on the page. That list is a check, not the Halo prompt. They judge each trace against three expectations: structured and easy to follow, phone IT support only, and the agent talks about itself as an AI agent.
- Ask Halo to create categorical scores for the clusters it found. If Halo words them differently, map those names to the three decisions before the second pass. They then assign each failing trace.
- Halo builds the frequency dashboard. The page shows the shape: one bar per failure category, and the longest bar is the failure that shows up most often. The picture is the layout, not the counts from this 20-trace lab.
- Open with why the lab is worth doing: concrete failures from real cases, an underspecified system prompt, a count you can prioritize, and a shared picture for engineers, domain experts, and PMs.
- Close on the categories and what to do about them, then the more specific prompt. Out of scope: a friendly decline that points Dad back to iPhone help, plus a production monitor. Impersonation: the agent answers as the support agent, including when Dad asks who this is, with optional monitoring. Lengthy responses: short numbered steps, with an optional production monitor. Then read the Rules section: a short numbered list, a refusal for anything other than IT help, clear instructions on what to tap, and a line that the agent does not speak as family. Do not publish it in this lab. Then one line into topics.

### 4.2 Detect topics and issues

- This is a configuration-and-reading walkthrough, not a fixed setup wizard. Open Topics, click **Edit map**, enable Intent, Sentiment, Outcome, and Issues, leave the trace filter broad enough for the seeded traces, keep live updates enabled, leave the sample rate at 100%, and save the map. Do not assume every project map has all four facets.
- The section seeds 200 traces over the last five days with `npm run langfuse:seed:topics`: 110 ordinary iPhone requests at one to three turns, 60 laptop requests split evenly between a printer-and-paper cluster and a laptop Wi-Fi cluster, and 30 two- or three-turn sessions where Dad says the steps failed and Specs repeats the same list. The laptop wording varies. Each laptop answer says the steps depend on which laptop it is, then gives a Windows way and an Apple way. At least 40% of the traces have Dad sounding frustrated, mostly on the unresolved ones. A few are all caps, and a few disagree with the steps. Each trace carries at most one of those problems.
- Land the insights in this order. First, walk the enabled facets as a map of how the system is used in production: classes of requests, how they felt, where they ended, and what went wrong. Some groups show the product working. On Intent, investigate laptop Wi-Fi and printing as missing context; open representative traces and point out that the agent hedges between Windows and Apple instead of using Dad's device context. On Sentiment, connect unresolved Wi-Fi conversations, all-caps lines, and pushback such as "No, that menu isn't there" to the next section's disagreement and all-caps signals. On Issues, investigate repeated failed troubleshooting as a possible prompt fix, and mismatched searches as a possible help-library coverage question. Do not patch or publish a prompt in this lab. Labels and counts vary because the groups are model-generated; ask learners to validate each hypothesis in Tracing.
- Add the OpenAI connection in this section, before **Edit map**. Capturing signals reuses that connection and only picks **5.6 Luna**.
- Topics uses a recent time window, and new traces can take about 5 minutes after their last activity to appear. If the matching-trace count is empty, do not save an empty map; check the seed, filter, and time window first.
- After analysis fills in, compare Treemap and Scatter, try the **Unassigned** toggle, click one tile on each enabled facet, and use **Open in Tracing**. Topic names and counts are nondeterministic.
- The page opens with why: Topics is a map of what the agent handles in production, how users feel, and where it fails. The facets are a starting point: expansion opportunities, things that look like failures but point at a change to the system, and inspiration for which evaluators to set up. After the four insights, hand off to capturing signals.

### 4.3 Capturing signals

- Two signals: **Detect User Disagreement** uses LLM-as-a-judge, and **Detect User Frustration (ALL CAPS)** uses deterministic TypeScript.
- The API keys in `.env` do not configure the judge model inside Langfuse. The disagreement evaluator needs the LLM connection.
- Both evaluators target the logical root `dad-it-support-chat-turn` agent observation, because that observation carries the conversation input and the final answer.
- The disagreement judge should run on **5.6 Luna** (`gpt-5.6-luna`) from the OpenAI connection.
- Have learners use the right-side sample panel, filtered to `production`. In **Map variables to data**, bind variables with **Use** on the observation tree: `conversation_history` on **Input → messages**, `last_user_message` on **Input → messages → last**. Do not have them type a JSONPath. Test before saving.
- `{{system_prompt}}` belongs to **Detect Out-of-Scope Request**. This section maps `conversation_history` on **Detect User Disagreement**.
- After **Create evaluator**, review filters, estimated weekly volume and cost, and sampling rate, then click **Execute**.
- Execute scores observations that arrive afterwards. Traces already in the project are the mapping sample, not an automatic backfill. The two chat turns in Verify are what should light up. Historical scoring is batch evaluation, and re-running a seed is the wrong way to get scores.
- The ALL-CAPS template is there to show a deterministic signal that needs no model call.
- After the two live turns, they can ask Halo to chart the conversation signals. Stay on a page Halo can use as context, open the **Dashboard** tab, and ask for a dashboard of the signals they evaluate. The page shows one result: a chart per score over the past week.
- The bonus is optional. In the evaluator library, **Detect conversation signals** is a decision-model template: one call scores several conversation signals at once. Have them test one or two examples and save. Do not replace the disagreement judge or the all-caps evaluator with it. There is no screenshot of that template yet.

## Demo rhythm

1. Walk the overview: volume, dashboards, error analysis, topics, signals. Each way has one screenshot: the home dashboard, failure categories, the Topics map, and conversation signals. Open the dashboards docs only long enough to show where cost and latency aggregates live, and say why those fields have to be on the trace.
2. Error analysis: run `npm run langfuse:seed:error-analysis` once, queue the last 20 with open coding (Text) and pass/fail (Categorical), mark pass or fail, write the notes, ask Halo to find clusters, compare them with the rough list on the page, ask Halo to create categorical scores for those clusters, assign them on a second pass, ask Halo for the frequency dashboard, then land the three decisions and read the more specific prompt under them. Do not publish it in this lab. Point to topics.
3. Topics: add the OpenAI connection, run that section's seed once, open Topics, use **Edit map** to enable the four facets, leave the filter broad and sampling at 100%, and save. Compare Treemap and Scatter, then use **Open in Tracing** to inspect representative traces. Investigate laptop printing as missing context, frustration as a lead-in to disagreement and all-caps scores, repeated failed troubleshooting as a prompt fix, and mismatched searches that did not change the answer. The exact labels and counts vary. After the four insights, hand off to capturing signals.
4. Capturing signals: the OpenAI connection is already in place from Topics. Pick **5.6 Luna**, create **Detect User Disagreement** on a production root observation, map both variables, test, create, and execute.
5. Create **Detect User Frustration (ALL CAPS)** on the same root, test, create, and execute.
6. Send one disagreement turn and one ALL-CAPS turn. In **Tracing**, filter by the evaluator score to find them. If time remains, ask Halo on the **Dashboard** tab to chart those signals over time.
7. If time remains, open the bonus: evaluator library → **Detect conversation signals**, test on one or two examples, save.

## Watch for

- Re-running a section's seed, or running the topics seed again to fill error analysis or capturing signals. Each run mints new trace IDs.
- Treating the overview's dashboard link as a configuration step. The signals section is where Halo builds a chart of the scores.
- Skipping the reading in error analysis and jumping straight to evaluator templates.
- Saving a map with an empty matching-trace count. Check the seed, filter, and recent time window first.
- Treating a **PAUSED** map as if it were analyzing live traffic.
- Accidentally choosing **Out-of-Scope Request** instead of **Detect User Disagreement**. Out-of-Scope Request's first variable is `system_prompt`.
- Selecting a child generation instead of the root agent observation. The evaluator only receives the observation it targets.
- Mapping `conversation_history` to a single message, or `last_user_message` to every message.
- Clicking **Create evaluator** and not **Execute**, which leaves the live evaluator inactive.
- Expecting scores on the seeded traces immediately after Execute. New turns are the check.
- Treating the all-caps score as proof of anger. Frame it as a triage signal.
