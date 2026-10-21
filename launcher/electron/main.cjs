const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const https = require('node:https');
const AdmZip = require('adm-zip');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#121212',
    title: 'NexLauncher',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (!app.isPackaged) win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function safeId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,63}$/.test(value);
}

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch { reject(new Error('Некорректная ссылка на ZIP')); return; }
    if (parsed.protocol !== 'https:') { reject(new Error('Разрешены только HTTPS-ссылки')); return; }
    if (redirects > 5) { reject(new Error('Слишком много перенаправлений')); return; }
    const request = https.get(parsed, { headers: { 'User-Agent': 'NexLauncher/0.1' }, timeout: 120000 }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        const next = new URL(response.headers.location, parsed).toString();
        download(next, destination, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) { response.resume(); reject(new Error('Сервер вернул HTTP ' + response.statusCode)); return; }
      const file = fs.createWriteStream(destination, { flags: 'wx' });
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => { fs.rmSync(destination, { force: true }); reject(err); });
    });
    request.on('timeout', () => request.destroy(new Error('Истекло время ожидания загрузки')));
    request.on('error', reject);
  });
}

ipcMain.handle('packs:install', async (_event, pack) => {
  if (!pack || !safeId(pack.id) || typeof pack.zipUrl !== 'string') throw new Error('Некорректные данные сборки');
  if (pack.sha256 && !/^[a-f0-9]{64}$/i.test(pack.sha256)) throw new Error('Некорректный SHA-256 в манифесте');
  const root = path.join(app.getPath('userData'), 'instances');
  const target = path.join(root, pack.id);
  const temp = path.join(os.tmpdir(), 'nexlauncher-' + crypto.randomUUID() + '.zip');
  fs.mkdirSync(root, { recursive: true });
  try {
    await download(pack.zipUrl, temp);
    if (pack.sha256) {
      const digest = crypto.createHash('sha256').update(fs.readFileSync(temp)).digest('hex');
      if (digest.toLowerCase() !== pack.sha256.toLowerCase()) throw new Error('SHA-256 архива не совпадает');
    }
    const zip = new AdmZip(temp);
    const entries = zip.getEntries();
    if (entries.length > 20000) throw new Error('В архиве слишком много файлов');
    const resolvedTarget = path.resolve(target) + path.sep;
    for (const entry of entries) {
      const output = path.resolve(target, entry.entryName);
      if (!output.startsWith(resolvedTarget)) throw new Error('Архив содержит небезопасный путь');
      if (entry.header.size > 1024 * 1024 * 1024) throw new Error('Файл в архиве слишком большой');
    }
    const staging = target + '.installing-' + crypto.randomUUID();
    fs.mkdirSync(staging, { recursive: true });
    try {
      zip.extractAllTo(staging, true);
      if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
      fs.renameSync(staging, target);
    } catch (error) {
      fs.rmSync(staging, { recursive: true, force: true });
      throw error;
    }
    return { ok: true, path: target, message: 'Архив сборки установлен. Это не запускает сам Minecraft.' };
  } finally {
    fs.rmSync(temp, { force: true });
  }
});

ipcMain.handle('packs:open-folder', async (_event, id) => {
  if (!safeId(id)) throw new Error('Некорректный ID сборки');
  const target = path.join(app.getPath('userData'), 'instances', id);
  if (!fs.existsSync(target)) throw new Error('Сборка ещё не установлена');
  const result = await shell.openPath(target);
  if (result) throw new Error(result);
  return { ok: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
