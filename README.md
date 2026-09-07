# AI Finance · 同花顺数据可视化

基于 [ai-app](https://github.com/hezihua/ai-app) 的三栏工作台架构，接入 [Financial-API](https://github.com/hezihua/Financial-API) 同花顺真实数据，提供金融看板浏览与实时可视化。

```text
浏览器 → ai-finance (Next.js) → 同花顺 REST API (fuyao.aicubes.cn)
```

## 功能

- **看板库**：9 个同花顺数据看板，可搜索/标签筛选
- **对话 Chat**：OpenRouter 多轮对话，工具取数并打开看板
- **实时预览**：K 线、涨停池、热度、龙虎榜、概念、财务、自选异动、行业强度、市场情绪
- **最近会话 / 看板**：7 天内记录快速回访

### 看板一览

| 模块 | 说明 |
| --- | --- |
| 单股行情与趋势速览 | 快照 + 前复权日 K、均线、收益与回撤 |
| 涨停池与连板天梯 | 涨停结构、连板与封单 |
| 市场热度与飙升雷达 | 热股榜 / 飙升榜联动 |
| 龙虎榜机构与游资观察 | 全部 / 机构 / 游资榜 |
| 同花顺概念板块联动 | 概念指数与成分股 |
| 单股财务体检 | 利润表 / 资产负债 / 现金流 |
| 自选股当日异动监控 | localStorage 自选 + 异动 |
| 行业强度作战矩阵 | 行业横截面涨跌 |
| 市场情绪与宽度观察 | 指数 + 涨停 + 热榜摘要 |

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS 4
- lightweight-charts（K 线）
- 同花顺 Financial-API（REST，服务端代理）
- OpenRouter（Chat）

## 本地开发

```bash
pnpm install
cp .env.example .env.local
# 编辑 .env.local，填入 HITHINK_FINANCE_API_KEY 与 OPENROUTER_API_KEY
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `HITHINK_FINANCE_API_KEY` | 是 | 同花顺统一 API Key |
| `HITHINK_FINANCE_API_BASE` | 否 | 默认 `https://fuyao.aicubes.cn` |
| `OPENROUTER_API_KEY` | Chat 需要 | OpenRouter API Key |
| `OPENROUTER_MODEL` | 否 | 默认见 `.env.example` |

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

## 项目结构

```
src/
├── app/                 # Next.js 路由与 API 代理
├── components/          # Sidebar / 看板库 / 数据面板 / 预览区
├── context/             # 全局状态（对齐 ai-app AppContext）
├── lib/                 # 模块定义、格式化、统计、API 客户端
└── types/               # TypeScript 类型
```

## 免责声明

本应用仅供信息展示与研究参考，不构成投资建议。
