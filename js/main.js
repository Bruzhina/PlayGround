import { Game } from "./game.js";
import { Input } from "./input.js";
import { AudioKit } from "./audio.js";
import { STARTERS } from "./data.js";
import { drawPortrait } from "./render.js";

const $ = id => document.getElementById(id);

const canvas = $("game");
const input = new Input();
input.attach(canvas);
const audio = new AudioKit();
const game = new Game(canvas, input, audio);

const menu = $("menu");
const hud = $("hud");
const levelup = $("levelup");
const pause = $("pause");
const results = $("results");
const banner = $("banner");
const toastEl = $("toast");
const roster = $("roster");
const upgradeCards = $("upgradeCards");
const hurtEl = $("hurt");

const hpFill = $("hpFill");
const hpText = $("hpText");
const xpFill = $("xpFill");
const hudName = $("hudName");
const hudLevel = $("hudLevel");
const timerEl = $("timer");
const waveLabel = $("waveLabel");
const killCount = $("killCount");
const bossBar = $("bossBar");
const bossName = $("bossName");
const bossFill = $("bossFill");
const bossHp = $("bossHp");
const dashBtn = $("btnDash");
const levelupLevel = $("levelupLevel");
const pauseStats = $("pauseStats");
const bestRun = $("bestRun");
const resultTitle = $("resultTitle");
const resultKicker = $("resultKicker");
const resultSub = $("resultSub");
const resTime = $("resTime");
const resKills = $("resKills");
const resLevel = $("resLevel");
const resEvolve = $("resEvolve");
const resultRecord = $("resultRecord");

const BEST_KEY = "digimon-survivor-best-v1";
const MUTE_KEY = "digimon-survivor-muted-v1";
const TILT_KEY = "digimon-survivor-tilt-v1";

let selected = "agumon";
let best = loadBest();
let muted = localStorage.getItem(MUTE_KEY) === "1";
let lastStage = -1;
let bannerTimer = null;
let toastTimer = null;
let portraitTime = 0;
let cards = [];

function loadBest() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BEST_KEY) || "null");
    if (parsed && typeof parsed.time === "number") return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveBest(summary) {
  const better = !best || summary.time > best.time || (summary.time === best.time && summary.kills > best.kills);
  if (better) {
    best = {
      time: summary.time,
      kills: summary.kills,
      level: summary.level,
      evolutions: summary.evolutions,
      victory: summary.victory,
      name: summary.name
    };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch { /* ignore */ }
  }
  updateBestLabel();
  return better;
}

function updateBestLabel() {
  if (!best) {
    bestRun.textContent = "BEST RUN —";
    return;
  }
  bestRun.textContent = `BEST RUN ${formatTime(best.time)} · ${best.kills} KILLS`;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function show(element) {
  element.classList.remove("is-hidden");
}

function hide(element) {
  element.classList.add("is-hidden");
}

function setScreen(name) {
  document.body.dataset.screen = name;
}

function buildRoster() {
  roster.innerHTML = "";
  for (const starter of STARTERS) {
    const button = document.createElement("button");
    button.className = "mon-card";
    button.dataset.starter = starter.id;
    button.style.setProperty("--accent", starter.accent);
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", `Select ${starter.name}`);
    button.innerHTML = `
      <canvas class="mon-art" width="160" height="120"></canvas>
      <div class="mon-name">${starter.name}</div>
      <div class="mon-elem">${starter.element} · ${starter.role}</div>
      <div class="mon-desc">${starter.desc}</div>
      <div class="mon-line">${starter.line.join(" → ")}</div>
    `;
    button.addEventListener("click", () => selectStarter(starter.id));
    roster.append(button);
  }
  selectStarter(selected);
}

function selectStarter(id) {
  selected = id;
  for (const card of roster.querySelectorAll(".mon-card")) {
    card.classList.toggle("selected", card.dataset.starter === id);
    card.setAttribute("aria-selected", card.dataset.starter === id ? "true" : "false");
  }
  audio.fx("ui");
}

function drawRosterPortraits() {
  if (menu.classList.contains("is-hidden")) return;
  for (const card of roster.querySelectorAll(".mon-card")) {
    const id = card.dataset.starter;
    const portrait = card.querySelector(".mon-art");
    drawPortrait(portrait, id, 0, portraitTime);
  }
}

function drawAvatar() {
  const avatar = $("avatarCanvas");
  drawPortrait(avatar, selected, game.stage || 0, game.menuTime || 0);
}

function updateTiltLabels() {
  const on = input.tilt.enabled;
  const menuBtn = $("btnTiltMenu");
  const pauseBtn = $("btnTiltPause");
  for (const button of [menuBtn, pauseBtn]) {
    button.textContent = on ? "TILT: ON" : "TILT: OFF";
    button.classList.toggle("on", on);
  }
}

function updateSoundUI() {
  document.body.classList.toggle("muted", muted);
  $("btnSoundMenu").textContent = muted ? "SOUND: OFF" : "SOUND: ON";
  $("btnSoundMenu").classList.toggle("on", !muted);
  $("btnSoundPause").textContent = muted ? "SOUND: OFF" : "SOUND: ON";
  $("btnSoundPause").classList.toggle("on", !muted);
}

function toggleSound() {
  muted = !muted;
  audio.init();
  audio.setMuted(muted);
  if (!muted) audio.fx("ui");
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  updateSoundUI();
}

async function toggleTilt() {
  const result = await input.toggleTilt();
  updateTiltLabels();
  if (result.enabled) {
    localStorage.setItem(TILT_KEY, "1");
    input.calibrateTilt();
    showToast("TILT ENABLED · CALIBRATING");
  } else if (result.reason === "denied") {
    showToast("MOTION PERMISSION DENIED");
  } else if (result.reason === "unsupported") {
    showToast("TILT NOT AVAILABLE ON THIS DEVICE");
  } else {
    localStorage.setItem(TILT_KEY, "0");
    showToast("TILT DISABLED");
  }
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
}

function showBanner(kicker, title, sub, variant = "wave") {
  banner.className = `banner ${variant}`;
  banner.querySelector(".banner-kicker").textContent = kicker;
  banner.querySelector(".banner-title").textContent = title;
  banner.querySelector(".banner-sub").textContent = sub;
  void banner.offsetWidth;
  banner.classList.add("show");
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => banner.classList.remove("show"), variant === "evolve" ? 2800 : 2100);
}

function startGame() {
  audio.init();
  audio.setMuted(muted);
  audio.startMusic();
  hide(menu);
  hide(levelup);
  hide(pause);
  hide(results);
  show(hud);
  setScreen("game");
  lastStage = -1;
  game.start(selected);
  requestAnimationFrame(drawAvatar);
}

function goMenu() {
  audio.stopMusic();
  game.toMenu();
  hide(hud);
  hide(levelup);
  hide(pause);
  hide(results);
  show(menu);
  setScreen("menu");
  updateBestLabel();
  window.setTimeout(drawRosterPortraits, 30);
}

function togglePause() {
  if (game.mode === "playing") {
    game.pause();
    pauseStats.innerHTML = `
      <span>TIME <b>${formatTime(game.time)}</b></span>
      <span>KILLS <b>${game.kills}</b></span>
      <span>LEVEL <b>${game.level}</b></span>
      <span>WAVE <b>${pad(game.wave)}</b></span>
    `;
    show(pause);
    setScreen("paused");
    audio.fx("ui");
  } else if (game.mode === "paused") {
    hide(pause);
    setScreen("game");
    game.resume();
    game.flushEvents();
    audio.fx("ui");
  }
}

function buildUpgradeCards(choices) {
  upgradeCards.innerHTML = "";
  cards = choices;
  choices.forEach((upgrade, index) => {
    const owned = game.upgrades.get(upgrade.id) || 0;
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.style.setProperty("--accent", upgrade.color);
    button.innerHTML = `
      <span class="num">0${index + 1}</span>
      <span class="upgrade-icon">${upgrade.icon}</span>
      <span class="upgrade-body">
        <span class="upgrade-name">${upgrade.name}</span>
        <span class="upgrade-desc">${upgrade.desc}</span>
        <span class="pips">${Array.from({ length: upgrade.max }, (_, i) => `<i class="${i < owned ? "on" : ""}"></i>`).join("")}<em>${owned}/${upgrade.max}</em></span>
      </span>
    `;
    button.addEventListener("click", () => chooseUpgrade(upgrade.id, index));
    upgradeCards.append(button);
  });
}

function chooseUpgrade(id, index) {
  if (game.mode !== "levelup") return;
  if (index !== undefined) audio.fx("ui");
  game.chooseUpgrade(id);
  if (game.mode === "levelup") return;
  hide(levelup);
  setScreen("game");
  game.flushEvents();
  drawAvatar();
}

function onLevelUp(choices, level, stage) {
  hide(pause);
  hide(results);
  show(levelup);
  setScreen("levelup");
  levelupLevel.textContent = pad(level);
  buildUpgradeCards(choices);
  if (stage !== lastStage) {
    lastStage = stage;
    drawAvatar();
  }
}

function updateHud(state) {
  if (!state) return;
  const hpRatio = clamp(state.hp / state.maxHp, 0, 1);
  const xpRatio = clamp(state.xp / state.xpNeed, 0, 1);
  hpFill.style.width = `${hpRatio * 100}%`;
  hpText.textContent = `${Math.ceil(state.hp)} / ${Math.round(state.maxHp)}`;
  xpFill.style.width = `${xpRatio * 100}%`;
  hudLevel.textContent = `LV ${state.level}`;
  hudName.textContent = state.name;
  timerEl.textContent = formatTime(state.time);
  waveLabel.textContent = `WAVE ${pad(state.wave)}`;
  killCount.textContent = state.kills;
  const dashPct = clamp(state.dash, 0, 1);
  dashBtn.style.setProperty("--p", dashPct * 100);
  dashBtn.classList.toggle("ready", dashPct >= 1);
  hurtEl.style.opacity = String(state.hurt * 0.95);
  hurtEl.classList.toggle("active", state.hurt > 0.01);

  if (state.boss) {
    bossBar.classList.remove("is-hidden");
    bossName.textContent = state.boss.name;
    const ratio = clamp(state.boss.hp / state.boss.maxHp, 0, 1);
    bossFill.style.width = `${ratio * 100}%`;
    bossHp.textContent = `${Math.ceil(ratio * 100)}%`;
  } else {
    bossBar.classList.add("is-hidden");
  }

  if (state.stage !== lastStage) {
    lastStage = state.stage;
    drawAvatar();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function onGameOver(summary) {
  audio.stopMusic();
  const isBest = saveBest(summary);
  resultKicker.textContent = summary.victory ? "PROTOCOL COMPLETE" : "SIGNAL LOST";
  resultTitle.textContent = summary.victory ? "YOU SURVIVED" : "DELETED";
  resultTitle.classList.toggle("win", summary.victory);
  resultSub.textContent = summary.victory
    ? `${summary.name} held the gate for five minutes.`
    : `${summary.name} was consumed by the swarm. Digivolve and try again.`;
  resTime.textContent = formatTime(summary.time);
  resKills.textContent = summary.kills;
  resLevel.textContent = summary.level;
  resEvolve.textContent = summary.evolutions;
  resultRecord.textContent = isBest
    ? "NEW PERSONAL RECORD"
    : best ? `BEST RUN ${formatTime(best.time)} · ${best.kills} KILLS` : "";
  hide(levelup);
  hide(pause);
  show(results);
  setScreen("results");
}

game.onHud = (state, force) => {
  updateHud(state);
  if (force) updateHud(state);
};
game.onEvent = (type, payload) => {
  if (type === "wave") {
    showBanner("INCOMING SURGE", `WAVE ${pad(payload.wave)}`, "THREAT DENSITY INCREASING", "wave");
  } else if (type === "boss") {
    showBanner("WARNING // MEGA LEVEL", payload.name, payload.title, "boss");
  } else if (type === "bossDown") {
    showBanner("TARGET DELETED", payload.name, "MASSIVE DATA REWARD", "evolve");
  } else if (type === "evolve") {
    showBanner("DIGIVOLUTION", payload.name, "POWER OUTPUT INCREASED", "evolve");
    lastStage = game.stage;
    drawAvatar();
  }
};
game.onLevelUp = onLevelUp;
game.onGameOver = onGameOver;

$("btnStart").addEventListener("click", startGame);

for (const id of ["btnTiltMenu", "btnTiltPause"]) {
  $(id).addEventListener("click", () => { toggleTilt(); });
}
for (const id of ["btnSoundMenu", "btnSoundPause", "btnMute"]) {
  $(id).addEventListener("click", toggleSound);
}
$("btnPause").addEventListener("click", togglePause);
$("btnResume").addEventListener("click", togglePause);
$("btnRestart").addEventListener("click", () => {
  hide(pause);
  game.start(selected);
  game.flushEvents();
  setScreen("game");
  drawAvatar();
});
$("btnQuit").addEventListener("click", goMenu);
$("btnRetry").addEventListener("click", () => {
  hide(results);
  game.start(selected);
  game.flushEvents();
  setScreen("game");
  drawAvatar();
});
$("btnMenu").addEventListener("click", goMenu);
dashBtn.addEventListener("pointerdown", event => {
  event.preventDefault();
  input.requestDash();
});
dashBtn.addEventListener("click", event => {
  event.preventDefault();
  input.requestDash();
});

window.addEventListener("keydown", event => {
  if (event.code === "Escape" || event.code === "KeyP") {
    if (game.mode === "playing" || game.mode === "paused") {
      event.preventDefault();
      togglePause();
    }
    return;
  }
  if (event.code === "KeyM") {
    toggleSound();
    return;
  }
  if (event.code === "KeyT") {
    toggleTilt();
    return;
  }
  if (game.mode === "levelup" && ["Digit1", "Digit2", "Digit3"].includes(event.code)) {
    const index = Number(event.code.slice(-1)) - 1;
    const upgrade = cards[index];
    if (upgrade) {
      event.preventDefault();
      chooseUpgrade(upgrade.id, index);
    }
  }
  if (game.mode === "menu" && event.code === "Enter") {
    event.preventDefault();
    startGame();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.mode === "playing") togglePause();
});

canvas.addEventListener("contextmenu", event => event.preventDefault());
window.addEventListener("blur", () => {
  if (game.mode === "playing") togglePause();
});

function init() {
  updateSoundUI();
  updateTiltLabels();
  updateBestLabel();
  buildRoster();
  setScreen("menu");
  if (localStorage.getItem(TILT_KEY) !== "1") input.disableTilt();
  drawRosterPortraits();
  window.setInterval(() => {
    if (game.mode === "menu") {
      portraitTime += 0.12;
      drawRosterPortraits();
    }
  }, 120);
}

window.digimonSurvivor = {
  game,
  input,
  audio,
  start: startGame,
  choose: chooseUpgrade,
  get screen() { return document.body.dataset.screen; }
};

init();
