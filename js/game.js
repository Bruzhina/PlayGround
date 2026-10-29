import {
  RUN_DURATION,
  EVOLVE_LEVELS,
  WAVE_LENGTH,
  STARTER_MAP,
  UPGRADES,
  UPGRADE_MAP,
  ENEMIES,
  BOSSES,
  PALETTE
} from "./data.js";
import { drawCreature, drawEnemyCreature, drawShard } from "./render.js";

const TAU = Math.PI * 2;
const GRID = 74;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rgba(hex, alpha) {
  if (!hex || hex[0] !== "#") return `rgba(255,255,255,${alpha})`;
  const value = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const number = parseInt(value.slice(1), 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}

function shade(hex, amount) {
  const value = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const number = parseInt(value.slice(1), 16);
  let r = (number >> 16) & 255;
  let g = (number >> 8) & 255;
  let b = number & 255;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const k = 1 + amount;
    r = Math.round(r * k);
    g = Math.round(g * k);
    b = Math.round(b * k);
  }
  return `rgb(${r},${g},${b})`;
}

export class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.input = input;
    this.audio = audio;
    this.mode = "menu";
    this.menuTime = 0;
    this.moteTime = 0;
    this.time = 0;
    this.stage = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = 10;
    this.kills = 0;
    this.digivolutions = 0;
    this.starterId = "agumon";
    this.stats = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyShots = [];
    this.shards = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.grid = new Map();
    this.upgrades = new Map();
    this.choices = [];
    this.pendingEvents = [];
    this.pendingEvolution = null;
    this.bossIndex = 0;
    this.boss = null;
    this.camera = { x: 0, y: 0 };
    this.shake = 0;
    this.hurtFlash = 0;
    this.flash = null;
    this.spawnAcc = 0;
    this.burstTimer = 9;
    this.nextWave = 2;
    this.wave = 1;
    this.hudTimer = 0;
    this.attackPulse = 0;
    this.hurtCooldown = 0;
    this.enemyId = 1;
    this.motes = [];
    this.maxEnemies = 150;
    this.lastFrame = 0;
    this.view = { w: 1, h: 1, dpr: 1 };
    this.onHud = null;
    this.onEvent = null;
    this.onLevelUp = null;
    this.onGameOver = null;
    this.initMotes();
    this.resize();
    this.bindResize();
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  bindResize() {
    this.handleResize = () => this.resize();
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("orientationchange", () => window.setTimeout(this.handleResize, 120));
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.view.w = width;
    this.view.h = height;
    this.view.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.maxEnemies = width < 700 ? 105 : 170;
    this.bgCache = null;
  }

  initMotes() {
    this.motes = [];
    for (let i = 0; i < 68; i += 1) {
      this.motes.push({
        x: Math.random(),
        y: Math.random(),
        size: randomRange(0.5, 1.9),
        speed: randomRange(0.008, 0.03),
        sway: randomRange(0.4, 1.6),
        phase: Math.random() * TAU,
        alpha: randomRange(0.08, 0.3)
      });
    }
  }

  start(starterId) {
    this.starterId = starterId;
    const starter = STARTER_MAP[starterId] || STARTER_MAP.agumon;
    this.stats = {
      ...starter.stats,
      maxHp: starter.stats.hp,
      hp: starter.stats.hp,
      crit: 0.05,
      critMult: 2,
      magnet: 1,
      xpGain: 1,
      regen: 0,
      leech: 0,
      orbit: 0,
      dashCd: 2.5
    };
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 17,
      facing: 1,
      invuln: 0,
      dashTime: 0,
      dashVx: 0,
      dashVy: 0,
      dashCdLeft: 0,
      walk: 0
    };
    this.time = 0;
    this.stage = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = 10;
    this.kills = 0;
    this.digivolutions = 0;
    this.enemies = [];
    this.projectiles = [];
    this.enemyShots = [];
    this.shards = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.upgrades = new Map();
    this.choices = [];
    this.pendingEvents = [];
    this.pendingEvolution = null;
    this.bossIndex = 0;
    this.boss = null;
    this.camera = { x: 0, y: 0 };
    this.shake = 0;
    this.hurtFlash = 0;
    this.flash = null;
    this.spawnAcc = 0;
    this.burstTimer = 9;
    this.nextWave = 2;
    this.wave = 1;
    this.hudTimer = 0;
    this.attackPulse = 0;
    this.hurtCooldown = 0;
    this.mode = "playing";
    this.input.setEnabled(true);
    this.orbitAngle = 0;
    for (let i = 0; i < 15; i += 1) {
      const angle = (i / 15) * TAU + randomRange(-0.22, 0.22);
      const distance = randomRange(210, 470);
      this.spawnEnemy(i % 4 === 0 ? "bat" : "crawler", distance, angle);
    }
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.random() * TAU;
      this.spawnShard(this.player.x + Math.cos(angle) * randomRange(60, 190), this.player.y + Math.sin(angle) * randomRange(60, 190), 1);
    }
    this.emitHud(true);
  }

  toMenu() {
    this.mode = "menu";
    this.input.setEnabled(false);
    this.time = 0;
    this.enemies = [];
    this.projectiles = [];
    this.enemyShots = [];
    this.shards = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.boss = null;
    this.shake = 0;
    this.hurtFlash = 0;
    this.flash = null;
    this.camera.x = 0;
    this.camera.y = 0;
  }

  pause() {
    if (this.mode !== "playing") return false;
    this.mode = "paused";
    this.input.setEnabled(false);
    return true;
  }

  resume() {
    if (this.mode !== "paused") return false;
    this.mode = "playing";
    this.input.setEnabled(true);
    this.flushEvents();
    return true;
  }

  flushEvents() {
    const events = this.pendingEvents.splice(0);
    for (const event of events) {
      if (this.onEvent) this.onEvent(event.type, event.payload);
    }
  }

  emit(type, payload) {
    if (this.mode === "levelup" || this.mode === "paused") {
      this.pendingEvents.push({ type, payload });
    } else if (this.onEvent) {
      this.onEvent(type, payload);
    }
  }

  frame(timestamp) {
    const raw = this.lastFrame ? (timestamp - this.lastFrame) / 1000 : 0;
    this.lastFrame = timestamp;
    const dt = clamp(raw, 0, 0.2);
    if (this.mode === "menu") {
      this.updateMenu(dt);
    } else if (this.mode === "playing") {
      let remaining = dt;
      let steps = 0;
      while (remaining > 0 && steps < 8 && this.mode === "playing") {
        const step = Math.min(1 / 60, remaining);
        this.update(step);
        remaining -= step;
        steps += 1;
      }
    } else {
      this.updateIdle(dt);
    }
    this.render(clamp(raw, 0, 0.05));
    this.raf = requestAnimationFrame(this.frame);
  }

  updateMenu(dt) {
    this.menuTime += dt;
    this.moteTime += dt;
    this.camera.x = Math.sin(this.menuTime * 0.11) * 190;
    this.camera.y = Math.cos(this.menuTime * 0.08) * 110;
    this.updateMotes(dt);
  }

  updateIdle(dt) {
    this.moteTime += dt;
    this.updateMotes(dt);
    for (const particle of this.particles) {
      particle.life -= dt;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  updateMotes(dt) {
    if (this.mode === "playing") this.moteTime += dt;
    for (const mote of this.motes) {
      mote.y -= mote.speed * dt;
      mote.x += Math.sin(this.moteTime * 0.5 + mote.phase) * 0.00006 * mote.sway;
      if (mote.y < -0.02) {
        mote.y = 1.02;
        mote.x = Math.random();
      }
      if (mote.x < -0.02) mote.x = 1.02;
      if (mote.x > 1.02) mote.x = -0.02;
    }
  }

  update(dt) {
    this.time += dt;
    if (this.time >= RUN_DURATION) {
      this.end(true);
      return;
    }
    if (this.xp >= this.xpNeed) {
      this.levelUp();
      return;
    }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.attackPulse = Math.max(0, this.attackPulse - dt * 5);
    this.input.update(dt);
    this.updatePlayer(dt);
    this.updateDirector(dt);
    this.buildGrid();
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateEnemyShots(dt);
    this.updateShards(dt);
    this.updatePickups(dt);
    this.updateOrbit(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateMotes(dt);
    this.attackTimer = (this.attackTimer || 0) - dt;
    if (this.attackTimer <= 0) this.tryAttack();
    this.updateCamera(dt);
    if (this.stats.regen > 0 && this.stats.hp > 0) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.regen * dt);
    }
    this.hudTimer += dt;
    if (this.hudTimer >= 0.08) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  updatePlayer(dt) {
    const player = this.player;
    player.invuln = Math.max(0, player.invuln - dt);
    player.dashCdLeft = Math.max(0, player.dashCdLeft - dt);
    if (this.input.consumeDash() && player.dashCdLeft <= 0 && player.dashTime <= 0) {
      const vector = this.input.vector();
      let dx = vector.x;
      let dy = vector.y;
      if (Math.hypot(dx, dy) < 0.2) {
        dx = player.facing;
        dy = 0;
      }
      const length = Math.hypot(dx, dy) || 1;
      player.dashVx = (dx / length) * this.stats.speed * 3.1;
      player.dashVy = (dy / length) * this.stats.speed * 3.1;
      player.dashTime = 0.2;
      player.dashCdLeft = this.stats.dashCd;
      player.invuln = Math.max(player.invuln, 0.34);
      this.audio.fx("dash");
      this.shake = Math.max(this.shake, 4);
      for (let i = 0; i < 10; i += 1) {
        this.spawnParticle(player.x, player.y, {
          vx: randomRange(-90, 90),
          vy: randomRange(-90, 90),
          life: randomRange(0.2, 0.45),
          size: randomRange(2, 5),
          color: STARTER_MAP[this.starterId].accent,
          drag: 4
        });
      }
      if (this.onEvent) this.onEvent("dash", null);
    }

    if (player.dashTime > 0) {
      player.x += player.dashVx * dt;
      player.y += player.dashVy * dt;
      player.dashTime -= dt;
      player.walk += dt * 12;
      if (Math.random() < 0.6) {
        this.spawnParticle(player.x - player.dashVx * 0.02, player.y - player.dashVy * 0.02, {
          vx: randomRange(-20, 20),
          vy: randomRange(-20, 20),
          life: 0.35,
          size: randomRange(2, 5),
          color: STARTER_MAP[this.starterId].color,
          drag: 3
        });
      }
    } else {
      const vector = this.input.vector();
      const targetVx = vector.x * this.stats.speed;
      const targetVy = vector.y * this.stats.speed;
      const k = 1 - Math.exp(-dt * 15);
      player.vx += (targetVx - player.vx) * k;
      player.vy += (targetVy - player.vy) * k;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      if (vector.length > 0.1) player.walk += dt * (6 + vector.length * 4);
      if (Math.abs(player.vx) > 12) player.facing = player.vx > 0 ? 1 : -1;
    }

    const target = this.findNearest(player.x, player.y, 900);
    if (target && Math.abs(target.x - player.x) > 12) {
      player.facing = target.x > player.x ? 1 : -1;
    }
    if (Math.random() < dt * 14) {
      const accent = STARTER_MAP[this.starterId].accent;
      this.spawnParticle(player.x + randomRange(-16, 16), player.y + randomRange(-4, 18), {
        vx: randomRange(-14, 14),
        vy: randomRange(-40, -16),
        life: randomRange(0.4, 0.9),
        size: randomRange(0.8, 2.2),
        color: accent,
        drag: 1
      });
    }
    if (Math.hypot(player.vx, player.vy) > 40 && Math.random() < dt * 18) {
      this.spawnParticle(player.x + randomRange(-8, 8), player.y + 18, {
        vx: randomRange(-26, 26),
        vy: randomRange(-8, 8),
        life: randomRange(0.2, 0.45),
        size: randomRange(1, 3),
        color: "rgba(120,220,255,0.6)",
        drag: 4
      });
    }
  }

  updateCamera(dt) {
    const player = this.player;
    const targetX = player.x + player.vx * 0.07;
    const targetY = player.y + player.vy * 0.07;
    const k = 1 - Math.exp(-dt * 8);
    this.camera.x += (targetX - this.camera.x) * k;
    this.camera.y += (targetY - this.camera.y) * k;
  }

  updateDirector(dt) {
    if (this.time >= this.nextWave * WAVE_LENGTH) {
      this.wave += 1;
      this.nextWave += 1;
      this.emit("wave", { wave: this.wave });
    }
    if (this.bossIndex < BOSSES.length && this.time >= BOSSES[this.bossIndex].at) {
      this.spawnBoss(BOSSES[this.bossIndex], this.bossIndex);
      this.bossIndex += 1;
    }
    const alive = this.enemies.length;
    if (alive >= this.maxEnemies) return;
    const rate = Math.min(6.4, 1.15 + this.time * 0.017);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      this.spawnRandomEnemy();
    }
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = Math.max(7, 14 - this.time * 0.02);
      const count = 4 + Math.floor(this.wave * 1.5);
      const baseAngle = Math.random() * TAU;
      for (let i = 0; i < count; i += 1) {
        this.spawnRandomEnemy(baseAngle + randomRange(-0.28, 0.28));
      }
    }
  }

  spawnRandomEnemy(forcedAngle) {
    if (this.enemies.length >= this.maxEnemies) return;
    const options = [];
    let total = 0;
    for (const [key, type] of Object.entries(ENEMIES)) {
      if (this.time < type.minTime) continue;
      const weight = type.weight * (1 + Math.min(1.2, (this.time - type.minTime) / 150));
      options.push({ key, type, weight });
      total += weight;
    }
    if (!options.length) return;
    let roll = Math.random() * total;
    let picked = options[0];
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) {
        picked = option;
        break;
      }
    }
    this.spawnEnemy(picked.key, null, forcedAngle);
  }

  spawnEnemy(kind, distance = null, angle = null, options = {}) {
    const type = ENEMIES[kind];
    if (!type && !options.boss) return null;
    const definition = options.boss || type;
    const a = angle === null ? Math.random() * TAU : angle;
    let radius = distance;
    if (radius === null) {
      const halfW = this.view.w / 2 + 44;
      const halfH = this.view.h / 2 + 44;
      const cos = Math.max(0.16, Math.abs(Math.cos(a)));
      const sin = Math.max(0.16, Math.abs(Math.sin(a)));
      radius = Math.min(halfW / cos, halfH / sin) + randomRange(30, 180);
    }
    const scaleHp = 1 + this.time / 235;
    const scaleDamage = 1 + this.time / 520;
    const elite = !options.boss && this.time > 75 && Math.random() < 0.055;
    const hp = definition.hp * (options.boss ? 1 : scaleHp) * (elite ? 3.2 : 1);
    const enemy = {
      id: this.enemyId += 1,
      kind: definition.kind,
      name: definition.name,
      x: this.player.x + Math.cos(a) * radius,
      y: this.player.y + Math.sin(a) * radius,
      vx: 0,
      vy: 0,
      radius: definition.radius * (elite ? 1.25 : 1),
      hp,
      maxHp: hp,
      speed: definition.speed * (elite ? 0.92 : 1),
      damage: definition.damage * (options.boss ? 1 : scaleDamage) * (elite ? 1.25 : 1),
      xp: definition.xp * (elite ? 3 : 1),
      color: elite ? "#ffd166" : definition.color,
      seed: Math.random() * TAU,
      flash: 0,
      slow: 0,
      shotTimer: randomRange(1.2, 3),
      burstTimer: randomRange(2.4, 4),
      summonTimer: randomRange(4, 7),
      dead: false,
      elite,
      boss: Boolean(options.boss),
      phase: Math.random() * TAU
    };
    this.enemies.push(enemy);
    if (options.boss) {
      this.boss = enemy;
      this.audio.fx("boss");
      this.shake = Math.max(this.shake, 12);
      this.emit("boss", { name: definition.name, title: definition.title });
    }
    return enemy;
  }

  spawnBoss(definition, index) {
    const boss = this.spawnEnemy("boss", 560, Math.random() * TAU, { boss: definition });
    if (boss) {
      boss.kind = definition.kind;
      boss.maxHp = definition.hp * (1 + index * 0.12);
      boss.hp = boss.maxHp;
      boss.xp = definition.xp;
      boss.damage = definition.damage;
      boss.speed = definition.speed;
      boss.radius = definition.radius;
      boss.color = definition.color;
      boss.name = definition.name;
    }
  }

  buildGrid() {
    this.grid.clear();
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const key = `${Math.floor(enemy.x / GRID)},${Math.floor(enemy.y / GRID)}`;
      let bucket = this.grid.get(key);
      if (!bucket) {
        bucket = [];
        this.grid.set(key, bucket);
      }
      bucket.push(enemy);
    }
  }

  queryGrid(x, y, radius) {
    const minX = Math.floor((x - radius) / GRID);
    const maxX = Math.floor((x + radius) / GRID);
    const minY = Math.floor((y - radius) / GRID);
    const maxY = Math.floor((y + radius) / GRID);
    const result = [];
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const bucket = this.grid.get(`${cx},${cy}`);
        if (bucket) {
          for (const enemy of bucket) result.push(enemy);
        }
      }
    }
    return result;
  }

  updateEnemies(dt) {
    const player = this.player;
    const list = this.enemies;
    for (const enemy of list) {
      if (enemy.dead) continue;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      let dx = player.x - enemy.x;
      let dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      dx /= distance;
      dy /= distance;

      if (enemy.kind === "bat" || enemy.kind === "charger") {
        const sway = Math.sin(this.time * 4.2 + enemy.seed) * 0.7;
        const px = -dy;
        const py = dx;
        dx += px * sway;
        dy += py * sway;
      }

      let moveX = dx;
      let moveY = dy;
      if (enemy.kind === "spitter") {
        if (distance < 230) {
          moveX = -dx;
          moveY = -dy;
        } else if (distance < 300) {
          moveX = 0;
          moveY = 0;
        }
      }

      const separation = { x: 0, y: 0 };
      const neighbors = this.queryGrid(enemy.x, enemy.y, enemy.radius + 26);
      for (const other of neighbors) {
        if (other === enemy || other.dead) continue;
        const ox = enemy.x - other.x;
        const oy = enemy.y - other.y;
        const minDistance = enemy.radius + other.radius;
        const distSq = ox * ox + oy * oy;
        if (distSq > 0.001 && distSq < minDistance * minDistance) {
          const dist = Math.sqrt(distSq);
          const force = (minDistance - dist) / minDistance;
          separation.x += (ox / dist) * force;
          separation.y += (oy / dist) * force;
        }
      }
      const slowFactor = enemy.slow > 0 ? 0.52 : 1;
      enemy.x += (moveX * enemy.speed * slowFactor + separation.x * 110) * dt;
      enemy.y += (moveY * enemy.speed * slowFactor + separation.y * 110) * dt;

      if (enemy.kind === "spitter") {
        enemy.shotTimer -= dt;
        if (distance < 460 && enemy.shotTimer <= 0) {
          enemy.shotTimer = randomRange(2.6, 3.8);
          this.spawnEnemyShot(enemy, player.x, player.y, 190, 7);
        }
      }
      if (enemy.kind === "charger") {
        enemy.shotTimer -= dt;
        if (distance < 340 && enemy.shotTimer <= 0) {
          enemy.shotTimer = randomRange(3.2, 4.5);
          enemy.x += dx * 26;
          enemy.y += dy * 26;
        }
      }
      if (enemy.kind === "boss") {
        enemy.burstTimer -= dt;
        enemy.summonTimer -= dt;
        if (enemy.burstTimer <= 0) {
          enemy.burstTimer = 4.2;
          const count = 10;
          for (let i = 0; i < count; i += 1) {
            const angle = (i / count) * TAU + this.time * 0.3;
            this.spawnEnemyShot(enemy, enemy.x + Math.cos(angle) * 30, enemy.y + Math.sin(angle) * 30, 150, 10, angle);
          }
          this.audio.fx("hit");
        }
        if (enemy.summonTimer <= 0) {
          enemy.summonTimer = 8;
          for (let i = 0; i < 3; i += 1) {
            const angle = Math.random() * TAU;
            const minion = this.spawnEnemy("crawler", 0, 0);
            if (minion) {
              minion.x = enemy.x + Math.cos(angle) * 60;
              minion.y = enemy.y + Math.sin(angle) * 60;
            }
          }
        }
      }
      if (enemy.kind === "boss2") {
        enemy.burstTimer -= dt;
        if (enemy.burstTimer <= 0) {
          enemy.burstTimer = 3.4;
          for (let i = -1; i <= 1; i += 1) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + i * 0.16;
            this.spawnEnemyShot(enemy, enemy.x, enemy.y, 210, 12, angle);
          }
        }
      }

      if (distance < enemy.radius + player.r) {
        enemy.x -= dx * 6;
        enemy.y -= dy * 6;
        if (player.invuln <= 0 && player.dashTime <= 0) {
          this.hurtPlayer(enemy.damage, enemy);
        }
      }
    }
    this.enemies = list.filter(enemy => !enemy.dead);
  }

  hurtPlayer(amount, source) {
    if (this.player.invuln > 0) return;
    this.stats.hp -= amount;
    this.player.invuln = 0.62;
    this.hurtFlash = 1;
    this.shake = Math.max(this.shake, 8);
    this.audio.fx("hurt");
    this.spawnText(this.player.x, this.player.y - 20, `-${Math.round(amount)}`, "#ff8fa3", 14, true);
    for (let i = 0; i < 8; i += 1) {
      this.spawnParticle(this.player.x, this.player.y, {
        vx: randomRange(-140, 140),
        vy: randomRange(-140, 140),
        life: randomRange(0.2, 0.5),
        size: randomRange(1.5, 4),
        color: "#ff4d6d",
        drag: 3
      });
    }
    if (source) {
      const dx = source.x - this.player.x;
      const dy = source.y - this.player.y;
      const length = Math.hypot(dx, dy) || 1;
      this.player.vx += (dx / length) * 120;
      this.player.vy += (dy / length) * 120;
    }
    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.end(false);
    }
  }

  spawnEnemyShot(source, targetX, targetY, speed, damage, forcedAngle = null) {
    const angle = forcedAngle === null ? Math.atan2(targetY - source.y, targetX - source.x) : forcedAngle;
    this.enemyShots.push({
      x: source.x,
      y: source.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      damage,
      life: 6,
      phase: Math.random() * TAU
    });
    this.audio.fx("shoot");
  }

  updateEnemyShots(dt) {
    const player = this.player;
    for (const shot of this.enemyShots) {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (Math.random() < 0.25) {
        this.spawnParticle(shot.x, shot.y, {
          vx: 0,
          vy: 0,
          life: 0.25,
          size: randomRange(1, 3),
          color: "#c084fc",
          drag: 1
        });
      }
      const dx = shot.x - player.x;
      const dy = shot.y - player.y;
      if (dx * dx + dy * dy < (shot.radius + player.r) * (shot.radius + player.r) && player.invuln <= 0) {
        shot.life = 0;
        this.hurtPlayer(shot.damage, shot);
      }
    }
    this.enemyShots = this.enemyShots.filter(shot => shot.life > 0);
  }

  findNearest(x, y, range) {
    let best = null;
    let bestDistance = range * range;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistance) {
        bestDistance = distSq;
        best = enemy;
      }
    }
    return best;
  }

  tryAttack() {
    const nearest = this.findNearest(this.player.x, this.player.y, this.stats.range);
    if (!nearest) {
      this.attackTimer = 0.08;
      return;
    }
    const starter = STARTER_MAP[this.starterId];
    const baseAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
    const count = Math.round(this.stats.multi);
    const spread = starter.weapon === "ice" ? 0.1 : 0.13;
    for (let i = 0; i < count; i += 1) {
      const offset = count > 1 ? (i - (count - 1) / 2) * spread : 0;
      const angle = baseAngle + offset;
      const speed = this.stats.projSpeed;
      const crit = Math.random() < this.stats.crit;
      const damage = this.stats.damage * (crit ? this.stats.critMult : 1);
      const projectile = {
        x: this.player.x + Math.cos(angle) * 18,
        y: this.player.y + Math.sin(angle) * 18 - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        radius: this.stats.projSize,
        damage,
        crit,
        life: starter.weapon === "holy" ? 2.3 : 1.5,
        pierce: this.stats.pierce + (starter.weapon === "ice" ? 2 : 0),
        type: starter.weapon,
        color: starter.weapon === "fire" ? "#ffb347" : starter.weapon === "ice" ? "#9beaff" : "#ffe9a3",
        trail: starter.accent,
        hitSet: new Set(),
        homing: starter.weapon === "holy" ? 3.6 : 0,
        speed
      };
      this.projectiles.push(projectile);
    }
    this.attackTimer = this.stats.cooldown;
    this.attackPulse = 1;
    for (let i = 0; i < 5; i += 1) {
      const angle = baseAngle + randomRange(-0.4, 0.4);
      this.spawnParticle(this.player.x + Math.cos(angle) * 20, this.player.y + Math.sin(angle) * 20 - 4, {
        vx: Math.cos(angle) * randomRange(30, 90),
        vy: Math.sin(angle) * randomRange(30, 90),
        life: randomRange(0.1, 0.24),
        size: randomRange(1.5, 3.5),
        color: starter.accent,
        drag: 4
      });
    }
    this.audio.fx(starter.weapon === "ice" ? "ice" : starter.weapon === "holy" ? "holy" : "shoot");
  }

  updateProjectiles(dt) {
    const player = this.player;
    for (const projectile of this.projectiles) {
      projectile.life -= dt;
      if (projectile.homing > 0) {
        const target = this.findNearest(projectile.x, projectile.y, 380);
        if (target) {
          const desired = Math.atan2(target.y - projectile.y, target.x - projectile.x);
          let difference = desired - projectile.angle;
          while (difference > Math.PI) difference -= TAU;
          while (difference < -Math.PI) difference += TAU;
          projectile.angle += clamp(difference, -projectile.homing * dt, projectile.homing * dt);
          projectile.vx = Math.cos(projectile.angle) * projectile.speed;
          projectile.vy = Math.sin(projectile.angle) * projectile.speed;
        }
      }
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (Math.random() < 0.95) {
        this.spawnParticle(projectile.x, projectile.y, {
          vx: -projectile.vx * 0.08 + randomRange(-18, 18),
          vy: -projectile.vy * 0.08 + randomRange(-18, 18),
          life: randomRange(0.12, 0.28),
          size: randomRange(1, projectile.radius * 0.55),
          color: projectile.trail,
          drag: 3
        });
      }
      const enemies = this.queryGrid(projectile.x, projectile.y, projectile.radius + 34);
      for (const enemy of enemies) {
        if (enemy.dead || projectile.hitSet.has(enemy.id)) continue;
        const dx = enemy.x - projectile.x;
        const dy = enemy.y - projectile.y;
        const reach = enemy.radius + projectile.radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        projectile.hitSet.add(enemy.id);
        this.damageEnemy(enemy, projectile.damage, projectile.crit, projectile.type);
        projectile.pierce -= 1;
        this.spawnBurst(projectile.x, projectile.y, projectile.type === "ice" ? "#9beaff" : projectile.type === "holy" ? "#ffe9a3" : "#ffb347", 4);
        if (projectile.pierce < 0) {
          projectile.life = 0;
          break;
        }
      }
      if (Math.abs(projectile.x - player.x) > 2200 || Math.abs(projectile.y - player.y) > 2200) projectile.life = 0;
    }
    this.projectiles = this.projectiles.filter(projectile => projectile.life > 0);
  }

  damageEnemy(enemy, amount, crit, type) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 0.18;
    if (type === "ice") enemy.slow = Math.max(enemy.slow, 1.2);
    this.audio.fx("hit");
    this.spawnText(
      enemy.x + randomRange(-6, 6),
      enemy.y - enemy.radius * 0.6,
      `${Math.round(amount)}`,
      crit ? "#ffd166" : "#e9f7ff",
      crit ? 16 : 12,
      crit
    );
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    enemy.dead = true;
    this.kills += 1;
    this.audio.fx("death");
    this.spawnBurst(enemy.x, enemy.y, enemy.color, enemy.boss ? 34 : 10);
    this.shake = Math.max(this.shake, enemy.boss ? 18 : 2.5);
    if (this.stats.leech > 0) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.leech);
    }
    if (enemy.boss) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 30);
      const count = 12;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * TAU;
        this.spawnShard(enemy.x + Math.cos(angle) * 26, enemy.y + Math.sin(angle) * 26, Math.ceil(enemy.xp / 4));
      }
      this.dropPickup(enemy.x, enemy.y, "heal");
      this.boss = null;
      this.flash = { color: "255,220,120", alpha: 0.32, life: 0.45, max: 0.45 };
      this.emit("bossDown", { name: enemy.name });
      return;
    }
    const shardCount = enemy.elite ? 4 : 1;
    for (let i = 0; i < shardCount; i += 1) {
      this.spawnShard(enemy.x + randomRange(-8, 8), enemy.y + randomRange(-8, 8), Math.max(1, Math.ceil(enemy.xp / shardCount)));
    }
    if (enemy.elite) this.dropPickup(enemy.x, enemy.y, "heal");
    else this.dropPickup(enemy.x, enemy.y, null);
  }

  dropPickup(x, y, forced) {
    if (forced) {
      this.pickups.push({ x, y, kind: forced, phase: Math.random() * TAU, life: 26 });
      return;
    }
    const roll = Math.random();
    let kind = null;
    if (roll < 0.012) kind = "heal";
    else if (roll < 0.02) kind = "magnet";
    else if (roll < 0.024) kind = "bomb";
    if (kind) this.pickups.push({ x, y, kind, phase: Math.random() * TAU, life: 26 });
  }

  spawnShard(x, y, value) {
    if (this.shards.length > 520) return;
    const angle = Math.random() * TAU;
    this.shards.push({
      x,
      y,
      vx: Math.cos(angle) * randomRange(30, 100),
      vy: Math.sin(angle) * randomRange(30, 100),
      value,
      phase: Math.random() * TAU,
      life: 30,
      delay: 0.35,
      vacuum: 0
    });
  }

  updateShards(dt) {
    const player = this.player;
    const magnetRadius = 105 * this.stats.magnet;
    for (const shard of this.shards) {
      shard.life -= dt;
      shard.delay -= dt;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.vx *= Math.exp(-dt * 4);
      shard.vy *= Math.exp(-dt * 4);
      if (shard.vacuum > 0) shard.vacuum -= dt;
      const dx = player.x - shard.x;
      const dy = player.y - shard.y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = shard.vacuum > 0 ? 2400 : distance < magnetRadius ? 760 : 0;
      if (pull > 0 && shard.delay <= 0) {
        shard.x += (dx / distance) * pull * dt;
        shard.y += (dy / distance) * pull * dt;
      }
      if (distance < 22 && shard.delay <= 0) {
        shard.life = 0;
        this.xp += shard.value * this.stats.xpGain;
        if (Math.random() < 0.35) this.audio.fx("pickup");
        this.spawnParticle(shard.x, shard.y, {
          vx: randomRange(-40, 40),
          vy: randomRange(-40, 40),
          life: 0.3,
          size: randomRange(1, 3),
          color: PALETTE.xp,
          drag: 3
        });
      }
    }
    this.shards = this.shards.filter(shard => shard.life > 0);
  }

  updatePickups(dt) {
    const player = this.player;
    for (const pickup of this.pickups) {
      pickup.life -= dt;
      pickup.phase += dt * 2;
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      if (dx * dx + dy * dy < (player.r + 18) * (player.r + 18)) {
        pickup.life = 0;
        this.collectPickup(pickup);
      }
    }
    this.pickups = this.pickups.filter(pickup => pickup.life > 0);
  }

  collectPickup(pickup) {
    if (pickup.kind === "heal") {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.maxHp * 0.3);
      this.audio.fx("heal");
      this.spawnText(this.player.x, this.player.y - 26, "REPAIR +", "#8dffb0", 14, true);
      this.flash = { color: "120,255,170", alpha: 0.16, life: 0.28, max: 0.28 };
    } else if (pickup.kind === "magnet") {
      for (const shard of this.shards) shard.vacuum = 1.2;
      this.audio.fx("pickup");
      this.spawnText(this.player.x, this.player.y - 26, "DATA VACUUM", "#7dd3fc", 14, true);
    } else if (pickup.kind === "bomb") {
      this.audio.fx("bomb");
      this.flash = { color: "255,150,80", alpha: 0.4, life: 0.45, max: 0.45 };
      this.shake = Math.max(this.shake, 16);
      const damage = 90 + this.time * 0.5;
      const targets = this.queryGrid(this.player.x, this.player.y, 380);
      for (const enemy of targets) {
        if (!enemy.dead && Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) < 380) {
          this.damageEnemy(enemy, damage, false, "fire");
        }
      }
      this.spawnBurst(this.player.x, this.player.y, "#ffb347", 30);
      this.spawnText(this.player.x, this.player.y - 26, "DATA BOMB", "#ffb347", 14, true);
    }
  }

  updateOrbit(dt) {
    const count = Math.round(this.stats.orbit);
    if (!count) return;
    this.orbitAngle += dt * 2.2;
    const radius = 58 + count * 5;
    for (let i = 0; i < count; i += 1) {
      const angle = this.orbitAngle + (i / count) * TAU;
      const x = this.player.x + Math.cos(angle) * radius;
      const y = this.player.y + Math.sin(angle) * radius;
      const targets = this.queryGrid(x, y, 30);
      for (const enemy of targets) {
        if (enemy.dead) continue;
        const dist = Math.hypot(enemy.x - x, enemy.y - y);
        if (dist < enemy.radius + 12) {
          const now = this.time;
          if (!enemy.orbitCooldown || now > enemy.orbitCooldown) {
            enemy.orbitCooldown = now + 0.45;
            this.damageEnemy(enemy, this.stats.damage * 0.55, false, "holy");
          }
        }
      }
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const drag = Math.exp(-dt * (particle.drag || 2));
      particle.vx *= drag;
      particle.vy *= drag;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    if (this.particles.length > 640) this.particles.splice(0, this.particles.length - 640);
  }

  updateTexts(dt) {
    for (const text of this.texts) {
      text.life -= dt;
      text.y -= dt * 28;
    }
    this.texts = this.texts.filter(text => text.life > 0);
  }

  spawnParticle(x, y, options) {
    if (this.particles.length > 640) return;
    this.particles.push({
      x,
      y,
      vx: options.vx || 0,
      vy: options.vy || 0,
      life: options.life || 0.4,
      maxLife: options.life || 0.4,
      size: options.size || 2,
      color: options.color || "#ffffff",
      drag: options.drag || 2
    });
  }

  spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const speed = randomRange(40, 190);
      this.spawnParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.2, 0.65),
        size: randomRange(1.2, 4),
        color,
        drag: 3
      });
    }
  }

  spawnText(x, y, text, color, size = 12, crit = false) {
    if (this.texts.length > 70) return;
    this.texts.push({
      x,
      y,
      text,
      color,
      size,
      crit,
      life: 0.7,
      maxLife: 0.7
    });
  }

  levelUp() {
    this.level += 1;
    this.xp -= this.xpNeed;
    this.xpNeed = Math.round(9 + this.level * 5.5 + Math.pow(this.level, 1.32));
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.maxHp * 0.08);
    let evolved = false;
    if (EVOLVE_LEVELS.includes(this.level) && this.stage < 2) {
      this.stage += 1;
      this.digivolutions += 1;
      this.stats.maxHp += 22;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.maxHp * 0.4);
      this.stats.damage *= 1.13;
      this.stats.speed *= 1.02;
      evolved = true;
      this.pendingEvolution = {
        stage: this.stage,
        name: STARTER_MAP[this.starterId].line[this.stage],
        title: STARTER_MAP[this.starterId].line[this.stage]
      };
      this.flash = { color: "255,220,120", alpha: 0.3, life: 0.5, max: 0.5 };
      this.audio.fx("evolve");
    }
    if (this.stage >= 2 && evolved) this.stats.speed *= 1.02;
    this.choices = this.rollUpgrades();
    this.mode = "levelup";
    this.input.setEnabled(false);
    this.audio.fx("level");
    if (evolved && this.pendingEvolution) {
      const payload = { ...this.pendingEvolution, name: STARTER_MAP[this.starterId].line[this.stage] };
      this.pendingEvents.push({ type: "evolve", payload });
    }
    if (this.onLevelUp) this.onLevelUp(this.choices, this.level, this.stage);
    this.emitHud(true);
  }

  rollUpgrades() {
    const pool = UPGRADES.filter(upgrade => (this.upgrades.get(upgrade.id) || 0) < upgrade.max);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  chooseUpgrade(id) {
    if (this.mode !== "levelup") return;
    const upgrade = UPGRADE_MAP[id];
    if (!upgrade) return;
    const owned = this.upgrades.get(id) || 0;
    if (owned >= upgrade.max) return;
    upgrade.apply(this.stats, this.player);
    this.upgrades.set(id, owned + 1);
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp);
    this.audio.fx("ui");
    this.choices = [];
    this.mode = "playing";
    this.input.setEnabled(true);
    this.emitHud(true);
    if (this.xp >= this.xpNeed) {
      this.levelUp();
    }
  }

  getHudState() {
    return {
      hp: this.stats ? this.stats.hp : 0,
      maxHp: this.stats ? this.stats.maxHp : 1,
      xp: this.xp,
      xpNeed: this.xpNeed,
      level: this.level,
      time: this.time,
      kills: this.kills,
      stage: this.stage,
      name: STARTER_MAP[this.starterId].line[this.stage],
      wave: this.wave,
      dash: this.player ? 1 - clamp(this.player.dashCdLeft / this.stats.dashCd, 0, 1) : 0,
      hurt: this.hurtFlash,
      boss: this.boss && !this.boss.dead ? { name: this.boss.name, hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
      mode: this.mode
    };
  }

  emitHud(force) {
    if (this.onHud) this.onHud(this.getHudState(), force);
  }

  end(victory) {
    if (this.mode === "over") return;
    this.mode = "over";
    this.input.setEnabled(false);
    this.audio.fx(victory ? "victory" : "gameover");
    const summary = {
      victory,
      time: this.time,
      kills: this.kills,
      level: this.level,
      evolutions: this.digivolutions,
      starterId: this.starterId,
      stage: this.stage,
      name: STARTER_MAP[this.starterId].line[this.stage]
    };
    this.emitHud(true);
    if (this.onGameOver) this.onGameOver(summary);
  }

  render(dt) {
    const { ctx } = this;
    const { w, h, dpr } = this.view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.renderBackground();
    if (this.mode === "menu") {
      this.renderMenuScene();
    } else {
      this.renderWorld();
    }
    this.renderMotes();
    this.renderOverlayEffects(dt);
  }

  buildBackgroundCache() {
    const { w, h } = this.view;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#081226");
    gradient.addColorStop(0.52, "#050b18");
    gradient.addColorStop(1, "#03060e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.48, Math.max(w, h) * 0.72);
    glow.addColorStop(0, "rgba(34,126,180,0.17)");
    glow.addColorStop(0.55, "rgba(20,60,110,0.06)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const topGlow = ctx.createRadialGradient(w * 0.5, -h * 0.2, 0, w * 0.5, -h * 0.2, h * 0.9);
    topGlow.addColorStop(0, "rgba(50,180,255,0.14)");
    topGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, w, h);
    const bottom = ctx.createLinearGradient(0, h * 0.55, 0, h);
    bottom.addColorStop(0, "rgba(3,6,14,0)");
    bottom.addColorStop(1, "rgba(2,4,10,0.55)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, w, h);
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.32, w * 0.5, h * 0.48, Math.max(w, h) * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    this.bgCache = canvas;
  }

  renderBackground() {
    const { ctx } = this;
    const { w, h } = this.view;
    if (!this.bgCache) this.buildBackgroundCache();
    ctx.drawImage(this.bgCache, 0, 0, w, h);

    const cam = this.camera;
    const offsetX = -((cam.x % GRID) + GRID) % GRID;
    const offsetY = -((cam.y % GRID) + GRID) % GRID;
    const majorOffsetX = -((cam.x % (GRID * 5)) + GRID * 5) % (GRID * 5);
    const majorOffsetY = -((cam.y % (GRID * 5)) + GRID * 5) % (GRID * 5);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(73,190,230,0.07)";
    ctx.beginPath();
    for (let x = offsetX; x < w; x += GRID) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = offsetY; y < h; y += GRID) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(88,240,255,0.11)";
    ctx.beginPath();
    for (let x = majorOffsetX; x < w; x += GRID * 5) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = majorOffsetY; y < h; y += GRID * 5) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();

    const ringX = w / 2 + offsetX;
    const ringY = h / 2 + offsetY;
    ctx.save();
    ctx.strokeStyle = "rgba(88,240,255,0.045)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.arc(ringX, ringY, GRID * i * 3.2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderMotes() {
    const { ctx } = this;
    const { w, h } = this.view;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const mote of this.motes) {
      const x = mote.x * w + Math.sin(this.moteTime * 0.6 + mote.phase) * 12;
      const y = mote.y * h;
      ctx.globalAlpha = mote.alpha;
      ctx.fillStyle = "#7fe8ff";
      ctx.beginPath();
      ctx.arc(x, y, mote.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  renderMenuScene() {
    const { ctx } = this;
    const { w, h } = this.view;
    const cx = w / 2;
    const cy = h * 0.53;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.menuTime * 0.04);
    ctx.strokeStyle = "rgba(88,240,255,0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, 120 + i * 66, this.menuTime * 0.05 * (i % 2 === 0 ? 1 : -1), this.menuTime * 0.05 * (i % 2 === 0 ? 1 : -1) + Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.restore();

    const bob = Math.sin(this.menuTime * 1.4) * 5;
    const alpha = 0.14 + Math.sin(this.menuTime * 0.6) * 0.03;
    const points = [
      { x: w * 0.16, y: h * 0.62 + bob, stage: 1, id: "agumon", scale: 1.9, f: 1 },
      { x: w * 0.84, y: h * 0.6 - bob, stage: 1, id: "gabumon", scale: 1.9, f: -1 }
    ];
    for (const point of points) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(point.x, point.y);
      ctx.scale(point.scale * point.f, point.scale);
      drawCreature(ctx, point.id, point.stage, this.menuTime, {});
      ctx.restore();
    }
  }

  renderWorld() {
    const { ctx } = this;
    const { w, h } = this.view;
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    const offsetX = w / 2 - this.camera.x + shakeX;
    const offsetY = h / 2 - this.camera.y + shakeY;
    const toScreen = (x, y) => ({ x: x + offsetX, y: y + offsetY });

    this.renderDecor(offsetX, offsetY);

    if (this.player) {
      const pos = toScreen(this.player.x, this.player.y);
      const light = ctx.createRadialGradient(pos.x, pos.y, 10, pos.x, pos.y, 260);
      light.addColorStop(0, "rgba(40,150,200,0.06)");
      light.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = light;
      ctx.fillRect(pos.x - 260, pos.y - 260, 520, 520);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const shard of this.shards) {
      const pos = toScreen(shard.x, shard.y);
      if (pos.x < -30 || pos.x > w + 30 || pos.y < -30 || pos.y > h + 30) continue;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      drawShard(ctx, this.time, shard.phase, PALETTE.xp);
      ctx.restore();
    }
    ctx.restore();

    for (const pickup of this.pickups) {
      const pos = toScreen(pickup.x, pickup.y);
      if (pos.x < -40 || pos.x > w + 40 || pos.y < -40 || pos.y > h + 40) continue;
      this.drawPickup(pos.x, pos.y, pickup);
    }

    if (this.player) {
      for (let i = 0; i < Math.round(this.stats.orbit); i += 1) {
        const count = Math.round(this.stats.orbit);
        const angle = this.orbitAngle + (i / count) * TAU;
        const radius = 58 + count * 5;
        const pos = toScreen(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(192,132,252,0.28)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#e9d5ff";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4.5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(192,132,252,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8 + Math.sin(this.time * 5 + i) * 1.5, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    const visibleEnemies = [];
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const pos = toScreen(enemy.x, enemy.y);
      if (pos.x < -140 || pos.x > w + 140 || pos.y < -140 || pos.y > h + 140) continue;
      visibleEnemies.push({ enemy, pos });
    }
    visibleEnemies.sort((a, b) => a.enemy.y - b.enemy.y);

    for (const item of visibleEnemies) {
      this.drawEnemy(item.enemy, item.pos.x, item.pos.y);
    }

    if (this.player) this.drawPlayer(toScreen(this.player.x, this.player.y));

    for (const projectile of this.projectiles) {
      const pos = toScreen(projectile.x, projectile.y);
      this.drawProjectile(pos.x, pos.y, projectile);
    }
    for (const shot of this.enemyShots) {
      const pos = toScreen(shot.x, shot.y);
      if (pos.x < -30 || pos.x > w + 30 || pos.y < -30 || pos.y > h + 30) continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(192,132,252,0.25)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 13 + Math.sin(this.time * 8 + shot.phase) * 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f5e8ff";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    this.drawParticles(offsetX, offsetY);

    for (const text of this.texts) {
      const pos = toScreen(text.x, text.y);
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${text.crit ? 700 : 600} ${text.size}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillText(text.text, pos.x + 1, pos.y + 1);
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, pos.x, pos.y);
      ctx.restore();
    }

    this.drawJoystick();
    this.drawBossIndicator(toScreen);
  }

  renderDecor(offsetX, offsetY) {
    const { ctx } = this;
    const { w, h } = this.view;
    const cell = 430;
    const cam = this.camera;
    const minX = Math.floor((cam.x - w / 2) / cell) - 1;
    const maxX = Math.floor((cam.x + w / 2) / cell) + 1;
    const minY = Math.floor((cam.y - h / 2) / cell) - 1;
    const maxY = Math.floor((cam.y + h / 2) / cell) + 1;
    const t = this.mode === "menu" ? this.menuTime : this.time;
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const seed = hash2(cx, cy);
        if (seed < 0.24) continue;
        const wx = cx * cell + hash2(cx + 17, cy - 9) * cell * 0.74 + cell * 0.13;
        const wy = cy * cell + hash2(cx - 5, cy + 23) * cell * 0.74 + cell * 0.13;
        const x = wx + offsetX;
        const y = wy + offsetY;
        if (x < -120 || x > w + 120 || y < -120 || y > h + 120) continue;
        const color = hash2(cx + 3, cy + 7) > 0.48 ? "#58f0ff" : "#c084fc";
        ctx.save();
        ctx.translate(x, y);
        if (seed < 0.56) {
          const radius = 34 + hash2(cx + 11, cy + 4) * 42;
          const rotation = t * 0.06 + seed * TAU;
          ctx.rotate(rotation);
          ctx.strokeStyle = rgba(color, 0.085);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.72, 0, TAU);
          ctx.stroke();
          for (let i = 0; i < 8; i += 1) {
            const angle = (i / 8) * TAU;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78);
            ctx.lineTo(Math.cos(angle) * radius * 0.96, Math.sin(angle) * radius * 0.96);
            ctx.stroke();
          }
          ctx.fillStyle = rgba(color, 0.03);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.55, 0, TAU);
          ctx.fill();
        } else if (seed < 0.82) {
          const radius = 14 + hash2(cx + 8, cy + 19) * 12;
          const pulse = 0.85 + Math.sin(t * 1.8 + seed * 9) * 0.15;
          ctx.globalCompositeOperation = "lighter";
          const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 2.6);
          glow.addColorStop(0, rgba(color, 0.16 * pulse));
          glow.addColorStop(1, rgba(color, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 2.6, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = rgba(color, 0.2);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const angle = (i / 6) * TAU + t * 0.12;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = rgba(color, 0.1);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.34, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = rgba(color, 0.32);
          ctx.beginPath();
          ctx.moveTo(0, -radius * 0.58);
          ctx.lineTo(0, radius * 0.58);
          ctx.moveTo(-radius * 0.58, 0);
          ctx.lineTo(radius * 0.58, 0);
          ctx.stroke();
        } else {
          const scale = 0.7 + hash2(cx + 2, cy + 13) * 0.8;
          ctx.scale(scale, scale);
          ctx.globalCompositeOperation = "lighter";
          const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 34);
          glow.addColorStop(0, rgba(color, 0.12));
          glow.addColorStop(1, rgba(color, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, 34, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = rgba(color, 0.14);
          ctx.strokeStyle = rgba(color, 0.35);
          ctx.lineWidth = 1;
          for (let i = 0; i < 3; i += 1) {
            const angle = -Math.PI / 2 + i * 1.4 + seed;
            const length = 18 + i * 8;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4);
            ctx.lineTo(Math.cos(angle + 0.28) * length * 0.4, Math.sin(angle + 0.28) * length * 0.4);
            ctx.lineTo(Math.cos(angle - 0.1) * length, Math.sin(angle - 0.1) * length);
            ctx.lineTo(Math.cos(angle - 0.34) * length * 0.4, Math.sin(angle - 0.34) * length * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }

  drawEnemy(enemy, x, y) {
    const { ctx } = this;
    const scale = (enemy.radius / 16) * 1.18 * (1 + Math.sin(this.time * 4 + enemy.seed) * 0.02);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.36)";
    ctx.beginPath();
    ctx.ellipse(x, y + enemy.radius * 0.82, enemy.radius * 0.9, enemy.radius * 0.34, 0, 0, TAU);
    ctx.fill();
    if (enemy.elite || enemy.boss) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(x, y, 0, x, y, enemy.radius * 1.8);
      glow.addColorStop(0, rgba(enemy.color, 0.22));
      glow.addColorStop(1, rgba(enemy.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius * 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    const floatY = enemy.kind === "bat" || enemy.kind === "charger" ? Math.sin(this.time * 3.4 + enemy.seed) * 5 : 0;
    ctx.translate(x, y + floatY);
    ctx.scale(scale, scale);
    if (enemy.kind === "bat" || enemy.kind === "charger") {
      ctx.rotate(Math.sin(this.time * 2.2 + enemy.seed) * 0.1);
    }
    drawEnemyCreature(ctx, enemy.kind, this.time, enemy.seed, enemy.flash, enemy.color);
    if (enemy.elite) {
      ctx.strokeStyle = "rgba(255,209,102,0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + Math.sin(this.time * 3 + enemy.seed) * 2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    if (enemy.boss) {
      const width = enemy.radius * 1.8;
      const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.save();
      ctx.fillStyle = "rgba(4,8,16,0.7)";
      ctx.fillRect(x - width / 2, y - enemy.radius - 18, width, 5);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(x - width / 2, y - enemy.radius - 18, width * ratio, 5);
      ctx.restore();
    } else if (enemy.elite) {
      const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.save();
      ctx.fillStyle = "rgba(4,8,16,0.7)";
      ctx.fillRect(x - 16, y - enemy.radius - 12, 32, 3);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x - 16, y - enemy.radius - 12, 32 * ratio, 3);
      ctx.restore();
    }
  }

  drawPlayer(pos) {
    const { ctx } = this;
    const player = this.player;
    const starter = STARTER_MAP[this.starterId];
    const scale = 1.18 + this.stage * 0.18;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 24 * scale, 26 * scale, 10 * scale, 0, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    const auraRadius = 34 + this.stage * 9 + Math.sin(this.time * 3) * 2;
    const aura = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, auraRadius);
    aura.addColorStop(0, rgba(starter.accent, 0.16));
    aura.addColorStop(0.6, rgba(starter.color, 0.06));
    aura.addColorStop(1, rgba(starter.color, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, auraRadius, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    if (player.invuln > 0 && Math.floor(this.time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
    if (player.dashTime > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.28;
      for (let i = 1; i <= 3; i += 1) {
        ctx.save();
        ctx.translate(pos.x - player.dashVx * dtGuess * i, pos.y - player.dashVy * dtGuess * i);
        ctx.scale(scale * player.facing, scale);
        drawCreature(ctx, this.starterId, this.stage, this.time - i * 0.05, {});
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    ctx.translate(pos.x, pos.y);
    ctx.scale(scale * player.facing, scale);
    drawCreature(ctx, this.starterId, this.stage, this.time, { attack: this.attackPulse });
    ctx.restore();
  }

  drawBossIndicator(toScreen) {
    if (!this.boss || this.boss.dead) return;
    const pos = toScreen(this.boss.x, this.boss.y);
    const { w, h } = this.view;
    if (pos.x > 40 && pos.x < w - 40 && pos.y > 40 && pos.y < h - 40) return;
    const angle = Math.atan2(pos.y - h / 2, pos.x - w / 2);
    const margin = 54;
    const radius = Math.min(w, h) / 2 - margin;
    const x = w / 2 + Math.cos(angle) * radius;
    const y = h / 2 + Math.sin(angle) * radius;
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255,77,109,0.85)";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawProjectile(x, y, projectile) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, projectile.radius * 4);
    glow.addColorStop(0, rgba(projectile.color, 0.55));
    glow.addColorStop(0.5, rgba(projectile.color, 0.16));
    glow.addColorStop(1, rgba(projectile.color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius * 4, 0, TAU);
    ctx.fill();

    if (projectile.type === "ice") {
      ctx.rotate(projectile.angle);
      ctx.fillStyle = "#dffaff";
      ctx.beginPath();
      ctx.moveTo(projectile.radius * 2.4, 0);
      ctx.lineTo(0, -projectile.radius * 0.85);
      ctx.lineTo(-projectile.radius * 1.6, 0);
      ctx.lineTo(0, projectile.radius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120,220,255,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (projectile.type === "holy") {
      ctx.fillStyle = "#fff4c4";
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 0.85, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,225,120,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 1.6, this.time * 4, this.time * 4 + Math.PI * 1.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffe4a8";
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 0.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(projectile.color, 0.65);
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 1.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff7df";
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 0.45, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPickup(x, y, pickup) {
    const { ctx } = this;
    const bob = Math.sin(this.time * 4 + pickup.phase) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.globalCompositeOperation = "lighter";
    const color = pickup.kind === "heal" ? "#7dffb2" : pickup.kind === "magnet" ? "#7dd3fc" : "#ffb347";
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
    glow.addColorStop(0, rgba(color, 0.3));
    glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(6,14,26,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = color;
    if (pickup.kind === "heal") {
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
    } else if (pickup.kind === "magnet") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 1, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillRect(-6, 1, 3, 5);
      ctx.fillRect(3, 1, 3, 5);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(6, 2);
      ctx.lineTo(2, 2);
      ctx.lineTo(4, 7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawParticles(offsetX, offsetY) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      if (alpha <= 0) continue;
      const x = particle.x + offsetX;
      const y = particle.y + offsetY;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(x, y, particle.size * (0.5 + alpha * 0.7), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawJoystick() {
    if (!this.input.pointer.active) return;
    const { ctx } = this;
    const pointer = this.input.pointer;
    const dx = pointer.x - pointer.ox;
    const dy = pointer.y - pointer.oy;
    const length = Math.hypot(dx, dy);
    const radius = pointer.radius;
    let knobX = dx;
    let knobY = dy;
    if (length > radius) {
      knobX = (dx / length) * radius;
      knobY = (dy / length) * radius;
    }
    ctx.save();
    ctx.translate(pointer.ox, pointer.oy);
    ctx.fillStyle = "rgba(8,24,42,0.34)";
    ctx.strokeStyle = "rgba(88,240,255,0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(88,240,255,0.14)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(120,245,255,0.26)";
    ctx.strokeStyle = "rgba(160,250,255,0.75)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, 22, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(220,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  renderOverlayEffects(dt) {
    const { ctx } = this;
    const { w, h } = this.view;
    if (this.flash) {
      this.flash.life -= dt;
      const alpha = clamp(this.flash.life / this.flash.max, 0, 1) * this.flash.alpha;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${this.flash.color},${alpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      if (this.flash.life <= 0) this.flash = null;
    }
    if (this.hurtFlash > 0) {
      const alpha = this.hurtFlash * 0.25;
      const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
      gradient.addColorStop(0, "rgba(255,20,60,0)");
      gradient.addColorStop(1, `rgba(255,20,60,${alpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

const dtGuess = 0.016;
