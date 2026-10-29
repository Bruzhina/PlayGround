export const RUN_DURATION = 300;
export const EVOLVE_LEVELS = [5, 12];
export const WAVE_LENGTH = 30;

export const STARTERS = [
  {
    id: "agumon",
    name: "AGUMON",
    element: "FIRE",
    role: "BALANCED",
    line: ["AGUMON", "GREYMON", "WARGREYMON"],
    color: "#ff9d3b",
    accent: "#ffd166",
    dark: "#8a3d12",
    light: "#ffe0a8",
    desc: "Balanced brawler. Pepper Breath scorches packs and splashes on impact.",
    weapon: "fire",
    attackName: "PEPPER BREATH",
    stats: { hp: 120, speed: 232, damage: 15, cooldown: 0.62, range: 540, projSpeed: 660, projSize: 8.5, pierce: 0, multi: 1 },
    card: { power: 8, speed: 6, range: 7 }
  },
  {
    id: "gabumon",
    name: "GABUMON",
    element: "ICE",
    role: "PIERCER",
    line: ["GABUMON", "GARURUMON", "METALGARURUMON"],
    color: "#78d7ff",
    accent: "#bff4ff",
    dark: "#1b5a86",
    light: "#e6fbff",
    desc: "Long-range hunter. Blue Blaster pierces lines and chills the horde.",
    weapon: "ice",
    attackName: "BLUE BLASTER",
    stats: { hp: 105, speed: 220, damage: 12, cooldown: 0.72, range: 620, projSpeed: 780, projSize: 7, pierce: 2, multi: 1 },
    card: { power: 6, speed: 5, range: 9 }
  },
  {
    id: "patamon",
    name: "PATAMON",
    element: "HOLY",
    role: "SEEKER",
    line: ["PATAMON", "ANGEMON", "SERAPHIMON"],
    color: "#ffe08a",
    accent: "#fff4c4",
    dark: "#a87918",
    light: "#fffbe6",
    desc: "Agile caster. Air Shot homes onto targets and shreds single threats.",
    weapon: "holy",
    stats: { hp: 98, speed: 248, damage: 10, cooldown: 0.46, range: 500, projSpeed: 700, projSize: 7, pierce: 1, multi: 1 },
    card: { power: 5, speed: 8, range: 6 }
  }
];

export const STARTER_MAP = Object.fromEntries(STARTERS.map(starter => [starter.id, starter]));

export const UPGRADES = [
  { id: "power", name: "POWER CORE", icon: "✦", color: "#ff9d3b", max: 8, desc: "+18% attack damage.", apply: s => { s.damage *= 1.18; } },
  { id: "haste", name: "RAPID FIRE", icon: "⚡", color: "#ffd166", max: 8, desc: "+12% attack speed.", apply: s => { s.cooldown *= 0.88; } },
  { id: "multi", name: "SPLIT DATA", icon: "⋔", color: "#ff4fd8", max: 4, desc: "+1 projectile per attack.", apply: s => { s.multi += 1; } },
  { id: "pierce", name: "PIERCE CODE", icon: "➤", color: "#58f0ff", max: 5, desc: "+1 enemy pierced by shots.", apply: s => { s.pierce += 1; } },
  { id: "vitality", name: "NANO ARMOR", icon: "⬢", color: "#b8ff6a", max: 6, desc: "+18 max HP and heal 18.", apply: s => { s.maxHp += 18; s.hp = Math.min(s.maxHp, s.hp + 18); } },
  { id: "swift", name: "SERVO BOOST", icon: "▲", color: "#7cf7d4", max: 6, desc: "+8% movement speed.", apply: s => { s.speed *= 1.08; } },
  { id: "magnet", name: "MAGNET FIELD", icon: "◈", color: "#7dd3fc", max: 5, desc: "+30% data pickup radius.", apply: s => { s.magnet *= 1.3; } },
  { id: "regen", name: "REGEN PROTOCOL", icon: "✚", color: "#ff7a9c", max: 6, desc: "Recover +0.7 HP per second.", apply: s => { s.regen += 0.7; } },
  { id: "crit", name: "CRIT CHIP", icon: "◎", color: "#ffd166", max: 6, desc: "+8% critical hit chance.", apply: s => { s.crit += 0.08; } },
  { id: "caliber", name: "WIDE BEAM", icon: "●", color: "#ff9d3b", max: 5, desc: "+18% projectile size and +4% damage.", apply: s => { s.projSize *= 1.18; s.damage *= 1.04; } },
  { id: "velocity", name: "TURBO SHOT", icon: "»", color: "#58f0ff", max: 5, desc: "+14% projectile speed and +6% range.", apply: s => { s.projSpeed *= 1.14; s.range *= 1.06; } },
  { id: "orbit", name: "DIGI-BITS", icon: "◌", color: "#c084fc", max: 4, desc: "+1 orbiting bit that damages enemies.", apply: s => { s.orbit += 1; } },
  { id: "leech", name: "DATA LEECH", icon: "⌁", color: "#b8ff6a", max: 5, desc: "Recover +0.25 HP per kill.", apply: s => { s.leech += 0.25; } },
  { id: "dash", name: "DASH CORE", icon: "↯", color: "#ff4fd8", max: 4, desc: "-20% dash cooldown.", apply: s => { s.dashCd *= 0.8; } },
  { id: "luck", name: "LUCKY DATA", icon: "❖", color: "#ffd166", max: 5, desc: "+20% XP from every shard.", apply: s => { s.xpGain *= 1.2; } }
];

export const UPGRADE_MAP = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade]));

export const ENEMIES = {
  crawler: { name: "GLITCHLING", hp: 17, speed: 68, damage: 8, radius: 16.5, xp: 2, color: "#a78bfa", kind: "crawler", minTime: 0, weight: 1 },
  bat: { name: "NOCTURNE", hp: 12, speed: 118, damage: 6, radius: 14, xp: 2, color: "#ff5ea8", kind: "bat", minTime: 15, weight: 1 },
  spitter: { name: "WEBDEMON", hp: 30, speed: 46, damage: 9, radius: 18.5, xp: 4, color: "#5eead4", kind: "spitter", minTime: 45, weight: 0.8, ranged: true },
  tank: { name: "IRONHUSK", hp: 92, speed: 40, damage: 16, radius: 27, xp: 8, color: "#fb923c", kind: "tank", minTime: 80, weight: 0.55 },
  charger: { name: "RAZORWING", hp: 26, speed: 78, damage: 11, radius: 16.5, xp: 4, color: "#f472b6", kind: "charger", minTime: 100, weight: 0.7 }
};

export const BOSSES = [
  { name: "DEVIMON", title: "LORD OF DARKNESS", hp: 1500, speed: 54, damage: 26, radius: 48, xp: 120, color: "#ff3d7f", kind: "boss", at: 120 },
  { name: "MACHINEDRAMON", title: "CHAOS MACHINE", hp: 3200, speed: 44, damage: 34, radius: 56, xp: 240, color: "#ffb02e", kind: "boss2", at: 240 }
];

export const PALETTE = {
  cyan: "#58f0ff",
  magenta: "#ff4fd8",
  gold: "#ffd166",
  hp: "#ff4d6d",
  xp: "#6dffcf"
};
