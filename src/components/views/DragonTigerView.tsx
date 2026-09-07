"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import ListFilter from "@/components/ListFilter";
import { formatMoney, formatPct, pctClass } from "@/lib/format";

type BoardType = "all" | "org" | "hot_money";

type StockItem = {
  thscode: string;
  name: string;
  change?: number;
  buy_value?: number;
  sell_value?: number;
  net_value?: number;
  org_net_value?: number;
  hot_money_net_value?: number;
  limit_reason?: string;
  concept_list?: string[];
};

type HotMoneyItem = {
  name: string;
  buying?: number;
  rows?: Array<{ name?: string; thscode?: string; net_value?: number }>;
};

export default function DragonTigerView() {
  const [boardType, setBoardType] = useState<BoardType>("all");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeDate, setTradeDate] = useState<string>("—");
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [hotMoney, setHotMoney] = useState<HotMoneyItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dragon-tiger?board_type=${boardType}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "加载失败");
        if (!cancelled) {
          setTradeDate(data.trade_date ?? "—");
          setStocks(data.stock_items ?? []);
          setHotMoney(data.hot_money_items ?? []);
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
  }, [boardType]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.thscode?.toLowerCase().includes(q) ||
        s.concept_list?.some((c) => c.toLowerCase().includes(q)),
    );
  }, [filter, stocks]);

  const netSum = stocks.reduce((s, i) => s + (i.net_value ?? 0), 0);
  const orgSum = stocks.reduce((s, i) => s + (i.org_net_value ?? 0), 0);

  if (loading) return <Loading text="加载龙虎榜…" />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Stat label="交易日" value={tradeDate} />
          <Stat label="上榜股票" value={String(stocks.length)} />
          <Stat label="合计净额" value={formatMoney(netSum)} />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["all", "全部"],
              ["org", "机构"],
              ["hot_money", "游资"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBoardType(id)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                boardType === id
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/5 text-white/45 hover:text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ListFilter value={filter} onChange={setFilter} placeholder="筛选股票 / 概念…" />

      <Panel title="个股净额结构" subtitle={`机构净额合计 ${formatMoney(orgSum)}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/35">
                <th className="pb-2 pr-3">名称</th>
                <th className="pb-2 pr-3">涨跌幅</th>
                <th className="pb-2 pr-3">买入</th>
                <th className="pb-2 pr-3">卖出</th>
                <th className="pb-2 pr-3">净额</th>
                <th className="pb-2 pr-3">机构净额</th>
                <th className="pb-2">原因</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 80).map((item) => (
                <tr key={item.thscode} className="border-b border-white/5">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-white/35">{item.thscode}</p>
                  </td>
                  <td className={`py-2.5 pr-3 tabular-nums ${pctClass(item.change)}`}>
                    {formatPct(item.change)}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatMoney(item.buy_value)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatMoney(item.sell_value)}</td>
                  <td className={`py-2.5 pr-3 tabular-nums ${pctClass(item.net_value)}`}>
                    {formatMoney(item.net_value)}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatMoney(item.org_net_value)}</td>
                  <td className="max-w-xs truncate py-2.5 text-white/45" title={item.limit_reason}>
                    {item.limit_reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {hotMoney.length > 0 && (
        <Panel title="游资席位" subtitle="按买入额排序，仅展示前 20">
          <div className="grid gap-3 md:grid-cols-2">
            {hotMoney.slice(0, 20).map((hm) => (
              <div key={hm.name} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white/90">{hm.name}</p>
                  <p className="text-sm tabular-nums text-emerald-400">{formatMoney(hm.buying)}</p>
                </div>
                <p className="mt-2 text-xs text-white/40">
                  {(hm.rows ?? []).slice(0, 3).map((r) => r.name).filter(Boolean).join("、") || "—"}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <p className="text-xs text-white/30">数据源：同花顺龙虎榜 · 不构成投资建议</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-white/35">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white/90">{value}</p>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/45">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {error}
    </div>
  );
}
