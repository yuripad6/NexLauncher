import { app, BrowserWindow, ipcMain, dialog } from "electron";
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

const settingsPath = () => path.join(app.getPath("userData"), "settings.json");
const instancesRoot = () => path.join(app.getPath("userData"), "instances");
const localBuildsPath = () => path.join(app.getPath("userData"), "local-builds.json");
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } }
function loadSettings() { return { username: "Player", ram: 2048, ...readJson(settingsPath(), {}) }; }
function saveJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8"); }
function readLocalBuilds() { const builds = readJson(localBuildsPath(), []); return Array.isArray(builds) ? builds : []; }
function validBuildId(id) { if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("Некорректный идентификатор сборки"); const build = readLocalBuilds().find(item => item.id === id); if (!build) throw new Error("Сборка не найдена"); return build; }

ipcMain.handle("settings:get", () => loadSettings());
ipcMain.handle("settings:set-username", (_event, rawName) => {
  const username = String(rawName ?? "").trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error("Ник должен содержать 3–16 символов: латинские буквы, цифры или _");
  const settings = { ...loadSettings(), username }; saveJson(settingsPath(), settings); return settings;
});

ipcMain.handle("builds:list-local", () => readLocalBuilds());
ipcMain.handle("builds:create-local", async (_event, input) => {
  const name = String(input?.name ?? "").trim(); const mcVersion = String(input?.mcVersion ?? "").trim();
  if (name.length < 2 || name.length > 40) throw new Error("Название сборки: от 2 до 40 символов");
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(mcVersion)) throw new Error("Укажи версию Minecraft, например 1.20.1");
  const allowedLoaders = ["Vanilla", "Fabric", "Forge", "NeoForge", "Quilt"]; const modLoader = allowedLoaders.includes(input?.modLoader) ? input.modLoader : "Vanilla";
  const build = { id: crypto.randomUUID(), name, mcVersion, modLoader, createdAt: new Date().toISOString() };
  const builds = readLocalBuilds(); builds.push(build); saveJson(localBuildsPath(), builds);
  await fsp.mkdir(path.join(instancesRoot(), build.id), { recursive: true }); return build;
});

ipcMain.handle("modrinth:search", async (_event, input = {}) => {
  const query = String(input.query ?? "").trim(); const mcVersion = String(input.mcVersion ?? "").trim(); const loader = String(input.loader ?? "").toLowerCase();
  const facets = [["project_type:mod"]]; if (mcVersion) facets.push(["versions:" + mcVersion]);
  if (["fabric", "forge", "quilt", "neoforge"].includes(loader)) facets.push(["categories:" + loader]);
  const params = new URLSearchParams({ limit: "20", index: "relevance" }); if (query) params.set("query", query); if (facets.length) params.set("facets", JSON.stringify(facets));
  const response = await fetch("https://api.modrinth.com/v2/search?" + params, { headers: { "User-Agent": "NexLauncher/1.0 (https://github.com/yuripad6/NexLauncher)" } });
  if (!response.ok) throw new Error("Modrinth API вернул HTTP " + response.status); const data = await response.json();
  return (data.hits || []).map(hit => ({ id: hit.project_id, slug: hit.slug, title: hit.title, description: hit.description, icon: hit.icon_url, downloads: hit.downloads, projectType: hit.project_type }));
});

ipcMain.handle("modrinth:install", async (_event, input = {}) => {
  const build = validBuildId(String(input.buildId ?? "")); const projectId = String(input.projectId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId)) throw new Error("Некорректный ID проекта Modrinth");
  const versionFilter = { game_versions: [build.mcVersion] };\n  if (["Fabric", "Forge", "NeoForge", "Quilt"].includes(build.modLoader)) versionFilter.loaders = [build.modLoader.toLowerCase()];\n  const params = new URLSearchParams({ game_versions: JSON.stringify(versionFilter.game_versions), ...(versionFilter.loaders ? { loaders: JSON.stringify(versionFilter.loaders) } : {}) });
  const response = await fetch("https://api.modrinth.com/v2/project/" + encodeURIComponent(projectId) + "/version?" + params, { headers: { "User-Agent": "NexLauncher/1.0 (https://github.com/yuripad6/NexLauncher)" } });
  if (!response.ok) throw new Error("Не удалось получить версии проекта Modrinth"); const versions = await response.json();
  const compatible = versions.find(version => version.files?.length); if (!compatible) throw new Error("Для Minecraft " + build.mcVersion + " не найден подходящий файл");
  const file = compatible.files.find(item => item.primary) || compatible.files[0];
  if (!file?.url || !/^[^/\\]+\.(jar|zip)$/i.test(file.filename)) throw new Error("Modrinth вернул неподдерживаемое имя файла");
  const modsDir = path.join(instancesRoot(), build.id, "mods"); await fsp.mkdir(modsDir, { recursive: true }); const dest = path.join(modsDir, file.filename);
  const download = await fetch(file.url, { redirect: "follow" }); if (!download.ok) throw new Error("Ошибка скачивания мода: HTTP " + download.status);
  const bytes = Buffer.from(await download.arrayBuffer()); if (bytes.length > 200 * 1024 * 1024) throw new Error("Файл слишком большой (лимит 200 МБ)");
  await fsp.writeFile(dest, bytes, { flag: "wx" }).catch(error => { if (error.code === "EEXIST") throw new Error("Этот файл уже установлен"); throw error; });
  return { filename: file.filename, version: compatible.name };
});

ipcMain.handle("import:from-tlauncher", async (_event, input = {}) => {
  const build = validBuildId(String(input.buildId ?? ""));
  const result = await dialog.showOpenDialog(mainWindow, { title: "Выберите папку сборки TLauncher или .minecraft", properties: ["openDirectory"] });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const sourceDir = result.filePaths[0]; const instanceDir = path.join(instancesRoot(), build.id); const copied = [];
  for (const folder of ["mods", "config", "resourcepacks", "shaderpacks"]) {
    const source = path.join(sourceDir, folder); if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) continue;
    const destination = path.join(instanceDir, folder); await fsp.mkdir(destination, { recursive: true });
    await fsp.cp(source, destination, { recursive: true, force: false, errorOnExist: false }); copied.push(folder);
  }
  if (!copied.length) throw new Error("Не найдены папки mods, config, resourcepacks или shaderpacks. Выбери папку профиля/сборки.");
  return { copied, source: sourceDir };
});
ipcMain.handle("game:launch", async (_e, opts) => {
  try {
    const { packId, localBuildId, username = loadSettings().username, ram = loadSettings().ram } = opts;
    if (localBuildId) {
      const build = validBuildId(String(localBuildId));
      if (build.modLoader !== "Vanilla") {
        throw new Error("Для запуска сборки " + build.modLoader + " сначала нужно установить этот загрузчик. Сейчас готов только запуск Vanilla.");
      }
      const instanceDir = path.join(instancesRoot(), build.id);
      await fsp.mkdir(instanceDir, { recursive: true });
      emit({ progress: 10, message: "Запуск Minecraft " + build.mcVersion + "..." });
      launcher = new Client();
      launcher.on("data", line => console.log("[MCLC]", line));
      await launcher.launch({
        authorization: Authenticator.getAuth(username),
        root: instanceDir,
        version: { number: build.mcVersion, type: "release" },
        memory: { max: String(Math.max(1024, Number(ram) || 2048)) + "M", min: "512M" }
      });
      emit({ type: "started", progress: 100, message: "Minecraft запущен" });
      return { ok: true };
    }
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
