.PHONY: setup app health chat

PORT ?= 8787

setup:
	uv sync

app:
	PORT=$(PORT) uv run python -m app.server

health:
	curl -s http://127.0.0.1:$(PORT)/api/health | python3 -m json.tool

chat:
	curl -s -X POST http://127.0.0.1:$(PORT)/api/chat -H "Content-Type: application/json" -d '{"sessionId": "smoke-session", "userId": "dad", "messages": [{"id": "m1", "role": "user", "content": "How do I turn Bluetooth on on my iPhone?", "timestamp": "2026-01-01T00:00:00Z"}]}' | python3 -m json.tool
