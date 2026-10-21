# Agent notes — Python track

Maintainer rules for the `python/` track. Not needed to install or run the app;
see [`README.md`](./README.md) for that.

## Why these rules live here, not in the root `AGENTS.md`

The repository-root `AGENTS.md` opens with Rule 1: any edit to a shared file
must be propagated onto every `checkpoint/*` tag via
`scripts/sync-checkpoint-docs.sh`, which force-moves those tags. The Python port
must not move the existing (non-Python) checkpoint tags. Editing the root
`AGENTS.md` would trigger that force-move, so all Python maintainer notes live in
this file instead.

## Checkpoint tags

The Python track has its own checkpoint tags, one per phase, cut from the merge
commit of that phase:

| Tag | Workshop step |
| --- | --- |
| `checkpoint/py-00-setup` | Setup (same commit as py-01) |
| `checkpoint/py-01-base-app` | Base app, no tracing |
| `checkpoint/py-02-tracing` | Langfuse tracing |
| `checkpoint/py-03-prompt-management` | Managed prompt with local fallback |
| `checkpoint/py-04-monitoring` | Monitoring evaluators |
| `checkpoint/py-05-dataset` | Seed the workshop dataset |
| `checkpoint/py-06-experiments` | Dataset experiments with callback evaluators |
| `checkpoint/py-07-evaluation` | Compare prompt variants |
| `checkpoint/py-08-wrap-up` | Recap and next steps |

`py-00-setup` and `py-01-base-app` point at the same commit.

## Rules

- **The Node/TypeScript checkpoint tags contain no Python code.** Never move or
  edit an existing `checkpoint/0X-*` tag to add Python work. Python work only
  lands on `checkpoint/py-0X-*` tags.
- **Shared assets stay shared.** The Python side reads `data/`, `docs/`, and the
  web client build from the repository root. Do not copy or fork them into
  `python/`. When the workshop data changes, both tracks pick it up.
- **Keep Python changes inside `python/`.** Do not edit the other track's files
  or the root `AGENTS.md` from here (see the reason above).
- **Tags are cut after merge, never inside a PR.** The fork maintainer cuts each
  `checkpoint/py-0X-*` tag from the merge commit of its phase.
