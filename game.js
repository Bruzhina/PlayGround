(() => {
'use strict';

/* ============================================================
   IRON FRONT — top-down WW2 survival shooter
   Touch-first (dual sticks + optional tilt), desktop friendly.
   ============================================================ */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}
function approachAngle(a, b, speed) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + clamp(d, -speed, speed);
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ---------------- DOM ---------------- */
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
const ui = {
  hud: $('hud'), menu: $('menu'), pause: $('pause'), gameover: $('gameover'),
  hpFill: $('hpFill'), hpText: $('hpText'), waveNum: $('waveNum'),
  scoreNum: $('scoreNum'), killNum: $('killNum'),
  ammoMag: $('ammoMag'), ammoReserve: $('ammoReserve'),
  reloadFill: $('reloadFill'), reloadTrack: document.querySelector('.reload-track'),
  grenadeNum: $('grenadeNum'),
  banner: $('banner'), bannerMain: $('bannerMain'), bannerSub: $('bannerSub'),
  countdown: $('countdown'), toast: $('toast'), tiltPill: $('tiltPill'),
  minimap: $('minimap'), bestScore: $('bestScore'),
  goScore: $('goScore'), goWaves: $('goWaves'), goKills: $('goKills'), goBest: $('goBest'),
  pauseWave: $('pauseWave'), pauseScore: $('pauseScore'), pauseKills: $('pauseKills'),
  stickLeft: $('stickLeft'), stickRight: $('stickRight'),
  zoneLeft: $('zoneLeft'), zoneRight: $('zoneRight'),
  reloadBtn: $('reloadBtn'), grenadeBtn: $('grenadeBtn'), fireBtn: $('fireBtn'),
  tiltToggle: $('tiltToggle'), pauseTiltBtn: $('pauseTiltBtn'), recenterBtn: $('recenterBtn'),
  soundToggle: $('soundToggle'), pauseMuteBtn: $('pauseMuteBtn'),
  tiltStatus: $('tiltStatus'),
  pauseBtn: $('pauseBtn'), deployBtn: $('deployBtn'), retryBtn: $('retryBtn'),
  resumeBtn: $('resumeBtn'), restartBtn: $('restartBtn'), menuBtn: $('menuBtn'),
  goMenuBtn: $('goMenuBtn'),
};

/* ---------------- global state ---------------- */
const WORLD = { w: 2800, h: 2100 };
let W = 0, H = 0, DPR = 1, baseZoom = 0.8;
let state = 'menu';
let player = null;
let enemies = [], bullets = [], grenades = [], particles = [], effects = [], pickups = [], texts = [];
let obstacles = [], terrain = null, terrainCtx = null;
let camera = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 0.8, shake: 0, shakeX: 0, shakeY: 0 };
let wave = 0, score = 0, kills = 0, best = 0;
let waveQueue = [], waveActive = false, spawnTimer = 0, intermission = 0;
let gameTime = 0, menuTime = 0, deathTimer = 0, ambientTimer = 0, artilleryTimer = 20;
let bannerTimer = null, toastTimer = null;
let countdownText = '';
let usingMouse = false;
const mouse = { x: 0, y: 0, down: false };

const input = {
  moveX: 0, moveY: 0,
  left: { id: null, active: false, dx: 0, dy: 0, mag: 0 },
  right: { id: null, active: false, dx: 0, dy: 0, mag: 0 },
  keys: new Set(),
  stickFire: false, buttonFire: false,
};

const tilt = {
  enabled: false, valid: false, available: false, calibrating: false,
  beta: 0, gamma: 0, baseBeta: 0, baseGamma: 0, samples: [],
  ax: 0, ay: 0, invertY: false,
};

const SPAWNS = [
  { x: 210, y: 310 }, { x: 2590, y: 330 }, { x: 220, y: 1790 },
  { x: 2580, y: 1770 }, { x: 1400, y: 140 }, { x: 1400, y: 1960 },
  { x: 560, y: 1050 }, { x: 2240, y: 1080 },
];

/* ---------------- audio ---------------- */
let audioCtx = null, masterGain = null, noiseBuffer = null, muted = false;

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.7;
    masterGain.connect(audioCtx.destination);

    const len = Math.floor(audioCtx.sampleRate * 2);
    noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 360;
    const g = audioCtx.createGain();
    g.gain.value = 0.028;
    src.connect(filt).connect(g).connect(masterGain);
    src.start();
  } catch (e) { /* audio unavailable */ }
}

function setMuted(m) {
  muted = m;
  const label = 'SOUND: ' + (muted ? 'OFF' : 'ON');
  ui.soundToggle.textContent = label;
  ui.pauseMuteBtn.textContent = label;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, audioCtx.currentTime, 0.03);
  }
}

function noiseHit(dur, freq, q, vol, type) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  src.playbackRate.value = rand(0.82, 1.16);
  const f = audioCtx.createBiquadFilter();
  f.type = type || 'lowpass';
  f.frequency.setValueAtTime(freq, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(50, freq * 0.3), t + dur);
  f.Q.value = q;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, vol), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(masterGain);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function tone(freq, dur, vol, type, slide) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, vol), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const sfx = {
  rifle() { noiseHit(0.09, 2200, 0.8, 0.16); tone(150, 0.08, 0.12, 'square', -90); },
  enemyRifle(vol) { noiseHit(0.08, 1500, 0.9, 0.06 * vol); tone(110, 0.07, 0.04 * vol, 'square', -60); },
  tankCannon(vol) { noiseHit(0.38, 700, 0.7, 0.18 * vol); tone(58, 0.4, 0.16 * vol, 'sine', -22); },
  explosion(vol) {
    vol = vol === undefined ? 1 : vol;
    noiseHit(0.75, 650, 0.6, 0.34 * vol);
    noiseHit(0.45, 2100, 0.7, 0.1 * vol, 'bandpass');
    tone(48, 0.7, 0.25 * vol, 'sine', -18);
  },
  hit() { tone(92, 0.16, 0.18, 'sawtooth', -40); noiseHit(0.09, 900, 0.8, 0.1); },
  reload() {
    if (!audioCtx || muted) return;
    tone(520, 0.035, 0.055, 'square');
    const t = audioCtx.currentTime + 0.22;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(380, t);
    g.gain.setValueAtTime(0.055, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(masterGain); o.start(t); o.stop(t + 0.07);
  },
  pickup() { tone(760, 0.09, 0.08, 'triangle', 220); },
  hurt() { noiseHit(0.2, 500, 0.7, 0.2); tone(70, 0.2, 0.12, 'sawtooth', -20); },
  wave() {
    tone(164, 0.75, 0.07, 'sawtooth', 20);
    setTimeout(() => tone(123, 0.9, 0.06, 'sawtooth', -10), 380);
  },
  click() { tone(420, 0.035, 0.05, 'square'); },
  grenade() { noiseHit(0.16, 1000, 0.6, 0.07); },
  dry() { tone(170, 0.05, 0.05, 'square'); },
};

/* ---------------- canvas sizing ---------------- */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(W * DPR));
  canvas.height = Math.max(1, Math.floor(H * DPR));
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  baseZoom = clamp(Math.min(W / 900, H / 400), 0.72, 1.95);
  if (state === 'menu') camera.zoom = baseZoom * 0.95;
  updateHUD(true);
}

/* ---------------- sprite helpers ---------------- */
function makeGlowSprite(rgb, size) {
  size = size || 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(' + rgb + ',1)');
  grad.addColorStop(0.35, 'rgba(' + rgb + ',0.55)');
  grad.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
const SPR = {
  smoke: null, dust: null, blood: null, flash: null, spark: null,
};
function buildParticleSprites() {
  SPR.smoke = makeGlowSprite('126,125,108', 64);
  SPR.dust = makeGlowSprite('161,143,100', 64);
  SPR.blood = makeGlowSprite('103,30,24', 48);
  SPR.flash = makeGlowSprite('255,206,132', 64);
  SPR.spark = makeGlowSprite('255,176,92', 32);
  SPR.med = makeGlowSprite('128,190,108', 48);
  SPR.ammo = makeGlowSprite('232,198,118', 48);
  SPR.grenade = makeGlowSprite('224,112,68', 48);
}

/* ---------------- terrain ---------------- */
const ROADS = [
  [[0, 1520], [640, 1460], [1290, 1500], [1960, 1390], [2800, 1490]],
  [[1520, 0], [1440, 520], [1510, 1040], [1410, 1580], [1490, 2100]],
];
const CRATERS = [
  [940, 1270, 46], [1180, 840, 34], [1590, 1320, 52], [2010, 1130, 38],
  [1890, 1640, 44], [720, 1700, 40], [2220, 760, 32], [1060, 590, 38],
  [460, 820, 30], [2330, 1470, 46], [1680, 300, 28], [820, 390, 34],
];

function drawRoad(c, pts, width, color) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  c.stroke();
}

function generateTerrain() {
  terrain = document.createElement('canvas');
  terrain.width = WORLD.w;
  terrain.height = WORLD.h;
  terrainCtx = terrain.getContext('2d');
  const c = terrainCtx;
  const rng = mulberry32(19440606);

  c.fillStyle = '#6d6742';
  c.fillRect(0, 0, WORLD.w, WORLD.h);

  const patches = ['#756c45', '#67643c', '#7c7249', '#5e6138', '#82764b', '#696a41', '#5c5b38'];
  for (let i = 0; i < 240; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h, r = 70 + rng() * 300;
    const col = patches[Math.floor(rng() * patches.length)];
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(col, 0.5));
    g.addColorStop(1, hexA(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  for (const road of ROADS) {
    drawRoad(c, road, 128, 'rgba(137,122,82,.20)');
    drawRoad(c, road, 96, 'rgba(161,144,102,.28)');
    drawRoad(c, road, 58, 'rgba(174,157,113,.16)');
  }

  // field furrows
  c.save();
  c.globalAlpha = 0.12;
  c.strokeStyle = '#4d4b2d';
  c.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    const len = 70 + rng() * 240, a = rng() * TAU;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
  }
  c.restore();

  // grass and scrub
  for (let i = 0; i < 12000; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    const green = rng() < 0.55;
    c.strokeStyle = green
      ? (rng() < 0.5 ? 'rgba(94,106,57,.52)' : 'rgba(112,119,62,.46)')
      : (rng() < 0.5 ? 'rgba(128,112,71,.42)' : 'rgba(86,80,50,.42)');
    c.lineWidth = rng() < 0.8 ? 1 : 1.6;
    const len = 2 + rng() * 5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + rand(-2, 2), y - len);
    c.stroke();
  }

  // longer grass clumps
  for (let i = 0; i < 2100; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    const dry = rng() < 0.28;
    const base = dry ? (rng() < 0.5 ? 'rgba(147,131,84,.5)' : 'rgba(116,103,66,.46)')
      : (rng() < 0.5 ? 'rgba(79,95,48,.5)' : 'rgba(102,112,56,.44)');
    const blades = 3 + Math.floor(rng() * 5);
    for (let b = 0; b < blades; b++) {
      const ox = rand(-5, 5);
      const len = 4 + rng() * 8;
      c.strokeStyle = base;
      c.lineWidth = 1 + rng() * 0.8;
      c.beginPath();
      c.moveTo(x + ox, y);
      c.quadraticCurveTo(x + ox + rand(-2, 2), y - len * 0.55, x + ox + rand(-4, 4), y - len);
      c.stroke();
    }
  }

  // sun-bleached and scorched patches
  for (let i = 0; i < 120; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h, r = 20 + rng() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = rng() < 0.55;
    g.addColorStop(0, dark ? 'rgba(48,42,26,.22)' : 'rgba(186,166,112,.13)');
    g.addColorStop(1, dark ? 'rgba(48,42,26,0)' : 'rgba(186,166,112,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  // ambient light wash
  const light = c.createLinearGradient(0, 0, WORLD.w, WORLD.h);
  light.addColorStop(0, 'rgba(255,232,174,.10)');
  light.addColorStop(0.45, 'rgba(255,240,200,.02)');
  light.addColorStop(1, 'rgba(20,28,18,.14)');
  c.fillStyle = light;
  c.fillRect(0, 0, WORLD.w, WORLD.h);

  // stones / rubble
  for (let i = 0; i < 600; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    const r = 1 + rng() * 4;
    c.fillStyle = rng() < 0.5 ? 'rgba(54,50,38,.35)' : 'rgba(160,148,112,.24)';
    c.beginPath(); c.ellipse(x, y, r * 1.5, r, rng() * TAU, 0, TAU); c.fill();
  }

  // permanent shell craters
  for (const [x, y, r] of CRATERS) drawCrater(c, x, y, r, rng);

  // farmhouse floor patch
  c.save();
  c.translate(1660, 790);
  c.fillStyle = 'rgba(84,78,62,.38)';
  c.fillRect(-140, -120, 290, 230);
  c.fillStyle = 'rgba(150,138,108,.12)';
  for (let i = 0; i < 40; i++) {
    c.fillRect(rand(-138, 145), rand(-118, 105), rand(6, 22), rand(4, 12));
  }
  c.restore();

  // barbed-wire boundary hint
  c.save();
  c.strokeStyle = 'rgba(30,28,20,.4)';
  c.lineWidth = 2;
  c.setLineDash([14, 11]);
  c.strokeRect(52, 52, WORLD.w - 104, WORLD.h - 104);
  c.setLineDash([]);
  c.strokeStyle = 'rgba(42,38,27,.55)';
  c.lineWidth = 1;
  for (let x = 60; x < WORLD.w - 60; x += 42) {
    c.beginPath(); c.moveTo(x, 48); c.lineTo(x + 13, 61); c.moveTo(x + 13, 48); c.lineTo(x, 61); c.stroke();
    c.beginPath(); c.moveTo(x, WORLD.h - 61); c.lineTo(x + 13, WORLD.h - 48); c.moveTo(x + 13, WORLD.h - 61); c.lineTo(x, WORLD.h - 48); c.stroke();
  }
  for (let y = 60; y < WORLD.h - 60; y += 42) {
    c.beginPath(); c.moveTo(48, y); c.lineTo(61, y + 13); c.moveTo(61, y); c.lineTo(48, y + 13); c.stroke();
    c.beginPath(); c.moveTo(WORLD.w - 61, y); c.lineTo(WORLD.w - 48, y + 13); c.moveTo(WORLD.w - 48, y); c.lineTo(WORLD.w - 61, y + 13); c.stroke();
  }
  c.restore();
}

function drawCrater(c, x, y, r, rng) {
  rng = rng || Math.random;
  const g = c.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(36,31,21,.85)');
  g.addColorStop(0.55, 'rgba(58,50,33,.5)');
  g.addColorStop(1, 'rgba(58,50,33,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(174,156,112,.2)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, r * 0.88, 0, TAU); c.stroke();
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU, d = r * (0.5 + rng() * 0.8);
    c.fillStyle = 'rgba(40,35,24,.4)';
    c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rng() * 3, 0, TAU); c.fill();
  }
}

/* ---------------- obstacles ---------------- */
function R(x, y, w, h, kind) { return { type: 'rect', x, y, w, h, kind, pad: 34 }; }
function C(x, y, r, kind, angle) { return { type: 'circle', x, y, r, kind, angle: angle || 0, pad: 34 }; }

function buildObstacles() {
  obstacles = [
    // ruined farmhouse
    R(1540, 650, 250, 22, 'wall'),
    R(1540, 670, 22, 182, 'wall'),
    R(1792, 670, 22, 112, 'wall'),
    R(1540, 840, 142, 22, 'wall'),
    R(1740, 840, 74, 22, 'wall'),
    C(1660, 762, 30, 'rubble'),
    C(1608, 790, 19, 'rubble'),
    C(1772, 776, 22, 'rubble'),
    // sandbag lines
    R(1092, 1000, 184, 38, 'sandbag'),
    R(1498, 1082, 38, 152, 'sandbag'),
    R(856, 1360, 204, 38, 'sandbag'),
    R(1868, 1512, 176, 38, 'sandbag'),
    R(1228, 1738, 196, 38, 'sandbag'),
    R(2102, 1748, 38, 132, 'sandbag'),
    R(680, 560, 38, 150, 'sandbag'),
    // crates
    R(1510, 1432, 58, 58, 'crate'),
    R(1582, 1396, 46, 46, 'crate'),
    R(936, 930, 52, 52, 'crate'),
    R(2320, 930, 62, 62, 'crate'),
    R(1996, 1190, 48, 48, 'crate'),
    // dead trees
    C(500, 1180, 31, 'tree'),
    C(2372, 980, 35, 'tree'),
    C(2212, 1772, 31, 'tree'),
    C(642, 1682, 33, 'tree'),
    C(2472, 478, 29, 'tree'),
    C(1122, 322, 31, 'tree'),
    C(302, 1522, 27, 'tree'),
    C(1240, 430, 26, 'tree'),
    // wrecks
    C(2032, 1402, 49, 'wreck', 0.5),
    C(758, 758, 43, 'wreck', -0.9),
    // rocks
    C(1492, 420, 23, 'rock'),
    C(982, 1622, 21, 'rock'),
    C(2182, 1182, 19, 'rock'),
    C(420, 900, 24, 'rock'),
    // hedgehogs
    C(1132, 1482, 18, 'hedgehog', 0.3),
    C(1220, 1560, 18, 'hedgehog', 1.1),
    C(1762, 1022, 18, 'hedgehog', 0.7),
    C(884, 1082, 17, 'hedgehog', 0.1),
  ];
  obstacles.forEach(buildObstacleSprite);
}

function buildObstacleSprite(o, idx) {
  const rng = mulberry32(1337 + idx * 7919 + Math.floor(o.x) * 13 + Math.floor(o.y) * 17);
  const pad = 34;
  const w = o.type === 'rect' ? o.w : o.r * 2;
  const h = o.type === 'rect' ? o.h : o.r * 2;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w + pad * 2);
  cv.height = Math.ceil(h + pad * 2);
  const c = cv.getContext('2d');
  c.translate(pad, pad);

  const shadow = (x, y, ww, hh, r) => {
    c.fillStyle = 'rgba(12,11,6,.36)';
    roundRect(c, x + 9, y + 13, ww, hh, r);
    c.fill();
  };
  const shadowEllipse = (x, y, rx, ry) => {
    c.fillStyle = 'rgba(12,11,6,.36)';
    c.beginPath(); c.ellipse(x + 9, y + 13, rx, ry, 0, 0, TAU); c.fill();
  };

  if (o.kind === 'sandbag') {
    const horiz = o.w >= o.h;
    shadow(0, 0, o.w, o.h, o.h / 2);
    const len = horiz ? o.w : o.h;
    const thick = horiz ? o.h : o.w;
    const rows = thick > 30 ? 2 : 1;
    const count = Math.max(3, Math.round(len / 21));
    const bagColors = ['#9d8c62', '#8c7c53', '#a8966a', '#84744c', '#96865b'];
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const lat = rows === 1 ? thick * 0.5 : thick * (0.28 + row * 0.44);
        const bx = horiz ? t * len : lat + (rng() - 0.5) * 2;
        const by = horiz ? lat + (rng() - 0.5) * 2 : t * len;
        const along = len / count * 0.72;
        const across = thick / rows * 0.56;
        const col = bagColors[Math.floor(rng() * bagColors.length)];
        c.fillStyle = col;
        c.beginPath();
        c.ellipse(bx, by, horiz ? along : across, horiz ? across : along, 0, 0, TAU);
        c.fill();
        c.strokeStyle = 'rgba(48,40,24,.45)';
        c.lineWidth = 1;
        c.stroke();
        c.strokeStyle = 'rgba(224,208,164,.28)';
        c.lineWidth = 1.4;
        c.beginPath();
        if (horiz) c.ellipse(bx - along * 0.1, by - across * 0.34, along * 0.6, across * 0.34, 0, Math.PI * 1.05, Math.PI * 1.95);
        else c.ellipse(bx - across * 0.34, by - along * 0.1, across * 0.34, along * 0.6, 0, Math.PI * 1.05, Math.PI * 1.95);
        c.stroke();
      }
    }
    // loose dirt at base
    for (let i = 0; i < 10; i++) {
      c.fillStyle = 'rgba(78,66,40,.35)';
      c.beginPath();
      c.arc(rand(-4, o.w + 4), rand(o.h - 4, o.h + 9), rand(1, 3), 0, TAU);
      c.fill();
    }
  } else if (o.kind === 'wall') {
    shadow(0, 0, o.w, o.h, 2);
    c.fillStyle = '#625b4b';
    c.fillRect(0, 0, o.w, o.h);
    const rowH = 12;
    const cols = ['#756c58', '#5b5445', '#807662', '#69604e', '#6e6859', '#554f41'];
    for (let ry = 0; ry < o.h; ry += rowH) {
      let x = -rng() * 16;
      while (x < o.w) {
        const sw = 12 + rng() * 20;
        const sh = Math.min(rowH - 1, o.h - ry - 1);
        c.fillStyle = cols[Math.floor(rng() * cols.length)];
        c.fillRect(x + 1, ry + 1, Math.max(2, Math.min(sw, o.w - x) - 2), Math.max(1, sh - 1));
        x += sw;
      }
    }
    c.fillStyle = 'rgba(198,186,150,.2)';
    c.fillRect(0, 0, o.w, 2);
    c.fillStyle = 'rgba(10,9,5,.32)';
    c.fillRect(0, o.h - 2, o.w, 2);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(48,42,30,.55)';
      c.beginPath();
      c.arc(rand(0, o.w), rand(o.h - 6, o.h + 8), rand(1, 3.4), 0, TAU);
      c.fill();
    }
  } else if (o.kind === 'crate') {
    shadow(0, 0, o.w, o.h, 3);
    c.fillStyle = '#6b4e2e';
    c.fillRect(0, 0, o.w, o.h);
    const planks = Math.max(3, Math.round(o.w / 11));
    for (let i = 0; i < planks; i++) {
      c.fillStyle = i % 2 ? 'rgba(52,35,19,.2)' : 'rgba(190,150,98,.09)';
      c.fillRect(0, (o.h / planks) * i, o.w, o.h / planks - 1);
    }
    c.strokeStyle = 'rgba(35,24,14,.8)';
    c.lineWidth = 2.5;
    c.strokeRect(1, 1, o.w - 2, o.h - 2);
    c.strokeStyle = 'rgba(43,31,18,.5)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(3, 3); c.lineTo(o.w - 3, o.h - 3); c.moveTo(o.w - 3, 3); c.lineTo(3, o.h - 3); c.stroke();
    c.fillStyle = 'rgba(35,39,26,.55)';
    c.fillRect(o.w * 0.18, o.h * 0.2, o.w * 0.64, o.h * 0.1);
    c.fillStyle = 'rgba(224,208,164,.45)';
    c.font = 'bold 6px monospace';
    c.textAlign = 'center';
    c.fillText('AMMO', o.w / 2, o.h * 0.29);
    c.fillStyle = 'rgba(200,183,140,.24)';
    c.fillRect(0, 0, o.w, 2);
  } else if (o.kind === 'tree') {
    const r = o.r;
    shadowEllipse(0, 0, r * 1.1, r * 0.78);
    c.strokeStyle = '#322a1d';
    c.lineCap = 'round';
    const branches = 6 + Math.floor(rng() * 4);
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * TAU + rng() * 0.5;
      const len = r * (0.68 + rng() * 0.72);
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(Math.cos(a - 0.2) * len * 0.5, Math.sin(a - 0.2) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len);
      c.stroke();
      c.lineWidth = 1.4;
      for (let k = 1; k <= 2; k++) {
        const t = 0.45 + k * 0.2;
        const bx = Math.cos(a) * len * t, by = Math.sin(a) * len * t;
        const ba = a + (rng() < 0.5 ? 1 : -1) * (0.6 + rng() * 0.5);
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(bx + Math.cos(ba) * len * 0.32, by + Math.sin(ba) * len * 0.32);
        c.stroke();
      }
    }
    c.fillStyle = '#2e281c';
    c.beginPath(); c.arc(0, 0, 6 + r * 0.12, 0, TAU); c.fill();
    c.fillStyle = 'rgba(94,106,57,.42)';
    for (let i = 0; i < 9; i++) {
      const a = rng() * TAU, d = rng() * r * 0.85;
      c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 3 + rng() * 6, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(190,168,120,.16)';
    c.beginPath(); c.arc(-2, -3, r * 0.3, 0, TAU); c.fill();
  } else if (o.kind === 'wreck') {
    const r = o.r;
    c.save();
    c.rotate(o.angle);
    shadowEllipse(0, 0, r * 1.06, r * 0.7);
    c.fillStyle = '#35332a';
    roundRect(c, -r * 0.94, -r * 0.58, r * 1.88, r * 1.16, r * 0.22);
    c.fill();
    c.fillStyle = '#2a2922';
    roundRect(c, -r * 0.58, -r * 0.4, r * 1.16, r * 0.8, r * 0.16);
    c.fill();
    c.fillStyle = '#494536';
    c.beginPath(); c.arc(0, 0, r * 0.42, 0, TAU); c.fill();
    c.strokeStyle = '#26251e';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(r * 0.1, 0); c.lineTo(r * 0.96, -r * 0.12); c.stroke();
    c.strokeStyle = 'rgba(150,77,40,.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = rng() * TAU, d = rng() * r * 0.6;
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + rng() * 5, 0, TAU);
      c.stroke();
    }
    c.fillStyle = 'rgba(20,18,13,.5)';
    c.beginPath(); c.ellipse(rand(-r * 0.5, r * 0.5), rand(-r * 0.4, r * 0.4), r * 0.28, r * 0.18, rng() * TAU, 0, TAU); c.fill();
    c.restore();
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(35,31,22,.5)';
      c.beginPath(); c.arc(rand(-r, r), rand(-r * 0.7, r * 0.75), rand(1, 3), 0, TAU); c.fill();
    }
  } else if (o.kind === 'rock') {
    const r = o.r;
    shadowEllipse(0, 0, r * 0.95, r * 0.7);
    c.fillStyle = '#6e6a5b';
    c.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const rr = r * (0.7 + rng() * 0.35);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.82;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(190,182,156,.25)';
    c.beginPath(); c.ellipse(-r * 0.2, -r * 0.26, r * 0.42, r * 0.24, -0.4, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(45,41,31,.5)'; c.lineWidth = 1.5; c.stroke();
  } else if (o.kind === 'hedgehog') {
    const r = o.r;
    shadowEllipse(0, 0, r * 1.1, r * 0.85);
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = o.angle + (i / 3) * Math.PI;
      c.strokeStyle = '#333026';
      c.lineWidth = 4.5;
      c.beginPath();
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(-Math.cos(a) * r, -Math.sin(a) * r);
      c.stroke();
      c.strokeStyle = 'rgba(140,130,105,.28)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      c.lineTo(-Math.cos(a) * r * 0.85, -Math.sin(a) * r * 0.85);
      c.stroke();
    }
    c.fillStyle = '#26241c';
    c.beginPath(); c.arc(0, 0, r * 0.24, 0, TAU); c.fill();
  } else {
    // rubble
    const r = o.r;
    for (let i = 0; i < 10; i++) {
      const a = rng() * TAU, d = rng() * r;
      const s = 2 + rng() * 6;
      c.fillStyle = rng() < 0.5 ? '#6f6756' : '#564f40';
      c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, s, s * 0.75, rng() * TAU, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(12,11,6,.25)';
    c.beginPath(); c.ellipse(4, 7, r * 0.9, r * 0.6, 0, 0, TAU); c.fill();
  }

  o.sprite = cv;
  o.spriteW = cv.width;
  o.spriteH = cv.height;
  o.spriteX = -pad;
  o.spriteY = -pad;
  o.baseY = o.type === 'rect' ? o.y + o.h : o.y + o.r;
}

function drawObstacle(c, o) {
  c.drawImage(o.sprite, o.x + o.spriteX, o.y + o.spriteY);
}

/* ---------------- collision ---------------- */
function segRectHit(x1, y1, x2, y2, rx, ry, rw, rh) {
  let tmin = 0, tmax = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > tmax) return false;
        if (t > tmin) tmin = t;
      } else {
        if (t < tmin) return false;
        if (t < tmax) tmax = t;
      }
    }
  }
  return true;
}

function segCircleHit(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a < 1e-6) return fx * fx + fy * fy <= r * r;
  const b = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - r * r;
  let disc = b * b - 4 * a * cc;
  if (disc < 0) return false;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

function lineBlocked(x1, y1, x2, y2) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === 'rect') {
      if (segRectHit(x1, y1, x2, y2, o.x, o.y, o.w, o.h)) return true;
    } else if (segCircleHit(x1, y1, x2, y2, o.x, o.y, o.r * 0.82)) {
      return true;
    }
  }
  return false;
}

function resolveCircle(ent, radius) {
  let x = ent.x, y = ent.y;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.type === 'rect') {
        const cx = clamp(x, o.x, o.x + o.w);
        const cy = clamp(y, o.y, o.y + o.h);
        let dx = x - cx, dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius) {
          if (d2 < 0.0001) {
            const left = x - o.x, right = o.x + o.w - x;
            const top = y - o.y, bottom = o.y + o.h - y;
            const m = Math.min(left, right, top, bottom);
            if (m === left) x = o.x - radius;
            else if (m === right) x = o.x + o.w + radius;
            else if (m === top) y = o.y - radius;
            else y = o.y + o.h + radius;
          } else {
            const d = Math.sqrt(d2);
            x = cx + (dx / d) * radius;
            y = cy + (dy / d) * radius;
          }
        }
      } else {
        const dx = x - o.x, dy = y - o.y;
        const rr = radius + o.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.001;
          x = o.x + (dx / d) * rr;
          y = o.y + (dy / d) * rr;
        }
      }
    }
  }
  ent.x = clamp(x, 44, WORLD.w - 44);
  ent.y = clamp(y, 44, WORLD.h - 44);
}

/* ---------------- game setup ---------------- */
function createPlayer() {
  return {
    x: 1350, y: 1202, r: 14, hp: 100, maxHp: 100, speed: 188,
    aim: -Math.PI / 2, walk: 0, moving: false,
    ammo: 30, mag: 30, reserve: 150, reloading: false, reloadT: 0, reloadDur: 1.45,
    fireCd: 0, fireFlash: 0, recoil: 0, grenades: 3, hurt: 0, dry: 0,
    dead: false, hitFlash: 0,
  };
}

function startGame() {
  initAudio();
  generateTerrain();
  buildMinimapBase();
  player = createPlayer();
  enemies = []; bullets = []; grenades = []; particles = []; effects = []; pickups = []; texts = [];
  wave = 0; score = 0; kills = 0;
  waveQueue = []; waveActive = false; spawnTimer = 0; intermission = 0;
  gameTime = 0; deathTimer = 0; ambientTimer = 0; artilleryTimer = 18;
  camera.x = player.x; camera.y = player.y; camera.zoom = baseZoom; camera.shake = 0;
  state = 'playing';
  ui.menu.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.tiltPill.classList.toggle('hidden', !tilt.enabled);
  ui.countdown.classList.remove('on');
  ui.reloadTrack.classList.remove('on');
  resetSticks();
  showBanner('WAVE 1', 'HOLD THE LINE', false, 2.1);
  sfx.wave();
  beginWave();
  updateHUD(true);
}

function beginWave() {
  wave++;
  waveActive = true;
  intermission = 0;
  spawnTimer = 0.65;
  countdownText = '';
  ui.countdown.classList.remove('on');
  ui.waveNum.textContent = wave;
  const stormChance = clamp((wave - 1) * 0.13, 0, 0.62);
  const count = Math.min(4 + Math.round(wave * 1.5), 22);
  waveQueue = [];
  for (let i = 0; i < count; i++) {
    waveQueue.push(Math.random() < stormChance ? 'storm' : 'rifle');
  }
  if (wave % 3 === 0) {
    const tanks = 1 + Math.floor(wave / 10);
    for (let i = 0; i < tanks; i++) {
      waveQueue.splice(randInt(2, Math.max(2, waveQueue.length - 1)), 0, 'tank');
    }
  }
  ui.countdown.classList.remove('on');
  if (wave > 1) {
    showBanner('WAVE ' + wave, wave % 3 === 0 ? 'ARMOR INBOUND' : 'ENEMY PUSH', wave % 3 === 0, 2.2);
    sfx.wave();
  }
  updateHUD(true);
}

function chooseSpawn() {
  for (let attempt = 0; attempt < 14; attempt++) {
    const a = rand(0, TAU);
    const d = rand(520, 720);
    const x = clamp(player.x + Math.cos(a) * d, 80, WORLD.w - 80);
    const y = clamp(player.y + Math.sin(a) * d, 80, WORLD.h - 80);
    let clear = true;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const ox = o.type === 'rect' ? clamp(x, o.x, o.x + o.w) : o.x;
      const oy = o.type === 'rect' ? clamp(y, o.y, o.y + o.h) : o.y;
      if (dist(x, y, ox, oy) < (o.type === 'rect' ? 44 : o.r + 34)) { clear = false; break; }
    }
    if (clear) return { x, y };
  }
  const s = pick(SPAWNS);
  return { x: s.x + rand(-40, 40), y: s.y + rand(-40, 40) };
}

function spawnEnemy(type, pos) {
  pos = pos || chooseSpawn();
  const hpScale = 1 + wave * 0.055;
  let e;
  if (type === 'tank') {
    e = {
      type: 'tank', x: pos.x, y: pos.y, r: 34, hp: 95 + wave * 9, maxHp: 95 + wave * 9,
      speed: 39, aim: 0, hull: 0, turret: 0, range: 640, walk: 0,
      fireCd: rand(2.2, 3.5), burst: 0, burstT: 0, seed: rand(0, 100),
      spawnT: 1.0, flash: 0, dead: false,
    };
    e.hull = Math.atan2(player.y - e.y, player.x - e.x);
    e.aim = e.hull; e.turret = e.hull;
  } else if (type === 'storm') {
    e = {
      type: 'storm', x: pos.x, y: pos.y, r: 14, hp: 42 * hpScale, maxHp: 42 * hpScale,
      speed: 81, aim: 0, range: 330, walk: rand(0, 10),
      fireCd: rand(1.5, 2.5), burst: 0, burstT: 0, seed: rand(0, 100),
      spawnT: 0.65, flash: 0, dead: false,
    };
    e.aim = Math.atan2(player.y - e.y, player.x - e.x);
  } else {
    e = {
      type: 'rifle', x: pos.x, y: pos.y, r: 14, hp: 34 * hpScale, maxHp: 34 * hpScale,
      speed: 61, aim: 0, range: 435, walk: rand(0, 10),
      fireCd: rand(1.8, 3.2), burst: 0, burstT: 0, seed: rand(0, 100),
      spawnT: 0.65, flash: 0, dead: false,
    };
    e.aim = Math.atan2(player.y - e.y, player.x - e.x);
  }
  resolveCircle(e, e.r);
  enemies.push(e);
  for (let i = 0; i < 9; i++) {
    addSmoke(e.x + rand(-16, 16), e.y + rand(-16, 16), rand(0.5, 0.9), rand(10, 22), rand(-8, 8), rand(-8, 8));
  }
}

/* ---------------- player ---------------- */
function getMoveVector() {
  let mx = 0, my = 0;
  const L = input.left;
  if (L.active) { mx += L.dx; my += L.dy; }
  const k = input.keys;
  if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) my -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) my += 1;
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  return { x: mx, y: my, m: Math.min(1, m) };
}

function getAimVector() {
  if (input.right.active && input.right.mag > 0.16) {
    return { x: input.right.dx, y: input.right.dy };
  }
  if (usingMouse) {
    const wx = camera.x + (mouse.x - W / 2) / camera.zoom;
    const wy = camera.y + (mouse.y - H / 2) / camera.zoom;
    const dx = wx - player.x, dy = wy - player.y;
    if (Math.hypot(dx, dy) > 5) return { x: dx, y: dy };
  }
  if (tilt.enabled && tilt.valid) {
    const m = Math.hypot(tilt.ax, tilt.ay);
    if (m > 0.055) return { x: tilt.ax, y: tilt.ay };
  }
  return null;
}

function updatePlayer(dt) {
  const p = player;
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.fireFlash = Math.max(0, p.fireFlash - dt);
  p.recoil = Math.max(0, p.recoil - dt * 14);
  p.hurt = Math.max(0, p.hurt - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);

  const mv = getMoveVector();
  p.moving = mv.m > 0.08;
  if (p.moving) {
    p.x += mv.x * p.speed * dt;
    p.y += mv.y * p.speed * dt;
    p.walk += dt * (7 + mv.m * 5);
    resolveCircle(p, p.r);
  }

  const av = getAimVector();
  if (av) {
    const a = Math.atan2(av.y, av.x);
    p.aim = angleLerp(p.aim, a, clamp(1 - Math.exp(-26 * dt), 0, 1));
  }

  if (p.reloading) {
    p.reloadT += dt;
    const t = clamp(p.reloadT / p.reloadDur, 0, 1);
    ui.reloadTrack.classList.add('on');
    ui.reloadFill.style.width = (t * 100) + '%';
    if (p.reloadT >= p.reloadDur) {
      const take = Math.min(p.mag - p.ammo, p.reserve);
      p.ammo += take;
      p.reserve -= take;
      p.reloading = false;
      p.reloadT = 0;
      ui.reloadTrack.classList.remove('on');
      sfx.click();
    }
  } else if (p.ammo <= 0) {
    if (p.reserve > 0) {
      p.dry += dt;
      if (p.dry > 0.42) startReload();
    } else {
      p.dry += dt;
      if (p.dry > 2.2) {
        p.ammo = 15;
        p.dry = 0;
        showToast('SCAVENGED 15 ROUNDS', 1.8);
        sfx.pickup();
      }
    }
  } else {
    p.dry = 0;
  }

  const firing = input.stickFire || input.buttonFire || input.keys.has('Space') || (usingMouse && mouse.down);
  if (firing) tryPlayerFire();
}

function tryPlayerFire() {
  const p = player;
  if (p.reloading || p.fireCd > 0 || p.dead) return;
  if (p.ammo <= 0) {
    if (p.reserve > 0) startReload();
    else sfx.dry();
    return;
  }
  const spread = (p.moving ? 0.045 : 0.018) + p.recoil * 0.012;
  const a = p.aim + rand(-spread, spread);
  const mx = p.x + Math.cos(a) * 27 + Math.cos(a + Math.PI / 2) * 2;
  const my = p.y + Math.sin(a) * 27 + Math.sin(a + Math.PI / 2) * 2;
  bullets.push({
    x: mx, y: my, px: mx, py: my, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000,
    life: 1.1, team: 'player', type: 'rifle', dmg: 14, color: '#ffe2a8', dead: false,
  });
  p.ammo--;
  p.fireCd = 0.115;
  p.fireFlash = 0.07;
  p.recoil = Math.min(3, p.recoil + 0.7);
  camera.shake = Math.max(camera.shake, 1.7);
  addMuzzle(mx, my, a, 1);
  particles.push({
    type: 'casing', x: p.x + Math.cos(a - 1.4) * 16, y: p.y + Math.sin(a - 1.4) * 16,
    vx: Math.cos(a + 1.7) * rand(50, 90), vy: Math.sin(a + 1.7) * rand(50, 90),
    life: 0.55, max: 0.55, size: 2.2, rot: rand(0, TAU), vr: rand(-12, 12),
  });
  sfx.rifle();
  updateHUD();
}

function startReload() {
  const p = player;
  if (!p || p.reloading || p.ammo >= p.mag || p.reserve <= 0) return;
  p.reloading = true;
  p.reloadT = 0;
  p.dry = 0;
  ui.reloadTrack.classList.add('on');
  ui.reloadFill.style.width = '0%';
  sfx.reload();
}

function throwGrenade() {
  const p = player;
  if (!p || state !== 'playing' || p.grenades <= 0) return;
  p.grenades--;
  const a = p.aim + 0.04;
  const x = p.x + Math.cos(a) * 24;
  const y = p.y + Math.sin(a) * 24;
  grenades.push({
    x, y, vx: Math.cos(a) * 355, vy: Math.sin(a) * 355,
    life: 1.25, max: 1.25, r: 6, rot: rand(0, TAU),
  });
  sfx.grenade();
  showToast('FRAG OUT', 0.7);
  updateHUD(true);
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.life -= dt;
    g.rot += dt * 9;
    const nx = g.x + g.vx * dt;
    const ny = g.y + g.vy * dt;
    let blocked = false;
    for (let k = 0; k < obstacles.length; k++) {
      const o = obstacles[k];
      if (o.type === 'rect') {
        if (nx > o.x - g.r && nx < o.x + o.w + g.r && ny > o.y - g.r && ny < o.y + o.h + g.r) { blocked = true; break; }
      } else if (dist(nx, ny, o.x, o.y) < o.r + g.r) { blocked = true; break; }
    }
    if (blocked) {
      g.vx *= -0.32;
      g.vy *= -0.32;
      addDust(g.x, g.y, 3);
    } else {
      g.x = nx; g.y = ny;
      g.vx *= 0.985;
      g.vy *= 0.985;
    }
    g.x = clamp(g.x, 30, WORLD.w - 30);
    g.y = clamp(g.y, 30, WORLD.h - 30);
    if (g.life <= 0) {
      explode(g.x, g.y, 128, 120, true, 'grenade');
      grenades.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.type === 'shell' && Math.random() < 0.5) {
      addSmoke(b.x - b.vx * 0.01, b.y - b.vy * 0.01, 0.4, 5, rand(-6, 6), rand(-6, 6), 0.35);
    }

    let blocked = false;
    for (let k = 0; k < obstacles.length; k++) {
      const o = obstacles[k];
      const hit = o.type === 'rect'
        ? segRectHit(b.px, b.py, b.x, b.y, o.x, o.y, o.w, o.h)
        : segCircleHit(b.px, b.py, b.x, b.y, o.x, o.y, o.r * 0.82);
      if (hit) { blocked = true; break; }
    }

    if (blocked) {
      if (b.type === 'shell') {
        explode(b.x, b.y, 105, 26, false, 'shell');
      } else {
        addDust(b.x, b.y, b.team === 'player' ? 3 : 2);
      }
      b.dead = true;
      bullets.splice(i, 1);
      continue;
    }

    if (b.team === 'player') {
      for (let k = 0; k < enemies.length; k++) {
        const e = enemies[k];
        if (e.dead || e.spawnT > 0) continue;
        if (segCircleHit(b.px, b.py, b.x, b.y, e.x, e.y, e.r + 2)) {
          const isTank = e.type === 'tank';
          const dmg = b.dmg * (isTank ? 0.5 : 1);
          damageEnemy(e, dmg, b.x, b.y, isTank);
          bullets.splice(i, 1);
          b.dead = true;
          break;
        }
      }
    } else {
      if (!player.dead && segCircleHit(b.px, b.py, b.x, b.y, player.x, player.y, player.r + 1)) {
        if (b.type === 'shell') {
          explode(b.x, b.y, 95, 30, false, 'shell');
        } else {
          damagePlayer(b.dmg);
        }
        bullets.splice(i, 1);
        b.dead = true;
        continue;
      }
    }

    if (b.dead) { bullets.splice(i, 1); continue; }
    if (b.life <= 0) {
      if (b.type === 'shell') explode(b.x, b.y, 105, 26, false, 'shell');
      bullets.splice(i, 1);
      continue;
    }
    if (b.x < -60 || b.x > WORLD.w + 60 || b.y < -60 || b.y > WORLD.h + 60) {
      bullets.splice(i, 1);
    }
  }
}

/* ---------------- damage & explosions ---------------- */
function damagePlayer(d) {
  if (state !== 'playing' || !player || player.dead) return;
  player.hp -= d;
  player.hurt = 0.45;
  player.hitFlash = 0.12;
  camera.shake = Math.max(camera.shake, 5 + d * 0.4);
  for (let i = 0; i < 8; i++) {
    particles.push({
      type: 'blood', x: player.x + rand(-8, 8), y: player.y + rand(-8, 8),
      vx: rand(-70, 70), vy: rand(-70, 70), life: rand(0.3, 0.7), max: 0.7,
      size: rand(2, 5), drag: 3,
    });
  }
  sfx.hurt();
  if (player.hp <= 0) {
    player.hp = 0;
    playerDie();
  }
  updateHUD(true);
}

function damageEnemy(e, dmg, hx, hy, spark) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.11;
  if (spark) {
    for (let i = 0; i < 4; i++) {
      particles.push({
        type: 'spark', x: hx || e.x, y: hy || e.y,
        vx: rand(-120, 120), vy: rand(-120, 120),
        life: rand(0.12, 0.3), max: 0.3, size: rand(1, 2.4),
      });
    }
    sfx.hit();
  } else {
    for (let i = 0; i < 6; i++) {
      particles.push({
        type: 'blood', x: hx || e.x, y: hy || e.y,
        vx: rand(-90, 90), vy: rand(-90, 90), life: rand(0.25, 0.6), max: 0.6,
        size: rand(1.6, 4), drag: 4,
      });
    }
  }
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  kills++;
  const pts = e.type === 'tank' ? 500 : 100;
  score += pts;
  texts.push({
    x: e.x, y: e.y - e.r - 10, text: '+' + pts, color: e.type === 'tank' ? '#ffc27d' : '#e8dcc0',
    life: 0.9, max: 0.9,
  });
  if (e.type === 'tank') {
    explode(e.x, e.y, 150, 40, true, 'tank');
    for (let i = 0; i < 24; i++) {
      addSmoke(e.x + rand(-30, 30), e.y + rand(-30, 30), rand(1.2, 2.8), rand(20, 46), rand(-30, 30), rand(-30, 30), 0.9);
    }
    camera.shake = Math.max(camera.shake, 14);
    sfx.explosion(1);
  } else {
    for (let i = 0; i < 14; i++) {
      particles.push({
        type: 'blood', x: e.x + rand(-6, 6), y: e.y + rand(-6, 6),
        vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), max: 0.9,
        size: rand(2, 6), drag: 3,
      });
    }
    if (terrainCtx) {
      terrainCtx.fillStyle = 'rgba(73,25,20,.35)';
      terrainCtx.beginPath();
      terrainCtx.ellipse(e.x, e.y + 4, rand(9, 16), rand(6, 11), rand(0, TAU), 0, TAU);
      terrainCtx.fill();
    }
  }
  if (Math.random() < (e.type === 'tank' ? 0.9 : 0.18)) {
    dropPickup(e.x, e.y, e.type === 'tank' ? (Math.random() < 0.5 ? 'med' : 'ammo') : pick(['ammo', 'ammo', 'med', 'grenade']));
  }
  updateHUD(true);
}

function dropPickup(x, y, kind) {
  pickups.push({ x, y, kind, life: 22, bob: rand(0, TAU) });
}

function explode(x, y, radius, damage, fromPlayer, kind) {
  effects.push({ type: 'explosion', x, y, r: radius, life: 0, max: kind === 'tank' ? 0.85 : 0.55 });
  const near = dist(x, y, camera.x, camera.y);
  const vol = clamp(1 - near / 1400, 0.12, 1);
  if (!fromPlayer || kind === 'grenade' || kind === 'tank') sfx.explosion(vol);
  camera.shake = Math.max(camera.shake, clamp(13 - near / 160, 2, 13));

  for (let i = 0; i < 18; i++) {
    const a = rand(0, TAU), s = rand(30, 210);
    addSmoke(x + Math.cos(a) * rand(0, radius * 0.35), y + Math.sin(a) * rand(0, radius * 0.35),
      rand(0.7, 1.8), rand(14, 40), Math.cos(a) * s, Math.sin(a) * s, 0.75);
  }
  for (let i = 0; i < 20; i++) {
    const a = rand(0, TAU), s = rand(80, 340);
    particles.push({
      type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(0.18, 0.55), max: 0.55, size: rand(1.5, 4),
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(0, TAU), s = rand(40, 180);
    particles.push({
      type: 'debris', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(0.5, 1.1), max: 1.1, size: rand(2, 5), rot: rand(0, TAU), vr: rand(-8, 8), drag: 2,
    });
  }
  if (terrainCtx) {
    drawCrater(terrainCtx, x, y, rand(radius * 0.36, radius * 0.52), Math.random);
  }

  if (fromPlayer) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < radius + e.r) {
        const fall = 1 - d / (radius + e.r);
        damageEnemy(e, damage * (0.28 + 0.72 * fall), e.x, e.y, e.type === 'tank');
      }
    }
  } else if (!player.dead) {
    const d = dist(x, y, player.x, player.y);
    if (d < radius + player.r) {
      const fall = 1 - d / (radius + player.r);
      damagePlayer(damage * (0.3 + 0.7 * fall));
    }
  }
}

/* ---------------- particles ---------------- */
function addSmoke(x, y, life, size, vx, vy, alpha) {
  if (particles.length > 720) return;
  particles.push({
    type: 'smoke', x, y, vx: vx || rand(-10, 10), vy: vy || rand(-10, 10),
    life: life || 1, max: life || 1, size: size || 18,
    grow: rand(10, 26), alpha: alpha === undefined ? 0.4 : alpha, drag: 0.8,
  });
}
function addDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type: 'dust', x, y, vx: rand(-70, 70), vy: rand(-70, 70),
      life: rand(0.25, 0.55), max: 0.55, size: rand(3, 8), grow: 10, alpha: rand(0.25, 0.45), drag: 3,
    });
  }
}
function addMuzzle(x, y, a, scale) {
  for (let i = 0; i < 5; i++) {
    const aa = a + rand(-0.35, 0.35);
    particles.push({
      type: 'flash', x, y, vx: Math.cos(aa) * rand(60, 190) * scale, vy: Math.sin(aa) * rand(60, 190) * scale,
      life: rand(0.04, 0.1), max: 0.1, size: rand(8, 17) * scale,
    });
  }
  addSmoke(x, y, 0.45, rand(5, 9), Math.cos(a) * 30, Math.sin(a) * 30, 0.28);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const drag = p.drag || 0;
    if (drag) {
      const f = Math.max(0, 1 - drag * dt);
      p.vx *= f; p.vy *= f;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    if (p.grow) p.size += p.grow * dt;
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life += dt;
    if (e.life >= e.max) effects.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt;
    t.y -= dt * 26;
    if (t.life <= 0) texts.splice(i, 1);
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.bob += dt * 3;
    if (p.life <= 0) { pickups.splice(i, 1); continue; }
    const d = dist(p.x, p.y, player.x, player.y);
    if (d < 88) {
      p.x += (player.x - p.x) * dt * 5.5;
      p.y += (player.y - p.y) * dt * 5.5;
    }
    if (d < 30 && !player.dead) {
      collectPickup(p);
      pickups.splice(i, 1);
    }
  }
}

function collectPickup(p) {
  if (p.kind === 'med') {
    player.hp = Math.min(player.maxHp, player.hp + 35);
    showToast('FIELD DRESSING · +35 VITALS', 1.6);
  } else if (p.kind === 'ammo') {
    player.reserve += 60;
    showToast('AMMO CACHE · +60 ROUNDS', 1.6);
  } else {
    player.grenades = Math.min(5, player.grenades + 1);
    showToast('FRAG GRENADE · +1', 1.6);
  }
  sfx.pickup();
  updateHUD(true);
}

/* ---------------- enemies ---------------- */
function enemyShoot(e) {
  if (player.dead) return;
  const spread = e.type === 'storm' ? 0.105 : e.type === 'tank' ? 0.018 : 0.078;
  const a = Math.atan2(player.y - e.y, player.x - e.x) + rand(-spread, spread);
  const muzzle = e.type === 'tank' ? 42 : 21;
  const x = e.x + Math.cos(a) * muzzle;
  const y = e.y + Math.sin(a) * muzzle;
  if (e.type === 'tank') {
    bullets.push({
      x, y, px: x, py: y, vx: Math.cos(a) * 290, vy: Math.sin(a) * 290,
      life: 3.2, team: 'enemy', type: 'shell', dmg: 22, color: '#ffb066', dead: false,
    });
    addMuzzle(x, y, a, 2.4);
    const vol = clamp(1 - dist(e.x, e.y, player.x, player.y) / 1900, 0.18, 1);
    sfx.tankCannon(vol);
    camera.shake = Math.max(camera.shake, 4.5);
  } else {
    bullets.push({
      x, y, px: x, py: y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560,
      life: 1.5, team: 'enemy', type: 'rifle', dmg: e.type === 'storm' ? 4 : 7,
      color: '#ff8f66', dead: false,
    });
    addMuzzle(x, y, a, 0.85);
    const vol = clamp(1 - dist(e.x, e.y, player.x, player.y) / 1500, 0.12, 1);
    sfx.enemyRifle(vol);
  }
}

function updateEnemies(dt) {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    e.flash = Math.max(0, e.flash - dt);
    if (e.dead) continue;
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      continue;
    }

    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const targetA = Math.atan2(dy, dx);
    e.aim = angleLerp(e.aim, targetA, clamp(1 - Math.exp(-5 * dt), 0, 1));
    if (e.type === 'tank') {
      e.turret = angleLerp(e.turret, targetA, clamp(1 - Math.exp(-2.6 * dt), 0, 1));
    }

    let mx = 0, my = 0;
    if (!player.dead) {
      if (e.type === 'tank') {
        if (d > 560) { mx = dx / d; my = dy / d; }
        else if (d < 330) { mx = -dx / d; my = -dy / d; }
        else { mx = (-dy / d) * 0.42; my = (dx / d) * 0.42; }
      } else {
        if (d > e.range * 0.7) { mx = dx / d; my = dy / d; }
        else if (d < e.range * 0.28) { mx = -dx / d * 0.85; my = -dy / d * 0.85; }
        else {
          const s = Math.sin(gameTime * 1.15 + e.seed);
          mx = (-dy / d) * s * 0.58;
          my = (dx / d) * s * 0.58;
        }
      }
    }

    // keep squads from stacking
    for (let j = 0; j < enemies.length; j++) {
      if (j === i) continue;
      const o = enemies[j];
      if (o.dead || o.spawnT > 0) continue;
      const ddx = e.x - o.x, ddy = e.y - o.y;
      const rr = e.r + o.r + 7;
      const dd = Math.hypot(ddx, ddy);
      if (dd > 0.01 && dd < rr) {
        const push = (rr - dd) / rr;
        mx += (ddx / dd) * push * 1.1;
        my += (ddy / dd) * push * 1.1;
      }
    }

    // personal space from player
    if (d < e.r + player.r + 10) {
      mx -= (dx / d) * 0.8;
      my -= (dy / d) * 0.8;
    }

    let m = Math.hypot(mx, my);
    if (m > 0.001) { mx /= m; my /= m; }

    if (m > 0.001 && lineBlocked(e.x, e.y, e.x + mx * 58, e.y + my * 58)) {
      const base = Math.atan2(my, mx);
      const candidates = [base + 0.95, base - 0.95, base + 1.75, base - 1.75];
      for (let k = 0; k < candidates.length; k++) {
        const ca = candidates[k];
        const cx = Math.cos(ca), cy = Math.sin(ca);
        if (!lineBlocked(e.x, e.y, e.x + cx * 68, e.y + cy * 68)) {
          mx = cx; my = cy; m = 1; break;
        }
      }
    }

    if (m > 0.001 && !player.dead) {
      e.x += mx * e.speed * dt;
      e.y += my * e.speed * dt;
      resolveCircle(e, e.r);
      e.walk += dt * e.speed * 0.075;
      if (e.type === 'tank') {
        e.hull = angleLerp(e.hull, Math.atan2(my, mx), clamp(1 - Math.exp(-2.5 * dt), 0, 1));
      }
    }

    if (!player.dead && d < e.range + 40 && !lineBlocked(e.x, e.y, player.x, player.y)) {
      if (e.burst > 0) {
        e.burstT -= dt;
        if (e.burstT <= 0) {
          enemyShoot(e);
          e.burst--;
          e.burstT = 0.12;
        }
      }
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.burst <= 0) {
        if (e.type === 'storm') {
          e.burst = 3; e.burstT = 0; e.fireCd = rand(1.4, 2.35);
        } else if (e.type === 'tank') {
          enemyShoot(e); e.fireCd = rand(2.7, 3.9);
        } else {
          enemyShoot(e); e.fireCd = rand(1.8, 3.0);
        }
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead) enemies.splice(i, 1);
  }
}

function updateWaves(dt) {
  if (state !== 'playing') return;
  if (waveActive) {
    spawnTimer -= dt;
    if (waveQueue.length && enemies.length < Math.min(3 + wave, 9) && spawnTimer <= 0) {
      spawnEnemy(waveQueue.shift());
      spawnTimer = clamp(1.2 - wave * 0.035, 0.4, 1.2);
    }
    if (!waveQueue.length && enemies.length === 0) {
      waveActive = false;
      intermission = 4.5;
      const bonus = wave * 200;
      score += bonus;
      showBanner('SECTOR CLEARED', 'WAVE ' + wave + ' · +' + bonus + ' PTS', false, 2.2);
      player.hp = Math.min(player.maxHp, player.hp + 15);
      player.reserve += 70;
      player.grenades = Math.min(5, player.grenades + 1);
      showToast('SUPPLIES · +70 ROUNDS · +1 GRENADE', 2.8);
      sfx.pickup();
      updateHUD(true);
    }
  } else if (intermission > 0) {
    intermission -= dt;
    const secs = Math.max(1, Math.ceil(intermission));
    const txt = 'NEXT WAVE IN ' + secs;
    if (txt !== countdownText) {
      countdownText = txt;
      ui.countdown.textContent = txt;
      ui.countdown.classList.add('on');
    }
    if (intermission <= 0) {
      ui.countdown.classList.remove('on');
      beginWave();
    }
  }
}

/* ---------------- camera / ambient / game update ---------------- */
function updateCamera(dt) {
  if (!player) return;
  const lx = Math.cos(player.aim) * 36;
  const ly = Math.sin(player.aim) * 36;
  const tx = player.x + lx, ty = player.y + ly;
  camera.x = lerp(camera.x, tx, clamp(1 - Math.exp(-5.5 * dt), 0, 1));
  camera.y = lerp(camera.y, ty, clamp(1 - Math.exp(-5.5 * dt), 0, 1));
  camera.zoom = lerp(camera.zoom, baseZoom, clamp(1 - Math.exp(-3 * dt), 0, 1));
  camera.shake = Math.max(0, camera.shake - dt * 31);
  if (camera.shake > 0.1) {
    camera.shakeX = rand(-camera.shake, camera.shake);
    camera.shakeY = rand(-camera.shake, camera.shake);
  } else {
    camera.shakeX = 0; camera.shakeY = 0;
  }
}

const SMOKE_SOURCES = [[2032, 1402], [758, 758], [1730, 780]];
function updateAmbient(dt) {
  ambientTimer -= dt;
  if (ambientTimer <= 0) {
    ambientTimer = rand(0.13, 0.34);
    const s = pick(SMOKE_SOURCES);
    addSmoke(s[0] + rand(-20, 20), s[1] + rand(-20, 20), rand(1.4, 3.2), rand(14, 34),
      rand(-14, 14), rand(-30, -6), 0.34);
  }
  if (state === 'playing') {
    artilleryTimer -= dt;
    if (artilleryTimer <= 0) {
      artilleryTimer = rand(13, 25);
      if (Math.random() < 0.6) sfx.explosion(0.11);
    }
  }
}

function updateGame(dt) {
  gameTime += dt;
  updateWaves(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateGrenades(dt);
  updateBullets(dt);
  updateParticles(dt);
  updateAmbient(dt);
  updateCamera(dt);
  updateHUD();
}

function playerDie() {
  if (!player || player.dead) return;
  player.dead = true;
  state = 'dying';
  deathTimer = 1.35;
  camera.shake = Math.max(camera.shake, 17);
  for (let i = 0; i < 30; i++) {
    particles.push({
      type: 'blood', x: player.x + rand(-10, 10), y: player.y + rand(-10, 10),
      vx: rand(-170, 170), vy: rand(-170, 170), life: rand(0.4, 1.1), max: 1.1,
      size: rand(2, 7), drag: 2.4,
    });
  }
  if (terrainCtx) {
    terrainCtx.fillStyle = 'rgba(70,22,18,.5)';
    terrainCtx.beginPath();
    terrainCtx.ellipse(player.x, player.y + 5, 26, 18, rand(0, TAU), 0, TAU);
    terrainCtx.fill();
  }
  sfx.hurt();
  resetSticks();
  input.buttonFire = false;
  input.stickFire = false;
  mouse.down = false;
  ui.reloadTrack.classList.remove('on');
}

function finishGameOver() {
  state = 'gameover';
  const newBest = score > best;
  if (newBest) {
    best = score;
    try { localStorage.setItem('ironfront.best', String(best)); } catch (e) { /* ignore */ }
  }
  ui.goScore.textContent = score;
  ui.goWaves.textContent = wave;
  ui.goKills.textContent = kills;
  ui.goBest.textContent = (newBest ? 'NEW BEST · ' : 'BEST · ') + best;
  ui.goBest.classList.toggle('new', newBest);
  ui.bestScore.textContent = best;
  ui.hud.classList.add('hidden');
  ui.gameover.classList.remove('hidden');
  ui.pause.classList.add('hidden');
  clearBanner();
}

function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused';
  resetSticks();
  input.keys.clear();
  input.buttonFire = false;
  input.stickFire = false;
  mouse.down = false;
  ui.pauseWave.textContent = wave;
  ui.pauseScore.textContent = score;
  ui.pauseKills.textContent = kills;
  ui.pause.classList.remove('hidden');
  clearBanner();
}

function resumeGame() {
  if (state !== 'paused') return;
  ui.pause.classList.add('hidden');
  state = 'playing';
}

function returnToMenu() {
  state = 'menu';
  ui.menu.classList.remove('hidden');
  ui.pause.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.hud.classList.add('hidden');
  resetSticks();
  clearBanner();
  clearToast();
  menuTime = 0;
  camera.x = 1460; camera.y = 1070; camera.zoom = baseZoom * 0.95; camera.shake = 0;
  enemies = []; bullets = []; grenades = []; pickups = []; effects = []; texts = [];
  particles = particles.filter((p) => p.type === 'smoke' || p.type === 'dust');
  updateTiltUI();
  ui.bestScore.textContent = best;
}

/* ---------------- rendering ---------------- */
let minimapBase = null;

function buildMinimapBase() {
  if (!terrain) return;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  g.drawImage(terrain, 0, 0, WORLD.w, WORLD.h, 0, 0, 128, 96);
  g.globalAlpha = 0.45;
  g.fillStyle = '#1b1d13';
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === 'rect') {
      g.fillRect(o.x / WORLD.w * 128, o.y / WORLD.h * 96, Math.max(1, o.w / WORLD.w * 128), Math.max(1, o.h / WORLD.h * 96));
    } else {
      g.beginPath();
      g.arc(o.x / WORLD.w * 128, o.y / WORLD.h * 96, Math.max(1, o.r / WORLD.w * 128), 0, TAU);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  minimapBase = c;
}

function inView(x, y, pad) {
  const p = pad || 90;
  return Math.abs(x - camera.x) < W / camera.zoom / 2 + p &&
    Math.abs(y - camera.y) < H / camera.zoom / 2 + p;
}

function drawSoldier(g, ent, isPlayer) {
  const a = ent.aim;
  g.save();
  g.translate(ent.x, ent.y);
  g.fillStyle = 'rgba(10,9,5,.34)';
  g.beginPath(); g.ellipse(8, 11, 16, 10, 0, 0, TAU); g.fill();

  if (ent.dead) g.rotate(1.35);
  else g.rotate(a);

  const swing = Math.sin(ent.walk || 0) * 4;
  g.lineCap = 'round';
  g.strokeStyle = isPlayer ? '#3e4527' : '#3e4237';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(-5, -5); g.lineTo(-13, -6 - swing); g.stroke();
  g.beginPath(); g.moveTo(-5, 5); g.lineTo(-13, 6 + swing); g.stroke();
  g.strokeStyle = 'rgba(15,15,10,.5)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(-6, -6); g.lineTo(-13, -6 - swing); g.stroke();

  g.fillStyle = isPlayer ? '#4a4d2c' : '#494d42';
  roundRect(g, -13, -7, 9, 14, 3); g.fill();
  g.strokeStyle = 'rgba(20,20,13,.45)'; g.lineWidth = 1; g.stroke();

  g.fillStyle = isPlayer ? '#5d653b' : '#5d6355';
  g.beginPath(); g.ellipse(0, 0, 11, 8.5, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(20,20,13,.5)';
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = 'rgba(226,214,175,.08)';
  g.beginPath(); g.ellipse(-1, -3, 7, 4, -0.2, 0, TAU); g.fill();

  g.fillStyle = isPlayer ? '#6a7042' : '#6a6f5e';
  g.beginPath(); g.arc(6, -6, 4, 0, TAU); g.fill();
  g.beginPath(); g.arc(7, 5, 4, 0, TAU); g.fill();

  g.strokeStyle = '#2b2418';
  g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(2, 4); g.lineTo(27, 1.5); g.stroke();
  g.strokeStyle = '#5a4327';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 4.5); g.lineTo(8, 3.8); g.stroke();
  g.strokeStyle = 'rgba(210,190,140,.25)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(8, 2.6); g.lineTo(25, 1.2); g.stroke();

  g.fillStyle = isPlayer ? '#4f5735' : '#3f453d';
  g.beginPath(); g.arc(1, 0, 8.2, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(215,205,168,.22)';
  g.lineWidth = 1.3;
  g.beginPath(); g.arc(1, 0, 8.2, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.16)';
  g.beginPath(); g.arc(2.5, 0, 5.4, 0, TAU); g.fill();

  if (!isPlayer) {
    g.fillStyle = '#9c3c2b';
    g.fillRect(-7, -7, 3.4, 3.4);
  }
  g.restore();

  if (isPlayer && ent.fireFlash > 0) {
    const mx = ent.x + Math.cos(a) * 31;
    const my = ent.y + Math.sin(a) * 31;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = clamp(ent.fireFlash / 0.07, 0, 1);
    g.drawImage(SPR.flash, mx - 22, my - 22, 44, 44);
    g.restore();
  }
}

function drawHealthBar(g, x, y, w, ratio) {
  g.fillStyle = 'rgba(0,0,0,.58)';
  g.fillRect(x - w / 2, y, w, 4);
  g.fillStyle = ratio > 0.5 ? '#a7b66a' : ratio > 0.25 ? '#d1a54e' : '#c1553d';
  g.fillRect(x - w / 2, y, w * clamp(ratio, 0, 1), 4);
}

function drawTank(g, e) {
  g.save();
  g.translate(e.x, e.y);
  g.fillStyle = 'rgba(10,9,5,.4)';
  g.beginPath(); g.ellipse(9, 13, 44, 29, 0, 0, TAU); g.fill();

  g.save();
  g.rotate(e.hull);
  g.fillStyle = '#26251d';
  roundRect(g, -33, -26, 66, 12, 4); g.fill();
  roundRect(g, -33, 14, 66, 12, 4); g.fill();
  g.strokeStyle = 'rgba(155,144,112,.2)';
  g.lineWidth = 1;
  for (let x = -28; x < 32; x += 5) {
    g.beginPath(); g.moveTo(x, -26); g.lineTo(x, -14); g.stroke();
    g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 26); g.stroke();
  }
  g.fillStyle = '#4b4e3f';
  roundRect(g, -29, -19, 58, 38, 6); g.fill();
  g.strokeStyle = 'rgba(18,19,13,.65)';
  g.lineWidth = 1.4;
  g.stroke();
  g.fillStyle = 'rgba(65,71,48,.72)';
  g.beginPath(); g.ellipse(-10, -5, 11, 7, 0.3, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(13, 6, 9, 5, -0.4, 0, TAU); g.fill();
  g.fillStyle = '#373a2e';
  roundRect(g, 21, -13, 9, 26, 3); g.fill();
  g.fillStyle = 'rgba(210,200,160,.09)';
  roundRect(g, -25, -16, 48, 6, 3); g.fill();
  g.restore();

  g.save();
  g.rotate(e.turret);
  g.fillStyle = '#555949';
  g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(18,19,13,.7)';
  g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(210,200,160,.1)';
  g.beginPath(); g.arc(-3, -4, 9, 0, TAU); g.fill();
  g.strokeStyle = '#2d2c23';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(12, 0); g.lineTo(43, 0); g.stroke();
  g.strokeStyle = '#1f1e18';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(41, -3); g.lineTo(46, -3); g.stroke();
  g.beginPath(); g.moveTo(41, 3); g.lineTo(46, 3); g.stroke();
  g.restore();

  if (e.flash > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = e.flash / 0.11 * 0.4;
    g.fillStyle = '#ffe0b0';
    g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fill();
    g.restore();
  }
  g.restore();

  if (e.hp < e.maxHp) drawHealthBar(g, e.x, e.y - 48, 58, e.hp / e.maxHp);
}

function drawPickup(g, p) {
  const glow = p.kind === 'med' ? SPR.med : p.kind === 'ammo' ? SPR.ammo : SPR.grenade;
  const bob = Math.sin(p.bob) * 3;
  g.save();
  g.translate(p.x, p.y);
  const blink = p.life < 4 ? 0.5 + 0.5 * Math.sin(gameTime * 12) : 1;
  g.globalAlpha = blink;
  g.globalCompositeOperation = 'lighter';
  g.drawImage(glow, -28, -28, 56, 56);
  g.globalCompositeOperation = 'source-over';
  g.translate(0, bob);
  g.fillStyle = '#2c3021';
  roundRect(g, -11, -11, 22, 22, 3); g.fill();
  g.strokeStyle = p.kind === 'med' ? '#8fbf78' : p.kind === 'ammo' ? '#d5bb78' : '#e08b60';
  g.lineWidth = 1.4; g.stroke();
  g.fillStyle = p.kind === 'med' ? '#8fbf78' : p.kind === 'ammo' ? '#d5bb78' : '#e08b60';
  if (p.kind === 'med') {
    g.fillRect(-2, -7, 4, 14);
    g.fillRect(-7, -2, 14, 4);
  } else if (p.kind === 'ammo') {
    g.fillRect(-7, -5, 5, 10);
    g.fillRect(0, -5, 5, 10);
    g.fillStyle = '#2c3021';
    g.fillRect(-7, 3, 12, 2);
  } else {
    g.beginPath(); g.arc(0, 1, 5.5, 0, TAU); g.fill();
    g.fillStyle = '#2c3021';
    g.fillRect(-2, -8, 4, 4);
  }
  g.restore();
}

function drawGrenade(g, gr) {
  const t = 1 - gr.life / gr.max;
  const h = Math.sin(t * Math.PI) * 17;
  g.save();
  g.fillStyle = 'rgba(10,9,5,.34)';
  g.beginPath(); g.ellipse(gr.x + 4, gr.y + 6, 7, 4.5, 0, 0, TAU); g.fill();
  g.translate(gr.x, gr.y - h);
  g.rotate(gr.rot);
  g.fillStyle = '#3c412e';
  g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(215,205,168,.34)';
  g.lineWidth = 1; g.stroke();
  g.fillStyle = '#2b2e21';
  g.fillRect(-2, -9, 4, 4);
  g.restore();
  if (gr.life < 0.45 && Math.sin(gameTime * 42) > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.75;
    g.drawImage(SPR.grenade, gr.x - 12, gr.y - h - 12, 24, 24);
    g.restore();
  }
}

function drawBullets(g) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!inView(b.x, b.y, 60)) continue;
    const tail = b.type === 'shell' ? 0.05 : 0.018;
    const tx = b.x - b.vx * tail;
    const ty = b.y - b.vy * tail;
    if (b.type === 'shell') {
      g.globalAlpha = 0.8;
      g.strokeStyle = 'rgba(255,160,85,.9)';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(b.x, b.y); g.stroke();
      g.drawImage(SPR.spark, b.x - 12, b.y - 12, 24, 24);
    } else {
      g.globalAlpha = b.team === 'player' ? 0.95 : 0.85;
      g.strokeStyle = b.color;
      g.lineWidth = b.team === 'player' ? 2.1 : 1.7;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(b.x, b.y); g.stroke();
      g.fillStyle = b.color;
      g.beginPath(); g.arc(b.x, b.y, 1.6, 0, TAU); g.fill();
    }
  }
  g.restore();
}

function drawParticles(g) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!inView(p.x, p.y, 100)) continue;
    const a = clamp(p.life / p.max, 0, 1);
    if (p.type === 'smoke' || p.type === 'dust') {
      g.globalAlpha = a * (p.alpha || 0.4);
      const img = p.type === 'dust' ? SPR.dust : SPR.smoke;
      g.drawImage(img, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    } else if (p.type === 'blood') {
      g.globalAlpha = a * 0.6;
      g.drawImage(SPR.blood, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    } else if (p.type === 'flash') {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a;
      g.drawImage(SPR.flash, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      g.globalCompositeOperation = 'source-over';
    } else if (p.type === 'spark') {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a;
      g.strokeStyle = '#ffc27a';
      g.lineWidth = p.size;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
      g.stroke();
      g.globalCompositeOperation = 'source-over';
    } else if (p.type === 'debris') {
      g.globalAlpha = a;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot || 0);
      g.fillStyle = '#4a4230';
      g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      g.restore();
    } else if (p.type === 'casing') {
      g.globalAlpha = a;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot || 0);
      g.fillStyle = '#c6a65e';
      g.fillRect(-1.2, -0.8, 2.4, 1.6);
      g.restore();
    }
  }
  g.globalAlpha = 1;
}

function drawEffects(g) {
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    const t = e.life / e.max;
    const r = e.r * (0.22 + t * 1.05);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (1 - t) * 0.9;
    g.drawImage(SPR.flash, e.x - r, e.y - r, r * 2, r * 2);
    g.globalAlpha = (1 - t) * 0.55;
    g.strokeStyle = 'rgba(255,198,132,.8)';
    g.lineWidth = 4 * (1 - t) + 1;
    g.beginPath(); g.arc(e.x, e.y, r * 0.72, 0, TAU); g.stroke();
    g.restore();
  }
}

function drawAim(g) {
  if (!player || player.dead) return;
  const ax = Math.cos(player.aim), ay = Math.sin(player.aim);
  g.save();
  g.globalAlpha = 0.22;
  g.strokeStyle = '#efdfb0';
  g.lineWidth = 1;
  g.setLineDash([3, 8]);
  g.beginPath();
  g.moveTo(player.x + ax * 36, player.y + ay * 36);
  g.lineTo(player.x + ax * 158, player.y + ay * 158);
  g.stroke();
  g.setLineDash([]);
  g.translate(player.x + ax * 158, player.y + ay * 158);
  g.rotate(player.aim);
  g.globalAlpha = 0.7;
  g.strokeStyle = 'rgba(239,223,176,.8)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(6, 0); g.lineTo(13, 0);
  g.moveTo(-6, 0); g.lineTo(-13, 0);
  g.moveTo(0, 6); g.lineTo(0, 13);
  g.moveTo(0, -6); g.lineTo(0, -13);
  g.stroke();
  g.fillStyle = 'rgba(239,223,176,.8)';
  g.beginPath(); g.arc(0, 0, 1.4, 0, TAU); g.fill();
  g.restore();
}

function drawWorld() {
  if (!terrain) return;
  const vw = W / camera.zoom, vh = H / camera.zoom;
  let sx = Math.floor(camera.x - vw / 2 - 80);
  let sy = Math.floor(camera.y - vh / 2 - 80);
  let sw = Math.ceil(vw + 160), sh = Math.ceil(vh + 160);
  sx = clamp(sx, 0, WORLD.w); sy = clamp(sy, 0, WORLD.h);
  sw = Math.min(sw, WORLD.w - sx); sh = Math.min(sh, WORLD.h - sy);
  if (sw > 0 && sh > 0) ctx.drawImage(terrain, sx, sy, sw, sh, sx, sy, sw, sh);

  for (let i = 0; i < pickups.length; i++) {
    if (inView(pickups[i].x, pickups[i].y, 60)) drawPickup(ctx, pickups[i]);
  }
  for (let i = 0; i < grenades.length; i++) drawGrenade(ctx, grenades[i]);

  const list = [];
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (inView(o.x, o.y, o.r || Math.max(o.w, o.h))) list.push({ y: o.baseY, kind: 0, o });
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (inView(e.x, e.y, e.r + 30)) list.push({ y: e.y + e.r, kind: 1, e });
  }
  if (player && !player.dead) list.push({ y: player.y + player.r, kind: 2, p: player });
  list.sort((a, b) => a.y - b.y);

  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it.kind === 0) drawObstacle(ctx, it.o);
    else if (it.kind === 1) {
      const e = it.e;
      if (e.spawnT > 0) {
        ctx.globalAlpha = clamp(1 - e.spawnT / 0.75, 0, 1);
      }
      if (e.type === 'tank') drawTank(ctx, e);
      else {
        drawSoldier(ctx, e, false);
        if (e.hp < e.maxHp) drawHealthBar(ctx, e.x, e.y - 26, 24, e.hp / e.maxHp);
      }
      ctx.globalAlpha = 1;
    } else {
      drawSoldier(ctx, it.p, true);
    }
  }

  drawAim(ctx);
  drawBullets(ctx);
  drawEffects(ctx);
  drawParticles(ctx);

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    ctx.save();
    ctx.globalAlpha = clamp(t.life / t.max, 0, 1);
    ctx.fillStyle = t.color;
    ctx.font = 'bold 12px "Arial Narrow", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

function drawScreenFX() {
  const hpRatio = player ? clamp(player.hp / player.maxHp, 0, 1) : 1;
  if (player && player.hurt > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(120,20,12,0)');
    g.addColorStop(1, 'rgba(150,24,14,' + (player.hurt * 0.55) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (state === 'playing' && hpRatio < 0.34) {
    const pulse = 0.12 + 0.12 * Math.sin(gameTime * 6);
    ctx.fillStyle = 'rgba(120,20,14,' + pulse + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (state === 'dying') {
    const t = clamp(1 - deathTimer / 1.35, 0, 1);
    ctx.fillStyle = 'rgba(60,8,6,' + (t * 0.55) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMinimap() {
  if (!terrain) return;
  const g = ui.minimap.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.save();
  g.beginPath(); g.arc(64, 64, 61, 0, TAU); g.clip();
  g.fillStyle = 'rgba(13,15,10,.92)';
  g.fillRect(0, 0, 128, 128);
  if (minimapBase) {
    g.globalAlpha = 0.92;
    g.drawImage(minimapBase, 0, 16, 128, 96);
    g.globalAlpha = 1;
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dead) continue;
    const px = e.x / WORLD.w * 128;
    const py = 16 + e.y / WORLD.h * 96;
    g.fillStyle = e.type === 'tank' ? '#e08b45' : '#cc4a36';
    g.beginPath(); g.arc(px, py, e.type === 'tank' ? 3 : 1.7, 0, TAU); g.fill();
  }
  if (player && !player.dead) {
    const px = player.x / WORLD.w * 128;
    const py = 16 + player.y / WORLD.h * 96;
    g.save();
    g.translate(px, py);
    g.rotate(player.aim);
    g.fillStyle = '#e8dfc2';
    g.beginPath();
    g.moveTo(5, 0); g.lineTo(-3.5, -3); g.lineTo(-2, 0); g.lineTo(-3.5, 3);
    g.closePath(); g.fill();
    g.restore();
  }
  g.restore();

  g.strokeStyle = 'rgba(201,188,147,.42)';
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(64, 64, 61, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(239,229,201,.72)';
  g.font = 'bold 8px monospace';
  g.textAlign = 'center';
  g.fillText('N', 64, 11);
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0d0f0a';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + camera.shakeX, H / 2 + camera.shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawWorld();
  ctx.restore();
  drawScreenFX();
  if (state !== 'menu') drawMinimap();
}

function updateMenuScene(dt) {
  menuTime += dt;
  gameTime += dt;
  const cx = 1430 + Math.cos(menuTime * 0.055) * 235;
  const cy = 1035 + Math.sin(menuTime * 0.042) * 145;
  camera.x = lerp(camera.x, cx, clamp(1 - Math.exp(-1.1 * dt), 0, 1));
  camera.y = lerp(camera.y, cy, clamp(1 - Math.exp(-1.1 * dt), 0, 1));
  camera.zoom = lerp(camera.zoom, baseZoom * 0.95, clamp(1 - Math.exp(-1.4 * dt), 0, 1));
  updateAmbient(dt);
  updateParticles(dt);
  updateCameraShakeOnly(dt);
}

function updateCameraShakeOnly(dt) {
  camera.shake = Math.max(0, camera.shake - dt * 31);
  camera.shakeX = camera.shake > 0.1 ? rand(-camera.shake, camera.shake) : 0;
  camera.shakeY = camera.shake > 0.1 ? rand(-camera.shake, camera.shake) : 0;
}

/* ---------------- HUD ---------------- */
const hudCache = { hp: -1, ammo: -1, reserve: -1, grenades: -1, wave: -1, score: -1, kills: -1, low: -1 };

function updateHUD(force) {
  if (!player) return;
  const hp = Math.max(0, Math.round(player.hp));
  if (force || hp !== hudCache.hp) {
    hudCache.hp = hp;
    ui.hpText.textContent = hp;
    const ratio = clamp(player.hp / player.maxHp, 0, 1);
    ui.hpFill.style.width = (ratio * 100) + '%';
    const low = ratio <= 0.3 ? 2 : ratio <= 0.6 ? 1 : 0;
    if (low !== hudCache.low) {
      hudCache.low = low;
      ui.hpFill.classList.toggle('low', low === 2);
      ui.hpFill.classList.toggle('mid', low === 1);
    }
  }
  if (force || player.ammo !== hudCache.ammo) {
    hudCache.ammo = player.ammo;
    ui.ammoMag.textContent = player.ammo;
  }
  if (force || player.reserve !== hudCache.reserve) {
    hudCache.reserve = player.reserve;
    ui.ammoReserve.textContent = player.reserve;
  }
  if (force || player.grenades !== hudCache.grenades) {
    hudCache.grenades = player.grenades;
    ui.grenadeNum.textContent = player.grenades;
    ui.grenadeBtn.style.opacity = player.grenades > 0 ? '' : '0.42';
  }
  if (force || wave !== hudCache.wave) {
    hudCache.wave = wave;
    ui.waveNum.textContent = wave;
  }
  if (force || score !== hudCache.score) {
    hudCache.score = score;
    ui.scoreNum.textContent = score;
  }
  if (force || kills !== hudCache.kills) {
    hudCache.kills = kills;
    ui.killNum.textContent = kills;
  }
}

function showBanner(main, sub, hot, duration) {
  if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
  ui.bannerMain.textContent = main;
  ui.bannerSub.textContent = sub || '';
  ui.banner.classList.toggle('hot', !!hot);
  ui.banner.classList.remove('show');
  void ui.banner.offsetWidth;
  ui.banner.classList.add('show');
  bannerTimer = setTimeout(() => {
    ui.banner.classList.remove('show');
    bannerTimer = null;
  }, (duration || 2) * 1000);
}

function clearBanner() {
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = null;
  ui.banner.classList.remove('show');
}

function showToast(text, duration) {
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  ui.toast.textContent = text;
  ui.toast.classList.add('on');
  toastTimer = setTimeout(() => {
    ui.toast.classList.remove('on');
    toastTimer = null;
  }, (duration || 2) * 1000);
}

function clearToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  ui.toast.classList.remove('on');
}

/* ---------------- accelerometer tilt ---------------- */
function tiltNeedsPermission() {
  return typeof window.DeviceOrientationEvent !== 'undefined' &&
    typeof window.DeviceOrientationEvent.requestPermission === 'function';
}

function updateTiltUI() {
  const label = 'TILT AIM: ' + (tilt.enabled ? 'ON' : 'OFF');
  ui.tiltToggle.textContent = label;
  ui.pauseTiltBtn.textContent = 'TILT: ' + (tilt.enabled ? 'ON' : 'OFF');
  if (!tilt.enabled) {
    ui.tiltStatus.textContent = tiltNeedsPermission()
      ? 'Tilt aim off · tap for iOS motion permission'
      : 'Tilt aim off · optional accelerometer aiming';
  } else if (!tilt.valid) {
    ui.tiltStatus.textContent = 'Tilt calibrating · hold the device still';
  } else {
    ui.tiltStatus.textContent = 'Tilt aim active · tap HUD pill to center';
  }
  ui.tiltPill.classList.toggle('hidden', !tilt.enabled || state !== 'playing');
}

async function toggleTilt() {
  if (tilt.enabled) {
    disableTilt();
    return;
  }
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    showToast('MOTION SENSOR NOT AVAILABLE', 2.6);
    ui.tiltStatus.textContent = 'Motion sensor not available on this device';
    return;
  }
  if (tiltNeedsPermission()) {
    try {
      const result = await window.DeviceOrientationEvent.requestPermission();
      if (result !== 'granted') {
        showToast('MOTION ACCESS DENIED', 3);
        ui.tiltStatus.textContent = 'Motion permission denied · tilt stays off';
        return;
      }
    } catch (err) {
      showToast('MOTION ACCESS UNAVAILABLE', 3);
      ui.tiltStatus.textContent = 'Motion permission unavailable · use touch controls';
      return;
    }
  }
  tilt.enabled = true;
  tilt.valid = false;
  tilt.calibrating = true;
  tilt.samples = [];
  tilt.available = false;
  tilt.ax = 0; tilt.ay = 0;
  window.addEventListener('deviceorientation', onDeviceOrientation, true);
  showToast('TILT AIM ON · HOLD DEVICE STILL', 2.2);
  updateTiltUI();
  setTimeout(() => {
    if (tilt.calibrating) finishTiltCalibration();
  }, 1050);
}

function disableTilt() {
  tilt.enabled = false;
  tilt.valid = false;
  tilt.calibrating = false;
  window.removeEventListener('deviceorientation', onDeviceOrientation, true);
  ui.tiltPill.classList.add('hidden');
  updateTiltUI();
  showToast('TILT AIM OFF', 1.3);
}

function onDeviceOrientation(e) {
  if (e.beta == null && e.gamma == null) return;
  tilt.available = true;
  tilt.beta = e.beta || 0;
  tilt.gamma = e.gamma || 0;
  if (tilt.calibrating) {
    tilt.samples.push([tilt.beta, tilt.gamma]);
    if (tilt.samples.length > 80) tilt.samples.shift();
    return;
  }
  if (!tilt.valid) return;

  const angle = (screen.orientation && typeof screen.orientation.angle === 'number')
    ? screen.orientation.angle : (window.orientation || 0);
  const rad = -angle * Math.PI / 180;
  let bx = clamp((tilt.gamma - tilt.baseGamma) / 26, -1, 1);
  let by = clamp(-(tilt.beta - tilt.baseBeta) / 26, -1, 1);
  if (tilt.invertY) by = -by;
  let vx = bx * Math.cos(rad) - by * Math.sin(rad);
  let vy = bx * Math.sin(rad) + by * Math.cos(rad);
  const m = Math.hypot(vx, vy);
  const dz = 0.13;
  if (m < dz) {
    vx = 0; vy = 0;
  } else {
    const scale = (m - dz) / (1 - dz) / m;
    vx *= scale; vy *= scale;
  }
  tilt.ax = lerp(tilt.ax, clamp(vx, -1, 1), 0.22);
  tilt.ay = lerp(tilt.ay, clamp(vy, -1, 1), 0.22);
}

function finishTiltCalibration() {
  if (tilt.samples.length) {
    let sb = 0, sg = 0;
    for (let i = 0; i < tilt.samples.length; i++) {
      sb += tilt.samples[i][0];
      sg += tilt.samples[i][1];
    }
    tilt.baseBeta = sb / tilt.samples.length;
    tilt.baseGamma = sg / tilt.samples.length;
  } else {
    tilt.baseBeta = tilt.beta;
    tilt.baseGamma = tilt.gamma;
  }
  tilt.samples = [];
  tilt.calibrating = false;
  tilt.valid = tilt.available;
  tilt.ax = 0; tilt.ay = 0;
  if (tilt.valid) showToast('TILT CALIBRATED · TAP HUD PILL TO CENTER', 1.8);
  else showToast('NO MOTION DATA · USE TOUCH CONTROLS', 2.6);
  updateTiltUI();
}

function recalibrateTilt() {
  if (!tilt.enabled) {
    showToast('TILT AIM IS OFF', 1.4);
    return;
  }
  tilt.calibrating = true;
  tilt.valid = false;
  tilt.samples = [];
  showToast('RECENTERING · HOLD DEVICE STILL', 1.5);
  updateTiltUI();
  setTimeout(() => {
    if (tilt.calibrating) finishTiltCalibration();
  }, 720);
}

/* ---------------- touch sticks ---------------- */
function resetSticks() {
  input.left.id = null; input.left.active = false; input.left.mag = 0; input.left.dx = 0; input.left.dy = 0;
  input.right.id = null; input.right.active = false; input.right.mag = 0; input.right.dx = 0; input.right.dy = 0;
  input.stickFire = false;
  ui.stickLeft.classList.remove('active');
  ui.stickRight.classList.remove('active');
  const kl = ui.stickLeft.querySelector('.stick-knob');
  const kr = ui.stickRight.querySelector('.stick-knob');
  if (kl) kl.style.transform = 'translate(-50%,-50%)';
  if (kr) kr.style.transform = 'translate(-50%,-50%)';
}

function bindStick(zone, stick, data, side) {
  const knob = stick.querySelector('.stick-knob');
  let originX = 0, originY = 0;

  const updateKnob = (dx, dy) => {
    knob.style.transform = 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px))';
  };

  zone.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    if (data.id !== null) return;
    e.preventDefault();
    data.id = e.pointerId;
    data.active = true;
    data.dx = 0; data.dy = 0; data.mag = 0;
    originX = e.clientX; originY = e.clientY;
    stick.style.left = e.clientX + 'px';
    stick.style.top = e.clientY + 'px';
    stick.classList.add('active');
    updateKnob(0, 0);
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (side === 'right') input.stickFire = false;
  }, { passive: false });

  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== data.id) return;
    e.preventDefault();
    const max = Math.max(34, stick.offsetWidth * 0.34);
    let dx = e.clientX - originX;
    let dy = e.clientY - originY;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    updateKnob(dx, dy);
    data.dx = dx / max;
    data.dy = dy / max;
    data.mag = Math.min(1, d / max);
    if (side === 'right') input.stickFire = data.mag > 0.28;
  }, { passive: false });

  const end = (e) => {
    if (e.pointerId !== data.id) return;
    data.id = null;
    data.active = false;
    data.mag = 0;
    data.dx = 0; data.dy = 0;
    stick.classList.remove('active');
    updateKnob(0, 0);
    if (side === 'right') input.stickFire = false;
    try {
      if (zone.hasPointerCapture && zone.hasPointerCapture(e.pointerId)) zone.releasePointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
}

function bindHold(el, onDown, onUp) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    el.classList.add('pressed');
    onDown();
  }, { passive: false });
  const up = (e) => {
    if (e) e.preventDefault();
    el.classList.remove('pressed');
    onUp();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

/* ---------------- input wiring ---------------- */
function bindInput() {
  bindStick(ui.zoneLeft, ui.stickLeft, input.left, 'left');
  bindStick(ui.zoneRight, ui.stickRight, input.right, 'right');

  bindHold(ui.fireBtn, () => { input.buttonFire = true; }, () => { input.buttonFire = false; });

  ui.reloadBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'playing') startReload();
  }, { passive: false });

  ui.grenadeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'playing') throwGrenade();
  }, { passive: false });

  ui.pauseBtn.addEventListener('click', () => {
    if (state === 'playing') pauseGame();
  });

  ui.deployBtn.addEventListener('click', () => { initAudio(); startGame(); });
  ui.retryBtn.addEventListener('click', () => { initAudio(); startGame(); });
  ui.resumeBtn.addEventListener('click', () => { resumeGame(); });
  ui.restartBtn.addEventListener('click', () => { initAudio(); startGame(); });
  ui.menuBtn.addEventListener('click', () => { returnToMenu(); });
  ui.goMenuBtn.addEventListener('click', () => { returnToMenu(); });

  ui.tiltToggle.addEventListener('click', () => { toggleTilt(); });
  ui.pauseTiltBtn.addEventListener('click', () => { toggleTilt(); });
  ui.recenterBtn.addEventListener('click', () => { recalibrateTilt(); });
  ui.tiltPill.addEventListener('click', () => { recalibrateTilt(); });

  ui.soundToggle.addEventListener('click', () => { initAudio(); setMuted(!muted); sfx.click(); });
  ui.pauseMuteBtn.addEventListener('click', () => { initAudio(); setMuted(!muted); sfx.click(); });

  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (k === 'Space' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
    }
    input.keys.add(k);
    if (k === 'KeyR' && state === 'playing') startReload();
    if (k === 'KeyG' && state === 'playing') throwGrenade();
    if (k === 'KeyM') { initAudio(); setMuted(!muted); }
    if (k === 'KeyT') toggleTilt();
    if (k === 'KeyP' || k === 'Escape') {
      if (state === 'playing') pauseGame();
      else if (state === 'paused') resumeGame();
    }
    if (k === 'Enter') {
      if (state === 'menu') { initAudio(); startGame(); }
      else if (state === 'gameover') { initAudio(); startGame(); }
      else if (state === 'paused') resumeGame();
    }
  });
  window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.buttonFire = false;
    input.stickFire = false;
    mouse.down = false;
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    usingMouse = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (state !== 'playing') return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    usingMouse = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.down = true;
  });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') mouse.down = false;
  });

  window.addEventListener('contextmenu', (e) => {
    if (e.target === canvas) e.preventDefault();
  });

  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') pauseGame();
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resize();
      if (tilt.enabled) recalibrateTilt();
    }, 400);
  });
}

/* ---------------- main loop ---------------- */
let lastTime = 0;

function frame(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  if (state === 'playing') {
    updateGame(dt);
  } else if (state === 'menu') {
    updateMenuScene(dt);
  } else if (state === 'dying') {
    gameTime += dt;
    deathTimer -= dt;
    camera.zoom = lerp(camera.zoom, baseZoom * 1.08, clamp(1 - Math.exp(-1.7 * dt), 0, 1));
    updateParticles(dt);
    updateAmbient(dt);
    updateCameraShakeOnly(dt);
    if (deathTimer <= 0) finishGameOver();
  } else if (state === 'gameover') {
    gameTime += dt;
    updateParticles(dt * 0.35);
    updateAmbient(dt * 0.5);
    updateCameraShakeOnly(dt);
  }

  render();
  requestAnimationFrame(frame);
}

/* ---------------- boot ---------------- */
function boot() {
  try {
    best = parseInt(localStorage.getItem('ironfront.best') || '0', 10) || 0;
  } catch (e) { best = 0; }
  ui.bestScore.textContent = best;
  ui.goBest.textContent = 'BEST · ' + best;
  buildParticleSprites();
  buildObstacles();
  resize();
  generateTerrain();
  buildMinimapBase();
  camera.x = 1460;
  camera.y = 1070;
  camera.zoom = baseZoom * 0.95;
  bindInput();
  updateTiltUI();
  setMuted(false);
  requestAnimationFrame(frame);

  if (new URLSearchParams(location.search).has('debug')) {
    window.__IRONFRONT__ = {
      spawn(type, dx, dy) {
        if (!player) return false;
        spawnEnemy(type || 'rifle', { x: player.x + (dx === undefined ? 260 : dx), y: player.y + (dy === undefined ? 0 : dy) });
        return true;
      },
      god() { if (player) { player.maxHp = 9999; player.hp = 9999; } },
      nuke() { for (let i = 0; i < enemies.length; i++) damageEnemy(enemies[i], 99999); },
      enemies() { return enemies.map((e) => ({ type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp), spawnT: Number(e.spawnT.toFixed(2)) })); },
      snapshot() {
        return {
          state, wave, score, kills,
          hp: player ? Math.round(player.hp) : null,
          px: player ? Math.round(player.x) : null,
          py: player ? Math.round(player.y) : null,
          aim: player ? Number(player.aim.toFixed(2)) : null,
          ammo: player ? player.ammo : null,
          reserve: player ? player.reserve : null,
          enemies: enemies.length,
          bullets: bullets.length,
          particles: particles.length,
          cam: { x: Math.round(camera.x), y: Math.round(camera.y), zoom: Number(camera.zoom.toFixed(3)) },
          tilt: { enabled: tilt.enabled, valid: tilt.valid, ax: tilt.ax, ay: tilt.ay },
        };
      },
    };
  }
}

boot();

})();
