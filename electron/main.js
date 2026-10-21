import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import unzipper from "unzipper";
import minecraftLauncherCore from "minecraft-launcher-core";
const { Client, Authenticator } = minecraftLauncherCore;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;
let launcher = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    backgroundColor: "#121212",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";
  const prodFile = path.join(__dirname, "../dist-renderer/index.html");

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(prodFile)) {
    mainWindow.loadFile(prodFile);
  } else {
    mainWindow.loadURL(devUrl);
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window:close", () => mainWindow?.close());

function emit(event) {
  mainWindow?.webContents.send("game:progress", event);
}

// Скачиваем ZIP сборки с проверкой SHA-256.
async function downloadZip(url, dest, sha256) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} при скачивании ZIP`);

  const total = Number(res.headers.get("content-length")) || 0;
  let received = 0;
  const hash = crypto.createHash("sha256");
  const temp = `${dest}.part-${crypto.randomUUID()}`;

  const meter = new Transform({
    transform(chunk, _enc, cb) {
      received += chunk.length;
      hash.update(chunk);
      if (total) emit({ progress: Math.min(99, Math.floor((received / total) * 100)),
        message: "Скачивание сборки..." });
      cb(null, chunk);
    }
  });

  await pipeline(res.body, meter, fs.createWriteStream(temp));
  const actual = hash.digest("hex").toLowerCase();
  if (actual !== sha256.toLowerCase()) {
    await fsp.rm(temp, { force: true });
    throw new Error("SHA-256 не совпал. Архив повреждён или изменён.");
  }
  await fsp.rename(temp, dest);
}

// Распаковка ZIP с защитой от path traversal.
async function extractZip(zipPath, destDir) {
  await fsp.mkdir(destDir, { recursive: true });
  const resolvedDest = path.resolve(destDir);
  const archive = await unzipper.Open.file(zipPath);
  for (const entry of archive.files) {
    const target = path.resolve(resolvedDest, entry.path);
    if (!target.startsWith(resolvedDest + path.sep)) {
      throw new Error(`Path traversal в ZIP: ${entry.path}`);
    }
  }
  await pipeline(
    fs.createReadStream(zipPath),
    unzipper.Extract({ path: destDir })
  );
}

ipcMain.handle("game:launch", async (_e, opts) => {
  try {
    const { packId, username = "Player", ram = 4096 } = opts;
    const apiBase = process.env.NEX_API_BASE ||
      "https://zeskin.freedev.app/api/index.php";

    emit({ progress: 0, message: "Получение манифеста..." });
    const res = await fetch(`${apiBase}?pack=${encodeURIComponent(packId)}`);
    if (!res.ok) throw new Error("Не удалось получить манифест сборки");
    const pack = await res.json();

    const instanceDir = path.join(app.getPath("userData"), "instances", pack.id);
    await fsp.mkdir(instanceDir, { recursive: true });

    // Скачиваем и распаковываем ZIP, если ещё не распакован.
    const marker = path.join(instanceDir, ".installed");
    if (!fs.existsSync(marker)) {
      const zipPath = path.join(instanceDir, "pack.zip");
      emit({ progress: 5, message: "Скачивание ZIP..." });
      await downloadZip(pack.zipUrl, zipPath, pack.sha256);
      emit({ progress: 70, message: "Распаковка..." });
      await extractZip(zipPath, instanceDir);
      await fsp.writeFile(marker, new Date().toISOString());
      await fsp.rm(zipPath, { force: true });
      emit({ progress: 85, message: "Сборка установлена" });
    } else {
      emit({ progress: 85, message: "Сборка уже установлена" });
    }

    // Запуск Minecraft через MCLC.
    const custom = pack.modLoaderVersion
      ? `${pack.modLoader}-${pack.modLoaderVersion}-${pack.mcVersion}`
      : undefined;

    const launchOpts = {
      authorization: Authenticator.getAuth(username),
      root: instanceDir,
      version: {
        number: pack.mcVersion,
        type: "release",
        custom
      },
      memory: { max: `${ram}M`, min: "512M" },
      customArgs: ["--server", pack.server.ip, "--port", String(pack.server.port)]
    };

    launcher = new Client();
    launcher.on("progress", (e) => {
      if (e.total && e.size) {
        const p = 85 + Math.floor((e.size / e.total) * 14);
        emit({ progress: Math.min(99, p), message: `Загрузка ${e.type}...` });
      }
    });
    launcher.on("data", (line) => console.log("[MCLC]", line));

    const proc = await launcher.launch(launchOpts);
    emit({ type: "started", progress: 100, message: "Minecraft запущен" });
    return { ok: true };
  } catch (err) {
    emit({ type: "error", message: err.message || "Ошибка запуска" });
    throw err;
  }
});
