import type { SpanContext } from "@opentelemetry/api";
import OpenAI from "openai";
import { observe } from "@langfuse/tracing";
import { getSupportContext, searchGuides } from "./support-data";

type ToolResult = Record<string, unknown>;

export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_support_context",
      description: "Look up Dad's known device setup so the answer stays grounded.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_help_library",
      description: "Search the local help library for practical step-by-step device instructions.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "Dad's practical device question."
          }
        },
        required: ["question"],
        additionalProperties: false
      }
    }
  }
];

async function readSupportContext() {
  const context = getSupportContext();

  return {
    ok: true,
    context: {
      id: context.id,
      label: context.label,
      devices: context.devices,
      deviceSummary: context.deviceSummary,
      responseStyle: context.responseStyle,
      scopeHighlights: context.scopeHighlights,
      notableApps: context.notableApps
    }
  };
}

async function searchHelpLibrary(input: { question: string }) {
  const guides = searchGuides(input.question);

  return {
    ok: true,
    results: guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      summary: guide.summary,
      steps: guide.steps,
      caution: guide.caution ?? null
    }))
  };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  parentSpanContext?: SpanContext
): Promise<ToolResult> {
  switch (name) {
    case "get_support_context":
      return observe(readSupportContext, {
        name: "get_support_context",
        asType: "tool",
        parentSpanContext
      })();

    case "search_help_library":
      return observe(searchHelpLibrary, {
        name: "search_help_library",
        asType: "tool",
        parentSpanContext
      })({
        question: String(input.question ?? "")
      });

    default:
      return {
        ok: false,
        error: `Unsupported tool: ${name}`
      };
  }
}
