## Overall storyline of the workshop

## Sample application:

A chat agent with two available tools that is anwering questions of the user.



Interesting failure modes:

-

# Goal:

Run the full AI Engineering loop and all related processes on the sample application to teach about Langfuse

## Tracing:

Building up the trace step by step for the chat agent.

## **Monitoring:**

### Error Analysis:

- We seed 15 sample traces with clear failure mode patterns into langfuse
- The learner runs error analysis in UI and annotates the data quickly identofying the failure modes
- the failure modes are getting clustered
- The page opens with why: concrete failures from real cases, an underspecified system prompt, a count you can prioritize, and a shared picture for engineers, domain experts, and PMs. It closes on the three decisions for this run, then points to topics.

Failure modes:

- Out of scope request that is responded to, e.g. asks for recipes, code snippets, something that is very adjacent but not the current core scope of the product
- Lengthy responses: responses are long and unstructured
- Additional interesting failure modes

### **Topics:**

- Topic seed data: a mix of on-topic requests, plus the cases below.
- First pass is the map: intent, sentiment, outcome, and issues, including where the product is working.
- Why: what the agent handles, how users feel, and where it fails. The facets start an expansion, a system change, or an evaluator.

Insights:

- The tool is used for something it was not initially made for.
- Sentiment is mostly calm, but some requests invoke frustration: all caps, pushback, or frustration expressed in other words.
- Repeated troubleshooting: after the user says it is not really helping, no better steps are provided.
- A mismatched information lookup where the final answer still worked out.

### Capture signals:

- A result of topics also was, that there are frustrated users
- Standard signals to capture: user disagreement + all-caps
- On top: Detect conversation signals with decision models
