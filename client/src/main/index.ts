import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";

declare const __WEB_URL__: string;

const WEB_URL = process.env.WEB_URL || __WEB_URL__ || "http://localhost:3000";
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#10141a",
    title: "ai-finance",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void win.loadURL(WEB_URL);

  win.webContents.on("did-fail-load", (_event, errorCode, _errorDescription, validatedURL) => {
    if (errorCode === -3) return; // aborted
    if (validatedURL.startsWith("file:")) return;
    const file = app.isPackaged
      ? path.join(process.resourcesPath, "offline.html")
      : path.join(__dirname, "../../resources/offline.html");
    void win.loadFile(file, { query: { url: WEB_URL } });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const sendMaximized = () => {
    if (win.isDestroyed()) return;
    win.webContents.send("window:maximized", win.isMaximized());
  };
  win.on("maximize", sendMaximized);
  win.on("unmaximize", sendMaximized);

  win.once("ready-to-show", () => {
    win.show();
    if (isDev) {
      win.webContents.openDevTools({ mode: "detach" });
    }
  });
}

app.whenReady().then(() => {
  ipcMain.handle("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle("window:is-maximized", (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
