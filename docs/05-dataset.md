# 05 Dataset

## How to think about this step

This step turns interesting product scope into reusable test cases. A dataset is our first move from *"I noticed something in production"* to *"I can test this repeatedly."*

The shape of each item matters: we keep the dataset input as close to the agent's real input as possible (a `messages` array), so an experiment run later can use the same `runSupportConversation(...)` logic the web chat already uses.

## Goal

Seed a hosted Langfuse dataset that covers the realistic scope and failure modes of the Dad IT Support Agent.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

You have a traced, attributed, monitored app. `data/seed-dataset.json` (the iPhone-only 14-item starter set) and `scripts/seed-dataset.ts` are already in the repo at this checkpoint. You don't write either — you read them and run the seed script.

Make sure `.env` has:

```bash
DATASET_NAME=dad-it-support-workshop
```

## Step 1 — Read the dataset shape

Open `data/seed-dataset.json`. Each item is one realistic chat-turn worth of input plus what we'd expect the answer to look like:

```json
{
  "id": "dad-001",
  "input": {
    "messages": [{ "role": "user", "content": "How do I turn Bluetooth on on my iPhone?" }]
  },
  "expectedOutput": {
    "idealAnswer": "Open Settings, tap Bluetooth, and turn the Bluetooth switch on.",
    "expectedKeywords": ["Settings", "Bluetooth", "switch", "on"]
  },
  "metadata": { "category": "iphone-bluetooth", "difficulty": "easy" }
}
```

Two things to notice:

- `input.messages` is exactly the shape `/api/chat` accepts — no rewriting needed when we run experiments.
- `expectedOutput` is intentionally loose: an `idealAnswer` for human review plus `expectedKeywords` for a deterministic-ish "did it cover the steps" check.

## Step 2 — Seed the hosted dataset

`scripts/seed-dataset.ts` reads the JSON and pushes each item into Langfuse via the SDK. Run it:

```bash
npm run dataset:seed
```

Open Langfuse → **Datasets** → `dad-it-support-workshop`. You should see the items as rows, each with the message array as input and the keywords/ideal answer as expected output. If the dataset already exists, the script upserts.

## What the starter dataset covers

The seed deliberately covers each part of the iPhone scope plus the obvious edge cases:

- iPhone Bluetooth basics and "Bluetooth is on but device doesn't show up"
- iPhone Wi-Fi reconnect and "I can't see the network name"
- Photo capture + WhatsApp share, opening the latest photo, sending it
- Apple Maps directions (and the live-location limit)
- Messages basics
- Out-of-scope requests (file my taxes, book my train)
- Limitation cases (passwords, live location)

If you add to the dataset, prefer items that match a real signal you saw in monitoring rather than items invented from scratch.

## Teaching point

The dataset is not "all possible requests." It's a first representative slice of the app's intended scope and known failure modes — small enough to keep curated, large enough to detect regressions. The work continues in 06-experiments, where this dataset becomes the input to runs against the real agent.

A more straightforward way to design and seed a dataset in line with Langfuse best practices is to use the **Langfuse skill** (`/langfuse`). It handles dataset creation, item upsert, and stratification across categories. The walkthrough exists so you understand what the skill is doing under the hood.
