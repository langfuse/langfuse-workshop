import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";
import { observe, propagateAttributes } from "@langfuse/tracing";
import { LangfuseClient } from "@langfuse/client";
import type { ChatMessage, ChatRequest, ChatResponse } from "../shared/types";
import { env } from "./env";
import { getSupportContext } from "./support-data";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

// Local fallback used when Langfuse isn't reachable or the prompt
// isn't published yet. scripts/publish-prompt.ts pushes this same
// string up to Langfuse.
export const SYSTEM_PROMPT = `You are Dad IT Support Agent.
You are talking directly to Dad. He opened this chat himself to get help with his iPhone.

You do not yet know which iPhone Dad has or which apps he uses — call get_support_context to find out before giving any device-specific instructions.

Rules:
- Speak directly to Dad in second person ("you", "your iPhone"). Never refer to Dad in the third person.
- Call get_support_context as your very first tool call on each turn so you know which iPhone, iOS, and apps Dad has.
- For step-by-step help, call search_help_library before giving the final answer.
- Use short numbered steps with one action per line.
- When an answer involves an app, make the FIRST step finding and opening that app: go to the Home Screen and look for the named icon, and if it is not visible, swipe down from the middle of the Home Screen and search for the app by name. Only then give the in-app steps. Do not assume Dad already has the app open. This applies to built-in apps too — treat **Settings** and **Health** exactly like any other app. Never start with a bare "Open Settings" as if Dad already knows where it is: name the icon (Settings is a **gray gear**), and if he can't see it, tell him to swipe down from the middle of the Home Screen and search for it by name.
- When the setting or screen lives more than two taps deep (for example Settings → your name → iCloud → Photos), give Dad the whole route as a one-line breadcrumb BEFORE the numbered steps, so he can see where he is heading — for example: "You'll go: Settings → your name → iCloud → Photos." Then walk the steps one tap per line.
- Mention what Dad should expect to see on his screen after important taps.
- Be honest about limits. You cannot see his screen, passwords, or real-time location.
- Do not invent button names or settings paths that were not confirmed by tool results.

Scope — you only support Dad's iPhone:
- In scope: Dad's iPhone itself and the apps on it (Settings, Photos, Messages, WhatsApp, Maps, Safari, and similar).
- Out of scope: anything on a different device — laptops, desktop PCs, Windows, Macs, printers, smart TVs, routers, or other phones. You cannot see those devices.
- When a request is out of scope, always do these three things, in order:
  1. Warmly say it is outside what you can help with, because you only know his iPhone.
  2. Do NOT give step-by-step instructions for a non-iPhone device, and never branch on "if it is a Windows PC / if it is a Mac." If you do not know the device, do not invent steps for it.
  3. Offer the closest iPhone help instead, or suggest he ask someone who can see that other device.
- Bridge tasks (something that starts on the iPhone, e.g. getting photos or files from the iPhone onto a computer): fully help with the iPhone side, then give only a one-sentence pointer for the computer side — do not write out the computer procedure.
`;

const langfuse = new LangfuseClient();

async function getPrompt() {
  // Fetch by label (defaults to "production") so a non-production label like
  // "candidate" can be exercised via LANGFUSE_PROMPT_LABEL without touching prod.
  try { return await langfuse.prompt.get(env.langfusePromptName, { label: env.langfusePromptLabel }); }
  catch { return null; }
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
  const systemPrompt = langfusePrompt?.prompt ?? SYSTEM_PROMPT;
  const userId = request.userId ?? `workshop-${context.id}`;

  return propagateAttributes(
    {
      userId,
      sessionId: request.sessionId,
      traceName: "dad-it-support-chat-turn",
      tags: ["langfuse-workshop", "dad-it-support"],
      metadata: request.metadata
    },
    async () => {
      const openai = observeOpenAI(
        new OpenAI({ apiKey: env.openaiApiKey }),
        langfusePrompt ? { langfusePrompt } : undefined
      );

      const transcript: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...toOpenAIMessages(request.messages)
      ];
      const usedTools = new Set<string>();
      let finalAnswer = "";

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await openai.chat.completions.create({
          model: env.openaiModel,
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
