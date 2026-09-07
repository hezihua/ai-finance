"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import ListFilter from "@/components/ListFilter";
import { formatPct, formatPrice, pctClass } from "@/lib/format";

type RankItem = {
  thscode: string;
  name: string;
  rank?: number;
  heat?: number;
  last_price?: number;
  price_change_ratio_pct?: number;
};

type Period = "day" | "hour";

export default function MarketHeatView() {
  const [period, setPeriod] = useState<Period>("day");
  const [hotItems, setHotItems] = useState<RankItem[]>([]);
  const [skyItems, setSkyItems] = useState<RankItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [hotRes, skyRes] = await Promise.all([
          fetch(`/api/hot-stock?period=${period}`),
          fetch(`/api/skyrocket?period=${period}`),
        ]);
        const hotData = await hotRes.json();
        const skyData = await skyRes.json();
        if (!hotRes.ok) throw new Error(hotData.error ?? "热股榜加载失败");
        if (!skyRes.ok) throw new Error(skyData.error ?? "飙升榜加载失败");
        if (!cancelled) {
          setHotItems(hotData.item ?? []);
          setSkyItems(skyData.item ?? []);
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
  }, [period]);

  const overlap = hotItems.filter((hot) => skyItems.some((sky) => sky.thscode === hot.thscode)).length;

  const match = (items: RankItem[]) => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.name?.toLowerCase().includes(q) || i.thscode?.toLowerCase().includes(q),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载榜单…
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
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <StatCard label="热股榜条目" value={String(hotItems.length)} />
          <StatCard label="飙升榜条目" value={String(skyItems.length)} />
          <StatCard label="榜单重合" value={`${overlap} 只`} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ListFilter value={filter} onChange={setFilter} placeholder="筛选榜单…" />
          {(["day", "hour"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                period === p
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/5 text-white/45 hover:text-white/70"
              }`}
            >
              {p === "day" ? "日榜" : "小时榜"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RankTable title="热股榜" items={match(hotItems)} />
        <RankTable title="飙升榜" items={match(skyItems)} accent />
      </div>
    </div>
  );
}

function RankTable({
  title,
  items,
  accent = false,
}: {
  title: string;
  items: RankItem[];
  accent?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        {accent && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            飙升
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/35">
              <th className="pb-2 pr-3">排名</th>
              <th className="pb-2 pr-3">名称</th>
              <th className="pb-2 pr-3">最新价</th>
              <th className="pb-2 pr-3">涨跌幅</th>
              <th className="pb-2">热度</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 30).map((item, index) => (
              <tr key={item.thscode} className="border-b border-white/5">
                <td className="py-2.5 pr-3 tabular-nums">{item.rank ?? index + 1}</td>
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-white/90">{item.name}</p>
                  <p className="text-xs text-white/35">{item.thscode}</p>
                </td>
                <td className="py-2.5 pr-3 tabular-nums">{formatPrice(item.last_price)}</td>
                <td className={`py-2.5 pr-3 tabular-nums ${pctClass(item.price_change_ratio_pct)}`}>
                  {formatPct(item.price_change_ratio_pct)}
                </td>
                <td className="py-2.5 tabular-nums text-white/45">
                  {item.heat != null ? item.heat.toLocaleString("zh-CN") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
