import * as THREE from 'three';
import { clamp, compassLabel, formatClock, formatCountdown, headingFromYaw, solarState } from './utils.js';

const STORAGE_KEY = 'pocket-survival-settings-v1';
const BEST_KEY = 'pocket-survival-best-v1';

export class UI {
  constructor(game) {
    this.game = game;
    this.camera = null;
    this.settings = this.loadSettings();
    this.toastTimer = null;
    this.floating = [];
    this.killLines = [];
    this.fpsAccumulator = 0;
    this.fpsFrames = 0;
    this.fpsTimer = 0;
    this.lastNight = false;
    this.refs = {
      hud: document.getElementById('hud'),
      menu: document.getElementById('menu'),
      settings: document.getElementById('settings'),
      pause: document.getElementById('pause'),
      gameover: document.getElementById('gameover'),
      dayLabel: document.getElementById('dayLabel'),
      timeLabel: document.getElementById('timeLabel'),
      dayProgress: document.getElementById('dayProgress'),
      nightMarker: document.getElementById('nightMarker'),
      nightHint: document.getElementById('nightHint'),
      compassTape: document.getElementById('compassTape'),
      woodCount: document.getElementById('woodCount'),
      stoneCount: document.getElementById('stoneCount'),
      scrapCount: document.getElementById('scrapCount'),
      ammoCount: document.getElementById('ammoCount'),
      foodCount: document.getElementById('foodCount'),
      healthBar: document.getElementById('healthBar'),
      hungerBar: document.getElementById('hungerBar'),
      staminaBar: document.getElementById('staminaBar'),
      healthText: document.getElementById('healthText'),
      hungerText: document.getElementById('hungerText'),
      staminaText: document.getElementById('staminaText'),
      tiltState: document.getElementById('tiltState'),
      fpsLabel: document.getElementById('fpsLabel'),
      toast: document.getElementById('toast'),
      killFeed: document.getElementById('killFeed'),
      crosshair: document.getElementById('crosshair'),
      hitmarker: document.getElementById('hitmarker'),
      interaction: document.getElementById('interaction'),
      interactionText: document.getElementById('interactionText'),
      damageFlash: document.getElementById('damage-flash'),
      nightTint: document.getElementById('night-tint'),
      bestRun: document.getElementById('bestRun'),
      qualityControl: document.getElementById('qualityControl'),
      tiltToggle: document.getElementById('tiltToggle'),
      sensitivity: document.getElementById('sensitivity'),
      sensitivityValue: document.getElementById('sensitivityValue'),
      soundToggle: document.getElementById('soundToggle'),
      motionNote: document.getElementById('motionNote'),
      endKicker: document.getElementById('endKicker'),
      endTitle: document.getElementById('endTitle'),
      endCopy: document.getElementById('endCopy'),
      endDays: document.getElementById('endDays'),
      endKills: document.getElementById('endKills'),
      endWood: document.getElementById('endWood'),
      rotateHint: document.getElementById('rotateHint')
    };
    this.buildCompass();
    this.bindEvents();
    this.refreshSettingsUI();
    this.refreshBest();
  }

  loadSettings() {
    const defaults = { quality: 'auto', tilt: false, sensitivity: 1, sound: true };
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return { ...defaults, ...(stored || {}) };
    } catch {
      return defaults;
    }
  }

  saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch {}
  }

  applySettings() {
    const game = this.game;
    if (game.input) game.input.setSensitivity(this.settings.sensitivity);
    if (game.audio) game.audio.setEnabled(this.settings.sound);
    if (game.applyQuality) game.applyQuality(this.settings.quality);
    if (this.settings.tilt && game.input?.tiltEnabled) {
      this.setTiltSwitch(true);
    }
  }

  bindEvents() {
    const click = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);
    click('startBtn', () => this.game.start());
    click('settingsBtn', () => this.openSettings());
    click('closeSettings', () => this.closeSettings());
    click('doneSettings', () => this.closeSettings());
    click('pauseBtn', () => this.game.pause());
    click('resumeBtn', () => this.game.resume());
    click('quitBtn', () => this.game.returnToMenu());
    click('retryBtn', () => this.game.start());
    click('menuBtn', () => this.game.returnToMenu());

    this.refs.qualityControl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality]');
      if (!button) return;
      this.settings.quality = button.dataset.quality;
      this.refs.qualityControl.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      this.saveSettings();
      this.game.applyQuality?.(this.settings.quality);
      this.toast(`QUALITY: ${button.textContent.trim()}`, 'good');
    });

    this.refs.tiltToggle?.addEventListener('click', async () => {
      if (this.settings.tilt) {
        this.settings.tilt = false;
        this.game.input?.disableTilt();
        this.setTiltSwitch(false);
        this.saveSettings();
        this.toast('TILT DISABLED');
        return;
      }
      const result = await this.game.input.enableTilt();
      if (result.granted) {
        this.settings.tilt = true;
        this.setTiltSwitch(true);
        this.saveSettings();
        this.toast('TILT ENABLED — HOLD PHONE LEVEL', 'good');
        this.refs.motionNote.textContent = 'Tilt is active. Hold the phone level, then lean to aim. Re-enable to recenter.';
      } else {
        this.settings.tilt = false;
        this.setTiltSwitch(false);
        this.saveSettings();
        this.refs.motionNote.textContent = result.reason === 'denied'
          ? 'Motion permission was denied. Allow Motion & Orientation in Safari settings, then try again.'
          : 'Motion tilt is not available in this browser. Touch drag and mouse look still work.';
        this.toast(result.reason === 'denied' ? 'MOTION PERMISSION DENIED' : 'TILT UNAVAILABLE', 'warning');
      }
    });

    this.refs.sensitivity?.addEventListener('input', () => {
      const value = Number(this.refs.sensitivity.value);
      this.settings.sensitivity = value;
      this.refs.sensitivityValue.textContent = `${value.toFixed(1)}×`;
      this.game.input?.setSensitivity(value);
      this.saveSettings();
    });

    this.refs.soundToggle?.addEventListener('click', () => {
      this.settings.sound = !this.settings.sound;
      this.setSoundSwitch(this.settings.sound);
      this.game.audio?.setEnabled(this.settings.sound);
      this.saveSettings();
      this.toast(this.settings.sound ? 'SOUND ON' : 'SOUND MUTED');
    });
  }

  buildCompass() {
    if (!this.refs.compassTape) return;
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let html = '';
    for (let i = -4; i <= 12; i += 1) {
      const label = labels[((i % 8) + 8) % 8];
      const cardinal = label.length === 1;
      html += `<span class="${cardinal ? 'cardinal' : ''} ${label === 'N' ? 'north' : ''}">${label}</span>`;
    }
    this.refs.compassTape.innerHTML = html;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  refreshSettingsUI() {
    this.refs.qualityControl?.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('active', button.dataset.quality === this.settings.quality);
    });
    this.setTiltSwitch(Boolean(this.settings.tilt));
    this.setSoundSwitch(Boolean(this.settings.sound));
    if (this.refs.sensitivity) {
      this.refs.sensitivity.value = String(this.settings.sensitivity);
      this.refs.sensitivityValue.textContent = `${Number(this.settings.sensitivity).toFixed(1)}×`;
    }
  }

  setTiltSwitch(on) {
    if (!this.refs.tiltToggle) return;
    this.refs.tiltToggle.setAttribute('aria-checked', String(on));
    this.refs.tiltToggle.querySelector('em').textContent = on ? 'ON' : 'OFF';
    if (this.refs.tiltState) this.refs.tiltState.textContent = on ? 'TILT ON' : 'TILT OFF';
  }

  setSoundSwitch(on) {
    if (!this.refs.soundToggle) return;
    this.refs.soundToggle.setAttribute('aria-checked', String(on));
    this.refs.soundToggle.querySelector('em').textContent = on ? 'ON' : 'OFF';
  }

  openSettings() {
    this.refs.settings.classList.remove('hidden');
  }

  closeSettings() {
    this.refs.settings.classList.add('hidden');
  }

  showMenu() {
    this.refs.menu.classList.remove('hidden');
    this.refs.hud.classList.add('hidden');
    this.refs.gameover.classList.add('hidden');
    this.refs.pause.classList.add('hidden');
    this.refs.settings.classList.add('hidden');
    this.refreshBest();
  }

  startGame() {
    this.refs.menu.classList.add('hidden');
    this.refs.gameover.classList.add('hidden');
    this.refs.pause.classList.add('hidden');
    this.refs.settings.classList.add('hidden');
    this.refs.hud.classList.remove('hidden');
    this.clearFloating();
    this.refs.killFeed.innerHTML = '';
    this.lastNight = false;
    this.toast('SURVIVE UNTIL DAWN', 'warning');
  }

  showPause() {
    this.refs.pause.classList.remove('hidden');
  }

  hidePause() {
    this.refs.pause.classList.add('hidden');
  }

  showGameOver({ days, kills, wood, won }) {
    this.refs.endKicker.textContent = won ? 'SEVEN NIGHTS SURVIVED' : 'RUN ENDED';
    this.refs.endTitle.textContent = won ? 'YOU SURVIVED' : 'YOU DIED';
    this.refs.endCopy.textContent = won
      ? 'Dawn breaks on day eight. The dead zone is yours — for now.'
      : 'The dead got you before dawn. The cabin will remember.';
    this.refs.endDays.textContent = String(days);
    this.refs.endKills.textContent = String(kills);
    this.refs.endWood.textContent = String(wood);
    this.refs.gameover.classList.remove('hidden');
    this.refs.hud.classList.add('hidden');
    this.saveBest(days);
  }

  saveBest(days) {
    try {
      const best = Number(localStorage.getItem(BEST_KEY) || 0);
      if (days > best) localStorage.setItem(BEST_KEY, String(days));
    } catch {}
    this.refreshBest();
  }

  refreshBest() {
    if (!this.refs.bestRun) return;
    try {
      const best = Number(localStorage.getItem(BEST_KEY) || 0);
      this.refs.bestRun.textContent = best > 0 ? `${best} ${best === 1 ? 'DAY' : 'DAYS'}` : '—';
    } catch {
      this.refs.bestRun.textContent = '—';
    }
  }

  update(player, { day, time, nightFactor, horde, fps }, dt = 1 / 60) {
    if (!player) return;
    const health = clamp(player.health / player.maxHealth, 0, 1);
    this.refs.healthBar.style.width = `${health * 100}%`;
    this.refs.hungerBar.style.width = `${clamp(player.hunger, 0, 100)}%`;
    this.refs.staminaBar.style.width = `${clamp(player.stamina, 0, 100)}%`;
    this.refs.healthText.textContent = String(Math.ceil(player.health));
    this.refs.hungerText.textContent = String(Math.ceil(player.hunger));
    this.refs.staminaText.textContent = String(Math.ceil(player.stamina));
    this.refs.woodCount.textContent = String(player.wood);
    this.refs.stoneCount.textContent = String(player.stone);
    this.refs.scrapCount.textContent = String(player.scrap);
    this.refs.ammoCount.textContent = `${player.magazine}/${player.reserve}`;
    this.refs.foodCount.textContent = String(player.food);
    this.refs.dayLabel.textContent = `DAY ${day}`;
    this.refs.timeLabel.textContent = formatClock(time);
    const hours = ((time % 24) + 24) % 24;
    const dayProgress = ((hours - 6 + 24) % 24) / 24;
    this.refs.dayProgress.style.width = `${dayProgress * 100}%`;
    this.refs.nightMarker.style.left = `${(14 / 24) * 100}%`;

    const isNight = nightFactor > 0.5;
    const dayLength = this.game.dayLength || 180;
    if (isNight) {
      const untilDawn = (30 - hours) % 24;
      this.refs.nightHint.textContent = horde ? 'HORDE NIGHT — HOLD THE LINE' : `DAWN IN ${formatCountdown((untilDawn / 24) * dayLength)}`;
      this.refs.nightHint.classList.add('danger');
    } else {
      const untilNight = (20 - hours + 24) % 24;
      this.refs.nightHint.textContent = `DUSK IN ${formatCountdown((untilNight / 24) * dayLength)}`;
      this.refs.nightHint.classList.remove('danger');
    }
    if (isNight !== this.lastNight) {
      this.lastNight = isNight;
      this.refs.nightTint.classList.toggle('active', isNight);
    }

    const heading = headingFromYaw(player.yaw);
    const offset = (heading / 45) * 34 + 17;
    this.refs.compassTape.style.transform = `translateX(${150 - offset}px)`;

    this.refs.fpsTimer += 1;
    this.fpsAccumulator += fps;
    this.fpsFrames += 1;
    if (this.refs.fpsTimer > 20) {
      const average = Math.round(this.fpsAccumulator / this.fpsFrames);
      this.refs.fpsLabel.textContent = `${average} FPS`;
      this.refs.fpsTimer = 0;
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }
    this.updateFloating(dt);
  }

  toast(text, type = '') {
    if (!this.refs.toast) return;
    clearTimeout(this.toastTimer);
    this.refs.toast.textContent = text;
    this.refs.toast.className = `toast show ${type}`.trim();
    this.toastTimer = setTimeout(() => {
      this.refs.toast.className = 'toast';
    }, 2100);
  }

  addKillFeed(text) {
    if (!this.refs.killFeed) return;
    const line = document.createElement('div');
    line.className = 'kill-line';
    line.innerHTML = text.replace('WALKER', '<b>WALKER</b>');
    this.refs.killFeed.prepend(line);
    setTimeout(() => line.remove(), 3800);
    while (this.refs.killFeed.children.length > 4) this.refs.killFeed.lastElementChild.remove();
  }

  flashDamage() {
    if (!this.refs.damageFlash) return;
    this.refs.damageFlash.classList.add('active');
    clearTimeout(this.damageTimer);
    this.damageTimer = setTimeout(() => this.refs.damageFlash.classList.remove('active'), 130);
  }

  hitmarker(killed = false, headshot = false, harvest = false) {
    const marker = this.refs.hitmarker;
    if (!marker) return;
    marker.classList.remove('show');
    void marker.offsetWidth;
    marker.classList.add('show');
    marker.style.filter = harvest ? 'hue-rotate(55deg)' : killed || headshot ? 'brightness(1.4)' : '';
  }

  crosshairFire() {
    const crosshair = this.refs.crosshair;
    if (!crosshair) return;
    crosshair.classList.add('firing');
    clearTimeout(this.fireTimer);
    this.fireTimer = setTimeout(() => crosshair.classList.remove('firing'), 90);
  }

  setInteraction(text, key = 'LMB') {
    if (!this.refs.interaction) return;
    if (!text) {
      this.refs.interaction.classList.add('hidden');
      return;
    }
    this.refs.interaction.classList.remove('hidden');
    this.refs.interactionText.textContent = text;
    const keyCap = this.refs.interaction.querySelector('.key-cap');
    if (keyCap) keyCap.textContent = key;
  }

  setCrosshair(type) {
    if (!this.refs.crosshair) return;
    this.refs.crosshair.classList.toggle('harvest', type === 'harvest');
    this.refs.crosshair.classList.toggle('zombie', type === 'zombie');
  }

  floatText(position, text, type = 'damage') {
    if (!this.camera) return;
    const element = document.createElement('div');
    element.className = `float-text ${type}`;
    element.textContent = text;
    document.getElementById('hud').appendChild(element);
    this.floating.push({ element, position: position.clone(), life: 0.85, maxLife: 0.85 });
  }

  updateFloating(dt) {
    if (!this.camera) return;
    for (let i = this.floating.length - 1; i >= 0; i -= 1) {
      const item = this.floating[i];
      item.life -= dt;
      if (item.life <= 0) {
        item.element.remove();
        this.floating.splice(i, 1);
        continue;
      }
      const projected = item.position.clone().project(this.camera);
      if (projected.z > 1 || projected.z < -1) {
        item.element.style.opacity = '0';
        continue;
      }
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      const progress = 1 - item.life / item.maxLife;
      item.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y - progress * 38}px) scale(${1 + progress * 0.22})`;
      item.element.style.opacity = String(clamp(item.life / item.maxLife, 0, 1));
    }
  }

  clearFloating() {
    this.floating.forEach((item) => item.element.remove());
    this.floating.length = 0;
  }
}
