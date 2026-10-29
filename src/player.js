import * as THREE from 'three'

const EYE = 1.72
const GRAVITY = 24
const MAX_ALTITUDE = 78

export class Player {
  constructor(camera, world, effects, audio) {
    this.camera = camera
    this.world = world
    this.effects = effects
    this.audio = audio

    this.position = new THREE.Vector3(0, 0, 46)
    this.velocity = new THREE.Vector3()
    this.yaw = 0
    this.pitch = -0.02
    this.roll = 0
    this.flying = false
    this.onGround = true
    this.invincible = true
    this.health = 100
    this.shield = 100
    this.absorbed = 0
    this.walkBob = 0
    this.lookSensitivity = 1
    this.invertY = false
    this.moving = false
    this.sprinting = false
    this.radius = 0.48
    this.height = 1.82

    this.camera.rotation.order = 'YXZ'
    this.camera.position.set(this.position.x, this.position.y + EYE, this.position.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0)
  }

  get eyePosition() {
    return new THREE.Vector3(this.position.x, this.position.y + EYE, this.position.z)
  }

  addLook(dx, dy) {
    const sens = 0.0021 * this.lookSensitivity
    this.yaw -= dx * sens
    this.pitch -= dy * sens * (this.invertY ? -1 : 1)
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.46, 1.46)
  }

  toggleFlight(force) {
    const next = typeof force === 'boolean' ? force : !this.flying
    if (next === this.flying) return
    this.flying = next
    if (this.flying) {
      this.velocity.y = Math.max(this.velocity.y, 3.4)
      this.onGround = false
      this.audio.flight(true)
    } else {
      this.audio.flight(false)
    }
    return this.flying
  }

  takeHit(amount = 10, position = null) {
    if (this.invincible) {
      this.absorbed += 1
      this.shield = 100
      this.effects.shieldPulse(this.eyePosition)
      this.audio.shield()
      return false
    }
    this.health = Math.max(0, this.health - amount)
    return this.health <= 0
  }

  update(dt, input) {
    const wish = new THREE.Vector3()
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    wish.addScaledVector(forward, input.moveY)
    wish.addScaledVector(right, input.moveX)
    const wishLen = wish.length()
    if (wishLen > 1) wish.normalize()

    this.moving = wishLen > 0.06
    this.sprinting = input.sprint && this.moving && !this.flying
    let speed = this.flying ? 13.5 : this.sprinting ? 11.8 : 7.2

    const control = this.flying ? 7.5 : 15
    const targetVx = wish.x * speed
    const targetVz = wish.z * speed
    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, control * dt)
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, control * dt)

    if (this.flying) {
      const vertical = (input.ascend ? 1 : 0) - (input.descend ? 1 : 0)
      const targetVy = vertical * 11
      this.velocity.y += (targetVy - this.velocity.y) * Math.min(1, 6 * dt)
      if (input.jumpPressed) this.velocity.y = 7
      this.onGround = false
    } else {
      this.velocity.y -= GRAVITY * dt
      if (input.jumpPressed && this.onGround) {
        this.velocity.y = 8.6
        this.onGround = false
        this.audio.noise(0.08, 0.07, 700, 'lowpass', 1.3)
      }
    }

    const oldX = this.position.x
    const oldZ = this.position.z
    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt
    this.position.y += this.velocity.y * dt

    if (this.position.y <= 0) {
      if (!this.onGround && this.velocity.y < -6) {
        this.audio.noise(0.16, 0.12, 420, 'lowpass', 0.9)
        this.effects.burst(new THREE.Vector3(this.position.x, 0.1, this.position.z), 8, {
          spread: 2.2, life: 0.5, size: 0.32, color: 0xb19b7c, alpha: 0.5, gravity: 1.5
        })
      }
      this.position.y = 0
      this.velocity.y = 0
      this.onGround = true
    }
    if (this.position.y > MAX_ALTITUDE) {
      this.position.y = MAX_ALTITUDE
      this.velocity.y = Math.min(0, this.velocity.y)
    }

    if (this.flying) {
      this.resolveCollisions(oldX, oldZ)
    } else {
      this.resolveCollisions(oldX, oldZ)
    }
    this.position.x = THREE.MathUtils.clamp(this.position.x, -320, 320)
    this.position.z = THREE.MathUtils.clamp(this.position.z, -320, 320)

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    if (this.onGround && horizontalSpeed > 0.5) {
      this.walkBob += dt * horizontalSpeed * 1.65
    }
    const bob = this.onGround ? Math.sin(this.walkBob) * 0.035 * Math.min(1, horizontalSpeed / 8) : 0

    const rollTarget = this.flying ? -input.moveX * 0.085 : 0
    this.roll += (rollTarget - this.roll) * Math.min(1, 5 * dt)

    this.camera.position.set(this.position.x, this.position.y + EYE + bob, this.position.z)
    this.camera.rotation.set(this.pitch, this.yaw, this.roll)

    this.health = this.invincible ? 100 : this.health
    this.shield = this.invincible ? 100 : this.shield
  }

  resolveCollisions(oldX, oldZ) {
    const feet = this.position.y
    const head = feet + this.height
    for (const box of this.world.colliders) {
      if (box.max.y < feet + 0.15 || box.min.y > head) continue
      const minX = box.min.x - this.radius
      const maxX = box.max.x + this.radius
      const minZ = box.min.z - this.radius
      const maxZ = box.max.z + this.radius
      if (this.position.x < minX || this.position.x > maxX || this.position.z < minZ || this.position.z > maxZ) continue
      const dxLeft = this.position.x - minX
      const dxRight = maxX - this.position.x
      const dzBack = this.position.z - minZ
      const dzFront = maxZ - this.position.z
      const m = Math.min(dxLeft, dxRight, dzBack, dzFront)
      if (m === dxLeft) this.position.x = minX
      else if (m === dxRight) this.position.x = maxX
      else if (m === dzBack) this.position.z = minZ
      else this.position.z = maxZ
    }
  }
}
