import * as THREE from 'three';

function flashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,230,1)');
  gradient.addColorStop(0.3, 'rgba(255,196,110,0.85)');
  gradient.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class EnemyManager {
  constructor(scene, effects, audio, callbacks = {}) {
    this.scene = scene;
    this.effects = effects;
    this.audio = audio;
    this.onKill = callbacks.onKill || (() => {});
    this.onPlayerHit = callbacks.onPlayerHit || (() => {});
    this.enemies = [];
    this.flashMap = flashTexture();
    this.temp = new THREE.Vector3();
    this.tempTarget = new THREE.Vector3();

    this.uniformMaterial = new THREE.MeshStandardMaterial({ color: 0x5b6150, roughness: 0.92 });
    this.pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4f42, roughness: 0.95 });
    this.helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4234, roughness: 0.7, metalness: 0.15 });
    this.skinMaterial = new THREE.MeshStandardMaterial({ color: 0xb08a68, roughness: 0.85 });
    this.leatherMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2922, roughness: 0.9 });
    this.woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.85 });
    this.metalMaterial = new THREE.MeshStandardMaterial({ color: 0x33352f, roughness: 0.55, metalness: 0.55 });
    this.hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

    this.geometry = {
      torso: new THREE.BoxGeometry(0.52, 0.68, 0.3),
      hips: new THREE.BoxGeometry(0.44, 0.22, 0.28),
      head: new THREE.SphereGeometry(0.15, 10, 8),
      helmet: new THREE.SphereGeometry(0.2, 12, 8),
      leg: new THREE.BoxGeometry(0.17, 0.76, 0.19),
      boot: new THREE.BoxGeometry(0.19, 0.16, 0.28),
      arm: new THREE.BoxGeometry(0.14, 0.58, 0.15),
      pack: new THREE.BoxGeometry(0.36, 0.42, 0.18),
      rifle: new THREE.BoxGeometry(0.055, 0.075, 0.92),
      rifleStock: new THREE.BoxGeometry(0.08, 0.11, 0.26),
      bodyHit: new THREE.BoxGeometry(0.82, 1.45, 0.62),
      headHit: new THREE.SphereGeometry(0.25, 8, 6)
    };
  }

  spawn(wave = 1, point = null) {
    const spawn = point || { x: -32 + Math.random() * 64, z: -9 - Math.random() * 18 };
    const enemy = new Enemy(this, spawn.x, spawn.z, wave);
    this.scene.add(enemy.group);
    this.enemies.push(enemy);
    const water = spawn.z < -8;
    this.effects.burst(new THREE.Vector3(spawn.x, water ? 0.0 : 0.15, spawn.z), {
      count: water ? 10 : 6,
      color: water ? 0xc9dedd : 0xb9a377,
      speed: water ? 2.3 : 1.4,
      size: water ? 0.16 : 0.18,
      life: water ? 0.55 : 0.7,
      gravity: water ? 5 : 1.2
    });
    return enemy;
  }

  update(dt, playerPos, elapsed) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, playerPos, elapsed);
      if (enemy.removed) {
        this.enemies.splice(i, 1);
        this.scene.remove(enemy.group);
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead) continue;
        const dx = b.group.position.x - a.group.position.x;
        const dz = b.group.position.z - a.group.position.z;
        const distSq = dx * dx + dz * dz;
        if (distSq > 0.0001 && distSq < 1.44) {
          const dist = Math.sqrt(distSq);
          const push = (1.2 - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          a.group.position.x -= nx * push;
          a.group.position.z -= nz * push;
          b.group.position.x += nx * push;
          b.group.position.z += nz * push;
        }
      }
    }
  }

  get aliveCount() {
    let count = 0;
    for (const enemy of this.enemies) if (!enemy.dead) count++;
    return count;
  }

  getHitboxes() {
    const list = [];
    for (const enemy of this.enemies) {
      if (!enemy.dead) list.push(...enemy.hitboxes);
    }
    return list;
  }

  clear() {
    for (const enemy of this.enemies) this.scene.remove(enemy.group);
    this.enemies.length = 0;
  }
}

class Enemy {
  constructor(manager, x, z, wave) {
    this.manager = manager;
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.health = 2;
    this.dead = false;
    this.removed = false;
    this.deathTime = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 1.15 + Math.random() * 0.6 + wave * 0.045;
    this.fireTimer = 1.2 + Math.random() * 2.2;
    this.flinch = 0;
    this.flashTimer = 0;
    this.wave = wave;
    this.hitboxes = [];
    this.build();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = 0;
    this.group.updateMatrixWorld(true);
  }

  build() {
    const g = this.manager.geometry;
    const body = this.body;

    const hips = new THREE.Mesh(g.hips, this.manager.pantsMaterial);
    hips.position.y = 0.86;
    hips.castShadow = true;
    body.add(hips);

    const torso = new THREE.Mesh(g.torso, this.manager.uniformMaterial);
    torso.position.y = 1.22;
    torso.castShadow = true;
    body.add(torso);

    const pack = new THREE.Mesh(g.pack, this.manager.leatherMaterial);
    pack.position.set(0, 1.26, -0.23);
    body.add(pack);

    const head = new THREE.Mesh(g.head, this.manager.skinMaterial);
    head.position.y = 1.72;
    head.castShadow = true;
    body.add(head);

    const helmet = new THREE.Mesh(g.helmet, this.manager.helmetMaterial);
    helmet.position.set(0, 1.79, 0);
    helmet.scale.set(1.08, 0.66, 1.16);
    helmet.castShadow = true;
    body.add(helmet);

    this.legs = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.14, 0.82, 0);
      const leg = new THREE.Mesh(g.leg, this.manager.pantsMaterial);
      leg.position.y = -0.38;
      leg.castShadow = true;
      pivot.add(leg);
      const boot = new THREE.Mesh(g.boot, this.manager.leatherMaterial);
      boot.position.set(0, -0.79, 0.05);
      pivot.add(boot);
      body.add(pivot);
      this.legs.push(pivot);
    }

    this.arms = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.31, 1.47, 0);
      pivot.rotation.x = -0.65;
      pivot.rotation.z = side * -0.12;
      const arm = new THREE.Mesh(g.arm, this.manager.uniformMaterial);
      arm.position.y = -0.29;
      pivot.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), this.manager.skinMaterial);
      hand.position.set(0, -0.61, 0.02);
      pivot.add(hand);
      body.add(pivot);
      this.arms.push(pivot);
    }

    const rifle = new THREE.Mesh(g.rifle, this.manager.metalMaterial);
    rifle.position.set(0.1, 1.31, 0.34);
    rifle.rotation.x = 0.02;
    body.add(rifle);
    const stock = new THREE.Mesh(g.rifleStock, this.manager.woodMaterial);
    stock.position.set(0.1, 1.29, -0.13);
    body.add(stock);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.05), this.manager.metalMaterial);
    sight.position.set(0.1, 1.37, 0.3);
    body.add(sight);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0.1, 1.32, 0.84);
    body.add(this.muzzle);

    const flashMaterial = new THREE.SpriteMaterial({
      map: this.manager.flashMap,
      color: 0xffd08a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flash = new THREE.Sprite(flashMaterial);
    this.flash.position.copy(this.muzzle.position);
    this.flash.scale.setScalar(1.1);
    this.flash.visible = false;
    body.add(this.flash);

    const bodyHit = new THREE.Mesh(g.bodyHit, this.manager.hitMaterial);
    bodyHit.position.y = 1.05;
    bodyHit.userData.enemy = this;
    bodyHit.userData.head = false;
    body.add(bodyHit);
    this.hitboxes.push(bodyHit);

    const headHit = new THREE.Mesh(g.headHit, this.manager.hitMaterial);
    headHit.position.y = 1.72;
    headHit.userData.enemy = this;
    headHit.userData.head = true;
    body.add(headHit);
    this.hitboxes.push(headHit);
  }

  update(dt, playerPos, elapsed) {
    if (this.dead) {
      this.deathTime += dt;
      const fall = Math.min(1, this.deathTime * 3.2);
      this.body.rotation.x = -fall * 1.45;
      this.body.position.y = -Math.max(0, this.deathTime - 1.4) * 0.55;
      if (this.deathTime > 3.6) this.removed = true;
      return;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.visible = false;
    }

    const groundY = this.group.position.z < -8 ? -0.62 : 0;
    this.group.position.y += (groundY - this.group.position.y) * Math.min(1, dt * 3);

    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    const targetZ = playerPos.z - 13;
    const atLine = this.group.position.z >= targetZ;

    if (!atLine) {
      this.phase += dt * this.speed * 4.6;
      const dirX = dx;
      const dirZ = Math.max(0.4, dz);
      const length = Math.hypot(dirX, dirZ) || 1;
      const nx = dirX / length;
      const nz = dirZ / length;
      this.group.position.x += nx * this.speed * dt;
      this.group.position.z += nz * this.speed * dt;
      const targetRotation = Math.atan2(nx, nz);
      this.group.rotation.y += (targetRotation - this.group.rotation.y) * Math.min(1, dt * 6);
      const swing = Math.sin(this.phase) * 0.62;
      this.legs[0].rotation.x = swing;
      this.legs[1].rotation.x = -swing;
      this.arms[0].rotation.x = -0.65 - swing * 0.18;
      this.arms[1].rotation.x = -0.65 + swing * 0.18;
      this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.035;
    } else {
      this.legs[0].rotation.x *= 0.9;
      this.legs[1].rotation.x *= 0.9;
      this.arms[0].rotation.x += (-0.55 - this.arms[0].rotation.x) * Math.min(1, dt * 5);
      this.arms[1].rotation.x += (-0.55 - this.arms[1].rotation.x) * Math.min(1, dt * 5);
      this.body.position.y *= 0.9;
      const targetRotation = Math.atan2(dx, dz);
      this.group.rotation.y += (targetRotation - this.group.rotation.y) * Math.min(1, dt * 4);
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && distance < 72 && this.group.position.z > playerPos.z - 70) {
      this.shoot(playerPos, distance);
      const base = atLine ? Math.max(0.8, 1.95 - this.wave * 0.05) : 2.6;
      this.fireTimer = base + Math.random() * 1.6;
    }

    if (this.flinch > 0) {
      this.flinch = Math.max(0, this.flinch - dt * 3);
      this.body.rotation.x = -this.flinch * 0.7;
    } else if (!this.dead) {
      this.body.rotation.x *= 0.86;
    }
  }

  shoot(playerPos, distance) {
    this.group.updateMatrixWorld(true);
    this.muzzle.getWorldPosition(this.manager.temp);
    this.flash.visible = true;
    this.flash.material.opacity = 0.9;
    this.flash.scale.setScalar(0.8 + Math.random() * 0.7);
    this.flashTimer = 0.055;
    const accuracy = Math.max(0.16, Math.min(0.72, 0.52 - distance * 0.004 + this.wave * 0.012));
    const hit = Math.random() < accuracy;
    const spread = hit ? 0.5 : 2.4 + distance * 0.03;
    this.manager.tempTarget.set(
      playerPos.x + (Math.random() - 0.5) * spread,
      playerPos.y - 0.35 + (Math.random() - 0.5) * spread * 0.6,
      playerPos.z + (Math.random() - 0.5) * spread * 0.4
    );
    this.manager.effects.tracer(this.manager.temp, this.manager.tempTarget, 0xffbe6a, 0.85);
    this.manager.effects.burst(this.manager.temp, {
      count: 2,
      color: 0xffc070,
      speed: 1.6,
      size: 0.12,
      life: 0.14,
      gravity: 0
    });
    this.manager.audio.enemyShot(Math.max(0.12, 1 - distance / 80));
    if (hit) {
      this.manager.onPlayerHit(5 + Math.random() * 5, this);
    }
  }

  hit(point, head) {
    if (this.dead) return;
    this.health -= head ? 2 : 1;
    this.flinch = 0.55;
    this.manager.effects.burst(point, {
      count: head ? 10 : 6,
      color: 0x6d1410,
      colorJitter: 0.14,
      speed: 2.2,
      size: 0.16,
      life: 0.55,
      gravity: 6,
      spread: 0.12
    });
    this.manager.effects.burst(point, {
      count: 3,
      color: 0x2a1a12,
      speed: 1.1,
      size: 0.28,
      life: 0.7,
      gravity: 0.4,
      growth: 1.4
    });
    if (this.health <= 0) this.die(point, head);
    return this.health <= 0;
  }

  die(point, head) {
    this.dead = true;
    this.deathTime = 0;
    this.flash.visible = false;
    this.manager.effects.burst(point, {
      count: 14,
      color: 0x5d100c,
      colorJitter: 0.16,
      speed: 2.8,
      size: 0.2,
      life: 0.8,
      gravity: 7,
      spread: 0.18
    });
    this.manager.onKill(this, head);
  }
}
