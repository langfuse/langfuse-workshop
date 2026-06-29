---
title: "Workshop: Instructor Notes for Monitoring"
description: "Facilitator notes for the monitoring chapter, including judge-based and code-based evaluator targets, variable mapping, and debugging first results."
---

# 04 Monitoring

Learner guide: [04 Monitoring](../learner/04-monitoring.md)

## Instructor notes

- This is still a UI-first chapter, but it now mixes two evaluator types: LLM-as-a-judge for semantic signals and a code evaluator for a deterministic frustration signal.
- Before the first evaluator, confirm the project has **Project Settings → LLM Connections** configured and a default evaluator model saved. Fresh projects otherwise show "No default model set" before learners can pick the published templates.
- Explain why the two monitors target different observations: out-of-scope needs the system prompt on the generation, while disagreement needs the conversation history on the agent root.
- Explain why the all-caps monitor is code-based: no model call is needed when a simple deterministic rule is enough.
- Use the first few evaluator results as a debugging exercise, not just a pass/fail check.

## Demo rhythm

1. Configure Out-of-Scope Request on final generation observations.
2. Configure User Disagreement on the `dad-it-support-chat-turn` agent observation.
3. Configure the all-caps code evaluator on the same `dad-it-support-chat-turn` agent observation.
4. Send one clean in-scope turn, one out-of-scope turn, one disagreement turn, and one all-caps turn.

## Watch for

- Accidentally choosing the wrong template for User Disagreement.
- Treating the Langfuse API keys from `.env` as enough for evaluators. Judge-based evaluators also need the Langfuse-side LLM connection.
- Mapping `last_user_message` to the last transcript item on a final generation; final generations include tool messages after the user turn.
- For the all-caps signal, prefer the Python version in the learner docs rather than fighting the TypeScript editor.
- Learners assuming the all-caps score is a guarantee of anger. Frame it as a triage signal, not a verdict.
