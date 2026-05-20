# 08 Wrap-up

## How to think about this step

The wrap-up is where the workshop shifts from *"we built a demo"* to *"we learned a repeatable engineering loop."* Everything we wired up was a piece of the same picture — the trace from step 02 is the same shape that monitoring evaluates in step 04, that the dataset re-uses in step 05, that experiments compare in step 06.

## What participants should leave with

- How to trace an LLM app and read the result back as a debugging surface.
- How to connect prompts to traces so a prompt change has a measurable effect on the very next run.
- How to detect interesting production behavior (out-of-scope requests, user disagreement) automatically.
- How to turn product scope into a starter dataset of realistic examples.
- How to run experiments on the same agent code with no parallel implementation.
- How to compare runs after a change — by score and by reading individual outputs.

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

## How to work on your own application

When participants go back to their own codebase, the recommended path is:

1. **Install the Langfuse CLI** so prompts, datasets, and runs can be managed from the terminal:

   ```bash
   npm install -g @langfuse/cli
   langfuse auth
   ```

2. **Install the Langfuse Claude Code skill** (`/langfuse`) — it packages the recommended tracing, prompt management, monitoring, and evaluator patterns from this workshop.

3. **Pick the smallest LLM-using surface** they have and wire `observe(...)` + `observeOpenAI(...)` first.

4. **Add user/session information** only once there are at least two users or two sessions of traffic.

5. **Build the first dataset *from real traces***, not from imagination.

6. **Run one experiment, change one thing, rerun.** Then repeat.

For the bigger-picture material, the [Langfuse Academy](https://langfuse.com/academy) has dedicated lessons:

- [The AI Engineering Loop](https://langfuse.com/academy/ai-engineering-loop)
- [Tracing](https://langfuse.com/academy/tracing)
- [Monitoring](https://langfuse.com/academy/monitoring)
- [Datasets](https://langfuse.com/academy/datasets)
- [Experiments](https://langfuse.com/academy/experiments)
- [Evaluate](https://langfuse.com/academy/evaluate)
