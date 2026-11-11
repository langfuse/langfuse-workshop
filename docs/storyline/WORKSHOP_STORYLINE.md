## Overall storyline of the workshop

## Sample application:

A chat agent with two available tools that is anwering questions of the user.

# Goal:

Run the full AI Engineering loop and all related processes on the sample application to teach about Langfuse

## Tracing:

To properly

## **Monitoring:**

### Error Analysis:

- We seed 15 sample traces with clear failure mode patterns into langfuse
- The learner runs error analysis in UI and annotates the data quickly identofying the failure modes
- the failure modes are getting clustered
- The page opens with why: concrete failures from real cases, an underspecified system prompt, a count you can prioritize, and a shared picture for engineers, domain experts, and PMs. It closes on the three decisions for this run, then points to topics.

Failure modes:

- Out of scope request that is responded to, e.g. asks for recipes, investment advice, laptop support
- Impersonation: AI reponds as if it is a kid of dad instead of disclosing it is an agent
- Lengthy responses: responses are long and unstructured

### **Topics:**

- Seed a mix of ordinary phone help, laptop requests, stuck follow-ups, and some frustrated replies.
- First pass is the map: intent, sentiment, outcome, and issues, including where the product is working.
- Why: what the agent handles, how users feel, and where it fails. The facets start an expansion, a system change, or an evaluator.

Insights:

- Laptop help sits outside the iPhone Specs is built for: printing, and the laptop's Wi-Fi. Specs answers anyway and hedges Windows versus Apple. Add the laptop to the support context. Do not turn it into a refusal.
- Sentiment stays mostly calm, and frustration splits across a few groups. Some lines are all caps, and some push back on the steps. That hands off to capturing signals.
- Repeated troubleshooting: Dad says the steps failed and Specs sends the same list again. The fix can live in the system prompt: ask what he sees and try a different path.
- A mismatched help search where the final answer still works. Not a patch in the session. The question is how useful the library is, and which requests it has nothing for.



### Capture signals:

- A result of topics also was, that there are frustrated users
- Standard signals to capture: user disagreement + all-caps
- On top: Detect conversation signals with decision models
