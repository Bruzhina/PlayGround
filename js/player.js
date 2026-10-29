import * as THREE from 'three';

const HIP_POSITION = new THREE.Vector3(0.3, -0.265, -0.56);
const ADS_POSITION = new THREE.Vector3(0, -0.1, -0.42);

export class Player {
  constructor({ camera, scene, effects, audio, input, world, callbacks = {} }) {
    this.camera = camera;
    this.scene = scene;
    this.effects = effects;
    this.audio = audio;
    this.input = input;
    this.world = world;
    this.enemies = null;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 320;
    this.tempOrigin = new THREE.Vector3();
    this.tempDir = new THREE.Vector3();
    this.tempEnd = new THREE.Vector3();
    this.tempMuzzle = new THREE.Vector3();
    this.tempRight = new THREE.Vector3();
    this.cameraPos = new THREE.Vector3();
    this.magSize = 8;
    this.fireInterval = 0.235;
    this.reloadDuration = 1.7;
    this.buildWeapon();
    this.reset();
  }

  buildWeapon() {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.76 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x2c302d, roughness: 0.42, metalness: 0.7 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x191c19, roughness: 0.35, metalness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb58a66, roughness: 0.8 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x4d563f, roughness: 0.96 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.088, 0.36), metal);
    receiver.position.set(0, 0, 0.02);
    group.add(receiver);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.115, 0.34), wood);
    stock.position.set(0, -0.014, 0.31);
    stock.rotation.x = -0.04;
    group.add(stock);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.4), wood);
    handguard.position.set(0, -0.004, -0.28);
    group.add(handguard);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.52, 10), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.018, -0.55);
    group.add(barrel);

    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.36, 8), metal);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.048, -0.36);
    group.add(gasTube);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.052, 0.02), darkMetal);
    frontSight.position.set(0, 0.058, -0.74);
    group.add(frontSight);

    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.03, 0.018), darkMetal);
    rearSight.position.set(0, 0.058, 0.08);
    group.add(rearSight);

    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 5, 10, Math.PI), darkMetal);
    triggerGuard.position.set(0, -0.07, 0.1);
    triggerGuard.rotation.x = Math.PI / 2;
    group.add(triggerGuard);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.16), skin);
    leftHand.position.set(-0.025, -0.06, -0.22);
    leftHand.rotation.set(0.1, 0.1, -0.15);
    group.add(leftHand);

    const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.26), sleeve);
    leftSleeve.position.set(-0.07, -0.13, -0.02);
    leftSleeve.rotation.set(0.2, 0.2, -0.2);
    group.add(leftSleeve);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.11, 0.17), skin);
    rightHand.position.set(0.022, -0.065, 0.16);
    rightHand.rotation.set(0.08, -0.1, 0.12);
    group.add(rightHand);

    const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.28), sleeve);
    rightSleeve.position.set(0.085, -0.14, 0.36);
    rightSleeve.rotation.set(0.2, -0.15, 0.16);
    group.add(rightSleeve);

    const sling = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: 0x3d3527, roughness: 1 }));
    sling.position.set(0.05, -0.04, -0.1);
    sling.rotation.z = 0.25;
    group.add(sling);

    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 6), darkMetal);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.06, 0.02, 0.04);
    group.add(bolt);
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), metal);
    boltKnob.position.set(0.125, 0.02, 0.04);
    group.add(boltKnob);

    const aperture = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.004, 4, 10), darkMetal);
    aperture.position.set(0, 0.072, 0.06);
    aperture.rotation.x = Math.PI / 2;
    group.add(aperture);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.018, -0.83);
    group.add(this.muzzle);

    this.eject = new THREE.Object3D();
    this.eject.position.set(0.055, 0.03, 0.05);
    group.add(this.eject);

    const flashMaterial = new THREE.SpriteMaterial({
      map: makeFlashTexture(),
      color: 0xffd28a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flash = new THREE.Sprite(flashMaterial);
    this.flash.position.copy(this.muzzle.position);
    this.flash.scale.setScalar(0.55);
    this.flash.visible = false;
    group.add(this.flash);

    this.flashLight = new THREE.PointLight(0xffc070, 0, 9, 2);
    this.flashLight.position.copy(this.muzzle.position);
    group.add(this.flashLight);

    group.scale.setScalar(0.8);
    group.position.copy(HIP_POSITION);
    group.rotation.set(0.02, -0.055, 0.03);
    this.camera.add(group);
    this.weapon = group;
  }

  reset() {
    this.x = 0;
    this.z = 15.4;
    this.yaw = 0;
    this.pitch = -0.035;
    this.health = 100;
    this.maxHealth = 100;
    this.clip = this.magSize;
    this.reserve = 96;
    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.recoilPitch = 0;
    this.recoilKick = 0;
    this.shake = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.timeSinceDamage = 10;
    this.flashTimer = 0;
    this.dead = false;
    this.spread = 0.011;
    this.crosshairSpread = 8;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(this.x, 2.04, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.fov = 74;
    this.camera.updateProjectionMatrix();
    this.weapon.position.copy(HIP_POSITION);
    this.weapon.rotation.set(0.02, -0.055, 0.03);
    this.flash.visible = false;
    this.flashLight.intensity = 0;
    this.callbacks.onAmmo?.(this.clip, this.reserve);
    this.callbacks.onHealth?.(this.health, this.maxHealth);
  }

  update(dt, time) {
    this.input.update(dt);
    this.timeSinceDamage += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.dead) {
      this.camera.position.y += (-0.9 - this.camera.position.y) * Math.min(1, dt * 1.8);
      this.camera.rotation.z += (-0.6 - this.camera.rotation.z) * Math.min(1, dt * 1.5);
      this.updateWeapon(dt, time, 0);
      return;
    }

    const look = this.input.takeLook();
    const sensitivity = this.input.isTouch ? 0.0034 : 0.0022;
    this.yaw -= look.x * sensitivity;
    this.pitch -= look.y * sensitivity;
    this.pitch = Math.max(-1.1, Math.min(0.95, this.pitch));

    if (this.health < this.maxHealth && this.timeSinceDamage > 5) {
      this.health = Math.min(this.maxHealth, this.health + dt * 5.5);
      this.callbacks.onHealth?.(this.health, this.maxHealth);
    }

    const move = this.input.move;
    const moving = Math.abs(move.x) + Math.abs(move.y) > 0.05;
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const speed = this.input.sprint ? 6.1 : 4.2;
    const targetX = (forwardX * move.y + rightX * move.x) * speed;
    const targetZ = (forwardZ * move.y + rightZ * move.x) * speed;
    this.x += targetX * dt;
    this.z += targetZ * dt;
    this.x = Math.max(-8.4, Math.min(8.4, this.x));
    this.z = Math.max(10.3, Math.min(19.1, this.z));

    if (moving) {
      this.bobPhase += dt * speed * 1.7;
      this.bobAmount += (1 - this.bobAmount) * Math.min(1, dt * 6);
    } else {
      this.bobAmount += (0 - this.bobAmount) * Math.min(1, dt * 6);
    }

    this.recoilPitch *= Math.exp(-9 * dt);
    this.recoilKick *= Math.exp(-11 * dt);
    this.shake = Math.max(0, this.shake - dt * 3.4);

    const shakeX = (Math.random() - 0.5) * this.shake * 0.035;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.035;
    const bobY = Math.sin(this.bobPhase) * 0.032 * this.bobAmount;
    this.camera.position.set(this.x + shakeX, 2.04 + bobY + shakeY, this.z);
    this.camera.rotation.set(
      this.pitch + this.recoilPitch + this.input.tilt.y,
      this.yaw + this.input.tilt.x,
      (Math.random() - 0.5) * this.shake * 0.012
    );
    this.camera.getWorldPosition(this.cameraPos);

    const ads = this.input.ads && !this.reloading;
    const targetFov = ads ? 50 : 74;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12);
      this.camera.updateProjectionMatrix();
    }

    if (this.reloading) {
      this.reloadTimer += dt;
      if (this.reloadTimer >= this.reloadDuration) {
        const needed = this.magSize - this.clip;
        const take = Math.min(needed, this.reserve);
        this.clip += take;
        this.reserve -= take;
        this.reloading = false;
        this.reloadTimer = 0;
        this.callbacks.onAmmo?.(this.clip, this.reserve);
      }
    }

    if (this.input.firing && this.cooldown <= 0 && !this.reloading) this.fire();
    if (this.input.firing && this.clip <= 0 && !this.reloading && this.reserve > 0) this.startReload();

    const baseSpread = ads ? 0.0025 : 0.012;
    this.spread = baseSpread + this.bobAmount * 0.004 + this.recoilKick * 0.004;
    this.crosshairSpread = Math.max(5, Math.min(28, 5 + this.spread * 1000 + this.bobAmount * 4));

    this.updateWeapon(dt, time, ads ? 1 : 0);
  }

  updateWeapon(dt, time, adsAmount) {
    const hip = HIP_POSITION;
    const ads = ADS_POSITION;
    const swayX = Math.sin(time * 1.15) * 0.0035 + Math.sin(this.bobPhase) * 0.012 * this.bobAmount;
    const swayY = Math.cos(time * 1.7) * 0.0028 + Math.abs(Math.cos(this.bobPhase)) * 0.009 * this.bobAmount;
    let reloadRot = 0;
    let reloadDrop = 0;
    if (this.reloading) {
      const t = Math.min(1, this.reloadTimer / this.reloadDuration);
      const wave = Math.sin(t * Math.PI);
      reloadRot = wave * 0.55;
      reloadDrop = wave * 0.16;
    }
    const targetX = hip.x + (ads.x - hip.x) * adsAmount + swayX * (1 - adsAmount * 0.7);
    const targetY = hip.y + (ads.y - hip.y) * adsAmount + swayY * (1 - adsAmount * 0.7) - reloadDrop * 0.2;
    const targetZ = hip.z + (ads.z - hip.z) * adsAmount + this.recoilKick * 0.075;
    const lerp = Math.min(1, dt * 12);
    this.weapon.position.x += (targetX - this.weapon.position.x) * lerp;
    this.weapon.position.y += (targetY - this.weapon.position.y) * lerp;
    this.weapon.position.z += (targetZ - this.weapon.position.z) * lerp;
    const baseRotX = 0.02 + this.recoilKick * 0.22;
    const baseRotY = -0.055 * (1 - adsAmount);
    const baseRotZ = 0.03 * (1 - adsAmount);
    this.weapon.rotation.x += (baseRotX + reloadRot - this.weapon.rotation.x) * lerp;
    this.weapon.rotation.y += (baseRotY - this.weapon.rotation.y) * lerp;
    this.weapon.rotation.z += (baseRotZ + reloadRot * 0.4 - this.weapon.rotation.z) * lerp;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.flash.material.opacity = Math.max(0, this.flashTimer / 0.06);
      this.flashLight.intensity = Math.max(0, this.flashTimer / 0.06) * 7;
      if (this.flashTimer <= 0) {
        this.flash.visible = false;
        this.flashLight.intensity = 0;
      }
    }
  }

  fire() {
    if (this.dead || this.reloading || this.cooldown > 0) return;
    if (this.clip <= 0) {
      this.audio.dryFire();
      this.startReload();
      return;
    }
    this.clip -= 1;
    this.cooldown = this.fireInterval;
    this.recoilKick = 1;
    this.recoilPitch += 0.019;
    this.shake = Math.max(this.shake, 0.5);
    this.audio.shot();
    this.callbacks.onAmmo?.(this.clip, this.reserve);
    this.callbacks.onFire?.();

    this.flash.visible = true;
    this.flash.material.opacity = 1;
    this.flash.material.rotation = Math.random() * Math.PI;
    this.flash.scale.setScalar(0.45 + Math.random() * 0.35);
    this.flashTimer = 0.06;
    this.flashLight.intensity = 7;

    const origin = this.tempOrigin;
    this.camera.getWorldPosition(origin);
    const dir = this.tempDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const spread = this.spread;
    dir.x += (Math.random() - 0.5) * spread * 2;
    dir.y += (Math.random() - 0.5) * spread * 2;
    dir.z += (Math.random() - 0.5) * spread * 2;
    dir.normalize();

    this.raycaster.set(origin, dir);
    const enemyHits = this.raycaster.intersectObjects(this.enemies ? this.enemies.getHitboxes() : [], false);
    const worldHits = this.raycaster.intersectObjects(this.world.colliders, true);
    const nearestEnemy = enemyHits[0];
    const nearestWorld = worldHits[0];
    let end = this.tempEnd.copy(origin).addScaledVector(dir, 260);
    let enemy = null;
    let head = false;
    if (nearestEnemy && (!nearestWorld || nearestEnemy.distance < nearestWorld.distance)) {
      end.copy(nearestEnemy.point);
      enemy = nearestEnemy.object.userData.enemy;
      head = Boolean(nearestEnemy.object.userData.head);
    } else if (nearestWorld) {
      end.copy(nearestWorld.point);
    }

    this.muzzle.getWorldPosition(this.tempMuzzle);
    this.effects.tracer(this.tempMuzzle, end, 0xffdca0, 0.95);
    this.effects.burst(this.tempMuzzle, {
      count: 3,
      color: 0xffc070,
      speed: 2.6,
      size: 0.13,
      life: 0.18,
      gravity: 0,
      spread: 0.04
    });
    this.effects.burst(this.tempMuzzle, {
      count: 4,
      color: 0x8f897c,
      speed: 0.7,
      size: 0.22,
      life: 0.95,
      gravity: -0.35,
      growth: 2.4,
      spread: 0.05,
      drag: 1.8
    });
    this.eject.getWorldPosition(this.tempMuzzle);
    this.effects.burst(this.tempMuzzle, {
      count: 1,
      color: 0xd7a84b,
      speed: 1.9,
      size: 0.07,
      life: 0.65,
      gravity: 9,
      spread: 0.02
    });

    if (enemy) {
      const killed = enemy.hit(end, head);
      this.callbacks.onHit?.(head, killed);
      this.audio.hit(head);
    } else if (nearestWorld) {
      this.effects.burst(end, {
        count: 6,
        color: 0xc8b184,
        colorJitter: 0.1,
        speed: 2.2,
        size: 0.2,
        life: 0.6,
        gravity: 3,
        growth: 1.2,
        spread: 0.1
      });
      this.audio.impact();
    }
  }

  startReload() {
    if (this.reloading || this.clip >= this.magSize || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = 0;
    this.audio.reload();
    this.callbacks.onReload?.();
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.timeSinceDamage = 0;
    this.shake = Math.max(this.shake, 0.85);
    this.audio.playerHurt();
    this.callbacks.onDamage?.(amount);
    this.callbacks.onHealth?.(this.health, this.maxHealth);
    if (this.health <= 0) {
      this.dead = true;
      this.input.firing = false;
      this.callbacks.onDeath?.();
    }
  }

  resupply() {
    this.reserve = Math.min(160, this.reserve + 56);
    this.callbacks.onAmmo?.(this.clip, this.reserve);
  }
}

function makeFlashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,235,1)');
  gradient.addColorStop(0.16, 'rgba(255,222,150,0.95)');
  gradient.addColorStop(0.44, 'rgba(255,150,60,0.42)');
  gradient.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(14, 64);
  ctx.lineTo(114, 64);
  ctx.moveTo(64, 14);
  ctx.lineTo(64, 114);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
