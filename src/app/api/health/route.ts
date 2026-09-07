import { FinanceApiError, getApiKey, HITHINK_API_BASE } from "@/lib/hithink-finance";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return Response.json(
      {
        status: "missing_key",
        detail: "未配置 HITHINK_FINANCE_API_KEY",
        hint: "复制 .env.example 为 .env.local 并填入 API Key",
      },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(
      `${HITHINK_API_BASE}/api/a-share/prices/snapshot?thscodes=300033.SZ`,
      {
        headers: { "X-api-key": apiKey },
        cache: "no-store",
      },
    );
    const body = await upstream.json();
    if (!upstream.ok || body.code !== 0) {
      return Response.json(
        {
          status: "error",
          detail: body.message ?? "API 鉴权或连通失败",
        },
        { status: 502 },
      );
    }
    return Response.json({
      status: "ok",
      source: "同花顺金融数据服务",
      apiBase: HITHINK_API_BASE,
      sample: body.data?.item?.[0]?.thscode ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "探活失败";
    return Response.json({ status: "error", detail: message }, { status: 502 });
  }
}
