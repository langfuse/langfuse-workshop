---
title: "Workshop: Instructor Notes for Monitoring"
description: "Facilitator notes for the monitoring overview, error analysis, and the disagreement and all-caps signal evaluators."
---

# 04 Monitoring

Learner guide: [04 Monitoring](../learner/04-monitoring.md)

- [4.1 Error analysis](../learner/04-monitoring/error-analysis.md)
- [4.2 Capturing signals](../learner/04-monitoring/capturing-signals.md)

## Instructor notes

The chapter opens on the overview and goes straight into the three ways to work with production traces. There is no checkout block on that page. Dashboards are a link out, not a build exercise. Sections 4.1 Error analysis and 4.2 Capturing signals each have their own page.

Error analysis seeds its own traces. Do not seed on the overview.

Demo order:

1. Error analysis, on its own 20 traces, while the room still has to read them.
2. Capturing signals, so the two evaluators are the last thing they turn on. Learners add the model connection in this section: gateway key plus gateway base URL, or an OpenAI key with the base URL left blank.

### 4.1 Error analysis

- Section 4.1 seeds its own 20 traces with `npm run langfuse:seed:error-analysis`. Seven are ordinary one-turn answers. The other 13 each have exactly one failure: 5 out-of-scope replies (a recipe, investment advice, or laptop support), 2 replies in a family voice, 2 replies where Dad asks who this is and the agent says "I'm your kid.", and 4 long unstructured replies. The family voice still gives the right steps. It never says "I am your kid." The tell is personal knowledge, such as having used this phone before. The two identity replies are the obvious version of that same failure. Longer sessions are two or three turns, and the failure is only on the latest answer.
- The queue is created with **open coding** (Text) and **pass/fail** (Categorical: pass and fail). Select the last 20 traces, tagged `error-analysis-seed`. A queue does not pick up score configs added later.
- `npm run langfuse:seed:error-analysis:annotations` fills that queue for a demo. It adds the tagged root observations, writes an open-coding note and a pass or fail mark on each, and marks those items completed. The notes describe the reply and do not name the clusters. Learners still write their own notes in the lab. Running it again updates the same scores.
- Do not hand them the cluster names before they have written the open-coding notes. After the set, they ask Halo to find clusters. The expected names (out of scope, impersonation, and lengthy responses) are in a collapsed block on the page. That list is a check, not the Halo prompt. They judge each trace against three expectations: structured and easy to follow, phone IT support only, and the agent talks about itself as an AI agent.
- Ask Halo to create categorical scores for the clusters it found. If Halo words them differently, map those names to the three decisions before the second pass. They then assign each failing trace.
- Halo builds the frequency dashboard. The page shows the shape: one bar per failure category, and the longest bar is the failure that shows up most often. The picture is the layout, not the counts from this 20-trace lab.
- Open with why the lab is worth doing: concrete failures from real cases, an underspecified system prompt, a count you can prioritize, and a shared picture for engineers, domain experts, and PMs.
- Close on the categories and what to do about them, then the more specific prompt. Out of scope: a friendly decline that points Dad back to iPhone help, plus a production monitor. Impersonation: the agent answers as the support agent, including when Dad asks who this is, with optional monitoring. Lengthy responses: short numbered steps, with an optional production monitor. Then read the Rules section: a short numbered list, a refusal for anything other than IT help, one clarifying question when the request is vague, clear instructions on what to tap, and a line that the agent does not speak as family. Do not publish it in this lab; learners publish it in 07 as the comparison against the baseline experiment. Then one line into capturing signals.

### 4.2 Capturing signals

- Two signals: **Detect User Disagreement** uses LLM-as-a-judge, and **Detect User Frustration (ALL CAPS)** uses deterministic TypeScript.
- The API keys in `.env` do not configure the judge model inside Langfuse. Learners add the model connection in this section before they pick **5.6 Luna**. When `LANGFUSE_GATEWAY_KEY` is set, the connection API key is that gateway key and **API Base URL** is the gateway OpenAI route (`https://gateway.cloud.langfuse.com/openai/v1` on EU Cloud). When only `OPENAI_API_KEY` is set, paste that key and leave **API Base URL** blank. When both are set, use the gateway key and the gateway base URL. Leave **Use Responses API** off.
- Both evaluators target the logical root `dad-it-support-chat-turn` agent observation, because that observation carries the conversation input and the final answer.
- The disagreement judge should run on **5.6 Luna** (`gpt-5.6-luna`) from that connection.
- Have learners use the right-side sample panel, filtered to `production`. In **Map variables to data**, bind variables with **Use** on the observation tree: `conversation_history` on **Input → messages**, `last_user_message` on **Input → messages → last**. Do not have them type a JSONPath. Test before saving.
- `{{system_prompt}}` belongs to **Detect Out-of-Scope Request**. This section maps `conversation_history` on **Detect User Disagreement**.
- After **Create evaluator**, review filters, estimated weekly volume and cost, and sampling rate, then click **Execute**.
- Execute scores observations that arrive afterwards. Traces already in the project are the mapping sample, not an automatic backfill. The two chat turns in Verify are what should light up. Historical scoring is batch evaluation, and re-running a seed is the wrong way to get scores.
- The ALL-CAPS template is there to show a deterministic signal that needs no model call.
- After the two live turns, they can ask Halo to chart the conversation signals. Stay on a page Halo can use as context, open the **Dashboard** tab, and ask for a dashboard of the signals they evaluate. The page shows one result: a chart per score over the past week.
- The bonus is optional. In the evaluator library, **Detect conversation signals** is a decision-model template: one call scores several conversation signals at once. Have them test one or two examples and save. Do not replace the disagreement judge or the all-caps evaluator with it. There is no screenshot of that template yet.

## Demo rhythm

1. Walk the overview: volume, dashboards, error analysis, signals. Each way has one screenshot: the home dashboard, failure categories, and conversation signals. Open the dashboards docs only long enough to show where cost and latency aggregates live, and say why those fields have to be on the trace.
2. Error analysis: run `npm run langfuse:seed:error-analysis` once, queue the last 20 with open coding (Text) and pass/fail (Categorical), mark pass or fail, write the notes, ask Halo to find clusters, compare them with the rough list on the page, ask Halo to create categorical scores for those clusters, assign them on a second pass, ask Halo for the frequency dashboard, then land the three decisions and read the more specific prompt under them. Do not publish it in this lab. Point to capturing signals.
3. Capturing signals: add the model connection, pick **5.6 Luna**, create **Detect User Disagreement** on a production root observation, map both variables, test, create, and execute.
4. Create **Detect User Frustration (ALL CAPS)** on the same root, test, create, and execute.
5. Send one disagreement turn and one ALL-CAPS turn. In **Tracing**, filter by the evaluator score to find them. If time remains, ask Halo on the **Dashboard** tab to chart those signals over time.
6. If time remains, open the bonus: evaluator library → **Detect conversation signals**, test on one or two examples, save.

## Watch for

- Re-running the error-analysis seed. Each run mints new trace IDs.
- Treating the overview's dashboard link as a configuration step. The signals section is where Halo builds a chart of the scores.
- Skipping the reading in error analysis and jumping straight to evaluator templates.
- Starting the disagreement judge with an empty model list. That list is the project's LLM connections.
- Accidentally choosing **Out-of-Scope Request** instead of **Detect User Disagreement**. Out-of-Scope Request's first variable is `system_prompt`.
- Selecting a child generation instead of the root agent observation. The evaluator only receives the observation it targets.
- Mapping `conversation_history` to a single message, or `last_user_message` to every message.
- Clicking **Create evaluator** and not **Execute**, which leaves the live evaluator inactive.
- Expecting scores on the seeded traces immediately after Execute. New turns are the check.
- Treating the all-caps score as proof of anger. Frame it as a triage signal.
