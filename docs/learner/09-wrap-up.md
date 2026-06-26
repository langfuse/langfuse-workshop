---
title: "Workshop: Wrap-up"
description: "Review the complete AI engineering loop and how to apply tracing, monitoring, datasets, experiments, and evaluation to your own LLM app."
---

# 09 Wrap-up

## Starting point

Stay on the checkout where you finished module 08.

If you want the current reference implementation instead of your own in-progress work, inspect `main`.

You have walked through every loop step.

## What you should be able to do now

- Trace an LLM app end-to-end and read the result as a debugging surface.
- Connect prompts to traces so a prompt change has a measurable next-trace effect.
- Detect interesting production behavior (out-of-scope, disagreement) automatically.
- Turn product scope into a starter dataset of realistic examples.
- Run experiments on the same agent code with no parallel implementation.
- Compare runs after changes and decide which setup is better — by score and by reading individual outputs.


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

1. **Run the [Langfuse CLI](https://langfuse.com/docs/api-and-data-platform/features/cli)** so you can manage prompts, datasets, and runs from the terminal. The CLI uses the same project API keys as the SDKs, so there is no separate CLI login step. Keep those values in your application's local `.env`:

   ```dotenv
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_BASE_URL=https://cloud.langfuse.com
   ```

   Then run the CLI from a shell that has loaded that file:

   ```bash
   npx langfuse-cli api __schema
   ```

   If you prefer a global binary, install the published `langfuse-cli` package:

   ```bash
   npm install -g langfuse-cli
   langfuse api __schema
   ```

2. **Install the single [`langfuse` skill](https://github.com/langfuse/skills/tree/main/skills/langfuse)** in your agent's local skills directory — for Codex, that path is `~/.codex/skills/langfuse`. The issue-triage and improvement-loop playbooks are references inside that one skill, not separate skills to install. It packages the recommended tracing, prompt management, monitoring, and evaluator patterns from this workshop and applies them to your codebase without you hand-rolling each piece.

   > 💡 This workshop only used one slice of the `langfuse` skill. In your own project you can also use it to add tracing, manage prompts in Langfuse, and run the same self-improvement loop on your own production traffic.

3. **Pick the smallest LLM-using surface** you have and wire `observe(...)` + `observeOpenAI(...)` first. Get one trace before you do anything else.

4. **Add user/session information** only once you have at least two users or two sessions of traffic — there's no point until then.

5. **Build your first dataset *from real traces, discussions with experts, or past examples*** rather than from imagination. Production behavior will tell you over time what your dataset needs to cover.

6. **Run one experiment, change one thing, rerun.** Then repeat.

For the bigger-picture material on each step, the [Langfuse Academy](https://langfuse.com/academy) has dedicated lessons:

- [The AI Engineering Loop](https://langfuse.com/academy/ai-engineering-loop)
- [Tracing](https://langfuse.com/academy/tracing)
- [Monitoring](https://langfuse.com/academy/monitoring)
- [Datasets](https://langfuse.com/academy/datasets)
- [Experiments](https://langfuse.com/academy/experiments)
- [Evaluate](https://langfuse.com/academy/evaluate)
