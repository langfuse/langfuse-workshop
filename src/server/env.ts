import "./load-env";

export type LlmProvider = "openai" | "anthropic";

const DEFAULT_OPENAI_MODEL = "gpt-5.5-2026-04-23";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function resolveLlmProvider(source: {
  llmProvider?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}): LlmProvider {
  const requested = source.llmProvider?.trim().toLowerCase() ?? "";
  if (requested === "openai" || requested === "anthropic") {
    return requested;
  }
  if (requested) {
    throw new Error(
      `LLM_PROVIDER must be "openai" or "anthropic". Received "${source.llmProvider}".`
    );
  }
  if (source.anthropicApiKey && !source.openaiApiKey) {
    return "anthropic";
  }
  return "openai";
}

const llmProvider = resolveLlmProvider({
  llmProvider: process.env.LLM_PROVIDER,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
});

export const env = {
  port: Number(process.env.PORT ?? 8787),
  llmProvider,
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
  anthropicWorkspaceId: process.env.ANTHROPIC_WORKSPACE_ID ?? "",
  chatModel: llmProvider === "anthropic"
    ? process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL
    : process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
  langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  langfuseBaseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  langfusePromptName: process.env.LANGFUSE_PROMPT_NAME ?? "dad-it-support-agent",
  langfusePromptLabel: process.env.LANGFUSE_PROMPT_LABEL ?? "production",
  workshopPromptVariant: process.env.WORKSHOP_PROMPT_VARIANT ?? "default",
  datasetName: process.env.DATASET_NAME ?? "dad-it-support-workshop"
};

export function isLangfuseConfigured() {
  return Boolean(env.langfusePublicKey && env.langfuseSecretKey);
}
