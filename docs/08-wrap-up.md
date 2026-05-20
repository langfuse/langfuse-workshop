# 08 Wrap-up

## How to think about this step

The wrap-up is where the workshop shifts from *"we built a demo"* to *"we learned a repeatable engineering loop."* Everything we wired up was a piece of the same picture — the trace from step 02 is the same shape that monitoring evaluates in step 04, that the dataset re-uses in step 05, that experiments compare in step 06.

## What participants should leave with

- How to trace an LLM app and read the result back as a debugging surface.
- How to connect prompts to traces so a prompt change has a measurable effect on the very next run.
- How to detect interesting production behavior (out-of-scope requests, user disagreement) automatically.
- How to turn product scope into a starter dataset of realistic examples.
- How to run experiments on the same agent code with no parallel implementation.
- How to compare runs after a prompt change and decide what's better — by score and by reading individual outputs.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Bigger picture

The point of Langfuse in this workshop is not just observability. It's giving teams a shared surface for:

- **understanding behavior** — every interaction is inspectable
- **collecting representative examples** — production behaviour seeds datasets
- **comparing changes** — every prompt or code change has a baseline
- **improving systems continuously** — the loop closes back on itself

## Good closing questions

- What did tracing reveal that was invisible before?
- Which production events would you monitor first in your own app?
- What would you add to the starter dataset next?
- What change would you test after the first prompt iteration?
- Where in your real app would the `/langfuse` skill have saved you the most hand-rolling?

## Next steps

If you want to take this further on your own codebase, the recommended path:

1. Install the **Langfuse Claude Code skill** (`/langfuse`) — it packages the recommended patterns from steps 02 through 06 into ready-to-apply guidance.
2. Pick the smallest LLM-using surface you have and wire `observe(...)` + `observeOpenAI(...)` first.
3. Add `propagateAttributes(...)` only once you have at least two users or two sessions worth of data.
4. Build your first dataset *from real traces*, not from imagination — monitoring is the right source.
5. Run one experiment, change one thing, rerun. Repeat.
