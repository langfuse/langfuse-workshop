---
title: "Workshop: Instructor Notes for Tracing"
description: "Facilitator notes for teaching Langfuse tracing in three layers: OpenAI generations, one agent root, and tool observations."
---

# 02 Tracing

Learner guide: [02 Tracing](../learner/02-tracing.md)

## Instructor notes

- Teach the progression in three visible layers: OpenAI generations, one agent root, then tool observations.
- Keep the code changes small and local. The point is to show that Langfuse wraps existing app boundaries instead of forcing an architecture rewrite.
- The user/session propagation section is optional live, but later checkpoints include it so the following chapters have attribution available.

## Demo rhythm

1. Add `LangfuseSpanProcessor` and `observeOpenAI`, run one turn, show separate generation traces.
2. Wrap `runSupportConversationInner` with `observe(...)`, run again, show nested generations.
3. Wrap the two local tool helpers, run again, show the full tree.

## Watch for

- An occasional blank parent container around `dad-it-support-chat-turn` right after Step 2. Refresh once before treating it as a code bug; if it persists every turn, check for accidental extra tracing wrappers beyond the single `observe(...)` in the lesson.
- Learners wrapping the OpenAI client in a separate factory. The workshop intentionally keeps the wrapper inline.
- Learners pasting the Step 3 block above the existing `executeTool` instead of replacing it. The server exits with `Multiple exports with the same name "executeTool"`; the leftover copy is further down `tools.ts`.
- Missing shutdown flush in `index.ts`; traces can arrive late without it.
