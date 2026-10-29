import * as THREE from 'three'

const GUNMETAL = new THREE.MeshStandardMaterial({ color: 0x252b2e, roughness: 0.36, metalness: 0.82 })
const POLYMER = new THREE.MeshStandardMaterial({ color: 0x3a4144, roughness: 0.68, metalness: 0.18 })
const TAN = new THREE.MeshStandardMaterial({ color: 0x8a7351, roughness: 0.74, metalness: 0.15 })
const DARK = new THREE.MeshStandardMaterial({ color: 0x14181a, roughness: 0.5, metalness: 0.6 })
const GLASS = new THREE.MeshStandardMaterial({ color: 0x0a3338, emissive: 0x1c8ca2, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.8 })
const RETICLE = new THREE.MeshBasicMaterial({ color: 0x7ce7ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })

function part(geo, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  return mesh
}

function makeFlashTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,235,1)')
  g.addColorStop(0.2, 'rgba(255,215,150,0.95)')
  g.addColorStop(0.55, 'rgba(255,140,60,0.45)')
  g.addColorStop(1, 'rgba(255,90,30,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

function buildWeapon() {
  const group = new THREE.Group()
  const flashTexture = makeFlashTexture()

  const receiver = part(new THREE.BoxGeometry(0.105, 0.135, 0.4), GUNMETAL, 0, 0, 0)
  group.add(receiver)
  const upper = part(new THREE.BoxGeometry(0.092, 0.07, 0.44), POLYMER, 0, 0.083, -0.02)
  group.add(upper)
  const rail = part(new THREE.BoxGeometry(0.055, 0.022, 0.46), DARK, 0, 0.128, -0.03)
  group.add(rail)
  for (let i = 0; i < 10; i++) {
    const tooth = part(new THREE.BoxGeometry(0.062, 0.012, 0.016), DARK, 0, 0.144, -0.22 + i * 0.041)
    group.add(tooth)
  }

  const handguard = part(new THREE.BoxGeometry(0.082, 0.09, 0.34), POLYMER, 0, 0.005, -0.35)
  group.add(handguard)
  const tanPanel = part(new THREE.BoxGeometry(0.012, 0.065, 0.3), TAN, 0.047, 0.002, -0.35)
  group.add(tanPanel)
  const tanPanelL = part(new THREE.BoxGeometry(0.012, 0.065, 0.3), TAN, -0.047, 0.002, -0.35)
  group.add(tanPanelL)
  for (let i = 0; i < 7; i++) {
    const vent = part(new THREE.BoxGeometry(0.086, 0.012, 0.025), DARK, 0, 0.05, -0.44 + i * 0.035)
    group.add(vent)
  }

  const barrel = part(new THREE.CylinderGeometry(0.017, 0.017, 0.38, 8), GUNMETAL, 0, 0.012, -0.7)
  barrel.rotation.x = Math.PI / 2
  group.add(barrel)
  const gasBlock = part(new THREE.BoxGeometry(0.05, 0.045, 0.08), DARK, 0, 0.02, -0.56)
  group.add(gasBlock)
  const suppressor = part(new THREE.CylinderGeometry(0.031, 0.033, 0.19, 10), DARK, 0, 0.012, -0.94)
  suppressor.rotation.x = Math.PI / 2
  group.add(suppressor)
  for (let i = 0; i < 4; i++) {
    const ring = part(new THREE.TorusGeometry(0.033, 0.006, 5, 12), GUNMETAL, 0, 0.012, -0.87 - i * 0.045)
    ring.rotation.y = Math.PI / 2
    group.add(ring)
  }

  const stockTube = part(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 8), DARK, 0, 0.015, 0.29)
  stockTube.rotation.x = Math.PI / 2
  group.add(stockTube)
  const stock = part(new THREE.BoxGeometry(0.085, 0.13, 0.24), POLYMER, 0, -0.005, 0.38)
  group.add(stock)
  const stockPad = part(new THREE.BoxGeometry(0.09, 0.15, 0.035), TAN, 0, -0.012, 0.51)
  group.add(stockPad)
  const cheek = part(new THREE.BoxGeometry(0.075, 0.045, 0.18), TAN, 0, 0.07, 0.36)
  group.add(cheek)

  const grip = part(new THREE.BoxGeometry(0.058, 0.16, 0.085), POLYMER, 0, -0.135, 0.09)
  grip.rotation.x = -0.22
  group.add(grip)
  const gripRidge = part(new THREE.BoxGeometry(0.062, 0.02, 0.09), TAN, 0, -0.19, 0.075)
  gripRidge.rotation.x = -0.22
  group.add(gripRidge)

  const magazine = part(new THREE.BoxGeometry(0.062, 0.2, 0.11), DARK, 0, -0.15, -0.07)
  magazine.rotation.x = 0.15
  group.add(magazine)
  const magPlate = part(new THREE.BoxGeometry(0.068, 0.014, 0.12), TAN, 0, -0.25, -0.09)
  magPlate.rotation.x = 0.15
  group.add(magPlate)

  const triggerGuard = part(new THREE.TorusGeometry(0.045, 0.008, 5, 10, Math.PI), DARK, 0, -0.085, -0.01)
  triggerGuard.rotation.z = Math.PI
  triggerGuard.rotation.x = Math.PI / 2
  group.add(triggerGuard)

  const opticMount = part(new THREE.BoxGeometry(0.055, 0.035, 0.1), DARK, 0, 0.155, -0.04)
  group.add(opticMount)
  const opticBody = part(new THREE.CylinderGeometry(0.041, 0.041, 0.12, 10), DARK, 0, 0.2, -0.05)
  opticBody.rotation.x = Math.PI / 2
  group.add(opticBody)
  const lens = part(new THREE.CircleGeometry(0.033, 16), GLASS, 0, 0.2, -0.113)
  group.add(lens)
  const reticle = part(new THREE.RingGeometry(0.008, 0.011, 12), RETICLE, 0, 0.2, -0.116)
  group.add(reticle)
  const reticleDot = part(new THREE.CircleGeometry(0.0025, 8), RETICLE, 0, 0.2, -0.117)
  group.add(reticleDot)

  const gloveR = part(new THREE.BoxGeometry(0.062, 0.085, 0.1), TAN, 0, -0.15, 0.09)
  gloveR.rotation.x = -0.22
  group.add(gloveR)
  const gloveL = part(new THREE.BoxGeometry(0.075, 0.07, 0.14), TAN, 0.005, -0.035, -0.31)
  group.add(gloveL)
  const fingerL = part(new THREE.BoxGeometry(0.08, 0.025, 0.04), DARK, 0.005, -0.005, -0.25)
  group.add(fingerL)

  const ejection = part(new THREE.BoxGeometry(0.02, 0.04, 0.075), DARK, 0.052, 0.02, 0.02)
  group.add(ejection)

  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, 0.012, -1.045)
  group.add(muzzle)

  const flash = new THREE.Group()
  flash.position.copy(muzzle.position)
  const flash1 = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture, color: 0xffd49a, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  }))
  flash1.scale.setScalar(0.3)
  flash.add(flash1)
  const flash2 = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture, color: 0xff8a3d, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false
  }))
  flash2.scale.set(0.55, 0.22, 1)
  flash2.position.z = -0.12
  flash.add(flash2)
  flash.visible = false
  group.add(flash)

  const light = new THREE.PointLight(0xffb066, 0, 9, 2)
  light.position.copy(muzzle.position)
  group.add(light)

  group.traverse(object => {
    if (object.isMesh) {
      object.castShadow = false
      object.receiveShadow = false
      object.frustumCulled = false
    }
  })

  return { group, muzzle, flash, light }
}

export class Weapon {
  constructor(camera, world, enemies, effects, audio, ui, player) {
    this.camera = camera
    this.world = world
    this.enemies = enemies
    this.effects = effects
    this.audio = audio
    this.ui = ui
    this.player = player

    const built = buildWeapon()
    this.model = built.group
    this.muzzle = built.muzzle
    this.flash = built.flash
    this.flashLight = built.light
    this.camera.add(this.model)
    const narrow = window.innerWidth <= 820
    this.model.scale.setScalar(narrow ? 0.43 : 0.49)
    this.basePosition = narrow
      ? new THREE.Vector3(0.2, -0.165, -0.5)
      : new THREE.Vector3(0.235, -0.235, -0.5)
    this.model.position.copy(this.basePosition)
    this.model.rotation.set(-0.012, 0.1, 0)

    this.magazineSize = 30
    this.ammo = 30
    this.reserve = 270
    this.fireDelay = 0.094
    this.cooldown = 0
    this.reloading = false
    this.reloadTimer = 0
    this.reloadDuration = 1.65
    this.kick = 0
    this.bobTime = 0
    this.flashTimer = 0
    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 350
    this.tmp = new THREE.Vector3()
    this.tmp2 = new THREE.Vector3()
    this.lastEmptyClick = 0
    this.heat = 0
    this.enabled = false
  }

  refill() {
    this.reserve = Math.min(360, this.reserve + 90)
    this.ui.setAmmo(this.ammo, this.reserve)
  }

  startReload() {
    if (this.reloading || this.ammo >= this.magazineSize || this.reserve <= 0) return
    this.reloading = true
    this.reloadTimer = 0
    this.audio.reload()
    this.ui.startReload(this.reloadDuration)
  }

  finishReload() {
    const need = this.magazineSize - this.ammo
    const take = Math.min(need, this.reserve)
    this.ammo += take
    this.reserve -= take
    this.reloading = false
    this.ui.endReload(this.ammo, this.reserve)
  }

  tryFire() {
    if (this.cooldown > 0 || this.reloading) return
    if (this.ammo <= 0) {
      if (performance.now() - this.lastEmptyClick > 260) {
        this.audio.deny()
        this.lastEmptyClick = performance.now()
      }
      if (this.reserve > 0) this.startReload()
      return
    }
    this.ammo -= 1
    this.cooldown = this.fireDelay
    this.kick = Math.min(1.2, this.kick + 0.5)
    this.heat = Math.min(1, this.heat + 0.18)
    this.audio.shot()
    this.flashTimer = 0.048
    this.flash.visible = true
    this.flash.rotation.z = Math.random() * Math.PI
    this.flash.scale.setScalar(0.8 + Math.random() * 0.6)
    this.flashLight.intensity = 14
    this.ui.setAmmo(this.ammo, this.reserve)
    this.ui.firing()

    const spread = 0.0032 + this.heat * 0.006 + (this.player.moving ? 0.0045 : 0) + (this.player.flying ? 0.002 : 0)
    const ndc = new THREE.Vector2(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread * 2
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const ray = this.raycaster.ray

    const enemyHits = this.raycaster.intersectObjects(this.enemies.hitMeshes, false)
    const worldHits = this.raycaster.intersectObjects(this.world.hitMeshes, true)
    let hit = null
    let isEnemy = false
    if (enemyHits.length && (!worldHits.length || enemyHits[0].distance < worldHits[0].distance)) {
      hit = enemyHits[0]
      isEnemy = true
    } else if (worldHits.length) {
      hit = worldHits[0]
    }

    const muzzleWorld = new THREE.Vector3()
    this.muzzle.getWorldPosition(muzzleWorld)
    const end = hit ? hit.point.clone() : ray.origin.clone().addScaledVector(ray.direction, 300)

    if (hit) {
      const normal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        : ray.direction.clone().negate()
      if (isEnemy) {
        const result = this.enemies.damageFromShot(hit, 26, hit.point)
        if (result) this.ui.hitmarker(result.headshot)
      } else {
        this.effects.impact(hit.point, normal, 0xffcd8f, 11)
      }
    }

    this.effects.tracer(muzzleWorld, end, 0xffd18e)
    this.effects.spawn(muzzleWorld, {
      dir: ray.direction, speed: 2.2, spread: 1.4, life: 0.14,
      size: 0.22, color: 0xffc27a, gravity: 0.4, drag: 0.9
    })
    const eject = new THREE.Vector3()
    this.model.localToWorld(eject.copy(new THREE.Vector3(0.06, 0.04, 0.02)))
    this.effects.spawn(eject, {
      spread: 2.2, life: 0.55, size: 0.035, color: 0xd9b06a, gravity: -10, drag: 0.99
    })
  }

  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt)
    this.heat = Math.max(0, this.heat - dt * 0.3)
    this.kick += (0 - this.kick) * Math.min(1, dt * 10)
    this.flashTimer -= dt
    if (this.flashTimer <= 0) {
      this.flash.visible = false
      this.flashLight.intensity = 0
    } else {
      this.flashLight.intensity *= 0.72
    }

    if (this.reloading) {
      this.reloadTimer += dt
      if (this.reloadTimer >= this.reloadDuration) this.finishReload()
      else this.ui.updateReload(Math.min(1, this.reloadTimer / this.reloadDuration))
    }

    if (this.enabled && input.reloadPressed) this.startReload()
    if (this.enabled && input.firing) this.tryFire()

    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z)
    this.bobTime += dt * (this.player.onGround ? Math.max(0.5, speed * 0.55) : 1)
    const bobX = Math.sin(this.bobTime * 1.9) * (this.player.onGround ? 0.006 : 0.002)
    const bobY = Math.abs(Math.cos(this.bobTime * 1.9)) * (this.player.onGround ? 0.007 : 0.002)

    const lookX = THREE.MathUtils.clamp(input.lookImpulseX || 0, -22, 22)
    const lookY = THREE.MathUtils.clamp(input.lookImpulseY || 0, -22, 22)
    const targetX = this.basePosition.x + bobX - lookX * 0.0012
    const targetY = this.basePosition.y + bobY - lookY * 0.0010 - this.kick * 0.006
    const targetZ = this.basePosition.z + this.kick * 0.055
    this.model.position.x += (targetX - this.model.position.x) * Math.min(1, dt * 14)
    this.model.position.y += (targetY - this.model.position.y) * Math.min(1, dt * 14)
    this.model.position.z += (targetZ - this.model.position.z) * Math.min(1, dt * 18)

    let rotX = this.kick * 0.075 - lookY * 0.0012
    let rotY = 0.1 - lookX * 0.0012
    let rotZ = -lookX * 0.0007
    if (this.reloading) {
      const t = Math.sin(Math.min(1, this.reloadTimer / this.reloadDuration) * Math.PI)
      this.model.position.y -= t * 0.2
      this.model.position.x -= t * 0.04
      rotX -= t * 0.55
      rotZ += t * 0.5
    }
    if (this.player.flying) {
      this.model.position.y -= 0.015
      rotX += Math.sin(this.bobTime * 1.4) * 0.008
    }
    this.model.rotation.x += (rotX - this.model.rotation.x) * Math.min(1, dt * 15)
    this.model.rotation.y += (rotY - this.model.rotation.y) * Math.min(1, dt * 15)
    this.model.rotation.z += (rotZ - this.model.rotation.z) * Math.min(1, dt * 15)
  }

  reset() {
    this.ammo = this.magazineSize
    this.reserve = 270
    this.reloading = false
    this.reloadTimer = 0
    this.heat = 0
    this.ui.setAmmo(this.ammo, this.reserve)
    this.ui.endReload(this.ammo, this.reserve)
  }
}
