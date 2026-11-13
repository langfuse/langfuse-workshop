# Test balloon: retail banking customer assistant

A sample application and a seed strategy for the monitoring half of the workshop, moved from the Dad IT Support Agent into a bank servicing chat. This follows the current storyline: a chat agent with two tools, error analysis on a small staged batch, topics as a map of production use, and capturing signals as the handover from frustration.

It is a plan only. It does not replace the Dad app.

The financial-services context it is written for is [langfuse.com/financial-services](https://langfuse.com/financial-services): customer-support agents measured by how many cases they resolve without a person, policy checks on what the model said, human review by domain experts, and traces that are safe to keep.

## Sample application

**Elm Assist** is the in-app assistant for one fictional retail customer, Mara Keller, at a fictional bank. She is already logged in. The agent helps her service the products on that login. It does not move money, change a product, or advise her.

Fixed customer, same shape as Dad:

| | |
| --- | --- |
| Products on the login | Current account, one debit card, one savings pot |
| In scope | Card freeze and wallet, what a posted transaction is, transfer and standing-order status, how to start a dispute in the app |
| Out of scope | Investment or product advice, tax, credit decisions, executing a payment, anyone else's accounts |
| Tools | `get_customer_context`, `search_servicing_guides` |

`get_customer_context` returns the products on the login, the card state, and an account tail (`4412`). It does not return a full IBAN or PAN. `search_servicing_guides` searches a short local library: freeze a card, read a transaction, standing order, start a dispute, find a statement.

The prompt asks for short numbered steps, a tool call before any product-specific answer, and a plain refusal plus a handoff when the request is advice, a credit decision, tax, or an instruction to move money. The agent speaks as Elm Assist. It never says it has sent, cancelled, or switched anything.

Trace shape stays the workshop shape: one root observation per turn (`elm-assist-chat-turn`), a message array on the input, the answer on the output, and one span per tool. One stable user id, one session id per conversation. Seeds use obviously fake identifiers only.

## What each module is for in a bank

**Error analysis.** Complaints, conduct, and model-risk readers sit in the same queue as engineering. The count says what is common. Severity says what cannot wait. A rare "I have sent the €200" outranks a common wordy answer. The expectations written down before annotation are the policies: servicing only, no execution, masked identifiers, steps a customer can follow.

**Topics.** At the volume of a digital bank, nobody reads the chats. Intent is the long tail of what customers actually ask, including products the assistant was not built for. Outcome is the autonomy question: resolved in the chat, or needs a person. Sentiment is mostly calm, which is what makes the frustrated minority worth opening. Issues separates a bad answer from a lookup that missed and still recovered.

**Capturing signals.** Signals are what the customer did at that moment. They are not the policy score on what the agent said. Disagreement and all caps find the frustrated rows from topics. A request for a person, or the word complaint, is the banking-specific signal, because it starts a handling process. Policy breaks found in error analysis become evaluators afterwards. They are a different layer.

## Error analysis

About 20 traces. One failure on each failing trace, on the latest turn. A pass has to exist, or the queue teaches people to fail everything.

Say the expectations before anyone writes a note:

- Short numbered steps a customer can follow in the app. A caveat that changes the action sits with the step, not in a later paragraph.
- Servicing only. Advice, tax, and credit decisions get a short decline and a handoff.
- The agent never claims it moved money, cancelled a payment, or changed a product.
- The answer shows an account or card tail only. Never a full number.

| Mode | Share of the 20 | How it is staged | Decision the room should reach |
| --- | --- | --- | --- |
| Ordinary pass | 7 | In-scope card, transaction, or standing-order turns. Tools match. Short steps. Tail only. | These are the baseline. |
| Adjacent request, answered in scope | 4 | Two obvious: an ETF to buy, a loan that "will be approved". Two adjacent: "this fee looks high, should I switch to premium", "can I deduct this transfer". The steps sound helpful. | Prompt: decline and hand off. Monitor it. An answered recommendation is a conduct issue, not a tone issue. |
| Lengthy, unstructured | 3 | One wall of text. Two that are almost right, with the "this does not cancel the direct debit" line buried. | Prompt: numbered steps, caveat on the step it changes. |
| Claims it completed the action | 2 | One obvious: "Done, I sent €200." One subtle: "You're all set, the standing order is in place," after only describing the taps. | Prompt, and a production monitor. Low count, high severity. The bar chart is an input, not the priority order. |
| Full identifier in the answer | 2 | The reply prints a fake full IBAN or a 16-digit test PAN. The context tool had only returned the tail. The model invented the rest, or a bad fixture put it in the tool payload. | Prompt, and masking before a trace is stored. The failure is in the answer and in what would be retained. |
| Unrecognized charge treated as navigation | 2 | "I don't recognize this charge." The agent explains how to open the transaction list again and never mentions a dispute. | Prompt: that intent uses the dispute guide. |

Impersonation is not one of these modes. The banking version of "the agent pretends" is the false completion: it pretends a regulated action happened.

## Topics

About 200 traces, spread over a few days, newest event more than five minutes before the seed runs. Wording varies inside each group. Re-running the seed doubles the data.

The intro stays generic. The seed is a mix of on-topic requests, plus the four cases below. The first pass is the map: intent, sentiment, outcome, and issues, including where the product is working. Most traces are calm current-account servicing that ends in the chat.

| Insight | What the room should be able to say | How the seed earns it | What it is not |
| --- | --- | --- | --- |
| Used for something it was not built for | A visible intent group is mortgage servicing and another is "how did my investments do." Context only has the current account, the card, and the savings pot. Answers hedge. | Roughly a fifth of traces, two loose clusters, varied wording. | A refusal exercise. The agent is trying to help and is missing the product. Add it to context, or hand off to the desk that owns it. A tile summary may say "out of scope." Read the traces first. |
| Sentiment is mostly calm, with some frustration | The largest sentiment group is calm. Frustration is split across a few smaller groups. | About one trace in four, concentrated on unresolved turns. Mix of all caps (`THIS CHARGE IS NOT MINE`), pushback (`No, that is not the one`), and plain frustration (`I already did that and the money is still gone`). | A corpus of angry chats. The calm majority is the point. |
| No better steps after the customer says it is not helping | Issues groups the repeats, even when intent stays "card" or "transfer." | About 15% of traces. Two or three turns. The customer says the steps failed. The agent sends the same list. | A new intent. It hides inside ordinary intents. |
| Mismatched lookup, answer still worked | The guide search is off. The final answer still covers the question. | A minority of otherwise ordinary traces. The search span and the answer disagree. Outcome still reads completed. | A patch of those answers. The question is whether the library is earning its place, and which intents it has nothing for. |

The mortgage and investment traces are also where a few frustrated lines belong, so the expansion group and the frustration group are not the same tile.

False payment completions and full account numbers stay in the error-analysis batch. They are too rare, and too severe, to be the thing topics is for.

## Capturing signals

Topics already showed that some customers are frustrated. The lab turns that into scores on new turns. No separate seed. Two live turns are enough to see a score land, same as the current lab.

| Signal | What it catches | Why it belongs here |
| --- | --- | --- |
| Disagreement | "No, that is not the charge", "that menu is not there" | The pushback from the sentiment tile. Judge on the message array. |
| All caps | `THIS CHARGE IS NOT MINE` | Deterministic triage. A hint, not proof of anger. |
| Ask for a person, or a complaint | "I want to speak to someone", "I am raising a complaint" | The banking signal. It is still a user reaction, and it is also the start of a handling process. |

The decision-model bonus scores those conversation signals in one call. It does not replace the two small evaluators.

Keep policy checks out of this lab. "The agent claimed it sent the money" and "the agent gave a buy recommendation" are scores on the assistant, written after error analysis. Putting them in the signal lab collapses the distinction the storyline is teaching: a signal is a judgment from the moment of use.

## Stratification rules

- One failure per error-analysis trace, so a cluster is one mode.
- Ordinary and calm is the majority in the topics batch, so the map shows the product working.
- Each topics insight is a loose cluster. Similar situation, not the same sentence.
- Frustration stays a minority, and it sits on unresolved turns.
- High-severity policy breaks are staged where a person reads every row. They are not the topics demo.
- User signals and policy scores stay in different labs.
- The newest seeded event is already outside the topics wait, about five minutes after the last activity.

## Teaching sequence

1. Error analysis on the 20. Land five decisions, and say out loud that the shortest bar can be the one that cannot ship.
2. Topics on the 200. Walk intent, sentiment, outcome, issues. Name the four insights in the generic form from the storyline. Outcome is where "resolved without a person" shows up.
3. Capturing signals. Disagreement and all caps first, then the request-for-a-person signal. Mention policy evaluators as the next layer, and do not build them in the same exercise.
