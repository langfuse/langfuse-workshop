import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import OpenAI from "openai";
import { resolveLlmProvider } from "./env";
import {
  DEFAULT_LANGFUSE_GATEWAY_HOST,
  OPENAI_BASE_URL,
  chatClientOptions,
  gatewayOpenAIBaseURL
} from "./llm";

describe("resolveLlmProvider", () => {
  it("keeps the OpenAI model when a gateway key is set beside an Anthropic key", () => {
    assert.equal(
      resolveLlmProvider({
        langfuseGatewayKey: "gateway-key",
        anthropicApiKey: "sk-ant",
        llmProvider: "anthropic"
      }),
      "openai"
    );
  });

  it("still selects Claude when the gateway key is empty", () => {
    assert.equal(
      resolveLlmProvider({
        anthropicApiKey: "sk-ant"
      }),
      "anthropic"
    );
  });
});

describe("chatClientOptions", () => {
  it("sends a gateway key to the Langfuse gateway ahead of both provider keys", () => {
    assert.deepEqual(
      chatClientOptions({
        langfuseGatewayKey: " gateway-key ",
        langfuseGatewayHost: "https://gateway.us.cloud.langfuse.com/",
        llmProvider: "anthropic",
        openaiApiKey: "sk-openai",
        anthropicApiKey: "sk-ant"
      }),
      {
        apiKey: "gateway-key",
        baseURL: "https://gateway.us.cloud.langfuse.com/openai/v1"
      }
    );
  });

  it("calls OpenAI directly when only the OpenAI key is set", () => {
    assert.deepEqual(
      chatClientOptions({
        llmProvider: "openai",
        openaiApiKey: "sk-openai"
      }),
      {
        apiKey: "sk-openai",
        baseURL: OPENAI_BASE_URL
      }
    );
  });

  it("keeps the Claude endpoint when the gateway key is empty", () => {
    assert.deepEqual(
      chatClientOptions({
        llmProvider: "anthropic",
        anthropicApiKey: "sk-ant",
        anthropicWorkspaceId: "wrkspc_123"
      }),
      {
        apiKey: "sk-ant",
        baseURL: "https://api.anthropic.com/v1/",
        defaultHeaders: { "anthropic-workspace-id": "wrkspc_123" }
      }
    );
  });

  it("uses the EU gateway host by default", () => {
    assert.equal(
      gatewayOpenAIBaseURL(),
      `${DEFAULT_LANGFUSE_GATEWAY_HOST}/openai/v1`
    );
  });

  it("posts chat completions to the gateway route with the gateway key", async () => {
    const seen: Array<{ url: string | undefined; authorization: string | undefined }> = [];
    const server = http.createServer((request, response) => {
      seen.push({
        url: request.url,
        authorization: request.headers.authorization
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 0,
          model: "gpt-test",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "pong" },
              finish_reason: "stop"
            }
          ]
        })
      );
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    try {
      const client = new OpenAI(
        chatClientOptions({
          langfuseGatewayKey: "gateway-key",
          langfuseGatewayHost: `http://127.0.0.1:${port}`,
          llmProvider: "openai",
          openaiApiKey: "sk-openai"
        })
      );
      const completion = await client.chat.completions.create({
        model: "gpt-test",
        messages: [{ role: "user", content: "ping" }]
      });
      assert.equal(completion.choices[0]?.message.content, "pong");
      assert.deepEqual(seen, [
        {
          url: "/openai/v1/chat/completions",
          authorization: "Bearer gateway-key"
        }
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
