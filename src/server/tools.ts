import OpenAI from "openai";
import { observe } from "@langfuse/tracing";
import { getSupportContext, searchGuides } from "./support-data";

type ToolResult = Record<string, unknown>;

// The tools read local data and would finish in under 1 ms, which makes them
// look like zero-length spans in Langfuse. A small fake delay stands in for the
// network/database latency a real support tool would have.
const simulateLatency = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const getSupportContextTool = observe(
  async () => {
    await simulateLatency(150);
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
  },
  { name: "get_support_context", asType: "tool" }
);

const searchHelpLibraryTool = observe(
  async (input: { question: string }) => {
    await simulateLatency(300);
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
  },
  { name: "search_help_library", asType: "tool" }
);

export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "get_support_context":
      return getSupportContextTool();
    case "search_help_library":
      return searchHelpLibraryTool({ question: String(input.question ?? "") });
    default:
      return { ok: false, error: `Unsupported tool: ${name}` };
  }
}
