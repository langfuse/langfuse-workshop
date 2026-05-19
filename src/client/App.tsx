import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ChatRequest, ChatResponse, SupportContext } from "../shared/types";

const SESSION_STORAGE_KEY = "dad-it-support-session";
const THINKING_WORDS = [
  "Investigating",
  "Setting up",
  "Looking up manual",
  "Checking UI behavior"
];

function createSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString()
  };
}

function createGreeting() {
  return createMessage(
    "assistant",
    "Hi Dad, I’m here to help with your iPhone — Wi-Fi, Bluetooth, photos, maps, messages, and other small phone tasks. Ask me one practical question and I’ll walk you through it."
  );
}

export function App() {
  const [supportContext, setSupportContext] = useState<SupportContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([createGreeting()]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [status, setStatus] = useState("Loading Dad's setup...");
  const [sessionId, setSessionId] = useState("");
  const [lastRun, setLastRun] = useState<ChatResponse | null>(null);

  useEffect(() => {
    setSessionId(createSessionId());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/support-context");

        if (!response.ok) {
          throw new Error("Failed to load the support context.");
        }

        const context = (await response.json()) as SupportContext;
        setSupportContext(context);
        setMessages([createGreeting()]);
        setStatus("Ask Dad IT Support Agent a practical device question.");
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the workshop app."
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!isSending) {
      setThinkingIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setThinkingIndex((current) => (current + 1) % THINKING_WORDS.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [isSending]);

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();

    const trimmed = draft.trim();

    if (!trimmed || !sessionId || isSending) {
      return;
    }

    const nextMessages = [...messages, createMessage("user", trimmed)];
    const payload: ChatRequest = {
      messages: nextMessages,
      sessionId
    };

    setDraft("");
    setMessages(nextMessages);
    setIsSending(true);
    setStatus("Dad IT Support Agent is thinking through the next step.");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Chat request failed.");
      }

      const result = (await response.json()) as ChatResponse;
      setMessages((current) => [...current, createMessage("assistant", result.answer)]);
      setLastRun(result);
      setStatus(
        result.promptSource === "langfuse"
          ? "Reply generated with a Langfuse-managed prompt."
          : "Reply generated with the local fallback prompt."
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : "The chat request failed for an unknown reason.";

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          `I hit a snag while answering that question.\n\n${fallbackMessage}`
        )
      ]);
      setStatus("The request failed. Check your API keys and server logs.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="workspace">
        <section className="hero-card">
          <p className="eyebrow">Langfuse workshop sample app</p>
          <h1>Dad IT Support Agent</h1>
          <p className="hero-copy">
            A small, memorable web chat for practical iPhone help. It is built
            to be easy to trace, easy to monitor, and easy to improve over time.
          </p>

          <div className="scope-ribbon">
            <span>In scope</span>
            <span>iPhone</span>
            <span>Bluetooth</span>
            <span>Wi-Fi</span>
            <span>Photos</span>
            <span>Maps</span>
            <span>Messages</span>
          </div>

          <div className="status-panel">
            <strong>Workshop note</strong>
            <p>
              The sample stays intentionally small so each Langfuse step feels
              visible: one context, one chat, two local tools, and a trace shape
              that stays stable across later checkpoints.
            </p>
          </div>
        </section>

        <section className="layout-grid">
          <aside className="context-panel">
            <div className="panel-header">
              <p className="eyebrow">Known setup</p>
              <h2>Dad&apos;s iPhone</h2>
            </div>

            {supportContext ? (
              <>
                <div className="context-card">
                  <h3>{supportContext.label}</h3>
                  <p>{supportContext.relationship}</p>
                  <p>{supportContext.deviceSummary}</p>
                </div>

                <div className="detail-block">
                  <strong>Device</strong>
                  <div className="pill-row">
                    {supportContext.devices.map((device) => (
                      <span key={device} className="pill">
                        {device}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="detail-block">
                  <strong>Apps and tools</strong>
                  <div className="pill-row">
                    {supportContext.notableApps.map((app) => (
                      <span key={app} className="pill">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="detail-block">
                  <strong>Try asking</strong>
                  <div className="starter-list">
                    {supportContext.starterQuestions.map((question) => (
                      <button
                        key={question}
                        className="starter-chip"
                        onClick={() => setDraft(question)}
                        type="button"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="context-card">
                <p>Loading the known support setup...</p>
              </div>
            )}
          </aside>

          <section className="chat-panel">
            <div className="panel-header chat-header">
              <div>
                <p className="eyebrow">Live demo</p>
                <h2>Chat with Dad IT Support Agent</h2>
              </div>

              <div className="trace-badge">
                <span className="trace-label">Prompt</span>
                <span>{lastRun?.promptSource ?? "pending"}</span>
              </div>
            </div>

            <div className="chat-status">{status}</div>

            <div className="transcript">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "assistant"
                      ? "message-card assistant-message"
                      : "message-card user-message"
                  }
                >
                  <div className="message-label">
                    {message.role === "assistant" ? "Dad IT Support Agent" : "You"}
                  </div>

                  {message.role === "assistant" ? (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="message-content">{message.content}</p>
                  )}
                </article>
              ))}

              {isSending ? (
                <article className="message-card assistant-message thinking-message">
                  <div className="message-label">Dad IT Support Agent</div>
                  <p className="thinking-copy">
                    Thinking
                    <span className="thinking-divider">·</span>
                    {THINKING_WORDS[thinkingIndex]}
                  </p>
                </article>
              ) : null}
            </div>

            <form className="composer" onSubmit={submitMessage}>
              <label className="composer-label" htmlFor="chat-draft">
                Ask one practical question
              </label>
              <textarea
                id="chat-draft"
                className="composer-input"
                rows={4}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="How do I reconnect my iPhone to Wi-Fi?"
              />

              <div className="composer-row">
                <p className="composer-hint">
                  This chat is intentionally simple so the Langfuse traces stay easy
                  to explain live.
                </p>

                <button className="send-button" disabled={isSending || !draft.trim()} type="submit">
                  Send message
                </button>
              </div>
            </form>

            {lastRun ? (
              <div className="run-meta">
                <span>
                  <strong>Model:</strong> {lastRun.traceMeta.model}
                </span>
                <span>
                  <strong>Tools:</strong>{" "}
                  {lastRun.usedTools.length > 0 ? lastRun.usedTools.join(", ") : "none"}
                </span>
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}
