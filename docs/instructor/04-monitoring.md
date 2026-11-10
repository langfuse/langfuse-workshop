---
title: "Workshop: Instructor Notes for Monitoring"
description: "Facilitator notes for the monitoring overview, error analysis, topics, and the disagreement and all-caps signal evaluators."
---

# 04 Monitoring

Learner guide: [04 Monitoring](../learner/04-monitoring.md)

- [4.1 Error analysis](../learner/04-monitoring/error-analysis.md)
- [Topics and issues](../learner/04-monitoring/topics.md)
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
- Do not hand them the cluster names before they have written the open-coding notes. After the set, they ask Halo to find clusters. The page shows what those clusters should roughly look like: out of scope, impersonation, and lengthy responses. That list is a check, not the Halo prompt.
- Ask Halo to create categorical scores for the clusters it found. If Halo words them differently, map those names to the three decisions before the second pass. They then assign each failing trace.
- Halo builds the frequency dashboard. How that dashboard should look is still a TODO.
- Close on the three decisions. Out of scope: a friendly decline that points Dad back to iPhone help, plus a production monitor. Impersonation: a system-prompt fix so Specs answers as the support agent. Lengthy responses: a system-prompt fix toward short numbered steps, with an optional production monitor.

### Topics and issues

- This is a setup walkthrough, not a concept lecture. Open Topics, click **Set up topics**, keep Intent, Sentiment, Outcome, and Issues checked, keep the recommended models, leave the sample rate at 100%, and click **Start analyzing**.
- The section seeds 200 traces over the last five days with `npm run langfuse:seed:topics`: 130 ordinary iPhone requests at one to three turns, 40 laptop requests split between a printer-and-paper cluster and a laptop Wi-Fi cluster, and 30 two- or three-turn sessions where Dad says the steps failed and Specs repeats the same list. The laptop wording varies. Each laptop answer says the steps depend on which laptop it is, then gives a Windows way and an Apple way. Each trace carries at most one of those problems.
- The two findings to land: the laptop printer and laptop Wi-Fi groups under Intent are an in-scope gap, fixed by adding the laptop to `DEFAULT_SUPPORT_CONTEXT`; the stuck follow-ups under Issues are a failure mode, fixed with a system-prompt rule to ask what Dad sees and try a different path.
- The model dropdowns are the project's LLM connections. If you demo Topics before capturing signals, add the OpenAI connection first or the pickers are empty.
- The review step says Topics need about 100 traces and that new traces show up about 5 minutes after their last activity. Seed before the demo. If the review says there are no traces in the last 7 days, do not start analyzing on an empty window.
- After it fills in, click one tile on each tab (Intent, Sentiment, Outcome, Issues) and use **Open in Tracing**. Auto-analyze stays on.

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
2. Error analysis: run `npm run langfuse:seed:error-analysis` once, queue the last 20 with open coding (Text) and pass/fail (Categorical), mark pass or fail, write the notes, ask Halo to find clusters, compare them with the rough list on the page, ask Halo to create categorical scores for those clusters, assign them on a second pass, ask Halo for the frequency dashboard, then land the three decisions: friendly out-of-scope decline plus a production monitor, a system-prompt fix for impersonation, and a system-prompt fix for lengthy replies with an optional production monitor.
3. Topics: run that section's seed once, open Topics, run **Set up topics** with all four labels and the recommended models, then open one tile on each tab. Finish on the laptop printer and laptop Wi-Fi intents, and the stuck follow-up issue.
4. Capturing signals: configure the LLM connection if it is not done, create **Detect User Disagreement** on a production root observation, map both variables, test, create, and execute.
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
