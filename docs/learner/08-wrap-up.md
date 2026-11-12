---
title: "Workshop: Wrap-up"
description: "Review the complete AI engineering loop and how to apply tracing, monitoring, datasets, experiments, and evaluation to your own LLM app."
---

# 08 Wrap-up

## Why close the loop

You have walked the loop once on a small app. This chapter is here so you leave with a sequence you can reuse on your own codebase: trace first, then monitor, then turn what you find into a dataset, then experiment and evaluate before you ship the next change. The workshop is the hands-on version of that loop. The docs and Academy are the reference and the conceptual version of the same steps.

Complementary materials:

- Docs: [Langfuse overview](https://langfuse.com/docs)
- Academy: [The AI Engineering Loop](https://langfuse.com/academy/ai-engineering-loop)
  - [Tracing](https://langfuse.com/academy/tracing)
  - [Monitoring](https://langfuse.com/academy/monitoring)
    - [Error analysis](https://langfuse.com/academy/monitoring/error-analysis)
    - [Capturing signals](https://langfuse.com/academy/monitoring/capturing-signals)
  - [Datasets](https://langfuse.com/academy/datasets)
  - [Experiments](https://langfuse.com/academy/experiments)
  - [Evaluate](https://langfuse.com/academy/evaluate)

## Starting point

```bash
git checkout checkpoint/08-wrap-up
```

## What you should be able to do now

- Trace an LLM app end-to-end and read the result as a debugging surface.
- Connect prompts to traces so a prompt change has a measurable next-trace effect.
- Make sense of a pile of production traces: read failures, and detect disagreement and all-caps frustration automatically.
- Turn product scope into a starter dataset of realistic examples.
- Run experiments on the same agent code with no parallel implementation.
- Compare runs after changes and decide which setup is better — by score and by reading individual outputs.


## Bigger picture

Langfuse in this workshop is a *shared surface*, not just observability:

- understanding behavior — every interaction is inspectable
- collecting representative examples — production seeds datasets
- comparing changes — every prompt or code change has a baseline
- improving systems continuously — the loop closes back on itself

## How to work on your own application

When you go back to your own codebase, do this in order:

1. **Install the [Langfuse skill](https://github.com/langfuse/skills) and the [Langfuse CLI](https://langfuse.com/docs/api-and-data-platform/features/cli).** Keep your project keys in the application's local `.env`. The CLI uses the same keys as the SDKs.

   ```dotenv
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_BASE_URL=https://cloud.langfuse.com
   ```

   ```bash
   npx skills add langfuse/skills --skill "langfuse"
   npm install -g langfuse-cli
   ```

2. **Ask your coding agent to use the skill to add tracing** to your application. Start with the smallest LLM-using surface and get one trace before you do anything else.

3. **Run realistic cases through your app** so you have traces to work with for error analysis.

4. **Build your first dataset** so it represents what your application will actually do.

5. **Measure and iterate** on the quality of your system. Change one thing, rerun, and compare.
