import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError, type LimitUpItem } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = params.get("page") ?? "1";
  const size = params.get("size") ?? "50";
  const sortField = params.get("sort_field") ?? "continue_day_cnt";
  const sortDir = params.get("sort_dir") ?? "desc";

  try {
    const data = await fetchFinance<{
      timestamp: number;
      pagination: { total: number; pages: number; size: number; page: number };
      item: LimitUpItem[];
    }>("/api/a-share/special-data/limit-up-pool", {
      page,
      size,
      sort_field: sortField,
      sort_dir: sortDir,
    });
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
