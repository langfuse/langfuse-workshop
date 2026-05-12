import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ChatRequest } from "../shared/types";
import { runSupportConversation } from "./anthropic-agent";
import { env, isLangfuseConfigured } from "./env";
import { ensureTracingInitialized, shutdownTracing } from "./instrumentation";
import { SUPPORT_PROFILES } from "./support-data";

ensureTracingInitialized();

const requestSchema = z.object({
  profileId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.union([z.literal("user"), z.literal("assistant")]),
        content: z.string().min(1),
        timestamp: z.string()
      })
    )
    .min(1)
});

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    provider: "anthropic",
    tracingConfigured: isLangfuseConfigured()
  });
});

app.get("/api/profiles", (_request, response) => {
  response.json(SUPPORT_PROFILES);
});

app.post("/api/chat", async (request, response) => {
  try {
    const payload = requestSchema.parse(request.body) as ChatRequest;
    const { result } = await runSupportConversation(payload);
    response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    response.status(400).send(message);
  }
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(currentDir, "../../dist");

app.use(express.static(clientDist));
app.use((_request, response) => {
  response.sendFile(path.join(clientDist, "index.html"));
});

const server = app.listen(env.port, "127.0.0.1", () => {
  console.log(`Pocket Support server listening on http://127.0.0.1:${env.port}`);
});

async function shutdown() {
  server.close();
  await shutdownTracing();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

