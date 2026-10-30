import * as THREE from 'three';
import { clamp, damp, mulberry32, terrainHeight } from './utils.js';

const TAU = Math.PI * 2;
const bodyGeometry = new THREE.BoxGeometry(0.62, 0.82, 0.36);
const headGeometry = new THREE.BoxGeometry(0.43, 0.44, 0.42);
const armGeometry = new THREE.BoxGeometry(0.17, 0.72, 0.2);
const legGeometry = new THREE.BoxGeometry(0.22, 0.78, 0.24);
const eyeGeometry = new THREE.BoxGeometry(0.075, 0.055, 0.04);
const shadowGeometry = new THREE.CircleGeometry(0.62, 12);
const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false });

function angleDelta(from, to) {
  return ((to - from + Math.PI * 3) % TAU) - Math.PI;
}

export class ZombieManager {
  constructor(scene, world, audio, ui, quality, particles) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.ui = ui;
    this.particles = particles;
    this.quality = quality;
    this.pool = [];
    this.active = [];
    this.hitMeshes = [];
    this.kills = 0;
    this.spawnTimer = 2;
    this.groanTimer = 5;
    this.random = mulberry32(0xdead77);
    this.onKill = null;
    this.max = quality.maxZombies + 2;
    this.buildPool();
  }

  buildPool() {
    for (let i = 0; i < this.max; i += 1) {
      const zombie = this.createZombie(i);
      this.pool.push(zombie);
      this.scene.add(zombie.group);
    }
  }

  createZombie(index) {
    const random = this.random;
    const group = new THREE.Group();
    group.visible = false;

    const skinTone = new THREE.Color().setHSL(0.23 + random() * 0.06, 0.16 + random() * 0.2, 0.34 + random() * 0.16);
    const shirtTone = new THREE.Color().setHSL(random() * 0.12 + 0.02, 0.18 + random() * 0.24, 0.16 + random() * 0.15);
    const pantsTone = new THREE.Color().setHSL(0.08 + random() * 0.06, 0.12 + random() * 0.18, 0.13 + random() * 0.1);
    const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 1, flatShading: true });
    const shirt = new THREE.MeshStandardMaterial({ color: shirtTone, roughness: 1, flatShading: true });
    const pants = new THREE.MeshStandardMaterial({ color: pantsTone, roughness: 1, flatShading: true });
    const eye = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff5b1e, emissiveIntensity: 2.2, roughness: 0.5 });
    const materials = [skin, shirt, pants, eye];

    const body = new THREE.Mesh(bodyGeometry, shirt);
    body.position.y = 1.18;
    body.rotation.z = (random() - 0.5) * 0.05;
    group.add(body);

    const head = new THREE.Mesh(headGeometry, skin);
    head.position.set((random() - 0.5) * 0.08, 1.79, 0.03);
    head.rotation.z = (random() - 0.5) * 0.14;
    group.add(head);

    const eyeLeft = new THREE.Mesh(eyeGeometry, eye);
    eyeLeft.position.set(-0.105, 1.83, 0.225);
    group.add(eyeLeft);
    const eyeRight = new THREE.Mesh(eyeGeometry, eye);
    eyeRight.position.set(0.105, 1.83, 0.225);
    group.add(eyeRight);

    const makeArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.4, 1.5, 0);
      const arm = new THREE.Mesh(armGeometry, skin);
      arm.position.y = -0.32;
      arm.rotation.z = side * 0.1;
      pivot.add(arm);
      group.add(pivot);
      return pivot;
    };
    const armLeft = makeArm(-1);
    const armRight = makeArm(1);

    const makeLeg = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.17, 0.78, 0);
      const leg = new THREE.Mesh(legGeometry, pants);
      leg.position.y = -0.4;
      pivot.add(leg);
      group.add(pivot);
      return pivot;
    };
    const legLeft = makeLeg(-1);
    const legRight = makeLeg(1);

    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    group.add(shadow);

    const zombie = {
      id: index,
      group,
      body,
      head,
      armLeft,
      armRight,
      legLeft,
      legRight,
      materials,
      state: 'idle',
      alive: false,
      dead: false,
      health: 100,
      maxHealth: 100,
      speed: 1.5,
      attackCooldown: 0,
      attackAnim: 0,
      hitFlash: 0,
      deathTimer: 0,
      rise: 0,
      walkPhase: random() * TAU,
      aggro: false,
      groundY: 0,
      knockback: new THREE.Vector3()
    };

    group.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.zombie = zombie;
      object.userData.part = object === head ? 'head' : object === body ? 'body' : 'limb';
      this.hitMeshes.push(object);
    });
    return zombie;
  }

  spawn(x, z, options = {}) {
    let zombie = this.pool.find((candidate) => !candidate.alive);
    if (!zombie) return null;
    const random = this.random;
    const day = options.day || 1;
    zombie.alive = true;
    zombie.dead = false;
    zombie.state = 'wander';
    zombie.maxHealth = options.health || (72 + day * 12) * (options.night ? 1.1 : 1);
    zombie.health = zombie.maxHealth;
    zombie.speed = (1.25 + random() * 0.62) * (options.night ? 1.08 : 0.8);
    zombie.attackCooldown = 1.2 + random();
    zombie.attackAnim = 0;
    zombie.hitFlash = 0;
    zombie.deathTimer = 0;
    zombie.rise = 0.85;
    zombie.aggro = Boolean(options.aggro);
    zombie.walkPhase = random() * TAU;
    zombie.group.visible = true;
    zombie.group.rotation.set(0, random() * TAU, 0);
    zombie.group.scale.setScalar(0.92 + random() * 0.16);
    zombie.group.position.set(x, terrainHeight(x, z) - 1.5, z);
    zombie.groundY = terrainHeight(x, z);
    zombie.materials.forEach((material) => {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
      if (material === zombie.materials[3]) material.emissive.setHex(0xff5b1e);
    });
    zombie.armLeft.rotation.set(0, 0, 0);
    zombie.armRight.rotation.set(0, 0, 0);
    zombie.legLeft.rotation.set(0, 0, 0);
    zombie.legRight.rotation.set(0, 0, 0);
    this.active.push(zombie);
    this.particles.spawn(new THREE.Vector3(x, zombie.groundY + 0.2, z), 0x6f5d42, {
      count: 8,
      speed: 1.4,
      size: 0.16,
      life: 0.8,
      gravity: -1.4,
      upward: 0.2
    });
    return zombie;
  }

  spawnAtEdge(playerPosition, day, night, horde = false) {
    const random = this.random;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const angle = random() * TAU;
      const radius = 23 + random() * (night ? 18 : 12);
      const x = playerPosition.x + Math.cos(angle) * radius;
      const z = playerPosition.z + Math.sin(angle) * radius;
      if (Math.abs(x) > 56 || Math.abs(z) > 56) continue;
      if (Math.hypot(x, z) < 8) continue;
      if (this.world.isBlocked(x, z, 0.6)) continue;
      return this.spawn(x, z, { day, night, aggro: night || horde });
    }
    return null;
  }

  update(dt, player, nightFactor, day, horde) {
    this.spawnTimer -= dt;
    const target = nightFactor > 0.12
      ? Math.round(this.quality.maxZombies * (0.55 + nightFactor * 0.45) + (horde ? 1 : 0))
      : (day % 2 === 0 ? 1 : 2);
    if (this.active.length < target && this.spawnTimer <= 0) {
      this.spawnAtEdge(player.position, day, nightFactor > 0.12, horde);
      this.spawnTimer = nightFactor > 0.12 ? 1.8 + Math.random() * 2.4 : 5 + Math.random() * 5;
    }

    this.groanTimer -= dt;
    if (this.groanTimer <= 0 && this.active.length) {
      this.groanTimer = 4 + Math.random() * 9;
      const close = this.active.some((z) => !z.dead && z.group.position.distanceTo(player.position) < 26);
      if (close) this.audio?.zombie();
    }

    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const zombie = this.active[i];
      if (!zombie.alive) {
        this.active.splice(i, 1);
        continue;
      }
      this.updateZombie(zombie, dt, player, nightFactor);
      if (!zombie.alive) this.active.splice(i, 1);
    }
  }

  updateZombie(zombie, dt, player, nightFactor) {
    const group = zombie.group;
    zombie.attackCooldown -= dt;
    zombie.attackAnim = Math.max(0, zombie.attackAnim - dt * 2.4);
    zombie.hitFlash = Math.max(0, zombie.hitFlash - dt);

    if (zombie.dead) {
      zombie.deathTimer -= dt;
      zombie.group.rotation.z = damp(zombie.group.rotation.z, Math.PI / 2, 4.5, dt);
      zombie.group.position.y = damp(zombie.group.position.y, zombie.groundY - 0.22, 3.5, dt);
      const opacity = clamp(zombie.deathTimer / 1.8, 0, 1);
      zombie.materials.forEach((material) => {
        material.transparent = true;
        material.opacity = opacity;
      });
      if (zombie.deathTimer <= 0) {
        zombie.alive = false;
        zombie.group.visible = false;
        zombie.materials.forEach((material) => {
          material.opacity = 1;
          material.transparent = false;
        });
      }
      return;
    }

    if (zombie.rise > 0) {
      zombie.rise = Math.max(0, zombie.rise - dt * 1.9);
      group.position.y = zombie.groundY - zombie.rise * 1.65;
    } else {
      group.position.y = zombie.groundY;
    }

    if (zombie.hitFlash > 0) {
      zombie.materials.slice(0, 3).forEach((material) => {
        material.emissive.setHex(0x7a0d08);
        material.emissiveIntensity = 0.8;
      });
    } else {
      zombie.materials.slice(0, 3).forEach((material) => {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      });
    }

    const dx = player.position.x - group.position.x;
    const dz = player.position.z - group.position.z;
    const distance = Math.hypot(dx, dz);
    const playerAlive = player.alive !== false;
    const aggro = playerAlive && (zombie.aggro || nightFactor > 0.18 || distance < 6.5);
    let targetYaw = group.rotation.y;

    if (aggro && distance > 0.001) {
      targetYaw = Math.atan2(dx, dz);
      const blocked = this.world.lineBlocked?.(group.position.x, group.position.z, player.position.x, player.position.z) ?? false;
      if (distance > 1.55 && !blocked) {
        const speed = zombie.speed * (nightFactor > 0.18 ? 1 : 0.82);
        let moveX = (dx / distance) * speed * dt;
        let moveZ = (dz / distance) * speed * dt;
        for (const other of this.active) {
          if (other === zombie || other.dead) continue;
          const ox = group.position.x - other.group.position.x;
          const oz = group.position.z - other.group.position.z;
          const otherDistance = Math.hypot(ox, oz);
          if (otherDistance > 0.001 && otherDistance < 1.05) {
            moveX += (ox / otherDistance) * dt * 0.7;
            moveZ += (oz / otherDistance) * dt * 0.7;
          }
        }
        const nextX = group.position.x + moveX;
        const nextZ = group.position.z + moveZ;
        if (!this.world.isBlocked(nextX, group.position.z, 0.34)) group.position.x = nextX;
        if (!this.world.isBlocked(group.position.x, nextZ, 0.34)) group.position.z = nextZ;
        zombie.groundY = terrainHeight(group.position.x, group.position.z);
        if (zombie.rise <= 0) group.position.y = zombie.groundY;
        zombie.state = 'chase';
      } else if (distance <= 1.7 && !blocked && zombie.attackCooldown <= 0 && playerAlive) {
        zombie.attackCooldown = 1.15 + Math.random() * 0.35;
        zombie.attackAnim = 1;
        player.damage(7 + nightFactor * 5, zombie);
        this.audio?.hurt();
      }

      const barricade = this.world.nearestBarricade(group.position.x, group.position.z, 2.05);
      if (barricade && distance > 1.8 && zombie.attackCooldown <= 0) {
        zombie.attackCooldown = 0.9 + Math.random() * 0.5;
        zombie.attackAnim = 1;
        this.world.damageBarricade(barricade, 11);
        this.audio?.chop();
      }
    } else {
      zombie.state = 'wander';
      zombie.walkPhase += dt * 0.6;
      targetYaw += Math.sin(zombie.walkPhase * 0.24) * dt * 0.32;
    }

    const delta = angleDelta(group.rotation.y, targetYaw);
    group.rotation.y += delta * Math.min(1, dt * 3.2);

    const moving = aggro && distance > 1.55;
    if (moving) zombie.walkPhase += dt * zombie.speed * 4.2;
    const swing = Math.sin(zombie.walkPhase) * (moving ? 0.62 : 0.08);
    const attackPose = zombie.attackAnim > 0 ? Math.sin(zombie.attackAnim * Math.PI) : 0;
    zombie.legLeft.rotation.x = swing;
    zombie.legRight.rotation.x = -swing;
    zombie.armLeft.rotation.x = -swing * 0.8 - attackPose * 1.4;
    zombie.armRight.rotation.x = swing * 0.8 - attackPose * 1.4;
    zombie.body.rotation.z = Math.sin(zombie.walkPhase * 0.5) * 0.035;
    zombie.head.rotation.y = Math.sin(zombie.walkPhase * 0.31) * 0.12;
    zombie.group.position.y += Math.sin(zombie.walkPhase * 2) * (moving ? 0.012 : 0.004);
  }

  damage(zombie, amount, headshot, point) {
    if (!zombie || !zombie.alive || zombie.dead) return { killed: false };
    zombie.health -= amount;
    zombie.hitFlash = 0.12;
    zombie.aggro = true;
    const bloodPosition = point ? point.clone() : zombie.group.position.clone().setY(zombie.group.position.y + 1.25);
    this.particles.spawn(bloodPosition, 0x8e1514, {
      count: headshot ? 22 : 14,
      speed: 3.6,
      size: 0.1,
      life: 0.8,
      gravity: -10
    });
    if (this.ui) {
      this.ui.floatText(bloodPosition, String(Math.round(amount)), headshot ? 'crit' : 'damage');
    }
    if (zombie.health <= 0) {
      zombie.dead = true;
      zombie.deathTimer = 3.4;
      zombie.attackAnim = 0;
      this.kills += 1;
      this.particles.spawn(bloodPosition, 0x6f0b0c, {
        count: 24,
        speed: 4.4,
        size: 0.13,
        life: 1.1,
        gravity: -11
      });
      this.audio?.hit();
      this.onKill?.(zombie, { headshot });
      this.ui?.addKillFeed(headshot ? 'HEADSHOT — WALKER DOWN' : 'WALKER DOWN');
      return { killed: true };
    }
    this.audio?.hit();
    return { killed: false };
  }

  reset() {
    this.active.forEach((zombie) => {
      zombie.alive = false;
      zombie.dead = false;
      zombie.group.visible = false;
    });
    this.active.length = 0;
    this.kills = 0;
    this.spawnTimer = 1.5;
    this.groanTimer = 4;
    this.pool.forEach((zombie) => {
      zombie.materials.forEach((material) => {
        material.opacity = 1;
        material.transparent = false;
      });
      zombie.group.rotation.set(0, 0, 0);
    });
  }

  getActiveCount() {
    return this.active.filter((zombie) => zombie.alive && !zombie.dead).length;
  }
}
