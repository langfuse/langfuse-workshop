---
title: "Workshop: Instructor Notes for Setup"
description: "Facilitator notes for setup: keep learners on the checkpoint, verify local ports and credentials, and prepare Langfuse evaluator configuration."
---

# 00 Setup

Learner guide: [00 Setup](../learner/00-setup.md)

## Instructor notes

- Use `checkpoint/00-setup` as the stable base-app checkout. It should be equivalent to `checkpoint/01-base-app`, not the complete reference app.
- `main` contains the complete reference implementation, but learners should use the checkpoint so setup and base-app orientation share the same starting state.
- Make learners confirm both URLs: Vite on `127.0.0.1:3333`, Express on `127.0.0.1:8787`.
- Emphasize the EU Langfuse host value: `LANGFUSE_BASE_URL=https://cloud.langfuse.com`.
- Have learners configure **Project Settings → LLM Connections** and save a default evaluator model before the monitoring chapter. LLM-as-a-judge evaluators will otherwise stop at the "No default model set" screen.
- Keep key handling explicit: real API keys go only into `.env` or Langfuse secret fields, never into shared transcripts, notes, or chat.
- After one successful chat turn, have learners switch to `checkpoint/02-tracing` for the first build step.

## Watch for

- Missing `.env` values. The app may render while model calls fail.
- Missing Langfuse LLM connection or default evaluator model. The app can run and trace correctly while LLM-as-a-judge setup is still blocked.
- People expecting traces on `checkpoint/00-setup` or `checkpoint/01-base-app`. Both are intentionally untraced; tracing starts only after the `02-tracing` edits.
- People staying on `main` for tracing. `main` is already the finished reference implementation.
