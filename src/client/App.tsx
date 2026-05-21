import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ChatRequest, ChatResponse, SupportContext } from "../shared/types";

const SESSION_STORAGE_KEY = "dad-it-support-session";

const SUGGESTIONS = [
  "How do I turn Bluetooth on?",
  "How do I send a photo on WhatsApp?",
  "Why does my Wi-Fi keep dropping?",
  "How do I free up storage on my phone?"
];

const PHONE = {
  ownerName: "Dad",
  ownerSub: "Signed in · iPhone 11",
  model: "iPhone 11",
  finish: "Black, 64 GB",
  os: "iOS 16.7.10",
  purchased: "Nov 2019"
};

function createSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
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

function createGreeting(): ChatMessage {
  return createMessage(
    "assistant",
    "Hi Dad. I'm here for whatever's bothering your iPhone — Wi-Fi, Bluetooth, photos, messages, maps, you name it.\n\nAsk me **one** thing at a time and I'll walk you through it, step by step."
  );
}

function Mascot({ size = 56, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <svg
      className={"mascot " + (thinking ? "thinking" : "")}
      viewBox="0 0 80 92"
      width={size}
      height={(size * 92) / 80}
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="40" y1="22" x2="40" y2="12" stroke="var(--text-primary)" strokeWidth="1.6" strokeLinecap="round" />
      <circle className="antenna-tip" cx="40" cy="10" r="3.4" fill="var(--surface-cta-primary)" stroke="var(--text-primary)" strokeWidth="1.2" />

      <rect x="11" y="22" width="58" height="46" rx="2" fill="var(--surface-bg)" stroke="var(--text-primary)" strokeWidth="1.6" />

      <path className="mascot-bracket" d="M14 28 L14 25 L17 25" />
      <path className="mascot-bracket" d="M66 28 L66 25 L63 25" />
      <path className="mascot-bracket" d="M14 62 L14 65 L17 65" />
      <path className="mascot-bracket" d="M66 62 L66 65 L63 65" />

      <ellipse cx="21" cy="50" rx="3.8" ry="2" fill="#f1c9b3" opacity="0.55" />
      <ellipse cx="59" cy="50" rx="3.8" ry="2" fill="#f1c9b3" opacity="0.55" />

      <g>
        <circle className="eye left" cx="29" cy="42" r="3.6" fill="var(--text-primary)" />
        <circle cx="30.2" cy="40.8" r="1" fill="var(--surface-bg)" />
      </g>
      <g>
        <circle className="eye right" cx="51" cy="42" r="3.6" fill="var(--text-primary)" />
        <circle cx="52.2" cy="40.8" r="1" fill="var(--surface-bg)" />
      </g>

      <path className="mouth" d="M32 55 Q40 60 48 55" stroke="var(--text-primary)" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      <rect x="22" y="70" width="36" height="8" rx="1.5" fill="var(--surface-1)" stroke="var(--text-primary)" strokeWidth="1.4" />
      <circle cx="30" cy="74" r="0.9" fill="var(--text-secondary)" />
      <circle cx="34" cy="74" r="0.9" fill="var(--text-secondary)" />
      <circle cx="38" cy="74" r="0.9" fill="var(--text-secondary)" />
      <circle cx="50" cy="74" r="1.6" fill="var(--callout-success)" />

      <ellipse cx="40" cy="84" rx="20" ry="2.2" fill="var(--text-primary)" opacity="0.08" />
    </svg>
  );
}

function AgentAvatar() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="5" y="7" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <line x1="12" y1="4" x2="12" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="3" r="1" fill="currentColor" />
      <circle cx="9.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PhonePanel() {
  return (
    <aside className="side">
      <p className="side-eyebrow">// You</p>

      <div className="lf-corners who-card">
        <div className="row">
          <div className="portrait">D</div>
          <div>
            <h3>{PHONE.ownerName}</h3>
            <div className="who-sub">{PHONE.ownerSub}</div>
          </div>
        </div>
      </div>

      <p className="side-eyebrow">// Your phone</p>

      <div className="lf-corners phone-card">
        <div className="phone-hero">
          <div className="phone-illu">
            <div className="screen"></div>
          </div>
          <div className="phone-meta">
            <div className="model">{PHONE.model}</div>
            <div className="os">{PHONE.os}</div>
            <div className="age">
              {PHONE.finish} · bought {PHONE.purchased}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <img className="wordart" src="/assets/langfuse-wordart.svg" alt="Langfuse" />
      <div className="divider"></div>
      <div className="title-row">
        <span className="eyebrow">// support workspace</span>
        <span className="title">
          <span className="mark">Dad</span> IT Support Agent
        </span>
      </div>
      <span className="spacer"></span>
      <span className="status">
        <span className="dot"></span> live · gpt-5.5-2026-04-23
      </span>
    </header>
  );
}

export function App() {
  const [supportContext, setSupportContext] = useState<SupportContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([createGreeting()]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(createSessionId());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/support-context");
        if (!response.ok) return;
        const context = (await response.json()) as SupportContext;
        setSupportContext(context);
      } catch {
        /* panel falls back to hardcoded copy */
      }
    })();
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [draft]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text || !sessionId || isSending) return;

    const nextMessages = [...messages, createMessage("user", text)];
    const payload: ChatRequest = { messages: nextMessages, sessionId };

    setDraft("");
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Chat request failed.");
      }

      const result = (await response.json()) as ChatResponse;
      setMessages((current) => [...current, createMessage("assistant", result.answer)]);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "The chat request failed.";
      setMessages((current) => [
        ...current,
        createMessage("assistant", `I hit a snag while answering that question.\n\n${fallback}`)
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const starterChips = supportContext?.starterQuestions?.length
    ? supportContext.starterQuestions
    : SUGGESTIONS;

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <section className="chat">
          <header className="chat-header compact">
            <div className="mascot-wrap">
              <Mascot size={40} thinking={isSending} />
            </div>
            <div className="who">
              <h2>
                Hi Dad, I'm <span className="mark">Specs</span>.
              </h2>
            </div>
          </header>

          <div className="chat-stream" ref={streamRef}>
            <div className="chat-stream-inner">
              {messages.map((m) => (
                <div className={"msg " + (m.role === "user" ? "user" : "agent")} key={m.id}>
                  <div className="avatar">{m.role === "user" ? "YOU" : <AgentAvatar />}</div>
                  <div>
                    <div className="bubble">
                      {m.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      ) : (
                        <p>{m.content}</p>
                      )}
                    </div>
                    <div className="meta">{m.role === "user" ? "you · just now" : "specs · just now"}</div>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="msg agent">
                  <div className="avatar">
                    <AgentAvatar />
                  </div>
                  <div>
                    <div className="bubble">
                      <div className="typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="meta">specs · checking…</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {messages.length === 1 && !isSending && (
            <div className="suggestions">
              {starterChips.map((s) => (
                <button key={s} className="suggestion" onClick={() => void send(s)} type="button">
                  {s}
                  <span className="arr">↵</span>
                </button>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={onSubmit}>
            <div className="composer-inner">
              <div className="composer-box">
                <textarea
                  ref={taRef}
                  placeholder="What's going on with your phone?"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                />
                <div className="composer-row">
                  <span className="hint">
                    <kbd>↵</kbd> send · <kbd>⇧</kbd>+<kbd>↵</kbd> newline
                  </span>
                  <span className="spacer"></span>
                  <span
                    className="hint"
                    style={{ textTransform: "none", letterSpacing: 0, color: "var(--text-disabled)" }}
                  >
                    ▲ traced via langfuse
                  </span>
                  <button className="send-btn" disabled={isSending || !draft.trim()} type="submit">
                    Send <span className="kbd">↵</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <PhonePanel />
      </div>
    </div>
  );
}
