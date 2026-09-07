export type ActiveView = "modules" | "chat" | "viewer";

export type FinanceModuleId =
  | "stock-overview"
  | "limit-up-market"
  | "market-heat"
  | "dragon-tiger"
  | "concept-board"
  | "financial-health"
  | "watchlist-anomalies"
  | "industry-strength"
  | "market-research";

export interface FinanceModule {
  id: FinanceModuleId;
  title: string;
  description: string;
  tags: string[];
  endpoint: string;
  defaultThscode?: string;
}

export interface RecentView {
  id: string;
  title: string;
  moduleId: FinanceModuleId;
  thscode?: string;
  updatedAt: number;
}

export type HealthStatus = "loading" | "ok" | "missing_key" | "error";

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "success" | "error";
  params?: Record<string, unknown>;
  result?: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export type ChatAction =
  | { type: "open_module"; moduleId: FinanceModuleId; thscode?: string }
  | { type: "set_thscode"; thscode: string; name?: string };
