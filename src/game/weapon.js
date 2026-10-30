import * as THREE from 'three';
import { clamp } from './utils.js';

const CENTER = new THREE.Vector2(0, 0);

function makeFlashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,230,1)');
  gradient.addColorStop(0.18, 'rgba(255,220,120,0.95)');
  gradient.addColorStop(0.48, 'rgba(255,130,35,0.6)');
  gradient.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Weapon {
  constructor(camera, scene, world, player, zombies, audio, ui, particles) {
    this.camera = camera;
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.zombies = zombies;
    this.audio = audio;
    this.ui = ui;
    this.particles = particles;
    this.raycaster = new THREE.Raycaster();
    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.recoil = 0;
    this.flashTimer = 0;
    this.tracerTimer = 0;
    this.targetTimer = 0;
    this.currentTarget = null;
    this.time = 0;
    this.buildModel();
    this.buildTracer();
  }

  buildModel() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x56605b, roughness: 0.5, metalness: 0.72 });
    const metalDark = new THREE.MeshStandardMaterial({ color: 0x2a302d, roughness: 0.62, metalness: 0.64 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8b5d36, roughness: 0.84, metalness: 0.04 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xa87355, roughness: 0.92 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x353b35, roughness: 0.94 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x8d3b24, roughness: 0.68, metalness: 0.18 });
    const dot = new THREE.MeshStandardMaterial({ color: 0xff6f42, emissive: 0xff3b1e, emissiveIntensity: 2.2, roughness: 0.4 });

    const group = new THREE.Group();
    group.position.set(0.36, -0.33, -0.62);
    group.rotation.set(0.025, -0.085, 0.02);
    group.scale.setScalar(0.84);
    this.group = group;
    this.basePosition = group.position.clone();
    this.baseRotation = group.rotation.clone();
    this.camera.add(group);

    const addBox = (w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      group.add(mesh);
      return mesh;
    };

    addBox(0.13, 0.15, 0.58, metalDark, 0, 0, 0);
    addBox(0.14, 0.06, 0.36, metal, 0, 0.085, -0.1);
    addBox(0.12, 0.16, 0.3, wood, 0, -0.01, 0.34, -0.06);
    addBox(0.07, 0.2, 0.11, wood, 0, -0.17, 0.15, -0.32);
    addBox(0.085, 0.23, 0.13, metalDark, 0, -0.16, -0.04, -0.08);
    addBox(0.04, 0.07, 0.11, accent, 0.078, 0.03, -0.05);
    addBox(0.08, 0.035, 0.22, metalDark, 0, 0.12, -0.08);
    addBox(0.025, 0.06, 0.025, metalDark, -0.055, 0.18, -0.1);
    addBox(0.025, 0.06, 0.025, metalDark, 0.055, 0.18, -0.1);
    addBox(0.13, 0.025, 0.05, metalDark, 0, 0.2, -0.1);
    const sightDot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), dot);
    sightDot.position.set(0, 0.18, -0.11);
    group.add(sightDot);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.039, 0.62, 8), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.018, -0.58);
    group.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.036, 0.12, 8), metalDark);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.018, -0.92);
    group.add(muzzle);
    addBox(0.055, 0.15, 0.06, metalDark, 0, 0.018, -0.77);

    const rightHand = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.13), glove);
    palm.position.set(0, -0.09, 0.14);
    palm.rotation.x = -0.24;
    rightHand.add(palm);
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.055), glove);
    thumb.position.set(-0.055, -0.03, 0.12);
    thumb.rotation.z = 0.3;
    rightHand.add(thumb);
    rightHand.position.set(0.07, 0.02, 0.08);
    group.add(rightHand);

    const leftHand = new THREE.Group();
    const leftPalm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.2), glove);
    leftPalm.position.set(0, -0.1, -0.22);
    leftPalm.rotation.x = -0.1;
    leftHand.add(leftPalm);
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.28), skin);
    forearm.position.set(0, -0.1, -0.42);
    forearm.rotation.x = -0.12;
    leftHand.add(forearm);
    leftHand.position.set(-0.1, 0.01, 0.03);
    group.add(leftHand);

    const flashTexture = makeFlashTexture();
    this.muzzle = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flashTexture,
      color: 0xffc27c,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    }));
    this.muzzle.position.set(0, 0.02, -1.0);
    this.muzzle.scale.set(0.5, 0.5, 1);
    this.muzzle.visible = false;
    this.muzzle.renderOrder = 20;
    group.add(this.muzzle);

    this.muzzleWorld = new THREE.Object3D();
    this.muzzleWorld.position.set(0, 0.02, -1.0);
    group.add(this.muzzleWorld);
  }

  layoutForAspect(aspect) {
    if (!this.group) return;
    if (aspect < 0.82) {
      this.group.position.set(0.13, -0.3, -0.54);
      this.group.scale.setScalar(0.68);
    } else {
      this.group.position.set(0.36, -0.33, -0.62);
      this.group.scale.setScalar(0.84);
    }
    this.basePosition.copy(this.group.position);
    this.baseRotation.copy(this.group.rotation);
  }

  buildTracer() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    const material = new THREE.LineBasicMaterial({
      color: 0xffd79b,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.tracer = new THREE.Line(geometry, material);
    this.tracer.frustumCulled = false;
    this.tracer.visible = false;
    this.scene.add(this.tracer);
  }

  update(dt, input, nightFactor) {
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.tracerTimer = Math.max(0, this.tracerTimer - dt);
    this.targetTimer -= dt;

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        const loaded = this.player.finishReload();
        this.ui?.toast(loaded > 0 ? `RELOADED  ${this.player.magazine}/${this.player.reserve}` : 'NO RESERVE AMMO', loaded > 0 ? 'good' : 'warning');
        this.audio?.reload();
      }
    }

    if (input.fireHeld && this.cooldown <= 0 && !this.reloading) this.fire();
    if (!this.reloading && this.player.magazine === 0 && this.player.reserve > 0 && this.cooldown <= 0) this.startReload();

    if (this.flashTimer <= 0) this.muzzle.visible = false;
    if (this.tracerTimer <= 0) this.tracer.visible = false;

    this.recoil = Math.max(0, this.recoil - dt * 7.5);
    const bob = this.player.bobAmount;
    const walk = this.player.walkPhase;
    const swayX = Math.sin(walk) * 0.006 * bob + Math.sin(this.time * 1.4) * 0.0025;
    const swayY = Math.sin(walk * 2) * 0.007 * bob + Math.cos(this.time * 1.1) * 0.002;
    this.group.position.set(
      this.basePosition.x + swayX,
      this.basePosition.y + swayY - this.recoil * 0.018,
      this.basePosition.z + this.recoil * 0.075
    );
    this.group.rotation.set(
      this.baseRotation.x - this.recoil * 0.17 + Math.sin(this.time * 1.2) * 0.003,
      this.baseRotation.y + Math.sin(this.time * 0.8) * 0.004,
      this.baseRotation.z + Math.cos(walk) * 0.006 * bob
    );

    if (this.targetTimer <= 0) {
      this.targetTimer = 0.12;
      this.updateTarget(nightFactor);
    }
  }

  updateTarget() {
    this.raycaster.setFromCamera(CENTER, this.camera);
    const zombieHits = this.raycaster.intersectObjects(this.zombies.hitMeshes, false);
    let zombieHit = null;
    for (const hit of zombieHits) {
      const zombie = hit.object.userData.zombie;
      if (zombie && zombie.alive && !zombie.dead && hit.distance < 34) {
        zombieHit = hit;
        break;
      }
    }
    if (zombieHit) {
      this.currentTarget = { type: 'zombie', distance: zombieHit.distance };
      this.ui?.setInteraction('FIRE — WALKER', 'LMB');
      this.ui?.setCrosshair('zombie');
      return;
    }
    this.raycaster.far = 6.2;
    const resourceHits = this.raycaster.intersectObjects(this.world.resourceMeshes, false);
    this.raycaster.far = Infinity;
    if (resourceHits.length) {
      const hit = resourceHits[0];
      const type = hit.object.userData.resourceType;
      this.currentTarget = { type, distance: hit.distance };
      this.ui?.setInteraction(type === 'tree' ? 'CHOP — WOOD' : 'BREAK — STONE', 'LMB');
      this.ui?.setCrosshair('harvest');
      return;
    }
    this.currentTarget = null;
    this.ui?.setInteraction(null);
    this.ui?.setCrosshair(null);
  }

  fire() {
    if (!this.player.alive) return;
    if (this.reloading) return;
    if (this.player.magazine <= 0) {
      if (this.player.reserve > 0) this.startReload();
      else {
        this.cooldown = 0.45;
        this.ui?.toast('OUT OF AMMO — LOOT WALKERS', 'warning');
      }
      return;
    }
    this.player.magazine -= 1;
    this.cooldown = 0.23;
    this.recoil = 1;
    this.flashTimer = 0.055;
    this.muzzle.visible = true;
    this.muzzle.material.rotation = Math.random() * Math.PI;
    this.audio?.shot();
    this.player.kick(0.008);
    this.ui?.crosshairFire();

    this.raycaster.setFromCamera(CENTER, this.camera);
    this.raycaster.far = 34;
    const zombieHits = this.raycaster.intersectObjects(this.zombies.hitMeshes, false);
    for (const hit of zombieHits) {
      const zombie = hit.object.userData.zombie;
      if (!zombie || !zombie.alive || zombie.dead) continue;
      const headshot = hit.object.userData.part === 'head';
      const damage = headshot ? 125 : 36;
      const result = this.zombies.damage(zombie, damage, headshot, hit.point);
      this.tracerTo(hit.point);
      this.ui?.hitmarker(result.killed, headshot);
      this.spawnImpact(hit.point, true);
      this.player.addResource('scrap', 0, true);
      if (result.killed) {
        const ammo = 4 + Math.floor(Math.random() * 4);
        this.player.addAmmo(ammo);
        if (Math.random() < 0.42) this.player.food += 1;
        if (Math.random() < 0.5) this.player.addResource('scrap', 1 + Math.floor(Math.random() * 2), true);
        this.ui?.toast(`WALKER DOWN  +${ammo} AMMO`, 'good');
      }
      this.spawnMuzzleSmoke();
      return;
    }

    this.raycaster.far = 6.2;
    const resourceHits = this.raycaster.intersectObjects(this.world.resourceMeshes, false);
    this.raycaster.far = Infinity;
    if (resourceHits.length) {
      const hit = resourceHits[0];
      const result = this.world.harvest(hit.object, hit.instanceId, 1);
      this.audio?.chop();
      this.ui?.hitmarker(false, false, true);
      this.tracerTo(hit.point);
      this.spawnImpact(hit.point, false);
      if (result) {
        const type = result.type === 'tree' ? 'wood' : 'stone';
        this.player.addResource(type, 1, true);
        if (result.killed) {
          const bonus = 2 + Math.floor(Math.random() * 3);
          this.player.addResource(type, bonus, true);
          this.ui?.toast(`+${bonus + 1} ${type.toUpperCase()}`, 'good');
        }
      }
      this.spawnMuzzleSmoke();
      return;
    }

    const target = this.raycaster.ray.at(30, new THREE.Vector3());
    this.tracerTo(target);
    this.spawnMuzzleSmoke();
  }

  startReload() {
    if (this.reloading || this.player.magazine >= this.player.maxMagazine) return;
    if (this.player.reserve <= 0) {
      this.ui?.toast('NO RESERVE AMMO', 'warning');
      return;
    }
    this.reloading = true;
    this.reloadTimer = 1.25;
    this.audio?.reload();
    this.ui?.toast('RELOADING', '');
  }

  tracerTo(point) {
    const start = new THREE.Vector3();
    this.muzzleWorld.getWorldPosition(start);
    const positions = this.tracer.geometry.attributes.position;
    positions.setXYZ(0, start.x, start.y, start.z);
    positions.setXYZ(1, point.x, point.y, point.z);
    positions.needsUpdate = true;
    this.tracer.visible = true;
    this.tracerTimer = 0.055;
  }

  spawnImpact(point, blood) {
    if (blood) {
      this.particles.spawn(point, 0x9d1b17, { count: 6, speed: 2.6, size: 0.07, life: 0.45, gravity: -9 });
    } else {
      this.particles.spawn(point, 0xc6b58c, { count: 5, speed: 2.2, size: 0.08, life: 0.4, gravity: -7 });
    }
  }

  spawnMuzzleSmoke() {
    const position = new THREE.Vector3();
    this.muzzleWorld.getWorldPosition(position);
    this.particles.spawn(position, 0x807b6b, {
      count: 2,
      speed: 0.4,
      size: 0.12,
      life: 0.55,
      gravity: 0.15,
      upward: 0.1,
      drag: 0.94
    });
  }

  reset() {
    this.reloading = false;
    this.reloadTimer = 0;
    this.cooldown = 0;
    this.recoil = 0;
    this.flashTimer = 0;
    this.muzzle.visible = false;
    this.tracer.visible = false;
    this.ui?.setInteraction(null);
    this.ui?.setCrosshair(null);
  }
}
