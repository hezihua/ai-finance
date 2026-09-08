import { NextRequest } from "next/server";

import { fetchFinance, FinanceApiError } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

const TABLES = new Set(["income", "balance", "cashflow", "indicators"]);

export async function GET(request: NextRequest) {
  const table = request.nextUrl.searchParams.get("table") ?? "income";
  const thscode = request.nextUrl.searchParams.get("thscode")?.trim();
  const period = request.nextUrl.searchParams.get("period") ?? "quarterly";
  const limit = request.nextUrl.searchParams.get("limit") ?? "8";
  const report = request.nextUrl.searchParams.get("report") ?? undefined;

  if (!thscode || !TABLES.has(table)) {
    return Response.json({ error: "缺少 thscode 或 table 非法" }, { status: 400 });
  }

  const pathMap: Record<string, string> = {
    income: "/api/a-share/financials/income-statements",
    balance: "/api/a-share/financials/balance-sheets",
    cashflow: "/api/a-share/financials/cash-flow-statements",
    indicators: "/api/a-share/financials/indicators",
  };

  try {
    const params: Record<string, string | number | undefined> =
      table === "indicators"
        ? { thscode, report }
        : { thscode, period, limit };
    const data = await fetchFinance(pathMap[table], params);
    return Response.json(data);
  } catch (error) {
    if (error instanceof FinanceApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
