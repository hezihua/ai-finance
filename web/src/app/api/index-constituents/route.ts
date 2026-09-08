import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const thscode = request.nextUrl.searchParams.get("thscode")?.trim();
  if (!thscode) {
    return Response.json({ error: "缺少 thscode" }, { status: 400 });
  }
  try {
    const data = await fetchFinance("/api/a-share-index/constituents/ths-stock-list", {
      thscode,
    });
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
