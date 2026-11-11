## Overall storyline of the workshop

Sample application:

A chat agent with two available tools that is anwering questions of the user.

Goal:

Run the full AI Engineering loop and all related processes on the sample application to teach about Langfuse

Tracing:

To properly

Monitoring:

### Error Analysis:

- We seed 15 sample traces with clear failure mode patterns into langfuse
- The learner runs error analysis in UI and annotates the data quickly identofying the failure modes
- the failure modes are getting clustered

Failure modes:

- Out of scope request that is responded to, e.g. asks for recipes, investment advice, laptop support
- Impersonation: AI reponds as if it is a kid of dad instead of disclosing it is an agent
- Lengthy responses: responses are long and unstructured

### **Topics:**

- We seed 200 sample traces with all kinds of lengths and requests
- First pass is exploration: intent, sentiment, outcome, and issues show the classes of requests and how they landed, including where the product is working. Sentiment keeps a large neutral tile and splits frustration across a few smaller ones. Open "Frustration with connectivity difficulties": Dad is frustrated that the laptop would not reconnect to Wi-Fi. That hands off to conversation signals (disagreement and all-caps).
- Goal is then one scope extension and one failure mode

Potentials:

- Intent shows laptop clusters (printer and paper, laptop Wi-Fi), about thirty traces each so they are among the larger tiles. The answer always hedges Windows versus Apple. Add the laptop next to the iPhone in the support context so Specs can answer for that machine. This is a chance to widen the product, not a refusal. The same hedge shows up under Issues as generic guidance that never asks which device it is.
- Issues also shows repeated troubleshooting: Dad says the steps failed and Specs sends the same list again. Fix in the system prompt: ask what he sees and try a different path.
- Issues can also flag off-target help-library searches. Open them: the final answer is often still right. The follow-up is how useful the search library is, and which requests it has nothing for. Not a fix in the session.