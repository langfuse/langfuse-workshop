---
title: "Workshop: Instructor Notes for Monitoring"
description: "Facilitator notes for the monitoring chapter, including judge-based and code-based evaluator targets, variable mapping, and debugging first results."
---

# 04 Monitoring

Learner guide: [04 Monitoring](../learner/04-monitoring.md)

## Instructor notes

- This is a UI-first chapter with two signals: **Detect User Disagreement** uses LLM-as-a-judge for semantic judgment, while **Detect User Frustration (ALL CAPS)** uses deterministic TypeScript logic.
- Before the disagreement evaluator, confirm the project has **Project Settings → LLM Connections** configured. The API keys in `.env` do not configure the judge model inside Langfuse.
- Both evaluators target the logical root `dad-it-support-chat-turn` agent observation because that observation carries the overall conversation input and final answer.
- Have learners use the right-side sample panel instead of mapping from memory: select a root observation, map `conversation_history` to all input messages and `last_user_message` to the last input message, then test the evaluator before saving.
- `{{system_prompt}}` is the system-prompt variable on **Detect Out-of-Scope Request**. The disagreement mapping in this chapter is `conversation_history`.
- After **Create evaluator**, review the configured filters, estimated weekly volume and cost, and sampling rate before clicking **Execute**. That final action activates the evaluator for matching incoming observations.
- The ALL-CAPS template is already implemented as a TypeScript code evaluator. Use it to show why deterministic signals do not need an LLM call or an evaluator-model connection.
- Close with seeding: `npm run langfuse:seed:otel:no-scores` adds realistic `production` traffic without pre-baked scores, so the learners' own evaluators produce the results. Remind learners that the command is not idempotent; every rerun creates duplicate traces.
- Use the first few evaluator results as a debugging exercise, not just a pass/fail check.

## Demo rhythm

1. Confirm or configure the project's default evaluator model.
2. Create **Detect User Disagreement**, select a sample root observation, map both variables through the data tree, run a test, then create and execute the evaluator.
3. Create **Detect User Frustration (ALL CAPS)** on the same root observation, run a test, then create and execute it.
4. Send one disagreement turn and one ALL-CAPS turn, then in **Tracing** filter by the evaluator score (Boolean Scores → evaluator name → equals → true/false) to find the flagged traces.
5. Seed production traffic with `npm run langfuse:seed:otel:no-scores`, refresh the Tracing view, and watch the two evaluators score the seeded batch.

## Watch for

- Accidentally choosing **Out-of-Scope Request** or another gallery template instead of **Detect User Disagreement**. Out-of-Scope Request's first variable is `system_prompt` (the system prompt on a generation). This chapter maps `conversation_history` on **Detect User Disagreement**, plus the ALL-CAPS code evaluator.
- Treating the Langfuse API keys from `.env` as enough for evaluators. Judge-based evaluators also need the Langfuse-side LLM connection.
- Selecting a child generation instead of the root agent observation. The evaluator only receives data from the observation it targets; it does not automatically read sibling or child observations.
- Mapping `conversation_history` to a single message, or `last_user_message` to every message. Use the live sample tree: **Input → messages** and **Input → messages → last**.
- Forgetting to select a sample observation before testing. The right panel can be filtered with the preset buttons or **Ask AI**.
- Clicking **Create evaluator** but not **Execute** in the saved-evaluator dialog, which leaves the live evaluator inactive.
- Learners assuming the all-caps score is a guarantee of anger. Frame it as a triage signal, not a verdict.
- Running the seed command more than once. It generates fresh trace IDs and duplicates the seeded traffic.
