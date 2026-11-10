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
- Goal is to find one improvement potential in scope and one failure mode

Potentials:

- there should be a significant set of traces where dad tries to get advice on his laptop as well, in two loose clusters: the printer and its paper, and the laptop Wi-Fi. Wording varies inside each cluster. Since we do not know which laptop he has, the answer says it depends on the laptop and then gives a Windows way and an Apple way. could be solved by adding the laptop as available context for the agent
- other than that what else?