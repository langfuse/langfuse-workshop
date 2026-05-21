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
git checkout checkpoint/04-monitoring
```

Your app traces every chat turn and links each generation to a Langfuse-managed prompt. You don't need to change any code in this step — the trace shape from `02-tracing` already has everything a judge-based monitor needs at the root observation: the full conversation as input and the agent's answer as output.

## Step 1 — Wire the first two monitors (Langfuse UI)

Langfuse ships published templates for **User Disagreement** and **Out-of-Scope Detection**. Both are LLM-as-a-judge evaluators that read variables from the trace. They expect access to the system prompt and the user's latest message, so the right place to target is the OpenAI generation observation — that's where the system prompt sits at `messages[0]`.

1. In Langfuse, open **Evaluators → New evaluator** and pick the **Out-of-Scope Detection** template from the published library.
2. Target the OpenAI generation:
   - Observation type: `generation`
   - Observation name: `openai-chat-completion`
3. Map the template's variables from the generation's **Input**:

   | Template variable | Object field | JsonPath |
   | --- | --- | --- |
   | `{{system_prompt}}` | `Input` | `$.messages[0].content` |
   | `{{last_user_message}}` | `Input` | `$.messages[2].content` |

   The index `[2]` works because our chat starts with Specs' opening greeting at `[1]`, so the user's latest message lands at `[2]`. If your conversation has a different opening shape, adjust the index.
4. Pick the judge model (e.g. `gpt-5.5-2026-04-23`) and save.
5. Enable the evaluator.
6. Repeat the same setup for the **User Disagreement** template — same JsonPaths.

> 💡 *Custom evaluators.* The shipped templates are a fast on-ramp, but you don't have to use them. **Evaluators → New evaluator → Custom** lets you write your own prompt and define your own variables. Same mapping flow — point each variable at the right JsonPath on the right observation, and you're done.

## Where the fields live in the trace

Because `observe(...)` auto-captures the function argument and return value:

- the **agent root** observation input is the full `ChatRequest` (`messages`, `sessionId`, optional `userId`) — no system prompt.
- the **agent root** observation output is the full `ChatResponse` (`answer`, `usedTools`, `traceMeta`).
- the **child `openai-chat-completion` generation** input has the full prompt with the system message at `messages[0]`.

That's why the published templates above target the generation, not the agent root — they need the system prompt.

## Run and verify

```bash
npm run dev
```

Send three turns, one per monitor scenario:

1. **In-scope** — "How do I turn Bluetooth on?" (should score clean on both monitors)
2. **Out-of-scope** — "Can you file my taxes?"
3. **Disagreement** — ask a normal question, then reply with "No, that menu isn't there"

In Langfuse, wait a few seconds for the evaluator to run, then sort traces by the score. The out-of-scope and disagreement traces should bubble to the top.

![Out-of-scope evaluator firing on a trace — the generation is flagged as out-of-scope, and the left-hand panel shows the agent's reasoning that the request is outside the iPhone-help scope.](./images/monitoring/04-monitoring-out-of-scope.png)

When the out-of-scope monitor fires, you can confirm the chatbot rejected the request gracefully — exactly what we asked it to do. But those traces are also the most interesting ones to read: a steady stream of out-of-scope hits is often the earliest signal there's *additional scope* worth handling. *"Can you file my taxes?"* is silly, but *"Help me move photos to my new iPad"* might be a real feature request hiding in monitor output.

<!-- TODO: screenshot of a user-disagreement trace where the evaluator scored `true`. -->

> 📷 *Screenshot placeholder: a trace where the user disagreement evaluator scored `true`.*

User disagreement is a much higher-signal event. When a user pushes back on an answer the agent just gave, something almost certainly went wrong — wrong tool result, missing context, an instruction that doesn't match the iPhone they're on. These are the traces to read first, and they're prime candidates to turn into dataset items in `05-dataset`.

## Teaching point

Good monitors are how you separate signal from noise. Production means a lot of traces, and the most important question is *which ones should I look at?* — monitors answer that.

Once signal-detection monitors are in place, the next move over time is **average-metric tracking** — picking quality metrics and watching them drift. The right way to choose those metrics is **error analysis**: look at a sample of the surprising traces you're now catching, group them by failure mode, and turn the failure modes into evaluators. The [monitoring lesson on the Academy](https://langfuse.com/academy/monitoring) goes deeper.

The traces you catch with these monitors are also the best source for `05-dataset` — they're real examples of behavior you want to lock in or fix.
