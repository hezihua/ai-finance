"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { CandlestickChart } from "@/components/candlestick-chart";
import StockSearchBox from "@/components/StockSearchBox";
import {
  formatDateMs,
  formatMoney,
  formatPct,
  formatPrice,
  formatVolume,
  pctClass,
} from "@/lib/format";
import type { PriceBarItem, PriceSnapshotItem } from "@/lib/hithink-finance";
import { avgTurnover, maxDrawdown, movingAverage, oneYearRangeMs, periodReturn } from "@/lib/stats";

export default function StockOverviewView({ thscode }: { thscode: string }) {
  const [snapshot, setSnapshot] = useState<PriceSnapshotItem | null>(null);
  const [bars, setBars] = useState<PriceBarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const snapRes = await fetch(`/api/snapshot?thscodes=${encodeURIComponent(thscode)}`);
        const snapData = await snapRes.json();
        if (!snapRes.ok) throw new Error(snapData.error ?? "快照获取失败");

        const { start, end } = oneYearRangeMs();
        const histRes = await fetch(
          `/api/history?thscode=${encodeURIComponent(thscode)}&start=${start}&end=${end}&adjust=forward`,
        );
        const histData = await histRes.json();
        if (!histRes.ok) throw new Error(histData.error ?? "历史 K 线获取失败");

        if (!cancelled) {
          setSnapshot(snapData.item?.[0] ?? null);
          setBars(
            [...(histData.item as PriceBarItem[])].sort((a, b) => a.date_ms - b.date_ms),
          );
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
  }, [thscode]);

  const ma20 = useMemo(() => movingAverage(bars, 20), [bars]);
  const ma60 = useMemo(() => movingAverage(bars, 60), [bars]);
  const rangeReturn = useMemo(() => periodReturn(bars), [bars]);
  const drawdown = useMemo(() => maxDrawdown(bars, 60), [bars]);
  const avgTurn = useMemo(() => avgTurnover(bars, 20), [bars]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载 {thscode} 数据中…
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

  const changePct = snapshot?.price_change_ratio_pct;

  return (
    <div className="animate-slide-up space-y-5">
      <div className="sm:hidden">
        <StockSearchBox />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="最新价" value={formatPrice(snapshot?.last_price)} tone={pctClass(changePct)} />
        <Metric label="近一年区间收益" value={formatPct(rangeReturn)} tone={pctClass(rangeReturn)} />
        <Metric label="近60日最大回撤" value={formatPct(drawdown)} tone="text-down" />
        <Metric label="20日平均成交额" value={formatMoney(avgTurn)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        <Panel title="前复权日 K · 成交量" subtitle="红涨绿跌；MA20 / MA60 联动">
          <CandlestickChart bars={bars} ma20={ma20} ma60={ma60} />
        </Panel>
        <Panel title="当日交易结构" subtitle="快照与历史序列时间可能不同">
          <dl className="space-y-3 text-sm">
            <Row label="开盘 / 昨收" value={`${formatPrice(snapshot?.open_price)} / ${formatPrice(snapshot?.prev_price)}`} />
            <Row label="最高 / 最低" value={`${formatPrice(snapshot?.high_price)} / ${formatPrice(snapshot?.low_price)}`} />
            <Row label="成交量" value={formatVolume(snapshot?.volume)} />
            <Row label="成交额" value={formatMoney(snapshot?.turnover)} />
          </dl>
        </Panel>
      </div>

      <Panel title="最近交易日" subtitle="核对 K 线末端数值">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/35">
                <th className="pb-2 pr-4">日期</th>
                <th className="pb-2 pr-4">开盘</th>
                <th className="pb-2 pr-4">最高</th>
                <th className="pb-2 pr-4">最低</th>
                <th className="pb-2 pr-4">收盘</th>
                <th className="pb-2">成交额</th>
              </tr>
            </thead>
            <tbody>
              {bars.slice(-8).reverse().map((bar) => (
                <tr key={bar.date_ms} className="border-b border-white/[0.07]">
                  <td className="py-2.5 pr-4">{formatDateMs(bar.date_ms)}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatPrice(bar.open_price)}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-up">{formatPrice(bar.high_price)}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-down">{formatPrice(bar.low_price)}</td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium">{formatPrice(bar.close_price)}</td>
                  <td className="py-2.5 tabular-nums">{formatMoney(bar.turnover)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-xs text-white/30">
        前复权口径 · 数据源：同花顺金融数据服务 · 仅供信息展示，不构成投资建议
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      <p className="mt-1 text-xs text-white/35">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#141a22] p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone ?? "text-white/90"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-2 last:border-0">
      <dt className="text-white/35">{label}</dt>
      <dd className="tabular-nums text-white/85">{value}</dd>
    </div>
  );
}
