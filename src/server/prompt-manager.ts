import {
  buildPromptVariables,
  compileLocalPrompt,
  getLocalPromptTemplate,
  type PromptVariant
} from "./local-prompt";
import type { SupportProfile } from "../shared/types";

export type ResolvedPrompt = {
  promptText: string;
  promptSource: "local" | "langfuse";
  linkedPrompt?: {
    name: string;
    version: number;
    isFallback: boolean;
  };
  variant: PromptVariant;
};

export async function resolveSupportPrompt(profile: SupportProfile): Promise<ResolvedPrompt> {
  const variant: PromptVariant = "baseline";
  const fallback = getLocalPromptTemplate(variant);
  const variables = buildPromptVariables(profile);

  return {
    promptText: compileLocalPrompt(fallback, variables),
    promptSource: "local",
    variant
  };
}

export async function publishSupportPrompt(_variant: PromptVariant) {
  throw new Error("Prompt publishing is introduced in the prompt-management checkpoint.");

  return {
    name: "",
    label: "",
    variant: "baseline" as PromptVariant
  };
}
