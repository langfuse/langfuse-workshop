import "dotenv/config";
import { LangfuseClient } from "@langfuse/client";
import { env } from "../src/server/env";
import { SYSTEM_PROMPT } from "../src/server/support-agent";

async function main() {
  if (!env.langfusePublicKey || !env.langfuseSecretKey) {
    throw new Error("Langfuse credentials are required to publish prompts.");
  }

  const langfuse = new LangfuseClient({
    publicKey: env.langfusePublicKey,
    secretKey: env.langfuseSecretKey,
    baseUrl: env.langfuseBaseUrl
  });

  const name = env.langfusePromptName || "dad-it-support-agent";
  const label = env.langfusePromptLabel || "production";

  await langfuse.prompt.create({
    name,
    type: "text",
    prompt: SYSTEM_PROMPT,
    labels: [label]
  });

  console.log(`Published prompt "${name}" with label "${label}".`);
}

void main();
