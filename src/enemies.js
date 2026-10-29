import * as THREE from 'three'

const BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x353d40, roughness: 0.46, metalness: 0.72 })
const ARMOR_MAT = new THREE.MeshStandardMaterial({ color: 0x566267, roughness: 0.52, metalness: 0.6 })
const DARK_MAT = new THREE.MeshStandardMaterial({ color: 0x191e20, roughness: 0.58, metalness: 0.55 })
const ACCENT_MAT = new THREE.MeshStandardMaterial({ color: 0x5a1d13, emissive: 0xff4b2e, emissiveIntensity: 2.2, roughness: 0.4 })
const VISOR_MAT = new THREE.MeshStandardMaterial({ color: 0x110604, emissive: 0xff6b3d, emissiveIntensity: 3.4, roughness: 0.2 })
const GUN_MAT = new THREE.MeshStandardMaterial({ color: 0x22282b, roughness: 0.4, metalness: 0.8 })

function makeGlow() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,220,190,1)')
  g.addColorStop(0.25, 'rgba(255,95,55,0.9)')
  g.addColorStop(1, 'rgba(255,60,30,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}
const VISOR_GLOW = makeGlow()

const PROJECTILE_GEO = new THREE.SphereGeometry(0.16, 10, 8)
const PROJECTILE_MAT = new THREE.MeshBasicMaterial({ color: 0xff8a55 })
const PROJECTILE_GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0xff5b2e, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function buildModel() {
  const root = new THREE.Group()
  const torso = new THREE.Group()
  torso.position.y = 1.17
  root.add(torso)

  const chest = box(0.68, 0.66, 0.38, BODY_MAT)
  torso.add(chest)
  const plate = box(0.55, 0.44, 0.09, ARMOR_MAT, 0, 0.05, -0.21)
  torso.add(plate)
  const strip = box(0.22, 0.035, 0.02, ACCENT_MAT, 0, 0.18, -0.265)
  torso.add(strip)
  const strip2 = box(0.36, 0.025, 0.02, ACCENT_MAT, 0, -0.14, -0.265)
  torso.add(strip2)
  const pelvis = box(0.5, 0.25, 0.32, DARK_MAT, 0, -0.44, 0)
  torso.add(pelvis)

  const shoulderL = box(0.22, 0.24, 0.3, ARMOR_MAT, -0.45, 0.2, 0)
  const shoulderR = box(0.22, 0.24, 0.3, ARMOR_MAT, 0.45, 0.2, 0)
  torso.add(shoulderL, shoulderR)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), DARK_MAT)
  neck.position.y = 0.4
  torso.add(neck)

  const head = new THREE.Group()
  head.position.y = 0.57
  torso.add(head)
  const skull = box(0.34, 0.3, 0.34, BODY_MAT)
  head.add(skull)
  const visor = box(0.26, 0.075, 0.03, VISOR_MAT, 0, 0.02, -0.176)
  head.add(visor)
  const visorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: VISOR_GLOW, color: 0xff6b3d, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }))
  visorGlow.scale.set(0.34, 0.16, 1)
  visorGlow.position.set(0, 0.02, -0.2)
  head.add(visorGlow)
  const brow = box(0.37, 0.07, 0.1, ARMOR_MAT, 0, 0.14, -0.14)
  head.add(brow)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), DARK_MAT)
  antenna.position.set(0.14, 0.3, 0.06)
  antenna.rotation.z = -0.18
  head.add(antenna)

  const armL = new THREE.Group()
  armL.position.set(-0.46, 0.16, 0)
  torso.add(armL)
  const upperL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.42, 7), BODY_MAT)
  upperL.position.y = -0.2
  upperL.castShadow = true
  armL.add(upperL)
  const lowerL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.4, 7), ARMOR_MAT)
  lowerL.position.y = -0.55
  lowerL.castShadow = true
  armL.add(lowerL)

  const armR = new THREE.Group()
  armR.position.set(0.46, 0.16, 0)
  torso.add(armR)
  const upperR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.42, 7), BODY_MAT)
  upperR.position.y = -0.2
  upperR.castShadow = true
  armR.add(upperR)
  const lowerR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.4, 7), ARMOR_MAT)
  lowerR.position.y = -0.55
  lowerR.castShadow = true
  armR.add(lowerR)

  const gun = new THREE.Group()
  gun.position.set(0.02, -0.58, -0.26)
  gun.rotation.x = Math.PI / 2
  armR.add(gun)
  const gunBody = box(0.12, 0.15, 0.5, GUN_MAT, 0, 0, 0)
  gun.add(gunBody)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), GUN_MAT)
  barrel.rotation.x = Math.PI / 2
  barrel.position.z = -0.5
  gun.add(barrel)
  const gunAccent = box(0.02, 0.03, 0.22, ACCENT_MAT, 0.065, 0.04, -0.06)
  gun.add(gunAccent)

  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, 0, -0.8)
  gun.add(muzzle)

  const legs = []
  for (const side of [-1, 1]) {
    const hip = new THREE.Group()
    hip.position.set(side * 0.18, 0.86, 0)
    root.add(hip)
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.48, 7), BODY_MAT)
    upper.position.y = -0.24
    upper.castShadow = true
    hip.add(upper)
    const knee = new THREE.Group()
    knee.position.y = -0.48
    hip.add(knee)
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.44, 7), ARMOR_MAT)
    lower.position.y = -0.22
    lower.castShadow = true
    knee.add(lower)
    const foot = box(0.16, 0.09, 0.3, DARK_MAT, 0, -0.47, -0.06)
    knee.add(foot)
    const accent = box(0.03, 0.2, 0.03, ACCENT_MAT, side * 0.1, -0.22, 0)
    hip.add(accent)
    legs.push({ hip, knee, side })
  }

  const hitMeshes = []
  root.traverse(object => {
    if (object.isMesh) {
      object.userData.part = object === visor || object === skull ? 'head' : 'body'
      hitMeshes.push(object)
    }
  })

  return { root, torso, head, armL, armR, legs, muzzle, hitMeshes }
}

export class EnemyManager {
  constructor(scene, world, effects, audio, ui, onKill) {
    this.scene = scene
    this.world = world
    this.effects = effects
    this.audio = audio
    this.ui = ui
    this.onKill = onKill
    this.enemies = []
    this.hitMeshes = []
    this.projectiles = []
    this.wave = 0
    this.pendingWave = 0
    this.waveTimer = 0
    this.spawnedThisWave = 0
    this.raycaster = new THREE.Raycaster()
    this.tmp = new THREE.Vector3()
  }

  reset() {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.model.root)
      this.disposeModel(enemy.model.root)
    }
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh)
    }
    this.enemies = []
    this.projectiles = []
    this.hitMeshes = []
    this.wave = 0
    this.pendingWave = 0
    this.waveTimer = 0
  }

  start(player) {
    this.wave = 0
    this.nextWave(player)
  }

  nextWave(player) {
    this.wave += 1
    const count = Math.min(22, 4 + this.wave * 2)
    this.spawnWave(count, player)
    this.ui.showWave(this.wave)
    this.audio.wave()
  }

  spawnWave(count, player) {
    const origin = player ? player.position : new THREE.Vector3(0, 0, 34)
    const baseYaw = player ? player.yaw : 0
    const forwardBias = this.wave === 1 ? 0.55 : 1
    for (let i = 0; i < count; i++) {
      const spread = (i / count) * Math.PI * 2 * forwardBias
      const angle = baseYaw + spread + (Math.random() - 0.5) * 0.22
      const radius = 19 + Math.random() * 26
      const x = THREE.MathUtils.clamp(origin.x - Math.sin(angle) * radius, -220, 220)
      const z = THREE.MathUtils.clamp(origin.z - Math.cos(angle) * radius, -220, 220)
      this.spawnEnemy(x, z)
    }
  }

  spawnEnemy(x, z) {
    const model = buildModel()
    const root = model.root
    root.position.set(x, 0, z)
    root.rotation.y = Math.random() * Math.PI * 2
    this.scene.add(root)
    for (const mesh of model.hitMeshes) {
      mesh.userData.enemy = null
    }
    const enemy = {
      model,
      hp: 62,
      maxHp: 62,
      alive: true,
      dying: 0,
      shootTimer: 1.2 + Math.random() * 1.8,
      walkPhase: Math.random() * Math.PI * 2,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      speed: 2.0 + Math.random() * 1.4,
      root
    }
    for (const mesh of model.hitMeshes) {
      mesh.userData.enemy = enemy
      this.hitMeshes.push(mesh)
    }
    this.enemies.push(enemy)
  }

  damageFromShot(hit, amount, point) {
    const enemy = hit.object.userData.enemy
    if (!enemy || !enemy.alive) return null
    const headshot = hit.object.userData.part === 'head'
    enemy.hp -= headshot ? amount * 3.2 : amount
    this.effects.impact(point, hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0), headshot ? 0xffc45a : 0x8fe6ff, headshot ? 16 : 9)
    if (headshot) this.audio.headshot()
    else this.audio.hit()
    if (enemy.hp <= 0) {
      this.killEnemy(enemy, headshot)
      return { killed: true, headshot }
    }
    return { killed: false, headshot }
  }

  killEnemy(enemy, headshot) {
    if (!enemy.alive) return
    enemy.alive = false
    enemy.dying = 0.001
    const p = enemy.root.position.clone()
    p.y += 1.2
    this.effects.explosion(p, 0xff6836, 1)
    this.audio.explosion()
    this.ui.killfeed(headshot ? 'HEADSHOT' : 'ELIMINATED', headshot)
    for (const mesh of enemy.model.hitMeshes) {
      const idx = this.hitMeshes.indexOf(mesh)
      if (idx >= 0) this.hitMeshes.splice(idx, 1)
    }
    if (this.onKill) this.onKill(headshot ? 175 : 100, headshot)
  }

  get remaining() {
    return this.enemies.filter(enemy => enemy.alive).length
  }

  update(dt, player) {
    if (this.wave > 0 && this.remaining === 0 && this.pendingWave === 0) {
      this.pendingWave = 1
      this.waveTimer = 4.2
      this.ui.toast('SECTOR CLEAR — REGROUPING')
    }
    if (this.pendingWave > 0) {
      this.waveTimer -= dt
      if (this.waveTimer <= 0) {
        this.pendingWave = 0
        this.nextWave(player)
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy.alive) {
        enemy.dying += dt
        const t = Math.min(1, enemy.dying / 1.1)
        enemy.root.rotation.z = t * 1.3
        enemy.root.position.y = -Math.pow(t, 2) * 0.7
        if (enemy.dying > 2.2) {
          this.scene.remove(enemy.root)
          this.disposeModel(enemy.root)
          this.enemies.splice(i, 1)
        }
        continue
      }
      this.updateEnemy(enemy, dt, player)
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.life -= dt
      p.mesh.position.addScaledVector(p.velocity, dt)
      if (Math.random() > 0.45) this.effects.energyBoltTrail(p.mesh.position, 0xff7a45)
      const eye = player.eyePosition
      if (p.mesh.position.distanceTo(eye) < 1.15) {
        player.takeHit(12, p.mesh.position)
        this.projectiles.splice(i, 1)
        this.scene.remove(p.mesh)
        continue
      }
      if (p.mesh.position.y < 0.15 || p.life <= 0) {
        this.effects.explosion(p.mesh.position, 0xff6a3d, 0.55)
        this.projectiles.splice(i, 1)
        this.scene.remove(p.mesh)
      }
    }
  }

  updateEnemy(enemy, dt, player) {
    const root = enemy.root
    const toPlayer = this.tmp.copy(player.eyePosition).sub(root.position)
    const flat = new THREE.Vector3(toPlayer.x, 0, toPlayer.z)
    const dist = flat.length()
    const dir = flat.normalize()
    root.rotation.y = Math.atan2(-dir.x, -dir.z)

    const desired = 20
    let move = 0
    if (dist > desired + 2) move = 1
    else if (dist < desired - 6) move = -0.45
    const strafe = Math.sin(performance.now() * 0.0006 + enemy.walkPhase) * 0.7 * enemy.strafeDir

    const speed = enemy.speed * (dist > 55 ? 1.5 : 1)
    root.position.x += (dir.x * move + -dir.z * strafe) * speed * dt
    root.position.z += (dir.z * move + dir.x * strafe) * speed * dt
    root.position.x = THREE.MathUtils.clamp(root.position.x, -240, 240)
    root.position.z = THREE.MathUtils.clamp(root.position.z, -240, 240)

    enemy.walkPhase += dt * (4 + speed * (move !== 0 ? 0.7 : 0.25))
    const swing = Math.sin(enemy.walkPhase) * (move !== 0 ? 0.7 : 0.16)
    enemy.model.legs[0].hip.rotation.x = swing
    enemy.model.legs[1].hip.rotation.x = -swing
    enemy.model.legs[0].knee.rotation.x = Math.max(0, -swing) * 0.9
    enemy.model.legs[1].knee.rotation.x = Math.max(0, swing) * 0.9
    root.position.y = Math.abs(Math.sin(enemy.walkPhase)) * 0.035
    enemy.model.torso.position.y = 1.17 + Math.sin(enemy.walkPhase * 2) * 0.018
    enemy.model.armL.rotation.x = swing * 0.35
    enemy.model.head.rotation.x = THREE.MathUtils.clamp(-toPlayer.y * 0.012, -0.3, 0.35)
    enemy.model.head.rotation.y = Math.sin(performance.now() * 0.001 + enemy.walkPhase) * 0.08

    enemy.shootTimer -= dt
    if (enemy.shootTimer <= 0 && dist < 95) {
      enemy.shootTimer = 1.9 + Math.random() * 1.7
      const muzzlePos = new THREE.Vector3()
      enemy.model.muzzle.getWorldPosition(muzzlePos)
      const aim = player.eyePosition.clone()
      aim.x += (Math.random() - 0.5) * 1.6
      aim.y += (Math.random() - 0.5) * 1.2
      aim.z += (Math.random() - 0.5) * 1.6
      const dirShot = aim.sub(muzzlePos).normalize()
      if (this.hasLineOfSight(muzzlePos, player.eyePosition)) {
        this.spawnProjectile(muzzlePos, dirShot)
        this.audio.enemyShot()
        this.effects.burst(muzzlePos, 5, {
          dir: dirShot, speed: 4, spread: 1.2, life: 0.2, size: 0.13, color: 0xff8a55, gravity: 0, drag: 0.9
        })
      }
    }
  }

  hasLineOfSight(from, to) {
    const dir = to.clone().sub(from)
    const dist = dir.length()
    dir.normalize()
    this.raycaster.set(from, dir)
    this.raycaster.far = dist
    const hits = this.raycaster.intersectObjects(this.world.hitMeshes, true)
    return hits.length === 0 || hits[0].distance > dist - 1.2
  }

  spawnProjectile(position, dir) {
    const group = new THREE.Group()
    const core = new THREE.Mesh(PROJECTILE_GEO, PROJECTILE_MAT)
    const glow = new THREE.Mesh(PROJECTILE_GEO, PROJECTILE_GLOW_MAT)
    glow.scale.setScalar(2.6)
    group.add(core, glow)
    group.position.copy(position)
    this.scene.add(group)
    this.projectiles.push({
      mesh: group,
      velocity: dir.clone().multiplyScalar(29),
      life: 5
    })
  }

  disposeModel(root) {
    root.traverse(object => {
      if (object.isMesh) {
        object.geometry.dispose()
      }
    })
  }
}
