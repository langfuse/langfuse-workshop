import { getProfileById, searchGuides } from "./support-data";

type ToolResult = Record<string, unknown>;

export const TOOL_DEFINITIONS = [
  {
    name: "get_profile_context",
    description: "Look up the known device profile so device-specific guidance stays accurate.",
    input_schema: {
      type: "object" as const,
      properties: {
        profileId: {
          type: "string" as const,
          description: "The profile id for the parent device."
        }
      },
      required: ["profileId"]
    }
  },
  {
    name: "search_help_library",
    description: "Search the local device-help library for practical step-by-step instructions.",
    input_schema: {
      type: "object" as const,
      properties: {
        profileId: {
          type: "string" as const,
          description: "The profile id for the parent device."
        },
        question: {
          type: "string" as const,
          description: "The user's practical device question."
        }
      },
      required: ["profileId", "question"]
    }
  }
];

export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "get_profile_context": {
      const profileId = String(input.profileId ?? "");
      const profile = getProfileById(profileId);

      if (!profile) {
        return {
          ok: false,
          error: `Unknown profile: ${profileId}`
        };
      }

      return {
        ok: true,
        profile: {
          id: profile.id,
          label: profile.label,
          primaryDevice: profile.primaryDevice,
          deviceSummary: profile.deviceSummary,
          responseStyle: profile.responseStyle,
          scopeHighlights: profile.scopeHighlights,
          notableApps: profile.notableApps
        }
      };
    }

    case "search_help_library": {
      const profileId = String(input.profileId ?? "");
      const question = String(input.question ?? "");
      const guides = searchGuides(profileId, question);

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

    default:
      return {
        ok: false,
        error: `Unsupported tool: ${name}`
      };
  }
}

