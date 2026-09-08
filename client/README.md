# @ai-finance/client

Electron 桌面客户端，加载 `web` 应用。

## 开发

```bash
pnpm dev:web
pnpm dev:client
# 或
pnpm dev:all
```

### WSL 依赖

`dev` / `start` 经 `scripts/with-electron-libs.cjs` 自动补齐 `libnss3` 等库，并挂载 `/mnt/c/Windows/Fonts` 解决中文方框。

## 打包

```bash
# 根目录
pnpm pack:win

# 或写入线上地址后再打包
WEB_URL=https://your-web.example pnpm pack:win
```

产物：`client/release/ai-finance-win32-x64.exe`

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `WEB_URL` | `http://localhost:3000` | 客户端加载的 Web 地址（打包时写入） |
