import OpenAI from "openai";
import { env } from "./env";

// One OpenAI SDK client for both providers. Claude is reached through
// Anthropic's OpenAI-compatible endpoint, so observeOpenAI still traces it.
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1/";

export function assertChatConfigured() {
  if (env.llmProvider === "anthropic") {
    if (!env.anthropicApiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic, or when it is the only model key."
      );
    }
    return;
  }

  if (!env.openaiApiKey) {
    throw new Error("Set OPENAI_API_KEY, or set ANTHROPIC_API_KEY to run the agent with Claude.");
  }
}

export function chatClientOptions(): ConstructorParameters<typeof OpenAI>[0] {
  assertChatConfigured();

  if (env.llmProvider === "anthropic") {
    return {
      apiKey: env.anthropicApiKey,
      baseURL: ANTHROPIC_BASE_URL,
      ...(env.anthropicWorkspaceId
        ? { defaultHeaders: { "anthropic-workspace-id": env.anthropicWorkspaceId } }
        : {})
    };
  }

  return { apiKey: env.openaiApiKey };
}

// Anthropic's compatibility layer accepts json_schema with strict: true and
// rejects json_object. OpenAI keeps the existing json_object judge request.
export function correctnessResponseFormat(): OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"] {
  if (env.llmProvider !== "anthropic") {
    return { type: "json_object" };
  }

  return {
    type: "json_schema",
    json_schema: {
      name: "correctness",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          score: { type: "boolean" },
          reasoning: { type: "string" }
        },
        required: ["score", "reasoning"]
      }
    }
  };
}
