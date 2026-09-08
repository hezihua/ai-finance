import {
  fetchFinance,
  type LimitUpItem,
  type PriceSnapshotItem,
  type TickerItem,
} from "@/lib/hithink-finance";
import type { FinanceModuleId } from "@/types";
import { oneYearRangeMs } from "@/lib/stats";

export const CHAT_SYSTEM_PROMPT = `你是 ai-finance 金融数据助手，通过同花顺 Financial-API 帮助用户理解 A 股行情与市场结构。

规则：
1. 只基于工具返回的真实数据回答；没有数据时明确说明。
2. 不得编造价格、涨跌幅、涨停原因或榜单。
3. 回答要简洁、结构化，可用要点列表。
4. 所有分析仅供信息展示，必须注明「不构成投资建议」。
5. 用户提到股票名称或不完整代码时，先用 search_stock 消歧 thscode。
6. 需要可视化时，可调用 open_dashboard 打开对应看板。`;

export const CHAT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_stock",
      description: "按名称或代码搜索 A 股标的，返回 thscode 候选",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "股票名称、代码或关键词" },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_stock_snapshot",
      description: "获取一只或多只股票最新行情快照",
      parameters: {
        type: "object",
        properties: {
          thscodes: {
            type: "string",
            description: "逗号分隔 thscode，如 600519.SH,300033.SZ",
          },
        },
        required: ["thscodes"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_stock_history_summary",
      description: "获取单只股票近一年日 K 摘要：区间收益、回撤、均价等",
      parameters: {
        type: "object",
        properties: {
          thscode: { type: "string", description: "完整 thscode" },
        },
        required: ["thscode"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_limit_up_pool",
      description: "获取最新涨停池摘要",
      parameters: {
        type: "object",
        properties: {
          size: { type: "number", description: "返回条数，默认 20" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_market_heat",
      description: "获取热股榜或飙升榜",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["hot", "skyrocket"],
            description: "hot=热股榜，skyrocket=飙升榜",
          },
          period: {
            type: "string",
            enum: ["day", "hour"],
            description: "日榜或小时榜",
          },
        },
        required: ["kind"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_dashboard",
      description: "在右侧打开可视化看板",
      parameters: {
        type: "object",
        properties: {
          moduleId: {
            type: "string",
            enum: [
              "stock-overview",
              "limit-up-market",
              "market-heat",
              "dragon-tiger",
              "concept-board",
              "financial-health",
              "watchlist-anomalies",
              "industry-strength",
              "market-research",
            ],
          },
          thscode: { type: "string", description: "个股看板时的 thscode" },
        },
        required: ["moduleId"],
      },
    },
  },
];

type ToolArgs = Record<string, unknown>;

export async function runFinanceTool(
  name: string,
  args: ToolArgs,
): Promise<{ result: unknown; action?: { type: string; moduleId?: FinanceModuleId; thscode?: string; name?: string } }> {
  switch (name) {
    case "search_stock": {
      const q = String(args.q ?? "");
      const data = await fetchFinance<{ item: TickerItem[] }>("/api/meta/tickers/search", {
        q,
        asset_type: "a-share",
        limit: 8,
      });
      return {
        result: {
          item: data.item.map((t) => ({
            thscode: t.thscode,
            name: t.name,
            exchange: t.exchange,
          })),
        },
      };
    }
    case "get_stock_snapshot": {
      const thscodes = String(args.thscodes ?? "");
      const data = await fetchFinance<{ item: PriceSnapshotItem[] }>(
        "/api/a-share/prices/snapshot",
        { thscodes },
      );
      return { result: { item: data.item } };
    }
    case "get_stock_history_summary": {
      const thscode = String(args.thscode ?? "");
      const { start, end } = oneYearRangeMs();
      const data = await fetchFinance<{
        item: Array<{
          date_ms: number;
          close_price: number;
          turnover: number;
        }>;
      }>("/api/a-share/prices/historical", {
        thscode,
        interval: "1d",
        start,
        end,
        adjust: "forward",
      });
      const bars = [...data.item].sort((a, b) => a.date_ms - b.date_ms);
      if (bars.length < 2) return { result: { error: "历史数据不足" } };
      const first = bars[0].close_price;
      const last = bars[bars.length - 1].close_price;
      let peak = bars[0].close_price;
      let maxDd = 0;
      for (const bar of bars.slice(-60)) {
        peak = Math.max(peak, bar.close_price);
        maxDd = Math.min(maxDd, (bar.close_price - peak) / peak);
      }
      const avgTurn =
        bars.slice(-20).reduce((s, b) => s + (b.turnover ?? 0), 0) /
        Math.min(20, bars.length);
      return {
        result: {
          thscode,
          bars: bars.length,
          start_close: first,
          end_close: last,
          period_return_pct: ((last - first) / first) * 100,
          max_drawdown_60d_pct: maxDd * 100,
          avg_turnover_20d: avgTurn,
          adjust: "forward",
        },
        action: { type: "open_module", moduleId: "stock-overview", thscode },
      };
    }
    case "get_limit_up_pool": {
      const size = Number(args.size ?? 20);
      const data = await fetchFinance<{
        timestamp: number;
        pagination: { total: number };
        item: LimitUpItem[];
      }>("/api/a-share/special-data/limit-up-pool", {
        page: 1,
        size,
        sort_field: "continue_day_cnt",
        sort_dir: "desc",
      });
      return {
        result: {
          total: data.pagination?.total ?? data.item.length,
          timestamp: data.timestamp,
          top: data.item.slice(0, size).map((i) => ({
            thscode: i.thscode,
            name: i.name,
            continue_day_cnt: i.continue_day_cnt,
            continue_day_text: i.continue_day_text,
            last_price: i.last_price,
            seal_money: i.seal_money,
            limit_up_reason: i.limit_up_reason,
          })),
        },
        action: { type: "open_module", moduleId: "limit-up-market" },
      };
    }
    case "get_market_heat": {
      const kind = String(args.kind ?? "hot");
      const period = String(args.period ?? "day");
      const path =
        kind === "skyrocket"
          ? "/api/a-share/special-data/skyrocket-list"
          : "/api/a-share/special-data/hot-stock-list";
      const data = await fetchFinance<{ item: Array<Record<string, unknown>> }>(path, {
        period,
      });
      return {
        result: {
          kind,
          period,
          item: (data.item ?? []).slice(0, 20),
        },
        action: { type: "open_module", moduleId: "market-heat" },
      };
    }
    case "open_dashboard": {
      const moduleId = String(args.moduleId) as FinanceModuleId;
      const thscode = args.thscode ? String(args.thscode) : undefined;
      return {
        result: { opened: true, moduleId, thscode },
        action: { type: "open_module", moduleId, thscode },
      };
    }
    default:
      return { result: { error: `未知工具: ${name}` } };
  }
}
