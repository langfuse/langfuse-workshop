// Remembers the OpenAI generation span for one model call so a tool observation
// can nest under the generation that requested it.
import { AsyncLocalStorage } from "node:async_hooks";
import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

type GenerationParentStore = {
  spanContext?: ReturnType<Span["spanContext"]>;
};

const generationParentStore = new AsyncLocalStorage<GenerationParentStore>();

// observeOpenAI closes the generation as soon as the model call returns, and
// that span is never the active one. Tool work then runs under the agent, so
// the trace tree cannot show which generation requested which tool. This
// processor keeps the generation's span context for the in-flight model call.
export const generationParentProcessor: SpanProcessor = {
  onStart(span: Span, _parentContext: Context) {
    const current = generationParentStore.getStore();
    if (!current || span.name !== "OpenAI.chat") return;
    current.spanContext = span.spanContext();
  },
  onEnd(_span: ReadableSpan) {},
  shutdown() {
    return Promise.resolve();
  },
  forceFlush() {
    return Promise.resolve();
  }
};

export async function callRequestingGeneration<T>(run: () => Promise<T>) {
  return generationParentStore.run({}, async () => {
    const result = await run();
    return {
      result,
      parentSpanContext: generationParentStore.getStore()?.spanContext
    };
  });
}
