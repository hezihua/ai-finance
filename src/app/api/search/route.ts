import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError, type TickerItem } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "缺少 q 参数" }, { status: 400 });
  }

  try {
    const data = await fetchFinance<{ item: TickerItem[] }>(
      "/api/meta/tickers/search",
      {
        q,
        asset_type: "a-share",
        limit: 10,
      },
    );
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
