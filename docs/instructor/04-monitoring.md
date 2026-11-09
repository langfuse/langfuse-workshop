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

Seed once, from the overview, before any of the three sections. `npm run langfuse:seed:otel:no-scores` loads realistic `production` traffic with no pre-baked scores. It is not idempotent. Every rerun creates a duplicate set of traces.

Demo order after the seed:

1. Error analysis, while the traces are still unscored and the room has to read them.
2. Topics, for the aggregate view of intents and issues on that same batch.
3. Capturing signals, so the two evaluators are the last thing they turn on.

### Error analysis

- Section 4.1 is the annotation-queue pass: open coding and pass/fail on 10 to 15 `production` traces, then cluster, name the groups, label frequencies, and decide whether to fix each category or turn it into an evaluator.
- Create the score configs before the queue. A queue does not pick up score configs added later. The category label is a new categorical config after the clusters have names.
- The sample problem is still open. The seeded batch is mostly successful turns, so a random 10 to 15 can contain no failures. Do not pretend there is a selection method until there is one. Until then, steer the room toward the seeded edge cases (all caps, disagreement, out of scope) when the random slice is too clean.
- Do not hand them the cluster names before they have written the open-coding notes.

### Topics and issues

- Intent is what Dad was trying to do. Issues is the principal mistake, grouped across different asks. Sentiment and outcome can stay in the background.
- Topics needs the project's LLM connection plus an embedding model. If you will open Topics before capturing signals, set **Project Settings → LLM Connections** first. Capturing signals Step 0 is the same connection.
- Confirm **Topics** is in the sidebar before the demo. If the project does not have it, explain the intent and issue views from the page and move on. Error analysis and capturing signals do not depend on it.
- Prefer the first-run flow. The manual path is **Process traces** on `production`, then **Update topics**. Summaries without an update are not a map yet.

### Capturing signals

- Two signals: **Detect User Disagreement** uses LLM-as-a-judge, and **Detect User Frustration (ALL CAPS)** uses deterministic TypeScript.
- The API keys in `.env` do not configure the judge model inside Langfuse. The disagreement evaluator needs the LLM connection.
- Both evaluators target the logical root `dad-it-support-chat-turn` agent observation, because that observation carries the conversation input and the final answer.
- Have learners use the right-side sample panel, filtered to `production`: map `conversation_history` to all input messages and `last_user_message` to the last input message, then test before saving.
- `{{system_prompt}}` belongs to **Detect Out-of-Scope Request**. This section maps `conversation_history` on **Detect User Disagreement**.
- After **Create evaluator**, review filters, estimated weekly volume and cost, and sampling rate, then click **Execute**.
- Execute scores observations that arrive afterwards. The seeded batch is the mapping sample, not an automatic backfill. The two chat turns in Verify are what should light up. Historical scoring is batch evaluation, and re-running the seed is the wrong way to get scores.
- The ALL-CAPS template is there to show a deterministic signal that needs no model call.

## Demo rhythm

1. Walk the overview: volume, dashboards, error analysis, topics, signals. Open the dashboards docs only long enough to show where cost and latency aggregates live, and say why those fields have to be on the trace.
2. Run `npm run langfuse:seed:otel:no-scores` once. Open **Tracing**, filter to `production`, and show the batch.
3. Error analysis: create the open-coding and pass/fail configs, queue 10 to 15 production traces, mark pass or fail, write the failures, then cluster and name them in the room.
4. Topics: set models if needed, run the first-run flow, then open one intent group and one issue group and a trace in each.
5. Capturing signals: configure the LLM connection if it is not done, create **Detect User Disagreement** on a production root observation, map both variables, test, create, and execute.
6. Create **Detect User Frustration (ALL CAPS)** on the same root, test, create, and execute.
7. Send one disagreement turn and one ALL-CAPS turn. In **Tracing**, filter by the evaluator score to find them.

## Watch for

- Re-running the seed. It mints new trace IDs and duplicates the batch.
- Treating dashboards as a configuration step. The overview only points at them.
- Skipping the reading in error analysis and jumping straight to evaluator templates.
- Opening Topics in a project where the nav item is absent, or starting it with no LLM connection and no embedding model.
- Accidentally choosing **Out-of-Scope Request** instead of **Detect User Disagreement**. Out-of-Scope Request's first variable is `system_prompt`.
- Selecting a child generation instead of the root agent observation. The evaluator only receives the observation it targets.
- Mapping `conversation_history` to a single message, or `last_user_message` to every message.
- Clicking **Create evaluator** and not **Execute**, which leaves the live evaluator inactive.
- Expecting scores on the seeded traces immediately after Execute. New turns are the check.
- Treating the all-caps score as proof of anger. Frame it as a triage signal.
