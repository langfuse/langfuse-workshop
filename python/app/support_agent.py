"""OpenAI tool-calling loop for the Dad IT Support Agent."""

import json
from typing import Any, Literal

from openai import OpenAI
from openai.types.chat import ChatCompletionMessage
from pydantic import BaseModel, Field

from .env import env
from .support_data import get_support_context
from .tools import TOOL_DEFINITIONS, execute_tool

SYSTEM_PROMPT = """You are Dad IT Support Agent.
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
"""

MAX_TURNS = 6
FALLBACK_ANSWER = (
    "I ran out of room before finishing that answer. "
    "Please ask the question once more in a slightly shorter way."
)


# Request/response models for the chat API: session id required, at least one message.
class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)
    timestamp: str


class ChatRequest(BaseModel):
    sessionId: str = Field(min_length=1)
    userId: str | None = None
    messages: list[ChatMessage] = Field(min_length=1)


class TraceMeta(BaseModel):
    contextId: str
    contextLabel: str
    model: str


class ChatResponse(BaseModel):
    answer: str
    usedTools: list[str]
    traceMeta: TraceMeta


def _to_openai_messages(messages: list[ChatMessage]) -> list[dict[str, Any]]:
    return [{"role": message.role, "content": message.content} for message in messages]


def _parse_tool_arguments(arguments_text: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(arguments_text)
    except (json.JSONDecodeError, TypeError):
        return None
    return parsed if isinstance(parsed, dict) else {}


def _to_assistant_message(message: ChatCompletionMessage) -> dict[str, Any]:
    # Echo back only the fields the Chat Completions API accepts on an assistant message.
    assistant: dict[str, Any] = {"role": "assistant", "content": message.content}
    if message.tool_calls:
        assistant["tool_calls"] = [
            {
                "id": tool_call.id,
                "type": "function",
                "function": {"name": tool_call.function.name, "arguments": tool_call.function.arguments},
            }
            for tool_call in message.tool_calls
            if tool_call.type == "function"
        ]
    return assistant


def run_support_conversation(request: ChatRequest) -> ChatResponse:
    context = get_support_context()
    client = OpenAI(api_key=env.openai_api_key or None)

    transcript: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_to_openai_messages(request.messages),
    ]
    used_tools: list[str] = []
    final_answer = ""

    for _ in range(MAX_TURNS):
        response = client.chat.completions.create(
            model=env.openai_model,
            messages=transcript,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
        )

        if not response.choices:
            raise RuntimeError("OpenAI returned no assistant message.")
        message = response.choices[0].message
        transcript.append(_to_assistant_message(message))

        tool_calls = message.tool_calls or []
        if not tool_calls:
            final_answer = message.content.strip() if isinstance(message.content, str) else ""
            break

        for tool_call in tool_calls:
            if tool_call.type != "function":
                continue
            name = tool_call.function.name
            if name not in used_tools:
                used_tools.append(name)
            parsed_arguments = _parse_tool_arguments(tool_call.function.arguments)
            result = (
                {"ok": False, "error": f"The tool arguments for {name} were not valid JSON."}
                if parsed_arguments is None
                else execute_tool(name, parsed_arguments)
            )
            transcript.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )

    if not final_answer:
        final_answer = FALLBACK_ANSWER

    return ChatResponse(
        answer=final_answer,
        usedTools=used_tools,
        traceMeta=TraceMeta(
            contextId=context["id"],
            contextLabel=context["label"],
            model=env.openai_model,
        ),
    )
