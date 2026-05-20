# 08 Wrap-up

## Starting point

```bash
git checkout checkpoint/07-prompt-iteration
```

You have walked through every loop step.

## What you should be able to do now

- Trace an LLM app end-to-end and read the result as a debugging surface.
- Connect prompts to traces so a prompt change has a measurable next-trace effect.
- Detect interesting production behavior (out-of-scope, disagreement) automatically.
- Turn product scope into a starter dataset of realistic examples.
- Run experiments on the same agent code with no parallel implementation.
- Compare runs after a prompt change and decide what's better — by score and by reading individual outputs.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Bigger picture

Langfuse in this workshop is a *shared surface*, not just observability:

- understanding behavior — every interaction is inspectable
- collecting representative examples — production seeds datasets
- comparing changes — every prompt or code change has a baseline
- improving systems continuously — the loop closes back on itself

## Good closing questions

- What did tracing reveal that was invisible before?
- Which production events would you monitor first in your own app?
- What would you add to the starter dataset next?
- What change would you test after the first prompt iteration?
- Where in your real app would the `/langfuse` skill have saved you the most hand-rolling?

## Next steps

1. Install the **Langfuse Claude Code skill** (`/langfuse`) — it packages the recommended patterns from this workshop.
2. Pick the smallest LLM-using surface you have and wire `observe(...)` + `observeOpenAI(...)` first.
3. Add `propagateAttributes(...)` only once you have at least two users or two sessions worth of data.
4. Build your first dataset *from real traces*, not from imagination.
5. Run one experiment, change one thing, rerun. Repeat.
