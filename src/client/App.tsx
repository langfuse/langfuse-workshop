import { FormEvent, useEffect, useState } from "react";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  SupportProfile
} from "../shared/types";

const SESSION_STORAGE_KEY = "pocket-support-session";

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

function createGreeting(profile?: SupportProfile | null) {
  const subject = profile?.label ?? "your parent";
  return createMessage(
    "assistant",
    `Hi, I'm Pocket Support. Pick a known device profile for ${subject} and ask a practical tech question like Bluetooth, Wi-Fi, photos, or printing.`
  );
}

export function App() {
  const [profiles, setProfiles] = useState<SupportProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([createGreeting()]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState("Loading known devices...");
  const [sessionId, setSessionId] = useState("");
  const [lastRun, setLastRun] = useState<ChatResponse | null>(null);

  useEffect(() => {
    setSessionId(createSessionId());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/profiles");

        if (!response.ok) {
          throw new Error("Failed to load profiles");
        }

        const nextProfiles = (await response.json()) as SupportProfile[];
        setProfiles(nextProfiles);

        if (nextProfiles[0]) {
          setSelectedProfileId(nextProfiles[0].id);
          setMessages([createGreeting(nextProfiles[0])]);
          setStatus("Choose a parent profile and ask something practical.");
        } else {
          setStatus("No device profiles found.");
        }
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the workshop app."
        );
      }
    })();
  }, []);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();

    const trimmed = draft.trim();

    if (!trimmed || !selectedProfileId || isSending) {
      return;
    }

    const nextMessages = [...messages, createMessage("user", trimmed)];
    const payload: ChatRequest = {
      profileId: selectedProfileId,
      messages: nextMessages,
      sessionId
    };

    setDraft("");
    setMessages(nextMessages);
    setIsSending(true);
    setStatus("Pocket Support is checking device context and looking up steps...");

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
        throw new Error(text || "Chat request failed");
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
          `I hit a snag while answering that question. ${fallbackMessage}`
        )
      ]);
      setStatus("The request failed. Check your API keys and server logs.");
    } finally {
      setIsSending(false);
    }
  }

  function swapProfile(profileId: string) {
    const nextProfile = profiles.find((profile) => profile.id === profileId) ?? null;
    setSelectedProfileId(profileId);
    setMessages([createGreeting(nextProfile)]);
    setLastRun(null);
    setStatus(
      nextProfile
        ? `Conversation reset for ${nextProfile.label}.`
        : "Conversation reset."
    );
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="workspace">
        <section className="hero-card">
          <p className="eyebrow">Langfuse workshop sample app</p>
          <h1>Pocket Support</h1>
          <p className="hero-copy">
            A warm little parent-support chat for practical device questions.
            It is intentionally small, tool-using, and ready for tracing,
            prompt management, monitoring, and experiments.
          </p>

          <div className="scope-ribbon">
            <span>In scope:</span>
            <span>Bluetooth</span>
            <span>Wi-Fi</span>
            <span>Photos</span>
            <span>Printing</span>
          </div>

          <div className="status-panel">
            <strong>Workshop note</strong>
            <p>
              The later checkpoints are designed to stay runnable even if you
              skip prompt management or tracing in a given session.
            </p>
          </div>
        </section>

        <section className="layout-grid">
          <aside className="profile-panel">
            <div className="panel-header">
              <p className="eyebrow">Known devices</p>
              <h2>Pick a parent profile</h2>
            </div>

            <div className="profile-list">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={
                    profile.id === selectedProfileId
                      ? "profile-card profile-card-active"
                      : "profile-card"
                  }
                  onClick={() => swapProfile(profile.id)}
                  type="button"
                >
                  <span className="profile-label">{profile.label}</span>
                  <span className="profile-device">{profile.primaryDevice}</span>
                  <span className="profile-summary">{profile.deviceSummary}</span>
                </button>
              ))}
            </div>

            {selectedProfile ? (
              <div className="profile-detail">
                <h3>{selectedProfile.label}</h3>
                <p>{selectedProfile.relationship}</p>
                <p>{selectedProfile.responseStyle}</p>

                <div className="pill-row">
                  {selectedProfile.notableApps.map((app) => (
                    <span key={app} className="pill">
                      {app}
                    </span>
                  ))}
                </div>

                <div className="starter-list">
                  <strong>Try asking</strong>
                  {selectedProfile.starterQuestions.map((question) => (
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
            ) : null}
          </aside>

          <section className="chat-panel">
            <div className="panel-header chat-header">
              <div>
                <p className="eyebrow">Live demo</p>
                <h2>Chat with the support agent</h2>
              </div>

              <div className="trace-badge">
                <span className="trace-label">Prompt</span>
                <span>{lastRun?.promptSource ?? "pending"}</span>
              </div>
            </div>

            <div className="messages">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "assistant"
                      ? "message message-assistant"
                      : "message message-user"
                  }
                >
                  <span className="message-role">
                    {message.role === "assistant" ? "Pocket Support" : "You"}
                  </span>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>

            <form className="composer" onSubmit={submitMessage}>
              <label className="composer-label" htmlFor="message">
                Ask a device question
              </label>
              <textarea
                id="message"
                className="composer-input"
                disabled={!selectedProfileId || isSending}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="How do I turn Bluetooth on for Mum's phone?"
                rows={4}
                value={draft}
              />

              <div className="composer-footer">
                <p className="status-copy">{status}</p>

                <button className="send-button" disabled={isSending || !draft.trim()} type="submit">
                  {isSending ? "Checking..." : "Send"}
                </button>
              </div>
            </form>

            {lastRun ? (
              <div className="run-meta">
                <div>
                  <span className="meta-label">Model</span>
                  <strong>{lastRun.traceMeta.model}</strong>
                </div>
                <div>
                  <span className="meta-label">Used tools</span>
                  <strong>
                    {lastRun.usedTools.length > 0
                      ? lastRun.usedTools.join(", ")
                      : "No tools needed"}
                  </strong>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}

