import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "day";

  try {
    const data = await fetchFinance("/api/a-share/special-data/skyrocket-list", { period });
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
