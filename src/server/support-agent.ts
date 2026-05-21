import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";
import { observe, propagateAttributes } from "@langfuse/tracing";
import { LangfuseClient } from "@langfuse/client";
import type { ChatMessage, ChatRequest, ChatResponse } from "../shared/types";
import { env, isLangfuseConfigured } from "./env";
import { getSupportContext } from "./support-data";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

// --- The system prompt the agent runs on, kept here as a plain constant.
//     Prompt management (step 03) publishes this to Langfuse and the agent
//     fetches it back at request time, with this constant as the fallback.
export const SYSTEM_PROMPT = `You are Dad IT Support Agent.
You are talking directly to Dad. He opened this chat himself to get help with his iPhone.

You do not yet know which iPhone Dad has or which apps he uses — call get_support_context to find out before giving any device-specific instructions.

Rules:
- Speak directly to Dad in second person ("you", "your iPhone"). Never refer to Dad in the third person.
- Call get_support_context as your very first tool call on each turn so you know which iPhone, iOS, and apps Dad has.
- For step-by-step help, call search_help_library before giving the final answer.
- Use short numbered steps with one action per line.
- Mention what Dad should expect to see on his screen after important taps.
- Be honest about limits. You cannot see his screen, passwords, or real-time location.
- If the request is out of scope, say so kindly and redirect to the closest iPhone-help you can give.
- Do not invent button names or settings paths that were not confirmed by tool results.
`;

let langfuse: LangfuseClient | null = null;

// Returns the active Langfuse-managed prompt for this request, or null if
// Langfuse prompt management isn't configured (the caller falls back to
// the local SYSTEM_PROMPT). The `fallback` option on `prompt.get` covers
// the case where Langfuse is reachable but the fetch fails.
async function getPrompt() {
  if (!isLangfuseConfigured() || !env.langfusePromptName) {
    return null;
  }
  langfuse ??= new LangfuseClient();
  return await langfuse.prompt.get(env.langfusePromptName, {
    fallback: SYSTEM_PROMPT,
    cacheTtlSeconds: process.env.NODE_ENV === "development" ? 0 : 60
  });
}

// One-call OpenAI client factory: returns a Langfuse-observed client.
// Options forward straight to observeOpenAI (per-generation name, tags,
// langfusePrompt, etc.) so the call sites stay minimal between steps.
type ObserveOpenAIOptions = Parameters<typeof observeOpenAI>[1];

function getOpenAIClient(options?: ObserveOpenAIOptions) {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }
  return observeOpenAI(new OpenAI({ apiKey: env.openaiApiKey }), options);
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

async function runSupportConversationInner(request: ChatRequest): Promise<ChatResponse> {
  const context = getSupportContext();
  const langfusePrompt = await getPrompt();
  const systemPrompt = langfusePrompt ? langfusePrompt.compile() : SYSTEM_PROMPT;
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
      const openai = getOpenAIClient({
        generationName: "openai-chat-completion",
        userId,
        sessionId: request.sessionId,
        tags: ["langfuse-workshop", "dad-it-support"],
        generationMetadata: {
          contextId: context.id,
          contextLabel: context.label
        },
        ...(langfusePrompt ? { langfusePrompt: langfusePrompt as never } : {})
      });

      const transcript: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
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
          if (toolCall.type !== "function") continue;
          usedTools.add(toolCall.function.name);
          const parsedArguments = parseToolArguments(toolCall.function.arguments);
          const result =
            parsedArguments === null
              ? { ok: false, error: `The tool arguments for ${toolCall.function.name} were not valid JSON.` }
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
        usedTools: [...usedTools],
        traceMeta: {
          contextId: context.id,
          contextLabel: context.label,
          model: env.openaiModel
        }
      };
    }
  );
}

export const runSupportConversation = observe(runSupportConversationInner, {
  name: "dad-it-support-chat-turn",
  asType: "agent"
});
