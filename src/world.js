import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const TAU = Math.PI * 2

function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function canvasTexture(size, draw, repeat = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.anisotropy = 8
  return texture
}

function groundTexture() {
  const rand = seeded(8811)
  const map = canvasTexture(1024, (ctx, size) => {
    ctx.fillStyle = '#61594b'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 900; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 4 + rand() * 70
      const tone = 52 + Math.floor(rand() * 52)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${tone + 12},${tone + 7},${tone - 5},${0.06 + rand() * 0.1})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
    }
    for (let i = 0; i < 2400; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 0.5 + rand() * 2.6
      const tone = 30 + Math.floor(rand() * 80)
      ctx.fillStyle = `rgba(${tone},${tone - 3},${tone - 8},${0.18 + rand() * 0.45})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(32,28,22,0.32)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 80; i++) {
      let x = rand() * size
      let y = rand() * size
      ctx.beginPath()
      ctx.moveTo(x, y)
      const steps = 4 + Math.floor(rand() * 8)
      for (let j = 0; j < steps; j++) {
        x += (rand() - 0.5) * 42
        y += (rand() - 0.5) * 42
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    for (let i = 0; i < 110; i++) {
      const x = rand() * size
      const y = rand() * size
      ctx.strokeStyle = 'rgba(22,20,16,0.26)'
      ctx.lineWidth = 0.5 + rand()
      ctx.beginPath()
      ctx.arc(x, y, 8 + rand() * 30, 0, Math.PI * (0.6 + rand() * 1.2))
      ctx.stroke()
    }
  }, 22)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

function concreteTexture(seed = 5, repeat = 3) {
  const rand = seeded(seed)
  const map = canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#77746c'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 1800; i++) {
      const tone = 65 + Math.floor(rand() * 75)
      ctx.fillStyle = `rgba(${tone},${tone - 2},${tone - 6},${0.08 + rand() * 0.2})`
      const x = rand() * size
      const y = rand() * size
      ctx.beginPath()
      ctx.arc(x, y, 0.6 + rand() * 7, 0, TAU)
      ctx.fill()
    }
    for (let i = 0; i < 42; i++) {
      const x = rand() * size
      const y = rand() * size
      const h = 5 + rand() * 60
      const g = ctx.createLinearGradient(x, y, x, y + h)
      g.addColorStop(0, 'rgba(40,38,33,0.32)')
      g.addColorStop(1, 'rgba(40,38,33,0)')
      ctx.fillStyle = g
      ctx.fillRect(x, y, 1 + rand() * 4, h)
    }
    ctx.strokeStyle = 'rgba(35,33,29,0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i < 28; i++) {
      let x = rand() * size
      let y = rand() * size
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let j = 0; j < 6; j++) {
        x += (rand() - 0.5) * 34
        y += rand() * 22
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }, repeat)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

function metalTexture(seed = 9, repeat = 2) {
  const rand = seeded(seed)
  const map = canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#42494c'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 1200; i++) {
      const tone = 35 + Math.floor(rand() * 65)
      ctx.fillStyle = `rgba(${tone},${tone + 2},${tone + 1},${0.08 + rand() * 0.16})`
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 20, 0.5 + rand() * 1.6)
    }
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = `rgba(${70 + Math.floor(rand() * 30)},${45 + Math.floor(rand() * 20)},${30},${0.12 + rand() * 0.2})`
      ctx.beginPath()
      ctx.arc(rand() * size, rand() * size, 3 + rand() * 22, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(20,23,24,0.5)'
    for (let i = 0; i < 12; i++) ctx.fillRect(0, rand() * size, size, 1 + rand() * 2)
  }, repeat)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

function hazardTexture() {
  const rand = seeded(33)
  const map = canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#9a6a24'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#1e2223'
    for (let i = -size; i < size * 2; i += 96) {
      ctx.save()
      ctx.translate(i, 0)
      ctx.rotate(-0.42)
      ctx.fillRect(0, -size, 38, size * 3)
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(30,20,10,0.24)'
    for (let i = 0; i < 300; i++) ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 12, 1 + rand() * 3)
  }, 2)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}


function roadTexture() {
  const rand = seeded(191)
  const map = canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#3b3a35'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 2400; i++) {
      const tone = 36 + Math.floor(rand() * 46)
      ctx.fillStyle = `rgba(${tone},${tone - 1},${tone - 4},${0.16 + rand() * 0.4})`
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1 + rand() * 3)
    }
    for (let i = 0; i < 14; i++) {
      const g = ctx.createRadialGradient(rand() * size, rand() * size, 0, rand() * size, rand() * size, 40 + rand() * 80)
      g.addColorStop(0, 'rgba(15,14,12,0.18)')
      g.addColorStop(1, 'rgba(15,14,12,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
    }
    ctx.strokeStyle = 'rgba(23,22,19,0.55)'
    ctx.lineWidth = 1.1
    for (let i = 0; i < 20; i++) {
      let x = rand() * size
      let y = rand() * size
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let j = 0; j < 7; j++) {
        x += (rand() - 0.5) * 34
        y += 10 + rand() * 28
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(164,152,112,0.4)'
    for (let i = 0; i < 5; i++) {
      const y = i * 102 + 20
      ctx.fillRect(size / 2 - 3, y, 6, 58)
    }
    ctx.fillStyle = 'rgba(150,146,128,0.13)'
    ctx.fillRect(size * 0.08, 0, 3, size)
    ctx.fillRect(size * 0.92, 0, 3, size)
    ctx.fillStyle = 'rgba(18,17,15,0.4)'
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(0, 40 + i * 130, size, 2)
    }
  }, 1)
  map.repeat.set(1, 18)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTexture(128, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, inner)
    g.addColorStop(0.35, inner)
    g.addColorStop(1, outer)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }, 1)
}

function createSky() {
  const uniforms = {
    time: { value: 0 },
    topColor: { value: new THREE.Color('#08111d') },
    midColor: { value: new THREE.Color('#394a57') },
    horizonColor: { value: new THREE.Color('#c47a4e') },
    sunColor: { value: new THREE.Color('#ffc98f') },
    sunDirection: { value: new THREE.Vector3(0.42, 0.12, -0.9).normalize() }
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vDir;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float value = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amp * noise(p);
          p *= 2.02;
          amp *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, -0.12, 1.0);
        vec3 color = mix(horizonColor, midColor, smoothstep(-0.02, 0.32, h));
        color = mix(color, topColor, smoothstep(0.24, 0.92, h));

        float clouds = fbm(dir.xz * 2.3 / max(h + 0.35, 0.18) + vec2(time * 0.004, 0.0));
        clouds *= smoothstep(0.02, 0.42, h) * smoothstep(1.0, 0.55, h);
        color = mix(color, vec3(0.58, 0.53, 0.52), clouds * 0.34);

        float sun = max(dot(dir, sunDirection), 0.0);
        float disc = smoothstep(0.9992, 0.9998, sun);
        float glow = pow(sun, 26.0) * 0.55 + pow(sun, 180.0) * 0.9;
        color += sunColor * glow;
        color = mix(color, sunColor * 1.8, disc);

        float band = smoothstep(0.0, 0.13, abs(dir.y - 0.025));
        color = mix(horizonColor * 1.22, color, band);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 32), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -100
  return { mesh, uniforms }
}

function buildBuilding(group, ctx, x, z, w, d, h, rot, rand) {
  const base = new THREE.Group()
  base.position.set(x, 0, z)
  base.rotation.y = rot
  const wallMat = ctx.concrete
  const floors = Math.max(2, Math.round(h / 3.2))
  const wallThickness = 0.55

  const addWall = (px, pz, lw, ld, lh, py, damaged = false) => {
    const geo = new THREE.BoxGeometry(lw, lh, ld)
    const mesh = new THREE.Mesh(geo, wallMat)
    mesh.position.set(px, py + lh / 2, pz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    base.add(mesh)
    ctx.hitMeshes.push(mesh)
    if (Math.abs(px) < w / 2 && Math.abs(pz) < d / 2 && lh > 1.5) {
      const box = new THREE.Box3().setFromObject(mesh)
      ctx.colliders.push(box)
    }
    if (damaged) {
      for (let i = 0; i < 4; i++) {
        const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.4 + rand() * 1.4, 0.3 + rand() * 1.5, 0.4 + rand() * 1.2), wallMat)
        chunk.position.set(px + (rand() - 0.5) * lw, py + lh * (0.1 + rand() * 0.5), pz + (rand() - 0.5) * ld)
        chunk.rotation.set(rand(), rand() * 2, rand())
        chunk.castShadow = true
        base.add(chunk)
        ctx.hitMeshes.push(chunk)
      }
    }
  }

  for (let level = 0; level < floors; level++) {
    const py = level * 3.2
    const openings = []
    const cols = Math.max(2, Math.round(w / 3))
    for (let c = 0; c < cols; c++) openings.push((c + 0.5) / cols)
    const frontIntact = rand() > 0.28 || level === 0
    if (frontIntact) {
      const seg = w / cols
      for (let c = 0; c < cols; c++) {
        if (rand() > 0.22) {
          addWall(-w / 2 + seg * (c + 0.5), d / 2, seg * 0.92, wallThickness, 3.2, py, rand() < 0.18)
        }
      }
    }
    addWall(-w / 2, 0, wallThickness, d, 3.2, py, rand() < 0.25)
    addWall(w / 2, 0, wallThickness, d, 3.2, py, rand() < 0.25)
    addWall(0, -d / 2, w, wallThickness, 3.2, py, rand() < 0.3)
    for (let c = 0; c < cols; c++) {
      const seg = w / cols
      if (rand() > 0.42) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(seg * 0.95, 0.22, d * 0.94), ctx.concrete)
        slab.position.set(-w / 2 + seg * (c + 0.5), py + 3.15, 0)
        slab.castShadow = true
        slab.receiveShadow = true
        base.add(slab)
        ctx.hitMeshes.push(slab)
      }
    }
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), ctx.concrete)
  roof.position.y = floors * 3.2 + 0.18
  roof.castShadow = true
  roof.receiveShadow = true
  if (rand() > 0.55) {
    roof.scale.set(0.62 + rand() * 0.3, 1, 0.6 + rand() * 0.35)
    roof.position.x += (rand() - 0.5) * w * 0.2
    roof.position.z += (rand() - 0.5) * d * 0.2
  }
  base.add(roof)
  ctx.hitMeshes.push(roof)

  for (let i = 0; i < 5; i++) {
    const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8 + rand() * 1.7, 4), ctx.rebar)
    rebar.position.set((rand() - 0.5) * w * 0.9, floors * 3.2 + 0.6, (rand() - 0.5) * d * 0.9)
    rebar.rotation.z = (rand() - 0.5) * 0.7
    rebar.rotation.x = (rand() - 0.5) * 0.7
    base.add(rebar)
  }
  group.add(base)
  return base
}

function createContainer(group, ctx, x, z, rot, color) {
  const c = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ map: ctx.metalMap, color, roughness: 0.58, metalness: 0.55 })
  const geo = new THREE.BoxGeometry(6.2, 2.6, 2.5)
  const body = new THREE.Mesh(geo, mat)
  body.position.y = 1.3
  body.castShadow = true
  body.receiveShadow = true
  c.add(body)
  ctx.hitMeshes.push(body)
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x1e2427, roughness: 0.7, metalness: 0.4 })
  for (let i = -7; i <= 7; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.08), ribMat)
    rib.position.set(i * 0.41, 1.3, 1.27)
    c.add(rib)
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 2.2), ribMat)
  door.position.set(3.11, 1.25, 0)
  c.add(door)
  c.position.set(x, 0, z)
  c.rotation.y = rot
  group.add(c)
  const box = new THREE.Box3().setFromObject(c)
  ctx.colliders.push(box)
}

function createBarrier(group, ctx, x, z, rot) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 0.72), ctx.concrete)
  mesh.position.set(x, 0.575, z)
  mesh.rotation.y = rot
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  ctx.hitMeshes.push(mesh)
  ctx.colliders.push(new THREE.Box3().setFromObject(mesh))
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.22), new THREE.MeshStandardMaterial({ map: ctx.hazard, transparent: true, roughness: 0.9 }))
  stripe.position.set(0, 0.18, 0.371)
  mesh.add(stripe)
}

function createBarrel(group, ctx, x, z, rand) {
  const hazard = rand() > 0.62
  const mat = hazard
    ? new THREE.MeshStandardMaterial({ map: ctx.hazard, roughness: 0.72, metalness: 0.3 })
    : new THREE.MeshStandardMaterial({ color: 0x3e4b4b, roughness: 0.55, metalness: 0.65 })
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.25, 14), mat)
  barrel.position.set(x, 0.625, z)
  barrel.rotation.y = rand() * TAU
  barrel.castShadow = true
  barrel.receiveShadow = true
  group.add(barrel)
  ctx.hitMeshes.push(barrel)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 5, 16), ctx.darkMetal)
  rim.position.y = 0.34
  rim.rotation.x = Math.PI / 2
  barrel.add(rim)
  const rim2 = rim.clone()
  rim2.position.y = -0.34
  barrel.add(rim2)
  if (rand() > 0.55) barrel.rotation.z = Math.PI / 2
}

function createRock(group, ctx, x, z, scale, rand) {
  const geo = new THREE.DodecahedronGeometry(scale, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) * (0.72 + rand() * 0.5), pos.getY(i) * (0.55 + rand() * 0.4), pos.getZ(i) * (0.72 + rand() * 0.5))
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, ctx.rockMat)
  mesh.position.set(x, scale * 0.34, z)
  mesh.rotation.set(rand() * 0.5, rand() * TAU, rand() * 0.4)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  ctx.hitMeshes.push(mesh)
  if (scale > 1.4) {
    ctx.colliders.push(new THREE.Box3().setFromObject(mesh))
  }
}

function createDeadTree(group, ctx, x, z, scale, rand) {
  const tree = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.19 * scale, 3.4 * scale, 6), ctx.wood)
  trunk.position.y = 1.7 * scale
  trunk.rotation.z = (rand() - 0.5) * 0.22
  trunk.castShadow = true
  tree.add(trunk)
  for (let i = 0; i < 5; i++) {
    const len = (0.7 + rand() * 1.3) * scale
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale, 0.065 * scale, len, 5), ctx.wood)
    branch.position.set((rand() - 0.5) * 0.5 * scale, (1.7 + rand() * 1.5) * scale, (rand() - 0.5) * 0.5 * scale)
    branch.rotation.z = (rand() - 0.5) * 2
    branch.rotation.x = (rand() - 0.5) * 2
    branch.castShadow = true
    tree.add(branch)
  }
  tree.position.set(x, 0, z)
  group.add(tree)
  ctx.hitMeshes.push(trunk)
}

function createWatchtower(group, ctx, x, z) {
  const tower = new THREE.Group()
  const legMat = ctx.darkMetal
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 6), legMat)
    leg.position.set(sx * 1.1, 4.5, sz * 1.1)
    leg.rotation.z = -sx * 0.05
    leg.rotation.x = sz * 0.05
    leg.castShadow = true
    tower.add(leg)
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.24, 3.1), ctx.metal)
  deck.position.y = 8.7
  deck.castShadow = true
  tower.add(deck)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), ctx.metal)
  cabin.position.y = 9.57
  cabin.castShadow = true
  tower.add(cabin)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.62, 2.55), new THREE.MeshStandardMaterial({ color: 0x2c6e7c, emissive: 0x123c45, emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.7 }))
  glass.position.y = 9.75
  tower.add(glass)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.8, 4), ctx.metal)
  roof.position.y = 10.7
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  tower.add(roof)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.4, 4), legMat)
  antenna.position.y = 12.2
  tower.add(antenna)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5b4d }))
  beacon.position.y = 13.9
  tower.add(beacon)
  tower.position.set(x, 0, z)
  tower.rotation.y = 0.4
  group.add(tower)
  ctx.hitMeshes.push(deck, cabin)
  ctx.colliders.push(new THREE.Box3().setFromObject(cabin))
  return tower
}


function createCrate(group, ctx, x, z, scale, rot, rand) {
  const crate = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ map: ctx.metalMap, color: 0x6b5a43, roughness: 0.82, metalness: 0.18 })
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x2c3234, roughness: 0.6, metalness: 0.55 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.05, 1.2), bodyMat)
  body.position.y = 0.525
  body.castShadow = true
  body.receiveShadow = true
  crate.add(body)
  for (const sx of [-0.55, 0.55]) {
    for (const sz of [-0.55, 0.55]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.09), edgeMat)
      edge.position.set(sx, 0.525, sz)
      edge.castShadow = true
      crate.add(edge)
    }
  }
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 1.24), edgeMat)
  band.position.y = 0.54
  crate.add(band)
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshStandardMaterial({ map: ctx.hazard, transparent: true, roughness: 0.9 }))
  stripe.position.set(0, 0.62, 0.606)
  crate.add(stripe)
  crate.position.set(x, 0, z)
  crate.rotation.y = rot
  crate.scale.setScalar(scale)
  group.add(crate)
  crate.updateMatrixWorld(true)
  ctx.hitMeshes.push(body)
  ctx.colliders.push(new THREE.Box3().setFromObject(crate))
  return crate
}

function createSandbags(group, ctx, x, z, rot, length, rand) {
  const wall = new THREE.Group()
  const cloth = new THREE.MeshStandardMaterial({ color: 0x796b50, roughness: 0.95 })
  const clothDark = new THREE.MeshStandardMaterial({ color: 0x5d523e, roughness: 1 })
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < length; i++) {
      const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.46, 4, 8), row === 1 ? clothDark : cloth)
      const offset = row % 2 ? 0.25 : 0
      bag.position.set((i - length / 2) * 0.66 + offset, 0.2 + row * 0.27, (rand() - 0.5) * 0.12)
      bag.rotation.z = Math.PI / 2
      bag.rotation.y = (rand() - 0.5) * 0.16
      bag.scale.set(1, 1, 0.82 + rand() * 0.16)
      bag.castShadow = true
      bag.receiveShadow = true
      wall.add(bag)
    }
  }
  wall.position.set(x, 0, z)
  wall.rotation.y = rot
  group.add(wall)
  wall.updateMatrixWorld(true)
  for (const child of wall.children) ctx.hitMeshes.push(child)
  ctx.colliders.push(new THREE.Box3().setFromObject(wall))
}

function createWreck(group, ctx, x, z, rot) {
  const wreck = new THREE.Group()
  const burnt = new THREE.MeshStandardMaterial({ color: 0x2b2723, roughness: 0.92, metalness: 0.4 })
  const rust = new THREE.MeshStandardMaterial({ color: 0x5a3d2b, roughness: 0.88, metalness: 0.3 })
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 4.2), burnt)
  hull.position.y = 0.85
  hull.castShadow = true
  hull.receiveShadow = true
  wreck.add(hull)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 1.8), rust)
  cabin.position.set(0, 1.62, -0.55)
  cabin.rotation.x = -0.04
  cabin.castShadow = true
  wreck.add(cabin)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.2), burnt)
  hood.position.set(0, 1.25, 1.55)
  wreck.add(hood)
  for (const sx of [-1, 1]) {
    for (const sz of [-1.32, 1.32]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.34, 12), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }))
      wheel.position.set(sx * 1.03, 0.5, sz)
      wheel.rotation.z = Math.PI / 2
      wheel.castShadow = true
      wreck.add(wheel)
    }
  }
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.25), ctx.darkMetal)
  bumper.position.set(0, 0.55, 2.16)
  wreck.add(bumper)
  wreck.position.set(x, 0.15, z)
  wreck.rotation.set(0.06, rot, 0.09)
  group.add(wreck)
  wreck.updateMatrixWorld(true)
  ctx.hitMeshes.push(hull, cabin)
  ctx.colliders.push(new THREE.Box3().setFromObject(wreck))
}

function createFireBarrel(group, ctx, x, z, phase) {
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.46, 1.25, 14),
    new THREE.MeshStandardMaterial({ color: 0x262a29, roughness: 0.68, metalness: 0.55 })
  )
  barrel.position.set(x, 0.625, z)
  barrel.castShadow = true
  barrel.receiveShadow = true
  group.add(barrel)
  ctx.hitMeshes.push(barrel)

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7a2e, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false })
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 8), flameMat)
  flame.position.set(x, 1.36, z)
  group.add(flame)
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe1a3, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false })
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.58, 8), coreMat)
  core.position.set(x, 1.22, z)
  group.add(core)
  const light = new THREE.PointLight(0xff7a32, 9, 26, 2)
  light.position.set(x, 1.9, z)
  group.add(light)
  return { flame, core, light, phase, x, z }
}

function createDrone(group) {
  const drone = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), new THREE.MeshStandardMaterial({ color: 0x1c2224, roughness: 0.5, metalness: 0.7 }))
  drone.add(body)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 4, 16), new THREE.MeshBasicMaterial({ color: 0x2a3a40 }))
  ring.rotation.x = Math.PI / 2
  drone.add(ring)
  for (const sx of [-0.42, 0.42]) {
    for (const sz of [-0.42, 0.42]) {
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 10), new THREE.MeshBasicMaterial({ color: 0x111618, transparent: true, opacity: 0.55 }))
      rotor.position.set(sx, 0.07, sz)
      drone.add(rotor)
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff5b4d }))
      light.position.set(sx, 0.08, sz)
      drone.add(light)
    }
  }
  group.add(drone)
  return drone
}

export function createWorld(scene, renderer) {
  const rand = seeded(7421)
  const hitMeshes = []
  const colliders = []
  const group = new THREE.Group()
  scene.add(group)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture
  pmrem.dispose()

  const sky = createSky()
  scene.add(sky.mesh)
  scene.fog = new THREE.FogExp2(0x8a715d, 0.0038)

  const hemi = new THREE.HemisphereLight(0xa9c7df, 0x5e4631, 1.12)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffc994, 2.45)
  sun.position.set(64, 88, -92)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -95
  sun.shadow.camera.right = 95
  sun.shadow.camera.top = 95
  sun.shadow.camera.bottom = -95
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 260
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.025
  scene.add(sun)
  const rim = new THREE.DirectionalLight(0x6bb8d6, 0.72)
  rim.position.set(-70, 34, 80)
  scene.add(rim)
  const ambient = new THREE.AmbientLight(0x3b4a55, 0.4)
  scene.add(ambient)

  const gMap = groundTexture()
  const groundMat = new THREE.MeshStandardMaterial({
    map: gMap, bumpMap: gMap, bumpScale: 0.52, roughness: 1, metalness: 0.02, color: 0x93846d
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 760, 1, 1), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)
  hitMeshes.push(ground)

  const roadMap = roadTexture()
  const roadMat = new THREE.MeshStandardMaterial({ map: roadMap, bumpMap: roadMap, bumpScale: 0.12, roughness: 0.96, metalness: 0.02, color: 0xa39a8a })
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 210), roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0.016, -42)
  road.receiveShadow = true
  group.add(road)
  hitMeshes.push(road)

  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x4a4237, roughness: 1, transparent: true, opacity: 0.5 })
  const shoulderL = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 210), shoulderMat)
  shoulderL.rotation.x = -Math.PI / 2
  shoulderL.position.set(-6.3, 0.012, -42)
  group.add(shoulderL)
  const shoulderR = shoulderL.clone()
  shoulderR.position.x = 6.3
  group.add(shoulderR)

  const concreteMap = concreteTexture(5, 3)
  const metalMap = metalTexture(9, 2)
  const ctx = {
    hitMeshes,
    colliders,
    concrete: new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.92, metalness: 0.02, color: 0xa39b8e }),
    concreteDark: new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.95, color: 0x6d6960 }),
    metal: new THREE.MeshStandardMaterial({ map: metalMap, roughness: 0.48, metalness: 0.72 }),
    metalMap,
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x252c2f, roughness: 0.5, metalness: 0.78 }),
    rockMat: new THREE.MeshStandardMaterial({ color: 0x4a463f, roughness: 1, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.96 }),
    rebar: new THREE.MeshStandardMaterial({ color: 0x4b3a2d, roughness: 0.68, metalness: 0.72 }),
    hazard: hazardTexture()
  }

  buildBuilding(group, ctx, -17, -22, 15, 11, 11, -0.08, rand)
  buildBuilding(group, ctx, 21, -38, 11, 10, 13, 0.16, rand)
  buildBuilding(group, ctx, -38, 12, 9, 14, 8, 0.36, rand)
  buildBuilding(group, ctx, 34, 24, 13, 9, 7, -0.22, rand)
  buildBuilding(group, ctx, 3, -68, 22, 15, 10, 0.03, rand)

  createWatchtower(group, ctx, 28, 2)
  createContainer(group, ctx, -30, -4, 0.12, 0x3f5c57)
  createContainer(group, ctx, 12, 3, -0.18, 0x694633)
  createContainer(group, ctx, 7.6, 5, -0.18, 0x3d4a5e)
  createContainer(group, ctx, 17, -14, 1.42, 0x5f6744)
  createContainer(group, ctx, -7, -40, 0.08, 0x614d3c)

  createSandbags(group, ctx, -7.2, 24, 0.16, 5, rand)
  createSandbags(group, ctx, 8.4, 18, -0.4, 4, rand)
  createCrate(group, ctx, -8.5, 28, 0.9, 0.2, rand)
  createCrate(group, ctx, -8.2, 29.2, 0.7, -0.5, rand)
  createCrate(group, ctx, 10.6, 27, 1, -0.15, rand)
  createCrate(group, ctx, 11.4, 25.8, 0.75, 0.35, rand)
  createCrate(group, ctx, 2.8, 10.5, 0.85, 0.5, rand)
  createWreck(group, ctx, 15.5, 8.5, 0.62)

  for (let i = 0; i < 18; i++) {
    const angle = rand() * TAU
    const r = 16 + rand() * 55
    createBarrier(group, ctx, Math.cos(angle) * r, Math.sin(angle) * r - 10, rand() * TAU)
  }

  for (let i = 0; i < 34; i++) {
    const angle = rand() * TAU
    const r = 10 + rand() * 92
    createBarrel(group, ctx, Math.cos(angle) * r, Math.sin(angle) * r - 20, rand)
  }

  for (let i = 0; i < 80; i++) {
    const angle = rand() * TAU
    const r = 12 + rand() * 150
    const scale = 0.4 + rand() * 3.2
    createRock(group, ctx, Math.cos(angle) * r, Math.sin(angle) * r - 15, scale, rand)
  }

  for (let i = 0; i < 20; i++) {
    const angle = rand() * TAU
    const r = 18 + rand() * 100
    createDeadTree(group, ctx, Math.cos(angle) * r, Math.sin(angle) * r - 15, 0.8 + rand() * 1.1, rand)
  }

  const rubbleGeo = new THREE.IcosahedronGeometry(0.24, 0)
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x6b6458, roughness: 1, flatShading: true })
  const rubble = new THREE.InstancedMesh(rubbleGeo, rubbleMat, 600)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 600; i++) {
    const angle = rand() * TAU
    const r = 4 + rand() * 130
    dummy.position.set(Math.cos(angle) * r, rand() * 0.24, Math.sin(angle) * r - 15)
    dummy.rotation.set(rand() * TAU, rand() * TAU, rand() * TAU)
    const s = 0.45 + rand() * 1.6
    dummy.scale.set(s, s * (0.5 + rand() * 0.5), s)
    dummy.updateMatrix()
    rubble.setMatrixAt(i, dummy.matrix)
  }
  rubble.castShadow = true
  rubble.receiveShadow = true
  group.add(rubble)

  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 1, flatShading: true })
  const mountainMatFar = new THREE.MeshStandardMaterial({ color: 0x4b4e53, roughness: 1, flatShading: true })
  for (let i = 0; i < 34; i++) {
    const angle = (i / 34) * TAU + rand() * 0.08
    const r = 260 + rand() * 120
    const height = 32 + rand() * 62
    const radius = 24 + rand() * 38
    const geo = new THREE.ConeGeometry(radius, height, 5 + Math.floor(rand() * 3), 1)
    const pos = geo.attributes.position
    for (let j = 0; j < pos.count; j++) {
      if (pos.getY(j) < height / 2 - 1) {
        pos.setX(j, pos.getX(j) * (0.8 + rand() * 0.4))
        pos.setZ(j, pos.getZ(j) * (0.8 + rand() * 0.4))
      }
    }
    geo.computeVertexNormals()
    const mountain = new THREE.Mesh(geo, r > 330 ? mountainMatFar : mountainMat)
    mountain.position.set(Math.cos(angle) * r, height / 2 - 2.5, Math.sin(angle) * r - 25)
    mountain.rotation.y = rand() * TAU
    group.add(mountain)
  }

  const glow = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)')
  const dustCount = 1200
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (rand() - 0.5) * 260
    dustPositions[i * 3 + 1] = rand() * 55
    dustPositions[i * 3 + 2] = (rand() - 0.5) * 260 - 20
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.28, map: glow, transparent: true, opacity: 0.42, depthWrite: false,
    color: 0xd8c2a8, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }))
  group.add(dust)

  const embers = []
  const emberGeo = new THREE.BufferGeometry()
  const emberPositions = new Float32Array(120 * 3)
  for (let i = 0; i < 120; i++) {
    emberPositions[i * 3] = (rand() - 0.5) * 90
    emberPositions[i * 3 + 1] = rand() * 18
    emberPositions[i * 3 + 2] = (rand() - 0.5) * 90 - 25
    embers.push({ speed: 0.3 + rand() * 0.7, phase: rand() * TAU })
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
  const emberPoints = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    size: 0.13, map: glow, transparent: true, opacity: 0.75, depthWrite: false,
    color: 0xff9a55, blending: THREE.AdditiveBlending
  }))
  group.add(emberPoints)

  const smokeTex = radialTexture('rgba(90,80,74,0.85)', 'rgba(70,62,58,0)')
  const smokeSprites = []
  for (let i = 0; i < 5; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, color: 0x796d65, transparent: true, opacity: 0.38, depthWrite: false
    }))
    const angle = rand() * TAU
    const r = 90 + rand() * 90
    sprite.position.set(Math.cos(angle) * r, 18 + rand() * 25, Math.sin(angle) * r - 20)
    const scale = 26 + rand() * 36
    sprite.scale.set(scale, scale, 1)
    group.add(sprite)
    smokeSprites.push({ sprite, speed: 0.25 + rand() * 0.4, phase: rand() * TAU, baseY: sprite.position.y })
  }

  const fires = [
    createFireBarrel(group, ctx, -4.2, 17.2, 0.4),
    createFireBarrel(group, ctx, 6.2, 13.5, 1.3),
    createFireBarrel(group, ctx, -11.5, -4.5, 2.1),
    createFireBarrel(group, ctx, 23.5, -26, 3.4),
    createFireBarrel(group, ctx, -33, -33, 4.4)
  ]
  const fireSmoke = []
  for (const fire of fires) {
    for (let i = 0; i < 2; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: smokeTex, color: 0x4d4540, transparent: true, opacity: 0.3 + i * 0.08, depthWrite: false
      }))
      const scale = 2.6 + i * 1.8
      sprite.scale.set(scale, scale, 1)
      sprite.position.set(fire.x + (rand() - 0.5) * 0.4, 2.4 + i * 2.2, fire.z + (rand() - 0.5) * 0.4)
      group.add(sprite)
      fireSmoke.push({ sprite, fire, baseY: sprite.position.y, phase: rand() * TAU })
    }
  }

  const drones = []
  for (let i = 0; i < 2; i++) {
    const drone = createDrone(group)
    drones.push({
      drone,
      radius: 62 + i * 24,
      height: 26 + i * 11,
      speed: 0.055 + i * 0.02,
      phase: i * 2.7
    })
  }

  const searchlight = new THREE.SpotLight(0xc6e8ff, 260, 190, 0.17, 0.55, 1.3)
  searchlight.position.set(28, 11, 2)
  searchlight.target.position.set(4, 0, -24)
  scene.add(searchlight)
  scene.add(searchlight.target)

  return {
    group,
    sun,
    sky,
    colliders,
    hitMeshes,
    ground,
    update(dt) {
      sky.mesh.position.copy(scene.userData.cameraPosition || new THREE.Vector3())
      sky.uniforms.time.value += dt
      const t = performance.now() / 1000
      for (let i = 0; i < dustCount; i++) {
        let x = dustPositions[i * 3]
        let y = dustPositions[i * 3 + 1]
        const z = dustPositions[i * 3 + 2]
        x += dt * 0.8
        y += Math.sin(t * 0.4 + i) * dt * 0.05
        if (x > 130) x = -130
        dustPositions[i * 3] = x
        dustPositions[i * 3 + 1] = y
      }
      dustGeo.attributes.position.needsUpdate = true
      for (let i = 0; i < 120; i++) {
        const e = embers[i]
        let x = emberPositions[i * 3]
        let y = emberPositions[i * 3 + 1]
        y += dt * e.speed
        x += Math.sin(t * 0.5 + e.phase) * dt * 0.25
        if (y > 20) y = 0
        emberPositions[i * 3] = x
        emberPositions[i * 3 + 1] = y
        emberPositions[i * 3 + 2] += dt * 0.15
        if (emberPositions[i * 3 + 2] > 85) emberPositions[i * 3 + 2] = -70
      }
      emberGeo.attributes.position.needsUpdate = true
      for (const s of smokeSprites) {
        s.sprite.position.y = s.baseY + Math.sin(t * 0.18 + s.phase) * 2.2
        s.sprite.material.opacity = 0.3 + Math.sin(t * 0.25 + s.phase) * 0.07
      }
      for (const fire of fires) {
        const flick = 0.82 + Math.sin(t * 9 + fire.phase) * 0.1 + Math.sin(t * 23 + fire.phase) * 0.06
        fire.flame.scale.set(flick, 0.9 + Math.sin(t * 7 + fire.phase) * 0.14, flick)
        fire.flame.rotation.y = t * 1.8 + fire.phase
        fire.core.scale.set(0.9 + Math.sin(t * 11 + fire.phase) * 0.1, 0.9 + Math.sin(t * 15 + fire.phase) * 0.16, 0.9)
        fire.light.intensity = 8 + Math.sin(t * 13 + fire.phase) * 2 + Math.sin(t * 31 + fire.phase) * 1.2
      }
      for (const s of fireSmoke) {
        const rise = ((t * 0.5 + s.phase) % 5)
        s.sprite.position.y = s.baseY + rise
        const scale = 2.2 + rise * 0.8
        s.sprite.scale.set(scale, scale, 1)
        s.sprite.material.opacity = Math.max(0, 0.34 * (1 - rise / 5))
      }
      for (const d of drones) {
        const a = t * d.speed + d.phase
        d.drone.position.set(Math.cos(a) * d.radius, d.height + Math.sin(t * 0.5 + d.phase) * 1.5, Math.sin(a) * d.radius - 25)
        d.drone.rotation.y = -a
        d.drone.rotation.z = Math.sin(t * 0.7 + d.phase) * 0.08
      }
      const sweep = t * 0.22
      searchlight.target.position.set(Math.cos(sweep) * 52, 0, -22 + Math.sin(sweep) * 52)
    }
  }
}
