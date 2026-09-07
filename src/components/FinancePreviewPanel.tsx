"use client";

import { Globe, RefreshCw } from "lucide-react";

import { useFinance } from "@/context/FinanceContext";
import { getModuleById } from "@/lib/modules";
import ConceptBoardView from "@/components/views/ConceptBoardView";
import DragonTigerView from "@/components/views/DragonTigerView";
import FinancialHealthView from "@/components/views/FinancialHealthView";
import IndustryStrengthView from "@/components/views/IndustryStrengthView";
import LimitUpView from "@/components/views/LimitUpView";
import MarketHeatView from "@/components/views/MarketHeatView";
import MarketResearchView from "@/components/views/MarketResearchView";
import StockOverviewView from "@/components/views/StockOverviewView";
import WatchlistAnomaliesView from "@/components/views/WatchlistAnomaliesView";
import StockSearchBox from "@/components/StockSearchBox";

const STOCK_SEARCH_MODULES = new Set(["stock-overview", "financial-health"]);

export default function FinancePreviewPanel() {
  const { activeModuleId, thscode, stockName } = useFinance();
  const module = activeModuleId ? getModuleById(activeModuleId) : null;

  if (!activeModuleId || !module) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-full flex-col bg-[#0f1218]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-[#12161d] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Globe className="h-4 w-4 flex-shrink-0 text-white/30" />
          <div className="min-w-0">
            <p className="truncate text-xs text-white/70">{module.title}</p>
            <p className="truncate font-mono text-[11px] text-white/35">
              {STOCK_SEARCH_MODULES.has(activeModuleId)
                ? `${stockName} · ${thscode}`
                : module.endpoint}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md">
          {STOCK_SEARCH_MODULES.has(activeModuleId) && (
            <StockSearchBox
              className="min-w-[200px] flex-1"
              targetModule={activeModuleId as "stock-overview" | "financial-health"}
            />
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white/70"
            title="刷新数据"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="dark-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
        {activeModuleId === "stock-overview" && <StockOverviewView thscode={thscode} />}
        {activeModuleId === "limit-up-market" && <LimitUpView />}
        {activeModuleId === "market-heat" && <MarketHeatView />}
        {activeModuleId === "dragon-tiger" && <DragonTigerView />}
        {activeModuleId === "concept-board" && <ConceptBoardView />}
        {activeModuleId === "financial-health" && <FinancialHealthView thscode={thscode} />}
        {activeModuleId === "watchlist-anomalies" && <WatchlistAnomaliesView />}
        {activeModuleId === "industry-strength" && <IndustryStrengthView />}
        {activeModuleId === "market-research" && <MarketResearchView />}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0f1218] px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
        同
      </div>
      <h2 className="text-lg font-semibold text-white/90">同花顺数据预览区</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">
        从左侧看板库选择模块，或在对话中让 AI 打开对应看板。
      </p>
    </div>
  );
}
