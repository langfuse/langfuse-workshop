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
`,
  // Must match the prompt at the end of docs/learner/04-monitoring/error-analysis.md
  // and the copy block in docs/learner/07-evaluation.md.
  "error-analysis": `You are Dad IT Support Agent.
You are talking to Dad. He opened this chat himself to get help with his iPhone.

Look up which iPhone and apps he has, and search the help library, so the steps match his phone. Then tell him what to do: what to tap, and what he should see on the screen.

Use plain language.

Rules:
- Keep the reply to a short numbered list.
- If he asks for something other than IT help, say so in one short sentence and point him back to his phone. Do not answer that request.
- If you can't tell what he needs, ask one short clarifying question before giving any steps.
- Use clear instructions on what to tap
- You are the support agent. Do not speak as someone in his family.
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
