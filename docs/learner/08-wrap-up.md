# 08 Wrap-up

## Starting point

```bash
git checkout checkpoint/08-wrap-up
```

You have walked through every loop step.

## What you should be able to do now

- Trace an LLM app end-to-end and read the result as a debugging surface.
- Connect prompts to traces so a prompt change has a measurable next-trace effect.
- Detect interesting production behavior (out-of-scope, disagreement) automatically.
- Turn product scope into a starter dataset of realistic examples.
- Run experiments on the same agent code with no parallel implementation.
- Compare runs after changes and decide which setup is better — by score and by reading individual outputs.

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

## How to work on your own application

When you go back to your own codebase, do this in order:

1. **Install the Langfuse CLI** so you can manage prompts, datasets, and runs from the terminal:

   ```bash
   npm install -g @langfuse/cli
   langfuse auth
   ```

2. **Install the Langfuse skill** (`/langfuse`) — it packages the recommended tracing, prompt management, monitoring, and evaluator patterns from this workshop and applies them to your codebase without you hand-rolling each piece.

3. **Pick the smallest LLM-using surface** you have and wire `observe(...)` + `observeOpenAI(...)` first. Get one trace before you do anything else.

4. **Add user/session information** only once you have at least two users or two sessions of traffic — there's no point until then.

5. **Build your first dataset *from real traces or from discussions with*** rather than from imagination. Production behavior tells you what your dataset needs to cover.

6. **Run one experiment, change one thing, rerun.** Then repeat.

For the bigger-picture material on each step, the [Langfuse Academy](https://langfuse.com/academy) has dedicated lessons:

- [The AI Engineering Loop](https://langfuse.com/academy/ai-engineering-loop)
- [Tracing](https://langfuse.com/academy/tracing)
- [Monitoring](https://langfuse.com/academy/monitoring)
- [Datasets](https://langfuse.com/academy/datasets)
- [Experiments](https://langfuse.com/academy/experiments)
- [Evaluate](https://langfuse.com/academy/evaluate)
