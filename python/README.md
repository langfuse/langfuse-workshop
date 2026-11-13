# Dad IT Support Agent — Python + FastAPI track

A small FastAPI app: an AI agent that helps Dad with his iPhone. It answers from
a fixed Dad profile and a local how-to library, using OpenAI tool-calling. The
later phases add Langfuse tracing, prompt management, datasets, and evaluation.

It reads shared workshop assets (`data/`, `docs/`, and a prebuilt web client)
from the repository root, so you run everything from the `python/` directory with
nothing to copy in. The learner lessons in [`../docs/`](../docs/) walk through the
concepts; this README is all you need to install, configure, and run the app.

## Install

- Requires [uv](https://docs.astral.sh/uv/) and Python 3.11+.

- Install uv if you don't have it:

  ```bash
  # macOS (Homebrew)
  brew install uv
  # or the official installer (macOS/Linux)
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

- Confirm it is available:

  ```bash
  uv --version
  ```

- Then create the virtualenv:

  ```bash
  cd python
  make setup        # runs `uv sync`, creating .venv/ from uv.lock
  ```

`uv` is the only package manager for this track. `pyproject.toml` lists the
dependencies, and `uv.lock` (committed) pins them. Do not add a
`requirements.txt`.

## Configure

- The app reads a single `.env` file from the **repository root** (one level above
`python/`). Create it before running:

  ```bash
  cd ..                 # repository root
  cp .env.example .env   # then edit .env and set the keys below
  ```

At minimum set `OPENAI_API_KEY`. The root `.env.example` ships a default `OPENAI_MODEL` 
that may not be callable with your key — set `OPENAI_MODEL` to a chat model your key 
can call (for example `gpt-4.1-mini`).

### Using OpenAI or OpenRouter

The app talks to any OpenAI-compatible chat API.

- **OpenAI (default):** set `OPENAI_API_KEY` to your OpenAI key and leave
  `OPENAI_BASE_URL` unset. The app uses `https://api.openai.com/v1`.
- **OpenRouter:** put your OpenRouter key in `OPENAI_API_KEY` (in place of an
  OpenAI key), then add:

  ```bash
  OPENAI_BASE_URL=https://openrouter.ai/api/v1
  OPENAI_MODEL=openai/gpt-4.1-mini
  ```

  `OPENAI_BASE_URL` is optional and only needed for OpenRouter (or another
  OpenAI-compatible endpoint). Leave it unset to use OpenAI.

If you ever want a setting that applies only to the Python app, copy 
`python/.env.example` to `python/.env`; values there override the root `.env`.

| Key | Needed from | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | py-01 | none (required; OpenAI or OpenRouter key) |
| `OPENAI_BASE_URL` | py-01 | unset (OpenAI); `https://openrouter.ai/api/v1` for OpenRouter |
| `OPENAI_MODEL` | py-01 | `gpt-4.1-mini` (use `openai/gpt-4.1-mini` on OpenRouter) |
| `PORT` | py-01 | `8787` |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | py-02 | none |
| `LANGFUSE_BASE_URL` | py-02 | `https://cloud.langfuse.com` |
| `LANGFUSE_PROMPT_NAME` | py-03 | `dad-it-support-agent` |
| `LANGFUSE_PROMPT_LABEL` | py-03 | `production` |
| `WORKSHOP_PROMPT_VARIANT` | py-03 | `default` |
| `DATASET_NAME` | py-05 | `dad-it-support-workshop` |

The base app (`checkpoint/py-01-base-app`) needs only `OPENAI_API_KEY` and
`OPENAI_MODEL`. It makes no calls to Langfuse; the Langfuse keys matter from py-02
onward.

## Run

- Run the app

  ```bash
  make app          # FastAPI server on http://127.0.0.1:8787
  ```

- Smoke checks, with the server running in another terminal:

  ```bash
  make health       # {"ok": true, "provider": "openai", "tracingConfigured": false}
  make chat         # Bluetooth question -> numbered steps + usedTools
  ```

`make chat` is the end-to-end test: it sends a real question and should return
numbered steps, with `usedTools` listing `get_support_context` and
`search_help_library`.

### Optional: the web UI

- The API is enough to use and test the agent.
- If you also want the browser chat UI, the server serves a prebuilt web client from the repository-root `dist/` folder. That build is not checked in and is produced by the separate Node toolchain at the repository root:

  ```bash
  cd ..                               # repository root
  npm install && npm run build:client # one-time, requires Node.js
  ```

Then restart `make app` and open http://127.0.0.1:8787. Skip this entirely if you
only want the API.

## Layout

What each file does. (The middle column maps to the Node/TypeScript track and
only matters if you maintain both; a Python reader can ignore it.)

| Python module | Node/TypeScript counterpart | Purpose |
| --- | --- | --- |
| `app/env.py` | `src/server/env.ts`, `load-env.ts` | Env loading and defaults |
| `app/support_data.py` | `src/server/support-data.ts` | Fixed Dad context and guide library |
| `app/tools.py` | `src/server/tools.ts` | Tool JSON schemas and `execute_tool` |
| `app/support_agent.py` | `src/server/support-agent.ts` | System prompt and the tool-calling loop (max 6 turns) |
| `app/server.py` | `src/server/index.ts` | FastAPI routes and web client serving |
| `scripts/publish_prompt.py` | `scripts/publish-prompt.ts` | Stub until py-03 |
| `scripts/seed_dataset.py` | `scripts/seed-dataset.ts` | Stub until py-05 |
| `scripts/run_dataset.py` | `scripts/run-dataset.ts` | Stub until py-06 |

## Checkpoints

Each phase of the Python track has a git tag you can check out to start from that
point:

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

Maintaining these tags and the two-track repository is covered in
[`AGENTS.md`](./AGENTS.md).
