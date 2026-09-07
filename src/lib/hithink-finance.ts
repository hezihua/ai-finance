export const HITHINK_API_BASE =
  process.env.HITHINK_FINANCE_API_BASE ?? "https://fuyao.aicubes.cn";

export function getApiKey(): string | undefined {
  return process.env.HITHINK_FINANCE_API_KEY?.trim() || undefined;
}

export type ApiEnvelope<T> = {
  code: number;
  message?: string;
  data: T;
};

export class FinanceApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
  ) {
    super(message);
    this.name = "FinanceApiError";
  }
}

export async function fetchFinance<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new FinanceApiError(
      "未配置 HITHINK_FINANCE_API_KEY，请在 .env.local 中设置",
      503,
    );
  }

  const url = new URL(path, HITHINK_API_BASE);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: { "X-api-key": apiKey },
    cache: "no-store",
  });

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new FinanceApiError(
      body.message ?? `HTTP ${response.status}`,
      response.status,
      body.code,
    );
  }

  if (body.code !== 0) {
    throw new FinanceApiError(body.message ?? `API code ${body.code}`, 502, body.code);
  }

  return body.data;
}

export type TickerItem = {
  thscode: string;
  ticker: string;
  name: string;
  exchange: string | null;
  asset_type: string;
  currency: string;
};

export type PriceSnapshotItem = {
  thscode: string;
  ticker: string;
  last_price: number;
  price_change: number;
  price_change_ratio_pct: number;
  open_price: number;
  high_price: number;
  low_price: number;
  prev_price: number;
  volume: number;
  turnover: number;
};

export type PriceBarItem = {
  date_ms: number;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  turnover: number;
};

export type LimitUpItem = {
  thscode: string;
  ticker: string;
  name: string;
  is_st: boolean;
  is_new: boolean;
  last_price: number;
  price_change_ratio_pct: number;
  limit_up_time: string;
  limit_up_reason: string;
  continue_day_text: string;
  continue_day_cnt: number;
  seal_money: number;
  max_seal_money: number;
};

export type HotStockItem = {
  thscode: string;
  ticker: string;
  name: string;
  rank: number;
  heat?: number;
  last_price?: number;
  price_change_ratio_pct?: number;
};
