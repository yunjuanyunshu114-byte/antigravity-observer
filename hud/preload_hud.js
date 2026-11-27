// ===== GEMINI_NEKO_HUD_BEGIN =====
(function () {
  try {
    if (window.top !== window || globalThis.__GEMINI_NEKO_PRELOAD_HUD__) return;
    globalThis.__GEMINI_NEKO_PRELOAD_HUD__ = true;

    const { ipcRenderer } = require('electron');

    const IDS = {
      style: 'gemini-neko-hud-style',
      stats: 'gemini-neko-stats-bar',
      petRoot: 'gemini-neko-pet-root',
      modal: 'gemini-neko-observer-modal',
      dailyModal: 'gemini-neko-daily-modal'
    };

    const PAT_CURSOR_SVG = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 28 28"><path d="M12.5 4.2c-.9 0-1.6.7-1.6 1.6v6.7l-.9-.9c-.7-.7-1.8-.7-2.4 0-.7.7-.6 1.8.1 2.4l4.1 4.2c1.1 1.1 2.5 1.8 4.1 1.8h2.6c2.7 0 4.9-2.2 4.9-4.9V9.8c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v1.6h-.5V7.1c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v3.6h-.5V5.8c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6v4.9h-.5V5.8c0-.9-.7-1.6-1.6-1.6z" fill="#fff" stroke="#3b2d5e" stroke-width="1.5" stroke-linejoin="round"/></svg>`
    );

    const BUILTIN_DIALOGUES = [
      '好猫猫... ♥',
      '好模型... ↓',
      'token 自由喵～',
      '今天也要一起写厉害的代码喵！',
      'Gemini 5h 还有 {quota_5h}% 呢，放心使唤本喵～',
      '上下文才占 {ctx_pct}%，本喵还很有精神喵！',
      '本对话已用 {tokens} token 啦，真能聊喵～',
      '吃饱大米就继续干活喵！',
      '不知道用户有什么用…反正本喵很可爱喵！',
      '别戳太用力啦……会变笨的喵 ><'
    ];

    const CSS = `
/* Antigravity Observer In-Window HUD + Gemini Catgirl Corner Widget */
#${IDS.stats} {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 6px 9px;
  width: fit-content;
  max-width: calc(100% - 12px);
  height: 15px;
  min-height: 15px;
  margin: 0 auto -5px;
  padding: 0 7px;
  font-size: 10.5px;
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  color: var(--muted-foreground, #8e929b);
  user-select: none;
  cursor: pointer;
  border-radius: 999px;
  transition: background 0.16s ease, color 0.16s ease;
  -webkit-app-region: no-drag;
}
#${IDS.stats}:hover {
  color: var(--foreground, #e5e7eb);
  background: color-mix(in srgb, var(--foreground, #888) 7%, transparent);
}
#${IDS.stats} .gn-seg {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
#${IDS.stats} .gn-ico {
  width: 11px;
  height: 11px;
  opacity: 0.78;
  flex-shrink: 0;
}
#${IDS.stats} .gn-dot-sep {
  opacity: 0.45;
  margin: 0 1px;
}
#${IDS.stats} .gn-compact-pill {
  font-size: 9.5px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.16);
  color: #f59e0b;
  font-weight: 600;
}

.gn-bar-row {
  margin-bottom: 6px;
}
.gn-bar-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  margin-bottom: 3px;
}
.gn-bar-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground, #fff) 10%, transparent);
  overflow: hidden;
}
.gn-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.25s ease, background 0.25s ease;
}
.gn-kv-k {
  font-size: 10px;
  color: var(--muted-foreground, #94a3b8);
}
.gn-kv-v {
  font-size: 12px;
  font-weight: 700;
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}
.gn-chip {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  border: 1px solid color-mix(in srgb, var(--border, #ffffff24) 90%, transparent);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.gn-chip:hover {
  border-color: rgba(139, 92, 246, 0.65);
  background: rgba(139, 92, 246, 0.12);
}
.gn-chip.is-active {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

/* ---- Bottom-Right Gemini Catgirl Corner Widget ---- */
#${IDS.petRoot} {
  position: fixed;
  z-index: 2147482800;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  -webkit-app-region: no-drag;
  pointer-events: none;
  transition: left 0.22s cubic-bezier(0.22, 1, 0.36, 1), top 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
#${IDS.petRoot}.is-dragging,
#${IDS.petRoot}.is-resizing {
  transition: none !important;
}
#${IDS.petRoot} * {
  box-sizing: border-box;
  -webkit-app-region: no-drag;
}
#${IDS.petRoot},
#${IDS.petRoot}:focus,
#${IDS.petRoot}:focus-visible,
#${IDS.petRoot}:focus-within,
#${IDS.petRoot} *,
#${IDS.petRoot} *:focus,
#${IDS.petRoot} *:focus-visible,
#${IDS.petRoot} *:focus-within {
  outline: none !important;
  outline-width: 0 !important;
  outline-style: none !important;
  outline-color: transparent !important;
  -webkit-focus-ring-color: transparent !important;
  -webkit-tap-highlight-color: transparent !important;
}
#${IDS.petRoot} .gn-stage,
#${IDS.petRoot} .gn-avatar-btn,
#${IDS.petRoot} .gn-avatar-btn:focus,
#${IDS.petRoot} .gn-avatar-btn:focus-visible,
#${IDS.petRoot} .gn-frame {
  border: 0 !important;
  box-shadow: none !important;
}
#${IDS.petRoot} .gn-stage {
  position: relative;
  pointer-events: auto;
  width: var(--gn-size, 112px);
  height: var(--gn-size, 112px);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}
#${IDS.petRoot}.is-left .gn-stage {
  justify-content: flex-start;
}
#${IDS.petRoot}.is-top .gn-stage {
  align-items: flex-start;
}

/* Avatar Q-Elastic Wrapper & Frames */
#${IDS.petRoot} .gn-avatar-btn {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  outline: none;
  cursor: url("data:image/svg+xml,${PAT_CURSOR_SVG}") 13 9, pointer;
  touch-action: none;
  transform-origin: 50% 100%;
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease;
  filter: drop-shadow(0 4px 12px rgba(15, 13, 38, 0.28));
}
#${IDS.petRoot}.is-top .gn-avatar-btn {
  transform-origin: 50% 0%;
}
#${IDS.petRoot} .gn-avatar-btn:hover {
  filter: drop-shadow(0 6px 16px rgba(109, 40, 217, 0.34));
}
#${IDS.petRoot}.is-dragging .gn-avatar-btn {
  cursor: grabbing;
  transform: scale(1.04) rotate(-2deg);
}
#${IDS.petRoot} .gn-avatar-btn.is-pressed {
  transform: scaleX(1.06) scaleY(0.87) !important;
  transition: transform 0.07s ease-out !important;
}
#${IDS.petRoot} .gn-avatar-flip {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.26s ease;
  pointer-events: none;
}
#${IDS.petRoot}.is-left .gn-avatar-flip {
  transform: scaleX(-1);
}
#${IDS.petRoot} .gn-avatar-anim {
  width: 100%;
  height: 100%;
  position: relative;
  pointer-events: none;
  animation: gnNekoFloat 4.4s ease-in-out infinite;
}
#${IDS.petRoot}[data-pose="eat"] .gn-avatar-anim {
  animation: gnNekoEat 0.68s ease-in-out infinite;
}
#${IDS.petRoot}[data-pose="xd"] .gn-avatar-anim {
  animation: gnNekoPoke 0.38s ease-out;
}
#${IDS.petRoot}[data-pose="grin"] .gn-avatar-anim {
  animation: gnNekoGrin 0.55s ease-in-out infinite;
}
#${IDS.petRoot}[data-pose="wait"] .gn-avatar-anim {
  animation: gnNekoWait 0.9s ease-in-out infinite;
}
@keyframes gnNekoFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-2.5px); }
}
@keyframes gnNekoEat {
  0%, 100% { transform: translateY(0px) scale(1, 1); }
  35% { transform: translateY(1px) scale(1.02, 0.98); }
  70% { transform: translateY(-2px) scale(0.99, 1.02); }
}
@keyframes gnNekoPoke {
  0% { transform: scale(1.04, 0.94) rotate(-2deg); }
  45% { transform: scale(0.97, 1.04) rotate(2deg); }
  100% { transform: scale(1, 1) rotate(0deg); }
}
@keyframes gnNekoGrin {
  0%, 100% { transform: translateY(0px) rotate(-1deg); }
  50% { transform: translateY(-3px) rotate(1.5deg); }
}
@keyframes gnNekoWait {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-3.5px) rotate(-1.6deg); }
  50% { transform: translateY(0px) rotate(0deg); }
  75% { transform: translateY(-2.5px) rotate(1.6deg); }
}

#${IDS.petRoot} .gn-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom right;
  opacity: 0;
  pointer-events: none;
  -webkit-user-drag: none;
  user-select: none;
}
#${IDS.petRoot} .gn-frame.is-active {
  opacity: 1;
}

/* ---- SVG Oval Thought Bubble (Left-Click 3-Step Flow) ---- */
#${IDS.petRoot} .gn-thought-wrap {
  position: absolute;
  bottom: calc(100% - 4px);
  right: 12px;
  width: min(calc(222px * var(--gn-bubble-scale, 1)), calc(100vw - 24px));
  height: calc(152px * var(--gn-bubble-scale, 1));
  pointer-events: none;
  opacity: 0;
  transform: translateY(8px) scale(0.92);
  transform-origin: 76% 96%;
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1), width 0.16s ease, height 0.16s ease;
  z-index: 9;
}
#${IDS.petRoot}.is-left .gn-thought-wrap {
  right: auto;
  left: 12px;
  transform-origin: 24% 96%;
}
#${IDS.petRoot}.is-top .gn-thought-wrap {
  bottom: auto;
  top: calc(100% - 4px);
  transform: translateY(-8px) scale(0.92);
  transform-origin: 76% 4%;
}
#${IDS.petRoot}.is-top.is-left .gn-thought-wrap {
  transform-origin: 24% 4%;
}
#${IDS.petRoot}.is-bubble-open .gn-thought-wrap {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}
#${IDS.petRoot}.is-panel-open .gn-thought-wrap {
  opacity: 0 !important;
  pointer-events: none !important;
}
#${IDS.petRoot}.is-bubble-passthrough .gn-thought-wrap,
#${IDS.petRoot}.is-bubble-passthrough .gn-thought-wrap *,
#${IDS.petRoot}.is-bubble-passthrough .gn-thought-hit {
  pointer-events: none !important;
  cursor: default !important;
}
#${IDS.petRoot} .gn-thought-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 8px 20px rgba(15, 23, 42, 0.22));
  transition: transform 0.25s ease;
}
#${IDS.petRoot}.is-left .gn-thought-svg {
  transform: scaleX(-1);
}
#${IDS.petRoot}.is-top .gn-thought-svg {
  transform: scaleY(-1);
}
#${IDS.petRoot}.is-top.is-left .gn-thought-svg {
  transform: scale(-1, -1);
}
#${IDS.petRoot} .gn-thought-hit {
  position: absolute;
  left: 8%;
  top: 5%;
  width: 84%;
  height: 65%;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: calc(8px * var(--gn-bubble-scale, 1)) calc(18px * var(--gn-bubble-scale, 1));
  overflow: hidden;
  transition: opacity 0.16s ease;
}
#${IDS.petRoot}.is-top .gn-thought-hit {
  top: 30%;
}
#${IDS.petRoot} .gn-thought-hit.is-fading {
  opacity: 0;
}
.gn-th-label {
  font-size: calc(11px * var(--gn-bubble-scale, 1));
  font-weight: 700;
  color: #3b4b8c;
  line-height: 1.2;
}
.gn-th-hero {
  font-size: calc(21px * var(--gn-bubble-scale, 1));
  font-weight: 900;
  line-height: 1.1;
  margin: 1px 0 2px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.gn-th-sub {
  font-size: calc(10px * var(--gn-bubble-scale, 1));
  font-weight: 600;
  color: #5b6b88;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}
.gn-th-line {
  font-size: calc(13px * var(--gn-bubble-scale, 1));
  font-weight: 800;
  color: #33418c;
  line-height: 1.35;
  word-break: break-word;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
#${IDS.petRoot}.is-review-alert .gn-thought-svg ellipse {
  stroke: #d97706;
}
.gn-th-proj {
  font-size: calc(14px * var(--gn-bubble-scale, 1));
  font-weight: 900;
  color: #b45309;
  line-height: 1.25;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gn-th-hint {
  margin-top: 3px;
  font-size: calc(9px * var(--gn-bubble-scale, 1));
  color: #94a3b8;
  font-weight: 600;
}

/* ---- Right-Click Card (Image 4) & Standalone Settings Popover ---- */
#${IDS.petRoot} .gn-panel {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 8px;
  width: 306px;
  max-width: calc(100vw - 20px);
  max-height: min(76vh, 540px);
  overflow-y: auto;
  padding: 11px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--card, #141724) 96%, #121526);
  color: var(--foreground, #f8fafc);
  border: 1px solid rgba(167, 139, 250, 0.38);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.44);
  backdrop-filter: blur(16px);
  z-index: 12;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(8px) scale(0.97);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
}
#${IDS.petRoot}.is-left .gn-panel {
  right: auto;
  left: 8px;
}
#${IDS.petRoot}.is-top .gn-panel {
  bottom: auto;
  top: calc(100% + 6px);
  transform: translateY(-8px) scale(0.97);
}
#${IDS.petRoot}.is-panel-open .gn-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.gn-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.12)) 85%, transparent);
}
.gn-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 800;
  min-width: 0;
}
.gn-state-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.18);
  color: color-mix(in srgb, #8b5cf6 55%, var(--foreground, #e9d5ff));
  border: 1px solid rgba(139, 92, 246, 0.38);
  white-space: nowrap;
}
.gn-state-tag.is-eat {
  background: rgba(245, 158, 11, 0.18);
  color: color-mix(in srgb, #f59e0b 65%, var(--foreground, #fef3c7));
  border-color: rgba(245, 158, 11, 0.42);
}
.gn-state-tag.is-xd {
  background: rgba(236, 72, 153, 0.18);
  color: color-mix(in srgb, #ec4899 65%, var(--foreground, #fce7f3));
  border-color: rgba(236, 72, 153, 0.42);
}
.gn-state-tag.is-grin {
  background: rgba(16, 185, 129, 0.18);
  color: color-mix(in srgb, #10b981 65%, var(--foreground, #d1fae5));
  border-color: rgba(16, 185, 129, 0.42);
}
.gn-state-tag.is-wait {
  background: rgba(245, 158, 11, 0.22);
  color: color-mix(in srgb, #d97706 72%, var(--foreground, #fef3c7));
  border-color: rgba(217, 119, 6, 0.5);
}
.gn-card-sec {
  margin-top: 9px;
}
.gn-card-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted-foreground, #94a3b8);
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.gn-kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.gn-kv {
  padding: 6px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground, #fff) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.1)) 85%, transparent);
}
.gn-sub-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 7px;
  margin-top: 4px;
  font-size: 10px;
  color: var(--muted-foreground, #94a3b8);
}
.gn-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.gn-btn {
  flex: 1 1 auto;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.18)) 90%, transparent);
  background: color-mix(in srgb, var(--foreground, #fff) 7%, transparent);
  color: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  transition: border-color 0.14s ease, background 0.14s ease;
}
.gn-btn:hover {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.16);
}
.gn-btn-primary {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: #fff;
  border-color: transparent;
}
.gn-btn-primary:hover {
  filter: brightness(1.08);
}
.gn-gh-wrap {
  margin-top: 9px;
  padding: 8px 6px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--foreground, #fff) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.1)) 85%, transparent);
}
.gn-gh-grid-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
}
.gn-gh-cal-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.gn-gh-months {
  position: relative;
  height: 13px;
  font-size: 9.5px;
  color: var(--muted-foreground, #94a3b8);
  line-height: 13px;
  margin-bottom: 3px;
}
.gn-gh-month {
  position: absolute;
  top: 0;
  white-space: nowrap;
}
.gn-gh-weekdays {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  gap: 2px;
  width: 14px;
  flex-shrink: 0;
  font-size: 9px;
  line-height: 11px;
  color: var(--muted-foreground, #94a3b8);
  text-align: right;
  padding-right: 1px;
  padding-top: 16px;
}
.gn-gh-weeks {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.gn-gh-col {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  gap: 2px;
}
.gn-gh-cell {
  width: 11px;
  height: 11px;
  border-radius: 2.5px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--foreground, #888) 8%, transparent);
  transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
}
.gn-gh-cell.is-future {
  visibility: hidden;
  pointer-events: none;
}
#${IDS.petRoot} .gn-gh-cell:hover,
#${IDS.petRoot} .gn-gh-cell.is-selected {
  border-color: #8b5cf6 !important;
  box-shadow: 0 0 0 1.5px rgba(139, 92, 246, 0.85) !important;
  transform: scale(1.08);
  position: relative;
  z-index: 2;
}
.gn-gh-legend {
  margin-top: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 9.5px;
  color: var(--muted-foreground, #94a3b8);
}
.gn-gh-legend-swatches {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.gn-gh-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  border: 1px solid color-mix(in srgb, var(--foreground, #888) 8%, transparent);
}
.gn-gh-detail {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground, #fff) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.1)) 85%, transparent);
  font-size: 10.5px;
  line-height: 1.45;
}
.gn-set-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.08)) 85%, transparent);
}
.gn-set-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  margin-bottom: 5px;
}
.gn-range {
  width: 100%;
  accent-color: #8b5cf6;
  cursor: pointer;
}
.gn-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.gn-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.gn-text-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,0.22)) 90%, transparent);
  background: color-mix(in srgb, var(--foreground, #fff) 5%, transparent);
  color: inherit;
  font-size: 11px;
  outline: none;
}
.gn-text-input:focus {
  border-color: #8b5cf6;
}
.gn-dialogue-list {
  margin-top: 6px;
  max-height: 92px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.gn-dialogue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground, #fff) 5%, transparent);
  font-size: 10.5px;
}
.gn-dialogue-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gn-del-btn {
  border: 0;
  background: transparent;
  color: var(--muted-foreground, #94a3b8);
  cursor: pointer;
  font-size: 12px;
  padding: 0 3px;
  line-height: 1;
}
.gn-del-btn:hover {
  color: #ef4444;
}

/* Floating Heart / Sparkle Particles */
.gn-particle {
  position: fixed;
  z-index: 2147482950;
  pointer-events: none;
  font-size: 14px;
  font-weight: 700;
  animation: gnParticleRise 0.92s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gnParticleRise {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
  20% { opacity: 1; transform: translate(-50%, -10px) scale(1.12); }
  100% { opacity: 0; transform: translate(-50%, -48px) scale(0.88); }
}

@media (prefers-reduced-motion: reduce) {
  #${IDS.petRoot} .gn-avatar-anim {
    animation: none !important;
  }
}

/* Full Context Observation Modal & Daily Token Modal */
#${IDS.modal},
#${IDS.dailyModal} {
  position: fixed;
  inset: 0;
  z-index: 2147483100;
  background: rgba(9, 11, 20, 0.62);
  backdrop-filter: blur(6px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  -webkit-app-region: no-drag;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
#${IDS.modal}.is-open,
#${IDS.dailyModal}.is-open {
  display: flex;
}
#${IDS.modal} *,
#${IDS.dailyModal} * {
  box-sizing: border-box;
  -webkit-app-region: no-drag;
}
.gn-daily-row {
  padding: 8px 10px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--foreground, #fff) 3%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ffffff12) 85%, transparent);
}
.gn-daily-row + .gn-daily-row {
  margin-top: 7px;
}
.gn-daily-row.is-today {
  border-color: rgba(139, 92, 246, 0.45);
  background: rgba(139, 92, 246, 0.08);
}
.gn-daily-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.gn-daily-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
.gn-daily-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.16);
  color: color-mix(in srgb, var(--foreground, #ddd6fe) 68%, #7c3aed);
}
.gn-daily-bar-wrap {
  margin-top: 6px;
  height: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground, #fff) 8%, transparent);
  overflow: hidden;
  display: flex;
}
.gn-daily-seg {
  height: 100%;
  transition: width 0.22s ease;
}
.gn-daily-sub {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 10px;
  font-size: 10.5px;
  color: var(--muted-foreground, #94a3b8);
}
.gn-daily-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 10.5px;
  color: var(--muted-foreground, #94a3b8);
}
.gn-daily-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 4px;
  vertical-align: middle;
}
.gn-modal-card {
  width: min(760px, 95vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: color-mix(in srgb, var(--card, #141722) 98%, #0f172a);
  color: var(--foreground, #f8fafc);
  border: 1px solid rgba(139, 92, 246, 0.35);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.52);
  overflow: hidden;
  pointer-events: auto;
}
.gn-modal-head {
  flex-shrink: 0;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ffffff18) 85%, transparent);
}
#gn-conv-select option {
  background: var(--card, #181a24);
  color: var(--foreground, #f8fafc);
}
.gn-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 16px 18px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: block;
}
.gn-modal-body > * + * {
  margin-top: 12px;
}
.gn-stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 640px) {
  .gn-stat-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.gn-box {
  padding: 11px 13px;
  border-radius: 11px;
  background: color-mix(in srgb, var(--foreground, #fff) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ffffff15) 90%, transparent);
}
.gn-box-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.gn-row-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 3px 0;
}
.gn-mono {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
`;

    // ---- Formatting helpers ----
    function fmtTok(n) {
      const v = Number(n) || 0;
      if (v <= 0) return '0';
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2).replace(/\.0+$/, '')}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
      return String(Math.round(v));
    }

    function fmtResetCountdown(isoOrMs) {
      const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs || '');
      if (!ms || !Number.isFinite(ms)) return '';
      const diff = Math.max(0, ms - Date.now());
      if (diff <= 0) return '即将重置';
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (days > 0) return `${days}天${hrs % 24}小时后重置`;
      if (hrs > 0) return `${hrs}小时${mins % 60}分后重置`;
      return `${Math.max(1, mins)}分钟后重置`;
    }

    function fmtResetCompact(isoOrMs) {
      const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs || '');
      if (!ms || !Number.isFinite(ms)) return '';
      const diff = Math.max(0, ms - Date.now());
      if (diff <= 0) return '即将重置';
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (days > 0) return `${days}d${hrs % 24}h`;
      if (hrs > 0) return `${hrs}h${mins % 60}m`;
      return `${Math.max(1, mins)}m`;
    }

    function esc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function pctColor(pct, invertForRemaining = false) {
      const val = Number(pct) || 0;
      if (invertForRemaining) {
        if (val <= 15) return '#ef4444';
        if (val <= 35) return '#f59e0b';
        return '#10b981';
      }
      if (val >= 90) return '#ef4444';
      if (val >= 78) return '#f97316';
      if (val >= 62) return '#eab308';
      return '#10b981';
    }

    function isVisibleEl(el) {
      if (!el) return false;
      if (el.isConnected === false) return false;
      if (typeof el.hasAttribute === 'function' && el.hasAttribute('hidden')) return false;
      if (typeof el.getAttribute === 'function' && el.getAttribute('aria-hidden') === 'true') return false;
      if (typeof el.closest === 'function' && el.closest('[hidden], [aria-hidden="true"]')) return false;
      if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
      if (typeof window.getComputedStyle === 'function') {
        try {
          const st = window.getComputedStyle(el);
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
        } catch {}
      }
      return true;
    }

    function queryVisibleAll(selector, root) {
      const scope = root || document;
      if (typeof scope.querySelectorAll === 'function') {
        return Array.from(scope.querySelectorAll(selector)).filter((el) => isVisibleEl(el));
      }
      if (typeof scope.querySelector === 'function') {
        const single = scope.querySelector(selector);
        return single && isVisibleEl(single) ? [single] : [];
      }
      return [];
    }

    function findVisibleEl(selector, root) {
      const list = queryVisibleAll(selector, root);
      return list.length > 0 ? list[0] : null;
    }

    function detectActiveConvId() {
      const locPath = (window.location && window.location.pathname) ? String(window.location.pathname) : '';
      const locHash = (window.location && window.location.hash) ? String(window.location.hash) : '';
      const urlMatch = (`${locPath} ${locHash}`).match(/\/c\/([0-9a-f-]{8,})/i);
      const urlConvId = urlMatch ? urlMatch[1].toLowerCase() : '';
      const docTitle = typeof document.title === 'string' ? document.title.trim() : '';

      const visibleViews = queryVisibleAll('[data-testid="conversation-view"]');
      let activeView = null;
      if (visibleViews.length > 0) {
        activeView = (urlConvId && visibleViews.find((v) => (v.getAttribute('data-cascade-id') || '').trim().toLowerCase() === urlConvId))
          || visibleViews[visibleViews.length - 1];
      }

      if (activeView) {
        const attr = (activeView.getAttribute('data-cascade-id') || '').trim();
        if (!attr || attr === 'conversation') return '';
        if (/^[0-9a-f-]{8,}$/i.test(attr)) {
          const domId = attr.toLowerCase();
          if (!urlConvId && locPath) {
            const hasViewMsg = queryVisibleAll('[data-testid="user-input-step"], [data-testid="planner-response-text"]', activeView).length > 0;
            if (!hasViewMsg && (!docTitle || docTitle === 'Antigravity')) {
              return '';
            }
          }
          return domId;
        }
      }

      const hasAnyVisibleMsg = queryVisibleAll('[data-testid="user-input-step"], [data-testid="planner-response-text"]').length > 0;
      const inputBox = findVisibleEl('[data-testid="agent-input-box"]') || document.querySelector('[data-testid="agent-input-box"]');
      const ancestor = inputBox && typeof inputBox.closest === 'function' ? inputBox.closest('[data-cascade-id]') : null;
      if (ancestor && isVisibleEl(ancestor)) {
        const a = (ancestor.getAttribute('data-cascade-id') || '').trim();
        if (!a || a === 'conversation') return '';
        if (/^[0-9a-f-]{8,}$/i.test(a)) {
          if (!urlConvId && locPath && !hasAnyVisibleMsg && (!docTitle || docTitle === 'Antigravity')) {
            return '';
          }
          return a.toLowerCase();
        }
      }

      if (visibleViews.length === 0 && !hasAnyVisibleMsg && (!docTitle || docTitle === 'Antigravity')) {
        return '';
      }

      return urlConvId;
    }

    function detectDomBusy() {
      return Boolean(document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]'));
    }

    function injectStyles() {
      if (document.getElementById(IDS.style)) return;
      const st = document.createElement('style');
      st.id = IDS.style;
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }

    // ---- HUD State ----
    const REVIEW_BUBBLE_AUTO_HIDE_MS = 4000;
    const hud = {
      prefs: {
        prefsVersion: 2,
        enabled: true,
        showStatsBar: true,
        size: 112,
        bubbleScale: 1,
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
        anchor: { v: 2, hAnchor: 'right', hDist: 0, vAnchor: 'bottom', vDist: 0 },
        patCount: 0,
        customDialogues: [],
        customFrames: { idle: '', eat: '', grin: '', xd: '', wait: '' }
      },
      frames: {},
      defaultFrames: {},
      builtinSkins: { purple: {}, heterochromia: {} },
      soundsB64: {},
      customAudio: null,
      activeConvId: '__init__',
      refreshSeq: 0,
      state: null,
      modalOpen: false,
      modalConvId: '',
      modalBreakdown: null,
      modalConvList: [],
      dailyModalOpen: false,
      dailyDays: 14,
      dailyData: null,
      dailyLoading: false,
      dailyModalSeq: 0,
      pollTimer: null,
      // Pet runtime state
      composing: false,
      bubbleStage: 0, // 0 = closed, 1 = quota & context, 2 = dialogue line, 3 = turn-end quota cost (10s), 4 = review/confirm alert
      currentDialogue: '',
      lastDialogueText: '',
      panelMode: '', // '' | 'card' (Image 4) | 'settings' | 'daily'
      lastCardHeight: 0,
      dailyPanelData: null,
      dailyPanelLoading: false,
      dailyHeatmapSeq: 0,
      dailySelectedDate: '',
      pokeUntil: 0,
      pokeTimer: null,
      celebrateUntil: 0,
      celebrateTimer: null,
      pokeCombo: 0,
      lastPokeAt: 0,
      wasThinking: false,
      turnBaseline: null,
      turnEndTimer: null,
      turnBubbleTimer: null,
      reviewBubbleTimer: null,
      turnSummary: null,
      activeReview: null,
      alertedReviewKeys: new Set(),
      dismissedReviewKeys: new Set(),
      reviewClearGrace: new Map(),
      curPose: 'idle'
    };

    // ---- Web Audio Engine (Pre-decoded IPC buffers + IME guard + Idle Suspend) ----
    const AUDIO_IDLE_MS = 60000;
    const RELEASE_LEAD_MS = 28;
    let audioCtx = null;
    let audioSuspendTimer = null;
    const decodedAudio = Object.create(null);
    const decodingAudio = Object.create(null);
    let lastPressPlayback = { startedAt: 0, duration: 0, key: '' };

    function suspendAudioNow() {
      if (audioSuspendTimer) {
        clearTimeout(audioSuspendTimer);
        audioSuspendTimer = null;
      }
      if (audioCtx && audioCtx.state === 'running') {
        try { audioCtx.suspend(); } catch {}
      }
    }

    function armAudioIdle() {
      if (audioSuspendTimer) clearTimeout(audioSuspendTimer);
      audioSuspendTimer = setTimeout(() => {
        audioSuspendTimer = null;
        suspendAudioNow();
      }, AUDIO_IDLE_MS);
    }

    function getAudioCtx(createIfNeeded = true) {
      if (!hud.prefs.soundEnabled) return null;
      if (!audioCtx && createIfNeeded) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
          audioCtx = new AC({ latencyHint: 'interactive' });
        } catch {
          return null;
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        try { audioCtx.resume(); } catch {}
      }
      if (audioCtx) armAudioIdle();
      return audioCtx;
    }

    function base64ToArrayBuffer(b64) {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes.buffer;
    }

    function decodeSoundKey(key, b64) {
      if (!key || !b64) return Promise.resolve(null);
      if (decodedAudio[key]) return Promise.resolve(decodedAudio[key]);
      if (decodingAudio[key]) return decodingAudio[key];
      const ctx = getAudioCtx(true);
      if (!ctx) return Promise.resolve(null);
      try {
        const rawBuf = base64ToArrayBuffer(b64);
        decodingAudio[key] = new Promise((resolve) => {
          try {
            ctx.decodeAudioData(
              rawBuf,
              (buf) => {
                decodedAudio[key] = buf;
                delete decodingAudio[key];
                resolve(buf);
              },
              () => {
                delete decodingAudio[key];
                resolve(null);
              }
            );
          } catch {
            delete decodingAudio[key];
            resolve(null);
          }
        });
        return decodingAudio[key];
      } catch {
        return Promise.resolve(null);
      }
    }

    function warmActiveSounds() {
      if (!hud.prefs.soundEnabled) return;
      if (hud.composing) return;
      const set = hud.prefs.soundSet || 'boing';
      if (set === 'custom' && hud.customAudio && hud.customAudio.b64) {
        void decodeSoundKey('custom', hud.customAudio.b64);
      } else {
        const activeSet = ['boing', 'nya', 'duck'].includes(set) ? set : 'boing';
        if (hud.soundsB64[`${activeSet}_press`]) void decodeSoundKey(`${activeSet}_press`, hud.soundsB64[`${activeSet}_press`]);
        if (hud.soundsB64[`${activeSet}_release`]) void decodeSoundKey(`${activeSet}_release`, hud.soundsB64[`${activeSet}_release`]);
      }
      if (hud.soundsB64.combo_chime) void decodeSoundKey('combo_chime', hud.soundsB64.combo_chime);
      if (hud.soundsB64.review_alert) void decodeSoundKey('review_alert', hud.soundsB64.review_alert);
    }

    function playOscFallback(kind) {
      const ctx = getAudioCtx(true);
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const vol = Math.max(0, Math.min(1, Number(hud.prefs.volume) || 0.78)) * 0.22;
        if (vol <= 0.001) return;
        if (kind === 'alert') {
          const notes = [880, 1108.73, 1318.51];
          notes.forEach((freq, idx) => {
            const t0 = now + idx * 0.095;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.15);
          });
          return;
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        if (kind === 'press') {
          osc.frequency.setValueAtTime(340, now);
          osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(vol, now + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.065);
        } else {
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(860, now + 0.09);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(vol, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        }
      } catch {}
    }

    function playDecodedBuffer(buf, delaySec = 0) {
      const ctx = getAudioCtx(true);
      if (!ctx || !buf) return false;
      const vol = Math.max(0, Math.min(1, Number(hud.prefs.volume) ?? 0.78));
      if (vol <= 0.001) return true;
      try {
        const gain = ctx.createGain();
        gain.gain.value = vol;
        gain.connect(ctx.destination);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        src.start(delaySec > 0 ? ctx.currentTime + delaySec : 0);
        return true;
      } catch {
        return false;
      }
    }

    function playKeyedSound(key, b64, delaySec = 0, fallbackKind = 'release') {
      if (!hud.prefs.soundEnabled) return;
      const vol = Math.max(0, Math.min(1, Number(hud.prefs.volume) ?? 0.78));
      if (vol <= 0.001) return;
      if (decodedAudio[key]) {
        playDecodedBuffer(decodedAudio[key], delaySec);
        return;
      }
      if (b64) {
        decodeSoundKey(key, b64).then((buf) => {
          if (buf) playDecodedBuffer(buf, 0);
          else playOscFallback(fallbackKind);
        });
        return;
      }
      playOscFallback(fallbackKind);
    }

    function playPressSound() {
      if (!hud.prefs.soundEnabled) return;
      const set = hud.prefs.soundSet || 'boing';
      if (set === 'custom') return;
      const key = `${set}_press`;
      const b64 = hud.soundsB64[key];
      const buf = decodedAudio[key];
      if (buf) {
        lastPressPlayback = { startedAt: performance.now(), duration: buf.duration, key };
        playDecodedBuffer(buf, 0);
      } else {
        lastPressPlayback = { startedAt: performance.now(), duration: 0.06, key };
        playKeyedSound(key, b64, 0, 'press');
      }
    }

    function playPokeReleaseSound(isCombo = false) {
      if (!hud.prefs.soundEnabled) return;
      if (isCombo && hud.soundsB64.combo_chime) {
        playKeyedSound('combo_chime', hud.soundsB64.combo_chime, 0.02, 'release');
        return;
      }
      const set = hud.prefs.soundSet || 'boing';
      if (set === 'custom' && hud.customAudio && hud.customAudio.b64) {
        playKeyedSound('custom', hud.customAudio.b64, 0, 'release');
        return;
      }
      const activeSet = ['boing', 'nya', 'duck'].includes(set) ? set : 'boing';
      const key = `${activeSet}_release`;
      const b64 = hud.soundsB64[key];
      let delaySec = 0;
      if (lastPressPlayback.startedAt > 0 && lastPressPlayback.duration > 0) {
        const elapsed = (performance.now() - lastPressPlayback.startedAt) / 1000;
        const remain = lastPressPlayback.duration - elapsed;
        if (remain > 0.005) {
          delaySec = Math.max(0, remain - RELEASE_LEAD_MS / 1000);
        }
      }
      playKeyedSound(key, b64, delaySec, 'release');
    }

    function playCompletionSound() {
      if (!hud.prefs.soundEnabled || !hud.prefs.completionSound) return;
      if (hud.soundsB64.combo_chime) {
        playKeyedSound('combo_chime', hud.soundsB64.combo_chime, 0, 'release');
      }
    }

    function playReviewAlertSound() {
      if (!hud.prefs.soundEnabled || hud.prefs.reviewAlertSound === false) return;
      playKeyedSound('review_alert', hud.soundsB64.review_alert, 0, 'alert');
    }

    // ---- Shared Conversation Sync ----
    function syncActiveConversation() {
      const nextId = detectActiveConvId();
      if (nextId === hud.activeConvId) return false;
      const prevId = hud.activeConvId;
      hud.activeConvId = nextId;
      hud.refreshSeq += 1;
      if (hud.state) {
        hud.state = { ...hud.state, conv: null };
      }
      hud.modalConvId = nextId;
      hud.modalBreakdown = null;
      hud.wasThinking = false;
      hud.turnBaseline = null;
      if (hud.turnEndTimer) {
        clearTimeout(hud.turnEndTimer);
        hud.turnEndTimer = null;
      }
      updateStatsBar();
      updatePetWidget();
      if (hud.modalOpen) renderObserverModal();
      if (prevId !== '__init__') {
        refreshTelemetry(true);
      }
      return true;
    }

    function savePrefsPatch(patch) {
      hud.prefs = { ...hud.prefs, ...patch };
      applyPetPositionFromAnchor();
      updateStatsBar();
      updatePetWidget();
      return ipcRenderer.invoke('neko-hud:save-prefs', patch).then((saved) => {
        if (saved && typeof saved === 'object') {
          hud.prefs = { ...hud.prefs, ...saved };
        }
        return hud.prefs;
      }).catch(() => hud.prefs);
    }

    // ---- Component A: Input Stats Bar ----
    function mountStatsBarOnly() {
      if (hud.prefs.showStatsBar === false) {
        const old = document.getElementById(IDS.stats);
        if (old) old.remove();
        return false;
      }
      const inputBox = findVisibleEl('[data-testid="agent-input-box"]') || document.querySelector('[data-testid="agent-input-box"]');
      if (!inputBox || !inputBox.parentElement) return false;
      let bar = document.getElementById(IDS.stats);
      if (!bar) {
        bar = document.createElement('div');
        bar.id = IDS.stats;
        bar.title = '点击打开反重力上下文观察窗口';
        bar.addEventListener('click', (e) => {
          e.stopPropagation();
          openObserverModal();
        });
        inputBox.insertAdjacentElement('afterend', bar);
        return true;
      }
      if (bar.previousElementSibling !== inputBox) {
        inputBox.insertAdjacentElement('afterend', bar);
        return true;
      }
      return false;
    }

    function ensureStatsBar() {
      const created = mountStatsBarOnly();
      if (created || document.getElementById(IDS.stats)) {
        updateStatsBar();
      }
    }

    function updateStatsBar() {
      const bar = document.getElementById(IDS.stats);
      if (!bar) return;
      const conv = hud.state && hud.state.conv;
      const r = 5;
      const c = 2 * Math.PI * r;
      if (!conv) {
        const emptyHtml = `
          <span class="gn-seg">
            <svg class="gn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 14l4-4"/><circle cx="12" cy="14" r="1.5"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
            <span>0 轮 0 步</span>
          </span>
          <span class="gn-seg">
            <svg class="gn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>
            <span>0 tok</span>
            <span class="gn-dot-sep">·</span>
            <span>新对话</span>
          </span>
          <span class="gn-seg">
            <svg class="gn-ico" viewBox="0 0 16 16" style="width:11px;height:11px;">
              <circle cx="8" cy="8" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.24" stroke-width="2.2"/>
            </svg>
            <span>0%</span>
          </span>
        `;
        const emptyTip = '当前为新对话或暂无会话记录\n点击打开上下文观察窗口';
        if (bar.title !== emptyTip) bar.title = emptyTip;
        if (bar.innerHTML !== emptyHtml) bar.innerHTML = emptyHtml;
        return;
      }
      const rounds = conv.rounds || 0;
      const steps = conv.steps || 0;
      const speed = conv.tokPerSec > 0 ? `${conv.tokPerSec} tok/s` : '— tok/s';
      const totalStr = `${fmtTok(conv.totalTokens)} tok`;
      const hitStr = (conv.cacheHitPct !== null && conv.cacheHitPct !== undefined) ? `${conv.cacheHitPct}%` : '—';
      const ctxPct = conv.contextPct !== null && conv.contextPct !== undefined ? Math.round(conv.contextPct) : null;
      const ringColor = ctxPct !== null ? pctColor(ctxPct, false) : '#94a3b8';
      const fill = ctxPct !== null ? Math.max(0.04, Math.min(1, ctxPct / 100)) * c : 0;

      const tip = [
        `模型: ${conv.modelLabel || '未知'}`,
        `上下文: ${fmtTok(conv.contextTokens)} / ${conv.contextMaxTokens ? fmtTok(conv.contextMaxTokens) : '?'} (${conv.contextPct ?? '?'}%)`,
        `总用量: 新输入 ${fmtTok(conv.inputTokens)} · 缓存读取 ${fmtTok(conv.cacheReadTokens)} · 输出 ${fmtTok(conv.outputTokens)}`,
        conv.ttftMs ? `首字延迟 TTFT: ${(conv.ttftMs / 1000).toFixed(2)}s` : '',
        '点击打开上下文观察窗口'
      ].filter(Boolean).join('\n');
      if (bar.title !== tip) bar.title = tip;

      const nextHtml = `
        <span class="gn-seg">
          <svg class="gn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 14l4-4"/><circle cx="12" cy="14" r="1.5"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
          <span>${rounds} 轮 ${steps} 步</span>
          <span class="gn-dot-sep">·</span>
          <span>${speed}</span>
        </span>
        <span class="gn-seg">
          <svg class="gn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>
          <span>${totalStr}</span>
          <span class="gn-dot-sep">·</span>
          <span>缓存命中 ${hitStr}</span>
        </span>
        <span class="gn-seg">
          <svg class="gn-ico" viewBox="0 0 16 16" style="width:11px;height:11px;">
            <circle cx="8" cy="8" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.24" stroke-width="2.2"/>
            ${ctxPct !== null ? `<circle cx="8" cy="8" r="${r}" fill="none" stroke="${ringColor}" stroke-width="2.2" stroke-dasharray="${fill.toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)" stroke-linecap="round"/>` : ''}
          </svg>
          <span style="color:${ringColor};font-weight:600;">${ctxPct !== null ? ctxPct + '%' : fmtTok(conv.contextTokens)}</span>
          ${conv.compactions > 0 ? `<span class="gn-compact-pill">压缩 ${conv.compactions}次</span>` : ''}
        </span>
      `;
      if (bar.innerHTML !== nextHtml) bar.innerHTML = nextHtml;
    }

    // ---- Component C: Bottom-Right Gemini Catgirl Corner Widget ----
    function computeAnchorFromRect(left, top, size) {
      const vw = Math.max(200, window.innerWidth || 1280);
      const vh = Math.max(200, window.innerHeight || 800);
      const leftDist = Math.max(0, left);
      const rightDist = Math.max(0, vw - (left + size));
      const topDist = Math.max(0, top);
      const bottomDist = Math.max(0, vh - (top + size));
      return {
        v: 2,
        hAnchor: leftDist <= rightDist ? 'left' : 'right',
        hDist: Math.round(Math.min(leftDist, rightDist)),
        vAnchor: topDist <= bottomDist ? 'top' : 'bottom',
        vDist: Math.round(Math.min(topDist, bottomDist))
      };
    }

    function anchorToLeftTop(anchor, size) {
      const vw = Math.max(200, window.innerWidth || 1280);
      const vh = Math.max(200, window.innerHeight || 800);
      const a = anchor || { v: 2, hAnchor: 'right', hDist: 0, vAnchor: 'bottom', vDist: 0 };
      const maxLeft = Math.max(0, vw - size);
      const maxTop = Math.max(0, vh - size);
      const hDist = Math.min(Math.max(0, Number(a.hDist) || 0), maxLeft);
      const vDist = Math.min(Math.max(0, Number(a.vDist) || 0), maxTop);
      return {
        left: a.hAnchor === 'left' ? hDist : Math.max(0, vw - size - hDist),
        top: a.vAnchor === 'top' ? vDist : Math.max(0, vh - size - vDist)
      };
    }

    function updateOrientationClasses(left, top, size) {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      const vw = Math.max(200, window.innerWidth || 1280);
      const vh = Math.max(200, window.innerHeight || 800);
      const cx = left + size / 2;
      const cy = top + size / 2;
      root.classList.toggle('is-left', cx < vw * 0.5);
      root.classList.toggle('is-top', cy < vh * 0.42);
    }

    function setPetLeftTop(left, top) {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      const sz = hud.prefs.size || 112;
      const vw = Math.max(200, window.innerWidth || 1280);
      const vh = Math.max(200, window.innerHeight || 800);
      const clampedL = Math.min(Math.max(0, Math.round(left)), Math.max(0, vw - sz));
      const clampedT = Math.min(Math.max(0, Math.round(top)), Math.max(0, vh - sz));
      root.style.left = `${clampedL}px`;
      root.style.top = `${clampedT}px`;
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      updateOrientationClasses(clampedL, clampedT, sz);
      return { left: clampedL, top: clampedT };
    }

    function applyPetPositionFromAnchor() {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      const sz = Math.max(64, Math.min(200, Number(hud.prefs.size) || 112));
      const bs = Math.max(0.65, Math.min(1.6, Number(hud.prefs.bubbleScale) || 1));
      root.style.setProperty('--gn-size', `${sz}px`);
      root.style.setProperty('--gn-bubble-scale', String(bs));
      root.style.opacity = String(Math.max(0.35, Math.min(1, Number(hud.prefs.opacity) ?? 1)));
      const pos = anchorToLeftTop(hud.prefs.anchor, sz);
      setPetLeftTop(pos.left, pos.top);
    }

    function isThinkingNow() {
      const conv = hud.state && hud.state.conv;
      return detectDomBusy() || Boolean(conv && conv.isThinking);
    }

    function detectDomProjectName() {
      const candidates = [
        '[data-testid="project-header"]',
        '[data-testid="project-selector-trigger"]'
      ];
      for (const sel of candidates) {
        const el = findVisibleEl(sel);
        const txt = el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
        if (txt && !/^(Select|Choose|Projects?|选择项目|切换项目)$/i.test(txt)) {
          return txt.slice(0, 60);
        }
      }
      const conv = hud.state && hud.state.conv;
      if (conv && conv.projectName) return String(conv.projectName).trim();
      if (conv && conv.title) return String(conv.title).trim();
      const dt = typeof document.title === 'string' ? document.title.replace(/\s*[-—–|·]\s*Antigravity.*$/i, '').trim() : '';
      return (dt && !/^Antigravity$/i.test(dt)) ? dt : '当前项目';
    }

    function detectDomPendingReview() {
      const activeConvId = detectActiveConvId();
      const convKey = activeConvId || 'win';
      const convTitle = (hud.state && hud.state.conv && hud.state.conv.title) ? String(hud.state.conv.title).trim() : '';
      const projName = detectDomProjectName();

      const makeHit = (kind, label) => ({
        key: `dom:${convKey}:${kind}`,
        convId: activeConvId || '',
        projectName: projName,
        convTitle,
        kind,
        label,
        source: 'dom',
        extraCount: 0
      });

      if (findVisibleEl('[data-testid="inline-permission-card"]')) {
        return makeHit('permission', '权限/命令待确认');
      }
      if (findVisibleEl('[data-testid="ask-question-header-text"], [data-testid="ask-question-option"]')) {
        return makeHit('question', '提问等待主人回答');
      }
      if (findVisibleEl('[data-testid="subagent-approve"]')) {
        return makeHit('permission', '子代理请求批准');
      }
      if (findVisibleEl('[data-testid="interaction-takeover-card"]')) {
        return makeHit('review', '需要主人接管确认');
      }
      const inlineCards = queryVisibleAll('[data-testid="inline-card"]');
      for (const card of inlineCards) {
        if (findVisibleEl('[data-testid="inline-card-submit"], [data-testid="inline-card-next"]', card)) {
          return makeHit('review', '审查需求待确认');
        }
      }
      if (findVisibleEl('[data-testid="webview-prompt-card"], [data-testid="declared-permissions-modal"], [data-testid="computer-permissions-card"], [data-testid="external-link-confirm-modal"], [data-testid="toast-permission"]')) {
        return makeHit('permission', '操作权限待确认');
      }
      const reviewContainers = queryVisibleAll('[data-testid="artifact-card"], [data-testid="bubble-artifact-card"], [data-testid="changed-files-card"]');
      for (const box of reviewContainers) {
        const btns = queryVisibleAll('button', box);
        for (const btn of btns) {
          const txt = String(btn.textContent || '').trim();
          if (/^(Proceed|Approve|Allow|继续|批准|允许|确认)(\s*•.*)?$/i.test(txt)) {
            return makeHit('review', '方案/改动待审查确认');
          }
        }
      }
      return null;
    }

    function isGraceSuppressed(item) {
      if (!item) return false;
      const now = Date.now();
      for (const [k, exp] of hud.reviewClearGrace.entries()) {
        if (exp <= now) hud.reviewClearGrace.delete(k);
      }
      if (item.key && (hud.reviewClearGrace.get(item.key) || 0) > now) return true;
      if (item.convId && (hud.reviewClearGrace.get(`conv:${item.convId}`) || 0) > now) return true;
      return false;
    }

    function resolveActiveReview() {
      if (hud.prefs.reviewAlertEnabled === false) return null;
      const activeConvId = detectActiveConvId();
      const domHit = detectDomPendingReview();
      const rpcList = (hud.state && Array.isArray(hud.state.waitingProjects)) ? hud.state.waitingProjects : [];

      const byConv = new Map();
      for (const raw of rpcList) {
        if (!raw || !raw.convId) continue;
        const item = {
          key: raw.key || `${raw.convId}:${raw.stepIndex ?? 0}`,
          convId: String(raw.convId).trim().toLowerCase(),
          projectName: String(raw.projectName || raw.convTitle || '当前项目').trim(),
          convTitle: String(raw.convTitle || '').trim(),
          kind: raw.kind || 'review',
          label: raw.label || '审查需求待确认',
          source: 'rpc',
          extraCount: 0
        };
        if (!isGraceSuppressed(item)) {
          byConv.set(item.convId, item);
        }
      }

      if (domHit && !isGraceSuppressed(domHit)) {
        const domKeyId = domHit.convId || '__dom__';
        const rpcExisting = domHit.convId ? byConv.get(domHit.convId) : null;
        if (rpcExisting) {
          byConv.set(domKeyId, {
            ...rpcExisting,
            kind: domHit.kind || rpcExisting.kind,
            label: domHit.label || rpcExisting.label,
            projectName: rpcExisting.projectName || domHit.projectName,
            source: 'both'
          });
        } else {
          byConv.set(domKeyId, domHit);
        }
      }

      const uniqueConvs = Array.from(byConv.values());
      if (uniqueConvs.length === 0) return null;

      let chosen = null;
      if (activeConvId && byConv.has(activeConvId)) {
        chosen = byConv.get(activeConvId);
      } else if (byConv.has('__dom__')) {
        chosen = byConv.get('__dom__');
      } else {
        chosen = uniqueConvs[0];
      }

      return {
        ...chosen,
        extraCount: Math.max(0, uniqueConvs.length - 1),
        _allKeys: uniqueConvs.map((x) => x.key),
        _allConvTags: uniqueConvs.filter((x) => x.convId).map((x) => `conv:${x.convId}`)
      };
    }

    function clearReviewBubbleTimer() {
      if (hud.reviewBubbleTimer) {
        clearTimeout(hud.reviewBubbleTimer);
        hud.reviewBubbleTimer = null;
      }
    }

    function syncReviewAlertState() {
      const root = document.getElementById(IDS.petRoot);
      const next = resolveActiveReview();
      const prev = hud.activeReview;
      hud.activeReview = next;

      if (!next) {
        clearReviewBubbleTimer();
        hud.alertedReviewKeys.clear();
        hud.dismissedReviewKeys.clear();
        if (root) root.classList.remove('is-review-alert');
        if (hud.bubbleStage === 4) {
          hud.bubbleStage = 0;
          renderThoughtBubbleContent(false);
        }
        return false;
      }

      // Prune alerted keys for conversations no longer waiting so a future confirmation re-alerts
      const liveSet = new Set([...(next._allKeys || []), ...(next._allConvTags || [])]);
      for (const k of Array.from(hud.alertedReviewKeys)) {
        if (!liveSet.has(k)) {
          hud.alertedReviewKeys.delete(k);
        }
      }

      if (root) root.classList.add('is-review-alert');

      const convTag = next.convId ? `conv:${next.convId}` : '';
      const alreadyAlerted = hud.alertedReviewKeys.has(next.key) || (convTag && hud.alertedReviewKeys.has(convTag));
      const isDismissed = hud.dismissedReviewKeys.has(next.key) || (convTag && hud.dismissedReviewKeys.has(convTag));

      if (!alreadyAlerted) {
        hud.alertedReviewKeys.add(next.key);
        if (convTag) hud.alertedReviewKeys.add(convTag);
        clearTurnBubbleTimer();
        clearReviewBubbleTimer();
        hud.turnSummary = null;
        if (hud.panelMode !== 'settings') {
          hud.bubbleStage = 4;
          renderThoughtBubbleContent(false);
          const autoKey = next.key;
          const autoConvTag = convTag;
          hud.reviewBubbleTimer = setTimeout(() => {
            hud.reviewBubbleTimer = null;
            if (autoKey) hud.dismissedReviewKeys.add(autoKey);
            if (autoConvTag) hud.dismissedReviewKeys.add(autoConvTag);
            if (hud.bubbleStage === 4) {
              hud.bubbleStage = 0;
              renderThoughtBubbleContent(false);
            }
          }, REVIEW_BUBBLE_AUTO_HIDE_MS);
        }
        playReviewAlertSound();
        if (root && typeof root.getBoundingClientRect === 'function') {
          const rect = root.getBoundingClientRect();
          spawnParticles(rect.left + (rect.width || 112) * 0.48, rect.top + (rect.height || 112) * 0.25, true);
        }
      } else if (hud.bubbleStage === 4 && !isDismissed) {
        renderThoughtBubbleContent(false);
      }

      return !prev || prev.key !== next.key || prev.projectName !== next.projectName || prev.extraCount !== next.extraCount;
    }

    function markActiveReviewConfirmed() {
      if (!hud.activeReview) return;
      clearReviewBubbleTimer();
      const now = Date.now();
      const exp = now + 2500;
      const curConvId = detectActiveConvId();
      if (hud.activeReview.key) hud.reviewClearGrace.set(hud.activeReview.key, exp);
      const targetConv = hud.activeReview.convId || curConvId;
      if (targetConv) {
        hud.reviewClearGrace.set(`conv:${targetConv}`, exp);
        hud.reviewClearGrace.set(`dom:${targetConv}:${hud.activeReview.kind || 'review'}`, exp);
      } else {
        hud.reviewClearGrace.set(`dom:win:${hud.activeReview.kind || 'review'}`, exp);
      }

      const belongsToCurrent = !hud.activeReview.convId || !curConvId || hud.activeReview.convId === curConvId;
      if (belongsToCurrent) {
        hud.activeReview = null;
        const root = document.getElementById(IDS.petRoot);
        if (root) root.classList.remove('is-review-alert');
        if (hud.bubbleStage === 4) {
          hud.bubbleStage = 0;
          renderThoughtBubbleContent(false);
        }
      }
      syncReviewAlertState();
      syncThinkingTransition();
      updatePetPoseDom();
      setTimeout(() => {
        refreshTelemetry(true);
      }, 450);
    }

    function isConfirmControlTarget(target) {
      if (!target || typeof target.closest !== 'function') return false;
      if (target.closest(
        '[data-testid="inline-permission-allow"], [data-testid="inline-permission-deny"], ' +
        '[data-testid="inline-card-submit"], [data-testid="inline-card-skip"], ' +
        '[data-testid="subagent-approve"], [data-testid="subagent-deny"], ' +
        '[data-testid="interaction-continue-button"], [data-testid="interaction-skip-button"], ' +
        '[data-testid="ask-question-option"], [data-testid="ask-question-dismiss-button"], ' +
        '[data-testid="webview-prompt-ok"], [data-testid="webview-prompt-cancel"], ' +
        '[data-testid="declared-permissions-confirm"], [data-testid="computer-permissions-continue"], ' +
        '[data-testid="external-link-confirm-open"], [data-testid="external-link-confirm-cancel"]'
      )) {
        return true;
      }
      const btn = target.closest('button');
      if (btn && typeof btn.closest === 'function' && btn.closest('[data-testid="artifact-card"], [data-testid="bubble-artifact-card"], [data-testid="changed-files-card"]')) {
        const txt = String(btn.textContent || '').trim();
        if (/^(Proceed|Approve|Allow|Reject|Deny|Skip|继续|批准|允许|拒绝|跳过|确认)(\s*•.*)?$/i.test(txt)) {
          return true;
        }
      }
      return false;
    }

    function computePetPose() {
      const now = Date.now();
      if (now < hud.pokeUntil) return 'xd';
      if (hud.activeReview && hud.prefs.reviewAlertEnabled !== false) return 'wait';
      if (now < hud.celebrateUntil) return 'grin';
      if (isThinkingNow()) return 'eat';
      return 'idle';
    }

    function clearTurnBubbleTimer() {
      if (hud.turnBubbleTimer) {
        clearTimeout(hud.turnBubbleTimer);
        hud.turnBubbleTimer = null;
      }
    }

    function captureTurnBaseline() {
      const { conv, activeGrp, fiveH, weekly } = getQuotaMetrics();
      const used5 = fiveH
        ? (typeof fiveH.usedPct === 'number'
            ? fiveH.usedPct
            : (typeof fiveH.remainingPct === 'number' ? Math.round((100 - fiveH.remainingPct) * 10) / 10 : null))
        : null;
      const usedWeek = weekly
        ? (typeof weekly.usedPct === 'number'
            ? weekly.usedPct
            : (typeof weekly.remainingPct === 'number' ? Math.round((100 - weekly.remainingPct) * 10) / 10 : null))
        : null;
      hud.turnBaseline = {
        convId: hud.activeConvId || (conv && conv.id) || '',
        startedAt: Date.now(),
        totalTokens: conv ? (Number(conv.totalTokens) || 0) : 0,
        groupKey: (activeGrp && activeGrp.key) || '',
        groupLabel: (activeGrp && activeGrp.label) || 'Gemini',
        quota5hUsed: used5,
        quotaWeekUsed: usedWeek
      };
    }

    function showTurnCompletionBubble(summary) {
      if (hud.activeReview || hud.bubbleStage === 4) return;
      clearTurnBubbleTimer();
      clearReviewBubbleTimer();
      hud.turnSummary = summary;
      hud.bubbleStage = 3;
      hud.currentDialogue = '';
      renderThoughtBubbleContent(false);
      hud.turnBubbleTimer = setTimeout(() => {
        hud.turnBubbleTimer = null;
        if (hud.bubbleStage === 3) {
          hud.bubbleStage = 0;
          hud.turnSummary = null;
          renderThoughtBubbleContent(false);
        }
      }, 10000);
    }

    function scheduleTurnCompletionSummary() {
      const base = hud.turnBaseline;
      hud.turnBaseline = null;
      if (hud.prefs.turnCostBubble === false) return;
      if (!base) return;
      const targetConvId = base.convId || detectActiveConvId();
      if (hud.turnEndTimer) clearTimeout(hud.turnEndTimer);
      hud.turnEndTimer = setTimeout(async () => {
        hud.turnEndTimer = null;
        if (isThinkingNow()) return;
        if (targetConvId && detectActiveConvId() !== targetConvId) return;
        try {
          const data = await ipcRenderer.invoke('neko-hud:get-state', targetConvId, 'turn-end');
          if (isThinkingNow()) return;
          if (targetConvId && detectActiveConvId() !== targetConvId) return;
          if (data && data.ok) {
            if (!targetConvId) data.conv = null;
            hud.state = data;
            ensureStatsBar();
            if (hud.modalOpen) renderObserverModal();
            if (hud.dailyModalOpen) loadDailyTokensData(true);
            if (hud.panelMode === 'card') renderTelemetryCard();
            else if (hud.panelMode === 'daily') loadDailyHeatmapData(true);
          }
        } catch {}

        const { conv, groups, activeGrp, fiveH, weekly } = getQuotaMetrics();
        const matchedGrp = (base.groupKey && groups.find((g) => g.key === base.groupKey)) || activeGrp;
        const mFiveH = matchedGrp && Array.isArray(matchedGrp.buckets)
          ? (matchedGrp.buckets.find((b) => b.windowKind === '5h') || matchedGrp.buckets[0] || fiveH)
          : fiveH;
        const mWeekly = matchedGrp && Array.isArray(matchedGrp.buckets)
          ? (matchedGrp.buckets.find((b) => b.windowKind === 'weekly') || weekly)
          : weekly;

        const after5Used = mFiveH
          ? (typeof mFiveH.usedPct === 'number'
              ? mFiveH.usedPct
              : (typeof mFiveH.remainingPct === 'number' ? Math.round((100 - mFiveH.remainingPct) * 10) / 10 : null))
          : null;
        const afterWeekUsed = mWeekly
          ? (typeof mWeekly.usedPct === 'number'
              ? mWeekly.usedPct
              : (typeof mWeekly.remainingPct === 'number' ? Math.round((100 - mWeekly.remainingPct) * 10) / 10 : null))
          : null;

        const delta5h = (base.quota5hUsed !== null && after5Used !== null)
          ? Math.max(0, Math.round((after5Used - base.quota5hUsed) * 10) / 10)
          : null;
        const deltaWeek = (base.quotaWeekUsed !== null && afterWeekUsed !== null)
          ? Math.max(0, Math.round((afterWeekUsed - base.quotaWeekUsed) * 10) / 10)
          : null;
        const afterTotTok = conv ? (Number(conv.totalTokens) || 0) : base.totalTokens;
        const deltaTokens = Math.max(0, afterTotTok - (base.totalTokens || 0));

        showTurnCompletionBubble({
          groupShort: matchedGrp ? String(matchedGrp.label || 'Gemini').replace(/\s*models?\s*/gi, '').trim() : 'Gemini',
          delta5h,
          deltaWeek,
          rem5h: mFiveH && typeof mFiveH.remainingPct === 'number' ? mFiveH.remainingPct : null,
          remWeek: mWeekly && typeof mWeekly.remainingPct === 'number' ? mWeekly.remainingPct : null,
          deltaTokens,
          ctxPct: conv && conv.contextPct !== null && conv.contextPct !== undefined ? conv.contextPct : null
        });
      }, 360);
    }

    function syncThinkingTransition() {
      const thinking = isThinkingNow();
      const curConvId = detectActiveConvId();
      if (!hud.wasThinking && thinking) {
        if (hud.turnEndTimer) {
          clearTimeout(hud.turnEndTimer);
          hud.turnEndTimer = null;
        }
        if (!hud.turnBaseline || (hud.turnBaseline.convId || '') !== (curConvId || '')) {
          captureTurnBaseline();
        }
      } else if (hud.wasThinking && !thinking) {
        if (hud.activeReview && (!hud.activeReview.convId || hud.activeReview.convId === curConvId)) {
          hud.wasThinking = false;
          return;
        }
        if (hud.prefs.completionEasterEgg !== false) {
          triggerCelebrate(2400);
          playCompletionSound();
        }
        scheduleTurnCompletionSummary();
      }
      hud.wasThinking = thinking;
    }

    function triggerCelebrate(ms = 2200) {
      hud.celebrateUntil = Date.now() + ms;
      if (hud.celebrateTimer) clearTimeout(hud.celebrateTimer);
      hud.celebrateTimer = setTimeout(() => {
        hud.celebrateTimer = null;
        updatePetPoseDom();
      }, ms + 30);
      updatePetPoseDom();
    }

    function updatePetPoseDom() {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      const pose = computePetPose();
      if (hud.curPose !== pose || root.getAttribute('data-pose') !== pose) {
        hud.curPose = pose;
        root.setAttribute('data-pose', pose);
        const imgs = root.querySelectorAll('.gn-frame');
        for (const img of imgs) {
          img.classList.toggle('is-active', img.getAttribute('data-frame') === pose);
        }
      }
    }

    function getQuotaMetrics() {
      const conv = hud.state && hud.state.conv;
      const quota = hud.state && hud.state.quota;
      const groups = (quota && Array.isArray(quota.groups)) ? quota.groups : [];
      const activeModel = (conv && conv.modelLabel) || '';
      const activeGrp = (activeModel && /claude|gpt/i.test(activeModel)
        ? groups.find((g) => /claude/i.test(g.label))
        : groups.find((g) => /gemini/i.test(g.label) && !/argon/i.test(g.label))) || groups[0] || null;
      const fiveH = activeGrp && Array.isArray(activeGrp.buckets)
        ? (activeGrp.buckets.find((b) => b.windowKind === '5h') || activeGrp.buckets[0] || null)
        : null;
      const weekly = activeGrp && Array.isArray(activeGrp.buckets)
        ? activeGrp.buckets.find((b) => b.windowKind === 'weekly')
        : null;
      return { conv, groups, activeGrp, fiveH, weekly };
    }

    function pickRandomDialogue() {
      const { conv, fiveH, weekly } = getQuotaMetrics();
      const custom = Array.isArray(hud.prefs.customDialogues) ? hud.prefs.customDialogues : [];
      const pool = [...custom, ...BUILTIN_DIALOGUES];
      let chosen = pool[Math.floor(Math.random() * pool.length)] || '好猫猫... ♥';
      if (pool.length > 1 && chosen === hud.lastDialogueText) {
        chosen = pool[(pool.indexOf(chosen) + 1) % pool.length];
      }
      hud.lastDialogueText = chosen;

      const ctxPct = conv && conv.contextPct !== null && conv.contextPct !== undefined ? String(conv.contextPct) : '0';
      const q5h = fiveH && typeof fiveH.remainingPct === 'number' ? String(fiveH.remainingPct) : '—';
      const qWeek = weekly && typeof weekly.remainingPct === 'number' ? String(weekly.remainingPct) : '—';
      return String(chosen)
        .replace(/\{quota_5h\}/g, q5h)
        .replace(/\{quota_week\}/g, qWeek)
        .replace(/\{ctx_pct\}/g, ctxPct)
        .replace(/\{ctx_used\}/g, conv ? fmtTok(conv.contextTokens) : '0')
        .replace(/\{ctx_max\}/g, conv && conv.contextMaxTokens ? fmtTok(conv.contextMaxTokens) : '?')
        .replace(/\{tokens\}/g, conv ? fmtTok(conv.totalTokens) : '0')
        .replace(/\{model\}/g, (conv && conv.modelLabel) || 'Gemini');
    }

    function renderThoughtBubbleContent(withFade = false) {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      root.classList.toggle('is-bubble-open', hud.bubbleStage > 0);
      root.classList.toggle('is-bubble-passthrough', hud.bubbleStage === 4);
      if (hud.bubbleStage === 0) return;

      const hit = root.querySelector('.gn-thought-hit');
      if (!hit) return;

      const buildInner = () => {
        const { conv, activeGrp, fiveH, weekly } = getQuotaMetrics();
        if (hud.bubbleStage === 1) {
          const grpShort = activeGrp ? String(activeGrp.label || 'Gemini').replace(/\s*models?\s*/gi, '').trim() : 'Gemini';
          const rem5 = fiveH && typeof fiveH.remainingPct === 'number' ? fiveH.remainingPct : null;
          const remCol = rem5 !== null ? pctColor(rem5, true) : '#3b4b8c';
          const heroStr = rem5 !== null ? `剩 ${rem5}%` : (conv && conv.contextPct !== null ? `${conv.contextPct}%` : '同步中…');
          const reset5 = fiveH ? fmtResetCompact(fiveH.resetMs || fiveH.resetAtIso || fiveH.resetAtMs) : '';
          const weekStr = weekly && typeof weekly.remainingPct === 'number' ? `周剩 ${weekly.remainingPct}%` : '';
          const ctxStr = conv
            ? `上下文 ${conv.contextPct ?? '?'}% (${fmtTok(conv.contextTokens)}/${conv.contextMaxTokens ? fmtTok(conv.contextMaxTokens) : '?'})`
            : '暂无活跃对话';
          const tokStr = conv ? `已用 ${fmtTok(conv.totalTokens)} tok` : (reset5 ? `${reset5} 重置` : '');
          const subLine1 = [weekStr, reset5 ? `${reset5}重置` : ''].filter(Boolean).join(' · ');
          const subLine2 = [ctxStr, tokStr].filter(Boolean).join(' · ');
          return `
            <div class="gn-th-label">${esc(grpShort)} 5h 额度</div>
            <div class="gn-th-hero" style="color:${remCol};">${esc(heroStr)}</div>
            ${subLine1 ? `<div class="gn-th-sub">${esc(subLine1)}</div>` : ''}
            <div class="gn-th-sub">${esc(subLine2)}</div>
          `;
        }
        if (hud.bubbleStage === 3 && hud.turnSummary) {
          const ts = hud.turnSummary;
          let heroText = '额度 <0.1%';
          let heroCol = '#10b981';
          if (typeof ts.delta5h === 'number' && ts.delta5h > 0) {
            heroText = `5h -${ts.delta5h}%`;
            heroCol = ts.delta5h >= 5 ? '#ef4444' : '#7c3aed';
          } else if (typeof ts.deltaWeek === 'number' && ts.deltaWeek > 0) {
            heroText = `周 -${ts.deltaWeek}%`;
            heroCol = ts.deltaWeek >= 5 ? '#ef4444' : '#7c3aed';
          }
          const remParts = [];
          if (ts.rem5h !== null) remParts.push(`5h 剩 ${ts.rem5h}%`);
          if (ts.remWeek !== null) remParts.push(`周剩 ${ts.remWeek}%`);
          const tokParts = [];
          if (ts.deltaTokens > 0) tokParts.push(`本轮 +${fmtTok(ts.deltaTokens)} tok`);
          if (ts.ctxPct !== null) tokParts.push(`上下文 ${ts.ctxPct}%`);
          return `
            <div class="gn-th-label">对话完成 · ${esc(ts.groupShort)}</div>
            <div class="gn-th-hero" style="color:${heroCol};">${esc(heroText)}</div>
            ${remParts.length ? `<div class="gn-th-sub">${esc(remParts.join(' · '))}</div>` : ''}
            ${tokParts.length ? `<div class="gn-th-sub">${esc(tokParts.join(' · '))}</div>` : ''}
            <div class="gn-th-hint">10秒后自动关闭 · 点击关闭</div>
          `;
        }
        if (hud.bubbleStage === 4 && hud.activeReview) {
          const r = hud.activeReview;
          const headText = r.extraCount > 0 ? `⚠️ 待确认 (${r.extraCount + 1}个项目)` : '⚠️ 审查确认提醒';
          const detailParts = [r.label || '审查需求待确认'];
          if (r.convTitle && r.convTitle !== r.projectName) {
            detailParts.push(r.convTitle.slice(0, 18));
          }
          return `
            <div class="gn-th-label" style="color:#d97706;">${esc(headText)}</div>
            <div class="gn-th-proj" title="${esc(r.projectName)}">【${esc(r.projectName || '当前项目')}】</div>
            <div class="gn-th-sub" style="color:#1e293b;font-weight:800;">请求主人确认啦！</div>
            <div class="gn-th-sub">${esc(detailParts.join(' · '))}</div>
            <div class="gn-th-hint">4秒后自动收起 · 不遮挡点击</div>
          `;
        }
        const text = hud.currentDialogue || pickRandomDialogue();
        hud.currentDialogue = text;
        return `
          <div class="gn-th-line">${esc(text)}</div>
        `;
      };

      const nextHtml = buildInner();
      if (withFade) {
        hit.classList.add('is-fading');
        setTimeout(() => {
          hit.__gnHtml = nextHtml;
          hit.innerHTML = nextHtml;
          hit.classList.remove('is-fading');
        }, 140);
      } else if (hit.__gnHtml !== nextHtml) {
        hit.__gnHtml = nextHtml;
        hit.innerHTML = nextHtml;
      }
    }

    function spawnParticles(clientX, clientY, isCombo) {
      if (!document.body) return;
      const glyphs = isCombo ? ['✦', '♥', '✨', '♪', '★'] : ['><', '✦', '♥'];
      const colors = ['#a78bfa', '#f472b6', '#60a5fa', '#fbbf24'];
      const count = isCombo ? 6 : 3;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.className = 'gn-particle';
        el.textContent = glyphs[(i + Math.floor(Math.random() * glyphs.length)) % glyphs.length];
        el.style.color = colors[(i + Math.floor(Math.random() * colors.length)) % colors.length];
        el.style.left = `${Math.round(clientX + (Math.random() - 0.5) * 44)}px`;
        el.style.top = `${Math.round(clientY - 12 + (Math.random() - 0.5) * 20)}px`;
        document.body.appendChild(el);
        setTimeout(() => {
          try { el.remove(); } catch {}
        }, 950);
      }
    }

    function handleCharacterLeftClick(e) {
      const now = Date.now();
      if (now - hud.lastPokeAt <= 1600) {
        hud.pokeCombo += 1;
      } else {
        hud.pokeCombo = 1;
      }
      hud.lastPokeAt = now;

      const isCombo = hud.pokeCombo >= 3;
      if (isCombo) {
        hud.pokeCombo = 0;
        hud.pokeUntil = 0;
        triggerCelebrate(2200);
      } else {
        hud.pokeUntil = now + 1150;
        if (hud.pokeTimer) clearTimeout(hud.pokeTimer);
        hud.pokeTimer = setTimeout(() => {
          hud.pokeTimer = null;
          updatePetPoseDom();
        }, 1170);
      }

      playPokeReleaseSound(isCombo);

      const nextPat = (hud.prefs.patCount || 0) + 1;
      hud.prefs.patCount = nextPat;
      ipcRenderer.invoke('neko-hud:save-prefs', { patCount: nextPat }).catch(() => {});

      const root = document.getElementById(IDS.petRoot);
      const rect = root ? root.getBoundingClientRect() : null;
      const px = e && Number.isFinite(e.clientX) ? e.clientX : (rect ? rect.left + rect.width * 0.5 : window.innerWidth - 60);
      const py = e && Number.isFinite(e.clientY) ? e.clientY : (rect ? rect.top + rect.height * 0.3 : window.innerHeight - 90);
      spawnParticles(px, py, isCombo);

      // Left-click character opens Stage 1 Bubble (Quota + Context/Tokens) and closes right-click panel
      clearTurnBubbleTimer();
      clearReviewBubbleTimer();
      hud.turnSummary = null;
      if (hud.panelMode) {
        hud.panelMode = '';
        syncPanelVisibility();
      }
      const wasOpen = hud.bubbleStage > 0;
      hud.bubbleStage = 1;
      hud.currentDialogue = '';
      updatePetPoseDom();
      renderThoughtBubbleContent(wasOpen);
      refreshTelemetry(true);
    }

    function handleBubbleLeftClick(e) {
      e.stopPropagation();
      if (hud.bubbleStage === 4) {
        return;
      }
      clearTurnBubbleTimer();
      clearReviewBubbleTimer();
      if (hud.bubbleStage === 1) {
        hud.bubbleStage = 2;
        hud.currentDialogue = pickRandomDialogue();
        renderThoughtBubbleContent(true);
      } else {
        hud.bubbleStage = 0;
        hud.currentDialogue = '';
        hud.turnSummary = null;
        renderThoughtBubbleContent(false);
      }
    }

    function syncPanelVisibility() {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      root.classList.toggle('is-panel-open', Boolean(hud.panelMode));
      if (hud.panelMode === 'card') {
        renderTelemetryCard();
      } else if (hud.panelMode === 'settings') {
        renderSettingsPanel();
      } else if (hud.panelMode === 'daily') {
        renderDailyHeatmapPanel();
      }
      renderThoughtBubbleContent(false);
    }

    function renderTelemetryCard() {
      const root = document.getElementById(IDS.petRoot);
      if (!root || hud.panelMode !== 'card') return;
      const panel = root.querySelector('.gn-panel');
      if (!panel) return;

      const conv = hud.state && hud.state.conv;
      const quota = hud.state && hud.state.quota;
      const planName = (hud.state && hud.state.plan && hud.state.plan.planName) || '';
      const groups = (quota && Array.isArray(quota.groups)) ? quota.groups : [];
      const pose = computePetPose();
      const poseInfo = pose === 'wait'
        ? { cls: 'is-wait', txt: '请求主人确认中…' }
        : (pose === 'eat'
            ? { cls: 'is-eat', txt: '吃大米思考中…' }
            : (pose === 'xd'
                ? { cls: 'is-xd', txt: '被戳啦 ><' }
                : (pose === 'grin'
                    ? { cls: 'is-grin', txt: '呲牙得意中' }
                    : { cls: '', txt: '待机中' })));

      const ctxTok = conv ? (conv.contextTokens || 0) : 0;
      const ctxMax = conv ? (conv.contextMaxTokens || 0) : 0;
      const ctxPct = conv && conv.contextPct !== null && conv.contextPct !== undefined ? conv.contextPct : 0;
      const ctxCol = pctColor(ctxPct, false);
      const srvGroups = (conv && conv.tokenBreakdown && Array.isArray(conv.tokenBreakdown.groups))
        ? conv.tokenBreakdown.groups
        : [];
      const hitStr = conv && conv.cacheHitPct !== null && conv.cacheHitPct !== undefined ? `${conv.cacheHitPct}%` : '—';

      let quotaHtml = '<div style="font-size:11px;opacity:.65;">正在同步额度数据…</div>';
      if (groups.length > 0) {
        const activeModel = (conv && conv.modelLabel) || '';
        const sorted = [...groups].sort((a, b) => {
          const aMatch = activeModel && /claude|gpt/i.test(activeModel) ? /claude/i.test(a.label) : /gemini/i.test(a.label) && !/argon/i.test(a.label);
          const bMatch = activeModel && /claude|gpt/i.test(activeModel) ? /claude/i.test(b.label) : /gemini/i.test(b.label) && !/argon/i.test(b.label);
          return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
        });
        quotaHtml = sorted.map((g, idx) => {
          const shortLbl = String(g.label || 'Quota').replace(/\s*models?\s*/gi, '').trim();
          const buckets = Array.isArray(g.buckets) ? g.buckets : [];
          if (idx === 0) {
            return `
              <div style="margin-bottom:6px;">
                <div style="font-size:11px;font-weight:700;margin-bottom:4px;display:flex;justify-content:space-between;">
                  <span>${esc(shortLbl)}</span>
                  ${planName ? `<span style="font-size:10px;opacity:.7;">${esc(planName)}</span>` : ''}
                </div>
                ${buckets.map((b) => {
                  const rem = typeof b.remainingPct === 'number' ? b.remainingPct : 0;
                  const col = pctColor(rem, true);
                  const reset = fmtResetCountdown(b.resetMs || b.resetAtIso || b.resetAtMs);
                  return `
                    <div class="gn-bar-row" style="margin-bottom:4px;">
                      <div class="gn-bar-meta">
                        <span>${esc(b.windowLabel || 'Quota')}</span>
                        <span class="gn-mono" style="color:${col};font-weight:700;">剩 ${rem}%${reset ? ` · ${esc(reset)}` : ''}</span>
                      </div>
                      <div class="gn-bar-track"><div class="gn-bar-fill" style="width:${Math.max(2, rem)}%;background:${col};"></div></div>
                    </div>`;
                }).join('')}
              </div>`;
          }
          const summaryBits = buckets.map((b) => {
            const rem = typeof b.remainingPct === 'number' ? b.remainingPct : 0;
            const col = pctColor(rem, true);
            return `<span class="gn-mono" style="color:${col};">${esc(b.windowLabel)} ${rem}%</span>`;
          }).join(' · ');
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:2px 0;opacity:.88;">
              <span>${esc(shortLbl)}</span>
              <span>${summaryBits || '—'}</span>
            </div>`;
        }).join('');
      }

      const html = `
        <div class="gn-card-head">
          <div class="gn-card-title">
            <span>✦ Gemini 猫娘</span>
            <span class="gn-state-tag ${poseInfo.cls}">${poseInfo.txt}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;min-width:0;">
            <span class="gn-mono" style="font-size:10px;opacity:.75;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((conv && conv.modelLabel) || '待命')}</span>
            <button type="button" class="gn-chip" data-gn-pet="close-panel" title="关闭" style="padding:1px 6px;">×</button>
          </div>
        </div>

        <div class="gn-card-sec">
          <div class="gn-card-sec-title">
            <span>🧠 上下文长度</span>
            <span class="gn-mono" style="color:${conv ? ctxCol : 'inherit'};font-weight:700;">
              ${conv ? `${fmtTok(ctxTok)} / ${ctxMax ? fmtTok(ctxMax) : '?'} (${ctxPct}%)` : '暂无活跃对话'}
            </span>
          </div>
          <div class="gn-bar-track" style="height:7px;">
            <div class="gn-bar-fill" style="width:${conv ? Math.max(2, ctxPct) : 0}%;background:${ctxCol};"></div>
          </div>
          ${conv ? `
            <div class="gn-sub-breakdown">
              ${srvGroups.slice(0, 3).map((g) => `<span>${esc(g.name.replace('System Prompt', '系统').replace('Chat Messages', '对话').replace('Tools', '工具'))}: ${fmtTok(g.numTokens)}</span>`).join('')}
              ${conv.compactions > 0 ? `<span style="color:#f59e0b;font-weight:700;">压缩 ${conv.compactions}次</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="gn-card-sec">
          <div class="gn-card-sec-title">
            <span>📊 本对话已使用 Token</span>
            <span class="gn-mono">${conv ? `${conv.rounds || 0}轮 ${conv.steps || 0}步${conv.tokPerSec > 0 ? ` · ${conv.tokPerSec} tok/s` : ''}` : '新对话'}</span>
          </div>
          ${conv ? `
            <div class="gn-kv-grid">
              <div class="gn-kv">
                <div class="gn-kv-k">累计总 Token</div>
                <div class="gn-kv-v gn-mono">${fmtTok(conv.totalTokens)} tok</div>
              </div>
              <div class="gn-kv">
                <div class="gn-kv-k">缓存命中率</div>
                <div class="gn-kv-v gn-mono" style="color:#38bdf8;">${hitStr}</div>
              </div>
            </div>
            <div class="gn-sub-breakdown gn-mono">
              <span>新输入 ${fmtTok(conv.inputTokens)}</span>
              <span>· 缓存读 ${fmtTok(conv.cacheReadTokens)}</span>
              <span>· 输出 ${fmtTok(conv.outputTokens)}</span>
            </div>
          ` : '<div style="font-size:11px;opacity:.65;">开始对话后实时统计 Token 用量</div>'}
        </div>

        <div class="gn-card-sec">
          <div class="gn-card-sec-title">
            <span>⚡ 模型剩余额度</span>
            <span style="font-size:10px;opacity:.65;">已被戳 ${hud.prefs.patCount || 0} 次</span>
          </div>
          ${quotaHtml}
        </div>

        <div class="gn-card-actions">
          <button type="button" class="gn-btn gn-btn-primary" data-gn-pet="open-observer">🔍 上下文观察窗口</button>
          <button type="button" class="gn-btn" data-gn-pet="refresh">🔄 刷新</button>
          <button type="button" class="gn-btn" data-gn-pet="open-settings">⚙️ 挂件设置</button>
          <button type="button" class="gn-btn" style="flex:0 0 100%;width:100%;" data-gn-pet="open-daily-tokens">📅 每日 Token 统计</button>
        </div>
      `;

      if (panel.__gnCardHtml !== html || panel.getAttribute('data-mode') !== 'card') {
        const prevTop = panel.scrollTop || 0;
        panel.style.minHeight = '';
        panel.style.display = '';
        panel.style.flexDirection = '';
        panel.setAttribute('data-mode', 'card');
        panel.__gnCardHtml = html;
        panel.innerHTML = html;
        panel.scrollTop = prevTop;
      }
      const cardH = panel.offsetHeight;
      if (cardH > 180) hud.lastCardHeight = cardH;
    }

    function isPanelLightTheme(panel) {
      try {
        const bg = window.getComputedStyle(panel).backgroundColor || '';
        const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(bg);
        if (m) {
          const lum = 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]);
          return lum > 140;
        }
      } catch {}
      return false;
    }

    function fmtLocalDateKey(dt) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function computeGhLevel(tokens, refMax) {
      const v = Number(tokens) || 0;
      if (v <= 0 || refMax <= 0) return 0;
      const ratio = Math.min(1, Math.sqrt(v / refMax));
      if (ratio <= 0.35) return 1;
      if (ratio <= 0.60) return 2;
      if (ratio <= 0.82) return 3;
      return 4;
    }

    function buildGhDetailHtml(dayObj, fallbackDate) {
      if (!dayObj || (Number(dayObj.totalTokens) || 0) <= 0) {
        const dStr = (dayObj && dayObj.date) || fallbackDate || '—';
        const tag = (dayObj && (dayObj.isToday ? '今天' : (dayObj.isYesterday ? '昨天' : dayObj.weekday))) || '';
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="gn-mono" style="font-weight:700;">${esc(dStr)}${tag ? ` (${esc(tag)})` : ''}</span>
            <span class="gn-mono" style="opacity:.65;">0 tok</span>
          </div>
          <div style="opacity:.65;margin-top:2px;">当日暂无模型 Token 消耗记录</div>
        `;
      }
      const tag = dayObj.isToday ? '今天' : (dayObj.isYesterday ? '昨天' : dayObj.weekday);
      const hitStr = dayObj.cacheHitPct !== null && dayObj.cacheHitPct !== undefined ? `命中 ${dayObj.cacheHitPct}%` : '';
      const subParts = [
        `新 ${fmtTok(dayObj.inputTokens)}`,
        `缓 ${fmtTok(dayObj.cacheReadTokens)}`,
        `出 ${fmtTok(dayObj.outputTokens)}`,
        hitStr
      ].filter(Boolean);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <span class="gn-mono" style="font-weight:700;">${esc(dayObj.date)}${tag ? ` (${esc(tag)})` : ''}</span>
          <span class="gn-mono" style="font-weight:800;color:#10b981;">${fmtTok(dayObj.totalTokens)} tok</span>
        </div>
        <div class="gn-mono" style="opacity:.82;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${esc(subParts.join(' · '))}
        </div>
      `;
    }

    async function loadDailyHeatmapData(forceRefresh = false) {
      const seq = ++hud.dailyHeatmapSeq;
      hud.dailyPanelLoading = true;
      if (hud.panelMode === 'daily') renderDailyHeatmapPanel();
      try {
        const res = await ipcRenderer.invoke('neko-hud:get-daily-tokens', 140, Boolean(forceRefresh));
        if (seq === hud.dailyHeatmapSeq && res && res.ok) {
          hud.dailyPanelData = res;
        }
      } catch {} finally {
        if (seq === hud.dailyHeatmapSeq) {
          hud.dailyPanelLoading = false;
          if (hud.panelMode === 'daily') renderDailyHeatmapPanel();
        }
      }
    }

    function updateDailyHeatmapSelection(dateKey) {
      const root = document.getElementById(IDS.petRoot);
      if (!root || hud.panelMode !== 'daily') return;
      const panel = root.querySelector('.gn-panel');
      if (!panel) return;
      hud.dailySelectedDate = dateKey;

      const cells = panel.querySelectorAll('.gn-gh-cell[data-gn-gh-date]');
      for (const c of cells) {
        c.classList.toggle('is-selected', c.getAttribute('data-gn-gh-date') === dateKey);
      }
      const detailEl = panel.querySelector('#gn-gh-detail');
      if (detailEl) {
        const list = (hud.dailyPanelData && Array.isArray(hud.dailyPanelData.days)) ? hud.dailyPanelData.days : [];
        const hit = list.find((d) => d.date === dateKey) || null;
        detailEl.innerHTML = buildGhDetailHtml(hit, dateKey);
      }
    }

    function renderDailyHeatmapPanel() {
      const root = document.getElementById(IDS.petRoot);
      if (!root || hud.panelMode !== 'daily') return;
      const panel = root.querySelector('.gn-panel');
      if (!panel) return;

      panel.setAttribute('data-mode', 'daily');
      panel.__gnCardHtml = '';
      panel.style.minHeight = hud.lastCardHeight ? `${hud.lastCardHeight}px` : '';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';

      const data = hud.dailyPanelData;
      const daysList = (data && Array.isArray(data.days)) ? data.days : [];
      const dayMap = new Map();
      for (const d of daysList) {
        if (d && d.date) dayMap.set(d.date, d);
      }

      const now = new Date();
      const todayKey = fmtLocalDateKey(now);
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayDow = todayMidnight.getDay(); // 0=Sun..6=Sat
      const WEEKS = 18;
      const startSunday = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), todayMidnight.getDate() - todayDow - (WEEKS - 1) * 7);

      const gridCols = [];
      const nonZeroVals = [];
      let gridTotal = 0;
      let activeDaysInGrid = 0;
      const monthMarks = [];
      let lastMonthMarked = -1;

      for (let w = 0; w < WEEKS; w++) {
        const col = [];
        for (let r = 0; r < 7; r++) {
          const dt = new Date(startSunday.getFullYear(), startSunday.getMonth(), startSunday.getDate() + w * 7 + r);
          const dk = fmtLocalDateKey(dt);
          const isFuture = dt.getTime() > todayMidnight.getTime();
          const info = (!isFuture && dayMap.get(dk)) || null;
          const tok = info ? (Number(info.totalTokens) || 0) : 0;
          if (!isFuture) {
            gridTotal += tok;
            if (tok > 0) {
              nonZeroVals.push(tok);
              activeDaysInGrid += 1;
            }
            if (dt.getDate() === 1 || (w === 0 && r === 0)) {
              const mNum = dt.getMonth() + 1;
              if (mNum !== lastMonthMarked) {
                if (monthMarks.length === 0 || w - monthMarks[monthMarks.length - 1].col >= 2) {
                  monthMarks.push({ col: w, label: `${mNum}月` });
                }
                lastMonthMarked = mNum;
              }
            }
          }
          col.push({ dk, isFuture, tok, info });
        }
        gridCols.push(col);
      }

      let refMax = 0;
      if (nonZeroVals.length > 0) {
        const sortedVals = [...nonZeroVals].sort((a, b) => a - b);
        const idx90 = Math.min(sortedVals.length - 1, Math.floor((sortedVals.length - 1) * 0.9));
        refMax = sortedVals.length >= 5 ? sortedVals[idx90] : sortedVals[sortedVals.length - 1];
      }

      const isLight = isPanelLightTheme(panel);
      const palette = isLight
        ? ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
        : ['rgba(148, 163, 184, 0.14)', '#0e4429', '#006d32', '#26a641', '#39d353'];

      const selectedKey = hud.dailySelectedDate || todayKey;
      const selectedObj = dayMap.get(selectedKey) || null;
      const todayObj = (data && data.today) || dayMap.get(todayKey) || null;
      const todayTok = todayObj ? (Number(todayObj.totalTokens) || 0) : 0;

      const colsHtml = gridCols.map((col) => `
        <div class="gn-gh-col">
          ${col.map((cell) => {
            if (cell.isFuture) {
              return `<span class="gn-gh-cell is-future"></span>`;
            }
            const lvl = computeGhLevel(cell.tok, refMax);
            const bg = palette[lvl];
            const isSel = cell.dk === selectedKey;
            const titleText = `${cell.dk}: ${fmtTok(cell.tok)} tok`;
            return `<span class="gn-gh-cell ${isSel ? 'is-selected' : ''}" data-gn-gh-date="${esc(cell.dk)}" title="${esc(titleText)}" style="background:${bg};"></span>`;
          }).join('')}
        </div>
      `).join('');

      const monthsHtml = monthMarks.map((m) => `<span class="gn-gh-month" style="left:${m.col * 13}px;">${esc(m.label)}</span>`).join('');

      panel.innerHTML = `
        <div class="gn-card-head">
          <div class="gn-card-title">
            <span>📅 每日 Token 统计</span>
            ${hud.dailyPanelLoading ? `<span class="gn-state-tag">同步中…</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:5px;">
            <button type="button" class="gn-chip" data-gn-pet="open-daily-modal" title="打开详细每日 Token 统计窗口" style="padding:1px 6px;">📊 详情</button>
            <button type="button" class="gn-chip" data-gn-pet="refresh-daily" title="刷新" style="padding:1px 6px;">🔄</button>
            <button type="button" class="gn-chip" data-gn-pet="close-panel" title="关闭" style="padding:1px 6px;">×</button>
          </div>
        </div>

        <div class="gn-card-sec">
          <div class="gn-kv-grid">
            <div class="gn-kv">
              <div class="gn-kv-k">今日已用</div>
              <div class="gn-kv-v gn-mono" style="color:#10b981;">${fmtTok(todayTok)} tok</div>
            </div>
            <div class="gn-kv">
              <div class="gn-kv-k">近 ${WEEKS} 周累计</div>
              <div class="gn-kv-v gn-mono">${fmtTok(gridTotal)} tok</div>
            </div>
          </div>
        </div>

        <div class="gn-gh-wrap">
          <div class="gn-gh-grid-row">
            <div class="gn-gh-weekdays">
              <span></span>
              <span>一</span>
              <span></span>
              <span>三</span>
              <span></span>
              <span>五</span>
              <span></span>
            </div>
            <div class="gn-gh-cal-col">
              <div class="gn-gh-months">${monthsHtml}</div>
              <div class="gn-gh-weeks">${colsHtml}</div>
            </div>
          </div>
          <div class="gn-gh-legend">
            <span>活跃 ${activeDaysInGrid} 天</span>
            <div class="gn-gh-legend-swatches">
              <span>少</span>
              ${palette.map((c) => `<i class="gn-gh-swatch" style="background:${c};"></i>`).join('')}
              <span>多</span>
            </div>
          </div>
        </div>

        <div class="gn-gh-detail" id="gn-gh-detail">
          ${buildGhDetailHtml(selectedObj, selectedKey)}
        </div>

        <div class="gn-card-actions" style="margin-top:auto;padding-top:10px;">
          <button type="button" class="gn-btn" style="flex:0 0 100%;width:100%;" data-gn-pet="back-card">← 返回</button>
        </div>
      `;
    }

    function renderSettingsPanel() {
      const root = document.getElementById(IDS.petRoot);
      if (!root || hud.panelMode !== 'settings') return;
      const panel = root.querySelector('.gn-panel');
      if (!panel) return;

      const curSize = hud.prefs.size || 112;
      const curBubbleScale = Math.max(0.65, Math.min(1.6, Number(hud.prefs.bubbleScale) || 1));
      const curBubblePct = Math.round(curBubbleScale * 100);
      const curOpacity = Math.round((hud.prefs.opacity ?? 1) * 100);
      const curVol = Math.round((hud.prefs.volume ?? 0.78) * 100);
      const curSet = hud.prefs.soundSet || 'boing';
      const a = hud.prefs.anchor || { hAnchor: 'right', vAnchor: 'bottom' };
      const curCorner = `${a.vAnchor}-${a.hAnchor}`;
      const customLabel = hud.customAudio && hud.customAudio.name
        ? hud.customAudio.name
        : (hud.prefs.customAudioPath ? hud.prefs.customAudioPath.split(/[\\/]/).pop() : '未选择');
      const customDialogues = Array.isArray(hud.prefs.customDialogues) ? hud.prefs.customDialogues : [];
      const cf = hud.prefs.customFrames || {};
      const hasCustomFrame = Boolean(cf.idle || cf.eat || cf.xd || cf.grin || cf.wait);
      const curSkin = hud.prefs.skin === 'heterochromia' ? 'heterochromia' : 'purple';

      panel.style.minHeight = '';
      panel.style.display = '';
      panel.style.flexDirection = '';
      panel.setAttribute('data-mode', 'settings');
      panel.__gnCardHtml = '';
      panel.innerHTML = `
        <div class="gn-card-head">
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" class="gn-chip" data-gn-pet="back-card" title="返回信息卡片">← 返回</button>
            <span class="gn-card-title">✦ 挂件设置</span>
          </div>
          <button type="button" class="gn-chip" data-gn-pet="close-panel" title="关闭">×</button>
        </div>

        <div class="gn-set-row" style="border-top:0;padding-top:4px;">
          <div class="gn-set-label"><span>📏 挂件大小</span><span class="gn-mono" data-gn-val="size">${curSize}px</span></div>
          <input type="range" class="gn-range" min="64" max="180" step="2" value="${curSize}" data-gn-range="size" />
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label"><span>💭 气泡大小</span><span class="gn-mono" data-gn-val="bubbleScale">${curBubblePct}% (${Math.round(222 * curBubbleScale)}×${Math.round(152 * curBubbleScale)})</span></div>
          <div class="gn-chip-row">
            <button type="button" class="gn-chip" data-gn-bubble-step="-0.1" title="缩小气泡">－</button>
            ${[
              [0.8, '小'],
              [1, '默认'],
              [1.2, '大'],
              [1.45, '超大']
            ].map(([sc, lbl]) => `<button type="button" class="gn-chip ${Math.abs(curBubbleScale - sc) < 0.03 ? 'is-active' : ''}" data-gn-bubble-size="${sc}">${lbl}</button>`).join('')}
            <button type="button" class="gn-chip" data-gn-bubble-step="0.1" title="放大气泡">＋</button>
          </div>
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label"><span>👁 透明度</span><span class="gn-mono" data-gn-val="opacity">${curOpacity}%</span></div>
          <input type="range" class="gn-range" min="35" max="100" step="5" value="${curOpacity}" data-gn-range="opacity" />
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label">
            <span>🎨 默认皮肤</span>
            <span style="font-size:10px;opacity:.65;">${curSkin === 'heterochromia' ? '粉金异瞳' : '经典紫瞳'}</span>
          </div>
          <div class="gn-chip-row">
            ${[
              ['purple', '💜 经典紫瞳'],
              ['heterochromia', '💗💛 粉金异瞳']
            ].map(([id, lbl]) => `<button type="button" class="gn-chip ${curSkin === id ? 'is-active' : ''}" data-gn-skin="${id}">${lbl}</button>`).join('')}
          </div>
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label">
            <span>🖼️ 自定义形象</span>
            ${hasCustomFrame ? `<button type="button" class="gn-chip" data-gn-pet="reset-frames">↺ 恢复默认</button>` : `<span style="font-size:10px;opacity:.65;">当前: 默认 ${curSkin === 'heterochromia' ? '异瞳猫娘' : '紫瞳猫娘'}</span>`}
          </div>
          <div class="gn-chip-row">
            <button type="button" class="gn-chip ${cf.idle ? 'is-active' : ''}" data-gn-pick-frame="idle">更改主形象${cf.idle ? ' ✓' : ''}</button>
            <button type="button" class="gn-chip ${cf.eat ? 'is-active' : ''}" data-gn-pick-frame="eat">思考差分${cf.eat ? ' ✓' : ''}</button>
            <button type="button" class="gn-chip ${cf.xd ? 'is-active' : ''}" data-gn-pick-frame="xd">戳一戳差分${cf.xd ? ' ✓' : ''}</button>
            <button type="button" class="gn-chip ${cf.grin ? 'is-active' : ''}" data-gn-pick-frame="grin">彩蛋差分${cf.grin ? ' ✓' : ''}</button>
            <button type="button" class="gn-chip ${cf.wait ? 'is-active' : ''}" data-gn-pick-frame="wait">确认差分${cf.wait ? ' ✓' : ''}</button>
          </div>
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label">
            <span>💬 自定义气泡对话</span>
            <span style="font-size:10px;opacity:.65;">已添加 ${customDialogues.length} 条</span>
          </div>
          <div class="gn-input-row">
            <input id="gn-custom-dialogue-input" type="text" class="gn-text-input" maxlength="120" placeholder="输入自定义气泡台词（支持 {quota_5h} {ctx_pct}）" />
            <button type="button" class="gn-chip is-active" data-gn-pet="add-dialogue">+ 添加对话</button>
          </div>
          ${customDialogues.length > 0 ? `
            <div class="gn-dialogue-list">
              ${customDialogues.map((line, i) => `
                <div class="gn-dialogue-item">
                  <span title="${esc(line)}">${esc(line)}</span>
                  <button type="button" class="gn-del-btn" data-gn-del-dialogue="${i}" title="删除">×</button>
                </div>
              `).join('')}
            </div>
          ` : '<div style="font-size:10px;opacity:.6;margin-top:4px;">添加后在第二次左键单击气泡时随机出现</div>'}
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label">
            <span>🔊 戳一下声音</span>
            <button type="button" class="gn-chip ${hud.prefs.soundEnabled ? 'is-active' : ''}" data-gn-pet="toggle-sound">${hud.prefs.soundEnabled ? '已开启' : '已静音'}</button>
          </div>
          <div class="gn-chip-row" style="margin-bottom:6px;">
            ${[
              ['boing', 'Q弹叮咚'],
              ['nya', '软萌喵呜'],
              ['duck', '小黄鸭'],
              ['custom', '自定义']
            ].map(([id, lbl]) => `<button type="button" class="gn-chip ${curSet === id ? 'is-active' : ''}" data-gn-soundset="${id}">${lbl}</button>`).join('')}
          </div>
          <div class="gn-set-label"><span style="font-size:10.5px;opacity:.8;">音量</span><span class="gn-mono" data-gn-val="volume">${curVol}%</span></div>
          <input type="range" class="gn-range" min="0" max="100" step="5" value="${curVol}" data-gn-range="volume" />
          <div class="gn-card-actions" style="margin-top:6px;">
            <button type="button" class="gn-btn" data-gn-pet="test-sound">▶ 试听</button>
            <button type="button" class="gn-btn" data-gn-pet="pick-audio">🎵 选本地音频</button>
          </div>
          ${curSet === 'custom' ? `<div style="font-size:10px;opacity:.75;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">当前自定义: ${esc(customLabel)}</div>` : ''}
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label">
            <span>📊 输入框下方统计栏</span>
            <button type="button" class="gn-chip ${hud.prefs.showStatsBar !== false ? 'is-active' : ''}" data-gn-pet="toggle-statsbar">${hud.prefs.showStatsBar !== false ? '显示中' : '已隐藏'}</button>
          </div>
          <div class="gn-set-label" style="margin-top:4px;">
            <span>⚠️ 审查/确认提醒</span>
            <button type="button" class="gn-chip ${hud.prefs.reviewAlertEnabled !== false ? 'is-active' : ''}" data-gn-pet="toggle-review-alert">${hud.prefs.reviewAlertEnabled !== false ? '已开启' : '已关闭'}</button>
          </div>
          <div class="gn-set-label" style="margin-top:4px;">
            <span>🔔 确认提醒音效</span>
            <button type="button" class="gn-chip ${hud.prefs.reviewAlertSound !== false ? 'is-active' : ''}" data-gn-pet="toggle-review-sound">${hud.prefs.reviewAlertSound !== false ? '已开启' : '已关闭'}</button>
          </div>
          <div class="gn-set-label" style="margin-top:4px;">
            <span>💬 对话完成额度气泡 (10s)</span>
            <button type="button" class="gn-chip ${hud.prefs.turnCostBubble !== false ? 'is-active' : ''}" data-gn-pet="toggle-turn-bubble">${hud.prefs.turnCostBubble !== false ? '已开启' : '已关闭'}</button>
          </div>
          <div class="gn-set-label" style="margin-top:4px;">
            <span>😄 思考完呲牙笑彩蛋</span>
            <button type="button" class="gn-chip ${hud.prefs.completionEasterEgg !== false ? 'is-active' : ''}" data-gn-pet="toggle-easter">${hud.prefs.completionEasterEgg !== false ? '已开启' : '已关闭'}</button>
          </div>
          <div class="gn-set-label" style="margin-top:4px;">
            <span>🔔 思考完提示音</span>
            <button type="button" class="gn-chip ${hud.prefs.completionSound ? 'is-active' : ''}" data-gn-pet="toggle-done-sound">${hud.prefs.completionSound ? '已开启' : '已关闭'}</button>
          </div>
        </div>

        <div class="gn-set-row">
          <div class="gn-set-label"><span>📍 贴边停靠角落 (支持直接拖拽)</span></div>
          <div class="gn-chip-row">
            ${[
              ['bottom-right', '右下角'],
              ['bottom-left', '左下角'],
              ['top-right', '右上角'],
              ['top-left', '左上角']
            ].map(([k, lbl]) => `<button type="button" class="gn-chip ${curCorner === k ? 'is-active' : ''}" data-gn-corner="${k}">${lbl}</button>`).join('')}
          </div>
        </div>
      `;
    }

    function applyBuiltinSkinFrames(skinId) {
      const skin = skinId === 'heterochromia' ? 'heterochromia' : 'purple';
      const skinMap = (hud.builtinSkins && hud.builtinSkins[skin]) || {};
      const fallbackMap = (hud.builtinSkins && hud.builtinSkins.purple) || {};
      const cf = hud.prefs.customFrames || {};
      for (const k of ['idle', 'eat', 'grin', 'xd', 'wait']) {
        const defSrc = skinMap[k] || fallbackMap[k] || hud.defaultFrames[k] || '';
        if (defSrc) hud.defaultFrames[k] = defSrc;
        if (!cf[k] && defSrc) {
          hud.frames[k] = defSrc;
        }
      }
      updatePetFrameSrcs();
    }

    function updatePetFrameSrcs() {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      const imgs = root.querySelectorAll('.gn-frame');
      for (const img of imgs) {
        const k = img.getAttribute('data-frame');
        const src = hud.frames[k] || hud.frames.idle || hud.defaultFrames[k] || hud.defaultFrames.idle || '';
        if (src && img.getAttribute('src') !== src) {
          img.setAttribute('src', src);
        }
      }
    }

    function updatePetWidget() {
      const root = document.getElementById(IDS.petRoot);
      if (!root) return;
      syncReviewAlertState();
      syncThinkingTransition();
      updatePetPoseDom();
      if (hud.bubbleStage > 0) {
        renderThoughtBubbleContent(false);
      }
      if (hud.panelMode === 'card') {
        renderTelemetryCard();
      }
    }

    function mountPetWidget() {
      if (hud.prefs.enabled === false) {
        const old = document.getElementById(IDS.petRoot);
        if (old) old.remove();
        return;
      }
      if (document.getElementById(IDS.petRoot) || !document.body) return;

      const root = document.createElement('div');
      root.id = IDS.petRoot;
      root.setAttribute('data-pose', 'idle');

      const frameKeys = ['idle', 'eat', 'grin', 'xd', 'wait'];
      const framesHtml = frameKeys.map((k) => {
        const src = hud.frames[k] || hud.frames.idle || hud.defaultFrames[k] || hud.defaultFrames.idle || '';
        return `<img class="gn-frame ${k === 'idle' ? 'is-active' : ''}" data-frame="${k}" alt="Gemini Neko ${k}" draggable="false" ${src ? `src="${src}"` : ''} />`;
      }).join('');

      root.innerHTML = `
        <div class="gn-stage">
          <div class="gn-thought-wrap">
            <svg class="gn-thought-svg" viewBox="0 0 222 152" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <ellipse cx="111" cy="57" rx="102" ry="50" fill="#ffffff" fill-opacity="0.96" stroke="#293978" stroke-width="4" />
              <ellipse cx="150" cy="116" rx="11" ry="7.5" fill="#ffffff" fill-opacity="0.96" stroke="#293978" stroke-width="3.2" />
              <ellipse cx="168" cy="134" rx="7" ry="5" fill="#ffffff" fill-opacity="0.96" stroke="#293978" stroke-width="3" />
            </svg>
            <div class="gn-thought-hit"></div>
          </div>

          <div class="gn-panel"></div>

          <div class="gn-avatar-btn" role="button" aria-label="Gemini 猫娘挂件" title="">
            <div class="gn-avatar-flip">
              <div class="gn-avatar-anim">
                ${framesHtml}
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(root);
      applyPetPositionFromAnchor();

      const avatarBtn = root.querySelector('.gn-avatar-btn');
      const thoughtHit = root.querySelector('.gn-thought-hit');

      // Right-click on character toggles Image 4 telemetry card (with standalone Settings button)
      avatarBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hud.panelMode) {
          hud.panelMode = '';
        } else {
          hud.panelMode = 'card';
          refreshTelemetry(true);
        }
        syncPanelVisibility();
      });

      // Bubble left-click: Stage 1 -> Stage 2 (dialogue) -> Close
      if (thoughtHit) {
        thoughtHit.addEventListener('click', (e) => {
          handleBubbleLeftClick(e);
        });
      }

      // Pointer drag + quarter-edge snap (flush 0px!) + Q-elastic press/poke
      let drag = null;

      avatarBtn.addEventListener('focus', () => {
        try { avatarBtn.blur(); } catch {}
      });

      avatarBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const r = root.getBoundingClientRect();
        drag = {
          id: e.pointerId,
          sx: e.clientX,
          sy: e.clientY,
          ox: r.left,
          oy: r.top,
          moved: false,
          t: Date.now()
        };
        avatarBtn.classList.add('is-pressed');
        try { avatarBtn.setPointerCapture(e.pointerId); } catch {}
        playPressSound();
      });

      avatarBtn.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
        if (!drag.moved && dx * dx + dy * dy >= 16) {
          drag.moved = true;
          avatarBtn.classList.remove('is-pressed');
          root.classList.add('is-dragging');
        }
        if (!drag.moved) return;
        setPetLeftTop(drag.ox + dx, drag.oy + dy);
      });

      function finishDragOrPoke(e, canceled) {
        if (!drag || e.pointerId !== drag.id) return;
        const curDrag = drag;
        drag = null;
        avatarBtn.classList.remove('is-pressed');
        root.classList.remove('is-dragging');
        try { avatarBtn.releasePointerCapture(e.pointerId); } catch {}
        if (canceled) return;

        if (!curDrag.moved && Date.now() - curDrag.t < 750) {
          handleCharacterLeftClick(e);
          return;
        }

        // Quarter-region edge snap flush to viewport border (0px on left/right/bottom)
        const vw = Math.max(200, window.innerWidth || 1280);
        const vh = Math.max(200, window.innerHeight || 800);
        const sz = hud.prefs.size || 112;
        const r = root.getBoundingClientRect();
        const cx = r.left + sz / 2;
        const cy = r.top + sz / 2;

        let targetL = r.left;
        let targetT = r.top;
        if (cx < vw * 0.25) targetL = 0;
        else if (cx > vw * 0.75) targetL = vw - sz;

        if (cy < vh * 0.25) targetT = 36;
        else if (cy > vh * 0.75) targetT = vh - sz;

        const finalPos = setPetLeftTop(targetL, targetT) || { left: targetL, top: targetT };
        const newAnchor = computeAnchorFromRect(finalPos.left, finalPos.top, sz);
        savePrefsPatch({ anchor: newAnchor });
      }

      avatarBtn.addEventListener('pointerup', (e) => finishDragOrPoke(e, false));
      avatarBtn.addEventListener('pointercancel', (e) => finishDragOrPoke(e, true));

      function addCustomDialogueFromInput() {
        const inp = root.querySelector('#gn-custom-dialogue-input');
        if (!inp) return;
        const text = String(inp.value || '').trim().slice(0, 120);
        if (!text) return;
        const prev = Array.isArray(hud.prefs.customDialogues) ? hud.prefs.customDialogues : [];
        if (prev.includes(text)) {
          inp.value = '';
          return;
        }
        const next = [text, ...prev].slice(0, 60);
        savePrefsPatch({ customDialogues: next }).then(() => {
          renderSettingsPanel();
        });
      }

      // Click handlers inside right-click card & settings panel
      root.addEventListener('click', (e) => {
        const actEl = e.target && e.target.closest ? e.target.closest('[data-gn-pet]') : null;
        if (actEl) {
          e.stopPropagation();
          const act = actEl.getAttribute('data-gn-pet');
          if (act === 'close-panel') {
            hud.panelMode = '';
            syncPanelVisibility();
          } else if (act === 'open-settings') {
            hud.panelMode = 'settings';
            syncPanelVisibility();
          } else if (act === 'back-card') {
            hud.panelMode = 'card';
            syncPanelVisibility();
          } else if (act === 'open-observer') {
            hud.panelMode = '';
            syncPanelVisibility();
            openObserverModal();
          } else if (act === 'open-daily-tokens') {
            hud.panelMode = 'daily';
            hud.dailySelectedDate = '';
            syncPanelVisibility();
            loadDailyHeatmapData(true);
          } else if (act === 'open-daily-modal') {
            hud.panelMode = '';
            syncPanelVisibility();
            openDailyTokensModal();
          } else if (act === 'refresh-daily') {
            loadDailyHeatmapData(true);
          } else if (act === 'refresh') {
            refreshTelemetry(true);
          } else if (act === 'add-dialogue') {
            addCustomDialogueFromInput();
          } else if (act === 'reset-frames') {
            ipcRenderer.invoke('neko-hud:reset-frames', '').then((res) => {
              if (res && res.ok) {
                if (res.prefs) hud.prefs = { ...hud.prefs, ...res.prefs };
                if (res.defaultFrames) hud.defaultFrames = res.defaultFrames;
                if (res.builtinSkins) hud.builtinSkins = res.builtinSkins;
                if (res.frames) hud.frames = res.frames;
                updatePetFrameSrcs();
                renderSettingsPanel();
              }
            }).catch(() => {});
          } else if (act === 'toggle-sound') {
            const next = !hud.prefs.soundEnabled;
            savePrefsPatch({ soundEnabled: next });
            if (next) warmActiveSounds();
            else suspendAudioNow();
            renderSettingsPanel();
          } else if (act === 'test-sound') {
            if (!hud.prefs.soundEnabled) savePrefsPatch({ soundEnabled: true });
            warmActiveSounds();
            playPokeReleaseSound(false);
          } else if (act === 'pick-audio') {
            ipcRenderer.invoke('neko-hud:pick-audio').then((res) => {
              if (res && res.ok) {
                if (res.prefs) hud.prefs = { ...hud.prefs, ...res.prefs };
                if (res.customAudio) {
                  hud.customAudio = res.customAudio;
                  delete decodedAudio.custom;
                  delete decodingAudio.custom;
                  warmActiveSounds();
                  playPokeReleaseSound(false);
                }
                renderSettingsPanel();
              }
            }).catch(() => {});
          } else if (act === 'toggle-statsbar') {
            savePrefsPatch({ showStatsBar: hud.prefs.showStatsBar === false });
            mountStatsBarOnly();
            updateStatsBar();
            renderSettingsPanel();
          } else if (act === 'toggle-review-alert') {
            savePrefsPatch({ reviewAlertEnabled: hud.prefs.reviewAlertEnabled === false });
            syncReviewAlertState();
            updatePetPoseDom();
            renderSettingsPanel();
          } else if (act === 'toggle-review-sound') {
            const next = hud.prefs.reviewAlertSound === false;
            savePrefsPatch({ reviewAlertSound: next });
            if (next) {
              warmActiveSounds();
              playReviewAlertSound();
            }
            renderSettingsPanel();
          } else if (act === 'toggle-turn-bubble') {
            savePrefsPatch({ turnCostBubble: hud.prefs.turnCostBubble === false });
            renderSettingsPanel();
          } else if (act === 'toggle-easter') {
            savePrefsPatch({ completionEasterEgg: hud.prefs.completionEasterEgg === false });
            renderSettingsPanel();
          } else if (act === 'toggle-done-sound') {
            savePrefsPatch({ completionSound: !hud.prefs.completionSound });
            renderSettingsPanel();
          }
          return;
        }

        const ghCellEl = e.target && e.target.closest ? e.target.closest('[data-gn-gh-date]') : null;
        if (ghCellEl) {
          e.stopPropagation();
          const dk = ghCellEl.getAttribute('data-gn-gh-date');
          if (dk) updateDailyHeatmapSelection(dk);
          return;
        }

        const bubbleSizeEl = e.target && e.target.closest ? e.target.closest('[data-gn-bubble-size]') : null;
        if (bubbleSizeEl) {
          e.stopPropagation();
          const nextScale = Math.max(0.65, Math.min(1.6, Math.round(Number(bubbleSizeEl.getAttribute('data-gn-bubble-size')) * 100) / 100));
          savePrefsPatch({ bubbleScale: nextScale });
          renderSettingsPanel();
          return;
        }

        const bubbleStepEl = e.target && e.target.closest ? e.target.closest('[data-gn-bubble-step]') : null;
        if (bubbleStepEl) {
          e.stopPropagation();
          const cur = Math.max(0.65, Math.min(1.6, Number(hud.prefs.bubbleScale) || 1));
          const delta = Number(bubbleStepEl.getAttribute('data-gn-bubble-step')) || 0;
          const nextScale = Math.max(0.65, Math.min(1.6, Math.round((cur + delta) * 100) / 100));
          savePrefsPatch({ bubbleScale: nextScale });
          renderSettingsPanel();
          return;
        }

        const pickFrameEl = e.target && e.target.closest ? e.target.closest('[data-gn-pick-frame]') : null;
        if (pickFrameEl) {
          e.stopPropagation();
          const fKey = pickFrameEl.getAttribute('data-gn-pick-frame');
          ipcRenderer.invoke('neko-hud:pick-frame', fKey).then((res) => {
            if (res && res.ok) {
              if (res.prefs) hud.prefs = { ...hud.prefs, ...res.prefs };
              if (res.frameKey && res.dataUrl) {
                hud.frames[res.frameKey] = res.dataUrl;
                updatePetFrameSrcs();
              }
              renderSettingsPanel();
            }
          }).catch(() => {});
          return;
        }

        const delDlgEl = e.target && e.target.closest ? e.target.closest('[data-gn-del-dialogue]') : null;
        if (delDlgEl) {
          e.stopPropagation();
          const idx = Number(delDlgEl.getAttribute('data-gn-del-dialogue'));
          const prev = Array.isArray(hud.prefs.customDialogues) ? hud.prefs.customDialogues : [];
          if (Number.isInteger(idx) && idx >= 0 && idx < prev.length) {
            const next = prev.filter((_, i) => i !== idx);
            savePrefsPatch({ customDialogues: next }).then(() => {
              renderSettingsPanel();
            });
          }
          return;
        }

        const skinEl = e.target && e.target.closest ? e.target.closest('[data-gn-skin]') : null;
        if (skinEl) {
          e.stopPropagation();
          const nextSkin = skinEl.getAttribute('data-gn-skin') === 'heterochromia' ? 'heterochromia' : 'purple';
          hud.prefs.skin = nextSkin;
          applyBuiltinSkinFrames(nextSkin);
          savePrefsPatch({ skin: nextSkin });
          renderSettingsPanel();
          return;
        }

        const setEl = e.target && e.target.closest ? e.target.closest('[data-gn-soundset]') : null;
        if (setEl) {
          e.stopPropagation();
          const set = setEl.getAttribute('data-gn-soundset');
          savePrefsPatch({ soundSet: set, soundEnabled: true });
          warmActiveSounds();
          playPokeReleaseSound(false);
          renderSettingsPanel();
          return;
        }

        const cornerEl = e.target && e.target.closest ? e.target.closest('[data-gn-corner]') : null;
        if (cornerEl) {
          e.stopPropagation();
          const key = cornerEl.getAttribute('data-gn-corner');
          const [vAnchor, hAnchor] = key.split('-');
          const anchor = {
            v: 2,
            hAnchor: hAnchor === 'left' ? 'left' : 'right',
            hDist: 0,
            vAnchor: vAnchor === 'top' ? 'top' : 'bottom',
            vDist: vAnchor === 'top' ? 36 : 0
          };
          savePrefsPatch({ anchor });
          renderSettingsPanel();
        }
      });

      root.addEventListener('mouseover', (e) => {
        if (hud.panelMode !== 'daily') return;
        const ghCellEl = e.target && e.target.closest ? e.target.closest('[data-gn-gh-date]') : null;
        if (ghCellEl) {
          const dk = ghCellEl.getAttribute('data-gn-gh-date');
          if (dk && dk !== hud.dailySelectedDate) {
            updateDailyHeatmapSelection(dk);
          }
        }
      });

      // Handle Enter inside custom dialogue input
      root.addEventListener('keydown', (e) => {
        if (e.target && e.target.id === 'gn-custom-dialogue-input') {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            addCustomDialogueFromInput();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            hud.panelMode = '';
            syncPanelVisibility();
          }
        }
      });

      // Live slider input without CSS transition jitter
      root.addEventListener('input', (e) => {
        const range = e.target && e.target.closest ? e.target.closest('[data-gn-range]') : null;
        if (!range) return;
        const kind = range.getAttribute('data-gn-range');
        const val = Number(range.value);
        if (kind === 'size') {
          root.classList.add('is-resizing');
          hud.prefs.size = val;
          const lbl = root.querySelector('[data-gn-val="size"]');
          if (lbl) lbl.textContent = `${val}px`;
          applyPetPositionFromAnchor();
        } else if (kind === 'opacity') {
          hud.prefs.opacity = Math.round(val) / 100;
          const lbl = root.querySelector('[data-gn-val="opacity"]');
          if (lbl) lbl.textContent = `${val}%`;
          applyPetPositionFromAnchor();
        } else if (kind === 'volume') {
          hud.prefs.volume = Math.round(val) / 100;
          const lbl = root.querySelector('[data-gn-val="volume"]');
          if (lbl) lbl.textContent = `${val}%`;
        }
      });

      root.addEventListener('change', (e) => {
        const range = e.target && e.target.closest ? e.target.closest('[data-gn-range]') : null;
        if (!range) return;
        root.classList.remove('is-resizing');
        const kind = range.getAttribute('data-gn-range');
        const val = Number(range.value);
        if (kind === 'size') {
          savePrefsPatch({ size: val });
        } else if (kind === 'opacity') {
          savePrefsPatch({ opacity: Math.round(val) / 100 });
        } else if (kind === 'volume') {
          savePrefsPatch({ volume: Math.round(val) / 100 });
        }
      });

      updatePetWidget();
    }

    // ---- Component B: In-Window Context Observer Modal ----
    function ensureObserverModal() {
      let modal = document.getElementById(IDS.modal);
      if (modal || !document.body) return modal;
      modal = document.createElement('div');
      modal.id = IDS.modal;
      modal.innerHTML = `
        <div class="gn-modal-card">
          <div class="gn-modal-head">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
              <span style="font-size:15px;font-weight:800;white-space:nowrap;">✦ 反重力上下文观察窗口</span>
              <select id="gn-conv-select" style="max-width:300px;padding:4px 8px;border-radius:8px;border:1px solid rgba(148,163,184,.35);background:transparent;color:inherit;font-size:12px;"></select>
            </div>
            <button type="button" class="gn-chip" data-gn-close-modal="1" style="font-size:14px;padding:4px 10px;">关闭 ×</button>
          </div>
          <div class="gn-modal-body" id="gn-modal-body"></div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-gn-close-modal]')) {
          closeObserverModal();
        }
      });
      modal.addEventListener('change', (e) => {
        const sel = e.target.closest('#gn-conv-select');
        if (sel) {
          hud.modalConvId = sel.value || '';
          if (hud.modalConvId) {
            loadObserverBreakdown(hud.modalConvId);
          } else {
            hud.modalBreakdown = null;
            renderObserverModal();
          }
        }
      });
      document.body.appendChild(modal);
      return modal;
    }

    async function loadObserverBreakdown(convId) {
      if (!convId) {
        hud.modalBreakdown = null;
        renderObserverModal();
        return;
      }
      hud.modalBreakdown = null;
      renderObserverModal();
      try {
        const bd = await ipcRenderer.invoke('neko-hud:get-breakdown', convId);
        if (hud.modalConvId === convId) {
          hud.modalBreakdown = bd;
        }
      } catch {}
      renderObserverModal();
    }

    async function openObserverModal() {
      if (hud.dailyModalOpen) closeDailyTokensModal();
      const modal = ensureObserverModal();
      if (!modal) return;
      syncActiveConversation();
      hud.modalOpen = true;
      modal.classList.add('is-open');
      const activeId = detectActiveConvId();
      hud.modalConvId = activeId;
      hud.modalBreakdown = null;
      renderObserverModal();
      try {
        const [list] = await Promise.all([
          ipcRenderer.invoke('neko-hud:list-conversations').catch(() => []),
          refreshTelemetry(true)
        ]);
        hud.modalConvList = Array.isArray(list) ? list : [];
      } catch {}
      const latestId = detectActiveConvId();
      if (!hud.modalConvId || hud.modalConvId === latestId) {
        hud.modalConvId = latestId;
      }
      if (hud.modalConvId) {
        await loadObserverBreakdown(hud.modalConvId);
      } else {
        renderObserverModal();
      }
    }

    function closeObserverModal() {
      hud.modalOpen = false;
      const modal = document.getElementById(IDS.modal);
      if (modal) modal.classList.remove('is-open');
    }

    function renderObserverModal() {
      const modal = document.getElementById(IDS.modal);
      if (!modal || !hud.modalOpen) return;
      const stateConv = hud.state && hud.state.conv;
      const modalConv = (stateConv && hud.modalConvId && String(stateConv.id || '').toLowerCase() === String(hud.modalConvId).toLowerCase())
        ? stateConv
        : null;
      const bd = (hud.modalBreakdown && (!hud.modalConvId || !hud.modalBreakdown.id || String(hud.modalBreakdown.id).toLowerCase() === String(hud.modalConvId).toLowerCase()))
        ? hud.modalBreakdown
        : null;
      const quota = hud.state && hud.state.quota;
      const groups = (quota && Array.isArray(quota.groups)) ? quota.groups : [];

      const curTok = (bd && bd.currentTokens) || (modalConv && modalConv.contextTokens) || 0;
      const maxTok = (bd && bd.observedCeiling) || (modalConv && modalConv.contextMaxTokens) || 0;
      const pct = maxTok > 0 ? Math.min(100, Math.round((curTok / maxTok) * 1000) / 10) : 0;
      const srvGroups = (bd && bd.serverTokenBreakdown && bd.serverTokenBreakdown.groups) || (modalConv && modalConv.tokenBreakdown && modalConv.tokenBreakdown.groups) || [];
      const cats = (bd && Array.isArray(bd.categories)) ? bd.categories : [];
      const skills = (bd && Array.isArray(bd.activeSkills)) ? bd.activeSkills : [];
      const heavy = (bd && Array.isArray(bd.heaviestSteps)) ? bd.heaviestSteps : [];
      const topFiles = (bd && Array.isArray(bd.topFiles)) ? bd.topFiles : [];
      const hasExactMatch = Boolean(hud.modalConvId && hud.modalConvList.some((c) => c.id === hud.modalConvId));
      const convOptsList = [];
      if (!hud.modalConvId) {
        convOptsList.push(`<option value="" selected>当前新对话 (暂无会话记录)</option>`);
      } else if (!hasExactMatch) {
        convOptsList.push(`<option value="${esc(hud.modalConvId)}" selected>${esc((modalConv && modalConv.title) || '当前对话 (' + hud.modalConvId.slice(0, 8) + ')')}</option>`);
      }
      for (const c of hud.modalConvList) {
        convOptsList.push(`<option value="${esc(c.id)}" ${c.id === hud.modalConvId ? 'selected' : ''}>${esc(c.title)} (${c.rounds}轮 ${c.steps}步${c.contextPct !== null ? ' · ' + c.contextPct + '%' : ''})</option>`);
      }
      const convOpts = convOptsList.join('');

      const selEl = modal.querySelector('#gn-conv-select');
      const bodyEl = modal.querySelector('.gn-modal-body');
      if (selEl) {
        if (selEl.__gnOptsHtml !== convOpts) {
          selEl.__gnOptsHtml = convOpts;
          selEl.innerHTML = convOpts;
        }
        if (selEl.value !== (hud.modalConvId || '')) {
          selEl.value = hud.modalConvId || '';
        }
      }

      const rawHit = (bd && bd.cacheHitPct !== undefined) ? bd.cacheHitPct : (modalConv ? modalConv.cacheHitPct : null);
      const hitText = rawHit !== null && rawHit !== undefined ? `${rawHit}%` : '—';

      const bodyHtml = `
        <div class="gn-stat-cards">
          <div class="gn-box">
            <div class="gn-kv-k">轮次 / 步数</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;">${(bd && bd.rounds) ?? (modalConv && modalConv.rounds) ?? 0} 轮 ${(bd && bd.steps) ?? (modalConv && modalConv.steps) ?? 0} 步</div>
          </div>
          <div class="gn-box">
            <div class="gn-kv-k">上下文占用</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;color:${pctColor(pct, false)};">${fmtTok(curTok)} / ${maxTok ? fmtTok(maxTok) : '?'} (${pct}%)</div>
          </div>
          <div class="gn-box">
            <div class="gn-kv-k">精准缓存命中率</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;color:#38bdf8;">${hitText}</div>
          </div>
          <div class="gn-box">
            <div class="gn-kv-k">实时生成速度</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;">${((bd && bd.tokPerSec) || (modalConv && modalConv.tokPerSec) || 0)} tok/s</div>
          </div>
        </div>

        ${srvGroups.length > 0 ? `
          <div class="gn-box">
            <div class="gn-box-title"><span>🧠 服务端上下文精准构成 (Language Server)</span><span class="gn-mono">${fmtTok(curTok)} tok</span></div>
            ${srvGroups.map((g) => {
              const gp = curTok > 0 ? Math.min(100, Math.round((g.numTokens / curTok) * 1000) / 10) : 0;
              return `
                <div class="gn-bar-row">
                  <div class="gn-bar-meta"><span>${esc(g.name)}</span><span class="gn-mono">${fmtTok(g.numTokens)} tok (${gp}%)</span></div>
                  <div class="gn-bar-track"><div class="gn-bar-fill" style="width:${Math.max(2, gp)}%;background:#8b5cf6;"></div></div>
                </div>`;
            }).join('')}
          </div>
        ` : ''}

        ${groups.length > 0 ? `
          <div class="gn-box">
            <div class="gn-box-title"><span>⚡ 模型额度与重置时间</span><span style="font-size:11px;opacity:.75;">${esc((modalConv && modalConv.modelLabel) || '')}</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
              ${groups.map((g) => `
                <div style="padding:8px;border-radius:8px;background:rgba(148,163,184,.08);">
                  <div style="font-size:11.5px;font-weight:700;margin-bottom:5px;">${esc(g.label)}</div>
                  ${(g.buckets || []).map((b) => {
                    const rem = b.remainingPct ?? 0;
                    const col = pctColor(rem, true);
                    return `
                      <div class="gn-bar-row">
                        <div class="gn-bar-meta"><span>${esc(b.windowLabel)}</span><span class="gn-mono" style="color:${col};">${rem}%</span></div>
                        <div class="gn-bar-track"><div class="gn-bar-fill" style="width:${Math.max(2, rem)}%;background:${col};"></div></div>
                        <div style="font-size:9.5px;opacity:.6;text-align:right;">${esc(fmtResetCountdown(b.resetMs || b.resetAtIso || b.resetAtMs))}</div>
                      </div>`;
                  }).join('')}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;">
          <div class="gn-box">
            <div class="gn-box-title"><span>🛠 活跃窗口工具消耗</span></div>
            ${cats.length > 0 ? cats.map((c) => `
              <div class="gn-row-line">
                <span>${esc(c.label)} (${c.count})</span>
                <span class="gn-mono" style="opacity:.85;">~${fmtTok(c.estTokens)} tok</span>
              </div>
            `).join('') : '<div style="font-size:11.5px;opacity:.6;">等待 sidecar 详细拆解或暂无工具调用</div>'}
          </div>

          <div class="gn-box">
            <div class="gn-box-title"><span>📚 已加载技能与压缩状态</span><span>压缩 ${(bd && bd.compactCount) ?? (modalConv && modalConv.compactions) ?? 0} 次</span></div>
            ${skills.length > 0 ? skills.map((s) => `
              <div class="gn-row-line"><span>${esc(s.name)}</span><span class="gn-mono">~${fmtTok(s.estTokens)} tok</span></div>
            `).join('') : '<div style="font-size:11.5px;opacity:.6;">当前窗口未额外加载 SKILL.md</div>'}
          </div>
        </div>

        ${heavy.length > 0 ? `
          <div class="gn-box">
            <div class="gn-box-title"><span>🏋 最重步骤 Top 5</span></div>
            ${heavy.map((s, i) => `
              <div class="gn-row-line">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">#${i + 1} [${esc(s.tool)}] ${esc(s.target)}</span>
                <span class="gn-mono" style="flex-shrink:0;">~${fmtTok(s.estTokens)} tok</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${topFiles.length > 0 ? `
          <div class="gn-box">
            <div class="gn-box-title"><span>📄 高频读写文件</span></div>
            ${topFiles.map((f) => `
              <div class="gn-row-line">
                <span class="gn-mono" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f.label)} (读${f.readCount}/写${f.editCount})</span>
                <span class="gn-mono" style="flex-shrink:0;">~${fmtTok(f.estTokens)} tok</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="font-size:11px;opacity:.68;display:flex;justify-content:space-between;align-items:center;">
          <span>提示：也可在右上角扩展 / Sidecar 面板打开完整「反重力观察窗」侧栏（按 Esc 关闭本窗口）。</span>
          <span class="gn-mono">总输入 ${fmtTok((bd && bd.totalInputTokens) ?? (modalConv && modalConv.inputTokens) ?? 0)} · 缓存 ${fmtTok((bd && bd.totalCacheReadTokens) ?? (modalConv && modalConv.cacheReadTokens) ?? 0)} · 输出 ${fmtTok((bd && bd.totalOutputTokens) ?? (modalConv && modalConv.outputTokens) ?? 0)}</span>
        </div>
      `;

      if (bodyEl && bodyEl.__gnBodyHtml !== bodyHtml) {
        const prevScrollTop = bodyEl.scrollTop || 0;
        bodyEl.__gnBodyHtml = bodyHtml;
        bodyEl.innerHTML = bodyHtml;
        bodyEl.scrollTop = prevScrollTop;
      }
    }

    // ---- Component C: Daily Token Usage Modal ----
    function ensureDailyTokensModal() {
      let modal = document.getElementById(IDS.dailyModal);
      if (modal || !document.body) return modal;
      modal = document.createElement('div');
      modal.id = IDS.dailyModal;
      modal.innerHTML = `
        <div class="gn-modal-card">
          <div class="gn-modal-head">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;flex-wrap:wrap;">
              <span style="font-size:15px;font-weight:800;white-space:nowrap;">📅 每日 Token 使用量</span>
              <div style="display:flex;align-items:center;gap:4px;">
                <button type="button" class="gn-chip" data-gn-daily-days="7">近 7 天</button>
                <button type="button" class="gn-chip" data-gn-daily-days="14">近 14 天</button>
                <button type="button" class="gn-chip" data-gn-daily-days="30">近 30 天</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="gn-chip" data-gn-daily-refresh="1">🔄 刷新</button>
              <button type="button" class="gn-chip" data-gn-close-daily="1" style="font-size:14px;padding:4px 10px;">关闭 ×</button>
            </div>
          </div>
          <div class="gn-modal-body" id="gn-daily-modal-body"></div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-gn-close-daily]')) {
          closeDailyTokensModal();
          return;
        }
        const rangeBtn = e.target.closest('[data-gn-daily-days]');
        if (rangeBtn) {
          const nextDays = Number(rangeBtn.getAttribute('data-gn-daily-days')) || 14;
          if (nextDays !== hud.dailyDays) {
            hud.dailyDays = nextDays;
            loadDailyTokensData(false);
          }
          return;
        }
        if (e.target.closest('[data-gn-daily-refresh]')) {
          loadDailyTokensData(true);
        }
      });
      document.body.appendChild(modal);
      return modal;
    }

    async function loadDailyTokensData(forceRefresh = false) {
      const reqDays = hud.dailyDays || 14;
      const seq = ++hud.dailyModalSeq;
      hud.dailyLoading = true;
      renderDailyTokensModal();
      try {
        const res = await ipcRenderer.invoke('neko-hud:get-daily-tokens', reqDays, Boolean(forceRefresh));
        if (seq === hud.dailyModalSeq && hud.dailyDays === reqDays && res && res.ok) {
          hud.dailyData = res;
        }
      } catch {} finally {
        if (seq === hud.dailyModalSeq) {
          hud.dailyLoading = false;
          renderDailyTokensModal();
        }
      }
    }

    async function openDailyTokensModal() {
      if (hud.modalOpen) closeObserverModal();
      const modal = ensureDailyTokensModal();
      if (!modal) return;
      hud.dailyModalOpen = true;
      modal.classList.add('is-open');
      renderDailyTokensModal();
      await loadDailyTokensData(true);
    }

    function closeDailyTokensModal() {
      hud.dailyModalOpen = false;
      const modal = document.getElementById(IDS.dailyModal);
      if (modal) modal.classList.remove('is-open');
    }

    function renderDailyTokensModal() {
      const modal = document.getElementById(IDS.dailyModal);
      if (!modal || !hud.dailyModalOpen) return;

      const rangeBtns = modal.querySelectorAll('[data-gn-daily-days]');
      for (const btn of rangeBtns) {
        const d = Number(btn.getAttribute('data-gn-daily-days'));
        btn.classList.toggle('is-active', d === (hud.dailyDays || 14));
      }

      const bodyEl = modal.querySelector('#gn-daily-modal-body');
      if (!bodyEl) return;

      const data = hud.dailyData;
      if (!data) {
        bodyEl.innerHTML = `<div class="gn-box" style="text-align:center;padding:24px 12px;opacity:.78;">${hud.dailyLoading ? '正在统计本地会话的每日 Token 使用量…' : '暂无每日 Token 统计数据'}</div>`;
        return;
      }

      const today = data.today || { totalTokens: 0, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, rounds: 0, conversations: 0 };
      const yesterday = data.yesterday || { totalTokens: 0, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, rounds: 0, conversations: 0 };
      const rs = data.rangeSummary || { days: hud.dailyDays, totalTokens: 0, activeDays: 0, avgPerActiveDay: 0, peakTokens: 0, cacheHitPct: null };
      const all = data.allTimeSummary || { totalTokens: 0, activeDays: 0 };
      const days = Array.isArray(data.days) ? data.days : [];
      const maxDayTokens = Math.max(1, Number(rs.peakTokens) || 0, ...days.map((d) => Number(d.totalTokens) || 0));

      const bodyHtml = `
        <div class="gn-stat-cards">
          <div class="gn-box">
            <div class="gn-kv-k">今日已用 Token</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;color:#a78bfa;">${fmtTok(today.totalTokens)}</div>
            <div class="gn-kv-k" style="margin-top:3px;">${today.conversations || 0} 对话 · ${today.rounds || 0} 轮</div>
          </div>
          <div class="gn-box">
            <div class="gn-kv-k">昨日使用 Token</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;">${fmtTok(yesterday.totalTokens)}</div>
            <div class="gn-kv-k" style="margin-top:3px;">${yesterday.conversations || 0} 对话 · ${yesterday.rounds || 0} 轮</div>
          </div>
          <div class="gn-box">
            <div class="gn-kv-k">近 ${rs.days} 天累计</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;color:#38bdf8;">${fmtTok(rs.totalTokens)}</div>
            <div class="gn-kv-k" style="margin-top:3px;">活跃 ${rs.activeDays}/${rs.days} 天${rs.cacheHitPct !== null ? ` · 命中 ${rs.cacheHitPct}%` : ''}</div>
          </div>
          <div class="gn-box">
            <div class="gn-kv-k">活跃日均消耗</div>
            <div class="gn-kv-v gn-mono" style="font-size:15px;color:#10b981;">${fmtTok(rs.avgPerActiveDay)}</div>
            <div class="gn-kv-k" style="margin-top:3px;">历史总计 ${fmtTok(all.totalTokens)}</div>
          </div>
        </div>

        <div class="gn-box">
          <div class="gn-box-title">
            <span>📆 最近 ${rs.days} 天每日明细${hud.dailyLoading ? ' (同步中…)' : ''}</span>
            <div class="gn-daily-legend">
              <span><i class="gn-daily-dot" style="background:#38bdf8;"></i>缓存读</span>
              <span><i class="gn-daily-dot" style="background:#8b5cf6;"></i>新输入</span>
              <span><i class="gn-daily-dot" style="background:#10b981;"></i>输出</span>
            </div>
          </div>
          ${days.length > 0 ? days.map((d) => {
            const tot = Number(d.totalTokens) || 0;
            const barTotalPct = tot > 0 ? Math.max(2, Math.round((tot / maxDayTokens) * 1000) / 10) : 0;
            const cacheW = tot > 0 ? Math.round(((d.cacheReadTokens || 0) / tot) * barTotalPct * 10) / 10 : 0;
            const inW = tot > 0 ? Math.round(((d.inputTokens || 0) / tot) * barTotalPct * 10) / 10 : 0;
            const outW = Math.max(0, Math.round((barTotalPct - cacheW - inW) * 10) / 10);
            const tag = d.isToday ? '今天' : (d.isYesterday ? '昨天' : d.weekday);
            const hitStr = d.cacheHitPct !== null && d.cacheHitPct !== undefined ? `命中 ${d.cacheHitPct}%` : '';
            const modelStr = d.topModel ? `主力 ${d.topModel}` : '';
            const subAgentStr = d.subagentTokens > 0 ? `含子代理 ${fmtTok(d.subagentTokens)}` : '';
            return `
              <div class="gn-daily-row ${d.isToday ? 'is-today' : ''}">
                <div class="gn-daily-row-top">
                  <div class="gn-daily-date">
                    <span class="gn-mono">${esc(d.date)}</span>
                    <span class="gn-daily-tag">${esc(tag)}</span>
                    ${tot > 0 || d.rounds > 0 ? `<span style="font-size:10.5px;font-weight:500;opacity:.75;">${d.conversations || 0}会话 · ${d.rounds || 0}轮 · ${d.steps || 0}步</span>` : '<span style="font-size:10.5px;font-weight:500;opacity:.45;">无记录</span>'}
                  </div>
                  <div class="gn-mono" style="font-weight:800;font-size:12.5px;${tot === 0 ? 'opacity:.45;' : ''}">${tot > 0 ? `${fmtTok(tot)} tok` : '0 tok'}</div>
                </div>
                <div class="gn-daily-bar-wrap">
                  ${cacheW > 0 ? `<div class="gn-daily-seg" style="width:${cacheW}%;background:#38bdf8;"></div>` : ''}
                  ${inW > 0 ? `<div class="gn-daily-seg" style="width:${inW}%;background:#8b5cf6;"></div>` : ''}
                  ${outW > 0 ? `<div class="gn-daily-seg" style="width:${outW}%;background:#10b981;"></div>` : ''}
                </div>
                ${tot > 0 ? `
                  <div class="gn-daily-sub gn-mono">
                    <span>新输入 ${fmtTok(d.inputTokens)} · 缓存 ${fmtTok(d.cacheReadTokens)} · 输出 ${fmtTok(d.outputTokens)}</span>
                    <span>${[hitStr, modelStr, subAgentStr].filter(Boolean).map((s) => esc(s)).join(' · ')}</span>
                  </div>
                ` : ''}
              </div>`;
          }).join('') : '<div style="font-size:11.5px;opacity:.65;">暂无记录</div>'}
        </div>

        <div style="font-size:11px;opacity:.68;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span>按本地时间自然日统计全部本地会话 transcript（含子代理）；按 Esc 关闭窗口。</span>
          <span class="gn-mono">${rs.peakDate ? `峰值 ${esc(rs.peakDate)} (${fmtTok(rs.peakTokens)})` : ''}${data.fallback ? ' · 本地直读兜底' : ''}</span>
        </div>
      `;

      if (bodyEl.__gnDailyHtml !== bodyHtml) {
        const prevTop = bodyEl.scrollTop || 0;
        bodyEl.__gnDailyHtml = bodyHtml;
        bodyEl.innerHTML = bodyHtml;
        bodyEl.scrollTop = prevTop;
      }
    }

    // ---- Telemetry Loop ----
    let refreshInFlight = false;
    async function refreshTelemetry(force = false) {
      syncActiveConversation();
      if (refreshInFlight && !force) return;
      refreshInFlight = true;
      const reqConvId = detectActiveConvId();
      const reqSeq = hud.refreshSeq;
      try {
        const data = await ipcRenderer.invoke('neko-hud:get-state', reqConvId, force);
        if (reqSeq !== hud.refreshSeq || detectActiveConvId() !== reqConvId) {
          return;
        }
        if (data && data.ok) {
          if (reqConvId) {
            if (data.conv && data.conv.id && String(data.conv.id).toLowerCase() !== reqConvId) {
              data.conv = null;
            }
          } else {
            data.conv = null;
          }
          hud.state = data;
          ensureStatsBar();
          updatePetWidget();
          if (hud.modalOpen) renderObserverModal();
        }
      } catch {} finally {
        refreshInFlight = false;
      }
    }

    async function bootHud() {
      try {
        const boot = await ipcRenderer.invoke('neko-hud:get-boot');
        if (boot && boot.prefs) hud.prefs = { ...hud.prefs, ...boot.prefs };
        if (boot && boot.frames) hud.frames = boot.frames;
        if (boot && boot.defaultFrames) hud.defaultFrames = boot.defaultFrames;
        if (boot && boot.builtinSkins) hud.builtinSkins = boot.builtinSkins;
        if (boot && boot.sounds) hud.soundsB64 = boot.sounds;
        if (boot && boot.customAudio) hud.customAudio = boot.customAudio;
      } catch {}

      const startDom = () => {
        if (!document.body) return;
        syncActiveConversation();
        injectStyles();
        ensureStatsBar();
        mountPetWidget();
        refreshTelemetry(true);

        // IME composition tracking + lazy audio unlock
        document.addEventListener('compositionstart', () => {
          hud.composing = true;
        }, true);
        document.addEventListener('compositionend', () => {
          hud.composing = false;
        }, true);

        const audioUnlock = (ev) => {
          if (hud.composing || (ev && (ev.isComposing === true || ev.keyCode === 229))) return;
          if (!hud.prefs.soundEnabled) return;
          warmActiveSounds();
          document.removeEventListener('pointerdown', audioUnlock, true);
          document.removeEventListener('keydown', audioUnlock, true);
        };
        document.addEventListener('pointerdown', audioUnlock, true);
        document.addEventListener('keydown', audioUnlock, true);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) suspendAudioNow();
          else refreshTelemetry(false);
        });

        let rafScheduled = false;
        const obs = new MutationObserver(() => {
          if (rafScheduled) return;
          rafScheduled = true;
          requestAnimationFrame(() => {
            rafScheduled = false;
            syncActiveConversation();
            if (mountStatsBarOnly()) updateStatsBar();
            if (hud.prefs.enabled !== false && !document.getElementById(IDS.petRoot)) {
              mountPetWidget();
            }
            syncReviewAlertState();
            syncThinkingTransition();
            updatePetPoseDom();
          });
        });
        obs.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-cascade-id', 'hidden', 'aria-hidden']
        });

        const scheduleNavSync = () => {
          syncActiveConversation();
          setTimeout(syncActiveConversation, 25);
          setTimeout(syncActiveConversation, 110);
          setTimeout(syncActiveConversation, 260);
        };

        window.addEventListener('popstate', scheduleNavSync);
        window.addEventListener('hashchange', scheduleNavSync);

        let resizeTimer = null;
        window.addEventListener('resize', () => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            resizeTimer = null;
            requestAnimationFrame(applyPetPositionFromAnchor);
          }, 90);
        });

        document.addEventListener('click', (e) => {
          const petRoot = document.getElementById(IDS.petRoot);
          const modalEl = document.getElementById(IDS.modal);
          const dailyModalEl = document.getElementById(IDS.dailyModal);
          if (hud.panelMode && petRoot && !petRoot.contains(e.target)) {
            hud.panelMode = '';
            syncPanelVisibility();
          }
          if ((petRoot && petRoot.contains(e.target)) || (modalEl && modalEl.contains(e.target)) || (dailyModalEl && dailyModalEl.contains(e.target))) {
            return;
          }
          if (hud.activeReview && isConfirmControlTarget(e.target)) {
            markActiveReviewConfirmed();
          }
          if (e.target && typeof e.target.closest === 'function') {
            if (e.target.closest('[data-testid="new-conversation-button"], [data-testid="conversation-row-sidebar"], [data-testid="project-group"], a[href="/"], a[href^="/c/"], button')) {
              scheduleNavSync();
            }
          }
        }, true);

        document.addEventListener('keydown', (e) => {
          if (e.target && e.target.id === 'gn-custom-dialogue-input') return;
          if (e.key === 'Escape') {
            if (hud.dailyModalOpen) {
              closeDailyTokensModal();
              return;
            }
            if (hud.modalOpen) {
              closeObserverModal();
              return;
            }
            if (hud.panelMode) {
              hud.panelMode = '';
              syncPanelVisibility();
              return;
            }
            if (hud.bubbleStage > 0) {
              clearTurnBubbleTimer();
              clearReviewBubbleTimer();
              hud.bubbleStage = 0;
              hud.turnSummary = null;
              renderThoughtBubbleContent(false);
              return;
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
            scheduleNavSync();
          }
        }, true);

        let pollTick = 0;
        hud.pollTimer = setInterval(() => {
          pollTick += 1;
          const switched = syncActiveConversation();
          if (mountStatsBarOnly()) updateStatsBar();
          syncReviewAlertState();
          syncThinkingTransition();
          updatePetPoseDom();
          if (!switched && pollTick % 6 === 0) {
            const busy = isThinkingNow() || Boolean(hud.activeReview);
            refreshTelemetry(busy);
          }
        }, 250);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startDom, { once: true });
      } else {
        startDom();
      }
    }

    bootHud();
  } catch (err) {
    try { console.error('[Gemini-Neko-HUD] preload error:', err); } catch {}
  }
})();
// ===== GEMINI_NEKO_HUD_END =====
