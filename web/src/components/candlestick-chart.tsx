"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";

import type { PriceBarItem } from "@/lib/hithink-finance";

type Props = {
  bars: PriceBarItem[];
  ma20?: (number | null)[];
  ma60?: (number | null)[];
  height?: number;
};

export function CandlestickChart({ bars, ma20, ma60, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || !bars.length) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.08)" },
        horzLines: { color: "rgba(148,163,184,0.08)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const toTime = (ms: number) => new Date(ms).toISOString().slice(0, 10);

    const candleData = bars.map((bar) => ({
      time: toTime(bar.date_ms),
      open: bar.open_price,
      high: bar.high_price,
      low: bar.low_price,
      close: bar.close_price,
    }));

    const volumeData = bars.map((bar) => ({
      time: toTime(bar.date_ms),
      value: bar.volume,
      color:
        bar.close_price >= bar.open_price
          ? "rgba(239,68,68,0.35)"
          : "rgba(34,197,94,0.35)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    const lineSeries: ISeriesApi<"Line">[] = [];
    if (ma20) {
      const s = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 2, title: "MA20" });
      s.setData(
        bars
          .map((bar, i) =>
            ma20[i] != null
              ? { time: toTime(bar.date_ms), value: ma20[i]! }
              : null,
          )
          .filter(Boolean) as { time: string; value: number }[],
      );
      lineSeries.push(s);
    }
    if (ma60) {
      const s = chart.addSeries(LineSeries, { color: "#fbbf24", lineWidth: 2, title: "MA60" });
      s.setData(
        bars
          .map((bar, i) =>
            ma60[i] != null
              ? { time: toTime(bar.date_ms), value: ma60[i]! }
              : null,
          )
          .filter(Boolean) as { time: string; value: number }[],
      );
      lineSeries.push(s);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, ma20, ma60, height]);

  if (!bars.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        暂无 K 线数据
      </div>
    );
  }

  return <div ref={containerRef} className="w-full overflow-hidden rounded-xl" />;
}
