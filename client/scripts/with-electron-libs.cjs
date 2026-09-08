#!/usr/bin/env node
/**
 * WSL / 精简 Linux 上 Electron 常缺 libnss3 等系统库，也常缺中文字体。
 * - 缺库：把对应 .deb 解到 .electron-libs/ 并设置 LD_LIBRARY_PATH（无需 sudo）
 * - 缺字体：若存在 /mnt/c/Windows/Fonts，生成 fonts.conf 并设置 FONTCONFIG_FILE
 */
const { execFileSync, spawn } = require("node:child_process");
const { existsSync, mkdirSync, readdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const libDir = join(root, ".electron-libs", "usr", "lib", "x86_64-linux-gnu");
const extractRoot = join(root, ".electron-libs");
const packages = ["libnss3", "libnspr4", "libasound2t64"];
const winFonts = "/mnt/c/Windows/Fonts";
const fontsConfPath = join(root, ".electron-libs", "fonts.conf");

function ensureLibs() {
  if (process.platform !== "linux") return;
  if (existsSync(join(libDir, "libnss3.so"))) return;

  mkdirSync(extractRoot, { recursive: true });
  const work = join(root, ".electron-libs", "debs");
  mkdirSync(work, { recursive: true });
  execFileSync("apt-get", ["download", ...packages], { cwd: work, stdio: "inherit" });
  const debs = readdirSync(work).filter((name) => name.endsWith(".deb"));
  for (const deb of debs) {
    execFileSync("dpkg-deb", ["-x", join(work, deb), extractRoot], { stdio: "inherit" });
  }
}

function ensureFonts() {
  if (process.platform !== "linux") return null;
  if (!existsSync(winFonts)) return null;

  mkdirSync(extractRoot, { recursive: true });
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${winFonts}</dir>
  <dir>/usr/share/fonts</dir>
  <dir>/usr/local/share/fonts</dir>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <alias>
    <family>sans-serif</family>
    <prefer>
      <family>Microsoft YaHei</family>
      <family>Noto Sans SC</family>
      <family>Segoe UI</family>
      <family>DejaVu Sans</family>
    </prefer>
  </alias>
  <alias>
    <family>serif</family>
    <prefer>
      <family>SimSun</family>
      <family>Noto Serif SC</family>
    </prefer>
  </alias>
  <alias>
    <family>monospace</family>
    <prefer>
      <family>Microsoft YaHei</family>
      <family>Consolas</family>
      <family>DejaVu Sans Mono</family>
    </prefer>
  </alias>
</fontconfig>
`;
  writeFileSync(fontsConfPath, conf, "utf8");
  return fontsConfPath;
}

ensureLibs();
const fontsConf = ensureFonts();

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
if (existsSync(libDir)) {
  env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${libDir}:${env.LD_LIBRARY_PATH}` : libDir;
}
if (fontsConf) {
  env.FONTCONFIG_FILE = fontsConf;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-electron-libs.cjs <command> [args...]");
  process.exit(1);
}

const child = spawn(command, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
