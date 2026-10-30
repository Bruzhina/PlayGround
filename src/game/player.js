import * as THREE from 'three';
import { clamp, damp, smoothstep, terrainHeight } from './utils.js';

const TAU = Math.PI * 2;

export class Player {
  constructor(camera, world, audio, ui) {
    this.camera = camera;
    this.world = world;
    this.audio = audio;
    this.ui = ui;
    this.position = new THREE.Vector3(0, 0, 14.5);
    this.yaw = 0;
    this.pitch = -0.015;
    this.health = 100;
    this.maxHealth = 100;
    this.hunger = 100;
    this.stamina = 100;
    this.magazine = 12;
    this.reserve = 24;
    this.maxMagazine = 12;
    this.wood = 0;
    this.stone = 0;
    this.scrap = 0;
    this.food = 2;
    this.totalWood = 0;
    this.alive = true;
    this.grounded = true;
    this.verticalVelocity = 0;
    this.radius = 0.34;
    this.eyeHeight = 1.62;
    this.walkPhase = 0;
    this.bobAmount = 0;
    this.stepTimer = 0;
    this.invulnerable = 0;
    this.sinceDamage = 30;
    this.trauma = 0;
    this.onDeath = null;
    this.onToast = null;
    this.moveSpeed = 0;
    this.sprinting = false;
    this.reset();
  }

  reset() {
    const x = 0;
    const z = 14.5;
    this.position.set(x, terrainHeight(x, z), z);
    this.yaw = 0;
    this.pitch = -0.015;
    this.health = 100;
    this.hunger = 100;
    this.stamina = 100;
    this.magazine = 12;
    this.reserve = 24;
    this.wood = 0;
    this.stone = 0;
    this.scrap = 0;
    this.food = 2;
    this.totalWood = 0;
    this.alive = true;
    this.grounded = true;
    this.verticalVelocity = 0;
    this.walkPhase = 0;
    this.bobAmount = 0;
    this.stepTimer = 0;
    this.invulnerable = 0;
    this.sinceDamage = 30;
    this.trauma = 0;
    this.moveSpeed = 0;
    this.updateCamera(0, 0);
  }

  getForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  getEyePosition() {
    return new THREE.Vector3(this.position.x, this.position.y + this.eyeHeight, this.position.z);
  }

  update(dt, input, nightFactor, playing) {
    if (!this.alive) return;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.sinceDamage += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);

    const look = input.consumeLook();
    const tilt = input.consumeTilt(dt);
    this.yaw -= look.x + tilt.x;
    this.pitch = clamp(this.pitch - look.y - tilt.y, -1.35, 1.35);

    const movement = input.getMovement();
    const magnitude = Math.min(1, Math.hypot(movement.x, movement.y));
    const wantsSprint = (input.sprint || (input.isTouch && magnitude > 0.94)) && this.stamina > 0.5 && magnitude > 0.2;
    this.sprinting = wantsSprint && this.grounded;
    const baseSpeed = this.sprinting ? 6.1 : 3.9;
    const targetSpeed = baseSpeed * magnitude;
    this.moveSpeed = damp(this.moveSpeed, targetSpeed, 10, dt);

    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 12.5);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 17);
    }

    if (magnitude > 0.08) {
      const forward = this.getForward();
      const right = this.getRight();
      const dirX = right.x * movement.x + forward.x * movement.y;
      const dirZ = right.z * movement.x + forward.z * movement.y;
      const length = Math.hypot(dirX, dirZ) || 1;
      const stepX = (dirX / length) * this.moveSpeed * dt;
      const stepZ = (dirZ / length) * this.moveSpeed * dt;
      this.tryMove(stepX, 0);
      this.tryMove(0, stepZ);
      this.walkPhase += dt * (this.sprinting ? 11 : 8) * Math.min(1, magnitude);
      this.bobAmount = damp(this.bobAmount, this.sprinting ? 1 : 0.55, 8, dt);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sprinting ? 0.28 : 0.42;
        this.audio?.step();
      }
    } else {
      this.bobAmount = damp(this.bobAmount, 0, 7, dt);
      this.stepTimer = Math.min(this.stepTimer, 0.08);
    }

    const ground = terrainHeight(this.position.x, this.position.z);
    if (!this.grounded) {
      this.verticalVelocity -= 14.5 * dt;
      this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= ground) {
        this.position.y = ground;
        this.verticalVelocity = 0;
        this.grounded = true;
        this.trauma = Math.max(this.trauma, 0.12);
      }
    } else {
      this.position.y = ground;
    }

    this.hunger = Math.max(0, this.hunger - dt * (this.sprinting ? 0.075 : 0.045));
    if (this.hunger <= 0) this.damage(1.25 * dt, null, true);
    if (this.hunger < 28 && this.food > 0) this.eat(true);

    if (this.sinceDamage > 12 && this.hunger > 35) {
      this.health = Math.min(this.maxHealth, this.health + dt * 1.1);
    }

    this.updateCamera(dt, nightFactor);
  }

  tryMove(dx, dz) {
    const nextX = clamp(this.position.x + dx, -56, 56);
    const nextZ = clamp(this.position.z + dz, -56, 56);
    if (!this.world.isBlocked(nextX, this.position.z, this.radius)) this.position.x = nextX;
    if (!this.world.isBlocked(this.position.x, nextZ, this.radius)) this.position.z = nextZ;
  }

  updateCamera(dt, nightFactor) {
    const speedBob = this.bobAmount;
    const bobY = Math.sin(this.walkPhase * 2) * 0.028 * speedBob;
    const bobX = Math.cos(this.walkPhase) * 0.022 * speedBob;
    const shake = this.trauma * this.trauma;
    const shakeX = (Math.random() - 0.5) * shake * 0.08;
    const shakeY = (Math.random() - 0.5) * shake * 0.08;
    const roll = Math.cos(this.walkPhase) * 0.007 * speedBob + (Math.random() - 0.5) * shake * 0.03;
    this.camera.position.set(
      this.position.x + bobX * 0.3 + shakeX,
      this.position.y + this.eyeHeight + bobY + shakeY,
      this.position.z
    );
    this.camera.rotation.set(this.pitch + (Math.random() - 0.5) * shake * 0.035, this.yaw, roll);
  }

  jump() {
    if (!this.alive || !this.grounded || this.stamina < 8) return;
    this.grounded = false;
    this.verticalVelocity = 5.1;
    this.stamina = Math.max(0, this.stamina - 8);
    this.audio?.step();
  }

  damage(amount, source = null, ignoreInvulnerability = false) {
    if (!this.alive) return;
    if (!ignoreInvulnerability && this.invulnerable > 0) return;
    this.health = Math.max(0, this.health - amount);
    if (!ignoreInvulnerability) this.invulnerable = 0.55;
    this.sinceDamage = 0;
    this.trauma = Math.min(1, this.trauma + (ignoreInvulnerability ? 0.08 : 0.42));
    if (!ignoreInvulnerability) {
      this.audio?.hurt();
      this.ui?.flashDamage();
      this.ui?.toast(source ? 'A WALKER HIT YOU' : 'YOU ARE STARVING', 'warning');
    }
    if (this.health <= 0) {
      this.alive = false;
      this.onDeath?.();
    }
  }

  kick(amount) {
    this.pitch = clamp(this.pitch + amount, -1.35, 1.35);
  }

  eat(silent = false) {
    if (this.food <= 0 || this.hunger >= 98) {
      if (!silent) this.ui?.toast('NO FOOD LEFT', 'warning');
      return false;
    }
    this.food -= 1;
    this.hunger = Math.min(100, this.hunger + 44);
    this.health = Math.min(this.maxHealth, this.health + 5);
    this.audio?.pickup();
    if (!silent) this.ui?.toast('RATION EATEN  +44 HUNGER', 'good');
    return true;
  }

  addAmmo(amount) {
    this.reserve += amount;
    this.audio?.pickup();
  }

  addResource(type, amount, silent = false) {
    if (type === 'wood') {
      this.wood += amount;
      this.totalWood += amount;
    } else if (type === 'stone') {
      this.stone += amount;
    } else if (type === 'scrap') {
      this.scrap += amount;
    } else if (type === 'food') {
      this.food += amount;
    }
    if (!silent) this.ui?.toast(`+${amount} ${type.toUpperCase()}`, 'good');
  }

  canBuild() {
    return this.wood >= 4;
  }

  spendBuild() {
    if (this.wood < 4) {
      this.ui?.toast('NEED 4 WOOD TO BUILD', 'warning');
      return false;
    }
    this.wood -= 4;
    return true;
  }

  reload() {
    if (this.magazine >= this.maxMagazine) return false;
    if (this.reserve <= 0) {
      this.ui?.toast('NO RESERVE AMMO', 'warning');
      return false;
    }
    return true;
  }

  finishReload() {
    const needed = this.maxMagazine - this.magazine;
    const loaded = Math.min(needed, this.reserve);
    this.magazine += loaded;
    this.reserve -= loaded;
    return loaded;
  }

  getTotalAmmo() {
    return this.magazine + this.reserve;
  }
}
