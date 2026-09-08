import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const thscodes = request.nextUrl.searchParams.get("thscodes")?.trim();
  const tagCodes = request.nextUrl.searchParams.get("tag_codes") ?? undefined;

  try {
    if (thscodes) {
      const data = await fetchFinance(
        "/api/a-share/special-data/anomaly-analysis-stock",
        { thscodes },
      );
      return Response.json(data);
    }
    const data = await fetchFinance("/api/a-share/special-data/anomaly-analysis-list", {
      tag_codes: tagCodes,
    });
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
