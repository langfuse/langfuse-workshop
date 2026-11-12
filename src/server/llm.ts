import OpenAI from "openai";
import { env, type LlmProvider } from "./env";

// One OpenAI SDK client for the gateway, OpenAI, and Claude. A gateway key
// uses the Langfuse AI Gateway OpenAI route. Claude is reached through
// Anthropic's OpenAI-compatible endpoint, so observeOpenAI still traces it.
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1/";
export const OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_LANGFUSE_GATEWAY_HOST = "https://gateway.cloud.langfuse.com";

export type ChatClientSource = {
  langfuseGatewayKey?: string;
  langfuseGatewayHost?: string;
  llmProvider: LlmProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  anthropicWorkspaceId?: string;
};

export function gatewayOpenAIBaseURL(host?: string) {
  const trimmed = (host?.trim() || DEFAULT_LANGFUSE_GATEWAY_HOST).replace(/\/+$/, "");
  if (trimmed.endsWith("/openai/v1")) {
    return trimmed;
  }
  return `${trimmed}/openai/v1`;
}

export function chatClientOptions(
  source: ChatClientSource = env
): ConstructorParameters<typeof OpenAI>[0] {
  const gatewayKey = source.langfuseGatewayKey?.trim() ?? "";
  if (gatewayKey) {
    return {
      apiKey: gatewayKey,
      baseURL: gatewayOpenAIBaseURL(source.langfuseGatewayHost)
    };
  }

  if (source.llmProvider === "anthropic") {
    if (!source.anthropicApiKey?.trim()) {
      throw new Error(
        "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic, or when it is the only model key."
      );
    }
    return {
      apiKey: source.anthropicApiKey,
      baseURL: ANTHROPIC_BASE_URL,
      ...(source.anthropicWorkspaceId?.trim()
        ? { defaultHeaders: { "anthropic-workspace-id": source.anthropicWorkspaceId.trim() } }
        : {})
    };
  }

  const openaiApiKey = source.openaiApiKey?.trim() ?? "";
  if (!openaiApiKey) {
    throw new Error(
      "Set LANGFUSE_GATEWAY_KEY to route model calls through the Langfuse AI Gateway, set OPENAI_API_KEY to call OpenAI directly, or set ANTHROPIC_API_KEY to run the agent with Claude."
    );
  }

  return {
    apiKey: openaiApiKey,
    baseURL: OPENAI_BASE_URL
  };
}

export function assertChatConfigured() {
  chatClientOptions();
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
