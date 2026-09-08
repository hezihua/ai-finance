"use client";

import {
  Activity,
  Building2,
  Flame,
  LayoutGrid,
  LineChart,
  MessageSquare,
  Plus,
  Radar,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useFinance } from "@/context/FinanceContext";
import type { FinanceModuleId } from "@/types";

const MODULE_ICONS: Record<FinanceModuleId, typeof LineChart> = {
  "stock-overview": LineChart,
  "limit-up-market": TrendingUp,
  "market-heat": Flame,
  "dragon-tiger": Wallet,
  "concept-board": LayoutGrid,
  "financial-health": Building2,
  "watchlist-anomalies": Activity,
  "industry-strength": Radar,
  "market-research": LayoutGrid,
};

const navIdle = "text-white/50 hover:bg-white/[0.04] hover:text-white/75";
const navActive = "bg-[#1c2430] text-white/92";

export default function SidebarPanel() {
  const {
    activeView,
    setActiveView,
    recentViews,
    sessions,
    currentSessionId,
    activeModuleId,
    thscode,
    openModule,
    clearViewer,
    createNewSession,
    switchSession,
    clearSessionSelection,
    isGenerating,
    healthStatus,
    healthDetail,
  } = useFinance();

  const healthLabel =
    healthStatus === "ok"
      ? "已连接"
      : healthStatus === "missing_key"
        ? "未配置 API Key"
        : healthStatus === "loading"
          ? "连接中…"
          : "数据不可用";

  const healthClass =
    healthStatus === "ok"
      ? "text-[#6ee7d2] bg-[#4f8cff]/10 border-[#4f8cff]/25"
      : healthStatus === "loading"
        ? "text-white/40 bg-white/5 border-white/10"
        : "text-rose-400 bg-rose-500/10 border-rose-500/20";

  return (
    <div className="flex h-full flex-col border-r border-white/[0.07] bg-[#10141a] text-white/90">
      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-3 py-3">
        <div className="brand-mark flex h-8 w-8 flex-shrink-0 items-center justify-center text-[11px] font-semibold text-[#0b1220]">
          同
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-wide text-white/88">
            ai-finance
          </span>
          <span className="block truncate text-[10px] text-white/40">同花顺数据可视化</span>
        </div>
      </div>

      <nav className="space-y-0.5 border-b border-white/[0.07] px-2 pb-2 pt-3">
        <button
          onClick={() => {
            setActiveView("modules");
            clearViewer();
            clearSessionSelection();
          }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
            activeView === "modules" ? navActive : navIdle
          }`}
        >
          <LayoutGrid className="h-4 w-4 flex-shrink-0 opacity-70" />
          看板库
        </button>
        <button
          onClick={() => createNewSession()}
          disabled={isGenerating}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${navIdle}`}
        >
          <Plus className="h-4 w-4 flex-shrink-0 opacity-70" />
          新会话
        </button>
      </nav>

      <div className="px-3 pb-1 pt-3">
        <h2 className="text-[11px] font-medium text-white/40">最近会话</h2>
      </div>
      <div className="dark-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 ? (
          <p className="px-2.5 py-2 text-xs text-white/25">暂无会话</p>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => switchSession(session.id)}
              disabled={isGenerating}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                activeView === "chat" && session.id === currentSessionId ? navActive : navIdle
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
              <span className="truncate">{session.title}</span>
            </button>
          ))
        )}

        {recentViews.length > 0 && (
          <>
            <div className="px-2.5 pb-1 pt-4 text-[11px] font-medium text-white/40">最近看板</div>
            {recentViews.slice(0, 6).map((item) => {
              const Icon = MODULE_ICONS[item.moduleId];
              return (
                <button
                  key={item.id}
                  onClick={() => openModule(item.moduleId, item.thscode)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeView === "viewer" &&
                    activeModuleId === item.moduleId &&
                    (item.moduleId !== "stock-overview" || item.thscode === thscode)
                      ? navActive
                      : navIdle
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className="border-t border-white/[0.07] px-3 py-3">
        <div
          className={`rounded-lg border px-2.5 py-2 text-xs ${healthClass}`}
          title={healthDetail}
        >
          {healthLabel}
        </div>
      </div>
    </div>
  );
}
