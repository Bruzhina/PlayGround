export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, value) => (value - a) / (b - a);
export const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, z) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise2D(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

export function fbm(x, z) {
  return valueNoise2D(x, z) * 0.62 + valueNoise2D(x * 2.03 + 17.1, z * 2.03 - 9.4) * 0.26 + valueNoise2D(x * 4.1 - 3.7, z * 4.1 + 12.6) * 0.12;
}

export function terrainHeight(x, z) {
  const distance = Math.hypot(x, z);
  const flat = smoothstep(7, 25, distance);
  const base = fbm(x * 0.045 + 11, z * 0.045 - 4) * 4.1 + fbm(x * 0.13 - 7, z * 0.13 + 3) * 1.15;
  let height = base * (0.025 + 0.975 * flat) + 0.06;
  const rim = smoothstep(48, 76, distance);
  height += rim * (5.8 + fbm(x * 0.035 + 31, z * 0.035 + 8) * 4.2);
  return height;
}

export function solarState(time) {
  const hours = ((time % 24) + 24) % 24;
  const angle = ((hours - 6) / 24) * Math.PI * 2;
  const elevation = Math.sin(angle);
  const dayFactor = smoothstep(-0.14, 0.28, elevation);
  const duskFactor = Math.exp(-Math.pow(elevation / 0.22, 2));
  return {
    hours,
    angle,
    elevation,
    dayFactor,
    duskFactor,
    nightFactor: 1 - dayFactor,
    sunDirection: {
      x: Math.cos(angle) * 0.92,
      y: elevation,
      z: 0.34
    }
  };
}

export function formatClock(time) {
  const hours = ((time % 24) + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function headingFromYaw(yaw) {
  return ((-yaw * 180) / Math.PI + 360) % 360;
}

export function compassLabel(heading) {
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return labels[Math.round(heading / 45) % 8];
}

export function detectLowEnd() {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const smallScreen = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) <= 900;
  return /SM-A04|Galaxy A04/i.test(ua) || memory <= 4 || cores <= 6 || coarse || smallScreen;
}

export const QUALITY = {
  low: {
    name: 'LOW',
    pixelRatio: 1,
    antialias: false,
    trees: 48,
    rocks: 20,
    grass: 260,
    maxZombies: 5,
    terrainSegments: 64,
    stars: 180,
    fogNear: 20,
    fogFar: 74,
    maxPixelRatio: 1.0
  },
  high: {
    name: 'HIGH',
    pixelRatio: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2),
    antialias: true,
    trees: 74,
    rocks: 32,
    grass: 520,
    maxZombies: 9,
    terrainSegments: 88,
    stars: 340,
    fogNear: 26,
    fogFar: 105,
    maxPixelRatio: 1.75
  }
};

export function qualityFor(setting) {
  if (setting === 'low' || setting === 'high') return QUALITY[setting];
  return detectLowEnd() ? QUALITY.low : QUALITY.high;
}

export function formatSurvivalTime(days) {
  if (days <= 0) return '—';
  return `${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
}
