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
- Goal is then one scope extension and one failure mode. The page closes with a general takeaway: Topics is a map of what the agent handles, how users feel, and where it fails. The facets are a starting point for expansion, for changes that a failure tile is pointing at, and for which evaluators to set up.

Potentials:

- Intent shows laptop help outside the iPhone the agent is built for: laptop Wi-Fi, and printing from the laptop. In one run the printing tile is "Laptop Printing Assistance" (29 traces). The answer always hedges Windows versus Apple. Specs is trying to help and is missing context. Provide it through `get_support_context` by adding the laptop next to the iPhone. A tile summary may call these replies unsupported. Read the traces first.
- Issues also shows repeated troubleshooting. In one run the tile is "Repeated Failed Troubleshooting" (30 traces): Dad says the steps failed and Specs sends the same list again. The fix could live in the system prompt: ask what he sees and try a different path.
- Issues can also flag mismatched help-library searches. In that same run the tile is "Mismatched Help Search Queries" (39 traces), shown on the page. Open them: the final answer is often still right. The follow-up is how useful the search library is, and which requests it has nothing for. Not a fix in the session.