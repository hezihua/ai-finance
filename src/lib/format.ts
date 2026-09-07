const CNY = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return NUM.format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${NUM.format(value)}%`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e8) return `${sign}${NUM.format(abs / 1e8)} 亿`;
  if (abs >= 1e4) return `${sign}${NUM.format(abs / 1e4)} 万`;
  return CNY.format(value);
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const lots = value / 100;
  if (lots >= 1e4) return `${NUM.format(lots / 1e4)} 万手`;
  return `${NUM.format(lots)} 手`;
}

export function formatDateMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export function pctClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "text-muted-foreground";
  if (value > 0) return "text-up";
  if (value < 0) return "text-down";
  return "text-muted-foreground";
}
