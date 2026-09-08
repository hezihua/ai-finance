import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

function proxyError(error: unknown) {
  if (error instanceof FinanceApiError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  throw error;
}

export async function GET(request: NextRequest) {
  const boardType = request.nextUrl.searchParams.get("board_type") ?? "all";
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  try {
    const data = await fetchFinance("/api/a-share/special-data/dragon-tiger-list", {
      board_type: boardType,
      date,
    });
    return Response.json(data);
  } catch (error) {
    return proxyError(error);
  }
}
