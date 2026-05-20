export const env = {
  port: Number(process.env.PORT ?? 8787),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.5-2026-04-23",
  langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  langfuseBaseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  langfusePromptName: process.env.LANGFUSE_PROMPT_NAME ?? "dad-it-support-agent",
  langfusePromptLabel: process.env.LANGFUSE_PROMPT_LABEL ?? "production",
  datasetName: process.env.DATASET_NAME ?? "dad-it-support-workshop"
};

export function isLangfuseConfigured() {
  return Boolean(env.langfusePublicKey && env.langfuseSecretKey);
}
