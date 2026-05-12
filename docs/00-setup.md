# 00 Setup

This setup step is intentionally front-loaded so the live workshop can stay focused on Langfuse itself rather than account friction.

## What participants need

- Node.js 20+
- An Anthropic API key
- A Langfuse Cloud EU account
- Langfuse project API keys

## Langfuse Cloud EU

Use:

- Host: `https://cloud.langfuse.com`

Add these to `.env`:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

## Anthropic

Add:

```bash
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

`claude-3-5-haiku-latest` keeps the workshop affordable. You can swap in a stronger model later if needed.

## Install dependencies

```bash
npm install
```

## Recommended Langfuse tooling

Langfuse CLI:

```bash
npx langfuse-cli api __schema
```

Langfuse skill:

```bash
npx skills add langfuse/skills --skill "langfuse"
```

## Run the app

```bash
npm run dev
```

Then open:

- [http://127.0.0.1:3333](http://127.0.0.1:3333)

## Workshop framing

Even if Langfuse credentials are missing, the app still runs with the local fallback prompt. That is deliberate: it keeps later checkpoints jumpable and lets you demo the base app before the observability layer is added.

