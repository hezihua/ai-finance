import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

const PRODUCTION_WEB_URL = "https://ai-finance-web-1xw6.vercel.app";
const DEV_WEB_URL = "http://localhost:3000";

export default defineConfig(({ command }) => {
  // serve = 本地开发；build = 打包 exe
  const webUrl =
    process.env.WEB_URL || (command === "serve" ? DEV_WEB_URL : PRODUCTION_WEB_URL);

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        __WEB_URL__: JSON.stringify(webUrl),
      },
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "src/main/index.ts"),
          },
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "src/preload/index.ts"),
          },
        },
      },
    },
  };
});
