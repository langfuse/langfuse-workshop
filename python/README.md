# Dad IT Support Agent — Python + FastAPI track

A Python + FastAPI port of the workshop's Dad IT Support Agent. It matches the
TypeScript app's behavior and API, and reuses the shared repo assets (`data/`,
`docs/`, and the React client) instead of forking them.

The learner lessons in [`../docs/`](../docs/) still apply. This README covers only
what is different on the Python side.

## Install

Requires [uv](https://docs.astral.sh/uv/) and Python 3.11+.

```bash
cd python
make setup        # runs `uv sync`, creating .venv/ from uv.lock
```

`uv` is the only package manager for this track. `pyproject.toml` lists the
dependencies, and `uv.lock` (committed) pins them. Do not add a
`requirements.txt`.

## Configure

The Python app reads the same **repo-root `.env`** as the TypeScript app, so one
config file serves both tracks. If you need a Python-only override, copy
`.env.example` to `python/.env`; values there win over the root file.

| Key | Used from | Default on the Python side |
| --- | --- | --- |
| `OPENAI_API_KEY` | py-01 | none (required) |
| `OPENAI_MODEL` | py-01 | `gpt-4.1-mini` |
| `PORT` | py-01 | `8787` |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | py-02 | none |
| `LANGFUSE_BASE_URL` | py-02 | `https://cloud.langfuse.com` |
| `LANGFUSE_PROMPT_NAME` | py-03 | `dad-it-support-agent` |
| `LANGFUSE_PROMPT_LABEL` | py-03 | `production` |
| `WORKSHOP_PROMPT_VARIANT` | py-03 | `default` |
| `DATASET_NAME` | py-05 | `dad-it-support-workshop` |

The TypeScript app defaults `OPENAI_MODEL` to `gpt-5.5-2026-04-23`. The Python
side defaults to `gpt-4.1-mini` because it is broadly available; set
`OPENAI_MODEL` to any chat model your key can call.

The base app (`checkpoint/py-01-base-app`) needs only the OpenAI keys. It makes no
calls to Langfuse.

## Run

```bash
make app          # FastAPI server on http://127.0.0.1:8787
```

The server also serves the shared React client from the repo-root `dist/`.
Build it once from the repo root with `npm install && npm run build:client`,
then open http://127.0.0.1:8787.

Smoke checks, with the server running in another terminal:

```bash
make health       # {"ok": true, "provider": "openai", "tracingConfigured": false}
make chat         # Bluetooth question -> numbered steps + usedTools
```

## Layout

| Python module | Mirrors (TypeScript) | Purpose |
| --- | --- | --- |
| `app/env.py` | `src/server/env.ts`, `load-env.ts` | Env loading and defaults |
| `app/support_data.py` | `src/server/support-data.ts` | Fixed Dad context and guide library |
| `app/tools.py` | `src/server/tools.ts` | Tool JSON schemas and `execute_tool` |
| `app/support_agent.py` | `src/server/support-agent.ts` | System prompt and the tool-calling loop (max 6 turns) |
| `app/server.py` | `src/server/index.ts` | FastAPI routes and React client serving |
| `scripts/publish_prompt.py` | `scripts/publish-prompt.ts` | Stub until py-03 |
| `scripts/seed_dataset.py` | `scripts/seed-dataset.ts` | Stub until py-05 |
| `scripts/run_dataset.py` | `scripts/run-dataset.ts` | Stub until py-06 |

## Checkpoints

The Python track has its own checkpoint tags. Each tag is cut from the merge
commit of its phase:

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

`py-00-setup` and `py-01-base-app` point at the same commit, as `00-setup` and
`01-base-app` do on the TypeScript track.

Rules for maintainers:

- **TS checkpoint tags contain no Python code.** Never move or edit an existing
  `checkpoint/0X-*` tag to add Python work. Python work only lands on
  `checkpoint/py-0X-*` tags.
- **Shared assets stay shared.** The Python side reads `data/`, `docs/`, and the
  React client build from the repo root. Do not copy or fork them into `python/`.
  When the workshop data changes, both tracks pick it up.
- **Keep Python changes inside `python/`.** Do not edit TypeScript files or the
  root `AGENTS.md` from this track. Root `AGENTS.md` Rule 1 would force-move every
  TS checkpoint tag, so Python checkpoint notes live here instead.
