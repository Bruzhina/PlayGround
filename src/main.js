import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createWorld } from './world.js'
import { Effects } from './effects.js'
import { AudioEngine } from './audio.js'
import { Player } from './player.js'
import { EnemyManager } from './enemies.js'
import { Weapon } from './weapon.js'
import { Input } from './input.js'
import { UI } from './ui.js'

const app = document.getElementById('app')
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.96
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.domElement.id = 'scene'
renderer.domElement.style.position = 'absolute'
renderer.domElement.style.inset = '0'
renderer.domElement.style.zIndex = '0'
app.insertBefore(renderer.domElement, app.firstChild)

const scene = new THREE.Scene()
scene.userData.cameraPosition = new THREE.Vector3()
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 1200)
camera.rotation.order = 'YXZ'
scene.add(camera)

const world = createWorld(scene, renderer)
const effects = new Effects(scene)
const audio = new AudioEngine()

let state = 'menu'
let score = 0
let kills = 0
let lastWave = 0
let lastAbsorbed = 0
let autoPausedAt = 0
let initialized = false

const ui = new UI(audio, {
  onStart: startGame,
  onResume: resumeGame,
  onRestart: restartGame,
  getKills: () => kills,
  releasePointerLock: () => input.releasePointerLock()
})

const player = new Player(camera, world, effects, audio)
const enemies = new EnemyManager(scene, world, effects, audio, ui, points => {
  score += points
  kills += 1
  ui.setScore(score)
})
const weapon = new Weapon(camera, world, enemies, effects, audio, ui, player)

const input = new Input(player, audio, renderer, {
  isActive: () => state === 'playing',
  onPause: togglePause,
  onPointerLockLost: () => {
    if (state === 'playing') {
      autoPausedAt = performance.now()
      togglePause()
    }
  },
  onToast: text => ui.toast(text, 2600),
  onQualityChange: applyQuality
})

const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.48, 0.62, 0.88)
const outputPass = new OutputPass()
composer.addPass(renderPass)
composer.addPass(bloom)
composer.addPass(outputPass)

function applyQuality(quality) {
  const dpr = quality === 'high'
    ? Math.min(window.devicePixelRatio || 1, 2)
    : quality === 'performance'
      ? 1
      : Math.min(window.devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(dpr)
  composer.setPixelRatio(dpr)
  bloom.enabled = quality !== 'performance'
  bloom.strength = quality === 'high' ? 0.62 : 0.44
  const shadowSize = quality === 'high' ? 2048 : quality === 'performance' ? 1024 : 1536
  if (world.sun.shadow.mapSize.x !== shadowSize) {
    world.sun.shadow.mapSize.set(shadowSize, shadowSize)
    if (world.sun.shadow.map) {
      world.sun.shadow.map.dispose()
      world.sun.shadow.map = null
    }
  }
  onResize()
}

function resetPlayer() {
  player.position.set(0, 0, 34)
  player.velocity.set(0, 0, 0)
  player.yaw = 0
  player.pitch = -0.03
  player.roll = 0
  player.flying = false
  player.onGround = true
  player.health = 100
  player.shield = 100
  player.absorbed = 0
  player.walkBob = 0
  lastAbsorbed = 0
  player.camera.position.set(0, 1.72, 34)
  player.camera.rotation.set(player.pitch, player.yaw, 0)
}

function startGame() {
  if (state === 'playing') return
  resetPlayer()
  input.reset()
  weapon.reset()
  weapon.model.visible = true
  weapon.enabled = true
  enemies.reset()
  score = 0
  kills = 0
  lastWave = 0
  ui.setScore(0)
  ui.setWave(1)
  state = 'playing'
  ui.startGame()
  enemies.start(player)
  lastWave = enemies.wave
  weapon.refill()
  input.requestPointerLock()
  ui.toast('AEGIS ONLINE — INVINCIBILITY ACTIVE', 3000)
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused'
    input.firing = false
    input.ascendTouch = false
    input.descendTouch = false
    weapon.model.visible = false
    ui.showPause()
  } else if (state === 'paused') {
    if (performance.now() - autoPausedAt < 350) return
    resumeGame()
  }
}

function resumeGame() {
  if (state !== 'paused') return
  state = 'playing'
  ui.hidePause()
  weapon.model.visible = true
  input.requestPointerLock()
}

function restartGame() {
  state = 'playing'
  resetPlayer()
  input.reset()
  weapon.reset()
  weapon.model.visible = true
  weapon.enabled = true
  enemies.reset()
  score = 0
  kills = 0
  lastWave = 0
  ui.setScore(0)
  ui.startGame()
  enemies.start(player)
  lastWave = enemies.wave
  weapon.refill()
  input.requestPointerLock()
}

function onResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.fov = w < 700 ? 80 : 74
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
  bloom.setSize(w, h)
}

window.addEventListener('resize', onResize)

function updateMenu(dt) {
  const t = performance.now() * 0.001
  camera.position.set(38 + Math.sin(t * 0.055) * 11, 14.5 + Math.sin(t * 0.13) * 1.2, 57 + Math.cos(t * 0.045) * 8)
  camera.lookAt(-2, 5.5, -22)
  scene.userData.cameraPosition.copy(camera.position)
  world.update(dt)
  effects.update(dt)
  player.camera.rotation.setFromQuaternion(camera.quaternion)
}

const timer = new THREE.Timer()
timer.connect(document)

function animate() {
  requestAnimationFrame(animate)
  timer.update()
  const dt = Math.min(0.05, timer.getDelta())

  if (state === 'playing') {
    input.update()
    if (input.flyPressed) {
      const flying = player.toggleFlight()
      ui.toast(flying ? 'AEGIS FLIGHT ENGAGED' : 'FLIGHT DISENGAGED — GRAVITY RESTORED')
    }
    player.update(dt, input)
    scene.userData.cameraPosition.copy(camera.position)
    weapon.update(dt, input)
    enemies.update(dt, player)
    effects.update(dt)
    world.update(dt)
    ui.setFlight(player.flying, player.position.y)
    ui.updateCompass(player.yaw)
    ui.drawRadar(player, enemies.enemies)
    if (player.absorbed !== lastAbsorbed) {
      ui.pulseShield()
      lastAbsorbed = player.absorbed
    }
    ui.updateFlash(dt)
    if (enemies.wave !== lastWave) {
      lastWave = enemies.wave
      weapon.refill()
    }
    input.endFrame()
  } else if (state === 'menu') {
    updateMenu(dt)
  } else if (state === 'paused') {
    ui.updateFlash(dt)
  }

  composer.render()

  if (!initialized) {
    initialized = true
    setTimeout(() => ui.hideLoading(), 260)
  }
}

resetPlayer()
weapon.model.visible = false
weapon.enabled = false
ui.showStart()
ui.setAmmo(weapon.ammo, weapon.reserve)
const initialQuality = (matchMedia('(pointer: coarse)').matches || window.innerWidth <= 820) ? 'performance' : 'balanced'
const qualitySelect = document.getElementById('quality-select')
if (qualitySelect) qualitySelect.value = initialQuality
applyQuality(initialQuality)
onResize()
animate()

window.ironVeil = {
  get state() { return state },
  get player() { return player },
  get enemies() { return enemies },
  get weapon() { return weapon },
  get input() { return input },
  get camera() { return camera },
  get ui() { return ui },
  start: startGame,
  setFlight: value => player.toggleFlight(value),
  get score() { return score }
}
