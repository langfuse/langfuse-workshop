import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import OpenAI from "openai";
import {
  DEFAULT_LANGFUSE_GATEWAY_HOST,
  OPENAI_BASE_URL,
  gatewayOpenAIBaseURL,
  resolveChatClientOptions
} from "./llm";

describe("gatewayOpenAIBaseURL", () => {
  it("uses the EU gateway when no host is set", () => {
    assert.equal(
      gatewayOpenAIBaseURL(),
      `${DEFAULT_LANGFUSE_GATEWAY_HOST}/openai/v1`
    );
  });

  it("appends the OpenAI route to a regional host", () => {
    assert.equal(
      gatewayOpenAIBaseURL("https://gateway.us.cloud.langfuse.com/"),
      "https://gateway.us.cloud.langfuse.com/openai/v1"
    );
  });

  it("keeps a host that already includes the OpenAI route", () => {
    assert.equal(
      gatewayOpenAIBaseURL("https://gateway.cloud.langfuse.com/openai/v1/"),
      "https://gateway.cloud.langfuse.com/openai/v1"
    );
  });
});

describe("resolveChatClientOptions", () => {
  it("sends a gateway key to the Langfuse gateway", () => {
    assert.deepEqual(
      resolveChatClientOptions({
        langfuseGatewayKey: " gateway-key ",
        openaiApiKey: "sk-openai"
      }),
      {
        apiKey: "gateway-key",
        baseURL: `${DEFAULT_LANGFUSE_GATEWAY_HOST}/openai/v1`
      }
    );
  });

  it("uses a custom gateway host when the gateway key is set", () => {
    assert.deepEqual(
      resolveChatClientOptions({
        langfuseGatewayKey: "gateway-key",
        langfuseGatewayHost: "https://gateway.us.cloud.langfuse.com",
        openaiApiKey: "sk-openai"
      }),
      {
        apiKey: "gateway-key",
        baseURL: "https://gateway.us.cloud.langfuse.com/openai/v1"
      }
    );
  });

  it("calls OpenAI directly when only the OpenAI key is set", () => {
    assert.deepEqual(
      resolveChatClientOptions({
        langfuseGatewayKey: "  ",
        openaiApiKey: " sk-openai "
      }),
      {
        apiKey: "sk-openai",
        baseURL: OPENAI_BASE_URL
      }
    );
  });

  it("requires a gateway key or an OpenAI key", () => {
    assert.throws(
      () => resolveChatClientOptions({ langfuseGatewayKey: "", openaiApiKey: "" }),
      /LANGFUSE_GATEWAY_KEY/
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
        resolveChatClientOptions({
          langfuseGatewayKey: "gateway-key",
          langfuseGatewayHost: `http://127.0.0.1:${port}`,
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
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
