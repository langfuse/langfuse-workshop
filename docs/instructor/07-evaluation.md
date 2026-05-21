# 07 Evaluate a change

## How to think about this step

This is where the loop closes. We found behavior in traces, defined scope with a dataset, ran an experiment, and now we change something on purpose to see whether it improves results. The point is not the absolute score — it's that *one change* can now be inspected, compared, and discussed systematically.

Look at your first experiment run before making changes. Open the dataset → **Runs** tab and check the averages: `correctness` and `keyword_overlap`. Open the items where either score is low and read the agent's answer. Whatever you see is the *problem you're about to try to fix*.

## Why evaluate changes with experiments

If you change anything about your AI app — a prompt, a model, the context you pass, even the agent architecture — you want to know whether the change actually made the system better. Eyeballing one or two outputs feels good but doesn't generalize. Rerunning the same dataset against the new version and comparing scores against the old run is the closest thing to a measurement. It's also what lets you close the loop and ship with confidence.

## What you could change

This chapter is framed around prompt iteration because changing the prompt is the lowest-friction lever. The same workflow applies if you change:

- **The model** — try a stronger or cheaper one and rerun.
- **The context** — add or remove fields from the system prompt or tool results.
- **The agent architecture** — add a tool, change tool ordering, change retries.
- **The prompt** — what we'll do here.

The shape is always the same: change *one* thing, rerun the dataset, compare runs side by side.

## Goal

Change something in the prompt and improve the experiment results — measured by `correctness` and `keyword_overlap` going up across the dataset.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

Three passes:

1. **Change one thing** — edit the prompt in the Langfuse UI (recommended) or republish a different variant from code.
2. **Rerun the dataset** against the new prompt.
3. **Compare runs** side by side and decide whether to ship.

## Starting point

```bash
git checkout checkpoint/07-evaluation
```

You have an agent that is traced, monitored, runs against a hosted dataset, and has at least one experiment run with `keyword_overlap` and `correctness` scores. Now you change the prompt and run it again.

## Step 1 — Change the prompt

The change should be informed by what you saw in run 1 — for example, items where `correctness` was low because the agent danced around an out-of-scope question instead of refusing it cleanly. A concrete edit:

> Add a rule: *"If a request is outside iPhone help (taxes, travel booking, anything that needs live account access), say so directly in one short sentence — what you can't help with and what you can — then stop. Do not attempt to answer the request."*

That makes the out-of-scope behaviour explicit instead of letting the model improvise.

Two ways to make the change:

**Option A — Langfuse-side (edit in the UI, recommended):**

Prompts → `dad-it-support-agent` → edit body → add the rule above into the **Rules** section → save as a new version → promote the new version to the `production` label. The resolver fetches by label, so the next request picks up the new version automatically.

![Review Prompt Changes in Langfuse — side-by-side diff between v1 and the draft with the new out-of-scope rule highlighted, ready to save as a new version and promote to production.](./images/evaluate-a-change/07-evaluate-a-change-prompt-diff.png)

**Option B — Code-side (edit `src/server/local-prompt.ts` and republish):**

Open `src/server/local-prompt.ts`, add the rule to the `baseline` template, then:

```bash
npm run prompt:publish
```

The repo also ships a `gentler` variant you can switch to as-is (`WORKSHOP_PROMPT_VARIANT=gentler npm run prompt:publish`) — useful if you just want to see *any* prompt change rather than design your own.

Either way you end up with a new prompt version, and the next `runSupportConversation(...)` call uses it.

## Step 2 — Rerun the dataset

```bash
npm run dataset:run
```

Now there are two runs under the same dataset, each linked to a different prompt version. The same Correctness evaluator from step 06 scores the new run automatically.

## Step 3 — Compare

In Langfuse:

- Dataset → **Runs** tab → both rows visible with `keyword_overlap` and `correctness` averages.
- **Chart view** → per-run averages side by side.
- Open a handful of items and read both answers — qualitative diffs are where the real signal usually is.

Things to look for:

- which items improved (intentional)
- which items regressed (the part that makes evaluation feel useful)
- whether the change shifted scope (more refusals? more confident answers?)

## Teaching point

This step makes "evaluation" click for many people. A single score in isolation doesn't tell you much, but the same score *paired with a deliberate change* is suddenly informative. Once you've done this loop once — change → rerun → compare → decide — every future change has a free baseline to measure against.

A more straightforward way to manage prompt versions and rerun experiments in line with Langfuse best practices is the [**Langfuse skill**](https://langfuse.com/docs) (`/langfuse`). It knows how to bump prompt versions, link runs to versions, and produce a comparison chart. The walkthrough exists so you understand what the skill is doing under the hood.
