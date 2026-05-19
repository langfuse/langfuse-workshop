import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";
import { observe, propagateAttributes } from "@langfuse/tracing";
import type { ChatMessage, ChatRequest, ChatResponse } from "../shared/types";
import { env } from "./env";
import { resolveSupportPrompt } from "./prompt-manager";
import { getSupportContext } from "./support-data";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

function getRawOpenAIClient() {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  return new OpenAI({
    apiKey: env.openaiApiKey
  });
}

function toOpenAIMessages(
  messages: ChatMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

function readAssistantText(message: OpenAI.Chat.Completions.ChatCompletionMessage) {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  return "";
}

function parseToolArguments(argumentsText: string) {
  try {
    const parsed = JSON.parse(argumentsText);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return {};
  } catch {
    return null;
  }
}

const observedRunSupportConversation = observe(
  async (request: ChatRequest): Promise<ChatResponse> => {
    const context = getSupportContext();
    const prompt = await resolveSupportPrompt(context);
    const userId = request.userId ?? `workshop-${context.id}`;

    return propagateAttributes(
      {
        userId,
        sessionId: request.sessionId,
        traceName: "dad-it-support-chat-turn",
        tags: ["langfuse-workshop", "dad-it-support"],
        version: "0.2.0",
        metadata: {
          contextId: context.id,
          contextLabel: context.label
        }
      },
      async () => {
        const openai = observeOpenAI(getRawOpenAIClient(), {
          generationName: "openai-chat-completion",
          userId,
          sessionId: request.sessionId,
          tags: ["langfuse-workshop", "dad-it-support"],
          generationMetadata: {
            promptSource: prompt.promptSource,
            contextId: context.id,
            contextLabel: context.label
          },
          ...(prompt.langfusePrompt ? { langfusePrompt: prompt.langfusePrompt as never } : {})
        });

        const transcript: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: prompt.promptText
          },
          ...toOpenAIMessages(request.messages)
        ];
        const usedTools = new Set<string>();

        let finalAnswer = "";

        for (let attempt = 0; attempt < 6; attempt += 1) {
          const response = await openai.chat.completions.create({
            model: env.openaiModel,
            temperature: 0.2,
            messages: transcript,
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto"
          });

          const message = response.choices[0]?.message;

          if (!message) {
            throw new Error("OpenAI returned no assistant message.");
          }

          transcript.push(message as OpenAI.Chat.Completions.ChatCompletionMessageParam);

          const toolCalls = message.tool_calls ?? [];

          if (toolCalls.length === 0) {
            finalAnswer = readAssistantText(message);
            break;
          }

          for (const toolCall of toolCalls) {
            if (toolCall.type !== "function") {
              continue;
            }

            usedTools.add(toolCall.function.name);

            const parsedArguments = parseToolArguments(toolCall.function.arguments);
            const result =
              parsedArguments === null
                ? {
                    ok: false,
                    error: `The tool arguments for ${toolCall.function.name} were not valid JSON.`
                  }
                : await executeTool(toolCall.function.name, parsedArguments);

            transcript.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          }
        }

        if (!finalAnswer) {
          finalAnswer =
            "I ran out of room before finishing that answer. Please ask the question once more in a slightly shorter way.";
        }

        return {
          answer: finalAnswer,
          promptSource: prompt.promptSource,
          usedTools: [...usedTools],
          traceMeta: {
            contextId: context.id,
            contextLabel: context.label,
            model: env.openaiModel
          }
        };
      }
    );
  },
  {
    name: "dad-it-support-chat-turn",
    asType: "agent"
  }
);

export async function runSupportConversation(request: ChatRequest): Promise<ChatResponse> {
  return observedRunSupportConversation(request);
}
