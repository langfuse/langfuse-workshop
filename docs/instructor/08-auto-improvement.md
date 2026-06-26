---
title: "Workshop: Instructor Notes for The self-healing loop"
description: "Facilitator notes for handing the production-improvement loop to a coding agent with CLI/MCP access to Langfuse — and supervising it."
---

# 08 The self-healing loop

Learner guide: [08 The self-healing loop](../learner/08-auto-improvement.md)

## Instructor notes

- This is the synthesis module, with a twist: the loop is the same as module 07, but a **coding agent** drives it. Frame it as "everything we built is a machine-readable surface an agent can now operate."
- The shift to teach is from *doing* to *supervising*: the learner gives access, hands over the symptom, and approves the outward-facing step. Make that role change explicit.
- Make the handoff visible: say what the learner would do manually, then point out that the agent is doing that work and the learner only needs to review, confirm, and decide at the handoff points.
- On `main`, the repo may already contain the finished module-08 prompt/evaluator implementation. If you want the live coding step to match the learner story, have people actually check out `checkpoint/07-evaluation` first.
- **Start from the complaint, handed to the agent.** Say the line — "high volume of follow-up questions" — and have the agent decide what to query. Don't pre-translate it into a score name.
- The win is autonomy with guardrails: investigation is read-only and safe to let run; promoting a prompt to `production` needs human approval. Demo both halves.
- The "aha" is the same as the manual version — the agent discovers the model *already knows the fix* (it gives find-the-app steps reactively) — but here the agent surfaces it from the traces itself.
- Insist the agent shows its evidence: the user→answer→follow-up table across ≥3 topics before naming a cause. "Trust but verify" is the whole lesson.

## Demo rhythm

1. Wire access live: confirm `.env` keys / MCP server, then have the learner paste the install prompt: "Please install the `langfuse` skill from `https://github.com/langfuse/skills/tree/main/skills/langfuse`." Point out that the issue-triage + improvement-loop playbooks live inside that single skill.
2. Use a project that already has suitable traffic. For workshop orgs, preload the committed production-trace seed bundle ahead of time with `npm run langfuse:seed` so learners start from realistic traces without spending live time generating synthetic traffic.
3. Paste the one-line complaint and let the agent run. Make sure it is reading the real app traces, not the `langfuse-llm-as-a-judge` evaluator traces or the `dataset-runner` experiment traces.
4. Keep Langfuse open while it runs. Refresh Traces/Scores so the learner can watch the same evidence the agent is reading.
5. Read what it did: aggregated scores, filtered app traces, the follow-up table, the named cause.
6. Review the proposed prompt rule together — is it minimal, evidence-backed, and published to `candidate`, not `production`?
7. Keep Dataset → Runs open while the agent reruns `production` and `candidate`, refresh until the scores land, and review any per-item dips before discussing promotion. The terminal stays quiet for most of each `dataset:run`, so set that expectation before learners assume the script is stuck.

## Watch for

- Agents counting LLM-judge evaluator traces as app traces — they share the lists; filter by tag/name/userId.
- An agent promoting to `production` without pausing for approval — that's a setup smell; the read/write split should be enforced.
- Republishing without matching the live variant, silently reverting tone rules.
- Agents comparing aggregate scores only and skipping the per-item dips — that misses the whole lesson.
- Accepting a cause from a single trace — push back, demand the pattern.
- Stopping at the fix and skipping the regression cases.

## Connect to the skills

- `langfuse` is the only skill this module needs. Use its issue-detection triage playbook for Part 1 and its improvement-loop playbook for Part 2.
- `langfuse` gives the agent CLI/MCP mechanics for scores, traces, prompts, datasets, and experiment comparisons.

Close by noting this is how the loop scales past one engineer: the surface stays human-readable for debugging, but an agent can operate it for routine improvement.
