import OpenAI from "openai";
import { env } from "./env";

export const OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_LANGFUSE_GATEWAY_HOST = "https://gateway.cloud.langfuse.com";

export type ChatClientSource = {
  langfuseGatewayKey?: string;
  langfuseGatewayHost?: string;
  openaiApiKey?: string;
};

// LANGFUSE_GATEWAY_HOST is the gateway origin. Callers sometimes paste the
// OpenAI route (`.../openai/v1`) instead, so accept that form once.
export function gatewayOpenAIBaseURL(host?: string) {
  const trimmed = (host?.trim() || DEFAULT_LANGFUSE_GATEWAY_HOST).replace(/\/+$/, "");
  if (trimmed.endsWith("/openai/v1")) {
    return trimmed;
  }
  return `${trimmed}/openai/v1`;
}

export function resolveChatClientOptions(
  source: ChatClientSource
): ConstructorParameters<typeof OpenAI>[0] {
  const gatewayKey = source.langfuseGatewayKey?.trim() ?? "";
  if (gatewayKey) {
    return {
      apiKey: gatewayKey,
      baseURL: gatewayOpenAIBaseURL(source.langfuseGatewayHost)
    };
  }

  const openaiApiKey = source.openaiApiKey?.trim() ?? "";
  if (!openaiApiKey) {
    throw new Error(
      "Set LANGFUSE_GATEWAY_KEY to route model calls through the Langfuse AI Gateway, or set OPENAI_API_KEY to call OpenAI directly."
    );
  }

  return {
    apiKey: openaiApiKey,
    baseURL: OPENAI_BASE_URL
  };
}

export function assertChatConfigured() {
  resolveChatClientOptions(env);
}

export function chatClientOptions() {
  return resolveChatClientOptions(env);
}
