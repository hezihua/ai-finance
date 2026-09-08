#!/usr/bin/env bash
# 部署 web 到 Vercel（生产）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v vercel >/dev/null 2>&1 && ! command -v pnpm >/dev/null 2>&1; then
  echo "需要安装 pnpm 或 vercel CLI"
  exit 1
fi

run_vercel() {
  if command -v vercel >/dev/null 2>&1; then
    vercel "$@"
  else
    pnpm dlx vercel@latest "$@"
  fi
}

echo "==> 检查登录状态"
run_vercel whoami >/dev/null

if [[ ! -f .vercel/project.json ]]; then
  echo "==> 首次部署：链接项目（Root Directory 请选仓库根，框架 Next.js）"
  run_vercel link
fi

echo "==> 确认已在 Vercel 配置生产环境变量："
echo "    HITHINK_FINANCE_API_KEY"
echo "    OPENROUTER_API_KEY（可选）"
echo "    OPENROUTER_HTTP_REFERER=https://你的域名"
echo ""

PROD=0
if [[ "${1:-}" == "--prod" || "${1:-}" == "prod" ]]; then
  PROD=1
fi

if [[ "$PROD" -eq 1 ]]; then
  echo "==> 部署生产环境"
  run_vercel deploy --prod --yes
else
  echo "==> 部署预览环境（生产请加 --prod）"
  run_vercel deploy --yes
fi

echo ""
echo "部署完成后："
echo "1. 把得到的 URL 设为 GitHub Actions 变量 WEB_URL"
echo "2. 重新打包桌面端：WEB_URL=https://xxx.vercel.app pnpm pack:win"
