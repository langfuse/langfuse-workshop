import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatRequest, ChatResponse } from "../shared/types";
import { env } from "./env";
import { resolveSupportPrompt } from "./prompt-manager";
import { getProfileById } from "./support-data";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

const anthropic = new Anthropic({
  apiKey: env.anthropicApiKey || undefined
});

function toAnthropicMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function readTextBlocks(blocks: Array<{ type: string; text?: string }>) {
  return blocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n\n")
    .trim();
}

export async function runSupportConversation(
  request: ChatRequest
): Promise<{ span: unknown; result: ChatResponse }> {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing.");
  }

  const profile = getProfileById(request.profileId);

  if (!profile) {
    throw new Error(`Unknown profile: ${request.profileId}`);
  }

  const prompt = await resolveSupportPrompt(profile);
  const transcript = toAnthropicMessages(request.messages);
  const usedTools = new Set<string>();
  let finalAnswer = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await anthropic.messages.create({
      model: env.anthropicModel,
      max_tokens: 700,
      temperature: 0.2,
      system: prompt.promptText,
      messages: transcript,
      tools: TOOL_DEFINITIONS
    });

    transcript.push({
      role: "assistant",
      content: response.content as unknown as string
    });

    const toolUses = response.content.filter((block) => block.type === "tool_use");

    if (toolUses.length === 0) {
      finalAnswer = readTextBlocks(response.content);
      break;
    }

    const toolResults = [];

    for (const toolUse of toolUses) {
      usedTools.add(toolUse.name);

      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result, null, 2)
      });
    }

    transcript.push({
      role: "user",
      content: toolResults as unknown as string
    });
  }

  if (!finalAnswer) {
    finalAnswer =
      "I ran out of room before finishing that answer. Please ask the question once more in a slightly shorter way.";
  }

  return {
    span: null,
    result: {
      answer: finalAnswer,
      promptSource: prompt.promptSource,
      usedTools: [...usedTools],
      traceMeta: {
        profileId: profile.id,
        profileLabel: profile.label,
        model: env.anthropicModel
      }
    }
  };
}
