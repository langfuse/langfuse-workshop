# 03 Prompt Management

Learner guide: [03 Prompt Management](../learner/03-prompt-management.md)

## Instructor notes

- The teaching point is the trace-to-prompt loop: every generation should link to the prompt version that produced it.
- Prefer the UI path first because it mirrors how non-engineers will edit prompts later.
- Keep the local `SYSTEM_PROMPT` as a resilience fallback, not as the source of truth once the prompt is published.

## Demo rhythm

1. Create `dad-it-support-agent` as a text prompt and label it `production`.
2. Fetch it with `LangfuseClient`.
3. Pass `langfusePrompt` into `observeOpenAI`.
4. Open a generation and show the Prompt badge.

## Watch for

- Prompt name/label mismatches between `.env` and Langfuse.
- Learners forgetting that the SDK fetches the `production` label by default.
