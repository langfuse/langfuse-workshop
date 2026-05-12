export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
};

export type SupportProfile = {
  id: string;
  label: string;
  relationship: string;
  primaryDevice: string;
  deviceSummary: string;
  responseStyle: string;
  notableApps: string[];
  scopeHighlights: string[];
  starterQuestions: string[];
};

export type ChatRequest = {
  profileId: string;
  messages: ChatMessage[];
  sessionId: string;
  userId?: string;
};

export type ChatResponse = {
  answer: string;
  promptSource: "local" | "langfuse";
  usedTools: string[];
  traceMeta: {
    profileId: string;
    profileLabel: string;
    model: string;
  };
};

export type HealthResponse = {
  ok: boolean;
  provider: string;
  tracingConfigured: boolean;
};

