import * as THREE from 'three'

const MAX_PARTICLES = 1800

export class Effects {
  constructor(scene) {
    this.scene = scene
    this.tracers = []
    this.rings = []
    this.flashes = []

    const geo = new THREE.BufferGeometry()
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.alphas = new Float32Array(MAX_PARTICLES)
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1))
    geo.setDrawRange(0, MAX_PARTICLES)
    this.geometry = geo

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (340.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.02, d);
          gl_FragColor = vec4(vColor, vAlpha * a);
        }
      `
    })
    this.points = new THREE.Points(geo, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 5
    scene.add(this.points)

    this.particles = []
    this.cursor = 0
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, gravity: -9, drag: 0.98,
        size: 0, color: new THREE.Color(), alpha: 0, active: false
      })
      this.sizes[i] = 0
      this.alphas[i] = 0
    }

    this.glowTexture = makeGlowTexture()
    this.ringGeo = new THREE.SphereGeometry(1, 24, 16)
  }

  spawn(position, opts = {}) {
    const p = this.particles[this.cursor]
    const i = this.cursor
    this.cursor = (this.cursor + 1) % MAX_PARTICLES
    const spread = opts.spread ?? 1
    const dir = opts.dir || null
    let vx = (Math.random() - 0.5) * spread
    let vy = (Math.random() - 0.5) * spread
    let vz = (Math.random() - 0.5) * spread
    if (dir) {
      vx = dir.x * (opts.speed ?? 1) + vx * 0.55
      vy = dir.y * (opts.speed ?? 1) + vy * 0.55
      vz = dir.z * (opts.speed ?? 1) + vz * 0.55
    }
    p.active = true
    p.life = p.maxLife = opts.life ?? 0.5
    p.vx = vx
    p.vy = vy
    p.vz = vz
    p.gravity = opts.gravity ?? -9
    p.drag = opts.drag ?? 0.98
    p.size = opts.size ?? 0.2
    p.alpha = opts.alpha ?? 1
    p.color.set(opts.color ?? 0xffb35c)
    this.positions[i * 3] = position.x
    this.positions[i * 3 + 1] = position.y
    this.positions[i * 3 + 2] = position.z
    this.colors[i * 3] = p.color.r
    this.colors[i * 3 + 1] = p.color.g
    this.colors[i * 3 + 2] = p.color.b
    this.sizes[i] = p.size
    this.alphas[i] = p.alpha
  }

  burst(position, count, opts = {}) {
    for (let i = 0; i < count; i++) this.spawn(position, opts)
  }

  impact(position, normal, color = 0xffc078, count = 9) {
    const dir = normal.clone().normalize()
    for (let i = 0; i < count; i++) {
      this.spawn(position, {
        dir,
        speed: 2.5 + Math.random() * 5,
        spread: 2.6,
        life: 0.22 + Math.random() * 0.32,
        size: 0.07 + Math.random() * 0.13,
        color,
        gravity: -12,
        drag: 0.93
      })
    }
    this.spawn(position, {
      dir, speed: 0.3, spread: 0.14, life: 0.1, size: 0.5, color: 0xffe1a8, gravity: 0, drag: 0.9
    })
  }

  explosion(position, color = 0xff7a3c, scale = 1) {
    for (let i = 0; i < 46 * scale; i++) {
      this.spawn(position, {
        spread: 9 * scale,
        life: 0.35 + Math.random() * 0.65,
        size: (0.16 + Math.random() * 0.45) * scale,
        color: Math.random() > 0.45 ? color : 0xffd27a,
        gravity: -4,
        drag: 0.955
      })
    }
    for (let i = 0; i < 14 * scale; i++) {
      this.spawn(position, {
        spread: 2.4 * scale,
        life: 0.5 + Math.random() * 0.8,
        size: (0.5 + Math.random() * 0.9) * scale,
        color: 0x5f5148,
        alpha: 0.5,
        gravity: 1.4,
        drag: 0.97
      })
    }
  }

  shieldPulse(position, color = 0x7ce7ff) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending,
      depthWrite: false, wireframe: true
    })
    const mesh = new THREE.Mesh(this.ringGeo, mat)
    mesh.position.copy(position)
    mesh.scale.setScalar(0.45)
    this.scene.add(mesh)
    this.rings.push({ mesh, life: 0.5, maxLife: 0.5 })
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    sprite.position.copy(position)
    sprite.scale.setScalar(2.4)
    this.scene.add(sprite)
    this.flashes.push({ sprite, life: 0.2, maxLife: 0.2 })
  }

  tracer(start, end, color = 0xffd79a, width = 1) {
    const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()])
    const mat = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false
    })
    const line = new THREE.Line(geo, mat)
    line.renderOrder = 4
    this.scene.add(line)
    this.tracers.push({ line, life: 0.085, maxLife: 0.085, width })
  }

  energyBoltTrail(position, color = 0xff6a4d) {
    this.spawn(position, {
      spread: 0.22, life: 0.34, size: 0.2, color, gravity: 0, drag: 0.94
    })
  }

  update(dt) {
    const pos = this.positions
    const col = this.colors
    const sizes = this.sizes
    const alphas = this.alphas
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i]
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        sizes[i] = 0
        alphas[i] = 0
        continue
      }
      p.vy += p.gravity * dt
      const drag = Math.pow(p.drag, dt * 60)
      p.vx *= drag
      p.vy *= drag
      p.vz *= drag
      pos[i * 3] += p.vx * dt
      pos[i * 3 + 1] += p.vy * dt
      pos[i * 3 + 2] += p.vz * dt
      const t = p.life / p.maxLife
      alphas[i] = p.alpha * Math.min(1, t * 2.4)
      sizes[i] = p.size * (0.45 + t * 0.85)
      col[i * 3] = p.color.r
      col[i * 3 + 1] = p.color.g
      col[i * 3 + 2] = p.color.b
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aColor.needsUpdate = true
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aAlpha.needsUpdate = true

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i]
      t.life -= dt
      t.line.material.opacity = Math.max(0, t.life / t.maxLife) * 0.95
      if (t.life <= 0) {
        this.scene.remove(t.line)
        t.line.geometry.dispose()
        t.line.material.dispose()
        this.tracers.splice(i, 1)
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]
      r.life -= dt
      const t = 1 - r.life / r.maxLife
      r.mesh.scale.setScalar(0.45 + t * 3.2)
      r.mesh.material.opacity = (1 - t) * 0.42
      if (r.life <= 0) {
        this.scene.remove(r.mesh)
        r.mesh.material.dispose()
        this.rings.splice(i, 1)
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]
      f.life -= dt
      const t = 1 - f.life / f.maxLife
      f.sprite.scale.setScalar(2.4 + t * 4)
      f.sprite.material.opacity = (1 - t) * 0.55
      if (f.life <= 0) {
        this.scene.remove(f.sprite)
        f.sprite.material.dispose()
        this.flashes.splice(i, 1)
      }
    }
  }
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}
