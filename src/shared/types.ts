export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
};

export type SupportContext = {
  id: string;
  label: string;
  relationship: string;
  devices: string[];
  deviceSummary: string;
  responseStyle: string;
  notableApps: string[];
  scopeHighlights: string[];
  starterQuestions: string[];
};

export type ChatRequest = {
  messages: ChatMessage[];
  sessionId: string;
  userId?: string;
};

export type ChatResponse = {
  answer: string;
  usedTools: string[];
  traceMeta: {
    contextId: string;
    contextLabel: string;
    model: string;
  };
};

export type HealthResponse = {
  ok: boolean;
  provider: string;
  tracingConfigured: boolean;
};
