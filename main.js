const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

// Use an explicit per-user writable Chromium/Electron cache location.
// This avoids Windows 'Access denied (0x5)' disk/GPU cache errors that can
// occur when Chromium inherits a stale, locked, or non-writable cache path.
// This is runtime cache only; the portable application itself remains portable.
const localAppData = process.env.LOCALAPPDATA || app.getPath('temp');
const appDataRoot = path.join(localAppData, 'STL2STEP');
const cacheRoot = path.join(appDataRoot, 'Cache');
const sessionRoot = path.join(appDataRoot, 'Session');
try {
  fsSync.mkdirSync(cacheRoot, { recursive: true });
  fsSync.mkdirSync(sessionRoot, { recursive: true });
  app.setPath('cache', cacheRoot);
  app.setPath('sessionData', sessionRoot);
  app.commandLine.appendSwitch('disk-cache-dir', cacheRoot);
} catch (e) {
  // Cache failure must never prevent STL conversion. Chromium can fall back
  // to its normal behavior; keep the error concise for development builds.
  console.warn('Could not initialize STL2STEP cache directory:', e.message);
}

let mainWindow = null;
let activeInput = null;
let activeOutput = null;

const MAX_STL_BYTES = 512 * 1024 * 1024; // 512 MiB preview safety limit
const ALLOWED_ENGINES = new Set(['trueform', 'verbatim']);
const ALLOWED_UNITS = new Set(['mm', 'in']);
const ALLOWED_SCHEMAS = new Set(['AP203', 'AP214', 'AP242']);

function converterPath() {
  if (process.platform !== 'win32') return 'stl2step';
  if (app.isPackaged) return path.join(process.resourcesPath, 'bin', 'stl2step.exe');
  return path.join(__dirname, 'bin', 'stl2step.exe');
}

function trustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) return false;
  const url = event.senderFrame?.url || '';
  return url.startsWith('file://') && /\/index\.html(?:$|[?#])/.test(url);
}

function requireTrustedSender(event) {
  if (!trustedSender(event)) throw new Error('Blocked untrusted IPC sender');
}

function isStlPath(p) {
  return typeof p === 'string' && path.isAbsolute(p) && path.extname(p).toLowerCase() === '.stl';
}

function isStepPath(p) {
  if (typeof p !== 'string' || !path.isAbsolute(p)) return false;
  return ['.step', '.stp'].includes(path.extname(p).toLowerCase());
}

async function canonicalExistingStl(p) {
  if (!isStlPath(p)) throw new Error('Only absolute .stl files are allowed');
  const real = await fs.realpath(p);
  const stat = await fs.stat(real);
  if (!stat.isFile()) throw new Error('The selected STL is not a regular file');
  if (stat.size <= 0) throw new Error('The selected STL is empty');
  if (stat.size > MAX_STL_BYTES) throw new Error('STL is too large for preview (maximum 512 MiB)');
  return real;
}

function defaultOutputFor(input) {
  return input.replace(/\.[^.]+$/i, '.step');
}

async function authorizeInput(p) {
  activeInput = await canonicalExistingStl(p);
  activeOutput = defaultOutputFor(activeInput);
  return { path: activeInput, output: activeOutput };
}

function sanitizeNumber(value, name, { min = -Infinity, max = Infinity, allowEmpty = true } = {}) {
  if (value === '' || value === null || value === undefined) {
    if (allowEmpty) return null;
    throw new Error(`${name} is required`);
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid ${name}`);
  return n;
}

function validateOptions(raw = {}) {
  const engine = ALLOWED_ENGINES.has(raw.engine) ? raw.engine : 'trueform';
  const units = ALLOWED_UNITS.has(raw.units) ? raw.units : 'mm';
  const schema = ALLOWED_SCHEMAS.has(raw.schema) ? raw.schema : 'AP214';
  return {
    engine,
    units,
    schema,
    scale: sanitizeNumber(raw.scale, 'scale', { min: 0.000001, max: 1000000 }),
    weld: sanitizeNumber(raw.weld, 'weld tolerance', { min: 0, max: 1000000 }),
    sewTol: sanitizeNumber(raw.sewTol, 'sew tolerance', { min: 0, max: 1000000 }),
    unifyAngle: sanitizeNumber(raw.unifyAngle, 'unify angle', { min: 0, max: 180 }),
    threads: sanitizeNumber(raw.threads, 'threads', { min: 1, max: 1024 }),
    noUnify: raw.noUnify === true,
    noSolid: raw.noSolid === true,
    forceSew: raw.forceSew === true,
    noVerify: raw.noVerify === true,
    dxf: raw.dxf === true
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0c1118',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged
    }
  });

  // The application is local-only. Never allow the renderer to navigate away
  // from the bundled UI or open a new browser/window target.
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; activeInput = null; activeOutput = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('pick-file', async event => {
  requireTrustedSender(event);
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'STL files', extensions: ['stl'] }]
  });
  if (r.canceled) return null;
  return authorizeInput(r.filePaths[0]);
});

// Drag/drop still originates from a real OS File object. We accept only an
// existing regular .stl file and make it the sole authorized input for this session.
ipcMain.handle('authorize-dropped-stl', async (event, filePath) => {
  requireTrustedSender(event);
  return authorizeInput(filePath);
});

ipcMain.handle('read-active-stl', async event => {
  requireTrustedSender(event);
  if (!activeInput) return { ok: false, error: 'No STL has been selected' };
  try {
    // Re-resolve immediately before reading to avoid stale/replaced paths.
    const current = await canonicalExistingStl(activeInput);
    if (current !== activeInput) throw new Error('Selected STL path changed unexpectedly');
    const data = await fs.readFile(activeInput);
    return { ok: true, data: Array.from(data) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pick-output', async (event, suggested) => {
  requireTrustedSender(event);
  if (!activeInput) return null;
  const safeSuggested = isStepPath(suggested) ? suggested : (activeOutput || defaultOutputFor(activeInput));
  const r = await dialog.showSaveDialog(mainWindow, {
    defaultPath: safeSuggested,
    filters: [{ name: 'STEP files', extensions: ['step', 'stp'] }]
  });
  if (r.canceled || !r.filePath) return null;
  if (!isStepPath(r.filePath)) throw new Error('Output must use .step or .stp');
  activeOutput = path.resolve(r.filePath);
  return activeOutput;
});

ipcMain.handle('run-conversion', async (event, rawOptions) => {
  requireTrustedSender(event);
  if (!activeInput) return { ok: false, error: 'No authorized STL input', exitCode: -1 };
  if (!activeOutput || !isStepPath(activeOutput)) return { ok: false, error: 'No authorized STEP output', exitCode: -1 };

  let options;
  try { options = validateOptions(rawOptions); }
  catch (e) { return { ok: false, error: e.message, exitCode: -1 }; }

  const exe = converterPath(); // fixed executable; renderer cannot override it
  if (process.platform === 'win32' && !fsSync.existsSync(exe)) {
    return { ok: false, error: 'Bundled stl2step.exe was not found', exitCode: -1 };
  }

  const cli = [activeInput, '-o', activeOutput, '--engine', options.engine, '--units', options.units, '--schema', options.schema];
  if (options.scale !== null && options.scale !== 1) cli.push('--scale', String(options.scale));
  if (options.weld !== null) cli.push('--weld', String(options.weld));
  if (options.sewTol !== null) cli.push('--sew-tol', String(options.sewTol));
  if (options.unifyAngle !== null) cli.push('--unify-angle', String(options.unifyAngle));
  if (options.noUnify) cli.push('--no-unify');
  if (options.noSolid) cli.push('--no-solid');
  if (options.forceSew) cli.push('--force-sew');
  if (options.noVerify) cli.push('--no-verify');
  if (options.dxf) {
    const dxfDir = path.join(path.dirname(activeOutput), path.basename(activeOutput, path.extname(activeOutput)) + '_dxf');
    cli.push('--dxf', dxfDir);
  }
  if (options.threads !== null) cli.push('--threads', String(Math.trunc(options.threads)));

  return await new Promise(resolve => {
    const child = spawn(exe, cli, {
      windowsHide: true,
      shell: false,
      cwd: path.dirname(exe),
      env: { ...process.env, PATH: `${path.dirname(exe)}${path.delimiter}${process.env.PATH || ''}` }
    });
    let stdout = '', stderr = '';
    let settled = false;
    const finish = result => { if (!settled) { settled = true; resolve(result); } };

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', e => finish({ ok: false, error: `Could not start stl2step: ${e.message}`, stderr, stdout, exitCode: -1 }));
    child.on('close', code => {
      const lines = stdout.trim().split(/\r?\n/);
      const line = lines.reverse().find(x => x.startsWith('RESULT '));
      let result = null;
      if (line) { try { result = JSON.parse(line.slice(7)); } catch {} }
      finish({ ok: !!(result && result.ok), result, stdout, stderr, exitCode: code });
    });
  });
});

ipcMain.handle('clear-session', event => {
  requireTrustedSender(event);
  activeInput = null;
  activeOutput = null;
  return true;
});

ipcMain.handle('open-output', async event => {
  requireTrustedSender(event);
  if (!activeOutput || !isStepPath(activeOutput)) return false;
  try { return (await shell.openPath(activeOutput)) === ''; } catch { return false; }
});

ipcMain.handle('show-output-in-folder', event => {
  requireTrustedSender(event);
  if (!activeOutput || !isStepPath(activeOutput)) return false;
  try { shell.showItemInFolder(activeOutput); return true; } catch { return false; }
});
