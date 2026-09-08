import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError, type PriceSnapshotItem } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const thscodes = request.nextUrl.searchParams.get("thscodes")?.trim();
  if (!thscodes) {
    return Response.json({ error: "缺少 thscodes 参数" }, { status: 400 });
  }

  try {
    const data = await fetchFinance<{ item: PriceSnapshotItem[]; timestamp: number | null }>(
      "/api/a-share/prices/snapshot",
      { thscodes },
    );
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
