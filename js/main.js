import * as THREE from 'three';
import { World } from './world.js';
import { Effects } from './effects.js';
import { EnemyManager } from './enemies.js';
import { Player } from './player.js';
import { InputManager } from './input.js';
import { AudioEngine } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 1400);
camera.rotation.order = 'YXZ';
scene.add(camera);

const audio = new AudioEngine();
const world = new World(scene, renderer, 'auto');
if (world.sun) world.sun.shadow.camera.updateProjectionMatrix();
const effects = new Effects(scene);

let state = 'menu';
let elapsed = 0;
let frameCount = 0;
let last = performance.now();
let score = 0;
let kills = 0;
let wave = 0;
let waveActive = false;
let intermission = 0.5;
let spawnQueue = 0;
let spawnTimer = 0;
let spawnInterval = 0.85;
let bannerTimer = 0;
let toastTimer = 0;
let hitmarkerTimer = 0;
let dustTimer = 0;
const dustPosition = new THREE.Vector3();

const input = new InputManager({
  canvas,
  stickBase: $('stickBase'),
  stickKnob: $('stickKnob')
});

const enemies = new EnemyManager(scene, effects, audio, {
  onKill: (enemy, head) => {
    kills += 1;
    score += head ? 150 : 100;
    addKillFeed(head);
    updateHUD();
  },
  onPlayerHit: (amount) => {
    player.takeDamage(amount);
  }
});

const player = new Player({
  camera,
  scene,
  effects,
  audio,
  input,
  world,
  callbacks: {
    onAmmo: (clip, reserve) => {
      $('ammoValue').textContent = String(clip);
      $('ammoReserve').textContent = `/ ${reserve}`;
    },
    onHealth: (health) => {
      const ratio = Math.max(0, Math.min(1, health / 100));
      $('healthValue').textContent = String(Math.ceil(health));
      $('healthFill').style.transform = `scaleX(${ratio})`;
      $('healthFill').style.background = ratio < 0.34
        ? 'linear-gradient(90deg, #7d1d10, #c8492a)'
        : 'linear-gradient(90deg, #a9331c, #d7c48f)';
    },
    onHit: (head, killed) => {
      showHitmarker(head, killed);
    },
    onDamage: () => {
      flashDamage();
    },
    onDeath: () => {
      endRun();
    }
  }
});
player.enemies = enemies;

input.onAction = (action) => {
  if (action === 'reload') {
    if (state === 'playing') player.startReload();
  } else if (action === 'pause') {
    togglePause();
  } else if (action === 'tilt') {
    toggleTilt();
  } else if (action === 'fire') {
    if (state === 'playing') player.fire();
  }
};

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

function setQuality(mode) {
  if (mode === 'LOW') {
    renderer.setPixelRatio(1);
  } else if (mode === 'HIGH') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function showBanner(kicker, title, sub, duration = 3.2) {
  const banner = $('banner');
  $('bannerKicker').textContent = kicker;
  $('bannerTitle').textContent = title;
  $('bannerSub').textContent = sub;
  banner.classList.remove('hidden', 'out');
  void banner.offsetWidth;
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => {
    banner.classList.add('out');
    window.setTimeout(() => banner.classList.add('hidden'), 520);
  }, duration * 1000);
}

function hideBanner() {
  window.clearTimeout(bannerTimer);
  const banner = $('banner');
  banner.classList.add('hidden');
  banner.classList.remove('out');
}

function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.remove('hidden');
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.add('hidden'), 2200);
}

function showHitmarker(head, killed) {
  const marker = $('hitmarker');
  marker.classList.toggle('head', Boolean(head));
  marker.classList.add('show');
  window.clearTimeout(hitmarkerTimer);
  hitmarkerTimer = window.setTimeout(() => marker.classList.remove('show'), killed ? 190 : 110);
}

function flashDamage() {
  const flash = $('damageFlash');
  flash.classList.add('on');
  window.clearTimeout(flashDamage.timer);
  flashDamage.timer = window.setTimeout(() => flash.classList.remove('on'), 130);
}

function addKillFeed(head) {
  const feed = $('killfeed');
  const item = document.createElement('div');
  item.className = `kill-item${head ? ' head' : ''}`;
  item.innerHTML = head ? '<b>HEADSHOT</b> · FELDGRAU DOWN' : '<b>ELIMINATED</b> · FELDGRAU DOWN';
  feed.prepend(item);
  while (feed.children.length > 4) feed.lastElementChild.remove();
  window.setTimeout(() => {
    item.classList.add('out');
    window.setTimeout(() => item.remove(), 420);
  }, 3200);
}

function clearKillFeed() {
  $('killfeed').replaceChildren();
}

function updateHUD() {
  $('waveValue').textContent = pad(Math.max(1, wave));
  $('scoreValue').textContent = pad(score, 6);
  $('enemyValue').textContent = `${enemies.aliveCount + spawnQueue} HOSTILES`;
  $('healthValue').textContent = String(Math.ceil(player.health));
  $('healthFill').style.transform = `scaleX(${Math.max(0, Math.min(1, player.health / 100))})`;
  $('ammoValue').textContent = String(player.clip);
  $('ammoReserve').textContent = `/ ${player.reserve}`;
  $('crosshair').style.setProperty('--spread', `${player.crosshairSpread}px`);
}

function updateTiltUI() {
  const label = input.tiltEnabled ? 'TILT AIM: ON' : 'TILT AIM: OFF';
  for (const id of ['tiltBtn', 'tiltBtn2']) {
    const button = $(id);
    button.textContent = label;
    button.classList.toggle('on', input.tiltEnabled);
  }
}

async function toggleTilt() {
  audio.click();
  if (input.tiltEnabled) {
    input.disableTilt();
    updateTiltUI();
    toast('TILT AIM DISABLED');
    return;
  }
  const result = await input.enableTilt();
  updateTiltUI();
  if (result.ok) {
    toast('TILT AIM ENABLED · HOLD YOUR DEVICE STEADY');
  } else if (result.reason === 'denied') {
    toast('MOTION ACCESS DENIED · TOUCH AIM STILL ACTIVE');
  } else {
    toast('MOTION SENSOR UNAVAILABLE · TOUCH AIM STILL ACTIVE');
  }
}

const qualityModes = ['LOW', 'AUTO', 'HIGH'];
let qualityIndex = 1;

function cycleQuality() {
  qualityIndex = (qualityIndex + 1) % qualityModes.length;
  const mode = qualityModes[qualityIndex];
  setQuality(mode);
  $('qualityBtn').textContent = `QUALITY: ${mode}`;
  audio.click();
}

function startWave() {
  wave += 1;
  waveActive = true;
  spawnQueue = Math.min(18, 4 + wave * 2);
  spawnInterval = Math.max(0.34, 0.95 - wave * 0.05);
  spawnTimer = spawnInterval;
  const titles = [
    'THE SURF BREAKS',
    'SECOND ASSAULT',
    'GRENADIERS INBOUND',
    'THE BEACH HOLDS',
    'OVERWHELMING FORCE'
  ];
  showBanner(`WAVE ${pad(wave)}`, titles[Math.min(titles.length - 1, wave - 1)], 'HOLD THE LINE');
  const opening = [
    { x: -4, z: -4 },
    { x: 9, z: -12 },
    { x: -19, z: -18 }
  ];
  const first = Math.min(wave === 1 ? 3 : 2, spawnQueue);
  for (let i = 0; i < first; i++) {
    enemies.spawn(wave, wave === 1 ? opening[i] : world.getSpawnPoint());
    spawnQueue -= 1;
  }
  updateHUD();
}

function updateWaves(dt) {
  if (!waveActive) {
    intermission -= dt;
    if (intermission <= 0) startWave();
    return;
  }
  if (spawnQueue > 0) {
    spawnTimer -= dt;
    while (spawnTimer <= 0 && spawnQueue > 0) {
      enemies.spawn(wave, world.getSpawnPoint());
      spawnQueue -= 1;
      spawnTimer += spawnInterval;
    }
  }
  if (spawnQueue <= 0 && enemies.aliveCount === 0) {
    waveActive = false;
    intermission = 6.5;
    const bonus = 250 * wave;
    score += bonus;
    player.resupply();
    audio.waveHorn();
    showBanner(`WAVE ${pad(wave)} CLEARED`, 'REGROUP', `+${bonus} BONUS · AMMUNITION RESUPPLIED`, 4.2);
    updateHUD();
  }
}

function beginRun() {
  audio.init();
  audio.resume();
  audio.startAmbient();
  state = 'playing';
  input.setEnabled(true);
  input.ads = false;
  $('aimBtn').classList.remove('armed');
  enemies.clear();
  effects.reset();
  player.reset();
  score = 0;
  kills = 0;
  wave = 0;
  waveActive = false;
  intermission = 0.45;
  spawnQueue = 0;
  spawnTimer = 0;
  spawnInterval = 0.85;
  clearKillFeed();
  hideBanner();
  $('menu').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('gameover').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('damageFlash').classList.remove('on');
  updateHUD();
  startWave();
}

function endRun() {
  state = 'dead';
  input.setEnabled(false);
  $('finalWave').textContent = pad(Math.max(1, wave));
  $('finalScore').textContent = pad(score, 6);
  $('finalKills').textContent = String(kills);
  window.setTimeout(() => {
    if (state === 'dead') $('gameover').classList.remove('hidden');
  }, 950);
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    input.setEnabled(false);
    $('pauseWave').textContent = pad(Math.max(1, wave));
    $('pauseScore').textContent = pad(score, 6);
    $('pauseKills').textContent = String(kills);
    $('pause').classList.remove('hidden');
    audio.click();
  } else if (state === 'paused') {
    state = 'playing';
    input.setEnabled(true);
    $('pause').classList.add('hidden');
    audio.click();
  }
}

function updateDust(dt) {
  dustTimer -= dt;
  if (dustTimer > 0) return;
  dustTimer = 0.11;
  dustPosition.set(
    camera.position.x + (Math.random() - 0.5) * 20,
    0.4 + Math.random() * 4.5,
    camera.position.z - 2 - Math.random() * 16
  );
  effects.spawn(dustPosition, {
    color: 0xffe6bd,
    speed: 0.14,
    size: 0.022,
    life: 5,
    gravity: 0.02,
    drag: 0.08,
    growth: 0.25,
    upBias: 1.4
  });
}

function updateMenu(dt, time) {
  camera.position.set(Math.sin(time * 0.1) * 0.25, 2.05 + Math.sin(time * 0.7) * 0.012, 15.4);
  camera.rotation.set(-0.035 + Math.sin(time * 0.53) * 0.006, Math.sin(time * 0.09) * 0.055, 0);
  player.updateWeapon(dt, time, 0);
}

function frame(now) {
  requestAnimationFrame(frame);
  frameCount += 1;
  const frameStart = performance.now();
  const dt = Math.min(0.05, Math.max(0.0001, (now - last) / 1000));
  last = now;
  elapsed += dt;

  if (state === 'menu') {
    updateMenu(dt, elapsed);
    world.update(dt, elapsed);
    effects.update(dt);
    updateDust(dt);
  } else if (state === 'playing') {
    player.update(dt, elapsed);
    enemies.update(dt, player.cameraPos, elapsed);
    updateWaves(dt);
    world.update(dt, elapsed);
    effects.update(dt);
    updateDust(dt);
    updateHUD();
  } else if (state === 'paused') {
    world.update(dt, elapsed);
    effects.update(dt);
  } else if (state === 'dead') {
    player.update(dt, elapsed);
    enemies.update(dt, player.cameraPos, elapsed);
    world.update(dt, elapsed);
    effects.update(dt);
  }

  audio.update(dt);
  renderer.render(scene, camera);
  window.__frameMs = performance.now() - frameStart;
}

$('startBtn').addEventListener('click', () => {
  audio.init();
  audio.resume();
  audio.click();
  beginRun();
});
$('pauseBtn').addEventListener('click', togglePause);
$('resumeBtn').addEventListener('click', togglePause);
$('restartBtn').addEventListener('click', beginRun);
$('againBtn').addEventListener('click', beginRun);
$('tiltBtn').addEventListener('click', toggleTilt);
$('tiltBtn2').addEventListener('click', toggleTilt);
$('qualityBtn').addEventListener('click', cycleQuality);
$('reloadBtn').addEventListener('click', () => {
  if (state === 'playing') {
    player.startReload();
    audio.click();
  }
});
$('aimBtn').addEventListener('click', () => {
  if (state !== 'playing') return;
  input.ads = !input.ads;
  $('aimBtn').classList.toggle('armed', input.ads);
  audio.click();
});
const fireButton = $('fireBtn');
const pressFire = (event) => {
  event.preventDefault();
  if (state !== 'playing') return;
  input.firing = true;
  player.fire();
  fireButton.classList.add('pressed');
};
const releaseFire = (event) => {
  event.preventDefault();
  input.firing = false;
  fireButton.classList.remove('pressed');
};
fireButton.addEventListener('pointerdown', pressFire);
fireButton.addEventListener('pointerup', releaseFire);
fireButton.addEventListener('pointercancel', releaseFire);
fireButton.addEventListener('pointerleave', releaseFire);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') togglePause();
});

window.__neptune = {
  scene,
  camera,
  renderer,
  world,
  player,
  enemies,
  effects,
  get state() { return state; },
  get wave() { return wave; },
  get elapsed() { return elapsed; },
  get frameCount() { return frameCount; },
  get intermission() { return intermission; }
};

updateTiltUI();
updateHUD();
requestAnimationFrame(frame);
