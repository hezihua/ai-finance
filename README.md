# AI Finance · 同花顺数据可视化

基于 [ai-app](https://github.com/hezihua/ai-app) 的三栏工作台架构，接入 [Financial-API](https://github.com/hezihua/Financial-API) 同花顺真实数据，提供金融看板浏览与实时可视化。

```text
浏览器 / Electron → ai-finance (Next.js) → 同花顺 REST API (fuyao.aicubes.cn)
```

## 下载桌面客户端

- [Windows x64 便携版 (.exe)](https://github.com/hezihua/ai-finance/releases/latest/download/ai-finance-win32-x64.exe)
- [全部版本 / Release](https://github.com/hezihua/ai-finance/releases/latest)

> 客户端是 Electron 壳，默认加载打包时写入的 `WEB_URL`。本地使用请先启动 Web（`pnpm dev:web`），或发布时设置仓库变量 `WEB_URL` 指向线上站点。

## Monorepo 结构

```text
ai-finance/
├── web/          # Next.js Web 应用（BFF + 看板 + Chat）
├── client/       # Electron 桌面客户端（加载 Web）
├── package.json  # 根 workspace 脚本
└── pnpm-workspace.yaml
```

## 功能

- **看板库**：9 个同花顺数据看板，可搜索/标签筛选
- **对话 Chat**：OpenRouter 多轮对话，工具取数并打开看板
- **实时预览**：K 线、涨停池、热度、龙虎榜、概念、财务、自选异动、行业强度、市场情绪
- **Electron 客户端**：桌面窗口加载 Web 应用
- **最近会话 / 看板**：7 天内记录快速回访

## 技术栈

- **web**：Next.js 16 + React 19 + Tailwind 4 + lightweight-charts
- **client**：Electron + electron-vite + electron-builder
- 同花顺 Financial-API（REST，服务端代理）
- OpenRouter（Chat）

## 本地开发

```bash
pnpm install

# Web 环境变量
cp web/.env.example web/.env.local
# 编辑 web/.env.local，填入 HITHINK_FINANCE_API_KEY 与 OPENROUTER_API_KEY

# 仅 Web
pnpm dev:web

# Web + Electron 桌面端
pnpm dev:all
```

访问 Web：[http://localhost:3000](http://localhost:3000)

Electron 默认加载 `http://localhost:3000`，可通过 `WEB_URL` 覆盖。

## 打包 Windows 客户端

```bash
# 可选：打包时写入线上 Web 地址
# WEB_URL=https://your-deployed-web.example pnpm pack:win

pnpm pack:win
```

产物在 `client/release/`：

- `ai-finance-win32-x64.exe` — Windows 便携版（约 70MB+）

本地打包建议使用镜像加速：

```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
pnpm pack:win
```

发布到 GitHub Releases：

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送 `v*` 标签后，[Release 工作流](.github/workflows/release.yml) 会自动构建并上传 exe。

## 环境变量（web/.env.local）

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `HITHINK_FINANCE_API_KEY` | 是 | 同花顺统一 API Key |
| `HITHINK_FINANCE_API_BASE` | 否 | 默认 `https://fuyao.aicubes.cn` |
| `OPENROUTER_API_KEY` | Chat 需要 | OpenRouter API Key |
| `OPENROUTER_MODEL` | 否 | 默认见 `web/.env.example` |

## Docker（仅 Web）

```bash
cp web/.env.example web/.env
docker compose up -d --build
```

## 项目结构

```
web/src/
├── app/                 # Next.js 路由与 API 代理
├── components/          # Sidebar / 看板库 / Chat / 预览区
├── context/             # 全局状态
├── lib/                 # 模块定义、格式化、统计、API 客户端
└── types/               # TypeScript 类型

client/src/
├── main/                # Electron 主进程
└── preload/             # 预加载脚本
```

## 免责声明

本应用仅供信息展示与研究参考，不构成投资建议。
