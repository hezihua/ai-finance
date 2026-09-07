import type { FinanceModule } from "@/types";

export const FINANCE_MODULES: FinanceModule[] = [
  {
    id: "stock-overview",
    title: "单股行情与趋势速览",
    description:
      "最新快照、前复权日 K、MA20/MA60、区间收益、最大回撤与成交额联动分析。",
    tags: ["行情", "K线", "均线", "REST API"],
    endpoint: "/api/a-share/prices/historical",
    defaultThscode: "300033.SZ",
  },
  {
    id: "limit-up-market",
    title: "涨停池与连板天梯",
    description: "当日涨停结构、连板层级分布、封单金额与涨停原因一览。",
    tags: ["涨停", "连板", "特色数据"],
    endpoint: "/api/a-share/special-data/limit-up-pool",
  },
  {
    id: "market-heat",
    title: "市场热度与飙升雷达",
    description: "热股榜与飙升榜联动，观察关注度层次与排名变化。",
    tags: ["热榜", "飙升榜", "特色数据"],
    endpoint: "/api/a-share/special-data/hot-stock-list",
  },
  {
    id: "dragon-tiger",
    title: "龙虎榜机构与游资观察",
    description: "全部榜 / 机构榜 / 游资榜净额结构与活跃席位。",
    tags: ["龙虎榜", "机构", "游资"],
    endpoint: "/api/a-share/special-data/dragon-tiger-list",
  },
  {
    id: "concept-board",
    title: "同花顺概念板块联动",
    description: "概念指数走势与当前成分股同屏，观察板块联动边界。",
    tags: ["概念", "板块", "成分股"],
    endpoint: "/api/a-share-index/catalog/ths-index-list",
  },
  {
    id: "financial-health",
    title: "单股财务体检",
    description: "利润表、资产负债表、现金流量表多期对照与关键盈利指标。",
    tags: ["财务", "利润表", "现金流"],
    endpoint: "/api/a-share/financials/income-statements",
    defaultThscode: "300033.SZ",
  },
  {
    id: "watchlist-anomalies",
    title: "自选股当日异动监控",
    description: "自选股快照与当日异动原因组合，可筛选有异动标的。",
    tags: ["自选", "异动", "监控"],
    endpoint: "/api/a-share/special-data/anomaly-analysis-stock",
  },
  {
    id: "industry-strength",
    title: "行业强度作战矩阵",
    description: "行业指数横截面涨跌与成分分布联动观察。",
    tags: ["行业", "强度", "横截面"],
    endpoint: "/api/a-share-index/catalog/ths-index-list",
  },
  {
    id: "market-research",
    title: "市场情绪与宽度观察",
    description:
      "主要指数、涨停结构、热股与飙升榜摘要（远端版，无需本地 DuckDB）。",
    tags: ["市场", "情绪", "宽度"],
    endpoint: "/api/a-share/special-data/limit-up-pool",
  },
];

export function getTagCounts(modules: FinanceModule[]) {
  const counts = new Map<string, number>();
  for (const mod of modules) {
    for (const tag of mod.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getModuleById(id: string) {
  return FINANCE_MODULES.find((mod) => mod.id === id);
}

export const DEFAULT_WATCHLIST = [
  "300033.SZ",
  "600519.SH",
  "000001.SZ",
  "300750.SZ",
  "601318.SH",
  "002594.SZ",
];
