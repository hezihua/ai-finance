import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError, type PriceBarItem } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const thscode = request.nextUrl.searchParams.get("thscode")?.trim();
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const adjust = request.nextUrl.searchParams.get("adjust") ?? "forward";

  if (!thscode || !start || !end) {
    return Response.json({ error: "缺少 thscode / start / end 参数" }, { status: 400 });
  }

  try {
    const data = await fetchFinance<{ item: PriceBarItem[]; timestamp: number }>(
      "/api/a-share/prices/historical",
      {
        thscode,
        interval: "1d",
        start,
        end,
        adjust,
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
