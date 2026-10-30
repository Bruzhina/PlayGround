import * as THREE from 'three';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { Weapon } from './weapon.js';
import { World } from './world.js';
import { ZombieManager } from './zombies.js';
import { clamp, detectLowEnd, qualityFor, smoothstep, terrainHeight } from './utils.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ui = new UI(this);
    this.qualitySetting = this.ui.settings.quality;
    this.qualityPreset = qualityFor(this.qualitySetting);
    this.adaptiveScale = 1;
    this.state = 'menu';
    this.day = 1;
    this.time = 17.4;
    this.dayLength = 180;
    this.nightFactor = 0;
    this.horde = false;
    this.deathTimer = 0;
    this.menuTime = 17.15;
    this.menuAngle = 0.48;
    this.fps = 60;
    this.frameCount = 0;
    this.qualityTimer = 0;
    this.fpsSum = 0;
    this.lastTimestamp = performance.now();
    this.setupRenderer();
    this.setupScene();
    this.setupSystems();
    this.bindEvents();
    this.ui.applySettings();
    this.enterMenu();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setupRenderer() {
    const preset = this.qualityPreset;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: preset.antialias,
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x0a0d0f, 1);
    this.applyPixelRatio();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  applyPixelRatio() {
    const preset = this.qualityPreset;
    const device = window.devicePixelRatio || 1;
    const ratio = Math.max(0.6, Math.min(device, preset.maxPixelRatio) * this.adaptiveScale);
    this.renderer.setPixelRatio(ratio);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d0f);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 230);
    this.scene.add(this.camera);
  }

  setupSystems() {
    this.audio = new AudioManager();
    this.input = new InputManager({
      canvas: this.canvas,
      onAction: (action) => this.handleAction(action),
      onPause: () => this.togglePause(),
      onTiltChange: (enabled) => {
        this.ui.setTiltSwitch(enabled);
        if (!enabled) this.ui.settings.tilt = false;
      }
    });
    this.world = new World(this.scene, this.qualityPreset, this.audio);
    this.player = new Player(this.camera, this.world, this.audio, this.ui);
    this.player.onDeath = () => this.handleDeath();
    this.zombies = new ZombieManager(this.scene, this.world, this.audio, this.ui, this.qualityPreset, this.world.debris);
    this.weapon = new Weapon(this.camera, this.scene, this.world, this.player, this.zombies, this.audio, this.ui, this.world.debris);
    this.weapon.layoutForAspect(this.camera.aspect);
    this.ui.setCamera(this.camera);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.handleResize(), 180));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.isTouch) this.input.requestPointerLock();
    });
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.applyPixelRatio();
    this.weapon?.layoutForAspect(this.camera.aspect);
  }

  applyQuality(setting) {
    this.qualitySetting = setting;
    this.qualityPreset = qualityFor(setting);
    this.adaptiveScale = 1;
    this.applyPixelRatio();
    this.zombies.max = this.qualityPreset.maxZombies + 2;
    this.handleResize();
  }

  start() {
    this.audio.init();
    this.audio.resume();
    this.world.reset();
    this.zombies.reset();
    this.weapon.reset();
    this.player.reset();
    this.day = 1;
    this.time = 17.4;
    this.nightFactor = 0;
    this.horde = false;
    this.deathTimer = 0;
    this.adaptiveScale = 1;
    this.applyPixelRatio();
    this.state = 'playing';
    this.weapon.group.visible = true;
    this.input.setEnabled(true);
    this.ui.startGame();
    this.zombies.spawn(-8.6, 2.8, { day: 1, night: false, aggro: false });
    this.zombies.spawn(9.6, -1.5, { day: 1, night: false, aggro: false });
    this.ui.toast('GATHER WOOD — DUSK IS CLOSE', 'warning');
    if (this.ui.settings.tilt && !this.input.tiltEnabled) {
      this.input.enableTilt().then((result) => {
        if (result.granted) {
          this.ui.setTiltSwitch(true);
          this.ui.toast('TILT ENABLED — HOLD PHONE LEVEL', 'good');
        } else {
          this.ui.settings.tilt = false;
          this.ui.setTiltSwitch(false);
          this.ui.saveSettings();
        }
      });
    }
    this.lastTimestamp = performance.now();
  }

  enterMenu() {
    this.state = 'menu';
    this.input.setEnabled(false);
    this.world.reset();
    this.zombies.reset();
    this.weapon.reset();
    this.player.reset();
    this.weapon.group.visible = false;
    this.time = this.menuTime;
    this.nightFactor = 0;
    this.ui.showMenu();
  }

  returnToMenu() {
    this.enterMenu();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.ui.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.hidePause();
    this.input.setEnabled(true);
    this.lastTimestamp = performance.now();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  handleAction(action) {
    if (this.state !== 'playing') return;
    if (action === 'jump') {
      this.player.jump();
      return;
    }
    if (action === 'reload') {
      this.weapon.startReload();
      return;
    }
    if (action === 'eat') {
      this.player.eat(false);
      return;
    }
    if (action === 'build') {
      this.buildBarricade();
      return;
    }
    if (action === 'tilt') {
      this.toggleTilt();
    }
  }

  toggleTilt() {
    if (this.input.tiltEnabled) {
      this.input.disableTilt();
      this.ui.settings.tilt = false;
      this.ui.setTiltSwitch(false);
      this.ui.saveSettings();
      this.ui.toast('TILT DISABLED');
      return;
    }
    this.input.enableTilt().then((result) => {
      if (result.granted) {
        this.ui.settings.tilt = true;
        this.ui.setTiltSwitch(true);
        this.ui.saveSettings();
        this.ui.toast('TILT ENABLED — HOLD PHONE LEVEL', 'good');
      } else {
        this.ui.toast('MOTION PERMISSION UNAVAILABLE', 'warning');
      }
    });
  }

  buildBarricade() {
    if (!this.player.canBuild()) {
      this.ui.toast('NEED 4 WOOD TO BUILD', 'warning');
      return;
    }
    const forward = this.player.getForward();
    const position = this.player.position.clone().addScaledVector(forward, 2.35);
    if (this.world.isBlocked(position.x, position.z, 0.9)) {
      this.ui.toast('TOO CLOSE TO A STRUCTURE', 'warning');
      return;
    }
    if (!this.player.spendBuild()) return;
    this.world.createBarricade(position, this.player.yaw);
    this.audio.build();
    this.ui.toast('BARRICADE PLACED — 4 WOOD', 'good');
  }

  handleDeath() {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.deathTimer = 1.35;
    this.input.setEnabled(false);
    this.ui.toast('YOU DIED', 'warning');
    this.audio.hurt();
  }

  updateClock(dt) {
    const previousNight = this.nightFactor > 0.5;
    this.time += dt * (24 / this.dayLength);
    if (this.time >= 24) this.time -= 24;
    const hours = this.time;
    this.nightFactor = hours >= 20 || hours < 6 ? 1 : 0;
    this.horde = this.nightFactor === 1 && (this.day === 7 || this.day % 3 === 0);
    if (!previousNight && this.nightFactor === 1) {
      this.audio.nightfall();
      this.ui.toast(this.horde ? `HORDE NIGHT ${this.day} — HOLD THE LINE` : `NIGHT ${this.day} — THE DEAD RISE`, 'warning');
    }
    if (previousNight && this.nightFactor === 0) {
      this.day += 1;
      if (this.day > 7) {
        this.state = 'won';
        this.input.setEnabled(false);
        this.ui.showGameOver({ days: 7, kills: this.zombies.kills, wood: this.player.totalWood, won: true });
        return;
      }
      this.audio.dawn();
      this.ui.toast(`DAWN — DAY ${this.day}`, 'good');
    }
  }

  updateMenu(dt) {
    this.menuAngle += dt * 0.065;
    const aspect = window.innerWidth / window.innerHeight;
    let x;
    let y;
    let z;
    if (aspect < 0.82) {
      x = Math.sin(this.menuAngle * 0.45) * 2.2;
      z = 17.2 + Math.cos(this.menuAngle * 0.45) * 0.8;
      y = terrainHeight(x, z) + 3.6;
    } else {
      const radius = 13.4;
      x = Math.sin(this.menuAngle) * radius;
      z = Math.cos(this.menuAngle) * radius;
      y = terrainHeight(x, z) + 4.6 + Math.sin(this.menuAngle * 0.7) * 0.35;
    }
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 2.35, 0);
    this.time = this.menuTime + Math.sin(this.menuAngle * 0.25) * 0.16;
    this.nightFactor = 0;
    this.world.update(dt, this.time, this.camera.position, 0);
  }

  updatePlaying(dt) {
    this.updateClock(dt);
    if (this.state !== 'playing') return;
    this.player.update(dt, this.input, this.nightFactor, true);
    this.weapon.update(dt, this.input, this.nightFactor);
    this.zombies.update(dt, this.player, this.nightFactor, this.day, this.horde);
    this.world.update(dt, this.time, this.camera.position, this.nightFactor);
    this.ui.update(this.player, {
      day: this.day,
      time: this.time,
      nightFactor: this.nightFactor,
      horde: this.horde,
      fps: this.fps
    }, dt);
  }

  updateDying(dt) {
    this.deathTimer -= dt;
    this.world.update(dt, this.time, this.camera.position, this.nightFactor);
    this.player.updateCamera(dt, this.nightFactor);
    this.player.trauma = Math.min(1, this.player.trauma + dt * 0.3);
    if (this.deathTimer <= 0) {
      this.state = 'dead';
      this.ui.showGameOver({
        days: this.day,
        kills: this.zombies.kills,
        wood: this.player.totalWood,
        won: false
      });
    }
  }

  updateAdaptive(dt) {
    this.qualityTimer += dt;
    this.fpsSum += this.fps;
    if (this.qualityTimer < 2.2) return;
    const average = this.fpsSum / Math.max(1, Math.round(this.qualityTimer / Math.max(dt, 0.001)));
    if (this.qualitySetting === 'auto') {
      if (average < 44 && this.adaptiveScale > 0.65) {
        this.adaptiveScale = Math.max(0.65, this.adaptiveScale - 0.08);
        this.applyPixelRatio();
      } else if (average > 56 && this.adaptiveScale < 1) {
        this.adaptiveScale = Math.min(1, this.adaptiveScale + 0.04);
        this.applyPixelRatio();
      }
    }
    this.qualityTimer = 0;
    this.fpsSum = 0;
  }

  loop(timestamp) {
    requestAnimationFrame(this.loop);
    const rawDelta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = clamp(rawDelta, 0.001, 0.05);
    const instantaneous = 1 / Math.max(rawDelta, 0.001);
    this.fps = this.fps * 0.9 + instantaneous * 0.1;
    this.frameCount += 1;

    if (this.state === 'menu') {
      this.updateMenu(dt);
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
      this.updateAdaptive(dt);
    } else if (this.state === 'dying') {
      this.updateDying(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
