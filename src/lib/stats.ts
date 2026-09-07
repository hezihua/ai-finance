import type { PriceBarItem } from "./hithink-finance";

export function movingAverage(bars: PriceBarItem[], period: number): (number | null)[] {
  return bars.map((_, i) => {
    if (i < period - 1) return null;
    const slice = bars.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, bar) => acc + bar.close_price, 0);
    return sum / period;
  });
}

export function periodReturn(bars: PriceBarItem[]): number | null {
  if (bars.length < 2) return null;
  const first = bars[0].close_price;
  const last = bars[bars.length - 1].close_price;
  if (!first) return null;
  return ((last - first) / first) * 100;
}

export function maxDrawdown(bars: PriceBarItem[], window = 60): number | null {
  if (bars.length < 2) return null;
  const slice = bars.slice(-window);
  let peak = slice[0].close_price;
  let maxDd = 0;
  for (const bar of slice) {
    peak = Math.max(peak, bar.close_price);
    const dd = (bar.close_price - peak) / peak;
    maxDd = Math.min(maxDd, dd);
  }
  return maxDd * 100;
}

export function avgTurnover(bars: PriceBarItem[], window = 20): number | null {
  if (!bars.length) return null;
  const slice = bars.slice(-window);
  const sum = slice.reduce((acc, bar) => acc + (bar.turnover ?? 0), 0);
  return sum / slice.length;
}

export function oneYearRangeMs(): { start: number; end: number } {
  const end = Date.now();
  const start = end - 365 * 24 * 60 * 60 * 1000;
  return { start, end };
}
