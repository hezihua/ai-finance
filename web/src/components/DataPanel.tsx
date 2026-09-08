"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";

import { useFinance } from "@/context/FinanceContext";
import { getModuleById } from "@/lib/modules";
import type { TickerItem } from "@/lib/hithink-finance";

export default function DataPanel() {
  const { activeModuleId, thscode, stockName, setThscode, openModule } = useFinance();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const module = activeModuleId ? getModuleById(activeModuleId) : null;
  const needsStock = activeModuleId === "stock-overview";

  useEffect(() => {
    if (!needsStock) return;
    let cancelled = false;
    async function resolveName() {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(thscode)}`);
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const match = (data.item as TickerItem[] | undefined)?.find(
          (item) => item.thscode === thscode,
        );
        if (match) setThscode(match.thscode, match.name);
      } catch {
        /* ignore */
      }
    }
    void resolveName();
    return () => {
      cancelled = true;
    };
  }, [needsStock, thscode, setThscode]);

  async function searchSymbols() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "搜索失败");
      setResults(data.item ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  if (!activeModuleId || !module) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#10141a] px-6 text-center text-white/40">
        <SlidersHorizontal className="mb-3 h-8 w-8 opacity-40" />
        <p className="text-sm">从看板库选择一个模块开始</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-white/[0.07] bg-[#10141a] text-white/90">
      <div className="border-b border-white/[0.07] px-4 py-4">
        <p className="text-[11px] uppercase tracking-wider text-white/35">数据面板</p>
        <h2 className="mt-1 text-base font-semibold text-white">{module.title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/45">{module.description}</p>
      </div>

      <div className="dark-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="rounded-xl border border-white/[0.07] bg-[#10141a] p-4">
          <p className="text-xs font-medium text-white/50">数据源</p>
          <p className="mt-1 break-all font-mono text-[11px] text-[#8eb6ff]/90">
            {module.endpoint}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            API Key 经 Next.js 服务端代理，不会暴露给浏览器。
          </p>
        </section>

        {needsStock && (
          <section className="space-y-3">
            <p className="text-xs font-medium text-white/50">标的检索</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void searchSymbols();
                  }}
                  placeholder="股票名称或代码"
                  className="w-full rounded-lg border border-white/[0.07] bg-[#141a22] py-2.5 pl-9 pr-3 text-sm text-white/90 placeholder:text-white/30 focus:border-[#4f8cff]/35 focus:outline-none"
                />
              </div>
              <button
                onClick={() => void searchSymbols()}
                disabled={loading}
                className="rounded-lg bg-[#4f8cff]/15 px-3 text-sm text-[#8eb6ff] transition hover:bg-[#4f8cff]/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "搜索"}
              </button>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {results.length > 0 && (
              <ul className="overflow-hidden rounded-lg border border-white/[0.07]">
                {results.map((item) => (
                  <li key={item.thscode}>
                    <button
                      type="button"
                      onClick={() => {
                        setThscode(item.thscode, item.name);
                        openModule("stock-overview", item.thscode);
                        setResults([]);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-[#141a22]"
                    >
                      <span>
                        <span className="font-medium text-white/90">{item.name}</span>
                        <span className="ml-2 text-xs text-white/35">{item.thscode}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-lg border border-white/[0.07] bg-[#141a22] px-3 py-3">
              <p className="text-xs text-white/35">当前标的</p>
              <p className="mt-1 text-sm font-medium text-white">{stockName}</p>
              <p className="font-mono text-xs text-white/45">{thscode}</p>
            </div>
          </section>
        )}

        {activeModuleId === "market-heat" && (
          <section className="rounded-xl border border-white/[0.07] bg-[#10141a] p-4 text-xs leading-relaxed text-white/45">
            热股榜与飙升榜会在右侧自动加载。可在预览区切换日榜 / 小时榜。
          </section>
        )}

        {activeModuleId === "limit-up-market" && (
          <section className="rounded-xl border border-white/[0.07] bg-[#10141a] p-4 text-xs leading-relaxed text-white/45">
            展示最新可用交易日的涨停池，按连板天数降序排列。
          </section>
        )}
      </div>
    </div>
  );
}
