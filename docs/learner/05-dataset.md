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

## Why build datasets

A dataset is your representation of what the system will face in production — the inputs you expect, and for each, what a good answer looks like. With a clear set of expectations written down, you can rerun the agent against them after every change and know whether you helped or hurt. A good dataset is the foundation for shipping confidently and iterating without regressing.

Learn more in the [Langfuse Academy lesson on datasets](https://langfuse.com/academy/datasets).

## Goal

Seed a first dataset that captures the kinds of requests we expect Specs to handle. To get there:

1. **Understand the item shape** — every dataset item has the same three fields, and we want ours to match the agent's actual input.
2. **Seed the hosted dataset** so it lives in Langfuse and is ready for experiments in the next step.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](../images/specs_illustration.png)

## Step 1 — Read the item shape

Dataset items in Langfuse follow a consistent shape — three fields, one required, two optional:

| Field | Required | Purpose |
| --- | --- | --- |
| `input` | yes | What you'd feed the agent. For us, the same `{ messages: [...] }` shape `/api/chat` accepts. |
| `expectedOutput` | optional | What a good answer would look like. Free-form — used by evaluators to compare actual vs expected. |
| `metadata` | optional | Tags or other fields for filtering and grouping (`category`, `difficulty`, etc.). |

For us, one concrete item looks like this:

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

- **`input.messages`** matches `/api/chat`'s shape exactly so the experiment script in step 06 can call the same `runSupportConversation(...)` without rewriting inputs.
- **`expectedOutput`** has both an `idealAnswer` (for human review and LLM-as-a-judge correctness scoring) and `expectedKeywords` (for a quick deterministic check that the answer covered the right steps).
- **`metadata`** lets us slice runs by category or difficulty later.

Open `data/seed-dataset.json` and skim the rest of the items.

## Step 2 — Seed the dataset

You have several options for getting items into a Langfuse dataset:

- **Add items manually** in the UI (Datasets → New item).
- **Upload a CSV / JSON** file via the UI.
- **Turn live production traces** into dataset items directly from the Trace view — this is the most powerful path once you have monitoring catching interesting traces.
- **Programmatic seeding** via the SDK / CLI — best for an initial bulk load like ours.

For this workshop we use the programmatic path because we already have a curated JSON file:

```bash
npm run dataset:seed
```

Open Langfuse → **Datasets** → `dad-it-support-workshop`. Confirm the items are there with input, expected output, and metadata.

<!-- TODO: screenshot of the seeded dataset in the Langfuse UI — rows of items with input/expected output/metadata visible. -->

> 📷 *Screenshot placeholder: the `dad-it-support-workshop` dataset in Langfuse — every seeded item visible as a row with input, expected output, and metadata columns.*

## What the starter dataset covers

- iPhone Bluetooth basics and edge cases
- iPhone Wi-Fi reconnect + "I can't see the network"
- Photo capture + WhatsApp share
- Apple Maps directions + the live-location limit
- Messages basics
- Out-of-scope (file my taxes, book my train)
- Limitation cases (passwords, live location)

If you add items later, prefer ones that match a real signal you saw in monitoring rather than items invented from scratch.

## How to verify you are done

- The dataset shows up in Langfuse with all items.
- Item inputs look like the `messages` array a real chat turn would have.
- You can articulate the failure modes the dataset covers.

## Wrap-up

Datasets are how you write down what your system is expected to handle. A good one gives you confidence to ship and to iterate without regressing. You can seed datasets via the Langfuse CLI or skill, build them from production traces in the UI, or maintain them in code like we did — the right approach depends on where your best examples come from.

Next we use this dataset to run experiments against the agent.

## End state

This is the starting point for `06-experiments`.
