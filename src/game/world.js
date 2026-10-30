import * as THREE from 'three';
import { clamp, damp, mulberry32, solarState, smoothstep, terrainHeight } from './utils.js';
import { ParticleField } from './particles.js';

const TAU = Math.PI * 2;
const dummy = new THREE.Object3D();

function makeCanvasTexture(size, paint, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255, 228, 172, 1)');
  gradient.addColorStop(0.18, 'rgba(255, 148, 66, 0.82)');
  gradient.addColorStop(0.55, 'rgba(214, 70, 26, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(16, 14, 11, 0.8)';
  ctx.fillRect(8, 12, 496, 104);
  ctx.strokeStyle = 'rgba(225, 207, 164, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 18, 484, 92);
  ctx.font = '900 54px Impact, Arial Narrow, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d9c99f';
  ctx.fillText('SHELTER 7', 256, 65);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class World {
  constructor(scene, quality, audio) {
    this.scene = scene;
    this.quality = quality;
    this.audio = audio;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.colliders = [];
    this.barricades = [];
    this.resourceMeshes = [];
    this.trees = [];
    this.rocks = [];
    this.campfire = null;
    this.windowLight = null;
    this.campfireLight = null;
    this.lanternLight = null;
    this.stars = null;
    this.sky = null;
    this.emberTimer = 0;
    this.time = 16;
    this.random = mulberry32(0x7d4a11);
    this.debris = new ParticleField(scene, 180, THREE.NormalBlending);
    this.embers = new ParticleField(scene, 150, THREE.AdditiveBlending);
    this.smoke = new ParticleField(scene, 70, THREE.NormalBlending);
    this.fireflyTime = 0;
    this.textures = this.createTextures();
    this.materials = this.createMaterials();
    this.buildEnvironment();
    this.buildTerrain();
    this.buildCabin();
    this.buildTrees();
    this.buildRocks();
    this.buildGrass();
    this.buildFence();
    this.buildCampfire();
    this.buildProps();
    this.buildFireflies();
  }

  createTextures() {
    const wood = makeCanvasTexture(128, (ctx, size) => {
      ctx.fillStyle = '#5a3d27';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 11) {
        ctx.fillStyle = y % 22 === 0 ? 'rgba(22, 14, 8, 0.28)' : 'rgba(148, 100, 59, 0.16)';
        ctx.fillRect(0, y, size, 1);
        ctx.strokeStyle = 'rgba(32, 19, 10, 0.18)';
        ctx.beginPath();
        for (let x = 0; x <= size; x += 8) {
          ctx.lineTo(x, y + Math.sin(x * 0.11 + y) * 1.5);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 26; i += 1) {
        ctx.fillStyle = `rgba(28, 16, 8, ${0.08 + Math.random() * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0.7 + Math.random(), Math.random(), 0, TAU);
        ctx.fill();
      }
    }, 2, 1);

    const roof = makeCanvasTexture(128, (ctx, size) => {
      ctx.fillStyle = '#2c2924';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 16) {
        for (let x = -16; x < size; x += 24) {
          const offset = (y / 16) % 2 === 0 ? 0 : 12;
          ctx.fillStyle = `rgb(${42 + Math.random() * 18}, ${39 + Math.random() * 14}, ${33 + Math.random() * 10})`;
          ctx.fillRect(x + offset, y, 23, 14);
          ctx.strokeStyle = 'rgba(8, 8, 7, 0.4)';
          ctx.strokeRect(x + offset, y, 23, 14);
        }
      }
    }, 3, 2);

    const stone = makeCanvasTexture(96, (ctx, size) => {
      ctx.fillStyle = '#565b55';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 80; i += 1) {
        ctx.fillStyle = `rgba(${30 + Math.random() * 90}, ${32 + Math.random() * 90}, ${28 + Math.random() * 80}, ${0.1 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 5, 0, TAU);
        ctx.fill();
      }
    }, 2, 2);

    return { wood, roof, stone };
  }

  createMaterials() {
    return {
      wood: new THREE.MeshStandardMaterial({ map: this.textures.wood, color: 0xd1aa7b, roughness: 0.94, metalness: 0 }),
      woodDark: new THREE.MeshStandardMaterial({ map: this.textures.wood, color: 0x7c5b3a, roughness: 0.97, metalness: 0 }),
      roof: new THREE.MeshStandardMaterial({ map: this.textures.roof, color: 0xa79b8a, roughness: 0.95, metalness: 0.04 }),
      stone: new THREE.MeshStandardMaterial({ map: this.textures.stone, color: 0xa7aba0, roughness: 1, metalness: 0 }),
      stoneDark: new THREE.MeshStandardMaterial({ map: this.textures.stone, color: 0x73776e, roughness: 1 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x525c57, roughness: 0.66, metalness: 0.55 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x171716, roughness: 0.95 }),
      window: new THREE.MeshStandardMaterial({ color: 0xffb765, emissive: 0xff8736, emissiveIntensity: 2.2, roughness: 0.35 }),
      bark: new THREE.MeshStandardMaterial({ color: 0x5b402b, roughness: 1 }),
      pine: new THREE.MeshStandardMaterial({ color: 0x405731, roughness: 0.96, flatShading: true }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x657743, roughness: 0.95, flatShading: true }),
      rock: new THREE.MeshStandardMaterial({ color: 0x7d8278, roughness: 1, flatShading: true }),
      grass: new THREE.MeshStandardMaterial({ color: 0x71804a, roughness: 1, flatShading: true }),
      flameOuter: new THREE.MeshBasicMaterial({ color: 0xff5b20, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false }),
      flameInner: new THREE.MeshBasicMaterial({ color: 0xffd56e, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    };
  }

  buildEnvironment() {
    this.scene.fog = new THREE.FogExp2(0x9eb0ac, 0.022);

    const skyGeometry = new THREE.SphereGeometry(175, 24, 16);
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x2d4267) },
        horizonColor: { value: new THREE.Color(0xe2b48a) },
        sunColor: { value: new THREE.Color(0xffb16a) },
        sunDirection: { value: new THREE.Vector3(0.5, 0.2, 0.3).normalize() },
        sunIntensity: { value: 1 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform float sunIntensity;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float height = clamp(dir.y, 0.0, 1.0);
          vec3 color = mix(horizonColor, topColor, pow(height, 0.62));
          float sunDot = max(dot(dir, normalize(sunDirection)), 0.0);
          color += sunColor * pow(sunDot, 180.0) * 1.9 * sunIntensity;
          color += sunColor * pow(sunDot, 7.0) * 0.16 * sunIntensity;
          float haze = pow(1.0 - abs(dir.y), 9.0);
          color = mix(color, horizonColor, haze * 0.42);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    this.sky = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    const starCount = this.quality.stars;
    const positions = new Float32Array(starCount * 3);
    const random = mulberry32(0x51a77);
    for (let i = 0; i < starCount; i += 1) {
      const theta = random() * TAU;
      const phi = Math.acos(0.08 + random() * 0.92);
      const radius = 158 + random() * 8;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xdbe5ff,
      size: 0.72,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    });
    this.stars = new THREE.Points(starGeometry, this.starMaterial);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.scene.add(this.stars);

    this.hemi = new THREE.HemisphereLight(0x9eb7c7, 0x3b3524, 0.85);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x93a09c, 0.24);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffe0b2, 1.8);
    this.sun.position.set(22, 34, 16);
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0x7890b7, 0.26);
    this.fill.position.set(-20, 12, -18);
    this.scene.add(this.fill);
  }

  buildTerrain() {
    const size = 132;
    const segments = this.quality.terrainSegments;
    const half = size / 2;
    const step = size / segments;
    const positions = [];
    const colors = [];
    const color = new THREE.Color();
    const random = mulberry32(0x2a7c19);
    const grassDark = new THREE.Color(0x3d4c2b);
    const grassMid = new THREE.Color(0x56663a);
    const grassDry = new THREE.Color(0x716c45);
    const dirt = new THREE.Color(0x5c4a31);
    const rock = new THREE.Color(0x60635b);
    const moss = new THREE.Color(0x4a5d3a);

    const pushTriangle = (ax, ay, az, bx, by, bz, cx, cy, cz, tint, isRock) => {
      positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      for (let i = 0; i < 3; i += 1) colors.push(tint.r, tint.g, tint.b);
    };

    for (let iz = 0; iz < segments; iz += 1) {
      for (let ix = 0; ix < segments; ix += 1) {
        const x0 = -half + ix * step;
        const z0 = -half + iz * step;
        const x1 = x0 + step;
        const z1 = z0 + step;
        const h00 = terrainHeight(x0, z0);
        const h10 = terrainHeight(x1, z0);
        const h01 = terrainHeight(x0, z1);
        const h11 = terrainHeight(x1, z1);
        const cx = (x0 + x1) * 0.5;
        const cz = (z0 + z1) * 0.5;
        const average = (h00 + h10 + h01 + h11) * 0.25;
        const slope = Math.max(h00, h10, h01, h11) - Math.min(h00, h10, h01, h11);
        const distance = Math.hypot(cx, cz);
        const path = Math.abs(cx) < 2.25 && cz > 2.5 && cz < 19;
        const clearing = distance < 9.5;
        const variation = random();
        if (slope > 0.65) color.copy(rock).lerp(moss, variation * 0.24);
        else if (path || (clearing && variation < 0.45)) color.copy(dirt).lerp(grassDry, variation * 0.32);
        else if (average > 3.4) color.copy(moss).lerp(grassDark, variation * 0.4);
        else color.copy(grassDark).lerp(grassMid, variation).lerp(grassDry, variation * 0.22);
        color.multiplyScalar(0.9 + random() * 0.18);

        const isRock = slope > 0.65;
        pushTriangle(x0, h00, z0, x0, h01, z1, x1, h11, z1, color, isRock);
        const color2 = color.clone().multiplyScalar(0.94 + random() * 0.12);
        pushTriangle(x0, h00, z0, x1, h11, z1, x1, h10, z0, color2, isRock);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    this.terrain = mesh;
    this.group.add(mesh);
  }

  addBoxCollider(x, z, halfX, halfZ, tag = 'static') {
    this.colliders.push({
      minX: x - halfX,
      maxX: x + halfX,
      minZ: z - halfZ,
      maxZ: z + halfZ,
      tag
    });
  }

  buildCabin() {
    const baseY = terrainHeight(0, 0);
    const cabin = new THREE.Group();
    cabin.position.y = baseY;
    this.cabin = cabin;
    this.group.add(cabin);

    const box = (w, h, d, material, x, y, z, rotation = null) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      if (rotation) mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
      cabin.add(mesh);
      return mesh;
    };

    box(8.6, 0.35, 7.4, this.materials.stoneDark, 0, 0.17, 0);
    box(8.4, 3.2, 0.38, this.materials.wood, 0, 1.75, -3.5);
    box(0.38, 3.2, 7.4, this.materials.wood, -4.2, 1.75, 0);
    box(0.38, 3.2, 7.4, this.materials.wood, 4.2, 1.75, 0);
    box(3.05, 3.2, 0.38, this.materials.wood, -2.67, 1.75, 3.5);
    box(3.05, 3.2, 0.38, this.materials.wood, 2.67, 1.75, 3.5);
    box(2.3, 0.82, 0.38, this.materials.wood, 0, 2.83, 3.5);

    box(10.2, 0.3, 4.55, this.materials.roof, 0, 4.15, 2.06, { x: 0.26 });
    box(10.2, 0.3, 4.55, this.materials.roof, 0, 4.15, -2.06, { x: -0.26 });
    box(10.6, 0.22, 0.34, this.materials.woodDark, 0, 4.63, 0);
    box(0.85, 2.7, 0.85, this.materials.stone, -2.7, 4.35, -1.6);
    box(1.05, 0.2, 1.05, this.materials.stoneDark, -2.7, 5.72, -1.6);

    box(0.22, 2.5, 0.22, this.materials.woodDark, -1.2, 1.25, 3.54);
    box(0.22, 2.5, 0.22, this.materials.woodDark, 1.2, 1.25, 3.54);
    box(2.62, 0.2, 0.22, this.materials.woodDark, 0, 2.5, 3.54);

    const windowFrame = this.materials.woodDark;
    [-2.72, 2.72].forEach((x) => {
      box(1.24, 1.05, 0.12, windowFrame, x, 2.02, 3.7);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.8), this.materials.window);
      pane.position.set(x, 2.02, 3.77);
      cabin.add(pane);
      box(0.08, 0.8, 0.05, windowFrame, x, 2.02, 3.79);
      box(0.98, 0.07, 0.05, windowFrame, x, 2.02, 3.79);
    });

    box(6.1, 0.18, 2.6, this.materials.roof, 0, 3.34, 5.02, { x: 0.08 });
    box(0.22, 3.15, 0.22, this.materials.woodDark, -2.9, 1.58, 5.15);
    box(0.22, 3.15, 0.22, this.materials.woodDark, 2.9, 1.58, 5.15);
    box(0.28, 0.18, 2.5, this.materials.woodDark, -2.9, 2.1, 5.02);
    box(0.28, 0.18, 2.5, this.materials.woodDark, 2.9, 2.1, 5.02);

    box(2.2, 0.22, 0.9, this.materials.woodDark, 0, 0.28, 4.45);
    box(2.5, 0.22, 0.9, this.materials.woodDark, 0, 0.08, 5.02);

    box(2.3, 0.5, 1.35, this.materials.woodDark, -2.45, 0.45, -1.55);
    box(2.1, 0.18, 1.2, new THREE.MeshStandardMaterial({ color: 0x4f523b, roughness: 1 }), -2.45, 0.74, -1.55);
    box(1.6, 0.12, 0.8, this.materials.wood, -2.45, 0.86, -1.62);

    box(1.45, 0.8, 0.9, this.materials.woodDark, 2.5, 0.6, -1.5);
    box(1.7, 0.12, 1.15, this.materials.wood, 2.5, 1.04, -1.5);
    box(0.18, 1.2, 0.18, this.materials.woodDark, 3.2, 1.62, -1.5);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 0.52),
      new THREE.MeshBasicMaterial({ map: makeSignTexture(), transparent: true, depthWrite: false })
    );
    sign.position.set(0, 3.06, 3.78);
    cabin.add(sign);

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.2), this.materials.window);
    lantern.position.set(0, 2.85, 5.05);
    cabin.add(lantern);
    const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xff9b4e, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    lanternGlow.scale.set(1.4, 1.4, 1);
    lanternGlow.position.copy(lantern.position);
    cabin.add(lanternGlow);

    this.windowLight = new THREE.PointLight(0xff9a4d, 2.5, 13, 2);
    this.windowLight.position.set(0, 2.1, 2.2);
    cabin.add(this.windowLight);
    this.lanternLight = new THREE.PointLight(0xff7b32, 2.2, 8, 2);
    this.lanternLight.position.set(0, 2.75, 5.05);
    cabin.add(this.lanternLight);

    this.addBoxCollider(0, -3.5, 4.25, 0.24, 'cabin');
    this.addBoxCollider(-4.2, 0, 0.24, 3.75, 'cabin');
    this.addBoxCollider(4.2, 0, 0.24, 3.75, 'cabin');
    this.addBoxCollider(-2.67, 3.5, 1.57, 0.24, 'cabin');
    this.addBoxCollider(2.67, 3.5, 1.57, 0.24, 'cabin');
    this.addBoxCollider(-2.45, -1.55, 1.12, 0.64, 'furniture');
    this.addBoxCollider(2.5, -1.5, 0.75, 0.52, 'furniture');
  }

  placeTree(x, z, type, scale, rotation, index) {
    const y = terrainHeight(x, z);
    const trunkHeight = (type === 'pine' ? 3.1 : 2.9) * scale;
    const tree = {
      id: index,
      x,
      z,
      y,
      type,
      scale,
      rotation,
      hp: 3,
      alive: true,
      instances: []
    };
    const trunkMesh = type === 'pine' ? this.pineTrunks : this.broadleafTrunks;
    dummy.position.set(x, y + trunkHeight * 0.5, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(scale, trunkHeight / 3, scale);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(index, dummy.matrix);
    tree.instances.push({ mesh: trunkMesh, index, part: 'trunk', matrix: dummy.matrix.clone() });

    if (type === 'pine') {
      const lower = this.pineLower;
      dummy.position.set(x, y + 3.2 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(scale * 1.05, scale, scale * 1.05);
      dummy.updateMatrix();
      lower.setMatrixAt(index, dummy.matrix);
      tree.instances.push({ mesh: lower, index, part: 'canopy', matrix: dummy.matrix.clone() });

      const upper = this.pineUpper;
      dummy.position.set(x, y + 4.6 * scale, z);
      dummy.rotation.set(0, rotation + 0.4, 0);
      dummy.scale.set(scale * 0.72, scale * 0.9, scale * 0.72);
      dummy.updateMatrix();
      upper.setMatrixAt(index, dummy.matrix);
      tree.instances.push({ mesh: upper, index, part: 'canopy', matrix: dummy.matrix.clone() });
    } else {
      const canopy = this.broadleafCanopy;
      dummy.position.set(x, y + 3.55 * scale, z);
      dummy.rotation.set(0.2, rotation, 0.12);
      dummy.scale.set(scale * 1.32, scale * 1.05, scale * 1.2);
      dummy.updateMatrix();
      canopy.setMatrixAt(index, dummy.matrix);
      tree.instances.push({ mesh: canopy, index, part: 'canopy', matrix: dummy.matrix.clone() });
    }
    return tree;
  }

  buildTrees() {
    const count = this.quality.trees;
    const pineCount = Math.floor(count * 0.62);
    const broadCount = count - pineCount;
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 5);
    const lowerGeometry = new THREE.ConeGeometry(1.3, 3.5, 7);
    const upperGeometry = new THREE.ConeGeometry(1.05, 3.0, 7);
    const broadGeometry = new THREE.DodecahedronGeometry(1.45, 0);
    this.pineTrunks = new THREE.InstancedMesh(trunkGeometry, this.materials.bark, pineCount);
    this.broadleafTrunks = new THREE.InstancedMesh(trunkGeometry, this.materials.bark, broadCount);
    this.pineLower = new THREE.InstancedMesh(lowerGeometry, this.materials.pine, pineCount);
    this.pineUpper = new THREE.InstancedMesh(upperGeometry, this.materials.pine, pineCount);
    this.broadleafCanopy = new THREE.InstancedMesh(broadGeometry, this.materials.leaf, broadCount);

    const meshes = [this.pineTrunks, this.broadleafTrunks, this.pineLower, this.pineUpper, this.broadleafCanopy];
    meshes.forEach((mesh) => {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData.resourceType = 'tree';
      mesh.userData.instanceMap = new Map();
      mesh.frustumCulled = true;
      this.group.add(mesh);
      this.resourceMeshes.push(mesh);
    });

    const random = this.random;
    const positions = [];
    let created = 0;
    let guard = 0;
    while (created < count && guard < count * 40) {
      guard += 1;
      const angle = random() * TAU;
      const radius = 14 + Math.pow(random(), 0.72) * 43;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.abs(x) < 4.5 && z > 1 && z < 20) continue;
      if (positions.some((p) => Math.hypot(p.x - x, p.z - z) < 3.3)) continue;
      const type = created < pineCount ? 'pine' : 'broadleaf';
      const index = type === 'pine' ? created : created - pineCount;
      const scale = 0.78 + random() * 0.65;
      const rotation = random() * TAU;
      const tree = this.placeTree(x, z, type, scale, rotation, index);
      const tint = new THREE.Color().setHSL(0.24 + random() * 0.06, 0.22 + random() * 0.18, 0.72 + random() * 0.2);
      tree.instances.forEach(({ mesh }) => {
        if (mesh === this.pineLower || mesh === this.pineUpper || mesh === this.broadleafCanopy) mesh.setColorAt(index, tint);
        mesh.userData.instanceMap.set(index, tree);
      });
      this.trees.push(tree);
      positions.push({ x, z });
      created += 1;
    }

    meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }

  buildRocks() {
    const count = this.quality.rocks;
    const geometry = new THREE.DodecahedronGeometry(0.9, 0);
    this.rockMesh = new THREE.InstancedMesh(geometry, this.materials.rock, count);
    this.rockMesh.userData.resourceType = 'rock';
    this.rockMesh.userData.instanceMap = new Map();
    this.group.add(this.rockMesh);
    this.resourceMeshes.push(this.rockMesh);
    const random = this.random;
    let created = 0;
    let guard = 0;
    while (created < count && guard < count * 30) {
      guard += 1;
      const angle = random() * TAU;
      const radius = 11 + Math.pow(random(), 0.8) * 43;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.abs(x) < 3 && z > 2 && z < 19) continue;
      const y = terrainHeight(x, z);
      const scale = 0.45 + random() * 1.2;
      const rock = { id: created, x, z, y, scale, hp: 3, alive: true, instance: created, matrix: null };
      dummy.position.set(x, y + scale * 0.28, z);
      dummy.rotation.set(random() * 0.4, random() * TAU, random() * 0.35);
      dummy.scale.set(scale, scale * (0.55 + random() * 0.3), scale);
      dummy.updateMatrix();
      rock.matrix = dummy.matrix.clone();
      this.rockMesh.setMatrixAt(created, dummy.matrix);
      const tint = new THREE.Color().setHSL(0.1, 0.03 + random() * 0.04, 0.52 + random() * 0.2);
      this.rockMesh.setColorAt(created, tint);
      this.rockMesh.userData.instanceMap.set(created, rock);
      this.rocks.push(rock);
      created += 1;
    }
    this.rockMesh.instanceMatrix.needsUpdate = true;
    if (this.rockMesh.instanceColor) this.rockMesh.instanceColor.needsUpdate = true;
    this.rockMesh.computeBoundingSphere();
  }

  buildGrass() {
    const count = this.quality.grass;
    const geometry = new THREE.ConeGeometry(0.055, 0.52, 3);
    geometry.translate(0, 0.26, 0);
    this.grassMesh = new THREE.InstancedMesh(geometry, this.materials.grass, count);
    const random = mulberry32(0x19c4);
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const radius = 4.8 + Math.pow(random(), 0.65) * 50;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = terrainHeight(x, z);
      const scale = 0.65 + random() * 1.1;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, random() * TAU, (random() - 0.5) * 0.22);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(i, dummy.matrix);
      const tint = new THREE.Color().setHSL(0.2 + random() * 0.06, 0.25 + random() * 0.18, 0.38 + random() * 0.18);
      this.grassMesh.setColorAt(i, tint);
    }
    this.grassMesh.instanceMatrix.needsUpdate = true;
    if (this.grassMesh.instanceColor) this.grassMesh.instanceColor.needsUpdate = true;
    this.group.add(this.grassMesh);
  }

  buildFence() {
    const postGeometry = new THREE.BoxGeometry(0.16, 1.25, 0.16);
    const railGeometry = new THREE.BoxGeometry(1.8, 0.12, 0.1);
    const postXs = [-9.2, -7.4, -5.6, -3.8, 3.8, 5.6, 7.4, 9.2];
    const railPairs = [[-9.2, -7.4], [-7.4, -5.6], [-5.6, -3.8], [3.8, 5.6], [5.6, 7.4], [7.4, 9.2]];
    const posts = new THREE.InstancedMesh(postGeometry, this.materials.woodDark, postXs.length);
    const rails = new THREE.InstancedMesh(railGeometry, this.materials.woodDark, railPairs.length * 2);
    const random = mulberry32(0xf00d);
    postXs.forEach((x, i) => {
      const z = 10.8 + Math.sin(i * 1.7) * 0.35;
      const y = terrainHeight(x, z);
      dummy.position.set(x, y + 0.58, z);
      dummy.rotation.set(0, 0, (random() - 0.5) * 0.15);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
    });
    let railIndex = 0;
    railPairs.forEach(([a, b]) => {
      const x = (a + b) * 0.5;
      const z = 10.8 + Math.sin(x * 0.8) * 0.25;
      const y = terrainHeight(x, z);
      [0.42, 0.84].forEach((height) => {
        dummy.position.set(x, y + height, z);
        dummy.rotation.set(0, 0, (random() - 0.5) * 0.08);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rails.setMatrixAt(railIndex, dummy.matrix);
        railIndex += 1;
      });
    });
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    this.group.add(posts, rails);
  }

  buildCampfire() {
    const x = -6.2;
    const z = 6.5;
    const y = terrainHeight(x, z);
    const campfire = new THREE.Group();
    campfire.position.set(x, y, z);
    this.group.add(campfire);
    this.campfire = campfire;

    const stoneGeometry = new THREE.DodecahedronGeometry(0.25, 0);
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * TAU;
      const stone = new THREE.Mesh(stoneGeometry, this.materials.stoneDark);
      stone.position.set(Math.cos(angle) * 0.72, 0.15, Math.sin(angle) * 0.72);
      stone.scale.set(1, 0.65, 1);
      stone.rotation.set(0, angle, 0.15);
      campfire.add(stone);
    }
    const logGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 6);
    for (let i = 0; i < 3; i += 1) {
      const log = new THREE.Mesh(logGeometry, this.materials.bark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 3) * Math.PI;
      log.position.y = 0.22 + i * 0.04;
      campfire.add(log);
    }
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.31, 1.02, 5), this.materials.flameOuter);
    outer.position.y = 0.72;
    const outer2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.82, 5), this.materials.flameOuter);
    outer2.position.set(0.17, 0.62, -0.08);
    outer2.rotation.z = -0.12;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.62, 5), this.materials.flameInner);
    inner.position.y = 0.55;
    campfire.add(outer, outer2, inner);
    this.flameOuter = outer;
    this.flameOuter2 = outer2;
    this.flameInner = inner;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xff9a54, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(5.4, 5.4, 1);
    glow.position.y = 0.85;
    campfire.add(glow);
    this.fireGlow = glow;

    this.campfireLight = new THREE.PointLight(0xff6f2e, 5.5, 15, 2);
    this.campfireLight.position.set(0, 1.3, 0);
    campfire.add(this.campfireLight);
    this.campfireLightWorld = new THREE.Vector3(x, y + 1.2, z);
  }

  buildProps() {
    const random = mulberry32(0xbeef);
    const cratePositions = [
      [3.35, 6.1, 0.72],
      [-3.3, 6.6, 0.64],
      [2.7, -2.75, 0.54],
      [-4.9, 3.1, 0.5]
    ];
    cratePositions.forEach(([x, z, scale], index) => {
      const y = terrainHeight(x, z);
      const crate = new THREE.Group();
      crate.position.set(x, y, z);
      crate.rotation.y = random() * TAU;
      const body = new THREE.Mesh(new THREE.BoxGeometry(scale, scale, scale), this.materials.wood);
      body.position.y = scale * 0.5;
      crate.add(body);
      const bandMaterial = this.materials.metal;
      [-0.27, 0.27].forEach((offset) => {
        const band = new THREE.Mesh(new THREE.BoxGeometry(scale * 1.02, 0.045, scale * 1.02), bandMaterial);
        band.position.y = scale * (0.5 + offset);
        crate.add(band);
      });
      this.group.add(crate);
      if (index < 2) this.addBoxCollider(x, z, scale * 0.6, scale * 0.6, 'prop');
    });

    const barrelGeometry = new THREE.CylinderGeometry(0.38, 0.38, 1.05, 10);
    [[4.7, 4.4], [-4.7, 5.2]].forEach(([x, z]) => {
      const y = terrainHeight(x, z);
      const barrel = new THREE.Mesh(barrelGeometry, this.materials.metal);
      barrel.position.set(x, y + 0.52, z);
      barrel.rotation.y = random() * TAU;
      this.group.add(barrel);
      const ringMaterial = this.materials.dark;
      [0.28, -0.28].forEach((offset) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.025, 4, 12), ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y + 0.52 + offset, z);
        this.group.add(ring);
      });
      this.addBoxCollider(x, z, 0.45, 0.45, 'prop');
    });

    const stepGeometry = new THREE.CylinderGeometry(0.34, 0.39, 0.07, 7);
    for (let i = 0; i < 7; i += 1) {
      const z = 4.6 + i * 1.35;
      const x = Math.sin(i * 2.1) * 0.34;
      const y = terrainHeight(x, z);
      const stone = new THREE.Mesh(stepGeometry, this.materials.stone);
      stone.position.set(x, y + 0.02, z);
      stone.rotation.y = random() * TAU;
      this.group.add(stone);
    }

    const woodPile = new THREE.Group();
    const pileX = 5.4;
    const pileZ = 8.1;
    woodPile.position.set(pileX, terrainHeight(pileX, pileZ), pileZ);
    for (let i = 0; i < 5; i += 1) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 1.4, 5), this.materials.bark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (random() - 0.5) * 0.5;
      log.position.set((random() - 0.5) * 0.25, 0.18 + i * 0.22, (random() - 0.5) * 0.25);
      woodPile.add(log);
    }
    this.group.add(woodPile);
    this.addBoxCollider(pileX, pileZ, 0.8, 0.55, 'prop');

    const deadTree = new THREE.Group();
    const deadX = -10.5;
    const deadZ = 12.5;
    deadTree.position.set(deadX, terrainHeight(deadX, deadZ), deadZ);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 5.2, 5), this.materials.bark);
    trunk.position.y = 2.6;
    trunk.rotation.z = 0.12;
    deadTree.add(trunk);
    for (let i = 0; i < 4; i += 1) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.13, 2.0, 4), this.materials.bark);
      branch.position.set((random() - 0.5) * 0.7, 3.0 + random() * 1.5, (random() - 0.5) * 0.4);
      branch.rotation.set(random() * 1.1, random() * TAU, 0.6 + random() * 0.7);
      deadTree.add(branch);
    }
    this.group.add(deadTree);
  }

  buildFireflies() {
    const count = 42;
    const positions = new Float32Array(count * 3);
    const random = mulberry32(0x77aa);
    this.fireflyData = [];
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const radius = 8 + random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = terrainHeight(x, z) + 0.7 + random() * 2.6;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      this.fireflyData.push({ x, y, z, phase: random() * TAU, speed: 0.4 + random() * 0.8, radius: 0.3 + random() * 0.8 });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fireflyMaterial = new THREE.PointsMaterial({
      color: 0xd8e58b,
      size: 0.18,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.fireflies = new THREE.Points(geometry, this.fireflyMaterial);
    this.fireflies.frustumCulled = false;
    this.group.add(this.fireflies);
  }

  harvest(mesh, instanceId, damage = 1) {
    const type = mesh.userData.resourceType;
    const map = mesh.userData.instanceMap;
    if (!map || instanceId == null) return null;
    const resource = map.get(instanceId);
    if (!resource || !resource.alive) return null;
    resource.hp -= damage;
    const position = new THREE.Vector3(resource.x, resource.y + 1.2, resource.z);
    if (resource.hp > 0) return { type, killed: false, position, resource };
    resource.alive = false;
    if (type === 'tree') {
      resource.instances.forEach(({ mesh: target, index, part }) => {
        if (part === 'trunk') {
          dummy.position.set(resource.x, resource.y + 0.22, resource.z);
          dummy.rotation.set(0, resource.rotation, 0);
          dummy.scale.set(resource.scale, 0.16, resource.scale);
        } else {
          dummy.position.set(resource.x, -30, resource.z);
          dummy.scale.set(0.001, 0.001, 0.001);
        }
        dummy.updateMatrix();
        target.setMatrixAt(index, dummy.matrix);
        target.instanceMatrix.needsUpdate = true;
      });
      this.debris.spawn(position, 0x6c4a2e, { count: 16, speed: 3.2, size: 0.11, life: 0.8, gravity: -8 });
      this.debris.spawn(position, 0x8fae5f, { count: 10, speed: 2.6, size: 0.12, life: 0.7, gravity: -6 });
    } else {
      dummy.position.set(resource.x, -30, resource.z);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      this.rockMesh.setMatrixAt(resource.instance, dummy.matrix);
      this.rockMesh.instanceMatrix.needsUpdate = true;
      this.debris.spawn(position, 0x8c9086, { count: 15, speed: 3.4, size: 0.1, life: 0.9, gravity: -9 });
    }
    return { type, killed: true, position, resource };
  }

  createBarricade(position, yaw) {
    const group = new THREE.Group();
    const y = terrainHeight(position.x, position.z);
    group.position.set(position.x, y, position.z);
    group.rotation.y = yaw;
    const plankGeometry = new THREE.BoxGeometry(0.58, 1.8, 0.16);
    const plankMaterial = this.materials.wood;
    [-0.66, 0, 0.66].forEach((x) => {
      const plank = new THREE.Mesh(plankGeometry, plankMaterial);
      plank.position.set(x, 0.95, 0);
      plank.rotation.z = (Math.random() - 0.5) * 0.04;
      group.add(plank);
    });
    const brace = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.2, 0.18), this.materials.woodDark);
    brace.position.set(0, 1.15, 0.12);
    group.add(brace);
    const brace2 = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.2, 0.18), this.materials.woodDark);
    brace2.position.set(0, 0.5, 0.12);
    group.add(brace2);
    const postGeometry = new THREE.BoxGeometry(0.16, 2.2, 0.16);
    [-1.15, 1.15].forEach((x) => {
      const post = new THREE.Mesh(postGeometry, this.materials.woodDark);
      post.position.set(x, 0.9, -0.12);
      group.add(post);
    });
    this.group.add(group);
    const cos = Math.abs(Math.cos(yaw));
    const sin = Math.abs(Math.sin(yaw));
    const halfX = cos * 1.18 + sin * 0.18;
    const halfZ = sin * 1.18 + cos * 0.18;
    const collider = {
      minX: position.x - halfX,
      maxX: position.x + halfX,
      minZ: position.z - halfZ,
      maxZ: position.z + halfZ,
      tag: 'barricade'
    };
    this.colliders.push(collider);
    const barricade = {
      group,
      collider,
      x: position.x,
      z: position.z,
      y,
      hp: 100,
      maxHp: 100,
      radius: 1.25,
      alive: true
    };
    this.barricades.push(barricade);
    return barricade;
  }

  damageBarricade(barricade, damage) {
    if (!barricade.alive) return;
    barricade.hp -= damage;
    barricade.group.position.y += 0.018;
    barricade.group.rotation.z += 0.008;
    if (barricade.hp <= 0) {
      barricade.alive = false;
      this.group.remove(barricade.group);
      const index = this.colliders.indexOf(barricade.collider);
      if (index >= 0) this.colliders.splice(index, 1);
      const position = new THREE.Vector3(barricade.x, barricade.y + 0.7, barricade.z);
      this.debris.spawn(position, 0x7a5530, { count: 22, speed: 4, size: 0.12, life: 1.1, gravity: -9 });
    }
  }

  update(dt, time, cameraPosition, nightFactor) {
    this.time = time;
    const solar = solarState(time);
    const day = solar.dayFactor;
    const dusk = solar.duskFactor;
    const night = solar.nightFactor;

    const nightTop = new THREE.Color(0x070b18);
    const dayTop = new THREE.Color(0x4e86b8);
    const duskTop = new THREE.Color(0x393856);
    const nightHorizon = new THREE.Color(0x141d2d);
    const dayHorizon = new THREE.Color(0xbfd2cc);
    const duskHorizon = new THREE.Color(0xff7b43);

    const top = nightTop.clone().lerp(dayTop, day);
    top.lerp(duskTop, dusk * 0.28);
    const horizon = nightHorizon.clone().lerp(dayHorizon, day);
    horizon.lerp(duskHorizon, dusk * 0.86);
    const fogColor = horizon.clone().lerp(new THREE.Color(0x788b84), 0.18);

    this.skyMaterial.uniforms.topColor.value.copy(top);
    this.skyMaterial.uniforms.horizonColor.value.copy(horizon);
    this.skyMaterial.uniforms.sunColor.value.copy(new THREE.Color(0xffa45e).lerp(new THREE.Color(0xfff0c8), day * 0.7));
    this.skyMaterial.uniforms.sunDirection.value.set(solar.sunDirection.x, solar.sunDirection.y, solar.sunDirection.z).normalize();
    this.skyMaterial.uniforms.sunIntensity.value = 0.2 + day * 0.8 + dusk * 0.9;
    this.sky.position.copy(cameraPosition);
    this.stars.position.copy(cameraPosition);
    this.starMaterial.opacity = night * 0.95;
    this.stars.visible = night > 0.03;
    this.fireflies.position.set(0, 0, 0);
    this.fireflyMaterial.opacity = Math.max(0, night - 0.15) * 0.55;
    this.fireflies.visible = night > 0.12;

    if (this.scene.fog) {
      this.scene.fog.color.copy(fogColor);
      this.scene.fog.density = 0.032 - day * 0.017;
    }
    this.hemi.intensity = 0.32 + day * 1.12;
    this.hemi.color.copy(horizon).lerp(new THREE.Color(0x9bb9d0), 0.5);
    this.hemi.groundColor.set(0x3a3423);

    const sunAbove = solar.elevation > -0.03;
    const sunDir = new THREE.Vector3(solar.sunDirection.x, solar.sunDirection.y, solar.sunDirection.z).normalize();
    if (sunAbove) {
      this.sun.position.copy(sunDir).multiplyScalar(45);
      this.sun.intensity = 0.18 + day * 2.15;
      this.sun.color.copy(new THREE.Color(0xffa15c).lerp(new THREE.Color(0xfff2d2), day * 0.72));
      this.fill.intensity = 0.08 + day * 0.18;
    } else {
      this.sun.position.copy(sunDir).multiplyScalar(-45);
      this.sun.intensity = 0.18;
      this.sun.color.set(0x7b9ac5);
      this.fill.intensity = 0.05;
    }

    if (this.windowLight) this.windowLight.intensity = 1.1 + night * 5.4;
    if (this.lanternLight) this.lanternLight.intensity = 1.4 + night * 3.6;
    if (this.campfireLight) {
      const flicker = 0.88 + Math.sin(performance.now() * 0.013) * 0.08 + Math.sin(performance.now() * 0.031) * 0.05;
      this.campfireLight.intensity = (3.2 + night * 4.1) * flicker;
    }
    if (this.flameOuter) {
      const flicker = 0.9 + Math.sin(performance.now() * 0.019) * 0.08;
      this.flameOuter.scale.set(0.9 + flicker * 0.1, flicker, 0.9 + flicker * 0.1);
      this.flameOuter2.scale.set(0.92, 0.86 + Math.sin(performance.now() * 0.027) * 0.12, 0.92);
      this.flameOuter2.position.x = 0.17 + Math.sin(performance.now() * 0.011) * 0.035;
      this.flameInner.scale.set(0.9, 0.92 + Math.sin(performance.now() * 0.023) * 0.08, 0.9);
      this.fireGlow.material.opacity = 0.58 + flicker * 0.22;
    }

    this.emberTimer -= dt;
    if (this.emberTimer <= 0 && this.campfireLightWorld) {
      this.emberTimer = 0.075;
      this.embers.spawn(this.campfireLightWorld, 0xff8b3d, {
        count: 1,
        speed: 1.0,
        spread: 0.6,
        gravity: 0.6,
        size: 0.075,
        life: 1.1,
        upward: 0.8,
        drag: 0.97
      });
      if (Math.random() < 0.2) {
        this.smoke.spawn(new THREE.Vector3(this.campfireLightWorld.x, this.campfireLightWorld.y + 0.8, this.campfireLightWorld.z), 0x4a4842, {
          count: 1,
          speed: 0.3,
          spread: 0.3,
          gravity: 0.22,
          size: 0.35,
          life: 2.6,
          upward: 0.4,
          drag: 0.995
        });
      }
    }

    this.debris.update(dt);
    this.embers.update(dt);
    this.smoke.update(dt);
    this.updateFireflies(dt, time);
    this.audio?.update(night);
  }

  updateFireflies(dt, time) {
    if (!this.fireflies.visible) return;
    this.fireflyTime += dt;
    const positions = this.fireflies.geometry.attributes.position.array;
    for (let i = 0; i < this.fireflyData.length; i += 1) {
      const data = this.fireflyData[i];
      const offset = i * 3;
      positions[offset] = data.x + Math.cos(this.fireflyTime * data.speed + data.phase) * data.radius;
      positions[offset + 1] = data.y + Math.sin(this.fireflyTime * data.speed * 1.3 + data.phase) * 0.25;
      positions[offset + 2] = data.z + Math.sin(this.fireflyTime * data.speed + data.phase) * data.radius;
    }
    this.fireflies.geometry.attributes.position.needsUpdate = true;
  }

  reset() {
    for (const barricade of this.barricades) {
      this.group.remove(barricade.group);
      const index = this.colliders.indexOf(barricade.collider);
      if (index >= 0) this.colliders.splice(index, 1);
    }
    this.barricades.length = 0;
    for (const tree of this.trees) {
      tree.hp = 3;
      tree.alive = true;
      for (const entry of tree.instances) {
        entry.mesh.setMatrixAt(entry.index, entry.matrix);
        entry.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    for (const rock of this.rocks) {
      rock.hp = 3;
      rock.alive = true;
      if (rock.matrix) {
        this.rockMesh.setMatrixAt(rock.instance, rock.matrix);
        this.rockMesh.instanceMatrix.needsUpdate = true;
      }
    }
    this.emberTimer = 0;
  }

  lineBlocked(x1, z1, x2, z2) {
    const steps = 10;
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      for (const collider of this.colliders) {
        if (x > collider.minX && x < collider.maxX && z > collider.minZ && z < collider.maxZ) return true;
      }
    }
    return false;
  }

  isBlocked(x, z, radius, includeBarricades = true) {
    for (const collider of this.colliders) {
      if (!includeBarricades && collider.tag === 'barricade') continue;
      if (x + radius > collider.minX && x - radius < collider.maxX && z + radius > collider.minZ && z - radius < collider.maxZ) return true;
    }
    return false;
  }

  nearestBarricade(x, z, maxDistance = 3) {
    let best = null;
    let bestDistance = maxDistance;
    for (const barricade of this.barricades) {
      if (!barricade.alive) continue;
      const distance = Math.hypot(barricade.x - x, barricade.z - z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = barricade;
      }
    }
    return best;
  }
}
