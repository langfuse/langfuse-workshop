# 00 Setup

## How to think about this step

This is the only setup step in the workshop. The base app is already in the repo and ready to run — we just need credentials and a running server. From here you go straight into tracing.

## What to prepare

1. **An OpenAI API key.** Get one from [platform.openai.com](https://platform.openai.com) → API Keys.
2. **A Langfuse project on Cloud EU.** Sign up at [langfuse.com](https://langfuse.com), create a project, and copy the public + secret API keys from **Settings → API Keys**. Use the EU region.

## Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

Set at minimum:

```bash
OPENAI_API_KEY=sk-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

The remaining defaults (`OPENAI_MODEL`, `LANGFUSE_PROMPT_NAME`, `LANGFUSE_PROMPT_LABEL`, `WORKSHOP_PROMPT_VARIANT`, `DATASET_NAME`) work as-is for the workshop.

## Install and run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3333](http://127.0.0.1:3333). You should land in the **Dad IT Support Agent** chat with the Specs mascot, suggestion chips, and the phone panel on the right.

![Specs greeting on the running app](./images/specs_illustration.png)

> 📷 *Screenshot placeholder: the running app at `http://127.0.0.1:3333` — Specs greeting + suggestion chips + iPhone panel on the right.*

## Teaching note

Langfuse credentials are not required for the app to boot — the local-prompt fallback handles a missing Langfuse setup. But every later step depends on them being present, so wire them up now.

## End state

You have the workshop app running locally. Move straight on to `02-tracing`.
