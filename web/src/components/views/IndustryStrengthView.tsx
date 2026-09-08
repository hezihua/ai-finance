"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import ListFilter from "@/components/ListFilter";
import { formatMoney, formatPct, formatPrice, pctClass } from "@/lib/format";
import type { PriceSnapshotItem } from "@/lib/hithink-finance";
import { oneYearRangeMs } from "@/lib/stats";

type IndexItem = { thscode: string; name: string };
type Row = IndexItem & {
  snap?: PriceSnapshotItem;
  ret20?: number | null;
  ret60?: number | null;
};

type Constituent = { thscode: string; name: string };

export default function IndustryStrengthView() {
  const [catalog, setCatalog] = useState<IndexItem[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [constituents, setConstituents] = useState<Constituent[]>([]);
  const [constSnaps, setConstSnaps] = useState<PriceSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/index-catalog?tag=industry");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "行业目录失败");
        const items = ((data.item ?? []) as IndexItem[]).slice(0, 48);
        if (cancelled) return;
        setCatalog(items);

        const codes = items.map((i) => i.thscode).join(",");
        const snapRes = await fetch(`/api/index-snapshot?thscodes=${encodeURIComponent(codes)}`);
        const snapData = await snapRes.json();
        if (!snapRes.ok) throw new Error(snapData.error ?? "行业快照失败");
        const snapMap = new Map<string, PriceSnapshotItem>();
        for (const s of (snapData.item ?? []) as PriceSnapshotItem[]) {
          snapMap.set(s.thscode, s);
        }

        const { start, end } = oneYearRangeMs();
        // sample history for first 24 to keep requests bounded
        const histTargets = items.slice(0, 24);
        const histResults = await Promise.all(
          histTargets.map(async (item) => {
            try {
              const hRes = await fetch(
                `/api/index-history?thscode=${encodeURIComponent(item.thscode)}&start=${start}&end=${end}`,
              );
              const hData = await hRes.json();
              if (!hRes.ok) return { thscode: item.thscode, ret20: null, ret60: null };
              const bars = [...(hData.item ?? [])].sort(
                (a: { date_ms: number }, b: { date_ms: number }) => a.date_ms - b.date_ms,
              );
              const ret = (n: number) => {
                if (bars.length < n + 1) return null;
                const last = bars[bars.length - 1].close_price;
                const base = bars[bars.length - 1 - n].close_price;
                if (!base) return null;
                return ((last - base) / base) * 100;
              };
              return { thscode: item.thscode, ret20: ret(20), ret60: ret(60) };
            } catch {
              return { thscode: item.thscode, ret20: null, ret60: null };
            }
          }),
        );
        const histMap = new Map(histResults.map((h) => [h.thscode, h]));

        if (!cancelled) {
          const next = items
            .map((item) => ({
              ...item,
              snap: snapMap.get(item.thscode),
              ret20: histMap.get(item.thscode)?.ret20 ?? null,
              ret60: histMap.get(item.thscode)?.ret60 ?? null,
            }))
            .sort(
              (a, b) =>
                (b.snap?.price_change_ratio_pct ?? -999) - (a.snap?.price_change_ratio_pct ?? -999),
            );
          setRows(next);
          setSelected(next[0] ?? null);
        }
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
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const consRes = await fetch(
          `/api/index-constituents?thscode=${encodeURIComponent(selected!.thscode)}`,
        );
        const consData = await consRes.json();
        if (!consRes.ok) throw new Error(consData.error ?? "成分失败");
        const list = ((consData.item ?? []) as Constituent[]).slice(0, 40);
        if (cancelled) return;
        setConstituents(list);
        if (!list.length) {
          setConstSnaps([]);
          return;
        }
        const snapRes = await fetch(
          `/api/snapshot?thscodes=${encodeURIComponent(list.map((c) => c.thscode).join(","))}`,
        );
        const snapData = await snapRes.json();
        if (!cancelled) setConstSnaps(snapData.item ?? []);
      } catch {
        if (!cancelled) {
          setConstituents([]);
          setConstSnaps([]);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.thscode.toLowerCase().includes(q),
    );
  }, [filter, rows]);

  const upCount = constSnaps.filter((s) => (s.price_change_ratio_pct ?? 0) > 0).length;
  const downCount = constSnaps.filter((s) => (s.price_change_ratio_pct ?? 0) < 0).length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载行业强度（含抽样历史）…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white/90">行业强度矩阵</h2>
          <p className="mt-1 text-xs text-white/40">
            展示前 {catalog.length} 个行业快照；20/60 日收益抽样前 24 个行业
          </p>
        </div>
        <ListFilter value={filter} onChange={setFilter} placeholder="筛选行业…" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.slice(0, 12).map((row) => (
          <button
            key={row.thscode}
            type="button"
            onClick={() => setSelected(row)}
            className={`rounded-2xl border p-4 text-left transition ${
              selected?.thscode === row.thscode
                ? "border-[#4f8cff]/40 bg-[#4f8cff]/12"
                : "border-white/[0.07] bg-[#141a22] hover:border-white/15"
            }`}
          >
            <p className="truncate text-sm font-medium text-white/90">{row.name}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${pctClass(row.snap?.price_change_ratio_pct)}`}>
              {formatPct(row.snap?.price_change_ratio_pct)}
            </p>
            <p className="mt-2 text-[11px] text-white/40">
              20日 {formatPct(row.ret20)} · 60日 {formatPct(row.ret60)}
            </p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white/90">
              {selected?.name ?? "行业"} · 成分涨跌分布
            </h3>
            <p className="text-xs text-white/35">
              上涨 {upCount} / 下跌 {downCount}
              {detailLoading ? " · 加载中" : ""}
            </p>
          </div>
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
              {constituents.map((c) => {
                const s = constSnaps.find((x) => x.thscode === c.thscode);
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

      <p className="text-xs text-white/30">
        成分等权涨跌不等于指数贡献 · 不构成投资建议
      </p>
    </div>
  );
}
