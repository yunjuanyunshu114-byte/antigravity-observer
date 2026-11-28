#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFileSync, spawn } = require('node:child_process');
const { readAsarLayout, patchAsarArchive, validateAsarCandidate } = require('./src/asar_patcher');

const REPO_ROOT = __dirname;
const PLUGIN_ID = 'gemini-neko-cockpit';
const GEMINI_CONFIG_DIR = process.env.ANTIGRAVITY_CONFIG_DIR
  ? path.resolve(process.env.ANTIGRAVITY_CONFIG_DIR)
  : path.join(os.homedir(), '.gemini', 'config');

const PLUGIN_DEST_DIR = path.join(GEMINI_CONFIG_DIR, 'plugins', PLUGIN_ID);
const SIDECAR_DEST_DIR = path.join(PLUGIN_DEST_DIR, 'sidecars', 'neko-cockpit');
const ASSETS_DEST_DIR = path.join(PLUGIN_DEST_DIR, 'assets');
const SKILL_DEST_DIR = path.join(PLUGIN_DEST_DIR, 'skills', PLUGIN_ID);

const HUD_BEGIN = '// ===== GEMINI_NEKO_HUD_BEGIN =====';
const HUD_END = '// ===== GEMINI_NEKO_HUD_END =====';
const EXTRA_BUILTIN_SKINS = ['heterochromia', 'sleepwear', 'maid', 'swimsuit', 'rainbow', 'winter'];
const FRAME_FILES = ['idle.webp', 'eat.webp', 'xd.webp', 'grin.webp', 'wait.webp'];

function resolveNodeExecutable() {
  const execPath = process.execPath;
  if (execPath && /^node(\.exe)?$/i.test(path.basename(execPath)) && fs.existsSync(execPath)) {
    return execPath.replace(/\\/g, '/');
  }
  return 'node';
}

function resolveAntigravityResourcesDir(explicitDir) {
  if (explicitDir && fs.existsSync(path.join(explicitDir, 'app.asar'))) return explicitDir;
  const candidates = [];
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    candidates.push(
      path.join(localApp, 'Programs', 'antigravity', 'resources'),
      path.join(localApp, 'Programs', 'Antigravity', 'resources')
    );
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Antigravity.app/Contents/Resources');
  } else {
    candidates.push(
      '/opt/Antigravity/resources',
      '/usr/share/antigravity/resources',
      path.join(os.homedir(), '.local', 'share', 'antigravity', 'resources')
    );
  }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'app.asar'))) return dir;
  }
  return '';
}

function isAntigravityRunning() {
  if (process.platform !== 'win32') return false;
  try {
    const out = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', "(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue).Count"],
      { encoding: 'utf8', timeout: 4000 }
    ).trim();
    return parseInt(out, 10) > 0;
  } catch {
    return false;
  }
}

function killAntigravityWindows() {
  if (process.platform !== 'win32') return;
  try {
    execFileSync('taskkill.exe', ['/f', '/im', 'Antigravity.exe', '/t'], { stdio: 'ignore', timeout: 6000 });
  } catch {}
}

function relaunchAntigravityWindows(resourcesDir) {
  if (process.platform !== 'win32' || !resourcesDir) return;
  const exe = path.join(path.dirname(resourcesDir), 'Antigravity.exe');
  if (!fs.existsSync(exe)) return;
  try {
    const child = spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
  } catch {}
}

function stripHudMarkers(text) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\n?${esc(HUD_BEGIN)}[\\s\\S]*?${esc(HUD_END)}\\n?`, 'g');
  return String(text || '').replace(re, '').trimEnd();
}

function restartRunningSidecarServer() {
  const killedPids = new Set();
  const ptrCandidates = [
    path.join(PLUGIN_DEST_DIR, 'runtime_server.json'),
    path.join(os.homedir(), '.gemini', 'antigravity', 'sidecar_data', PLUGIN_ID, 'neko-cockpit', 'data', 'server_info.json')
  ];
  for (const fp of ptrCandidates) {
    try {
      if (!fs.existsSync(fp)) continue;
      const info = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const pid = Number(info && info.pid);
      if (pid > 0 && pid !== process.pid && !killedPids.has(pid)) {
        process.kill(pid, 'SIGTERM');
        killedPids.add(pid);
      }
    } catch {}
  }
}

function installSidecarPlugin() {
  const nodeBin = resolveNodeExecutable();
  fs.mkdirSync(SIDECAR_DEST_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DEST_DIR, { recursive: true });
  fs.mkdirSync(SKILL_DEST_DIR, { recursive: true });

  fs.copyFileSync(path.join(REPO_ROOT, 'plugin.json'), path.join(PLUGIN_DEST_DIR, 'plugin.json'));
  if (fs.existsSync(path.join(REPO_ROOT, 'README.md'))) {
    fs.copyFileSync(path.join(REPO_ROOT, 'README.md'), path.join(PLUGIN_DEST_DIR, 'README.md'));
  }

  for (const f of ['logo.png']) {
    const src = path.join(REPO_ROOT, 'assets', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(ASSETS_DEST_DIR, f));
  }
  const framesSrcDir = path.join(REPO_ROOT, 'assets', 'frames');
  const framesDestDir = path.join(ASSETS_DEST_DIR, 'frames');
  if (fs.existsSync(framesSrcDir)) {
    fs.mkdirSync(framesDestDir, { recursive: true });
    for (const f of fs.readdirSync(framesSrcDir)) {
      if (/\.(webp|png)$/i.test(f)) {
        fs.copyFileSync(path.join(framesSrcDir, f), path.join(framesDestDir, f));
      }
    }
  }
  const skinsSrcDir = path.join(REPO_ROOT, 'assets', 'skins');
  const skinsDestDir = path.join(ASSETS_DEST_DIR, 'skins');
  if (fs.existsSync(skinsSrcDir)) {
    fs.mkdirSync(skinsDestDir, { recursive: true });
    for (const skinName of fs.readdirSync(skinsSrcDir)) {
      const srcSub = path.join(skinsSrcDir, skinName);
      if (!fs.statSync(srcSub).isDirectory()) continue;
      const destSub = path.join(skinsDestDir, skinName);
      fs.mkdirSync(destSub, { recursive: true });
      for (const f of fs.readdirSync(srcSub)) {
        if (/\.(webp|png)$/i.test(f)) {
          fs.copyFileSync(path.join(srcSub, f), path.join(destSub, f));
        }
      }
    }
  }
  const soundsSrcDir = path.join(REPO_ROOT, 'assets', 'sounds');
  const soundsDestDir = path.join(ASSETS_DEST_DIR, 'sounds');
  if (fs.existsSync(soundsSrcDir)) {
    fs.mkdirSync(soundsDestDir, { recursive: true });
    for (const f of fs.readdirSync(soundsSrcDir)) {
      if (/\.(wav|mp3|ogg)$/i.test(f)) {
        fs.copyFileSync(path.join(soundsSrcDir, f), path.join(soundsDestDir, f));
      }
    }
  }
  for (const oldFile of ['neko_strip.webp', 'neko_strip.png']) {
    try { fs.rmSync(path.join(ASSETS_DEST_DIR, oldFile), { force: true }); } catch {}
  }

  fs.copyFileSync(
    path.join(REPO_ROOT, 'skills', PLUGIN_ID, 'SKILL.md'),
    path.join(SKILL_DEST_DIR, 'SKILL.md')
  );

  const sidecarManifest = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'neko-cockpit', 'sidecar.json'), 'utf8')
  );
  sidecarManifest.command = nodeBin;
  fs.writeFileSync(
    path.join(SIDECAR_DEST_DIR, 'sidecar.json'),
    JSON.stringify(sidecarManifest, null, 2) + '\n',
    'utf8'
  );

  for (const filename of ['server.cjs', 'ui.html']) {
    fs.copyFileSync(
      path.join(REPO_ROOT, 'sidecars', 'neko-cockpit', filename),
      path.join(SIDECAR_DEST_DIR, filename)
    );
  }

  restartRunningSidecarServer();
  return { nodeBin, pluginDir: PLUGIN_DEST_DIR, sidecarDir: SIDECAR_DEST_DIR };
}

function buildPatchedAsar(resourcesDir, stripOnly = false) {
  const asarPath = path.join(resourcesDir, 'app.asar');
  const stagedPath = path.join(resourcesDir, 'app.asar.neko-staged');
  const nekoBakPath = path.join(resourcesDir, 'app.asar.neko.bak');
  const zhBakPath = path.join(resourcesDir, 'app.asar.bak');

  if (!fs.existsSync(asarPath)) {
    return { ok: false, error: `app.asar not found in ${resourcesDir}` };
  }

  const mainBridge = fs.readFileSync(path.join(REPO_ROOT, 'hud', 'main_bridge.js'), 'utf8').trim();
  const preloadHud = fs.readFileSync(path.join(REPO_ROOT, 'hud', 'preload_hud.js'), 'utf8').trim();

  const buildDir = fs.mkdtempSync(path.join(resourcesDir, '.neko-hud-build-'));
  try {
    const sourceCopy = path.join(buildDir, 'source.asar');
    fs.copyFileSync(asarPath, sourceCopy);
    if (!fs.existsSync(nekoBakPath) && !fs.existsSync(zhBakPath)) {
      fs.copyFileSync(asarPath, nekoBakPath);
    }
    const candidatePath = path.join(buildDir, 'candidate.asar');

    const modifierMap = new Map([
      [
        'dist/main.js',
        (orig) => {
          const cleaned = stripHudMarkers(orig);
          return stripOnly ? cleaned + '\n' : cleaned + '\n\n' + mainBridge + '\n';
        }
      ],
      [
        'dist/preload.js',
        (orig) => {
          const cleaned = stripHudMarkers(orig);
          return stripOnly ? cleaned + '\n' : cleaned + '\n\n' + preloadHud + '\n';
        }
      ]
    ]);

    const modified = patchAsarArchive(sourceCopy, candidatePath, modifierMap);
    if (!modified.has('dist/main.js') || !modified.has('dist/preload.js')) {
      throw new Error('app.asar is missing dist/main.js or dist/preload.js');
    }

    const requiredMarkers = stripOnly
      ? []
      : [
          { file: 'dist/main.js', marker: HUD_BEGIN },
          { file: 'dist/preload.js', marker: HUD_BEGIN }
        ];
    validateAsarCandidate(sourceCopy, candidatePath, ['dist/main.js', 'dist/preload.js'], requiredMarkers);

    for (const [relPath, buf] of modified.entries()) {
      const checkPath = path.join(buildDir, path.basename(relPath));
      fs.writeFileSync(checkPath, buf);
      execFileSync(process.execPath, ['--check', checkPath], { stdio: 'pipe' });
    }

    fs.copyFileSync(candidatePath, stagedPath);
    return { ok: true, asarPath, stagedPath };
  } finally {
    try {
      fs.rmSync(buildDir, { recursive: true, force: true });
    } catch {}
  }
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

function trySwapStagedAsar(asarPath, stagedPath, allowKill) {
  if (!fs.existsSync(stagedPath)) return { applied: false, reason: 'No staged asar' };
  const killed = Boolean(allowKill && isAntigravityRunning());
  if (killed) {
    killAntigravityWindows();
  }
  const maxAttempts = allowKill ? 20 : 1;
  const retryDelayMs = 150;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const tmpPrev = `${asarPath}.prev.${Date.now()}`;
    try {
      // On Windows, if Antigravity.exe is running, app.asar is locked and rename/copy will throw EBUSY/EPERM.
      const fd = fs.openSync(asarPath, 'r+');
      fs.closeSync(fd);
      fs.copyFileSync(asarPath, tmpPrev);
      fs.copyFileSync(stagedPath, asarPath);
      fs.rmSync(stagedPath, { force: true });
      fs.rmSync(tmpPrev, { force: true });
      return { applied: true };
    } catch (err) {
      lastErr = err;
      try {
        if (fs.existsSync(tmpPrev)) {
          fs.copyFileSync(tmpPrev, asarPath);
          fs.rmSync(tmpPrev, { force: true });
        }
      } catch {}
      const code = err && err.code;
      const retryable = code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
      if (attempt < maxAttempts && retryable) {
        sleepSync(retryDelayMs);
        continue;
      }
      break;
    }
  }
  return { applied: false, reason: (lastErr && (lastErr.code || lastErr.message)) || 'Swap failed', locked: true };
}

function checkAsarStatus(resourcesDir) {
  const out = {
    resourcesDir: resourcesDir || '',
    asarExists: false,
    hudMainPatched: false,
    hudPreloadPatched: false,
    zhLocalizationIntact: false,
    stagedReady: false
  };
  if (!resourcesDir) return out;
  const asarPath = path.join(resourcesDir, 'app.asar');
  const stagedPath = path.join(resourcesDir, 'app.asar.neko-staged');
  out.stagedReady = fs.existsSync(stagedPath);
  if (!fs.existsSync(asarPath)) return out;
  out.asarExists = true;
  try {
    const layout = readAsarLayout(asarPath);
    const mainFile = layout.files.get('dist/main.js');
    const preloadFile = layout.files.get('dist/preload.js');
    if (mainFile && mainFile.body) {
      out.hudMainPatched = mainFile.body.includes(Buffer.from(HUD_BEGIN, 'utf8'));
    }
    if (preloadFile && preloadFile.body) {
      out.hudPreloadPatched = preloadFile.body.includes(Buffer.from(HUD_BEGIN, 'utf8'));
      out.zhLocalizationIntact = preloadFile.body.includes(Buffer.from('AG_ZH_BEGIN:engine', 'utf8'));
    }
  } catch {}
  return out;
}

function checkStatus(resourcesDir) {
  const pluginOk = fs.existsSync(path.join(PLUGIN_DEST_DIR, 'plugin.json'));
  const sidecarOk =
    fs.existsSync(path.join(SIDECAR_DEST_DIR, 'sidecar.json')) &&
    fs.existsSync(path.join(SIDECAR_DEST_DIR, 'server.cjs')) &&
    fs.existsSync(path.join(SIDECAR_DEST_DIR, 'ui.html'));
  const assetsOk =
    fs.existsSync(path.join(ASSETS_DEST_DIR, 'logo.png')) &&
    FRAME_FILES.every((f) => fs.existsSync(path.join(ASSETS_DEST_DIR, 'frames', f))) &&
    EXTRA_BUILTIN_SKINS.every((skin) =>
      FRAME_FILES.every((f) => fs.existsSync(path.join(ASSETS_DEST_DIR, 'skins', skin, f)))
    ) &&
    fs.existsSync(path.join(ASSETS_DEST_DIR, 'sounds', 'boing_press.wav')) &&
    fs.existsSync(path.join(ASSETS_DEST_DIR, 'sounds', 'boing_release.wav')) &&
    fs.existsSync(path.join(ASSETS_DEST_DIR, 'sounds', 'review_alert.wav'));
  const skillOk = fs.existsSync(path.join(SKILL_DEST_DIR, 'SKILL.md'));
  const asarStatus = checkAsarStatus(resourcesDir);

  const report = {
    platform: process.platform,
    configDir: GEMINI_CONFIG_DIR,
    pluginInstalled: pluginOk,
    sidecarInstalled: sidecarOk,
    assetsInstalled: assetsOk,
    skillInstalled: skillOk,
    asarStatus
  };
  console.log(JSON.stringify(report, null, 2));
  if (!pluginOk || !sidecarOk || !assetsOk || !skillOk) process.exitCode = 1;
}

async function runDoctor(args, resourcesDir) {
  const { AgyCockpitServer } = require('./sidecars/neko-cockpit/server.cjs');
  const localSrv = new AgyCockpitServer();
  localSrv.refreshProjectsRegistry(true);
  localSrv.refreshIndex({ force: true });
  const diag = await localSrv.runDiagnostics({ refresh: true, offlineMode: true });
  const asarStatus = checkAsarStatus(resourcesDir);

  const contracts = [
    {
      id: 'neko_plugin_files',
      title: 'Antigravity Observer & Gemini Catgirl Widget Assets Sync',
      status:
        fs.existsSync(path.join(PLUGIN_DEST_DIR, 'plugin.json')) &&
        fs.existsSync(path.join(SIDECAR_DEST_DIR, 'server.cjs')) &&
        fs.existsSync(path.join(ASSETS_DEST_DIR, 'logo.png')) &&
        FRAME_FILES.every((f) => fs.existsSync(path.join(ASSETS_DEST_DIR, 'frames', f))) &&
        EXTRA_BUILTIN_SKINS.every((skin) =>
          FRAME_FILES.every((f) => fs.existsSync(path.join(ASSETS_DEST_DIR, 'skins', skin, f)))
        ) &&
        fs.existsSync(path.join(ASSETS_DEST_DIR, 'sounds', 'boing_release.wav')) &&
        fs.existsSync(path.join(ASSETS_DEST_DIR, 'sounds', 'review_alert.wav'))
          ? 'pass'
          : 'fail',
      detail: `Plugin dir: ${PLUGIN_DEST_DIR}`
    },
    {
      id: 'neko_window_hud_patch',
      title: 'In-Window Context Observer & Input Stats Bar ASAR Bridge',
      status: asarStatus.hudMainPatched && asarStatus.hudPreloadPatched ? 'pass' : (asarStatus.stagedReady ? 'warn' : 'fail'),
      detail: asarStatus.hudMainPatched && asarStatus.hudPreloadPatched
        ? `Patched inside app.asar (AG_ZH intact: ${asarStatus.zhLocalizationIntact})`
        : (asarStatus.stagedReady
            ? 'Candidate ASAR staged; run 双击安装观察窗补丁.bat while Antigravity is closed to apply.'
            : 'ASAR bridge not installed yet.')
    },
    ...(diag.contracts || [])
  ];

  const failCount = contracts.filter((c) => c.status === 'fail').length;
  const warnCount = contracts.filter((c) => c.status === 'warn').length;
  const passCount = contracts.filter((c) => c.status === 'pass').length;
  if (args.includes('--json')) {
    console.log(JSON.stringify({ status: failCount ? 'fail' : (warnCount ? 'warn' : 'ok'), summary: { passCount, warnCount, failCount }, contracts }, null, 2));
  } else {
    console.log(`[gemini-neko-cockpit doctor] ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
    for (const c of contracts) {
      const tag = c.status === 'pass' ? '[PASS]' : (c.status === 'warn' ? '[WARN]' : '[FAIL]');
      console.log(`${tag} ${c.id}: ${c.title} -> ${c.detail}`);
    }
  }
  if (failCount > 0) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  const idxDir = args.indexOf('--install-dir');
  const explicitDir = idxDir !== -1 ? args[idxDir + 1] : '';
  const resourcesDir = resolveAntigravityResourcesDir(explicitDir);

  if (args.includes('--check')) {
    checkStatus(resourcesDir);
    return;
  }

  if (args.includes('--doctor')) {
    await runDoctor(args, resourcesDir);
    return;
  }

  if (args.includes('--uninstall')) {
    restartRunningSidecarServer();
    if (fs.existsSync(PLUGIN_DEST_DIR)) {
      fs.rmSync(PLUGIN_DEST_DIR, { recursive: true, force: true });
    }
    if (resourcesDir && fs.existsSync(path.join(resourcesDir, 'app.asar'))) {
      const res = buildPatchedAsar(resourcesDir, true);
      if (res.ok) {
        const allowKill = args.includes('--kill');
        const swap = trySwapStagedAsar(res.asarPath, res.stagedPath, allowKill);
        console.log('[gemini-neko-cockpit] Uninstall ASAR swap:', swap);
        if (swap.applied && args.includes('--relaunch')) relaunchAntigravityWindows(resourcesDir);
      }
    }
    console.log('[gemini-neko-cockpit] Uninstalled cleanly.');
    return;
  }

  if (args.includes('--apply-staged')) {
    if (!resourcesDir) throw new Error('Antigravity resources directory not found');
    const asarPath = path.join(resourcesDir, 'app.asar');
    const stagedPath = path.join(resourcesDir, 'app.asar.neko-staged');
    if (!fs.existsSync(stagedPath)) {
      buildPatchedAsar(resourcesDir, false);
    }
    const swap = trySwapStagedAsar(asarPath, stagedPath, args.includes('--kill'));
    console.log('[gemini-neko-cockpit] Apply staged ASAR:', swap);
    if (!swap.applied) process.exitCode = 1;
    else if (args.includes('--relaunch')) relaunchAntigravityWindows(resourcesDir);
    return;
  }

  // Default install:
  const sidecarRes = installSidecarPlugin();
  console.log('[gemini-neko-cockpit] Sidecar plugin installed:', sidecarRes.pluginDir);
  console.log('  Sidecar pill: [反重力观察窗](sidecar://gemini-neko-cockpit/neko-cockpit/ui.html)');

  if (resourcesDir && !args.includes('--sidecar-only')) {
    const built = buildPatchedAsar(resourcesDir, false);
    if (built.ok) {
      const swap = trySwapStagedAsar(built.asarPath, built.stagedPath, args.includes('--kill'));
      if (swap.applied) {
        console.log('[gemini-neko-cockpit] Window HUD & Context Observer ASAR bridge applied!');
        if (args.includes('--relaunch')) relaunchAntigravityWindows(resourcesDir);
      } else {
        console.log('[gemini-neko-cockpit] Antigravity is running; ASAR bridge validated & staged at:');
        console.log('  ', built.stagedPath);
        console.log('  Close Antigravity and run `双击安装观察窗补丁.bat` (or `node setup.cjs --apply-staged --kill --relaunch`) to activate the Gemini catgirl widget & context observer.');
        if (args.includes('--kill')) process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error('[gemini-neko-cockpit] Setup failed:', err);
  process.exit(1);
});
