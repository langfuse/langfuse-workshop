# 05 Dataset

## Starting point

```bash
git checkout checkpoint/04-monitoring
```

You have a traced, attributed, monitored app. `data/seed-dataset.json` and `scripts/seed-dataset.ts` are already in the repo at this checkpoint.

Make sure `.env` has:

```bash
DATASET_NAME=dad-it-support-workshop
```

## Goal

Two passes:

1. **Understand the item shape** so dataset inputs match the agent's real input.
2. **Seed the hosted dataset** from the local JSON.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Read the item shape

Open `data/seed-dataset.json`. Each item looks like:

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

Note: `input.messages` matches `/api/chat`'s shape exactly so the experiment script in step 06 can call the same `runSupportConversation(...)` without rewriting inputs.

## Step 2 — Seed the dataset

```bash
npm run dataset:seed
```

Open Langfuse → **Datasets** → `dad-it-support-workshop`. Confirm the items are there with input/expected output/metadata.

## What the starter dataset covers

- iPhone Bluetooth basics and edge cases
- iPhone Wi-Fi reconnect + "I can't see the network"
- Photo capture + WhatsApp share
- Apple Maps directions + the live-location limit
- Messages basics
- Out-of-scope (file my taxes, book my train)
- Limitation cases (passwords, live location)

If you add items later, prefer ones that match a real signal you saw in monitoring.

## How to verify you are done

- The dataset shows up in Langfuse with all items.
- Item inputs look like the `messages` array a real chat turn would have.
- You can articulate the failure modes the dataset covers.

## Wrap-up

The `/langfuse` Claude Code skill handles dataset creation, upsert, and stratification across categories — the walkthrough exists so you see what the skill is doing under the hood.

## End state

This is the starting point for `06-experiments`.
