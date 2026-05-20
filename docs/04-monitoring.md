# 04 Monitoring

## Why monitor your AI app

In production, an AI app produces a lot of traces. Most of them are fine. The interesting ones — the answers that drift, the requests the agent shouldn't be handling at all, the patterns that change over time — are what you want to find. Monitoring is how you catch those signals without reading every single trace by hand.

For the bigger picture, see the [Langfuse Academy lesson on monitoring](https://langfuse.com/academy/monitoring).

## Goal

The goal of monitoring is finding the things that are worth knowing about for *your* AI application. For Specs, two events are worth catching:

- **User disagreement** — Dad pushes back ("No, that menu isn't there"). Either the agent gave the wrong steps or the app is showing its limits.
- **Out-of-scope requests** — Dad tries to use Specs for something it isn't built for ("Can you file my taxes?"). Useful both for spotting product expansion ideas and for confirming the agent refuses gracefully.

Monitoring also has a quality-tracking dimension — average score on some metric over time. We recommend **signal detection first**: tracking aggregate quality is most useful once you and your team have a clear opinion about what quality even means in your context, and the fastest way to form that opinion is to look at the surprising traces.

![How Specs handles a ticket — one agent, two tools, one model, each hop an observation in the trace.](./images/specs_illustration.png)

## Starting point

```bash
git checkout checkpoint/03-prompt-management
```

Your app traces every chat turn and links each generation to a Langfuse-managed prompt. You don't need to change any code in this step — the trace shape from `02-tracing` already has everything a judge-based monitor needs at the root observation: the full conversation as input and the agent's answer as output.

## Step 1 — Wire the first two monitors (Langfuse UI)

Langfuse ships templates for **User Disagreement** and **Out-of-Scope Detection**. Both are LLM-as-a-judge evaluators that read variables from the trace.

1. In Langfuse, open **Evaluators → New evaluator** and pick the **Out-of-Scope Detection** template.
2. Target the agent's root observation:
   - Observation type: `agent`
   - Observation name: `dad-it-support-chat-turn`
3. Map the template's variables from our root observation's input/output:
   - `messages` (or `conversation`) ← `$.messages` — the full chat history including the current user message
   - `assistant_output` (or `response`) ← `$.answer` — the agent's final reply
4. Save and enable.
5. Repeat the same setup with the **User Disagreement** template.

If the template uses variable names different from the ones above, the JSONPath sources stay the same — only the variable name on the template side changes.

## Where to find the fields in the trace

Because `observe(...)` auto-captures the function argument and return value:

- root observation input is the full `ChatRequest` (`messages`, `sessionId`, optional `userId`)
- root observation output is the full `ChatResponse` (`answer`, `promptSource`, `usedTools`, `traceMeta`)

The system prompt is *not* on the root — it lives on the child `openai-chat-completion` generation captured by `observeOpenAI`.

## Run and verify

```bash
npm run dev
```

Send three turns, one per monitor scenario:

1. **In-scope** — "How do I turn Bluetooth on?" (should score clean on both monitors)
2. **Out-of-scope** — "Can you file my taxes?"
3. **Disagreement** — ask a normal question, then reply with "No, that menu isn't there"

In Langfuse, wait a few seconds for the evaluator to run, then sort traces by the score. The out-of-scope and disagreement traces should bubble to the top.

## Teaching point

Good monitors are how you separate signal from noise. Production means a lot of traces, and the most important question is *which ones should I look at?* — monitors answer that.

Once signal-detection monitors are in place, the next move over time is **average-metric tracking** — picking quality metrics and watching them drift. The right way to choose those metrics is **error analysis**: look at a sample of the surprising traces you're now catching, group them by failure mode, and turn the failure modes into evaluators. The [monitoring lesson on the Academy](https://langfuse.com/academy/monitoring) goes deeper.

The traces you catch with these monitors are also the best source for `05-dataset` — they're real examples of behavior you want to lock in or fix.
