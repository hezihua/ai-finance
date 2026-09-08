import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const thscode = request.nextUrl.searchParams.get("thscode")?.trim();
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!thscode || !start || !end) {
    return Response.json({ error: "缺少 thscode / start / end" }, { status: 400 });
  }
  try {
    const data = await fetchFinance("/api/a-share-index/prices/historical", {
      thscode,
      interval: "1d",
      start,
      end,
    });
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
