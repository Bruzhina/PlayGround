import * as THREE from './vendor/three.module.js';

/* ------------------------------------------------------------------ *
 *  Blockhaven — a small, hand-built voxel sandbox.
 *  Every visual is generated in the browser: textures, terrain, trees,
 *  the cabin, clouds, particles and audio.
 * ------------------------------------------------------------------ */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

const WORLD_X = 128;
const WORLD_Y = 48;
const WORLD_Z = 128;
const CHUNK = 16;
const WATER_LEVEL = 6;
const TILE = 16;
const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;

const TYPE = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, LOG: 6,
  LEAVES: 7, PLANKS: 8, BRICK: 9, GLASS: 10, WATER: 11, GLOW: 12,
  BEDROCK: 13, ROOF: 14, BIRCH_LOG: 15, BIRCH_LEAVES: 16, SNOW: 17, GRAVEL: 18,
};

const TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand', 'log_side', 'log_top',
  'leaves', 'planks', 'brick', 'glass', 'glow', 'bedrock', 'roof', 'birch_side',
  'birch_top', 'birch_leaves', 'snow', 'gravel', 'water',
];
const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((name, i) => [name, i]));

const BLOCKS = {
  [TYPE.GRASS]: { name: 'Grass Block', top: 'grass_top', side: 'grass_side', bottom: 'dirt', solid: true, hardness: 0.36, color: '#72b948' },
  [TYPE.DIRT]: { name: 'Dirt', top: 'dirt', side: 'dirt', bottom: 'dirt', solid: true, hardness: 0.4, color: '#855a37' },
  [TYPE.STONE]: { name: 'Stone', top: 'stone', side: 'stone', bottom: 'stone', solid: true, hardness: 0.82, color: '#85857f' },
  [TYPE.COBBLE]: { name: 'Cobblestone', top: 'cobble', side: 'cobble', bottom: 'cobble', solid: true, hardness: 0.76, color: '#74746f' },
  [TYPE.SAND]: { name: 'Sand', top: 'sand', side: 'sand', bottom: 'sand', solid: true, hardness: 0.32, color: '#d8c38a' },
  [TYPE.LOG]: { name: 'Oak Log', top: 'log_top', side: 'log_side', bottom: 'log_top', solid: true, hardness: 0.6, color: '#6f4b2d' },
  [TYPE.LEAVES]: { name: 'Oak Leaves', top: 'leaves', side: 'leaves', bottom: 'leaves', solid: true, hardness: 0.22, color: '#3f7d32' },
  [TYPE.PLANKS]: { name: 'Oak Planks', top: 'planks', side: 'planks', bottom: 'planks', solid: true, hardness: 0.52, color: '#b1844c' },
  [TYPE.BRICK]: { name: 'Bricks', top: 'brick', side: 'brick', bottom: 'brick', solid: true, hardness: 0.7, color: '#a24f3b' },
  [TYPE.GLASS]: { name: 'Glass', top: 'glass', side: 'glass', bottom: 'glass', solid: true, hardness: 0.28, color: '#a5d9df', transparent: true },
  [TYPE.WATER]: { name: 'Water', top: 'water', side: 'water', bottom: 'water', solid: false, liquid: true, hardness: 0.4, color: '#3aa0c4' },
  [TYPE.GLOW]: { name: 'Glowstone', top: 'glow', side: 'glow', bottom: 'glow', solid: true, hardness: 0.4, color: '#e1b34c' },
  [TYPE.BEDROCK]: { name: 'Bedrock', top: 'bedrock', side: 'bedrock', bottom: 'bedrock', solid: true, hardness: Infinity, color: '#3a3a3a' },
  [TYPE.ROOF]: { name: 'Dark Shingles', top: 'roof', side: 'roof', bottom: 'roof', solid: true, hardness: 0.55, color: '#4e3b30' },
  [TYPE.BIRCH_LOG]: { name: 'Birch Log', top: 'birch_top', side: 'birch_side', bottom: 'birch_top', solid: true, hardness: 0.6, color: '#d6d0bb' },
  [TYPE.BIRCH_LEAVES]: { name: 'Birch Leaves', top: 'birch_leaves', side: 'birch_leaves', bottom: 'birch_leaves', solid: true, hardness: 0.22, color: '#6a9c43' },
  [TYPE.SNOW]: { name: 'Snow', top: 'snow', side: 'snow', bottom: 'snow', solid: true, hardness: 0.3, color: '#edf4f1' },
  [TYPE.GRAVEL]: { name: 'Gravel', top: 'gravel', side: 'gravel', bottom: 'gravel', solid: true, hardness: 0.46, color: '#8d8981' },
};

const HOTBAR = [TYPE.GRASS, TYPE.DIRT, TYPE.STONE, TYPE.COBBLE, TYPE.LOG, TYPE.PLANKS, TYPE.LEAVES, TYPE.SAND, TYPE.GLASS];
const CABIN = { x: 42, z: 51, w: 9, d: 7 };
const POND = { x: 67, z: 58, rx: 13, rz: 9.5 };
const SPAWN = { x: 64, z: 87 };
const DEFAULT_WORLD_SEED = 390713841;

/* ------------------------------------------------------------------ *
 *  DOM + shared state
 * ------------------------------------------------------------------ */

const canvas = $('#game-canvas');
const loadingScreen = $('#loading-screen');
const loadFill = $('#load-fill');
const loadStatus = $('#load-status');
const hotbarEl = $('#hotbar');
const blockLabel = $('#block-label');
const toastEl = $('#toast');
const hintEl = $('#hint');
const targetLabel = $('#target-label');
const mineMeter = $('#mine-meter');
const mineArc = $('#mine-arc');
const coordsX = $('#coord-x');
const coordsY = $('#coord-y');
const coordsZ = $('#coord-z');
const joystick = $('#joystick');
const joyKnob = $('#joy-knob');
const tiltButton = $('#tilt-btn');
const tiltSwitch = $('#tilt-switch');
const tiltValue = $('#tilt-value');

const isTouchDevice = (() => {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return Boolean(coarse || navigator.maxTouchPoints > 1 || window.innerWidth <= 900);
})();
if (isTouchDevice) document.body.classList.add('touch');

const settings = { invert: false, muted: false, sensitivity: 1, tilt: false };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('blockhaven.settings.v1') || '{}'));
} catch { /* storage can be unavailable */ }

const state = {
  paused: false,
  time: 0,
  selected: 0,
  target: null,
  targetKey: '',
  mining: 0,
  miningKey: '',
  placeCooldown: 0,
  saveTimer: 0,
  goals: { wood: 0, build: 0, cabin: false, woodDone: false, buildDone: false },
  cameraShake: 0,
  tiltEnabled: false,
  tiltBaseline: null,
  tiltSamples: 0,
  tiltX: 0,
  tiltY: 0,
  tiltRaw: 0,
  skipUnloadSave: false,
};

let worldSeed = 0;
let edits = {};
let world = null;
let heightMap = null;
let audio = null;
let handSwing = 0;
let toastTimer = null;
let saveTimerId = null;
let hudClock = 0;

/* ------------------------------------------------------------------ *
 *  Seeded noise + math
 * ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, z, seed = worldSeed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const tx = smooth(x - xi);
  const tz = smooth(z - zi);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

function fbm(x, z) {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;
  for (let i = 0; i < 4; i += 1) {
    value += amplitude * noise2(x * frequency, z * frequency);
    frequency *= 2.03;
    amplitude *= 0.48;
  }
  return value;
}

function rawHeight(x, z) {
  const broad = fbm(x * 0.028 + 13.7, z * 0.028 - 4.2);
  const detail = noise2(x * 0.085 - 8.1, z * 0.085 + 2.7);
  const micro = noise2(x * 0.21 + 4.4, z * 0.21 - 6.9);
  let h = 7.2 + broad * 11.2 + detail * 2.7 + micro * 1.15;

  const spawnD = Math.hypot((x - SPAWN.x) / 18, (z - SPAWN.z) / 14);
  if (spawnD < 1) h += (1 - spawnD) * (1 - spawnD) * 7.5;

  const vistaD = Math.hypot((x - 61) / 22, (z - 70) / 16);
  if (vistaD < 1.22) {
    const open = 1 - smooth(clamp(vistaD / 1.22, 0, 1));
    const meadow = 9.4 + noise2(x * 0.11, z * 0.11) * 1.8;
    h = lerp(h, Math.min(h, meadow), open * 0.82);
  }

  const pondD = Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz);
  if (pondD < 2.15) {
    const shore = clamp((1.35 - pondD) / 0.35, 0, 1);
    const pondFloor = 3.3 + noise2(x * 0.25, z * 0.25) * 2.4;
    h = lerp(h, pondFloor, shore * 0.96);
    const bank = 1 - smooth(clamp((pondD - 1.08) / 1.07, 0, 1));
    const rim = 10.2 + noise2(x * 0.09 + 7, z * 0.09 - 3) * 2.6;
    h = lerp(h, Math.min(h, rim), bank * 0.8);
  }
  return Math.floor(clamp(h, 2, WORLD_Y - 8));
}

const cabinHeight = Math.floor(rawHeight(CABIN.x, CABIN.z));
function heightAt(x, z) {
  let h = rawHeight(x, z);
  const dx = x - CABIN.x;
  const dz = z - CABIN.z;
  const d = Math.hypot(dx / (CABIN.w * 0.78), dz / (CABIN.d * 0.82));
  if (d < 1.55) {
    const blend = d < 1.02 ? 1 : 1 - smooth(clamp((d - 1.02) / 0.53, 0, 1));
    h = Math.round(lerp(h, cabinHeight, blend));
  }
  return h;
}

function blockIndex(x, y, z) { return (y * WORLD_Z + z) * WORLD_X + x; }
function inWorld(x, y, z) { return x >= 0 && x < WORLD_X && y >= 0 && y < WORLD_Y && z >= 0 && z < WORLD_Z; }
function getBlock(x, y, z) { return inWorld(x, y, z) ? world[blockIndex(x, y, z)] : TYPE.AIR; }
function isSolid(type) { return type !== TYPE.AIR && Boolean(BLOCKS[type]?.solid); }
function isOpaqueCuller(type) { return type !== TYPE.AIR && type !== TYPE.WATER && type !== TYPE.GLASS; }
function setRawBlock(x, y, z, type) {
  if (!inWorld(x, y, z)) return false;
  world[blockIndex(x, y, z)] = type;
  return true;
}

/* ------------------------------------------------------------------ *
 *  Procedural pixel-art texture atlas
 * ------------------------------------------------------------------ */

const tileCanvases = {};
let atlasCanvas = null;
let atlasTexture = null;

function tileCanvas(name) {
  if (tileCanvases[name]) return tileCanvases[name];
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d');
  const rnd = mulberry32((0x9e3779b9 ^ (name.length * 2654435761)) >>> 0);
  const px = (x, y, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); };
  const fill = (color) => { ctx.fillStyle = color; ctx.fillRect(0, 0, TILE, TILE); };
  const speckle = (colors, count = 24) => {
    for (let i = 0; i < count; i += 1) px(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), colors[Math.floor(rnd() * colors.length)]);
  };

  switch (name) {
    case 'grass_top': {
      fill('#69ad43');
      speckle(['#5d9f3b', '#77bd4b', '#84c854', '#559135', '#93d35f'], 58);
      for (let i = 0; i < 6; i += 1) {
        const x = Math.floor(rnd() * 15);
        const y = Math.floor(rnd() * TILE);
        px(x, y, '#a4dc69'); px(x + 1, y, '#8bca58');
      }
      break;
    }
    case 'grass_side': {
      fill('#845a37');
      speckle(['#78502f', '#91643f', '#6e472a', '#9a7048'], 40);
      for (let x = 0; x < TILE; x += 1) {
        const depth = 3 + Math.floor(rnd() * 3);
        for (let y = 0; y < depth; y += 1) {
          px(x, y, y === 0 ? '#82c34f' : y === 1 ? '#6cb241' : y === 2 ? '#5d9f39' : '#4f8c31');
        }
        if (rnd() > 0.72) px(x, depth, '#4d8930');
      }
      for (let i = 0; i < 4; i += 1) px(Math.floor(rnd() * TILE), 8 + Math.floor(rnd() * 7), '#a37a4d');
      break;
    }
    case 'dirt': {
      fill('#855b37');
      speckle(['#78502f', '#916440', '#6e472b', '#9d7149', '#5d3d25'], 62);
      break;
    }
    case 'stone': {
      fill('#878783');
      speckle(['#7b7b77', '#92928d', '#70706c', '#9d9d97'], 58);
      for (let i = 0; i < 3; i += 1) {
        let x = Math.floor(rnd() * TILE);
        let y = 3 + Math.floor(rnd() * 10);
        const len = 2 + Math.floor(rnd() * 4);
        for (let k = 0; k < len; k += 1) {
          px(clamp(x + k, 0, 15), y, '#686864');
          if (k === 1) y += 1;
        }
      }
      break;
    }
    case 'cobble': {
      fill('#74746f');
      const stones = [[1, 1, 6, 4], [8, 1, 6, 3], [2, 6, 4, 4], [7, 5, 7, 5], [2, 11, 5, 3], [8, 11, 6, 3]];
      for (const [x, y, w, h] of stones) {
        ctx.fillStyle = '#82827c'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        ctx.fillStyle = '#94948e'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
        ctx.fillStyle = '#666661'; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
      }
      speckle(['#8f8f89', '#686863', '#9b9b94'], 22);
      break;
    }
    case 'sand': {
      fill('#d9c58d');
      speckle(['#ceb77c', '#e4d29a', '#c7af72', '#eeddaa'], 66);
      break;
    }
    case 'log_side': {
      fill('#6e4b2d');
      for (let x = 0; x < TILE; x += 1) {
        const tone = 0.82 + rnd() * 0.28;
        const shade = Math.floor(76 * tone);
        ctx.fillStyle = `rgb(${shade + 34},${Math.floor(shade * 0.74)},${Math.floor(shade * 0.43)})`;
        ctx.fillRect(x, 0, 1, TILE);
      }
      for (let i = 0; i < 9; i += 1) {
        const x = Math.floor(rnd() * TILE);
        ctx.fillStyle = '#50341e';
        ctx.fillRect(x, Math.floor(rnd() * 13), 1, 2 + Math.floor(rnd() * 3));
      }
      ctx.fillStyle = '#3f2918'; ctx.fillRect(4, 6, 3, 2);
      break;
    }
    case 'log_top': {
      fill('#7c5836');
      for (let r = 1; r < 8; r += 2) {
        ctx.strokeStyle = r % 4 === 1 ? '#9d774a' : '#654329';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#5b3b24'; ctx.fillRect(7, 7, 2, 2);
      speckle(['#8e6a42', '#6c4a2c'], 8);
      break;
    }
    case 'leaves': {
      fill('#3e7d32');
      speckle(['#34702a', '#4a8b38', '#2b6126', '#579943', '#245622'], 70);
      ctx.clearRect(0, 0, TILE, TILE);
      fill('#3e7d32');
      speckle(['#34702a', '#4a8b38', '#2b6126', '#579943', '#245622'], 70);
      for (let i = 0; i < 10; i += 1) {
        ctx.clearRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1 + Math.floor(rnd() * 2), 1);
      }
      break;
    }
    case 'birch_leaves': {
      fill('#5f963b');
      speckle(['#6fa946', '#548a34', '#7eb452', '#46762c', '#8cc15e'], 72);
      for (let i = 0; i < 9; i += 1) {
        ctx.clearRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1 + Math.floor(rnd() * 2), 1);
      }
      break;
    }
    case 'planks': {
      fill('#b1844c');
      for (let y = 0; y < TILE; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#a97b45' : '#ba8e54';
        ctx.fillRect(0, y, TILE, 3);
        ctx.fillStyle = '#805b31'; ctx.fillRect(0, y + 3, TILE, 1);
      }
      ctx.fillStyle = '#865f34';
      ctx.fillRect(10, 0, 1, 4); ctx.fillRect(4, 4, 1, 4);
      ctx.fillRect(12, 8, 1, 4); ctx.fillRect(7, 12, 1, 4);
      speckle(['#9e7340', '#c0955b'], 10);
      break;
    }
    case 'brick': {
      fill('#b7a690');
      for (let row = 0; row < 4; row += 1) {
        const y = row * 4;
        const offset = row % 2 === 0 ? 0 : -4;
        for (let bx = offset; bx < TILE; bx += 8) {
          ctx.fillStyle = '#9c4937'; ctx.fillRect(bx + 1, y + 1, 6, 2);
          ctx.fillStyle = '#b25b47'; ctx.fillRect(bx + 1, y + 1, 6, 1);
        }
      }
      speckle(['#8e4131', '#c05f49'], 8);
      break;
    }
    case 'glass': {
      ctx.clearRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(181, 228, 237, .16)'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(209, 244, 250, .52)'; ctx.fillRect(0, 0, TILE, 1); ctx.fillRect(0, 0, 1, TILE);
      ctx.fillStyle = 'rgba(143, 203, 219, .42)'; ctx.fillRect(0, 15, TILE, 1); ctx.fillRect(15, 0, 1, TILE);
      ctx.fillStyle = 'rgba(222, 250, 255, .42)';
      ctx.fillRect(3, 3, 1, 6); ctx.fillRect(4, 3, 4, 1); ctx.fillRect(10, 10, 1, 3);
      break;
    }
    case 'glow': {
      fill('#d9a63e');
      speckle(['#f4cf68', '#bf872b', '#f8df8c', '#a66f21', '#e7b94e'], 54);
      ctx.fillStyle = '#fff1b0'; ctx.fillRect(3, 4, 2, 2); ctx.fillRect(10, 10, 3, 2);
      break;
    }
    case 'bedrock': {
      fill('#3a3a39');
      speckle(['#2b2b2b', '#4b4b49', '#575754', '#202020'], 68);
      break;
    }
    case 'roof': {
      fill('#4e3b30');
      for (let y = 0; y < TILE; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#574237' : '#46352c';
        ctx.fillRect(0, y, TILE, 3);
        ctx.fillStyle = '#2c211b'; ctx.fillRect(0, y + 3, TILE, 1);
      }
      for (let x = 2; x < TILE; x += 5) {
        ctx.fillStyle = '#5f493b'; ctx.fillRect(x, 0, 1, TILE);
        ctx.fillStyle = '#35271f'; ctx.fillRect(x + 1, 0, 1, TILE);
      }
      speckle(['#634b3b', '#3e2d25'], 8);
      break;
    }
    case 'birch_side': {
      fill('#ddd7c4');
      speckle(['#d2cdb8', '#e8e2d1', '#c5c0ad'], 30);
      for (let i = 0; i < 7; i += 1) {
        const x = Math.floor(rnd() * 14);
        const y = Math.floor(rnd() * TILE);
        ctx.fillStyle = '#514d43'; ctx.fillRect(x, y, 2 + Math.floor(rnd() * 2), 1);
        if (rnd() > 0.5) ctx.fillRect(x + 1, y + 1, 1, 1);
      }
      ctx.fillStyle = 'rgba(114, 107, 89, .35)'; ctx.fillRect(3, 0, 1, TILE);
      break;
    }
    case 'birch_top': {
      fill('#c8b98f');
      for (let r = 1; r < 7; r += 2) {
        ctx.strokeStyle = r % 4 === 1 ? '#d8cba4' : '#a8956a';
        ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#8e7b52'; ctx.fillRect(7, 7, 2, 2);
      break;
    }
    case 'snow': {
      fill('#eef4f2');
      speckle(['#e3edeb', '#f8fbfa', '#d6e3e1', '#cddbd9'], 48);
      break;
    }
    case 'gravel': {
      fill('#8b877f');
      speckle(['#76726b', '#9d9991', '#68645e', '#aaa69d', '#7f7b73'], 70);
      break;
    }
    case 'grass_tuft': {
      ctx.clearRect(0, 0, TILE, TILE);
      for (let i = 0; i < 9; i += 1) {
        const x = 3 + Math.floor(rnd() * 10);
        const h = 5 + Math.floor(rnd() * 8);
        ctx.fillStyle = ['#4d8530', '#5e9c3a', '#74b349', '#3d7027'][i % 4];
        ctx.fillRect(x, TILE - h, 1, h);
        if (i % 3 === 0) {
          ctx.fillRect(x - 1, TILE - h + 2, 1, 2);
          ctx.fillRect(x + 1, TILE - h + 1, 1, 2);
        }
      }
      break;
    }
    case 'flower_red': {
      ctx.clearRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#4f8a31'; ctx.fillRect(7, 7, 1, 9); ctx.fillRect(5, 10, 2, 1); ctx.fillRect(8, 12, 2, 1);
      ctx.fillStyle = '#d9524a'; ctx.fillRect(5, 4, 2, 2); ctx.fillRect(9, 4, 2, 2); ctx.fillRect(7, 2, 2, 2); ctx.fillRect(7, 6, 2, 2);
      ctx.fillStyle = '#f0c754'; ctx.fillRect(7, 4, 2, 2);
      break;
    }
    case 'water': {
      fill('#3e9ec0');
      for (let y = 0; y < TILE; y += 1) {
        for (let x = 0; x < TILE; x += 1) {
          const wave = Math.sin(x * 0.72 + y * 0.38) + Math.sin(x * 0.21 - y * 0.61);
          if (wave > 0.7) px(x, y, '#59b9d5');
          else if (wave < -0.85) px(x, y, '#3187a8');
        }
      }
      speckle(['#6dc8df', '#2f86a7', '#4aafca'], 16);
      break;
    }
    case 'flower_yellow': {
      ctx.clearRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#4f8a31'; ctx.fillRect(8, 8, 1, 8); ctx.fillRect(5, 12, 3, 1);
      ctx.fillStyle = '#efd05c'; ctx.fillRect(6, 3, 4, 2); ctx.fillRect(5, 5, 2, 2); ctx.fillRect(9, 5, 2, 2); ctx.fillRect(7, 7, 2, 1);
      ctx.fillStyle = '#b88726'; ctx.fillRect(7, 5, 2, 2);
      break;
    }
    default: fill('#ff00ff');
  }
  tileCanvases[name] = c;
  return c;
}

function buildAtlas() {
  atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ATLAS_COLS * TILE;
  atlasCanvas.height = ATLAS_ROWS * TILE;
  const ctx = atlasCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < TILE_NAMES.length; i += 1) {
    const c = tileCanvas(TILE_NAMES[i]);
    ctx.drawImage(c, (i % ATLAS_COLS) * TILE, Math.floor(i / ATLAS_COLS) * TILE);
  }
  atlasTexture = new THREE.CanvasTexture(atlasCanvas);
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.generateMipmaps = false;
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
}

function standaloneTexture(name) {
  const tex = new THREE.CanvasTexture(tileCanvas(name));
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ *
 *  World generation
 * ------------------------------------------------------------------ */

const dataDecor = { grass: [], flowers: [] };

function fillColumn(x, z, h) {
  let top = TYPE.GRASS;
  let filler = TYPE.DIRT;
  if (h <= WATER_LEVEL + 1) {
    top = TYPE.SAND;
    filler = TYPE.SAND;
  } else if (h >= 24) {
    top = TYPE.SNOW;
    filler = TYPE.STONE;
  } else if (h >= 21) {
    top = TYPE.STONE;
    filler = TYPE.STONE;
  }

  for (let y = 0; y <= h; y += 1) {
    let type = TYPE.STONE;
    if (y === 0) type = TYPE.BEDROCK;
    else if (y === h) type = top;
    else if (y >= h - 3) type = filler;
    setRawBlock(x, y, z, type);
  }
  if (h < WATER_LEVEL) {
    for (let y = h + 1; y <= WATER_LEVEL; y += 1) setRawBlock(x, y, z, TYPE.WATER);
  }
}

function plantTree(x, z, baseY, kind, rnd) {
  const birch = kind === 'birch';
  const trunk = birch ? TYPE.BIRCH_LOG : TYPE.LOG;
  const leaf = birch ? TYPE.BIRCH_LEAVES : TYPE.LEAVES;
  const height = (birch ? 5 : 4) + Math.floor(rnd() * 3);
  const topY = baseY + height;
  for (let y = 1; y <= height; y += 1) setRawBlock(x, baseY + y, z, trunk);

  for (let dy = -2; dy <= 1; dy += 1) {
    const y = topY + dy;
    const radius = dy <= 0 ? 2 : 1;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        const horizontal = Math.abs(dx) + Math.abs(dz);
        if (horizontal > radius + 1) continue;
        if (horizontal === radius + 1 && rnd() > 0.46) continue;
        if (dy === 1 && horizontal > 1) continue;
        if (getBlock(x + dx, y, z + dz) === TYPE.AIR) setRawBlock(x + dx, y, z + dz, leaf);
      }
    }
  }
  setRawBlock(x, topY + 1, z, leaf);
}

function placeCabin() {
  const cx = CABIN.x;
  const cz = CABIN.z;
  const gy = cabinHeight;
  const halfW = Math.floor(CABIN.w / 2);
  const halfD = Math.floor(CABIN.d / 2);

  for (let x = cx - halfW - 1; x <= cx + halfW + 1; x += 1) {
    for (let z = cz - halfD - 1; z <= cz + halfD + 1; z += 1) {
      for (let y = gy + 1; y < WORLD_Y; y += 1) setRawBlock(x, y, z, TYPE.AIR);
    }
  }

  for (let x = cx - halfW; x <= cx + halfW; x += 1) {
    for (let z = cz - halfD; z <= cz + halfD; z += 1) setRawBlock(x, gy, z, TYPE.PLANKS);
  }

  const bottom = gy + 1;
  const top = gy + 3;
  for (let y = bottom; y <= top; y += 1) {
    for (let x = cx - halfW; x <= cx + halfW; x += 1) {
      for (let z = cz - halfD; z <= cz + halfD; z += 1) {
        const edge = Math.abs(x - cx) === halfW || Math.abs(z - cz) === halfD;
        if (!edge) continue;
        const corner = Math.abs(x - cx) === halfW && Math.abs(z - cz) === halfD;
        setRawBlock(x, y, z, corner ? TYPE.LOG : TYPE.PLANKS);
      }
    }
  }

  const doorX = cx;
  const frontZ = cz + halfD;
  for (let y = bottom; y <= bottom + 1; y += 1) {
    setRawBlock(doorX - 1, y, frontZ, TYPE.AIR);
    setRawBlock(doorX, y, frontZ, TYPE.AIR);
  }
  setRawBlock(doorX, top, frontZ, TYPE.PLANKS);
  setRawBlock(doorX - 1, top, frontZ, TYPE.PLANKS);

  setRawBlock(cx - 3, bottom + 1, frontZ, TYPE.GLASS);
  setRawBlock(cx + 3, bottom + 1, frontZ, TYPE.GLASS);
  setRawBlock(cx - halfW, bottom + 1, cz - 1, TYPE.GLASS);
  setRawBlock(cx + halfW, bottom + 1, cz + 1, TYPE.GLASS);
  setRawBlock(cx, bottom + 1, cz - halfD, TYPE.GLASS);

  for (let layer = 0; layer < 3; layer += 1) {
    const y = gy + 4 + layer;
    const inset = layer;
    for (let x = cx - halfW - 1 + inset; x <= cx + halfW + 1 - inset; x += 1) {
      for (let z = cz - halfD - 1 + inset; z <= cz + halfD + 1 - inset; z += 1) {
        const edge = x === cx - halfW - 1 + inset || x === cx + halfW + 1 - inset || z === cz - halfD - 1 + inset || z === cz + halfD + 1 - inset;
        if (edge || layer === 0) setRawBlock(x, y, z, TYPE.ROOF);
      }
    }
  }

  for (let y = gy + 4; y <= gy + 8; y += 1) setRawBlock(cx + halfW + 1, y, cz - halfD - 1, TYPE.COBBLE);
  setRawBlock(cx + halfW + 1, gy + 4, cz - halfD - 1, TYPE.GLOW);

  for (let x = cx - 2; x <= cx + 2; x += 1) {
    for (let z = frontZ + 1; z <= frontZ + 4; z += 1) {
      if (getBlock(x, gy, z) === TYPE.GRASS) setRawBlock(x, gy, z, TYPE.GRAVEL);
    }
  }
  setRawBlock(cx + 1, bottom, cz - halfD + 1, TYPE.GLOW);
}

function placeDock() {
  const y = WATER_LEVEL + 1;
  const startX = POND.x - 13;
  for (let x = startX; x <= startX + 9; x += 1) {
    setRawBlock(x, y, POND.z, TYPE.PLANKS);
    setRawBlock(x, y, POND.z + 1, TYPE.PLANKS);
    if (x === startX || x === startX + 5 || x === startX + 9) {
      for (let yy = y - 1; yy > y - 5; yy -= 1) {
        if (getBlock(x, yy, POND.z) === TYPE.WATER) setRawBlock(x, yy, POND.z, TYPE.LOG);
      }
    }
  }
  setRawBlock(startX + 9, y + 1, POND.z - 1, TYPE.GLOW);
  setRawBlock(startX + 9, y + 1, POND.z + 2, TYPE.GLOW);
}

function paintPath(points, width = 1.15) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 3);
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const px = lerp(a.x, b.x, t);
      const pz = lerp(a.z, b.z, t);
      for (let dz = -2; dz <= 2; dz += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (Math.hypot(dx, dz) > width) continue;
          const x = Math.round(px + dx);
          const z = Math.round(pz + dz);
          if (x < 1 || z < 1 || x >= WORLD_X - 1 || z >= WORLD_Z - 1) continue;
          const h = heightMap[z * WORLD_X + x];
          if (h <= WATER_LEVEL + 1) continue;
          const top = getBlock(x, h, z);
          if (top === TYPE.GRASS || top === TYPE.DIRT || top === TYPE.SAND) setRawBlock(x, h, z, TYPE.GRAVEL);
        }
      }
    }
  }
}

function generateWorld() {
  world = new Uint8Array(WORLD_X * WORLD_Y * WORLD_Z);
  heightMap = new Int16Array(WORLD_X * WORLD_Z);
  dataDecor.grass.length = 0;
  dataDecor.flowers.length = 0;

  for (let x = 0; x < WORLD_X; x += 1) {
    for (let z = 0; z < WORLD_Z; z += 1) {
      const h = heightAt(x, z);
      heightMap[z * WORLD_X + x] = h;
      fillColumn(x, z, h);
    }
  }

  placeCabin();
  placeDock();
  paintPath([
    { x: 64, z: 93 }, { x: 64, z: 84 }, { x: 62, z: 78 }, { x: 59, z: 72 },
    { x: 56, z: 66 }, { x: 54, z: 61 },
  ]);
  paintPath([{ x: 57, z: 68 }, { x: 53, z: 64 }, { x: 50, z: 60 }, { x: 47, z: 56 }]);

  const rnd = mulberry32(worldSeed ^ 0x51ed270b);
  for (let i = 0; i < 150; i += 1) {
    const x = 5 + Math.floor(rnd() * (WORLD_X - 10));
    const z = 5 + Math.floor(rnd() * (WORLD_Z - 10));
    const h = heightMap[z * WORLD_X + x];
    if (h <= WATER_LEVEL + 1 || h > 22) continue;
    if (getBlock(x, h, z) !== TYPE.GRASS) continue;
    if (Math.hypot((x - SPAWN.x) / 5.5, (z - SPAWN.z) / 5.5) < 1) continue;
    if (Math.hypot((x - CABIN.x) / (CABIN.w + 9), (z - CABIN.z) / (CABIN.d + 9)) < 1) continue;
    if (Math.hypot((x - 61) / 10, (z - 70) / 16) < 1) continue;
    if (Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz) < 1.18) continue;
    let crowded = false;
    for (let dz = -3; dz <= 3 && !crowded; dz += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        const nearby = getBlock(x + dx, h + 2, z + dz);
        if (nearby === TYPE.LOG || nearby === TYPE.BIRCH_LOG) { crowded = true; break; }
      }
    }
    if (crowded) continue;
    plantTree(x, z, h, rnd() > 0.24 ? 'oak' : 'birch', rnd);
  }

  for (let i = 0; i < 780; i += 1) {
    const x = 2 + Math.floor(rnd() * (WORLD_X - 4));
    const z = 2 + Math.floor(rnd() * (WORLD_Z - 4));
    const h = heightMap[z * WORLD_X + x];
    if (h <= WATER_LEVEL + 1 || h > 21) continue;
    if (getBlock(x, h, z) !== TYPE.GRASS) continue;
    if (getBlock(x, h + 1, z) !== TYPE.AIR) continue;
    if (Math.hypot((x - CABIN.x) / (CABIN.w + 1), (z - CABIN.z) / (CABIN.d + 1)) < 1) continue;
    const roll = rnd();
    if (roll < 0.75) dataDecor.grass.push({ x, y: h + 1, z, rot: rnd() * Math.PI, scale: 0.76 + rnd() * 0.55 });
    else dataDecor.flowers.push({ x, y: h + 1, z, rot: rnd() * Math.PI, scale: 0.8 + rnd() * 0.4, kind: roll < 0.88 ? 'red' : 'yellow' });
  }

  for (const [key, value] of Object.entries(edits)) {
    const index = Number(key);
    if (Number.isInteger(index) && index >= 0 && index < world.length) world[index] = value;
  }
}

function saveWorld() {
  if (saveTimerId) clearTimeout(saveTimerId);
  saveTimerId = setTimeout(() => {
    try {
      localStorage.setItem('blockhaven.world.v1', JSON.stringify({ seed: worldSeed, edits, goals: state.goals }));
    } catch { /* ignore quota */ }
  }, 320);
}

function chooseSeed() {
  return (Math.random() * 0x7fffffff) >>> 0;
}

/* ------------------------------------------------------------------ *
 *  Three.js renderer + atmosphere
 * ------------------------------------------------------------------ */

let renderer;
let scene;
let camera;
let sky;
let sun;
let sunTarget;
let atlasMaterial;
let waterMaterial;
let waterTexture;
let glassMaterial;
let highlight;
let cloudMesh;
let decorMeshes = [];
let handGroup;
let handItem;
let handItemType = -1;
let particleSystem;
const particleData = [];
const chunkMeshes = new Map();
const dirtyChunks = new Set();

const player = {
  pos: new THREE.Vector3(SPAWN.x + 0.5, 0, SPAWN.z + 0.5),
  vel: new THREE.Vector3(),
  yaw: 0.19,
  pitch: -0.17,
  eye: 1.63,
  width: 0.32,
  height: 1.76,
  grounded: false,
  inWater: false,
  headInWater: false,
  bob: 0,
  moving: false,
  sprinting: false,
};

const SUN_DIRECTION = new THREE.Vector3(-0.42, 0.66, -0.63).normalize();
const WORLD_FOG = { color: 0xbdd9d8, near: 48, far: 142 };
const UNDERWATER_FOG = { color: 0x256477, near: 0.2, far: 17 };

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(WORLD_FOG.color, WORLD_FOG.near, WORLD_FOG.far);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 260);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7a6a51, 1.12));
  scene.add(new THREE.AmbientLight(0xfff3d5, 0.28));

  sun = new THREE.DirectionalLight(0xffe3ad, 1.55);
  sun.castShadow = true;
  const shadowSize = isTouchDevice ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -44;
  sun.shadow.camera.right = 44;
  sun.shadow.camera.top = 44;
  sun.shadow.camera.bottom = -44;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.035;
  sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  sun.target = sunTarget;
  scene.add(sun);

  atlasMaterial = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    vertexColors: true,
    alphaTest: 0.35,
  });

  waterTexture = standaloneTexture('water');
  waterTexture.wrapS = THREE.RepeatWrapping;
  waterTexture.wrapT = THREE.RepeatWrapping;
  waterMaterial = new THREE.MeshPhongMaterial({
    map: waterTexture,
    color: 0x56b9d2,
    transparent: true,
    opacity: 0.72,
    shininess: 110,
    specular: 0xc9f5ff,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const glassTexture = standaloneTexture('glass');
  glassMaterial = new THREE.MeshPhongMaterial({
    map: glassTexture,
    color: 0xc9f2f5,
    transparent: true,
    opacity: 0.86,
    shininess: 95,
    specular: 0xffffff,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  buildSky();
  buildClouds();
  buildHighlight();
  buildParticles();
  buildHand();
}

function buildSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color('#4e94c9') },
      midColor: { value: new THREE.Color('#8fc6df') },
      horizonColor: { value: new THREE.Color('#f3e6c7') },
      lowerColor: { value: new THREE.Color('#b7d1c8') },
      sunColor: { value: new THREE.Color('#fff0b8') },
      sunDirection: { value: SUN_DIRECTION.clone() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 lowerColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 skyColor = mix(horizonColor, midColor, smoothstep(0.0, 0.22, h));
        skyColor = mix(skyColor, topColor, smoothstep(0.15, 0.78, h));
        skyColor = mix(lowerColor, skyColor, smoothstep(-0.18, 0.035, h));
        float sunDot = max(dot(normalize(vDir), normalize(sunDirection)), 0.0);
        float disc = pow(sunDot, 820.0) * 1.9;
        float halo = pow(sunDot, 12.0) * 0.28 + pow(sunDot, 3.2) * 0.045;
        skyColor += sunColor * (disc + halo);
        gl_FragColor = vec4(skyColor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  sky = new THREE.Mesh(new THREE.SphereGeometry(220, 40, 22), material);
  sky.frustumCulled = false;
  sky.renderOrder = -20;
  scene.add(sky);
}

function buildClouds() {
  const rnd = mulberry32(0x31415926);
  const material = new THREE.MeshLambertMaterial({
    color: 0xfbf7e9, emissive: 0x8b938e, transparent: true, opacity: 0.62, depthWrite: false, flatShading: true,
  });
  const count = 54;
  cloudMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, count);
  cloudMesh.frustumCulled = false;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    const angle = rnd() * Math.PI * 2;
    const radius = 38 + rnd() * 104;
    pos.set(WORLD_X / 2 + Math.cos(angle) * radius, 51 + rnd() * 13, WORLD_Z / 2 + Math.sin(angle) * radius);
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rnd() - 0.5) * 0.4);
    scale.set(5 + rnd() * 10, 0.7 + rnd() * 1.2, 3.5 + rnd() * 7);
    matrix.compose(pos, quat, scale);
    cloudMesh.setMatrixAt(i, matrix);
  }
  cloudMesh.instanceMatrix.needsUpdate = true;
  cloudMesh.renderOrder = -5;
  scene.add(cloudMesh);
}

function buildHighlight() {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006));
  highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: 0x0b1410, transparent: true, opacity: 0.72, depthTest: true,
  }));
  highlight.visible = false;
  highlight.renderOrder = 4;
  scene.add(highlight);
}

function buildParticles() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  particleSystem = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), material, 90);
  particleSystem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleSystem.frustumCulled = false;
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 90; i += 1) {
    matrix.makeScale(0, 0, 0);
    particleSystem.setMatrixAt(i, matrix);
    particleSystem.setColorAt(i, new THREE.Color(0xffffff));
    particleData.push({ life: 0, maxLife: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 0.08 });
  }
  particleSystem.instanceMatrix.needsUpdate = true;
  particleSystem.instanceColor.needsUpdate = true;
  scene.add(particleSystem);
}

function makeHeldBlock(type) {
  const def = BLOCKS[type];
  if (!def) return null;
  const top = new THREE.MeshLambertMaterial({ map: standaloneTexture(def.top) });
  const side = new THREE.MeshLambertMaterial({ map: standaloneTexture(def.side) });
  const bottom = new THREE.MeshLambertMaterial({ map: standaloneTexture(def.bottom) });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.23, 0.23), [side, side, top, bottom, side, side]);
  mesh.rotation.set(0.15, -0.38, 0.1);
  return mesh;
}

function buildHand() {
  handGroup = new THREE.Group();
  handGroup.position.set(0.5, -0.42, -0.82);
  handGroup.rotation.set(-0.62, 0.21, -0.3);
  handGroup.scale.setScalar(0.54);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.31, 0.17), new THREE.MeshLambertMaterial({ color: 0x3e7f5a }));
  sleeve.position.y = -0.22;
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.2), new THREE.MeshLambertMaterial({ color: 0x2d5f44 }));
  cuff.position.y = -0.04;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), new THREE.MeshLambertMaterial({ color: 0xd6a074 }));
  arm.position.y = 0.12;
  handGroup.add(sleeve, cuff, arm);
  handItem = new THREE.Group();
  handItem.position.set(0, 0.3, -0.05);
  handGroup.add(handItem);
  camera.add(handGroup);
  handItemType = HOTBAR[state.selected];
  handItem.add(makeHeldBlock(handItemType));
}

function updateHandItem() {
  const type = HOTBAR[state.selected];
  if (type === handItemType) return;
  handItemType = type;
  while (handItem.children.length) {
    const child = handItem.children.pop();
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) { mat?.map?.dispose(); mat?.dispose(); }
  }
  const mesh = makeHeldBlock(type);
  if (mesh) handItem.add(mesh);
}

/* ------------------------------------------------------------------ *
 *  Voxel chunk meshing
 * ------------------------------------------------------------------ */

const FACE_DEFS = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.88, tile: 'side' },
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], shade: 0.82, tile: 'side' },
  { dir: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], shade: 1.0, tile: 'top' },
  { dir: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], shade: 0.48, tile: 'bottom' },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.9, tile: 'side' },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.88, tile: 'side' },
];

function atlasUv(tileIndex, corner, dir) {
  const col = tileIndex % ATLAS_COLS;
  const row = Math.floor(tileIndex / ATLAS_COLS);
  const pad = 0.0015;
  const u0 = col / ATLAS_COLS + pad;
  const u1 = (col + 1) / ATLAS_COLS - pad;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + pad;
  const v1 = 1 - row / ATLAS_ROWS - pad;
  let u = 0;
  let v = 0;
  if (dir[1] === 1) { u = corner[0]; v = corner[2]; }
  else if (dir[1] === -1) { u = corner[0]; v = 1 - corner[2]; }
  else if (dir[0] !== 0) { u = dir[0] > 0 ? corner[2] : 1 - corner[2]; v = corner[1]; }
  else { u = dir[2] > 0 ? corner[0] : 1 - corner[0]; v = corner[1]; }
  return [u0 + u * (u1 - u0), v0 + v * (v1 - v0)];
}

function pushFace(target, x, y, z, def, type, localX, localZ, atlas) {
  const block = BLOCKS[type];
  const tileName = block[def.tile] || block.side;
  const tileIndex = TILE_INDEX[tileName] ?? 0;
  const base = target.pos.length / 3;
  if (!target.normals) target.normals = [];
  const variation = 0.965 + hash2(x * 3 + def.dir[0], z * 5 + y * 7 + def.dir[2], 0x17a3) * 0.07;
  const waterTop = type === TYPE.WATER ? 0.88 : 1;

  for (let i = 0; i < 4; i += 1) {
    const c = def.corners[i];
    let shade = def.shade * variation;
    if (def.dir[1] === 1) {
      const sx = c[0] === 1 ? 1 : -1;
      const sz = c[2] === 1 ? 1 : -1;
      const side1 = isOpaqueCuller(getBlock(x + sx, y, z)) ? 1 : 0;
      const side2 = isOpaqueCuller(getBlock(x, y, z + sz)) ? 1 : 0;
      const corner = isOpaqueCuller(getBlock(x + sx, y, z + sz)) ? 1 : 0;
      const ao = side1 && side2 ? 0 : 3 - (side1 + side2 + corner);
      shade *= [1, 0.84, 0.7, 0.57][ao];
    }
    const vy = c[1] === 1 ? waterTop : c[1];
    target.pos.push(localX + c[0], y + vy, localZ + c[2]);
    target.normals.push(def.dir[0], def.dir[1], def.dir[2]);
    target.col.push(shade, shade, shade);
    if (atlas) {
      const uv = atlasUv(tileIndex, c, def.dir);
      target.uv.push(uv[0], uv[1]);
    } else {
      const p = 0.002;
      const uv = [[p, p], [1 - p, p], [1 - p, 1 - p], [p, 1 - p]][i];
      target.uv.push(uv[0], uv[1]);
    }
  }
  target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function makeGeometry(target) {
  if (!target.idx.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(target.pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(target.uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(target.normals || [], 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(target.col, 3));
  geo.setIndex(target.idx);
  geo.computeBoundingSphere();
  return geo;
}

function buildChunkGeometry(cx, cz) {
  const opaque = { pos: [], uv: [], col: [], idx: [] };
  const water = { pos: [], uv: [], col: [], idx: [] };
  const glass = { pos: [], uv: [], col: [], idx: [] };
  const startX = cx * CHUNK;
  const startZ = cz * CHUNK;
  const endX = Math.min(startX + CHUNK, WORLD_X);
  const endZ = Math.min(startZ + CHUNK, WORLD_Z);

  for (let x = startX; x < endX; x += 1) {
    for (let z = startZ; z < endZ; z += 1) {
      for (let y = 0; y < WORLD_Y; y += 1) {
        const type = getBlock(x, y, z);
        if (type === TYPE.AIR) continue;
        const isWater = type === TYPE.WATER;
        const isGlass = type === TYPE.GLASS;
        const bucket = isWater ? water : isGlass ? glass : opaque;
        const localX = x - startX;
        const localZ = z - startZ;

        for (const def of FACE_DEFS) {
          const neighbor = getBlock(x + def.dir[0], y + def.dir[1], z + def.dir[2]);
          if (isWater) {
            if (neighbor === TYPE.WATER || isOpaqueCuller(neighbor)) continue;
          } else if (isGlass) {
            if (neighbor === TYPE.GLASS || isOpaqueCuller(neighbor)) continue;
          } else if (isOpaqueCuller(neighbor)) {
            continue;
          }
          pushFace(bucket, x, y, z, def, type, localX, localZ, !isWater && !isGlass);
        }
      }
    }
  }
  return { opaque: makeGeometry(opaque), water: makeGeometry(water), glass: makeGeometry(glass) };
}

function disposeChunk(key) {
  const old = chunkMeshes.get(key);
  if (!old) return;
  for (const mesh of [old.opaque, old.water, old.glass]) {
    if (!mesh) continue;
    scene.remove(mesh);
    mesh.geometry.dispose();
  }
  chunkMeshes.delete(key);
}

function rebuildChunk(cx, cz) {
  if (cx < 0 || cz < 0 || cx * CHUNK >= WORLD_X || cz * CHUNK >= WORLD_Z) return;
  const key = `${cx},${cz}`;
  disposeChunk(key);
  const { opaque, water, glass } = buildChunkGeometry(cx, cz);
  const entry = {};
  if (opaque) {
    const mesh = new THREE.Mesh(opaque, atlasMaterial);
    mesh.position.set(cx * CHUNK, 0, cz * CHUNK);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    entry.opaque = mesh;
  }
  if (water) {
    const mesh = new THREE.Mesh(water, waterMaterial);
    mesh.position.set(cx * CHUNK, 0, cz * CHUNK);
    mesh.renderOrder = 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    entry.water = mesh;
  }
  if (glass) {
    const mesh = new THREE.Mesh(glass, glassMaterial);
    mesh.position.set(cx * CHUNK, 0, cz * CHUNK);
    mesh.renderOrder = 3;
    mesh.receiveShadow = true;
    scene.add(mesh);
    entry.glass = mesh;
  }
  chunkMeshes.set(key, entry);
}

function markDirty(x, z) {
  const cx = Math.floor(x / CHUNK);
  const cz = Math.floor(z / CHUNK);
  dirtyChunks.add(`${cx},${cz}`);
  if (x % CHUNK === 0) dirtyChunks.add(`${cx - 1},${cz}`);
  if (x % CHUNK === CHUNK - 1) dirtyChunks.add(`${cx + 1},${cz}`);
  if (z % CHUNK === 0) dirtyChunks.add(`${cx},${cz - 1}`);
  if (z % CHUNK === CHUNK - 1) dirtyChunks.add(`${cx},${cz + 1}`);
}

function flushDirty() {
  if (!dirtyChunks.size) return;
  for (const key of dirtyChunks) {
    const [cx, cz] = key.split(',').map(Number);
    rebuildChunk(cx, cz);
  }
  dirtyChunks.clear();
}

async function buildAllChunks() {
  const total = (WORLD_X / CHUNK) * (WORLD_Z / CHUNK);
  let built = 0;
  for (let cz = 0; cz < WORLD_Z / CHUNK; cz += 1) {
    for (let cx = 0; cx < WORLD_X / CHUNK; cx += 1) {
      rebuildChunk(cx, cz);
      built += 1;
      if (built % 3 === 0) {
        loadFill.style.width = `${18 + (built / total) * 70}%`;
        loadStatus.textContent = built < total * 0.5 ? 'Raising islands…' : 'Planting forests…';
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }
  loadFill.style.width = '96%';
}

/* ------------------------------------------------------------------ *
 *  Decorations
 * ------------------------------------------------------------------ */

function makeCrossGeometry(size = 0.82) {
  const half = size / 2;
  const positions = [
    -half, 0, 0, half, 0, 0, half, size, 0, -half, size, 0,
    0, 0, -half, 0, 0, half, 0, size, half, 0, size, -half,
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return geo;
}

function buildDecorations() {
  for (const mesh of decorMeshes) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.map?.dispose();
    mesh.material.dispose();
  }
  decorMeshes = [];

  const geo = makeCrossGeometry(0.8);
  const makeInstances = (items, texture) => {
    if (!items.length) return;
    const material = new THREE.MeshLambertMaterial({
      map: texture, alphaTest: 0.44, side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo.clone(), material, items.length);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const pos = new THREE.Vector3();
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      pos.set(item.x + 0.5, item.y, item.z + 0.5);
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.rot || 0);
      scale.set(item.scale || 1, item.scale || 1, item.scale || 1);
      matrix.compose(pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    decorMeshes.push(mesh);
  };

  makeInstances(dataDecor.grass, standaloneTexture('grass_tuft'));
  makeInstances(dataDecor.flowers.filter((d) => d.kind === 'red'), standaloneTexture('flower_red'));
  makeInstances(dataDecor.flowers.filter((d) => d.kind === 'yellow'), standaloneTexture('flower_yellow'));
}

/* ------------------------------------------------------------------ *
 *  Player helpers
 * ------------------------------------------------------------------ */

function respawnPlayer() {
  const h = heightAt(Math.floor(SPAWN.x), Math.floor(SPAWN.z));
  player.pos.set(SPAWN.x + 0.5, h + 1.02, SPAWN.z + 0.5);
  player.vel.set(0, 0, 0);
  player.yaw = 0.19;
  player.pitch = -0.1;
  player.grounded = false;
  player.bob = 0;
  updateCamera(0);
}

function collidesAt(x, y, z) {
  const half = player.width;
  const minX = Math.floor(x - half);
  const maxX = Math.floor(x + half);
  const minY = Math.floor(y + 0.001);
  const maxY = Math.floor(y + player.height - 0.001);
  const minZ = Math.floor(z - half);
  const maxZ = Math.floor(z + half);
  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let by = minY; by <= maxY; by += 1) {
      for (let bz = minZ; bz <= maxZ; bz += 1) {
        if (isSolid(getBlock(bx, by, bz))) return true;
      }
    }
  }
  return false;
}

function blockIntersectsPlayer(x, y, z) {
  return (x + 1) > player.pos.x - player.width && x < player.pos.x + player.width
    && (y + 1) > player.pos.y && y < player.pos.y + player.height
    && (z + 1) > player.pos.z - player.width && z < player.pos.z + player.width;
}

function isWaterAt(x, y, z) {
  return getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === TYPE.WATER;
}

/* ------------------------------------------------------------------ *
 *  Raycast + block interaction
 * ------------------------------------------------------------------ */

function raycastVoxel(origin, direction, maxDistance) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity;
  let tMaxX = stepX > 0 ? (Math.floor(origin.x) + 1 - origin.x) / direction.x : stepX < 0 ? (origin.x - Math.floor(origin.x)) / -direction.x : Infinity;
  let tMaxY = stepY > 0 ? (Math.floor(origin.y) + 1 - origin.y) / direction.y : stepY < 0 ? (origin.y - Math.floor(origin.y)) / -direction.y : Infinity;
  let tMaxZ = stepZ > 0 ? (Math.floor(origin.z) + 1 - origin.z) / direction.z : stepZ < 0 ? (origin.z - Math.floor(origin.z)) / -direction.z : Infinity;
  let normal = [0, 0, 0];
  let distance = 0;
  let guard = 0;

  while (distance <= maxDistance && guard < 220) {
    guard += 1;
    if (inWorld(x, y, z) && isSolid(getBlock(x, y, z))) {
      return { x, y, z, nx: normal[0], ny: normal[1], nz: normal[2], distance, type: getBlock(x, y, z) };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; distance = tMaxX; tMaxX += tDeltaX; normal = [-stepX, 0, 0];
    } else if (tMaxY < tMaxZ) {
      y += stepY; distance = tMaxY; tMaxY += tDeltaY; normal = [0, -stepY, 0];
    } else {
      z += stepZ; distance = tMaxZ; tMaxZ += tDeltaZ; normal = [0, 0, -stepZ];
    }
  }
  return null;
}

const raycasterDirection = new THREE.Vector3();
const cameraWorldPosition = new THREE.Vector3();

function getTarget() {
  camera.getWorldPosition(cameraWorldPosition);
  camera.getWorldDirection(raycasterDirection);
  return raycastVoxel(cameraWorldPosition, raycasterDirection, 6.2);
}

function setBlockAndRecord(x, y, z, type) {
  if (!setRawBlock(x, y, z, type)) return;
  edits[blockIndex(x, y, z)] = type;
  markDirty(x, z);
  saveWorld();
}

const blockColors = {
  [TYPE.GRASS]: [0x5f9e3b, 0x72b948, 0x8bc954, 0x7a5a37],
  [TYPE.DIRT]: [0x855b37, 0x704b2c, 0x996b43],
  [TYPE.STONE]: [0x85857f, 0x71716b, 0x969691],
  [TYPE.COBBLE]: [0x74746f, 0x8a8a84, 0x61615c],
  [TYPE.SAND]: [0xd8c38a, 0xe7d59d, 0xc4ad72],
  [TYPE.LOG]: [0x6f4b2d, 0x825a37, 0x56391f],
  [TYPE.LEAVES]: [0x3e7d32, 0x4d8e3b, 0x2c6126],
  [TYPE.PLANKS]: [0xb1844c, 0x9a6f3b, 0xc0955b],
  [TYPE.BRICK]: [0xa24f3b, 0xba5b46, 0x8c402f],
  [TYPE.GLASS]: [0xb7e5eb, 0x8acbd8, 0xd7f5f8],
  [TYPE.GLOW]: [0xe1b34c, 0xf5d675, 0xb6862b],
  [TYPE.BEDROCK]: [0x3a3a39, 0x2b2b2b, 0x4b4b49],
  [TYPE.ROOF]: [0x4e3b30, 0x5f493b, 0x36271f],
  [TYPE.BIRCH_LOG]: [0xd6d0bb, 0xb8b19c, 0xe8e2d1],
  [TYPE.BIRCH_LEAVES]: [0x6a9c43, 0x7cae50, 0x548634],
  [TYPE.SNOW]: [0xeef4f2, 0xd7e4e1, 0xf8fbfa],
  [TYPE.GRAVEL]: [0x8d8981, 0x77736c, 0xa09b92],
};

function emitBlockParticles(x, y, z, type) {
  const palette = blockColors[type] || [0x888888];
  for (let i = 0; i < 15; i += 1) {
    const p = particleData.find((item) => item.life <= 0);
    if (!p) break;
    p.life = 0.55 + Math.random() * 0.5;
    p.maxLife = p.life;
    p.pos.set(x + 0.5 + (Math.random() - 0.5) * 0.7, y + 0.5 + (Math.random() - 0.5) * 0.7, z + 0.5 + (Math.random() - 0.5) * 0.7);
    p.vel.set((Math.random() - 0.5) * 3.4, 1.3 + Math.random() * 3.8, (Math.random() - 0.5) * 3.4);
    p.size = 0.05 + Math.random() * 0.09;
    particleSystem.setColorAt(particleData.indexOf(p), new THREE.Color(palette[Math.floor(Math.random() * palette.length)]));
  }
  particleSystem.instanceColor.needsUpdate = true;
}

function updateParticles(dt) {
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  for (let i = 0; i < particleData.length; i += 1) {
    const p = particleData[i];
    if (p.life <= 0) {
      matrix.makeScale(0, 0, 0);
    } else {
      p.life -= dt;
      p.vel.y -= 15 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const fade = clamp(p.life / p.maxLife, 0, 1);
      const s = p.size * fade;
      euler.set(p.life * 5, p.life * 3, 0);
      quat.setFromEuler(euler);
      scale.set(s, s, s);
      matrix.compose(p.pos, quat, scale);
      if (p.life <= 0) matrix.makeScale(0, 0, 0);
    }
    particleSystem.setMatrixAt(i, matrix);
  }
  particleSystem.instanceMatrix.needsUpdate = true;
}

function breakTarget() {
  const target = state.target;
  if (!target) return;
  if (target.type === TYPE.BEDROCK) {
    showToast('Bedrock is unbreakable.');
    state.mining = 0;
    playSound('deny');
    return;
  }
  setBlockAndRecord(target.x, target.y, target.z, TYPE.AIR);
  emitBlockParticles(target.x, target.y, target.z, target.type);
  playSound('break', target.type);
  state.mining = 0;
  state.miningKey = '';
  state.cameraShake = 0.055;
  handSwing = 1;

  if (target.type === TYPE.LOG || target.type === TYPE.BIRCH_LOG) {
    state.goals.wood = Math.min(3, state.goals.wood + 1);
    updateGoals();
  }
  if (state.goals.wood >= 3 && !state.goals.woodDone) {
    state.goals.woodDone = true;
    showToast('Three logs gathered. The forest approves.');
  }
}

function tryPlaceBlock() {
  if (state.placeCooldown > 0 || state.paused) return;
  const target = state.target;
  if (!target) return;
  const x = target.x + target.nx;
  const y = target.y + target.ny;
  const z = target.z + target.nz;
  if (!inWorld(x, y, z)) return;
  const existing = getBlock(x, y, z);
  if (existing !== TYPE.AIR && existing !== TYPE.WATER) return;
  if (blockIntersectsPlayer(x, y, z)) {
    showToast('No room to place that here.');
    return;
  }
  setBlockAndRecord(x, y, z, HOTBAR[state.selected]);
  playSound('place', HOTBAR[state.selected]);
  state.placeCooldown = 0.16;
  state.cameraShake = 0.03;
  handSwing = 1;
  state.goals.build = Math.min(5, state.goals.build + 1);
  updateGoals();
  if (state.goals.build >= 5 && !state.goals.buildDone) {
    state.goals.buildDone = true;
    showToast('Five blocks placed. Make it home.');
  }
}

/* ------------------------------------------------------------------ *
 *  Player simulation + camera
 * ------------------------------------------------------------------ */

const input = { keys: new Set(), joyX: 0, joyY: 0, jump: false, mine: false, sprint: false };
let jumpWasDown = false;
let footstepClock = 0;

function updateTarget(dt) {
  const target = getTarget();
  state.target = target;
  const key = target ? `${target.x},${target.y},${target.z},${target.type}` : '';
  if (key !== state.targetKey) {
    state.targetKey = key;
    if (target) {
      document.body.classList.add('has-target');
      const def = BLOCKS[target.type];
      targetLabel.textContent = def ? def.name.toUpperCase() : '';
      highlight.visible = true;
      highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    } else {
      document.body.classList.remove('has-target');
      highlight.visible = false;
      state.mining = 0;
      state.miningKey = '';
    }
  }

  if (input.mine && target && !state.paused) {
    const def = BLOCKS[target.type];
    const duration = def ? 0.2 + Math.min(def.hardness, 1.2) * 0.62 : 0.5;
    if (state.miningKey !== key) {
      state.miningKey = key;
      state.mining = 0;
    }
    state.mining += dt / duration;
    if (state.mining >= 1) breakTarget();
  } else if (!input.mine) {
    state.mining = 0;
    state.miningKey = '';
  }

  mineMeter.classList.toggle('active', input.mine && Boolean(target) && target.type !== TYPE.BEDROCK);
  mineArc.style.strokeDashoffset = String(113.1 * (1 - clamp(state.mining, 0, 1)));
}

function updatePlayer(dt) {
  if (state.paused) {
    player.vel.set(0, 0, 0);
    return;
  }

  let forward = 0;
  let right = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) forward += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) forward -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) right += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) right -= 1;
  forward += -input.joyY;
  right += input.joyX;

  const magnitude = Math.hypot(right, forward);
  if (magnitude > 1) { right /= magnitude; forward /= magnitude; }
  const joyMagnitude = Math.hypot(input.joyX, input.joyY);
  player.sprinting = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || joyMagnitude > 0.9;
  player.moving = magnitude > 0.06;

  const waterFeet = isWaterAt(player.pos.x, player.pos.y + 0.25, player.pos.z);
  const waterChest = isWaterAt(player.pos.x, player.pos.y + 1.1, player.pos.z);
  player.inWater = waterFeet || waterChest;
  player.headInWater = isWaterAt(player.pos.x, player.pos.y + player.eye, player.pos.z);

  const speed = player.inWater ? 2.45 : player.sprinting ? 6.05 : 4.15;
  const friction = player.grounded ? 11 : player.inWater ? 5.5 : 3.4;
  const targetX = (forward * -Math.sin(player.yaw) + right * Math.cos(player.yaw)) * speed * (magnitude > 0 ? 1 : 0);
  const targetZ = (forward * -Math.cos(player.yaw) + right * -Math.sin(player.yaw)) * speed * (magnitude > 0 ? 1 : 0);

  player.vel.x = lerp(player.vel.x, targetX, Math.min(1, dt * friction));
  player.vel.z = lerp(player.vel.z, targetZ, Math.min(1, dt * friction));

  const jumpDown = input.jump;
  if (jumpDown && !jumpWasDown) {
    if (player.inWater) {
      player.vel.y = 3.7;
      playSound('swim');
    } else if (player.grounded) {
      player.vel.y = 8.15;
      player.grounded = false;
      playSound('jump');
    }
  }
  jumpWasDown = jumpDown;

  if (player.inWater) {
    if (input.jump) player.vel.y += 13.5 * dt;
    else player.vel.y -= 8.4 * dt;
    player.vel.y = clamp(player.vel.y, -4.3, 4.2);
  } else {
    player.vel.y -= 24 * dt;
    player.vel.y = Math.max(player.vel.y, -22);
  }

  const oldY = player.pos.y;
  player.pos.x += player.vel.x * dt;
  if (collidesAt(player.pos.x, player.pos.y, player.pos.z)) {
    player.pos.x -= player.vel.x * dt;
    player.vel.x = 0;
  }
  player.pos.z += player.vel.z * dt;
  if (collidesAt(player.pos.x, player.pos.y, player.pos.z)) {
    player.pos.z -= player.vel.z * dt;
    player.vel.z = 0;
  }

  player.pos.y += player.vel.y * dt;
  if (collidesAt(player.pos.x, player.pos.y, player.pos.z)) {
    if (player.vel.y < 0) {
      if (-player.vel.y > 8) playSound('land');
      player.pos.y = oldY;
      player.grounded = true;
    } else {
      player.pos.y = oldY;
    }
    player.vel.y = 0;
  } else {
    player.grounded = false;
  }

  if (player.pos.y < -6) {
    respawnPlayer();
    showToast('The island put you back on solid ground.');
  }

  if (player.grounded && player.moving) {
    player.bob += dt * (player.sprinting ? 12.4 : 9.2);
    footstepClock -= dt;
    if (footstepClock <= 0) {
      footstepClock = player.sprinting ? 0.28 : 0.38;
      playSound('step');
    }
  } else {
    footstepClock = Math.min(footstepClock, 0.12);
  }

  if (player.moving && Math.random() < dt * 0.55) {
    const near = Math.hypot(player.pos.x - CABIN.x, player.pos.z - CABIN.z);
    if (near < 10 && !state.goals.cabin) {
      state.goals.cabin = true;
      updateGoals();
      showToast('Cabin found. Someone left the lantern on.');
    }
  }

  updateCamera(dt);
  updateUnderwater();
}

function updateCamera(dt) {
  const bob = player.grounded && player.moving ? Math.sin(player.bob) * 0.035 : 0;
  const shake = state.cameraShake;
  state.cameraShake = Math.max(0, state.cameraShake - dt * 0.55);
  const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
  const shakeY = shake ? (Math.random() - 0.5) * shake : 0;
  camera.position.set(player.pos.x, player.pos.y + player.eye + bob, player.pos.z);
  camera.rotation.set(player.pitch + shakeY, player.yaw + shakeX, 0);

  const targetFov = player.sprinting && player.moving ? 74 : 70;
  camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 7));
  camera.updateProjectionMatrix();

  handGroup.position.x = 0.52 + Math.sin(player.bob * 0.5) * 0.007;
  handGroup.position.y = -0.4 + Math.cos(player.bob) * 0.01;
  handSwing = Math.max(0, handSwing - dt * 3.8);
  const swing = Math.sin(handSwing * Math.PI) * 0.6;
  handItem.rotation.x = -swing * 0.9;
  handItem.rotation.z = -swing * 0.24;
  handItem.position.y = 0.3 - swing * 0.05;
}

function updateUnderwater() {
  document.body.classList.toggle('underwater', player.headInWater);
  if (player.headInWater) {
    scene.fog.color.setHex(UNDERWATER_FOG.color);
    scene.fog.near = UNDERWATER_FOG.near;
    scene.fog.far = UNDERWATER_FOG.far;
  } else {
    scene.fog.color.setHex(WORLD_FOG.color);
    scene.fog.near = WORLD_FOG.near;
    scene.fog.far = WORLD_FOG.far;
  }
}

function updateSunAndSky(dt) {
  sun.position.copy(camera.position).addScaledVector(SUN_DIRECTION, 80);
  sunTarget.position.set(camera.position.x, camera.position.y - 8, camera.position.z);
  sunTarget.updateMatrixWorld();
  sky.position.copy(camera.position);
  waterTexture.offset.x = (waterTexture.offset.x + dt * 0.008) % 1;
  waterTexture.offset.y = (waterTexture.offset.y + dt * 0.014) % 1;
  cloudMesh.position.x = Math.sin(state.time * 0.012) * 8;
  cloudMesh.position.z = Math.cos(state.time * 0.009) * 5;
}

/* ------------------------------------------------------------------ *
 *  HUD: hotbar, goals, compass, toast
 * ------------------------------------------------------------------ */

const blockIconCache = new Map();

function drawTileTo(ctx, name, p00, p10, p01) {
  const source = tileCanvas(name);
  const a = (p10[0] - p00[0]) / TILE;
  const b = (p10[1] - p00[1]) / TILE;
  const c = (p01[0] - p00[0]) / TILE;
  const d = (p01[1] - p00[1]) / TILE;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p00[0], p00[1]);
  ctx.lineTo(p10[0], p10[1]);
  ctx.lineTo(p10[0] + p01[0] - p00[0], p10[1] + p01[1] - p00[1]);
  ctx.lineTo(p01[0], p01[1]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, d, p00[0], p00[1]);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}

function makeBlockIcon(type) {
  if (blockIconCache.has(type)) return blockIconCache.get(type);
  const def = BLOCKS[type];
  const icon = document.createElement('canvas');
  icon.width = 64;
  icon.height = 64;
  const ctx = icon.getContext('2d');
  const apex = [32, 7];
  const left = [7, 21];
  const bottom = [32, 36];
  const right = [57, 21];
  const lowerLeft = [7, 47];
  const lowerBottom = [32, 61];
  const lowerRight = [57, 47];
  drawTileTo(ctx, def.top, left, apex, bottom);
  drawTileTo(ctx, def.side, left, bottom, lowerLeft);
  drawTileTo(ctx, def.side, bottom, right, lowerBottom);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(22, 35, 27, .15)';
  ctx.beginPath(); ctx.moveTo(left[0], left[1]); ctx.lineTo(bottom[0], bottom[1]); ctx.lineTo(lowerLeft[0], lowerLeft[1]); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(10, 18, 13, .24)';
  ctx.beginPath(); ctx.moveTo(bottom[0], bottom[1]); ctx.lineTo(right[0], right[1]); ctx.lineTo(lowerRight[0], lowerRight[1]); ctx.lineTo(lowerBottom[0], lowerBottom[1]); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255, 255, 255, .16)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left[0], left[1]); ctx.lineTo(apex[0], apex[1]); ctx.lineTo(right[0], right[1]); ctx.stroke();
  const url = icon.toDataURL();
  blockIconCache.set(type, url);
  return url;
}

function buildHotbar() {
  hotbarEl.innerHTML = '';
  HOTBAR.forEach((type, index) => {
    const def = BLOCKS[type];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `slot${index === state.selected ? ' selected' : ''}`;
    slot.dataset.index = String(index);
    slot.setAttribute('role', 'option');
    slot.setAttribute('aria-selected', index === state.selected ? 'true' : 'false');
    slot.setAttribute('aria-label', `${def.name}, slot ${index + 1}`);
    const icon = document.createElement('span');
    icon.className = 'block-icon';
    icon.style.backgroundImage = `url(${makeBlockIcon(type)})`;
    const number = document.createElement('span');
    number.className = 'slot-num';
    number.textContent = String(index + 1);
    slot.append(icon, number);
    hotbarEl.append(slot);
  });
}

function selectBlock(index, silent = false) {
  const next = clamp(index, 0, HOTBAR.length - 1);
  if (next === state.selected && silent) return;
  state.selected = next;
  const slots = hotbarEl.querySelectorAll('.slot');
  slots.forEach((slot, i) => {
    slot.classList.toggle('selected', i === next);
    slot.setAttribute('aria-selected', i === next ? 'true' : 'false');
  });
  const def = BLOCKS[HOTBAR[next]];
  blockLabel.textContent = def.name.toUpperCase();
  blockLabel.classList.remove('pop');
  void blockLabel.offsetWidth;
  blockLabel.classList.add('pop');
  updateHandItem();
  if (!silent) playSound('select');
}

function updateGoals() {
  const wood = Math.min(3, state.goals.wood);
  const build = Math.min(5, state.goals.build);
  const values = { wood, build, cabin: state.goals.cabin };
  $$('#objective-list li').forEach((li) => {
    const key = li.dataset.goal;
    const done = key === 'cabin' ? values.cabin : values[key] >= (key === 'wood' ? 3 : 5);
    li.classList.toggle('done', done);
    const count = li.querySelector('b');
    if (key === 'wood') count.textContent = `${wood}/3`;
    if (key === 'build') count.textContent = `${build}/5`;
    if (key === 'cabin') count.textContent = done ? 'FOUND' : '—';
  });
  saveWorld();
}

const compassMarks = [];
function buildCompass() {
  const container = $('#compass-ticks');
  const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let deg = 0; deg < 360; deg += 15) {
    const mark = document.createElement('span');
    const label = labels[deg];
    if (label) {
      mark.className = `compass-mark${label.length === 1 ? ' cardinal' : ''}`;
      mark.textContent = label;
    } else {
      mark.className = 'compass-mark tick';
    }
    mark.dataset.deg = String(deg);
    container.append(mark);
    compassMarks.push(mark);
  }
}

function updateCompass() {
  let heading = (-player.yaw * 180) / Math.PI;
  heading = ((heading % 360) + 360) % 360;
  for (const mark of compassMarks) {
    let delta = Number(mark.dataset.deg) - heading;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const visible = Math.abs(delta) < 86;
    mark.style.display = visible ? '' : 'none';
    if (!visible) continue;
    mark.style.left = `${50 + (delta / 90) * 50}%`;
    mark.style.opacity = String(clamp(1 - Math.abs(delta) / 92, 0, 1));
  }
}

function showToast(message, duration = 2700) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}

function updateHud(dt) {
  hudClock += dt;
  if (hudClock < 0.1) return;
  hudClock = 0;
  const px = Math.floor(player.pos.x);
  const py = Math.floor(player.pos.y);
  const pz = Math.floor(player.pos.z);
  coordsX.textContent = `X ${px}`;
  coordsY.textContent = `Y ${py}`;
  coordsZ.textContent = `Z ${pz}`;
  updateCompass();

  if (!state.goals.cabin && Math.hypot(player.pos.x - CABIN.x, player.pos.z - CABIN.z) < 9.5) {
    state.goals.cabin = true;
    updateGoals();
    showToast('Cabin found. Someone left the lantern on.');
  }
}

/* ------------------------------------------------------------------ *
 *  Tiny procedural sound engine
 * ------------------------------------------------------------------ */

function ensureAudio() {
  if (audio) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    return audio;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.42;
  master.connect(ctx.destination);
  const length = Math.floor(ctx.sampleRate * 1.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  audio = { ctx, master, buffer };
  return audio;
}

function soundBurst(duration, gain, frequency, type = 'lowpass', delay = 0) {
  if (!audio) return;
  const { ctx, master, buffer } = audio;
  const now = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, now);
  filter.Q.value = 0.8;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(gain, now + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(envelope).connect(master);
  source.start(now);
  source.stop(now + duration + 0.03);
}

function soundTone(startFreq, endFreq, duration, gain, type = 'sine', delay = 0) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(envelope).connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function playSound(kind, type) {
  if (settings.muted) return;
  if (!ensureAudio()) return;
  switch (kind) {
    case 'step':
      soundBurst(0.075, 0.032, 330 + Math.random() * 140, 'lowpass');
      break;
    case 'jump':
      soundTone(300, 460, 0.12, 0.025, 'triangle');
      break;
    case 'land':
      soundBurst(0.12, 0.06, 220, 'lowpass');
      soundTone(130, 70, 0.11, 0.035, 'sine');
      break;
    case 'swim':
      soundBurst(0.13, 0.035, 700, 'bandpass');
      break;
    case 'break': {
      const soft = type === TYPE.LEAVES || type === TYPE.BIRCH_LEAVES || type === TYPE.SAND || type === TYPE.DIRT || type === TYPE.GRASS;
      soundBurst(soft ? 0.13 : 0.1, soft ? 0.07 : 0.085, soft ? 460 : 1050, soft ? 'lowpass' : 'bandpass');
      soundTone(soft ? 150 : 220, 80, 0.1, 0.04, 'triangle');
      break;
    }
    case 'place':
      soundBurst(0.05, 0.055, 850, 'bandpass');
      soundTone(145, 95, 0.075, 0.035, 'triangle');
      break;
    case 'select':
      soundTone(920, 760, 0.035, 0.012, 'square');
      break;
    case 'deny':
      soundTone(130, 92, 0.16, 0.045, 'sawtooth');
      break;
  }
}

function setMuted(muted) {
  settings.muted = muted;
  document.body.classList.toggle('muted', muted);
  if (!muted) { ensureAudio(); playSound('select'); }
  const toggle = $('#sound-switch');
  toggle.classList.toggle('on', !muted);
  toggle.setAttribute('aria-checked', String(!muted));
  persistSettings();
}

function persistSettings() {
  try { localStorage.setItem('blockhaven.settings.v1', JSON.stringify(settings)); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ *
 *  Settings panel + tilt controls
 * ------------------------------------------------------------------ */

function setSwitch(el, on) {
  el.classList.toggle('on', on);
  el.setAttribute('aria-checked', String(on));
}

function updateTiltUi() {
  document.body.classList.toggle('tilt-on', state.tiltEnabled);
  tiltButton.setAttribute('aria-pressed', String(state.tiltEnabled));
  setSwitch(tiltSwitch, state.tiltEnabled);
  if (!state.tiltEnabled) {
    tiltValue.textContent = '0°';
    state.tiltX = 0;
    state.tiltY = 0;
    state.tiltBaseline = null;
    state.tiltSamples = 0;
  }
}

function getTiltAxes(event) {
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  const gamma = event.gamma ?? 0;
  const beta = event.beta ?? 0;
  if (angle === 90) return { x: beta, y: -gamma };
  if (angle === 270 || angle === -90) return { x: -beta, y: gamma };
  if (angle === 180) return { x: -gamma, y: -beta };
  return { x: gamma, y: beta };
}

function handleOrientation(event) {
  if (!state.tiltEnabled) return;
  if (event.gamma == null && event.beta == null) return;
  const axes = getTiltAxes(event);
  if (!state.tiltBaseline) {
    state.tiltSamples += 1;
    state.tiltBaseline = state.tiltBaseline || { x: 0, y: 0 };
    state.tiltBaseline.x += axes.x;
    state.tiltBaseline.y += axes.y;
    if (state.tiltSamples >= 7) {
      state.tiltBaseline.x /= state.tiltSamples;
      state.tiltBaseline.y /= state.tiltSamples;
    }
    return;
  }
  const deadzone = (value) => Math.sign(value) * Math.max(0, Math.abs(value) - 2.2);
  const ex = clamp(deadzone(axes.x - state.tiltBaseline.x), -28, 28);
  const ey = clamp(deadzone(axes.y - state.tiltBaseline.y), -20, 20);
  state.tiltX = lerp(state.tiltX, ex, 0.16);
  state.tiltY = lerp(state.tiltY, ey, 0.16);
  state.tiltRaw = Math.max(Math.abs(ex), Math.abs(ey));
  tiltValue.textContent = `${Math.round(state.tiltRaw)}°`;
}

async function toggleTilt(force) {
  if (state.tiltPending) return;
  const wanted = typeof force === 'boolean' ? force : !state.tiltEnabled;
  if (!wanted) {
    state.tiltEnabled = false;
    window.removeEventListener('deviceorientation', handleOrientation, true);
    updateTiltUi();
    showToast('Tilt look off. Drag to look as usual.');
    persistSettings();
    return;
  }
  if (typeof DeviceOrientationEvent === 'undefined') {
    showToast('This device has no motion sensor.');
    return;
  }
  state.tiltPending = true;
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') throw new Error('denied');
    }
    state.tiltEnabled = true;
    state.tiltBaseline = null;
    state.tiltSamples = 0;
    window.addEventListener('deviceorientation', handleOrientation, true);
    updateTiltUi();
    showToast('Tilt look on. Hold your device naturally, then lean to steer.');
    persistSettings();
  } catch {
    state.tiltEnabled = false;
    updateTiltUi();
    showToast('Motion access was not granted. Tilt look stays off.');
  } finally {
    state.tiltPending = false;
  }
}

function updateTilt(dt) {
  if (!state.tiltEnabled || state.paused) return;
  player.yaw -= state.tiltX * 0.022 * dt * settings.sensitivity;
  player.pitch -= state.tiltY * 0.016 * dt * settings.sensitivity * (settings.invert ? -1 : 1);
  player.pitch = clamp(player.pitch, -1.42, 1.42);
}

function openSettings() {
  state.paused = true;
  input.keys.clear();
  input.mine = false;
  input.jump = false;
  input.joyX = 0;
  input.joyY = 0;
  resetJoystick();
  document.body.classList.add('panel-open');
  $('#settings-panel').setAttribute('aria-hidden', 'false');
  if (document.pointerLockElement) document.exitPointerLock?.();
  playSound('select');
}

function closeSettings() {
  state.paused = false;
  document.body.classList.remove('panel-open');
  $('#settings-panel').setAttribute('aria-hidden', 'true');
  ensureAudio();
}

function persistAndUpdate() {
  persistSettings();
}

function setupSettings() {
  $('#settings-btn').addEventListener('click', openSettings);
  $('#close-settings').addEventListener('click', closeSettings);
  $('#panel-scrim').addEventListener('click', closeSettings);

  tiltSwitch.addEventListener('click', () => toggleTilt());
  tiltButton.addEventListener('click', () => toggleTilt());

  const invertSwitch = $('#invert-switch');
  setSwitch(invertSwitch, settings.invert);
  invertSwitch.addEventListener('click', () => {
    settings.invert = !settings.invert;
    setSwitch(invertSwitch, settings.invert);
    persistSettings();
  });

  const soundSwitch = $('#sound-switch');
  setSwitch(soundSwitch, !settings.muted);
  document.body.classList.toggle('muted', settings.muted);

  const soundButton = $('#sound-btn');
  soundButton.addEventListener('click', () => setMuted(!settings.muted));
  soundSwitch.addEventListener('click', () => setMuted(!settings.muted));

  const sensitivity = $('#sensitivity');
  const sensitivityValue = $('#sensitivity-value');
  sensitivity.value = String(settings.sensitivity);
  sensitivityValue.textContent = `${Number(settings.sensitivity).toFixed(1)}×`;
  sensitivity.addEventListener('input', () => {
    settings.sensitivity = Number(sensitivity.value);
    sensitivityValue.textContent = `${settings.sensitivity.toFixed(1)}×`;
    persistSettings();
  });

  $('#fullscreen-btn').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        $('#fullscreen-btn').textContent = 'EXIT';
      } else {
        await document.exitFullscreen?.();
        $('#fullscreen-btn').textContent = 'ENTER';
      }
    } catch {
      showToast('Fullscreen is not available here.');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    $('#fullscreen-btn').textContent = document.fullscreenElement ? 'EXIT' : 'ENTER';
  });

  $('#respawn-btn').addEventListener('click', () => {
    respawnPlayer();
    closeSettings();
    showToast('Back at the starting hill.');
  });

  $('#reset-edits-btn').addEventListener('click', () => {
    if (!window.confirm('Clear all of your builds and restore the original island?')) return;
    state.skipUnloadSave = true;
    try {
      localStorage.setItem('blockhaven.world.v1', JSON.stringify({
        seed: worldSeed, edits: {}, goals: { wood: 0, build: 0, cabin: false },
      }));
    } catch { /* ignore */ }
    window.location.reload();
  });

  $('#new-world-btn').addEventListener('click', () => {
    if (!window.confirm('Grow a brand-new island? Your current builds will be lost.')) return;
    state.skipUnloadSave = true;
    try {
      localStorage.setItem('blockhaven.world.v1', JSON.stringify({
        seed: chooseSeed(), edits: {}, goals: { wood: 0, build: 0, cabin: false },
      }));
    } catch { /* ignore */ }
    window.location.reload();
  });

  $('#objective-toggle').addEventListener('click', () => {
    $('#objective-card').classList.toggle('collapsed');
  });

  $('#hint-close').addEventListener('click', () => hintEl.classList.add('hidden'));
  setTimeout(() => hintEl.classList.add('hidden'), 12000);

  if (isTouchDevice) {
    hintEl.innerHTML = '<span class="hint-key">JUST DRAG</span><span>TO LOOK</span><span class="hint-sep"></span><span class="hint-key">HOLD MINE</span><span>TO BREAK</span><button id="hint-close" type="button" aria-label="Dismiss hint">×</button>';
  } else {
    hintEl.innerHTML = '<span class="hint-key">CLICK</span><span>TO LOOK</span><span class="hint-sep"></span><span class="hint-key">LMB</span><span>MINE</span><span class="hint-sep"></span><span class="hint-key">RMB</span><span>PLACE</span><button id="hint-close" type="button" aria-label="Dismiss hint">×</button>';
  }
  $('#hint-close')?.addEventListener('click', () => hintEl.classList.add('hidden'));

  window.addEventListener('orientationchange', () => {
    state.tiltBaseline = null;
    state.tiltSamples = 0;
  });
}

/* ------------------------------------------------------------------ *
 *  Input: keyboard, pointer lock, touch joystick and actions
 * ------------------------------------------------------------------ */

let lookPointerId = null;
let lastLook = { x: 0, y: 0 };

function applyLook(dx, dy, scale = 0.0025) {
  if (state.paused) return;
  player.yaw -= dx * scale * settings.sensitivity;
  player.pitch -= dy * scale * settings.sensitivity * (settings.invert ? -1 : 1);
  player.pitch = clamp(player.pitch, -1.42, 1.42);
}

function resetJoystick() {
  joystick.classList.remove('active');
  joyKnob.style.transform = 'translate(0px, 0px)';
  input.joyX = 0;
  input.joyY = 0;
}

function setJoystickFromPointer(event) {
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = event.clientX - cx;
  let dy = event.clientY - cy;
  const max = rect.width * 0.29;
  const mag = Math.hypot(dx, dy);
  if (mag > max) { dx = (dx / mag) * max; dy = (dy / mag) * max; }
  joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  const nx = dx / max;
  const ny = dy / max;
  const dead = 0.12;
  input.joyX = Math.abs(nx) > dead ? nx : 0;
  input.joyY = Math.abs(ny) > dead ? ny : 0;
}

function setupTouchControls() {
  let joyPointer = null;
  joystick.addEventListener('pointerdown', (event) => {
    if (state.paused) return;
    event.preventDefault();
    joyPointer = event.pointerId;
    joystick.classList.add('active');
    joystick.setPointerCapture(event.pointerId);
    setJoystickFromPointer(event);
    ensureAudio();
  });
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joyPointer) return;
    event.preventDefault();
    setJoystickFromPointer(event);
  });
  const releaseJoy = (event) => {
    if (event.pointerId !== joyPointer) return;
    joyPointer = null;
    resetJoystick();
  };
  joystick.addEventListener('pointerup', releaseJoy);
  joystick.addEventListener('pointercancel', releaseJoy);

  const mineButton = $('#mine-btn');
  const placeButton = $('#place-btn');
  const jumpButton = $('#jump-btn');

  mineButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.mine = true;
    mineButton.classList.add('held');
    mineButton.setPointerCapture?.(event.pointerId);
    ensureAudio();
  });
  const endMine = (event) => {
    input.mine = false;
    mineButton.classList.remove('held');
    if (event && event.pointerId != null && mineButton.hasPointerCapture?.(event.pointerId)) mineButton.releasePointerCapture(event.pointerId);
  };
  mineButton.addEventListener('pointerup', endMine);
  mineButton.addEventListener('pointercancel', endMine);

  placeButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    placeButton.classList.add('held');
    tryPlaceBlock();
    ensureAudio();
    setTimeout(() => placeButton.classList.remove('held'), 120);
  });
  jumpButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.jump = true;
    jumpButton.classList.add('held');
    ensureAudio();
  });
  const endJump = () => { input.jump = false; jumpButton.classList.remove('held'); };
  jumpButton.addEventListener('pointerup', endJump);
  jumpButton.addEventListener('pointercancel', endJump);
  jumpButton.addEventListener('pointerleave', endJump);
}

function setupPointerControls() {
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    if (state.paused) return;
    ensureAudio();
    if (event.pointerType === 'mouse') {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
        event.preventDefault();
        return;
      }
      if (event.button === 0) input.mine = true;
      if (event.button === 2) tryPlaceBlock();
      return;
    }
    if (lookPointerId !== null) return;
    lookPointerId = event.pointerId;
    lastLook = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointerId) return;
    const dx = event.clientX - lastLook.x;
    const dy = event.clientY - lastLook.y;
    lastLook = { x: event.clientX, y: event.clientY };
    applyLook(dx, dy, 0.0046);
  });

  const endLook = (event) => {
    if (event.pointerId !== lookPointerId) return;
    lookPointerId = null;
  };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas && !state.paused) {
      applyLook(event.movementX, event.movementY, 0.0023);
    }
  });

  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mine = false;
  });

  window.addEventListener('wheel', (event) => {
    if (state.paused) return;
    event.preventDefault();
    selectBlock((state.selected + (event.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length);
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      if (document.body.classList.contains('panel-open')) {
        closeSettings();
        return;
      }
      if (document.pointerLockElement) document.exitPointerLock?.();
    }
    if (document.body.classList.contains('panel-open')) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD'
      || event.code === 'ArrowUp' || event.code === 'ArrowDown' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      input.keys.add(event.code);
    }
    if (event.code === 'Space') input.jump = true;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.keys.add(event.code);
    if (/^Digit[1-9]$/.test(event.code)) {
      selectBlock(Number(event.code.slice(5)) - 1);
    }
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
    if (event.code === 'Space') input.jump = false;
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.jump = false;
    input.mine = false;
    resetJoystick();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) input.mine = false;
  });

  const slots = hotbarEl;
  slots.addEventListener('click', (event) => {
    const slot = event.target.closest('.slot');
    if (!slot) return;
    selectBlock(Number(slot.dataset.index));
  });
}

function setupResize() {
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

/* ------------------------------------------------------------------ *
 *  Boot + game loop
 * ------------------------------------------------------------------ */

function loadSavedWorld() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('blockhaven.world.v1') || 'null'); } catch { /* ignore */ }
  worldSeed = Number.isFinite(saved?.seed) ? saved.seed >>> 0 : DEFAULT_WORLD_SEED;
  edits = saved?.edits && typeof saved.edits === 'object' ? saved.edits : {};
  if (saved?.goals) state.goals = { ...state.goals, ...saved.goals };
  if (state.goals.wood > 0 || state.goals.build > 0 || state.goals.cabin) {
    state.goals.woodDone = state.goals.wood >= 3;
    state.goals.buildDone = state.goals.build >= 5;
  }
}

async function init() {
  buildAtlas();
  loadSavedWorld();
  generateWorld();
  setupRenderer();
  respawnPlayer();
  buildDecorations();
  buildHotbar();
  buildCompass();
  updateGoals();
  setupSettings();
  setupTouchControls();
  setupPointerControls();
  setupResize();

  settings.tilt = false;
  state.tiltEnabled = false;
  updateTiltUi();
  document.body.classList.toggle('muted', settings.muted);
  selectBlock(state.selected, true);

  await buildAllChunks();
  loadFill.style.width = '100%';
  loadStatus.textContent = 'Welcome to Blockhaven';

  updateSunAndSky(0);
  updateCamera(0);
  updateTarget(0.016);
  renderer.render(scene, camera);

  state.started = true;
  window.__blockhaven = { player, state, settings, input, getBlock, heightAt, world: () => world, worldSeed, CABIN, POND, SPAWN, scene, camera, renderer, getTarget, raycastVoxel, respawnPlayer, selectBlock, showToast };
  setTimeout(() => {
    loadingScreen.classList.add('done');
    document.body.classList.add('ready');
    const splash = $('#splash');
    splash.classList.add('show');
    setTimeout(() => splash.classList.remove('show'), 3400);
  }, 260);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    state.time += dt;

    if (!state.paused) {
      updateTilt(dt);
      updatePlayer(dt);
    } else {
      updateCamera(0);
    }
    updateTarget(dt);
    updateParticles(dt);
    state.placeCooldown = Math.max(0, state.placeCooldown - dt);
    flushDirty();
    updateSunAndSky(dt);
    updateHud(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('beforeunload', () => {
    if (state.skipUnloadSave) return;
    try {
      localStorage.setItem('blockhaven.settings.v1', JSON.stringify(settings));
      localStorage.setItem('blockhaven.world.v1', JSON.stringify({ seed: worldSeed, edits, goals: state.goals }));
    } catch { /* ignore */ }
  });
}

init().catch((error) => {
  console.error(error);
  loadStatus.textContent = 'The world could not start. WebGL may be unavailable.';
  loadFill.style.width = '100%';
  loadFill.style.background = '#d97b62';
});
