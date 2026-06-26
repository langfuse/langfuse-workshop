---
title: "Maintainer: Seed Langfuse Workshop Data"
description: "Import the committed workshop trace bundle into a Langfuse project so traces, observations, and scores are ready in one command."
---

# Seed Langfuse workshop data

This flow is for maintainers preparing workshop orgs with realistic trace history.

It moves **traces, observations, and scores only**. It does **not** recreate prompts, datasets, dataset runs, annotation queues, or org/project configuration.

## Files involved

- Import script: [`scripts/import-trace-seed.ts`](/Users/annabellschafer/langfuse-workshop-2/scripts/import-trace-seed.ts)
- Shared helpers: [`scripts/langfuse-trace-seed-lib.ts`](/Users/annabellschafer/langfuse-workshop-2/scripts/langfuse-trace-seed-lib.ts)
- Canonical snapshot: [`data/seed-production-traces.json`](/Users/annabellschafer/langfuse-workshop-2/data/seed-production-traces.json)

## One-command import

The committed bundle is meant to be imported directly into a fresh workshop org or project. Use dedicated target env vars when you want to import into a different org or project:

```bash
export LANGFUSE_TARGET_PUBLIC_KEY=pk-lf-...
export LANGFUSE_TARGET_SECRET_KEY=sk-lf-...
export LANGFUSE_TARGET_BASE_URL=https://cloud.langfuse.com
```

If `LANGFUSE_TARGET_*` is not set, the importer falls back to the repo's normal `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL`.

Dry run:

```bash
npm run langfuse:seed:dry-run
```

Real import:

```bash
npm run langfuse:seed
```

That one command imports the committed bundle so the target Langfuse project immediately contains the workshop's traces, observations, and scores.

Import behavior:

- trace IDs, observation IDs, and score IDs are stable and rerunnable
- traces are imported first, then parent-before-child observations, then scores
- imported traces always set `public: false`
- imported traces append the tag `workshop-seed`
- generations import via `generation-create`, plain events via `event-create`, and all remaining observation rows via `span-create`
- when a source observation used a custom type such as `AGENT` or `TOOL`, the importer preserves that original type in `seedSourceObservation` metadata because the ingestion endpoint accepts the span shape for these rows more reliably than direct custom-type observation ingestion
- source `projectId`, `htmlPath`, `queueId`, `datasetRunId`, and `configId` are not imported
- prompt linkage is preserved only as informational metadata on generation observations

## Bundle contents

The committed snapshot already contains the workshop seed data:

- traces
- observations
- scores

That is the only seed payload learners need in order to open Langfuse and immediately inspect realistic data.

## Verification

After import, check one sample trace in the target org:

- trace name matches
- observation tree shape matches
- score names, data types, and values match
- rerunning the import does not create duplicate traces
