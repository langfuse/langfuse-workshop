"""FastAPI server for the Dad IT Support Agent. Mirrors src/server/index.ts."""

import logging

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse

from .env import CLIENT_DIST, env
from .support_agent import ChatRequest, ChatResponse, run_support_conversation
from .support_data import DEFAULT_SUPPORT_CONTEXT

logger = logging.getLogger("dad-it-support")

app = FastAPI(title="Dad IT Support Agent")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, error: RequestValidationError) -> PlainTextResponse:
    # The TS app answers invalid payloads with 400 + the validation message, not FastAPI's default 422.
    return PlainTextResponse(str(error), status_code=400)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "provider": "openai", "tracingConfigured": False}


@app.get("/api/support-context")
def support_context() -> dict:
    return DEFAULT_SUPPORT_CONTEXT


# A sync handler runs in FastAPI's threadpool, so the blocking OpenAI loop does not stall the event loop.
@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        return run_support_conversation(payload)
    except Exception as error:  # noqa: BLE001 - mirror the TS catch-all that returns 400
        logger.exception("Chat turn failed")
        return PlainTextResponse(str(error) or "Unknown server error", status_code=400)


# Serve the shared React build (repo-root dist/, produced by `npm run build:client`)
# and fall back to index.html for unknown routes, like the Express app.
@app.get("/{full_path:path}", include_in_schema=False)
def client_app(full_path: str):
    candidate = (CLIENT_DIST / full_path).resolve()
    if full_path and candidate.is_file() and CLIENT_DIST.resolve() in candidate.parents:
        return FileResponse(candidate)
    index_html = CLIENT_DIST / "index.html"
    if index_html.is_file():
        return FileResponse(index_html)
    return JSONResponse(
        {"error": "Client build not found. Run `npm run build:client` in the repo root."},
        status_code=404,
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    print(f"Dad IT Support Agent server listening on http://127.0.0.1:{env.port}")
    uvicorn.run(app, host="127.0.0.1", port=env.port)


if __name__ == "__main__":
    main()
