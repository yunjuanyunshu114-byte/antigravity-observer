// ===== GEMINI_NEKO_HUD_BEGIN =====
(function () {
  try {
    const electron = require('electron');
    const ipcMain = electron && electron.ipcMain;
    if (!ipcMain || globalThis.__GEMINI_NEKO_MAIN_BRIDGE__) return;
    globalThis.__GEMINI_NEKO_MAIN_BRIDGE__ = true;

    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const http = require('http');
    const https = require('https');

    const PLUGIN_DIR = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'gemini-neko-cockpit');
    const PREFS_PATH = path.join(PLUGIN_DIR, 'hud_prefs.json');
    const CUSTOM_ASSETS_DIR = path.join(PLUGIN_DIR, 'assets', 'custom');
    const RUNTIME_PTR_PATH = path.join(PLUGIN_DIR, 'runtime_server.json');
    const DAILY_CACHE_PATH = path.join(PLUGIN_DIR, 'daily_tokens_cache.json');
    const DAEMON_DIR = path.join(os.homedir(), '.gemini', 'antigravity', 'daemon');
    const BRAIN_DIR = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
    const PROJECTS_DIR = path.join(os.homedir(), '.gemini', 'config', 'projects');
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const SENDER_UUID_RE = /\bsender=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?![/a-z0-9_-])/i;
    const FRAME_KEYS = ['idle', 'eat', 'grin', 'xd', 'wait'];
    const BUILTIN_SKINS = ['purple', 'heterochromia', 'sleepwear', 'maid', 'swimsuit', 'rainbow', 'winter'];

    const DEFAULT_ANCHOR = {
      v: 2,
      hAnchor: 'right',
      hDist: 0,
      vAnchor: 'bottom',
      vDist: 0
    };

    const DEFAULT_PREFS = {
      prefsVersion: 2,
      enabled: true,
      showStatsBar: true,
      size: 112,
      bubbleScale: 1,
      bubbleAutoHideSec: 8,
      opacity: 1,
      soundEnabled: true,
      soundSet: 'boing',
      volume: 0.78,
      customAudioPath: '',
      completionEasterEgg: true,
      completionSound: false,
      turnCostBubble: true,
      reviewAlertEnabled: true,
      reviewAlertSound: true,
      skin: 'purple',
      anchor: { ...DEFAULT_ANCHOR },
      patCount: 0,
      customDialogues: [],
      customFrames: {
        idle: '',
        eat: '',
        grin: '',
        xd: '',
        wait: ''
      }
    };

    const SOUND_FILES = [
      'boing_press',
      'boing_release',
      'nya_press',
      'nya_release',
      'duck_press',
      'duck_release',
      'combo_chime',
      'review_alert'
    ];

    const AUDIO_MIME_MAP = {
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm'
    };

    const IMAGE_MIME_MAP = {
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif'
    };

    function readJsonSafe(filePath) {
      try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        return null;
      }
    }

    function normalizeAnchor(raw, prefsVersion) {
      if (!raw || typeof raw !== 'object') return { ...DEFAULT_ANCHOR };
      const hAnchor = raw.hAnchor === 'left' ? 'left' : 'right';
      const vAnchor = raw.vAnchor === 'top' ? 'top' : 'bottom';
      let hDist = Number.isFinite(Number(raw.hDist)) ? Math.max(0, Math.min(4000, Math.round(Number(raw.hDist)))) : DEFAULT_ANCHOR.hDist;
      let vDist = Number.isFinite(Number(raw.vDist)) ? Math.max(0, Math.min(4000, Math.round(Number(raw.vDist)))) : DEFAULT_ANCHOR.vDist;
      // Migrate old v1 default/snapped margin (e.g. 14/16, 26) to flush bottom-right (0, 0)
      if ((!prefsVersion || Number(prefsVersion) < 2) && hAnchor === 'right' && vAnchor === 'bottom' && hDist <= 24 && vDist <= 32) {
        hDist = 0;
        vDist = 0;
      }
      return { v: 2, hAnchor, hDist, vAnchor, vDist };
    }

    function normalizeCustomDialogues(raw) {
      if (!Array.isArray(raw)) return [];
      const seen = new Set();
      const out = [];
      for (const item of raw) {
        const txt = String(item ?? '').trim().slice(0, 120);
        if (!txt || seen.has(txt)) continue;
        seen.add(txt);
        out.push(txt);
        if (out.length >= 60) break;
      }
      return out;
    }

    function normalizeCustomFrames(raw) {
      const out = { idle: '', eat: '', grin: '', xd: '', wait: '' };
      if (!raw || typeof raw !== 'object') return out;
      for (const k of FRAME_KEYS) {
        out[k] = typeof raw[k] === 'string' ? raw[k].trim() : '';
      }
      return out;
    }

    function normalizePrefs(raw) {
      const rawVer = raw && typeof raw === 'object' ? raw.prefsVersion : 2;
      const merged = { ...DEFAULT_PREFS, ...(raw && typeof raw === 'object' ? raw : {}) };
      merged.prefsVersion = 2;
      merged.enabled = merged.enabled !== false;
      merged.showStatsBar = merged.showStatsBar !== false;
      const sz = Number(merged.size);
      merged.size = Number.isFinite(sz) ? Math.max(64, Math.min(200, Math.round(sz))) : DEFAULT_PREFS.size;
      const bs = Number(merged.bubbleScale);
      merged.bubbleScale = Number.isFinite(bs) ? Math.max(0.65, Math.min(1.6, Math.round(bs * 100) / 100)) : 1;
      const bAuto = Number(merged.bubbleAutoHideSec);
      merged.bubbleAutoHideSec = Number.isFinite(bAuto)
        ? (bAuto <= 0 ? 0 : Math.max(3, Math.min(60, Math.round(bAuto))))
        : DEFAULT_PREFS.bubbleAutoHideSec;
      const op = Number(merged.opacity);
      merged.opacity = Number.isFinite(op) ? Math.max(0.35, Math.min(1, Math.round(op * 100) / 100)) : 1;
      merged.soundEnabled = merged.soundEnabled !== false;
      merged.soundSet = ['boing', 'nya', 'duck', 'custom'].includes(merged.soundSet) ? merged.soundSet : 'boing';
      const vol = Number(merged.volume);
      merged.volume = Number.isFinite(vol) ? Math.max(0, Math.min(1, Math.round(vol * 100) / 100)) : DEFAULT_PREFS.volume;
      merged.customAudioPath = typeof merged.customAudioPath === 'string' ? merged.customAudioPath.trim() : '';
      merged.completionEasterEgg = merged.completionEasterEgg !== false;
      merged.completionSound = Boolean(merged.completionSound);
      merged.turnCostBubble = merged.turnCostBubble !== false;
      merged.reviewAlertEnabled = merged.reviewAlertEnabled !== false;
      merged.reviewAlertSound = merged.reviewAlertSound !== false;
      merged.skin = BUILTIN_SKINS.includes(merged.skin) ? merged.skin : 'purple';
      merged.anchor = normalizeAnchor(merged.anchor, rawVer);
      const pats = Number(merged.patCount);
      merged.patCount = Number.isFinite(pats) && pats >= 0 ? Math.floor(pats) : 0;
      merged.customDialogues = normalizeCustomDialogues(merged.customDialogues);
      merged.customFrames = normalizeCustomFrames(merged.customFrames);
      return merged;
    }

    function loadPrefs() {
      const saved = readJsonSafe(PREFS_PATH);
      const normalized = normalizePrefs(saved);
      if (saved && (!saved.prefsVersion || Number(saved.prefsVersion) < 2)) {
        try {
          fs.mkdirSync(PLUGIN_DIR, { recursive: true });
          fs.writeFileSync(PREFS_PATH, JSON.stringify(normalized, null, 2), 'utf8');
        } catch {}
      }
      return normalized;
    }

    function savePrefs(patch) {
      const current = loadPrefs();
      const nextRaw = { ...current, ...(patch && typeof patch === 'object' ? patch : {}), prefsVersion: 2 };
      const next = normalizePrefs(nextRaw);
      try {
        fs.mkdirSync(PLUGIN_DIR, { recursive: true });
        const tmp = `${PREFS_PATH}.tmp.${process.pid}.${Date.now()}`;
        fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
        try {
          fs.renameSync(tmp, PREFS_PATH);
        } catch {
          fs.copyFileSync(tmp, PREFS_PATH);
          fs.rmSync(tmp, { force: true });
        }
      } catch {}
      return next;
    }

    function readBase64Asset(absPath, maxBytes = 8 * 1024 * 1024) {
      try {
        if (!absPath || !fs.existsSync(absPath)) return '';
        const st = fs.statSync(absPath);
        if (!st.isFile() || st.size <= 0 || st.size > maxBytes) return '';
        return fs.readFileSync(absPath).toString('base64');
      } catch {
        return '';
      }
    }

    function readImageDataUrl(absPath, maxBytes = 6 * 1024 * 1024) {
      if (!absPath) return '';
      const ext = path.extname(absPath).toLowerCase();
      const mime = IMAGE_MIME_MAP[ext];
      if (!mime) return '';
      const b64 = readBase64Asset(absPath, maxBytes);
      return b64 ? `data:${mime};base64,${b64}` : '';
    }

    function loadBootAssets(prefs) {
      const builtinSkins = {};
      for (const skinId of BUILTIN_SKINS) {
        builtinSkins[skinId] = {};
      }
      for (const name of FRAME_KEYS) {
        const purplePath = path.join(PLUGIN_DIR, 'assets', 'frames', `${name}.webp`);
        const purpleUrl = readImageDataUrl(purplePath, 2 * 1024 * 1024);
        if (purpleUrl) builtinSkins.purple[name] = purpleUrl;

        for (const skinId of BUILTIN_SKINS) {
          if (skinId === 'purple') continue;
          const skinPath = path.join(PLUGIN_DIR, 'assets', 'skins', skinId, `${name}.webp`);
          const skinUrl = readImageDataUrl(skinPath, 2 * 1024 * 1024);
          if (skinUrl) builtinSkins[skinId][name] = skinUrl;
          else if (purpleUrl) builtinSkins[skinId][name] = purpleUrl;
        }
      }

      const activeSkin = (prefs && BUILTIN_SKINS.includes(prefs.skin)) ? prefs.skin : 'purple';
      const defaultFrames = {};
      const frames = {};
      const customFrames = (prefs && prefs.customFrames) || {};
      for (const name of FRAME_KEYS) {
        const defUrl = builtinSkins[activeSkin][name] || builtinSkins.purple[name] || '';
        if (defUrl) defaultFrames[name] = defUrl;

        const customUrl = customFrames[name] ? readImageDataUrl(customFrames[name], 6 * 1024 * 1024) : '';
        if (customUrl) {
          frames[name] = customUrl;
        } else if (defUrl) {
          frames[name] = defUrl;
        }
      }

      const sounds = {};
      for (const name of SOUND_FILES) {
        const sp = path.join(PLUGIN_DIR, 'assets', 'sounds', `${name}.wav`);
        const b64 = readBase64Asset(sp, 2 * 1024 * 1024);
        if (b64) {
          sounds[name] = b64;
        }
      }

      let customAudio = null;
      if (prefs && prefs.customAudioPath) {
        const ext = path.extname(prefs.customAudioPath).toLowerCase();
        const mime = AUDIO_MIME_MAP[ext] || '';
        const b64 = mime ? readBase64Asset(prefs.customAudioPath, 8 * 1024 * 1024) : '';
        if (b64) {
          customAudio = {
            path: prefs.customAudioPath,
            name: path.basename(prefs.customAudioPath),
            mime,
            b64
          };
        }
      }

      return { frames, defaultFrames, builtinSkins, sounds, customAudio };
    }

    function isPidAlive(pid) {
      const n = Number(pid);
      if (!Number.isFinite(n) || n <= 0) return false;
      try {
        process.kill(n, 0);
        return true;
      } catch (e) {
        return e && e.code === 'EPERM';
      }
    }

    function findSidecarServerInfo() {
      const candidates = [
        RUNTIME_PTR_PATH,
        path.join(os.homedir(), '.gemini', 'antigravity', 'sidecar_data', 'gemini-neko-cockpit', 'neko-cockpit', 'data', 'server_info.json')
      ];
      for (const p of candidates) {
        const info = readJsonSafe(p);
        if (info && info.port && (!info.pid || isPidAlive(info.pid))) {
          return info;
        }
      }
      return null;
    }

    function httpJsonRequest({ host = '127.0.0.1', port, path: reqPath, method = 'GET', headers = {}, body = null, useHttps = false, timeoutMs = 1500 }) {
      return new Promise((resolve) => {
        const mod = useHttps ? https : http;
        const opts = {
          hostname: host,
          port: Number(port),
          path: reqPath,
          method,
          headers: { Accept: 'application/json', ...headers },
          timeout: timeoutMs,
          ...(useHttps ? { rejectUnauthorized: false } : {})
        };
        const req = mod.request(opts, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8').trim();
            if (res.statusCode < 200 || res.statusCode >= 300) {
              resolve({ ok: false, status: res.statusCode, error: raw || `HTTP ${res.statusCode}` });
              return;
            }
            try {
              resolve({ ok: true, status: res.statusCode, data: raw ? JSON.parse(raw) : {} });
            } catch {
              resolve({ ok: false, status: res.statusCode, error: 'Invalid JSON' });
            }
          });
        });
        req.on('timeout', () => {
          req.destroy();
          resolve({ ok: false, status: 0, error: 'Timeout' });
        });
        req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message }));
        if (body !== null) {
          req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
      });
    }

    // --- Direct fallback against Language Server + transcript.jsonl when sidecar isn't up yet ---
    let cachedHub = { info: null, checkedAt: 0 };
    function discoverLiveHubDaemon() {
      const now = Date.now();
      if (cachedHub.info && now - cachedHub.checkedAt < 10000 && isPidAlive(cachedHub.info.pid)) {
        return cachedHub.info;
      }
      try {
        if (!fs.existsSync(DAEMON_DIR)) return null;
        const files = fs.readdirSync(DAEMON_DIR)
          .filter((n) => n.startsWith('hub_') && n.endsWith('.json'))
          .map((n) => {
            const fp = path.join(DAEMON_DIR, n);
            try {
              const st = fs.statSync(fp);
              return { fp, mtimeMs: st.mtimeMs };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .sort((a, b) => b.mtimeMs - a.mtimeMs);
        for (const f of files) {
          const info = readJsonSafe(f.fp);
          if (info && info.csrfToken && (info.httpPort || info.httpsPort) && isPidAlive(info.pid)) {
            cachedHub = { info, checkedAt: now };
            return info;
          }
        }
      } catch {}
      return null;
    }

    async function callLsFallback(method, bodyObj) {
      const hub = discoverLiveHubDaemon();
      if (!hub) return null;
      const headers = {
        'Content-Type': 'application/json',
        'x-codeium-csrf-token': hub.csrfToken
      };
      const reqPath = `/exa.language_server_pb.LanguageServerService/${method}`;
      if (hub.httpPort) {
        const res = await httpJsonRequest({
          port: hub.httpPort,
          path: reqPath,
          method: 'POST',
          headers,
          body: bodyObj || {},
          useHttps: false,
          timeoutMs: 2500
        });
        if (res.ok) return res.data;
      }
      if (hub.httpsPort) {
        const res = await httpJsonRequest({
          port: hub.httpsPort,
          path: reqPath,
          method: 'POST',
          headers,
          body: bodyObj || {},
          useHttps: true,
          timeoutMs: 2500
        });
        if (res.ok) return res.data;
      }
      return null;
    }

    function parseDurationMs(val) {
      if (typeof val === 'number' && Number.isFinite(val)) return val;
      if (typeof val !== 'string') return 0;
      const m = /^([\d.]+)s$/i.exec(val.trim());
      if (!m) return 0;
      const sec = parseFloat(m[1]);
      return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : 0;
    }

    const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    function formatLocalDateKey(ms) {
      const n = Number(ms);
      if (!Number.isFinite(n) || n <= 0) return '';
      const d = new Date(n);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function getWeekdayZh(dateKey) {
      if (!dateKey || typeof dateKey !== 'string') return '';
      const parts = dateKey.split('-');
      if (parts.length !== 3) return '';
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (!y || !m || !d) return '';
      return WEEKDAY_ZH[new Date(y, m - 1, d).getDay()] || '';
    }

    function calcCacheHitPct(inTok, cacheTok) {
      const i = Number(inTok) || 0;
      const c = Number(cacheTok) || 0;
      const denom = i + c;
      if (denom <= 0) return null;
      const pct = (c / denom) * 100;
      return pct >= 100 ? 100 : Math.round(pct * 10) / 10;
    }

    function parseTranscriptDailyUsage(tp, st) {
      const dailyUsage = {};
      let isSubagent = false;
      try {
        const raw = fs.readFileSync(tp, 'utf8');
        const lines = raw.split('\n');
        let lastParsedStepIndex = -1;
        let lastPlannerStepTok = null;
        let lastPlannerStepDateKey = '';
        let lastActiveMs = 0;
        let promptCount = 0;
        let isFirstLine = true;

        const getBucket = (dk) => {
          if (!dk) return null;
          let b = dailyUsage[dk];
          if (!b) {
            b = { inTok: 0, cacheTok: 0, outTok: 0, rounds: 0, steps: 0, models: {} };
            dailyUsage[dk] = b;
          }
          return b;
        };

        for (const ln of lines) {
          const s = ln.trim();
          if (!s) continue;
          const hasUser = s.includes('"type":"USER_INPUT"');
          const hasPlanner = s.includes('"type":"PLANNER_RESPONSE"');
          const hasSystem = s.includes('"type":"SYSTEM_MESSAGE"');
          if (!hasUser && !hasPlanner && !hasSystem && !isFirstLine) {
            isFirstLine = false;
            continue;
          }
          let obj;
          try {
            obj = JSON.parse(s);
          } catch {
            isFirstLine = false;
            continue;
          }
          const stepIdx = typeof obj.step_index === 'number' ? obj.step_index : -1;
          const isRepeatStep = stepIdx >= 0 && stepIdx === lastParsedStepIndex;
          const createdMs = typeof obj.created_at === 'string' && obj.created_at ? (Date.parse(obj.created_at) || 0) : 0;
          if (createdMs >= lastActiveMs) lastActiveMs = createdMs;
          const type = obj.type || '';
          const content = typeof obj.content === 'string' ? obj.content : '';

          if (!isSubagent && promptCount === 0 && (type === 'SYSTEM_MESSAGE' || (isFirstLine && content.startsWith('The following is a <SYSTEM_MESSAGE>')))) {
            if (SENDER_UUID_RE.test(content)) isSubagent = true;
          }
          isFirstLine = false;

          if (type === 'USER_INPUT') {
            let clean = content;
            const reqMatch = /<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/i.exec(clean);
            if (reqMatch) clean = reqMatch[1];
            clean = clean.trim();
            if (clean && !clean.startsWith('[AGY Cockpit Smart Handoff]')) {
              if (!isRepeatStep) {
                if (stepIdx >= 0) lastParsedStepIndex = stepIdx;
                promptCount += 1;
                if (!isSubagent) {
                  const uDay = formatLocalDateKey(createdMs || lastActiveMs || st.mtimeMs);
                  const ub = getBucket(uDay);
                  if (ub) ub.rounds += 1;
                }
              }
            }
            continue;
          }

          if (type === 'PLANNER_RESPONSE') {
            const inTok = typeof obj.input_tokens === 'number' && obj.input_tokens > 0 ? obj.input_tokens : 0;
            const cacheTok = typeof obj.cache_read_tokens === 'number' && obj.cache_read_tokens > 0 ? obj.cache_read_tokens : 0;
            const outTok = typeof obj.output_tokens === 'number' && obj.output_tokens > 0 ? obj.output_tokens : 0;
            const prevTok = (isRepeatStep && lastPlannerStepTok) ? lastPlannerStepTok : { inTok: 0, cacheTok: 0, outTok: 0 };
            const effIn = inTok > 0 ? inTok : prevTok.inTok;
            const effCache = cacheTok > 0 ? cacheTok : prevTok.cacheTok;
            const effOut = outTok > 0 ? outTok : prevTok.outTok;
            const deltaIn = effIn - prevTok.inTok;
            const deltaCache = effCache - prevTok.cacheTok;
            const deltaOut = effOut - prevTok.outTok;

            const rawDateKey = formatLocalDateKey(createdMs || lastActiveMs || st.mtimeMs);
            const hasPrev = Boolean(isRepeatStep && lastPlannerStepTok && (lastPlannerStepTok.inTok > 0 || lastPlannerStepTok.cacheTok > 0 || lastPlannerStepTok.outTok > 0));
            const stepDateKey = (hasPrev && lastPlannerStepDateKey) ? lastPlannerStepDateKey : rawDateKey;
            const db = getBucket(stepDateKey);
            if (db && !isRepeatStep) db.steps += 1;
            if (db && (deltaIn !== 0 || deltaCache !== 0 || deltaOut !== 0)) {
              db.inTok = Math.max(0, (db.inTok || 0) + deltaIn);
              db.cacheTok = Math.max(0, (db.cacheTok || 0) + deltaCache);
              db.outTok = Math.max(0, (db.outTok || 0) + deltaOut);
              const deltaTot = deltaIn + deltaCache + deltaOut;
              const rawModel = typeof obj.model === 'string' && obj.model.trim() ? obj.model.trim() : '';
              if (rawModel && deltaTot !== 0) {
                db.models[rawModel] = Math.max(0, (db.models[rawModel] || 0) + deltaTot);
              }
            }
            lastPlannerStepTok = { inTok: effIn, cacheTok: effCache, outTok: effOut };
            lastPlannerStepDateKey = stepDateKey;
            if (stepIdx >= 0) lastParsedStepIndex = stepIdx;
          }
        }
      } catch {}
      return { mtimeMs: st.mtimeMs, size: st.size, isSubagent, dailyUsage };
    }

    let dailyCacheState = { loaded: false, tzOffsetMin: new Date().getTimezoneOffset(), entries: {}, lastScanAt: 0 };

    function ensureDailyCacheLoaded() {
      const curTz = new Date().getTimezoneOffset();
      if (dailyCacheState.loaded && dailyCacheState.tzOffsetMin === curTz) return;
      dailyCacheState = { loaded: true, tzOffsetMin: curTz, entries: {}, lastScanAt: 0 };
      const saved = readJsonSafe(DAILY_CACHE_PATH);
      if (saved && saved.version === 1 && saved.tzOffsetMin === curTz && saved.entries && typeof saved.entries === 'object') {
        dailyCacheState.entries = saved.entries;
      }
    }

    function saveDailyCacheToDisk() {
      try {
        fs.mkdirSync(PLUGIN_DIR, { recursive: true });
        const tmp = `${DAILY_CACHE_PATH}.tmp.${process.pid}.${Date.now()}`;
        fs.writeFileSync(
          tmp,
          JSON.stringify({ version: 1, tzOffsetMin: dailyCacheState.tzOffsetMin, savedAt: Date.now(), entries: dailyCacheState.entries }),
          'utf8'
        );
        try {
          fs.renameSync(tmp, DAILY_CACHE_PATH);
        } catch {
          fs.copyFileSync(tmp, DAILY_CACHE_PATH);
          fs.rmSync(tmp, { force: true });
        }
      } catch {}
    }

    async function getFallbackDailyTokens(reqDays = 14, forceRefresh = false) {
      const nDays = Math.max(1, Math.min(366, Number(reqDays) || 14));
      ensureDailyCacheLoaded();
      const now = Date.now();
      let dirty = false;

      if (forceRefresh || now - dailyCacheState.lastScanAt >= 2000) {
        dailyCacheState.lastScanAt = now;
        try {
          if (fs.existsSync(BRAIN_DIR)) {
            const dirents = fs.readdirSync(BRAIN_DIR, { withFileTypes: true });
            const seen = new Set();
            for (const d of dirents) {
              if (!d.isDirectory() || d.name.startsWith('.')) continue;
              const convId = d.name.toLowerCase();
              if (!UUID_RE.test(convId)) continue;
              seen.add(convId);
              const tp = path.join(BRAIN_DIR, convId, '.system_generated', 'logs', 'transcript.jsonl');
              let st = null;
              try {
                if (fs.existsSync(tp)) st = fs.statSync(tp);
              } catch {}
              if (!st || !st.isFile()) continue;
              const prev = dailyCacheState.entries[convId];
              if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size && prev.dailyUsage) {
                continue;
              }
              dailyCacheState.entries[convId] = parseTranscriptDailyUsage(tp, st);
              dirty = true;
            }
            for (const oldId of Object.keys(dailyCacheState.entries)) {
              if (!seen.has(oldId)) {
                delete dailyCacheState.entries[oldId];
                dirty = true;
              }
            }
          }
        } catch {}
        if (dirty) saveDailyCacheToDisk();
      }

      const modelMap = await getFallbackModelLabelMap(false).catch(() => new Map());
      const byDate = new Map();
      const allTime = { totalTokens: 0, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, activeDates: new Set() };

      const getAgg = (dateKey) => {
        let agg = byDate.get(dateKey);
        if (!agg) {
          agg = {
            date: dateKey,
            inputTokens: 0,
            cacheReadTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            subagentTokens: 0,
            conversations: 0,
            subagentConversations: 0,
            rounds: 0,
            steps: 0,
            models: new Map()
          };
          byDate.set(dateKey, agg);
        }
        return agg;
      };

      for (const item of Object.values(dailyCacheState.entries)) {
        if (!item || !item.dailyUsage || typeof item.dailyUsage !== 'object') continue;
        for (const [dateKey, b] of Object.entries(item.dailyUsage)) {
          if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
          const inTok = Number(b.inTok) || 0;
          const cacheTok = Number(b.cacheTok) || 0;
          const outTok = Number(b.outTok) || 0;
          const totTok = inTok + cacheTok + outTok;
          const rounds = Number(b.rounds) || 0;
          const steps = Number(b.steps) || 0;
          if (totTok <= 0 && rounds <= 0 && steps <= 0) continue;

          const agg = getAgg(dateKey);
          agg.inputTokens += inTok;
          agg.cacheReadTokens += cacheTok;
          agg.outputTokens += outTok;
          agg.totalTokens += totTok;
          agg.steps += steps;

          if (item.isSubagent) {
            agg.subagentTokens += totTok;
            if (totTok > 0) agg.subagentConversations += 1;
          } else {
            agg.rounds += rounds;
            if (totTok > 0 || rounds > 0) agg.conversations += 1;
          }

          if (b.models && typeof b.models === 'object') {
            for (const [mKey, mTok] of Object.entries(b.models)) {
              const val = Number(mTok) || 0;
              if (!mKey || val <= 0) continue;
              const lbl = modelMap.get(mKey) || modelMap.get(mKey.toLowerCase()) || mKey;
              agg.models.set(lbl, (agg.models.get(lbl) || 0) + val);
            }
          }

          allTime.inputTokens += inTok;
          allTime.cacheReadTokens += cacheTok;
          allTime.outputTokens += outTok;
          allTime.totalTokens += totTok;
          if (totTok > 0) allTime.activeDates.add(dateKey);
        }
      }

      const nowDate = new Date();
      const days = [];
      let rangeInput = 0;
      let rangeCache = 0;
      let rangeOutput = 0;
      let rangeTotal = 0;
      let rangeActiveDays = 0;
      let peakDate = '';
      let peakTokens = 0;

      for (let i = 0; i < nDays; i++) {
        const dt = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - i);
        const dateKey = formatLocalDateKey(dt.getTime());
        const agg = byDate.get(dateKey);
        const inTok = agg ? agg.inputTokens : 0;
        const cacheTok = agg ? agg.cacheReadTokens : 0;
        const outTok = agg ? agg.outputTokens : 0;
        const totTok = agg ? agg.totalTokens : 0;
        const modelsList = agg
          ? [...agg.models.entries()]
              .map(([model, tokens]) => ({ model, tokens }))
              .sort((a, b) => b.tokens - a.tokens)
              .slice(0, 6)
          : [];
        days.push({
          date: dateKey,
          shortDate: dateKey.slice(5),
          weekday: getWeekdayZh(dateKey),
          isToday: i === 0,
          isYesterday: i === 1,
          totalTokens: totTok,
          inputTokens: inTok,
          cacheReadTokens: cacheTok,
          outputTokens: outTok,
          subagentTokens: agg ? agg.subagentTokens : 0,
          cacheHitPct: calcCacheHitPct(inTok, cacheTok),
          conversations: agg ? agg.conversations : 0,
          subagentConversations: agg ? agg.subagentConversations : 0,
          rounds: agg ? agg.rounds : 0,
          steps: agg ? agg.steps : 0,
          topModel: modelsList.length > 0 ? modelsList[0].model : '',
          models: modelsList
        });

        rangeInput += inTok;
        rangeCache += cacheTok;
        rangeOutput += outTok;
        rangeTotal += totTok;
        if (totTok > 0) rangeActiveDays += 1;
        if (totTok > peakTokens) {
          peakTokens = totTok;
          peakDate = dateKey;
        }
      }

      const today = days[0] || null;
      const yesterday = days[1] || null;
      let fallbackYesterday = null;
      if (!yesterday) {
        const yDt = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1);
        const yKey = formatLocalDateKey(yDt.getTime());
        const yAgg = byDate.get(yKey);
        if (yAgg) {
          const yModels = [...yAgg.models.entries()]
            .map(([model, tokens]) => ({ model, tokens }))
            .sort((a, b) => b.tokens - a.tokens)
            .slice(0, 6);
          fallbackYesterday = {
            date: yKey,
            shortDate: yKey.slice(5),
            weekday: getWeekdayZh(yKey),
            isToday: false,
            isYesterday: true,
            totalTokens: yAgg.totalTokens,
            inputTokens: yAgg.inputTokens,
            cacheReadTokens: yAgg.cacheReadTokens,
            outputTokens: yAgg.outputTokens,
            subagentTokens: yAgg.subagentTokens,
            cacheHitPct: calcCacheHitPct(yAgg.inputTokens, yAgg.cacheReadTokens),
            conversations: yAgg.conversations,
            subagentConversations: yAgg.subagentConversations,
            rounds: yAgg.rounds,
            steps: yAgg.steps,
            topModel: yModels.length > 0 ? yModels[0].model : '',
            models: yModels
          };
        }
      }

      return {
        ok: true,
        ts: now,
        fallback: true,
        tzOffsetMin: nowDate.getTimezoneOffset(),
        daysCount: nDays,
        today,
        yesterday: yesterday || fallbackYesterday,
        rangeSummary: {
          days: nDays,
          totalTokens: rangeTotal,
          inputTokens: rangeInput,
          cacheReadTokens: rangeCache,
          outputTokens: rangeOutput,
          cacheHitPct: calcCacheHitPct(rangeInput, rangeCache),
          activeDays: rangeActiveDays,
          avgPerDay: Math.round(rangeTotal / nDays),
          avgPerActiveDay: rangeActiveDays > 0 ? Math.round(rangeTotal / rangeActiveDays) : 0,
          peakDate,
          peakTokens
        },
        allTimeSummary: {
          totalTokens: allTime.totalTokens,
          inputTokens: allTime.inputTokens,
          cacheReadTokens: allTime.cacheReadTokens,
          outputTokens: allTime.outputTokens,
          cacheHitPct: calcCacheHitPct(allTime.inputTokens, allTime.cacheReadTokens),
          activeDays: allTime.activeDates.size
        },
        days
      };
    }

    function parseFallbackTranscript(convId) {
      const out = {
        id: convId,
        rounds: 0,
        steps: 0,
        inputTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        contextTokens: 0,
        compactions: 0,
        cacheHitPct: null,
        tokPerSec: 0,
        isThinking: false
      };
      try {
        const tp = path.join(BRAIN_DIR, convId, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(tp)) return out;
        const st = fs.statSync(tp);
        const raw = fs.readFileSync(tp, 'utf8');
        const lines = raw.split('\n');
        let lastStepType = '';
        let lastStepStatus = '';
        let lastHasTools = false;
        let lastPlannerCreatedMs = 0;
        let lastOut = 0;
        for (const ln of lines) {
          const s = ln.trim();
          if (!s) continue;
          try {
            const obj = JSON.parse(s);
            if (typeof obj.step_index === 'number' && obj.step_index + 1 > out.steps) {
              out.steps = obj.step_index + 1;
            }
            const t = obj.type || '';
            lastStepType = t;
            lastStepStatus = obj.status || '';
            lastHasTools = Array.isArray(obj.tool_calls) && obj.tool_calls.length > 0;
            if (t === 'USER_INPUT') out.rounds += 1;
            else if (t === 'CHECKPOINT') out.compactions += 1;
            else if (t === 'PLANNER_RESPONSE') {
              const i = Number(obj.input_tokens) || 0;
              const c = Number(obj.cache_read_tokens) || 0;
              const o = Number(obj.output_tokens) || 0;
              out.inputTokens += i;
              out.cacheReadTokens += c;
              out.outputTokens += o;
              if (i + c > 0) out.contextTokens = i + c;
              if (obj.created_at) {
                const ms = Date.parse(obj.created_at);
                if (ms > 0) lastPlannerCreatedMs = ms;
              }
              if (o > 0) lastOut = o;
            }
          } catch {}
        }
        out.totalTokens = out.inputTokens + out.cacheReadTokens + out.outputTokens;
        const denom = out.inputTokens + out.cacheReadTokens;
        out.cacheHitPct = denom > 0 ? Math.min(100, Math.round((out.cacheReadTokens / denom) * 1000) / 10) : null;
        if (out.rounds === 0 && out.steps > 0) out.rounds = 1;
        out.isThinking =
          Date.now() - st.mtimeMs < 180000 &&
          (lastStepStatus === 'RUNNING' ||
            lastStepType === 'USER_INPUT' ||
            lastStepType === 'GENERIC' ||
            (lastStepType === 'PLANNER_RESPONSE' && lastHasTools));
      } catch {}
      return out;
    }

    let fallbackQuotaCache = { data: null, fetchedAt: 0 };
    let fallbackPlanCache = { data: null, fetchedAt: 0 };
    let fallbackModelMapCache = { map: new Map(), fetchedAt: 0 };
    const fallbackMetaCache = new Map();

    async function getFallbackModelLabelMap(forceRefresh = false) {
      const now = Date.now();
      if (!forceRefresh && fallbackModelMapCache.map.size > 0 && now - fallbackModelMapCache.fetchedAt < 300000) {
        return fallbackModelMapCache.map;
      }
      try {
        const mcRes = await callLsFallback('GetCascadeModelConfigData', {});
        const configs = mcRes && Array.isArray(mcRes.clientModelConfigs) ? mcRes.clientModelConfigs : [];
        if (configs.length > 0) {
          const nextMap = new Map();
          for (const cfg of configs) {
            if (!cfg || !cfg.label) continue;
            const label = String(cfg.label).trim();
            const mId = cfg.modelOrAlias && (cfg.modelOrAlias.model || cfg.modelOrAlias.alias);
            if (mId) nextMap.set(String(mId).trim(), label);
            const slug = label.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (slug && !nextMap.has(slug)) nextMap.set(slug, label);
          }
          fallbackModelMapCache = { map: nextMap, fetchedAt: now };
        }
      } catch {}
      return fallbackModelMapCache.map;
    }

    // --- Project registry & live multi-project waitingSteps scanner ---
    let cachedProjectsRegistry = new Map();
    let cachedProjectsScan = { dirMtimeMs: -1, checkedAt: 0 };
    let cachedWaitingScan = { fetchedAt: 0, summaries: null, waitingProjects: [] };

    function extractLabelFromWorkspaceUri(uri) {
      if (!uri || typeof uri !== 'string') return '';
      let p = uri.trim();
      if (!p) return '';
      try {
        if (/^file:\/\//i.test(p)) {
          const u = new URL(p);
          p = decodeURIComponent(u.pathname || '');
          if (/^\/[a-zA-Z]:/.test(p)) p = p.slice(1);
        } else {
          p = decodeURIComponent(p);
        }
      } catch {}
      p = p.replace(/[\\/]+$/, '');
      if (!p) return '';
      const base = path.basename(p);
      return base || p;
    }

    function loadProjectsRegistry() {
      const now = Date.now();
      if (now - cachedProjectsScan.checkedAt < 2000 && cachedProjectsRegistry.size > 0) {
        return cachedProjectsRegistry;
      }
      cachedProjectsScan.checkedAt = now;
      try {
        if (!fs.existsSync(PROJECTS_DIR)) return cachedProjectsRegistry;
        const dirStat = fs.statSync(PROJECTS_DIR);
        if (dirStat.mtimeMs === cachedProjectsScan.dirMtimeMs && cachedProjectsRegistry.size > 0) {
          return cachedProjectsRegistry;
        }
        cachedProjectsScan.dirMtimeMs = dirStat.mtimeMs;
        const next = new Map();
        const files = fs.readdirSync(PROJECTS_DIR);
        for (const f of files) {
          if (!f.toLowerCase().endsWith('.json')) continue;
          const projId = f.slice(0, -5).toLowerCase();
          if (!UUID_RE.test(projId)) continue;
          const raw = readJsonSafe(path.join(PROJECTS_DIR, f));
          if (!raw || typeof raw !== 'object') continue;
          let fallbackLabel = '';
          const resources = raw.projectResources && Array.isArray(raw.projectResources.resources)
            ? raw.projectResources.resources
            : [];
          for (const r of resources) {
            if (!r || typeof r !== 'object') continue;
            fallbackLabel = extractLabelFromWorkspaceUri(r.folderUri || (r.gitFolder && r.gitFolder.folderUri) || '');
            if (fallbackLabel) break;
          }
          const name = (typeof raw.name === 'string' && raw.name.trim()) || fallbackLabel || '';
          next.set(projId, { id: projId, name });
        }
        cachedProjectsRegistry = next;
      } catch {}
      return cachedProjectsRegistry;
    }

    function collectTrajectoryWorkspaceUris(summary) {
      const uris = [];
      if (!summary || typeof summary !== 'object') return uris;
      if (Array.isArray(summary.workspaces)) {
        for (const w of summary.workspaces) {
          if (w && typeof w.workspaceFolderAbsoluteUri === 'string') uris.push(w.workspaceFolderAbsoluteUri);
        }
      }
      const tm = summary.trajectoryMetadata;
      if (tm && typeof tm === 'object') {
        if (Array.isArray(tm.workspaceUris)) {
          for (const u of tm.workspaceUris) {
            if (typeof u === 'string') uris.push(u);
          }
        }
        if (Array.isArray(tm.workspaces)) {
          for (const w of tm.workspaces) {
            if (w && typeof w.workspaceFolderAbsoluteUri === 'string') uris.push(w.workspaceFolderAbsoluteUri);
          }
        }
      }
      return uris;
    }

    function resolveProjectName(projectId, workspaceUris, fallbackTitle) {
      const cleanProj = typeof projectId === 'string' ? projectId.trim().toLowerCase() : '';
      if (cleanProj) {
        const reg = loadProjectsRegistry();
        const hit = reg.get(cleanProj);
        if (hit && hit.name) return hit.name;
      }
      if (Array.isArray(workspaceUris)) {
        for (const u of workspaceUris) {
          const lbl = extractLabelFromWorkspaceUri(u);
          if (lbl) return lbl;
        }
      }
      const fb = typeof fallbackTitle === 'string' ? fallbackTitle.trim() : '';
      return fb || '当前项目';
    }

    function classifyWaitingStep(ws) {
      const stepObj = (ws && ws.step && typeof ws.step === 'object') ? ws.step : {};
      if (stepObj.case === 'askQuestion' || stepObj.askQuestion) {
        return { kind: 'question', label: '提问等待主人回答' };
      }
      if (stepObj.case === 'runCommand' || stepObj.runCommand) {
        return { kind: 'command', label: '终端命令待确认' };
      }
      if (stepObj.case === 'openBrowserUrl' || stepObj.openBrowserUrl) {
        return { kind: 'browser', label: '打开网页待确认' };
      }
      const ri =
        stepObj.requestedInteraction ||
        (stepObj.value && stepObj.value.requestedInteraction) ||
        (ws && ws.requestedInteraction);
      const inter = (ri && ri.interaction) || ri;
      if (inter && (inter.case === 'permission' || inter.permission)) {
        return { kind: 'permission', label: '权限请求待确认' };
      }
      if (ri || stepObj.case === 'requestedInteraction') {
        return { kind: 'review', label: '审查需求待确认' };
      }
      return { kind: 'review', label: '审查需求待确认' };
    }

    async function fetchLiveWaitingProjects(forceRefresh = false) {
      const now = Date.now();
      if (!forceRefresh && cachedWaitingScan.summaries && now - cachedWaitingScan.fetchedAt < 1200) {
        return { summaries: cachedWaitingScan.summaries, waitingProjects: cachedWaitingScan.waitingProjects };
      }
      const trajRes = await callLsFallback('GetAllCascadeTrajectories', { excludeSubtrajectories: true });
      const summaries = trajRes && trajRes.trajectorySummaries && typeof trajRes.trajectorySummaries === 'object'
        ? trajRes.trajectorySummaries
        : null;
      if (!summaries) {
        return { summaries: cachedWaitingScan.summaries || null, waitingProjects: [] };
      }

      const waitingProjects = [];
      for (const [rawId, summary] of Object.entries(summaries)) {
        const cleanId = String(rawId || '').trim().toLowerCase();
        if (!UUID_RE.test(cleanId) || !summary || typeof summary !== 'object') continue;
        if (summary.killed || summary.latestExecutorTerminationReason === 'EXECUTOR_TERMINATION_REASON_USER_CANCELED') {
          continue;
        }
        const st = String(summary.status || '');
        const activeStatus =
          st === 'CASCADE_RUN_STATUS_RUNNING' ||
          st === 'CASCADE_RUN_STATUS_BUSY' ||
          Boolean(summary.hasActiveChildren);
        if (!activeStatus || !Array.isArray(summary.waitingSteps) || summary.waitingSteps.length === 0) {
          continue;
        }
        const ws0 = summary.waitingSteps[0] || {};
        const stepIndex = Number.isFinite(Number(ws0.stepIndex)) ? Number(ws0.stepIndex) : 0;
        const { kind, label } = classifyWaitingStep(ws0);
        const tm = summary.trajectoryMetadata && typeof summary.trajectoryMetadata === 'object'
          ? summary.trajectoryMetadata
          : {};
        const projectId = typeof tm.projectId === 'string' && UUID_RE.test(tm.projectId.trim())
          ? tm.projectId.trim().toLowerCase()
          : '';
        const wsUris = collectTrajectoryWorkspaceUris(summary);
        const convTitle = (
          (summary.annotations && typeof summary.annotations.title === 'string' && summary.annotations.title.trim()) ||
          (typeof summary.summary === 'string' && summary.summary.trim()) ||
          ''
        );
        const projectName = resolveProjectName(projectId, wsUris, convTitle);
        const updatedAtMs = summary.lastModifiedTime ? (Date.parse(summary.lastModifiedTime) || now) : now;
        waitingProjects.push({
          key: `${cleanId}:${stepIndex}`,
          convId: cleanId,
          projectId,
          projectName,
          convTitle,
          kind,
          label,
          stepIndex,
          updatedAtMs
        });
      }
      waitingProjects.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
      cachedWaitingScan = { fetchedAt: now, summaries, waitingProjects };
      return { summaries, waitingProjects };
    }

    async function getFallbackSummary(reqConvId, forceRefresh) {
      const now = Date.now();
      const convId = (reqConvId && UUID_RE.test(String(reqConvId).trim())) ? String(reqConvId).trim().toLowerCase() : '';
      const liveScan = await fetchLiveWaitingProjects(Boolean(forceRefresh));
      const summaries = liveScan.summaries || {};
      const waitingProjects = Array.isArray(liveScan.waitingProjects) ? liveScan.waitingProjects : [];

      if (forceRefresh || now - fallbackQuotaCache.fetchedAt > 20000 || !fallbackQuotaCache.data) {
        const qRes = await callLsFallback('RetrieveUserQuotaSummary', { metadata: { ideName: 'antigravity', extensionName: 'antigravity', locale: 'en' } });
        const rawGroups = qRes && qRes.response && Array.isArray(qRes.response.groups) ? qRes.response.groups : [];
        if (rawGroups.length > 0) {
          const groups = rawGroups.map((g) => {
            const buckets = (g.buckets || []).map((b) => {
              const rem = typeof b.remainingFraction === 'number' ? Math.max(0, Math.min(1, b.remainingFraction)) : 0;
              const resetMs = b.resetTime ? Date.parse(b.resetTime) || 0 : 0;
              return {
                bucketId: b.bucketId || '',
                windowKind: b.window || 'other',
                windowLabel: b.window === '5h' ? '5-hour' : (b.window === 'weekly' ? 'Weekly' : (b.displayName || 'Quota')),
                remainingPct: Math.round(rem * 1000) / 10,
                usedPct: Math.round((1 - rem) * 1000) / 10,
                resetMs,
                resetAtIso: b.resetTime || '',
                resetAtMs: resetMs
              };
            });
            return {
              key: (g.displayName || '').toLowerCase().includes('claude') ? 'claude' : ((g.displayName || '').toLowerCase().includes('argon') ? 'argon' : 'gemini'),
              label: g.displayName || 'Quota',
              description: g.description || '',
              buckets
            };
          });
          fallbackQuotaCache = { data: { source: 'quota_summary', groups, fetchedAtMs: now }, fetchedAt: now };
        }
      }

      if (forceRefresh || now - fallbackPlanCache.fetchedAt > 120000 || !fallbackPlanCache.data) {
        const usRes = await callLsFallback('GetUserStatus', { metadata: { ideName: 'antigravity', extensionName: 'antigravity', locale: 'en' } });
        const us = usRes && usRes.userStatus;
        if (us) {
          fallbackPlanCache = {
            data: {
              planName: (us.planStatus && us.planStatus.planInfo && us.planStatus.planInfo.planName) || '',
              email: us.email || '',
              userName: us.name || ''
            },
            fetchedAt: now
          };
        }
      }

      let conv = null;
      if (convId) {
        const parsed = parseFallbackTranscript(convId);
        const traj = summaries[convId] || null;
        if (traj) {
          if (Number(traj.stepCount) > parsed.steps) parsed.steps = Number(traj.stepCount);
          if (traj.status === 'CASCADE_RUN_STATUS_RUNNING') parsed.isThinking = true;
          else if (traj.status === 'CASCADE_RUN_STATUS_IDLE') parsed.isThinking = false;
        }
        const gmCached = fallbackMetaCache.get(convId);
        let gm = gmCached && (now - gmCached.ts < 3000) && gmCached.steps === parsed.steps ? gmCached.data : null;
        if (!gm) {
          const [gmRes, modelMap] = await Promise.all([
            callLsFallback('GetCascadeTrajectoryGeneratorMetadata', {
              cascadeId: convId,
              generatorMetadataOffset: 0,
              includeMessages: false
            }),
            getFallbackModelLabelMap(Boolean(forceRefresh))
          ]);
          const list = gmRes && Array.isArray(gmRes.generatorMetadata) ? gmRes.generatorMetadata : [];
          let maxContextTokens = 0;
          let estimatedTokensUsed = 0;
          let modelLabel = '';
          let ttftMs = 0;
          const speedSamples = [];
          const fallbackSamples = [];
          let tokenBreakdown = null;
          for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            const cm = item && item.chatModel;
            if (!cm) continue;
            if (!modelLabel) {
              const mEnum = (item.plannerConfig && item.plannerConfig.requestedModel && (item.plannerConfig.requestedModel.model || item.plannerConfig.requestedModel.alias)) || cm.model || '';
              const rawLbl = cm.modelDisplayName || (item.plannerConfig && item.plannerConfig.modelName) || cm.responseModel || '';
              modelLabel = (mEnum && modelMap.get(String(mEnum))) || (rawLbl && modelMap.get(String(rawLbl).toLowerCase())) || rawLbl || mEnum || '';
            }
            const cwm = cm.chatStartMetadata && cm.chatStartMetadata.contextWindowMetadata;
            if (cwm) {
              if (!maxContextTokens && Number(cwm.maxContextTokens) > 0) maxContextTokens = Number(cwm.maxContextTokens);
              if (!estimatedTokensUsed && Number(cwm.estimatedTokensUsed) > 0) estimatedTokensUsed = Number(cwm.estimatedTokensUsed);
              if (!tokenBreakdown && cwm.tokenBreakdown && Array.isArray(cwm.tokenBreakdown.groups)) {
                tokenBreakdown = {
                  totalTokens: Number(cwm.tokenBreakdown.totalTokens) || estimatedTokensUsed,
                  groups: cwm.tokenBreakdown.groups.map((g) => ({
                    name: g.name || '',
                    type: g.type || '',
                    numTokens: Number(g.numTokens) || 0,
                    children: Array.isArray(g.children)
                      ? g.children.slice(0, 12).map((c) => ({ name: c.name || '', numTokens: Number(c.numTokens) || 0 }))
                      : []
                  }))
                };
              }
            }
            const sm = parseDurationMs(cm.streamingDuration);
            const usage = cm.usage || {};
            const respOut = Number(usage.responseOutputTokens) || 0;
            const thinkOut = Number(usage.thinkingOutputTokens) || 0;
            const ot = respOut > 0 ? respOut : (thinkOut === 0 ? (Number(usage.outputTokens) || 0) : 0);
            if (sm > 0 && ot > 0) {
              const spd = Math.round((ot / (sm / 1000)) * 10) / 10;
              if (spd > 0 && spd <= 600) {
                if (sm >= 800 && speedSamples.length < 5) speedSamples.push(spd);
                else if (sm >= 450 && fallbackSamples.length < 3) fallbackSamples.push(spd);
              }
            }
            if (!ttftMs) ttftMs = parseDurationMs(cm.timeToFirstToken);
            if (maxContextTokens > 0 && speedSamples.length >= 5 && modelLabel) break;
          }
          const calcSpeedMedian = (arr) => {
            if (!arr || arr.length === 0) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const raw = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            return Math.round(raw * 10) / 10;
          };
          const tokPerSec = speedSamples.length > 0 ? calcSpeedMedian(speedSamples) : calcSpeedMedian(fallbackSamples);
          gm = { maxContextTokens, estimatedTokensUsed, modelLabel, ttftMs, tokPerSec, tokenBreakdown };
          fallbackMetaCache.set(convId, { ts: now, steps: parsed.steps, data: gm });
        }

        const ctxTok = Math.max(parsed.contextTokens, gm.estimatedTokensUsed || 0);
        const ctxMax = gm.maxContextTokens || 0;
        const zeroConvPct = (parsed.steps === 0 && ctxTok === 0) ? 0 : null;
        const waitHit = waitingProjects.find((w) => w.convId === convId) || null;
        const trajMeta = traj && traj.trajectoryMetadata && typeof traj.trajectoryMetadata === 'object' ? traj.trajectoryMetadata : {};
        const projId = typeof trajMeta.projectId === 'string' ? trajMeta.projectId.trim().toLowerCase() : '';
        const wsUris = collectTrajectoryWorkspaceUris(traj);
        const convTitle = (traj && ((traj.annotations && traj.annotations.title) || traj.summary)) || (parsed.steps > 0 ? `对话 ${convId.slice(0, 8)}` : '新对话');
        const projectName = (waitHit && waitHit.projectName) || ((projId || wsUris.length > 0) ? resolveProjectName(projId, wsUris, convTitle) : '');
        conv = {
          id: convId,
          title: convTitle,
          projectName,
          isThinking: waitHit ? false : parsed.isThinking,
          waitState: waitHit ? waitHit.kind : '',
          waitToolName: '',
          modelLabel: gm.modelLabel || '',
          rounds: parsed.rounds,
          steps: parsed.steps,
          tokPerSec: gm.tokPerSec || parsed.tokPerSec || 0,
          ttftMs: gm.ttftMs || 0,
          totalTokens: parsed.totalTokens,
          inputTokens: parsed.inputTokens,
          cacheReadTokens: parsed.cacheReadTokens,
          outputTokens: parsed.outputTokens,
          cacheHitPct: parsed.cacheHitPct,
          contextTokens: ctxTok,
          contextMaxTokens: ctxMax,
          contextPct: ctxMax > 0 ? Math.min(100, Math.round((ctxTok / ctxMax) * 1000) / 10) : zeroConvPct,
          contextSource: ctxMax > 0 ? 'server' : 'observed',
          compactions: parsed.compactions,
          pollution: {
            id: parsed.compactions >= 10 ? 'polluted' : (parsed.compactions >= 6 ? 'heavy' : (parsed.compactions >= 3 ? 'warm' : 'fresh')),
            label: parsed.compactions >= 10 ? 'Polluted' : (parsed.compactions >= 6 ? 'Heavy' : (parsed.compactions >= 3 ? 'Warm' : 'Fresh'))
          },
          tokenBreakdown: gm.tokenBreakdown || null
        };
      }

      return {
        ok: true,
        ts: now,
        fallback: true,
        conv,
        waitingProjects,
        quota: fallbackQuotaCache.data,
        plan: fallbackPlanCache.data || { planName: '' }
      };
    }

    ipcMain.handle('neko-hud:get-boot', async () => {
      const prefs = loadPrefs();
      const assets = loadBootAssets(prefs);
      return {
        ok: true,
        prefs,
        frames: assets.frames,
        defaultFrames: assets.defaultFrames,
        builtinSkins: assets.builtinSkins,
        sounds: assets.sounds,
        customAudio: assets.customAudio,
        sidecarInfo: findSidecarServerInfo()
      };
    });

    ipcMain.handle('neko-hud:save-prefs', async (_event, patch) => {
      return savePrefs(patch);
    });

    ipcMain.handle('neko-hud:pick-audio', async (event) => {
      try {
        const dialog = electron && electron.dialog;
        const BrowserWindow = electron && electron.BrowserWindow;
        if (!dialog) return { ok: false, error: 'Dialog unavailable' };
        const win = (BrowserWindow && event && event.sender) ? BrowserWindow.fromWebContents(event.sender) : null;
        const res = await dialog.showOpenDialog(win || undefined, {
          title: '选择 Gemini 猫娘戳一戳音效文件',
          filters: [
            { name: '音频文件', extensions: ['wav', 'mp3', 'ogg', 'm4a', 'aac', 'flac', 'webm'] }
          ],
          properties: ['openFile']
        });
        if (!res || res.canceled || !Array.isArray(res.filePaths) || res.filePaths.length === 0) {
          return { ok: false, canceled: true };
        }
        const filePath = res.filePaths[0];
        const ext = path.extname(filePath).toLowerCase();
        const mime = AUDIO_MIME_MAP[ext];
        if (!mime) return { ok: false, error: '不支持的音频格式' };
        const b64 = readBase64Asset(filePath, 8 * 1024 * 1024);
        if (!b64) return { ok: false, error: '音频文件为空或超过 8MB 限制' };
        const prefs = savePrefs({ customAudioPath: filePath, soundSet: 'custom', soundEnabled: true });
        return {
          ok: true,
          prefs,
          customAudio: {
            path: filePath,
            name: path.basename(filePath),
            mime,
            b64
          }
        };
      } catch (err) {
        return { ok: false, error: err.message || '打开文件选择器失败' };
      }
    });

    ipcMain.handle('neko-hud:pick-frame', async (event, frameKey) => {
      try {
        const key = FRAME_KEYS.includes(frameKey) ? frameKey : 'idle';
        const dialog = electron && electron.dialog;
        const BrowserWindow = electron && electron.BrowserWindow;
        if (!dialog) return { ok: false, error: 'Dialog unavailable' };
        const win = (BrowserWindow && event && event.sender) ? BrowserWindow.fromWebContents(event.sender) : null;
        const labelMap = { idle: '主形象', eat: '思考(吃大米)差分', xd: '戳一下(><)差分', grin: '彩蛋(呲牙笑)差分', wait: '确认/审查差分' };
        const res = await dialog.showOpenDialog(win || undefined, {
          title: `选择自定义${labelMap[key] || '形象'}图片 (支持 PNG/WebP/JPG/GIF)`,
          filters: [
            { name: '图片文件', extensions: ['png', 'webp', 'jpg', 'jpeg', 'gif'] }
          ],
          properties: ['openFile']
        });
        if (!res || res.canceled || !Array.isArray(res.filePaths) || res.filePaths.length === 0) {
          return { ok: false, canceled: true };
        }
        const srcPath = res.filePaths[0];
        const ext = path.extname(srcPath).toLowerCase();
        const mime = IMAGE_MIME_MAP[ext];
        if (!mime) return { ok: false, error: '不支持的图片格式' };
        const st = fs.statSync(srcPath);
        if (!st.isFile() || st.size <= 0 || st.size > 6 * 1024 * 1024) {
          return { ok: false, error: '图片为空或超过 6MB 限制' };
        }
        fs.mkdirSync(CUSTOM_ASSETS_DIR, { recursive: true });
        for (const existingExt of Object.keys(IMAGE_MIME_MAP)) {
          const oldFile = path.join(CUSTOM_ASSETS_DIR, `${key}${existingExt}`);
          if (fs.existsSync(oldFile)) {
            try { fs.rmSync(oldFile, { force: true }); } catch {}
          }
        }
        const destPath = path.join(CUSTOM_ASSETS_DIR, `${key}${ext}`);
        fs.copyFileSync(srcPath, destPath);
        const dataUrl = readImageDataUrl(destPath, 6 * 1024 * 1024);
        if (!dataUrl) return { ok: false, error: '读取自定义图片失败' };

        const current = loadPrefs();
        const nextCustomFrames = { ...(current.customFrames || {}), [key]: destPath };
        const prefs = savePrefs({ customFrames: nextCustomFrames });
        return { ok: true, frameKey: key, dataUrl, prefs };
      } catch (err) {
        return { ok: false, error: err.message || '打开图片选择器失败' };
      }
    });

    ipcMain.handle('neko-hud:reset-frames', async (_event, frameKey) => {
      try {
        const current = loadPrefs();
        const nextCustomFrames = { ...(current.customFrames || {}) };
        const targets = (frameKey && FRAME_KEYS.includes(frameKey)) ? [frameKey] : FRAME_KEYS;
        for (const k of targets) {
          if (nextCustomFrames[k] && nextCustomFrames[k].startsWith(CUSTOM_ASSETS_DIR)) {
            try { fs.rmSync(nextCustomFrames[k], { force: true }); } catch {}
          }
          nextCustomFrames[k] = '';
        }
        const prefs = savePrefs({ customFrames: nextCustomFrames });
        const assets = loadBootAssets(prefs);
        return { ok: true, prefs, frames: assets.frames, defaultFrames: assets.defaultFrames, builtinSkins: assets.builtinSkins };
      } catch (err) {
        return { ok: false, error: err.message || '恢复默认形象失败' };
      }
    });

    ipcMain.handle('neko-hud:get-state', async (_event, convId, forceRefresh) => {
      const normalizedConvId = typeof convId === 'string' ? convId.trim().toLowerCase() : '';
      const info = findSidecarServerInfo();
      if (info && info.port) {
        const qs = new URLSearchParams();
        qs.set('convId', normalizedConvId);
        qs.set('strict', '1');
        if (forceRefresh) qs.set('refresh', '1');
        if (info.token) qs.set('token', info.token);
        const host = info.host || '127.0.0.1';
        const headers = info.token ? { 'X-Sidecar-Token': info.token } : {};
        const summaryPromise = httpJsonRequest({
          host,
          port: info.port,
          path: `/api/hud-summary?${qs.toString()}`,
          headers,
          timeoutMs: 1400
        });
        let quotaPromise = null;
        if (forceRefresh === 'turn-end') {
          const qQs = new URLSearchParams();
          qQs.set('refresh', '1');
          if (info.token) qQs.set('token', info.token);
          quotaPromise = httpJsonRequest({
            host,
            port: info.port,
            path: `/api/quota?${qQs.toString()}`,
            headers,
            timeoutMs: 2200
          });
        }
        const liveWaitingPromise = fetchLiveWaitingProjects(Boolean(forceRefresh));
        const [res, qRes, liveWait] = await Promise.all([summaryPromise, quotaPromise, liveWaitingPromise]);
        if (res.ok && res.data) {
          if (qRes && qRes.ok && qRes.data && qRes.data.quota) {
            res.data.quota = qRes.data.quota;
          }
          if (!normalizedConvId) res.data.conv = null;

          // Merge live Language Server waitingProjects (authoritative across all projects) with Sidecar list
          const sidecarWait = Array.isArray(res.data.waitingProjects) ? res.data.waitingProjects : [];
          const liveList = liveWait && Array.isArray(liveWait.waitingProjects) ? liveWait.waitingProjects : [];
          const baseList = liveWait && liveWait.summaries ? liveList : sidecarWait;
          const mergedMap = new Map();
          for (const item of baseList) {
            if (item && item.convId) mergedMap.set(item.convId, item);
          }
          if (liveWait && liveWait.summaries) {
            for (const item of sidecarWait) {
              if (item && item.convId && !mergedMap.has(item.convId) && !liveWait.summaries[item.convId]) {
                mergedMap.set(item.convId, item);
              }
            }
          }
          res.data.waitingProjects = Array.from(mergedMap.values());

          if (res.data.conv && normalizedConvId) {
            const matchedWait = mergedMap.get(normalizedConvId);
            if (matchedWait && !res.data.conv.waitState) {
              res.data.conv.waitState = matchedWait.kind || 'review';
            }
            if (!res.data.conv.projectName) {
              const traj = liveWait && liveWait.summaries ? liveWait.summaries[normalizedConvId] : null;
              const tm = traj && traj.trajectoryMetadata && typeof traj.trajectoryMetadata === 'object' ? traj.trajectoryMetadata : {};
              const projId = typeof tm.projectId === 'string' ? tm.projectId : '';
              const wsUris = collectTrajectoryWorkspaceUris(traj);
              res.data.conv.projectName = (matchedWait && matchedWait.projectName) ||
                ((projId || wsUris.length > 0) ? resolveProjectName(projId, wsUris, res.data.conv.title) : '');
            }
          }
          return res.data;
        }
      }
      return getFallbackSummary(normalizedConvId, Boolean(forceRefresh));
    });

    ipcMain.handle('neko-hud:get-breakdown', async (_event, convId) => {
      const normalizedConvId = typeof convId === 'string' ? convId.trim().toLowerCase() : '';
      if (!UUID_RE.test(normalizedConvId)) {
        return {
          id: '',
          currentTokens: 0,
          observedCeiling: 0,
          contextSource: 'none',
          compactCount: 0,
          rounds: 0,
          steps: 0,
          tokPerSec: 0,
          ttftMs: 0,
          cacheHitPct: null,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          serverTokenBreakdown: null,
          categories: [],
          activeSkills: [],
          heaviestSteps: [],
          topFiles: []
        };
      }
      const info = findSidecarServerInfo();
      if (info && info.port) {
        const qs = new URLSearchParams({ id: normalizedConvId });
        if (info.token) qs.set('token', info.token);
        const res = await httpJsonRequest({
          host: info.host || '127.0.0.1',
          port: info.port,
          path: `/api/context-breakdown?${qs.toString()}`,
          headers: info.token ? { 'X-Sidecar-Token': info.token } : {},
          timeoutMs: 2500
        });
        if (res.ok && res.data) return res.data;
      }
      const fb = await getFallbackSummary(normalizedConvId, true);
      return {
        id: fb.conv ? fb.conv.id : convId,
        currentTokens: fb.conv ? fb.conv.contextTokens : 0,
        observedCeiling: fb.conv ? fb.conv.contextMaxTokens : 0,
        contextSource: fb.conv ? fb.conv.contextSource : 'server',
        compactCount: fb.conv ? fb.conv.compactions : 0,
        rounds: fb.conv ? fb.conv.rounds : 0,
        steps: fb.conv ? fb.conv.steps : 0,
        tokPerSec: fb.conv ? fb.conv.tokPerSec : 0,
        ttftMs: fb.conv ? fb.conv.ttftMs : 0,
        cacheHitPct: fb.conv ? fb.conv.cacheHitPct : null,
        totalInputTokens: fb.conv ? fb.conv.inputTokens : 0,
        totalCacheReadTokens: fb.conv ? fb.conv.cacheReadTokens : 0,
        totalOutputTokens: fb.conv ? fb.conv.outputTokens : 0,
        totalTokens: fb.conv ? fb.conv.totalTokens : 0,
        serverTokenBreakdown: fb.conv ? fb.conv.tokenBreakdown : null,
        categories: [],
        activeSkills: [],
        heaviestSteps: [],
        topFiles: []
      };
    });

    ipcMain.handle('neko-hud:list-conversations', async () => {
      const info = findSidecarServerInfo();
      if (info && info.port) {
        const qs = info.token ? `?token=${encodeURIComponent(info.token)}` : '';
        const res = await httpJsonRequest({
          host: info.host || '127.0.0.1',
          port: info.port,
          path: `/api/status${qs}`,
          headers: info.token ? { 'X-Sidecar-Token': info.token } : {},
          timeoutMs: 1500
        });
        if (res.ok && res.data && Array.isArray(res.data.conversations)) {
          return res.data.conversations.slice(0, 12).map((c) => ({
            id: c.id,
            title: c.title || c.firstPrompt || c.id.slice(0, 8),
            rounds: c.rounds || c.promptCount || 0,
            steps: c.steps || 0,
            contextPct: c.contextRatio !== null ? Math.round(c.contextRatio * 1000) / 10 : null,
            totalTokens: c.totalTokens || 0,
            cacheHitPct: c.cacheHitPct
          }));
        }
      }
      return [];
    });

    ipcMain.handle('neko-hud:get-daily-tokens', async (_event, days = 14, forceRefresh = false) => {
      const nDays = Math.max(1, Math.min(366, parseInt(String(days || '14'), 10) || 14));
      const info = findSidecarServerInfo();
      if (info && info.port) {
        const qs = new URLSearchParams({ days: String(nDays) });
        if (forceRefresh) qs.set('refresh', '1');
        if (info.token) qs.set('token', info.token);
        const res = await httpJsonRequest({
          host: info.host || '127.0.0.1',
          port: info.port,
          path: `/api/daily-tokens?${qs.toString()}`,
          headers: info.token ? { 'X-Sidecar-Token': info.token } : {},
          timeoutMs: 3000
        });
        if (res.ok && res.data && res.data.ok) return res.data;
      }
      return getFallbackDailyTokens(nDays, Boolean(forceRefresh));
    });
  } catch (err) {
    try { console.error('[Gemini-Neko-HUD] main bridge error:', err); } catch {}
  }
})();
// ===== GEMINI_NEKO_HUD_END =====
