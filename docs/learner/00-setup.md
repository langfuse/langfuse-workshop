---
title: "Workshop: Setup"
description: "Set up the workshop app with OpenAI and Langfuse credentials, configure evaluator access, and verify the local Dad IT Support Agent."
---

# 00 Setup

## Goal

Have the workshop app running locally with both OpenAI and Langfuse credentials in place. From here you can skim `01-base-app`, then start building in `02-tracing`.

## Starting point

Use the setup checkpoint for this chapter:

```bash
git checkout checkpoint/00-setup
```

This checkpoint intentionally contains the same untraced base app as `checkpoint/01-base-app`. Use it to confirm that your API keys, dependencies, and local ports work before switching to the build chapters. The Langfuse keys are configured now, but traces start only after you add instrumentation in `02-tracing`.

## Step 1 — Get the API keys

1. **OpenAI** — [platform.openai.com](https://platform.openai.com) → API Keys → create one. Copy the `sk-...` value.
2. **Langfuse** — sign up at [langfuse.com](https://langfuse.com) on the **EU region**, create a project, and copy the public + secret keys from **Settings → API Keys**.

## Step 2 — Configure `.env`

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

Keep these values in your local `.env` only. Do not paste real API keys into shared workshop notes, transcripts, screenshots, or chat messages.

## Step 3 — Configure the Langfuse evaluator model

Later chapters use LLM-as-a-judge evaluators. Langfuse runs those judge calls from an **LLM Connection** inside your Langfuse project, so configure it before you reach monitoring or experiments.

1. In Langfuse, open **Project Settings → LLM Connections**.
2. Click **Add new LLM API key**.
3. Choose **OpenAI**, name the connection, and paste your OpenAI API key into the secret field.
4. Save the connection.
5. Open **Evaluators → Set up evaluator**. If Langfuse asks for the default model first, choose the OpenAI connection and a structured-output-capable model such as `openai / gpt-4.1`, then save.

After the default evaluator model is saved, you can close the evaluator setup flow. Chapters `04-monitoring` and `06-experiments` will return to this screen to pick the published evaluator templates.

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
