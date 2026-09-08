import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

const webUrl = process.env.WEB_URL || "http://localhost:3000";

export default defineConfig({
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
});
