"""Tool definitions and executor for the Dad IT Support Agent."""

from typing import Any

from .support_data import get_support_context, search_guides

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_support_context",
            "description": "Look up Dad's known device setup so the answer stays grounded.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_help_library",
            "description": "Search the local help library for practical step-by-step device instructions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "Dad's practical device question.",
                    }
                },
                "required": ["question"],
                "additionalProperties": False,
            },
        },
    },
]


def execute_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name == "get_support_context":
        context = get_support_context()
        return {
            "ok": True,
            "context": {
                "id": context["id"],
                "label": context["label"],
                "devices": context["devices"],
                "deviceSummary": context["deviceSummary"],
                "responseStyle": context["responseStyle"],
                "scopeHighlights": context["scopeHighlights"],
                "notableApps": context["notableApps"],
            },
        }

    if name == "search_help_library":
        question = args.get("question")
        guides = search_guides("" if question is None else str(question))
        return {
            "ok": True,
            "results": [
                {
                    "id": guide["id"],
                    "title": guide["title"],
                    "summary": guide["summary"],
                    "steps": guide["steps"],
                    "caution": guide.get("caution"),
                }
                for guide in guides
            ],
        }

    return {"ok": False, "error": f"Unsupported tool: {name}"}
