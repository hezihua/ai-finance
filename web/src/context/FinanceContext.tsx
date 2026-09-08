"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getModuleById } from "@/lib/modules";
import type {
  ActiveView,
  ChatAction,
  ChatMessage,
  ChatSession,
  FinanceModuleId,
  HealthStatus,
  RecentView,
  ToolCall,
} from "@/types";

interface FinanceState {
  activeView: ActiveView;
  activeModuleId: FinanceModuleId | null;
  thscode: string;
  stockName: string;
  recentViews: RecentView[];
  healthStatus: HealthStatus;
  healthDetail?: string;
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  setActiveView: (view: ActiveView) => void;
  openModule: (moduleId: FinanceModuleId, thscode?: string) => void;
  setThscode: (thscode: string, name?: string) => void;
  clearViewer: () => void;
  createNewSession: () => void;
  switchSession: (id: string) => void;
  clearSessionSelection: () => void;
  sendMessage: (content: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceState | null>(null);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createEmptySession(): ChatSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "新会话",
    messages: [],
    updatedAt: Date.now(),
  };
}

function createRecentView(moduleId: FinanceModuleId, thscode?: string): RecentView {
  const mod = getModuleById(moduleId);
  const title =
    moduleId === "stock-overview" && thscode
      ? `${mod?.title ?? moduleId} · ${thscode}`
      : (mod?.title ?? moduleId);
  return {
    id: `${moduleId}-${thscode ?? "market"}-${Date.now()}`,
    title,
    moduleId,
    thscode,
    updatedAt: Date.now(),
  };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>("modules");
  const [activeModuleId, setActiveModuleId] = useState<FinanceModuleId | null>(null);
  const [thscode, setThscodeState] = useState("300033.SZ");
  const [stockName, setStockName] = useState("同花顺");
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("loading");
  const [healthDetail, setHealthDetail] = useState<string>();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId) ?? null
    : null;
  const messages = currentSession?.messages ?? [];

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "ok") {
          setHealthStatus("ok");
          setHealthDetail(undefined);
        } else if (data.status === "missing_key") {
          setHealthStatus("missing_key");
          setHealthDetail(data.detail);
        } else {
          setHealthStatus("error");
          setHealthDetail(data.detail ?? "数据服务不可用");
        }
      } catch (error) {
        if (!cancelled) {
          setHealthStatus("error");
          setHealthDetail(error instanceof Error ? error.message : "探活失败");
        }
      }
    }
    void loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const openModule = useCallback(
    (moduleId: FinanceModuleId, code?: string) => {
      const mod = getModuleById(moduleId);
      const nextCode = code ?? mod?.defaultThscode ?? thscode;
      setActiveModuleId(moduleId);
      setThscodeState(nextCode);
      setActiveView((prev) => (prev === "chat" ? "chat" : "viewer"));
      setRecentViews((prev) => {
        const entry = createRecentView(moduleId, nextCode);
        const filtered = prev.filter(
          (item) => !(item.moduleId === moduleId && item.thscode === nextCode),
        );
        return [entry, ...filtered].slice(0, 20);
      });
    },
    [thscode],
  );

  const setThscode = useCallback((code: string, name?: string) => {
    setThscodeState(code);
    if (name) setStockName(name);
  }, []);

  const clearViewer = useCallback(() => {
    setActiveView("modules");
    setActiveModuleId(null);
  }, []);

  const createNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setActiveView("chat");
    setIsGenerating(false);
  }, []);

  const switchSession = useCallback(
    (id: string) => {
      if (id === currentSessionId || isGenerating) return;
      setCurrentSessionId(id);
      setActiveView("chat");
      setIsGenerating(false);
    },
    [currentSessionId, isGenerating],
  );

  const clearSessionSelection = useCallback(() => {
    if (isGenerating) return;
    setCurrentSessionId(null);
  }, [isGenerating]);

  const applyActions = useCallback(
    (actions: ChatAction[] | undefined) => {
      if (!actions?.length) return;
      for (const action of actions) {
        if (action.type === "open_module") {
          openModule(action.moduleId, action.thscode);
        } else if (action.type === "set_thscode") {
          setThscode(action.thscode, action.name);
        }
      }
    },
    [openModule, setThscode],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating) return;

      let sessionId = currentSessionId;
      if (!sessionId) {
        const created = createEmptySession();
        created.title = trimmed.slice(0, 24) + (trimmed.length > 24 ? "…" : "");
        sessionId = created.id;
        setSessions((prev) => [created, ...prev]);
        setCurrentSessionId(sessionId);
      }

      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      const aiMsgId = `msg-ai-${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "正在查询同花顺数据并分析…",
        timestamp: Date.now(),
        toolCalls: [
          {
            id: `tc-${Date.now()}`,
            name: "finance-chat",
            status: "running",
            params: { prompt: trimmed },
          },
        ],
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const title =
            s.messages.length === 0
              ? trimmed.slice(0, 24) + (trimmed.length > 24 ? "…" : "")
              : s.title;
          return {
            ...s,
            title,
            messages: [...s.messages, userMsg, aiMsg],
            updatedAt: Date.now(),
          };
        }),
      );
      setActiveView("chat");
      setIsGenerating(true);

      try {
        const prior =
          sessions
            .find((s) => s.id === sessionId)
            ?.messages.filter((m) => m.role === "user" || (m.role === "assistant" && !m.content.includes("正在查询")))
            .map((m) => ({ role: m.role, content: m.content })) ?? [];
        const history = [...prior, { role: "user" as const, content: trimmed }];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context: { thscode, stockName, activeModuleId },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "对话失败");

        const toolCalls: ToolCall[] = Array.isArray(data.toolCalls)
          ? data.toolCalls.map((tc: ToolCall) => ({
              id: tc.id,
              name: tc.name,
              status: tc.status,
              params: tc.params,
              result: tc.result,
            }))
          : [
              {
                id: `tc-done-${Date.now()}`,
                name: "finance-chat",
                status: "success",
              },
            ];

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      content: String(data.content ?? ""),
                      toolCalls,
                    }
                  : msg,
              ),
            };
          }),
        );
        applyActions(data.actions as ChatAction[] | undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : "对话失败";
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      content: `抱歉，对话失败：${message}`,
                      toolCalls: msg.toolCalls?.map((tc) => ({
                        ...tc,
                        status: "error" as const,
                      })),
                    }
                  : msg,
              ),
            };
          }),
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [
      activeModuleId,
      applyActions,
      currentSessionId,
      isGenerating,
      sessions,
      stockName,
      thscode,
    ],
  );

  const value = useMemo(
    () => ({
      activeView,
      activeModuleId,
      thscode,
      stockName,
      recentViews: recentViews.filter((item) => Date.now() - item.updatedAt < SEVEN_DAYS_MS),
      healthStatus,
      healthDetail,
      sessions: sessions.filter((s) => Date.now() - s.updatedAt < SEVEN_DAYS_MS),
      currentSessionId,
      messages,
      isGenerating,
      setActiveView,
      openModule,
      setThscode,
      clearViewer,
      createNewSession,
      switchSession,
      clearSessionSelection,
      sendMessage,
    }),
    [
      activeView,
      activeModuleId,
      thscode,
      stockName,
      recentViews,
      healthStatus,
      healthDetail,
      sessions,
      currentSessionId,
      messages,
      isGenerating,
      openModule,
      setThscode,
      clearViewer,
      createNewSession,
      switchSession,
      clearSessionSelection,
      sendMessage,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
