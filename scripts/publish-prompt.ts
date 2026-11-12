import "../src/server/load-env";
import { LangfuseClient } from "@langfuse/client";
import { env } from "../src/server/env";
import { SYSTEM_PROMPT } from "../src/server/support-agent";

const PROMPT_VARIANTS = {
  default: SYSTEM_PROMPT,
  gentler: `${SYSTEM_PROMPT.trim()}

Tone variant:
- Be extra patient and reassuring when Dad seems uncertain.
- Use plain, familiar wording before technical terms.
- Start the answer with one brief confidence-building sentence.
`
} as const;

type WorkshopPromptVariant = keyof typeof PROMPT_VARIANTS;

function resolvePromptVariant(variantName: string): {
  name: WorkshopPromptVariant;
  prompt: string;
} {
  const normalizedVariantName = variantName.trim() || "default";

  if (normalizedVariantName in PROMPT_VARIANTS) {
    const name = normalizedVariantName as WorkshopPromptVariant;
    return { name, prompt: PROMPT_VARIANTS[name] };
  }

  throw new Error(
    `Unsupported WORKSHOP_PROMPT_VARIANT "${variantName}". ` +
      `Supported variants: ${Object.keys(PROMPT_VARIANTS).join(", ")}.`
  );
}

async function main() {
  const variant = resolvePromptVariant(env.workshopPromptVariant);

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
    prompt: variant.prompt,
    labels: [label]
  });

  console.log(`Published prompt "${name}" (${variant.name} variant) with label "${label}".`);
}

void main();
