"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import ListFilter from "@/components/ListFilter";
import StockSearchBox from "@/components/StockSearchBox";
import { formatMoney, formatPct, formatPrice, pctClass } from "@/lib/format";
import { DEFAULT_WATCHLIST } from "@/lib/modules";
import type { PriceSnapshotItem, TickerItem } from "@/lib/hithink-finance";
import { useFinance } from "@/context/FinanceContext";

type Anomaly = {
  thscode: string;
  stock_name?: string;
  analysis_content?: string;
  tag_name?: string;
  keyword_list?: string[];
};

const STORAGE_KEY = "ai-finance-watchlist";

export default function WatchlistAnomaliesView() {
  const { setThscode, openModule } = useFinance();
  const [codes, setCodes] = useState<string[]>(DEFAULT_WATCHLIST);
  const [names, setNames] = useState<Record<string, string>>({});
  const [snaps, setSnaps] = useState<PriceSnapshotItem[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [onlyAnomaly, setOnlyAnomaly] = useState(false);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addQ, setAddQ] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) setCodes(parsed.slice(0, 20));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  }, [codes]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!codes.length) {
        setSnaps([]);
        setAnomalies([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const joined = codes.join(",");
        const [sRes, aRes, ...nameRes] = await Promise.all([
          fetch(`/api/snapshot?thscodes=${encodeURIComponent(joined)}`),
          fetch(`/api/anomalies?thscodes=${encodeURIComponent(joined)}`),
          ...codes.slice(0, 8).map((c) => fetch(`/api/search?q=${encodeURIComponent(c)}`)),
        ]);
        const sData = await sRes.json();
        const aData = await aRes.json();
        if (!sRes.ok) throw new Error(sData.error ?? "快照失败");
        if (!aRes.ok) throw new Error(aData.error ?? "异动失败");
        if (cancelled) return;
        setSnaps(sData.item ?? []);
        setAnomalies(aData.item ?? []);

        const nameMap: Record<string, string> = {};
        for (let i = 0; i < Math.min(codes.length, nameRes.length); i++) {
          const res = nameRes[i];
          if (!res.ok) continue;
          const data = await res.json();
          const hit = (data.item as TickerItem[] | undefined)?.find((t) => t.thscode === codes[i]);
          if (hit) nameMap[hit.thscode] = hit.name;
        }
        setNames((prev) => ({ ...prev, ...nameMap }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [codes]);

  const anomalyMap = useMemo(() => {
    const map = new Map<string, Anomaly[]>();
    for (const a of anomalies) {
      const list = map.get(a.thscode) ?? [];
      list.push(a);
      map.set(a.thscode, list);
    }
    return map;
  }, [anomalies]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return snaps
      .map((s) => ({
        snap: s,
        name: names[s.thscode] ?? s.ticker,
        anomalies: anomalyMap.get(s.thscode) ?? [],
      }))
      .filter((r) => {
        if (onlyAnomaly && r.anomalies.length === 0) return false;
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.snap.thscode.toLowerCase().includes(q) ||
          r.anomalies.some((a) => a.analysis_content?.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => (b.snap.price_change_ratio_pct ?? 0) - (a.snap.price_change_ratio_pct ?? 0));
  }, [anomalyMap, filter, names, onlyAnomaly, snaps]);

  async function addByQuery() {
    const q = addQ.trim();
    if (!q) return;
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const hit = (data.item as TickerItem[] | undefined)?.[0];
    if (!hit) {
      setError("未找到标的");
      return;
    }
    setCodes((prev) => Array.from(new Set([...prev, hit.thscode])).slice(0, 20));
    setNames((prev) => ({ ...prev, [hit.thscode]: hit.name }));
    setAddQ("");
    setError(null);
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white/90">自选股当日异动</h2>
          <p className="mt-1 text-xs text-white/40">最多 20 只 · 异动仅当日快照</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={addQ}
            onChange={(e) => setAddQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addByQuery();
            }}
            placeholder="添加自选…"
            className="rounded-lg border border-white/10 bg-[#1c2430] px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => void addByQuery()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#4f8cff]/15 px-3 py-2 text-sm text-[#8eb6ff]"
          >
            <Plus className="h-4 w-4" />
            添加
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {codes.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70"
          >
            {names[code] ?? code}
            <button
              type="button"
              onClick={() => setCodes((prev) => prev.filter((c) => c !== code))}
              className="text-white/30 hover:text-white/70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ListFilter value={filter} onChange={setFilter} />
        <label className="flex items-center gap-2 text-xs text-white/50">
          <input
            type="checkbox"
            checked={onlyAnomaly}
            onChange={(e) => setOnlyAnomaly(e.target.checked)}
          />
          仅看有异动
        </label>
        <div className="ml-auto w-full max-w-xs">
          <StockSearchBox placeholder="搜股票开个股看板…" />
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载自选与异动…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {!loading && (
        <section className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/35">
                  <th className="pb-2 pr-3">标的</th>
                  <th className="pb-2 pr-3">最新价</th>
                  <th className="pb-2 pr-3">涨跌幅</th>
                  <th className="pb-2 pr-3">成交额</th>
                  <th className="pb-2">当日异动</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ snap, name, anomalies: ans }) => (
                  <tr key={snap.thscode} className="border-b border-white/[0.07] align-top">
                    <td className="py-2.5 pr-3">
                      <button
                        type="button"
                        className="text-left hover:text-[#8eb6ff]"
                        onClick={() => {
                          setThscode(snap.thscode, name);
                          openModule("stock-overview", snap.thscode);
                        }}
                      >
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-white/35">{snap.thscode}</p>
                      </button>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPrice(snap.last_price)}</td>
                    <td className={`py-2.5 pr-3 tabular-nums ${pctClass(snap.price_change_ratio_pct)}`}>
                      {formatPct(snap.price_change_ratio_pct)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatMoney(snap.turnover)}</td>
                    <td className="py-2.5 text-white/55">
                      {ans.length === 0 ? (
                        <span className="text-white/30">暂无匹配记录</span>
                      ) : (
                        <ul className="space-y-1">
                          {ans.map((a, i) => (
                            <li key={i} className="text-xs leading-relaxed">
                              <span className="mr-2 rounded bg-white/5 px-1.5 py-0.5 text-[#8eb6ff]">
                                {a.tag_name || "异动"}
                              </span>
                              {a.analysis_content}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
