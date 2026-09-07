"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import ListFilter from "@/components/ListFilter";
import { formatDateMs, formatMoney, formatPct, formatPrice, pctClass } from "@/lib/format";
import type { LimitUpItem } from "@/lib/hithink-finance";

export default function LimitUpView() {
  const [items, setItems] = useState<LimitUpItem[]>([]);
  const [total, setTotal] = useState(0);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/limit-up?size=100&sort_field=continue_day_cnt&sort_dir=desc");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "加载失败");
        if (!cancelled) {
          setItems(data.item ?? []);
          setTotal(data.pagination?.total ?? 0);
          setTimestamp(data.timestamp ?? null);
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

  const maxBoard = items.reduce((max, item) => Math.max(max, item.continue_day_cnt ?? 0), 0);
  const tiers = items.reduce<Record<number, number>>((acc, item) => {
    const key = item.continue_day_cnt ?? 0;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.thscode?.toLowerCase().includes(q) ||
        item.limit_up_reason?.toLowerCase().includes(q),
    );
  }, [filter, items]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载涨停池…
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
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="涨停数量" value={String(total || items.length)} />
        <StatCard label="最高连板" value={`${maxBoard} 板`} />
        <StatCard label="数据时间" value={timestamp ? formatDateMs(timestamp) : "—"} />
      </div>

      <section className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white/90">连板层级分布</h3>
            <p className="text-xs text-white/35">按 continue_day_cnt 聚合</p>
          </div>
          <ListFilter value={filter} onChange={setFilter} placeholder="筛选涨停股 / 原因…" />
        </header>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tiers)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([level, count]) => (
              <span
                key={level}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60"
              >
                {level} 连板 · {count} 只
              </span>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
        <h3 className="mb-4 text-sm font-semibold text-white/90">今日涨停池</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/35">
                <th className="pb-2 pr-3">代码</th>
                <th className="pb-2 pr-3">名称</th>
                <th className="pb-2 pr-3">连板</th>
                <th className="pb-2 pr-3">最新价</th>
                <th className="pb-2 pr-3">涨跌幅</th>
                <th className="pb-2 pr-3">涨停时间</th>
                <th className="pb-2 pr-3">封单金额</th>
                <th className="pb-2">涨停原因</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.thscode} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-3">{item.thscode}</td>
                  <td className="py-2.5 pr-3 font-medium">{item.name}</td>
                  <td className="py-2.5 pr-3">
                    {item.continue_day_text || `${item.continue_day_cnt} 连板`}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatPrice(item.last_price)}</td>
                  <td className={`py-2.5 pr-3 tabular-nums ${pctClass(item.price_change_ratio_pct)}`}>
                    {formatPct(item.price_change_ratio_pct)}
                  </td>
                  <td className="py-2.5 pr-3 text-white/45">{item.limit_up_time || "—"}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatMoney(item.seal_money)}</td>
                  <td className="max-w-xs truncate py-2.5 text-white/45" title={item.limit_up_reason}>
                    {item.limit_up_reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{value}</p>
    </div>
  );
}
