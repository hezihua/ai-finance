"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import ListFilter from "@/components/ListFilter";
import { formatMoney, formatPct, formatPrice, pctClass } from "@/lib/format";
import type { LimitUpItem, PriceSnapshotItem } from "@/lib/hithink-finance";

type RankItem = {
  thscode: string;
  name: string;
  rank?: number;
  heat?: number;
  price_change_ratio_pct?: number;
};

const INDEX_CODES = "000001.SH,399001.SZ,000300.SH,399006.SZ";

export default function MarketResearchView() {
  const [indices, setIndices] = useState<PriceSnapshotItem[]>([]);
  const [limitUp, setLimitUp] = useState<LimitUpItem[]>([]);
  const [hot, setHot] = useState<RankItem[]>([]);
  const [sky, setSky] = useState<RankItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [iRes, lRes, hRes, sRes] = await Promise.all([
          fetch(`/api/index-snapshot?thscodes=${encodeURIComponent(INDEX_CODES)}`),
          fetch("/api/limit-up?size=100&sort_field=continue_day_cnt&sort_dir=desc"),
          fetch("/api/hot-stock?period=day"),
          fetch("/api/skyrocket?period=day"),
        ]);
        const [iData, lData, hData, sData] = await Promise.all([
          iRes.json(),
          lRes.json(),
          hRes.json(),
          sRes.json(),
        ]);
        if (!iRes.ok) throw new Error(iData.error ?? "指数失败");
        if (!lRes.ok) throw new Error(lData.error ?? "涨停失败");
        if (!hRes.ok) throw new Error(hData.error ?? "热股失败");
        if (!sRes.ok) throw new Error(sData.error ?? "飙升失败");
        if (!cancelled) {
          setIndices(iData.item ?? []);
          setLimitUp(lData.item ?? []);
          setHot(hData.item ?? []);
          setSky(sData.item ?? []);
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

  const maxBoard = limitUp.reduce((m, i) => Math.max(m, i.continue_day_cnt ?? 0), 0);
  const overlap = hot.filter((h) => sky.some((s) => s.thscode === h.thscode)).length;
  const indexNames: Record<string, string> = {
    "000001.SH": "上证指数",
    "399001.SZ": "深证成指",
    "000300.SH": "沪深300",
    "399006.SZ": "创业板指",
  };

  const match = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const hit = (name?: string, code?: string) =>
      !q || (name?.toLowerCase().includes(q) ?? false) || (code?.toLowerCase().includes(q) ?? false);
    return {
      limitUp: limitUp.filter((i) => hit(i.name, i.thscode)),
      hot: hot.filter((i) => hit(i.name, i.thscode)),
      sky: sky.filter((i) => hit(i.name, i.thscode)),
    };
  }, [filter, hot, limitUp, sky]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        汇总市场情绪数据…
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white/90">市场情绪与宽度观察</h2>
          <p className="mt-1 text-xs text-white/40">
            远端摘要版：指数 + 涨停结构 + 热榜，无需本地 DuckDB
          </p>
        </div>
        <ListFilter value={filter} onChange={setFilter} placeholder="筛选列表…" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indices.map((idx) => (
          <div key={idx.thscode} className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
            <p className="text-xs text-white/35">{indexNames[idx.thscode] ?? idx.thscode}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">
              {formatPrice(idx.last_price)}
            </p>
            <p className={`mt-1 text-sm tabular-nums ${pctClass(idx.price_change_ratio_pct)}`}>
              {formatPct(idx.price_change_ratio_pct)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="涨停数量" value={String(limitUp.length)} />
        <Stat label="最高连板" value={`${maxBoard} 板`} />
        <Stat label="热股∩飙升" value={`${overlap} 只`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RankPanel
          title="涨停高连板"
          rows={match.limitUp.slice(0, 12).map((i) => ({
            name: i.name,
            code: i.thscode,
            right: i.continue_day_text || `${i.continue_day_cnt}连板`,
            sub: formatMoney(i.seal_money),
          }))}
        />
        <RankPanel
          title="热股榜 Top"
          rows={match.hot.slice(0, 12).map((i, idx) => ({
            name: i.name,
            code: i.thscode,
            right: `#${i.rank ?? idx + 1}`,
            sub: formatPct(i.price_change_ratio_pct),
          }))}
        />
        <RankPanel
          title="飙升榜 Top"
          rows={match.sky.slice(0, 12).map((i, idx) => ({
            name: i.name,
            code: i.thscode,
            right: `#${i.rank ?? idx + 1}`,
            sub: formatPct(i.price_change_ratio_pct),
          }))}
        />
      </div>

      <p className="text-xs text-white/30">
        若需全市场 DuckDB 研究面板，可后续接入 marketdb · 不构成投资建议
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{value}</p>
    </div>
  );
}

function RankPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; code: string; right: string; sub: string }>;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white/90">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.code + r.right}
            className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/85">{r.name}</p>
              <p className="truncate text-[11px] text-white/35">{r.code}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">{r.right}</p>
              <p className="text-[11px] text-white/40">{r.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
