"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { CandlestickChart } from "@/components/candlestick-chart";
import ListFilter from "@/components/ListFilter";
import { formatMoney, formatPct, formatPrice, pctClass } from "@/lib/format";
import type { PriceBarItem, PriceSnapshotItem } from "@/lib/hithink-finance";
import { oneYearRangeMs, periodReturn } from "@/lib/stats";

type IndexItem = { thscode: string; name: string };
type Constituent = { thscode: string; ticker: string; name: string };

export default function ConceptBoardView() {
  const [catalog, setCatalog] = useState<IndexItem[]>([]);
  const [query, setQuery] = useState("机器人");
  const [selected, setSelected] = useState<IndexItem | null>(null);
  const [bars, setBars] = useState<PriceBarItem[]>([]);
  const [snap, setSnap] = useState<PriceSnapshotItem | null>(null);
  const [constituents, setConstituents] = useState<Constituent[]>([]);
  const [constFilter, setConstFilter] = useState("");
  const [constSnaps, setConstSnaps] = useState<Record<string, PriceSnapshotItem>>({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setLoading(true);
      try {
        const res = await fetch("/api/index-catalog?tag=cn_concept");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "目录加载失败");
        if (!cancelled) {
          const items = (data.item ?? []) as IndexItem[];
          setCatalog(items);
          const hit =
            items.find((i) => i.name.includes("机器人")) ||
            items.find((i) => i.name.includes("人工智能")) ||
            items[0];
          if (hit) setSelected(hit);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      setError(null);
      try {
        const { start, end } = oneYearRangeMs();
        const [histRes, snapRes, consRes] = await Promise.all([
          fetch(
            `/api/index-history?thscode=${encodeURIComponent(selected!.thscode)}&start=${start}&end=${end}`,
          ),
          fetch(`/api/index-snapshot?thscodes=${encodeURIComponent(selected!.thscode)}`),
          fetch(`/api/index-constituents?thscode=${encodeURIComponent(selected!.thscode)}`),
        ]);
        const hist = await histRes.json();
        const snapData = await snapRes.json();
        const cons = await consRes.json();
        if (!histRes.ok) throw new Error(hist.error ?? "历史失败");
        if (!snapRes.ok) throw new Error(snapData.error ?? "快照失败");
        if (!consRes.ok) throw new Error(cons.error ?? "成分失败");
        if (cancelled) return;
        const sorted = [...(hist.item as PriceBarItem[])].sort((a, b) => a.date_ms - b.date_ms);
        setBars(sorted);
        setSnap(snapData.item?.[0] ?? null);
        const list = (cons.item ?? []) as Constituent[];
        setConstituents(list);

        const codes = list.slice(0, 40).map((c) => c.thscode).join(",");
        if (codes) {
          const sRes = await fetch(`/api/snapshot?thscodes=${encodeURIComponent(codes)}`);
          const sData = await sRes.json();
          if (sRes.ok && !cancelled) {
            const map: Record<string, PriceSnapshotItem> = {};
            for (const item of (sData.item ?? []) as PriceSnapshotItem[]) {
              map[item.thscode] = item;
            }
            setConstSnaps(map);
          }
        } else {
          setConstSnaps({});
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "详情加载失败");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.slice(0, 40);
    return catalog.filter((i) => i.name.toLowerCase().includes(q) || i.thscode.toLowerCase().includes(q)).slice(0, 40);
  }, [catalog, query]);

  const filteredCons = useMemo(() => {
    const q = constFilter.trim().toLowerCase();
    if (!q) return constituents;
    return constituents.filter(
      (c) => c.name.toLowerCase().includes(q) || c.thscode.toLowerCase().includes(q),
    );
  }, [constFilter, constituents]);

  const rangeRet = periodReturn(bars);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载概念目录…
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
          <h3 className="text-sm font-semibold text-white/90">概念目录</h3>
          <div className="mt-3">
            <ListFilter value={query} onChange={setQuery} placeholder="搜索概念…" />
          </div>
          <ul className="mt-3 max-h-[420px] space-y-1 overflow-auto">
            {filteredCatalog.map((item) => (
              <li key={item.thscode}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    selected?.thscode === item.thscode
                      ? "bg-[#4f8cff]/15 text-[#8eb6ff]"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="truncate font-mono text-[11px] text-white/30">{item.thscode}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="当前概念" value={selected?.name ?? "—"} />
            <Stat
              label="最新点位"
              value={formatPrice(snap?.last_price)}
              tone={pctClass(snap?.price_change_ratio_pct)}
            />
            <Stat label="近一年区间" value={formatPct(rangeRet)} tone={pctClass(rangeRet)} />
          </div>

          <section className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white/90">指数日 K</h3>
                <p className="text-xs text-white/35">指数无复权 · 当前成分 ≠ 历史成分</p>
              </div>
              {detailLoading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
            </div>
            <CandlestickChart bars={bars} height={360} />
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white/90">
                  当前成分股 · {constituents.length}
                </h3>
                <p className="text-xs text-white/35">最多展示前 40 只行情快照</p>
              </div>
              <ListFilter
                value={constFilter}
                onChange={setConstFilter}
                placeholder="筛选成分…"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-white/35">
                    <th className="pb-2 pr-3">名称</th>
                    <th className="pb-2 pr-3">最新价</th>
                    <th className="pb-2 pr-3">涨跌幅</th>
                    <th className="pb-2">成交额</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCons.slice(0, 60).map((c) => {
                    const s = constSnaps[c.thscode];
                    return (
                      <tr key={c.thscode} className="border-b border-white/[0.07]">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-white/35">{c.thscode}</p>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">{formatPrice(s?.last_price)}</td>
                        <td className={`py-2.5 pr-3 tabular-nums ${pctClass(s?.price_change_ratio_pct)}`}>
                          {formatPct(s?.price_change_ratio_pct)}
                        </td>
                        <td className="py-2.5 tabular-nums">{formatMoney(s?.turnover)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      <p className="text-xs text-white/30">概念涨跌不代表单股相关度 · 不构成投资建议</p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className={`mt-2 truncate text-xl font-semibold tabular-nums ${tone ?? "text-white/90"}`}>
        {value}
      </p>
    </div>
  );
}
