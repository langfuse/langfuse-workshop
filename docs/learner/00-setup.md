---
title: "Workshop: Setup"
description: "Set up the workshop app with OpenAI and Langfuse credentials, then verify the local Dad IT Support Agent."
---

# 00 Setup

## Goal

Have the workshop app running locally with both OpenAI and Langfuse credentials in place. From here you can skim `01-base-app`, then start building in `02-tracing`.

## Starting point

Clone the workshop repository, enter it, then check out the setup checkpoint for this chapter:

```bash
git clone https://github.com/langfuse/langfuse-workshop.git
cd langfuse-workshop
git checkout checkpoint/00-setup
```

This checkpoint intentionally contains the same untraced base app as `checkpoint/01-base-app`. Use it to confirm that your API keys, dependencies, and local ports work before switching to the build chapters. The Langfuse keys are configured now, but traces start only after you add instrumentation in `02-tracing`.

## Step 1 — Get the API keys

1. **OpenAI** — [platform.openai.com](https://platform.openai.com) → API Keys → create one. Copy the `sk-...` value.
2. **Langfuse** — sign up at [langfuse.com](https://langfuse.com) on the **EU region**, create a project, and copy the public + secret keys from **Settings → API Keys**.

## Step 2 — Install the Langfuse skill and CLI

Later modules drive Langfuse through a coding agent, which needs the `langfuse` skill and the Langfuse CLI.

Paste this into your coding agent to install both:

> "Please install the `langfuse` skill from `https://github.com/langfuse/skills/tree/main/skills/langfuse`, and install the Langfuse CLI with `npm install -g langfuse-cli`."

Prefer to install them yourself:

```bash
# Langfuse CLI
npm install -g langfuse-cli

# langfuse skill — point your agent at:
# https://github.com/langfuse/skills/tree/main/skills/langfuse
```

## Step 3 — Configure `.env`

```bash
cp .env.example .env
```

Fill in:

```bash
OPENAI_API_KEY=sk-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Leave the rest of the defaults as they are.

The workshop app always loads this repository's `.env` file for the server and helper scripts. If you have `LANGFUSE_*`, `OPENAI_*`, or `DATASET_NAME` values exported in your shell from another project, they will not override this file. To change the workshop configuration, edit `.env`.

Keep these values in your local `.env` only. Do not paste real API keys into shared workshop notes, transcripts, screenshots, or chat messages.

## Step 4 — Install and run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3333](http://127.0.0.1:3333).

## Step 5 — Confirm what you see

You should see the **Dad IT Support Agent** chat:

- the Specs mascot up top
- a greeting from Specs
- suggestion chips below the greeting
- the iPhone panel on the right ("Dad" + iPhone 15 details)

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)


## How to verify you are done

- `npm run dev` is running and listening on `http://127.0.0.1:3333` (client) and `http://127.0.0.1:8787` (server).
- The browser shows the Specs greeting, not an error.
- Sending one of the suggestion chips returns a real iPhone answer from the model.

## End state

Your environment is ready. To build the workshop step-by-step, skim `01-base-app` if you want the app tour, then check out `checkpoint/02-tracing` for the first code changes.
