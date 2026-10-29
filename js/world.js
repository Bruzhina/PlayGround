import * as THREE from 'three';

function canvas2d(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function makeSandTexture() {
  const canvas = canvas2d(512);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c3a97c';
  ctx.fillRect(0, 0, 512, 512);
  const image = ctx.getImageData(0, 0, 512, 512);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 34;
    const warm = Math.random() * 12;
    data[i] = Math.max(0, Math.min(255, data[i] + grain + warm));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain + warm * 0.6));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 1.8 + 0.3;
    ctx.fillStyle = `rgba(${90 + Math.random() * 50}, ${74 + Math.random() * 40}, ${50 + Math.random() * 30}, ${0.12 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(120, 100, 70, ${0.04 + Math.random() * 0.06})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 6 + (Math.random() - 0.5) * 4);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(30, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeConcreteTexture() {
  const canvas = canvas2d(256);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8e8d80';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const shade = 100 + Math.random() * 70;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade * 0.94}, ${0.05 + Math.random() * 0.14})`;
    const size = 1 + Math.random() * 12;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, size, size * (0.4 + Math.random()));
  }
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = `rgba(45, 44, 38, ${0.12 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.6 + Math.random();
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 34;
      y += Math.random() * 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSmokeTexture() {
  const canvas = canvas2d(128);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.4, 'rgba(220,220,220,0.4)');
  gradient.addColorStop(1, 'rgba(200,200,200,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) {
    const x = 24 + Math.random() * 80;
    const y = 24 + Math.random() * 80;
    const r = 8 + Math.random() * 22;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFlashTexture() {
  const canvas = canvas2d(128);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,235,1)');
  gradient.addColorStop(0.18, 'rgba(255,214,130,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,130,40,0.28)');
  gradient.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,240,200,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 64);
  ctx.lineTo(118, 64);
  ctx.moveTo(64, 10);
  ctx.lineTo(64, 118);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class World {
  constructor(scene, renderer, quality = 'auto') {
    this.scene = scene;
    this.renderer = renderer;
    this.quality = quality;
    this.colliders = [];
    this.smoke = [];
    this.flashes = [];
    this.elapsed = 0;
    this.flashTimer = 5;
    this.sandTexture = makeSandTexture();
    this.concreteTexture = makeConcreteTexture();
    this.smokeTexture = makeSmokeTexture();
    this.flashTexture = makeFlashTexture();
    this.build();
  }

  build() {
    const scene = this.scene;
    const sunDir = new THREE.Vector3(-0.55, 0.19, -0.81).normalize();
    this.sunDir = sunDir;

    scene.fog = new THREE.FogExp2(0x9aa8a2, 0.0038);

    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x4b6f93) },
        uMid: { value: new THREE.Color(0x9db3bd) },
        uBottom: { value: new THREE.Color(0xe6c39a) },
        uSun: { value: sunDir.clone() },
        uSunColor: { value: new THREE.Color(0xffd9a0) }
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uBottom;
        uniform vec3 uSun;
        uniform vec3 uSunColor;
        varying vec3 vWorld;
        void main() {
          vec3 dir = normalize(vWorld);
          float h = clamp(dir.y, -1.0, 1.0);
          vec3 color = mix(uBottom, uMid, smoothstep(-0.02, 0.22, h));
          color = mix(color, uTop, smoothstep(0.14, 0.82, h));
          float sun = max(dot(dir, uSun), 0.0);
          color += uSunColor * pow(sun, 900.0) * 3.2;
          color += uSunColor * pow(sun, 18.0) * 0.28;
          color += uSunColor * pow(sun, 4.0) * 0.06;
          float haze = pow(1.0 - max(h, 0.0), 7.0);
          color = mix(color, uBottom, haze * 0.5);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 24), skyMaterial);
    sky.frustumCulled = false;
    sky.renderOrder = -20;
    scene.add(sky);

    const hemi = new THREE.HemisphereLight(0xc4d6e2, 0x6b5a3c, 1.15);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe0b0, 2.7);
    sun.position.copy(sunDir).multiplyScalar(120);
    sun.target.position.set(0, 0, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 52;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 240;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;

    const ambientFill = new THREE.DirectionalLight(0x6f88a0, 0.35);
    ambientFill.position.set(40, 30, 40);
    scene.add(ambientFill);

    this.buildBeach();
    this.buildOcean(sunDir);
    this.buildParapet();
    this.buildForeground();
    this.buildBunkers();
    this.buildHedgehogs();
    this.buildBoats();
    this.buildWire();
    this.buildCliffs();
    this.buildDistantFleet();
    this.buildSmoke();
    this.buildDebris();
    this.buildSunGlow(sunDir);
  }

  buildBeach() {
    const geometry = new THREE.PlaneGeometry(380, 80, 72, 24);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const edge = Math.min(1, Math.max(0, (Math.abs(x) - 40) / 70));
      const bump = Math.sin(x * 0.22 + z * 0.17) * 0.16 + Math.sin(x * 0.07 - z * 0.11) * 0.28;
      position.setY(i, bump * (0.35 + edge) + edge * edge * 1.6 * (0.5 + Math.sin(x * 0.05 + z * 0.03)));
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      map: this.sandTexture,
      color: 0xffffff,
      roughness: 1,
      metalness: 0
    });
    const beach = new THREE.Mesh(geometry, material);
    beach.position.set(0, 0, 32);
    beach.receiveShadow = true;
    this.scene.add(beach);
    this.beach = beach;
    this.colliders.push(beach);

    const wetMaterial = new THREE.MeshStandardMaterial({
      color: 0x7d6c52,
      roughness: 0.42,
      metalness: 0.08,
      transparent: true,
      opacity: 0.85
    });
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(380, 8), wetMaterial);
    wet.rotation.x = -Math.PI / 2;
    wet.position.set(0, 0.03, -4.5);
    wet.receiveShadow = true;
    this.scene.add(wet);

    const foamMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8ddd6,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(380, 3.2), foamMaterial);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, 0.06, -8.4);
    this.scene.add(foam);
    this.foam = foam;
  }

  buildOcean(sunDir) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSun: { value: sunDir.clone() },
        uShoreZ: { value: -8.0 },
        uFogColor: { value: new THREE.Color(0x9aa8a2) },
        uFogDensity: { value: 0.0026 }
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSun;
        uniform float uShoreZ;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        varying vec3 vWorld;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec2 p = vWorld.xz;
          float t = uTime;
          float w1 = sin(p.x * 0.18 + t * 1.25) * 0.5 + sin(p.y * 0.23 - t * 0.85) * 0.5 + sin((p.x - p.y) * 0.11 + t * 0.6);
          float w2 = sin(p.x * 0.47 - t * 1.7) * 0.5 + sin(p.y * 0.39 + t * 1.05) * 0.5;
          vec3 n = normalize(vec3(w1 * 0.11 + w2 * 0.05, 1.0, w1 * 0.09 - w2 * 0.045));
          vec3 viewDir = normalize(cameraPosition - vWorld);
          float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
          vec3 deep = vec3(0.035, 0.115, 0.145);
          vec3 shallow = vec3(0.14, 0.29, 0.31);
          vec3 color = mix(deep, shallow, 0.5 + 0.5 * w1 * 0.35);
          color = mix(color, vec3(0.52, 0.63, 0.66), fresnel * 0.55);
          vec3 halfVec = normalize(normalize(uSun) + viewDir);
          float spec = pow(max(dot(n, halfVec), 0.0), 160.0);
          color += vec3(1.0, 0.83, 0.56) * spec * 1.7;
          float shore = 1.0 - smoothstep(0.0, 12.0, abs(vWorld.z - uShoreZ));
          float foamNoise = noise(p * 0.55 + vec2(0.0, t * 0.35));
          float foam = shore * smoothstep(0.38, 0.72, foamNoise + 0.18 * sin(p.x * 0.65 + t * 2.0));
          color = mix(color, vec3(0.87, 0.9, 0.88), clamp(foam, 0.0, 1.0) * 0.85);
          float dist = distance(cameraPosition, vWorld);
          float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
          color = mix(color, uFogColor, clamp(fog, 0.0, 1.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1000, 560, 1, 1), material);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.62, -280);
    this.scene.add(ocean);
    this.ocean = ocean;
    this.oceanMaterial = material;
    this.colliders.push(ocean);
  }

  buildParapet() {
    const bagGeometry = new THREE.CapsuleGeometry(0.21, 0.44, 3, 8);
    bagGeometry.rotateZ(Math.PI / 2);
    const bagMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8a377,
      roughness: 0.96,
      metalness: 0
    });
    const matrices = [];
    const dummy = new THREE.Object3D();
    const addBag = (x, y, z, rot, scale = 1) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rot, (Math.random() - 0.5) * 0.18);
      dummy.scale.set(scale * (0.9 + Math.random() * 0.22), scale * (0.92 + Math.random() * 0.16), scale);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    };
    for (let row = 0; row < 3; row++) {
      const y = 0.2 + row * 0.34;
      const offset = row % 2 === 0 ? 0 : 0.24;
      for (let x = -13.5; x <= 13.5; x += 0.48) {
        addBag(x + offset, y, 8.2 + (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.3);
      }
    }
    for (let row = 0; row < 3; row++) {
      const y = 0.2 + row * 0.34;
      for (let z = 8.6; z <= 20; z += 0.48) {
        addBag(-11.4 + (Math.random() - 0.5) * 0.14, y, z, Math.PI / 2 + (Math.random() - 0.5) * 0.2);
        addBag(11.4 + (Math.random() - 0.5) * 0.14, y, z, Math.PI / 2 + (Math.random() - 0.5) * 0.2);
      }
    }
    const mesh = new THREE.InstancedMesh(bagGeometry, bagMaterial, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.colliders.push(mesh);
    this.parapet = mesh;

    const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4630, roughness: 0.92 });
    const plank = new THREE.Mesh(new THREE.BoxGeometry(26.4, 0.12, 0.52), plankMaterial);
    plank.position.set(0, 1.12, 8.2);
    plank.castShadow = true;
    plank.receiveShadow = true;
    this.scene.add(plank);
    this.colliders.push(plank);

    const wood = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3d36, roughness: 0.6, metalness: 0.5 });
    const crate = (x, z, rot) => {
      const group = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.62), wood);
      box.position.y = 0.31;
      box.castShadow = true;
      box.receiveShadow = true;
      group.add(box);
      for (const side of [-1, 1]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.66), metal);
        band.position.set(side * 0.28, 0.31, 0);
        group.add(band);
      }
      group.position.set(x, 0, z);
      group.rotation.y = rot;
      this.scene.add(group);
    };
    crate(-6.4, 13.2, 0.3);
    crate(-5.4, 13.5, 0.1);
    crate(6.8, 16.8, -0.5);
    crate(5.9, 17.2, 0.8);

    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4c4030, roughness: 0.95 });
    for (const [x, z] of [[-12.5, 6], [12.5, 6], [-12.5, 14], [12.5, 14]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.9, 6), postMaterial);
      post.position.set(x, 0.95, z);
      post.castShadow = true;
      this.scene.add(post);
    }
  }

  buildForeground() {
    const bagGeometry = new THREE.CapsuleGeometry(0.21, 0.44, 3, 8);
    bagGeometry.rotateZ(Math.PI / 2);
    const bagMaterial = new THREE.MeshStandardMaterial({ color: 0xa89468, roughness: 0.96 });
    const positions = [
      [-7.6, 0.22, 11.2, 0.2], [-6.9, 0.22, 11.6, -0.3], [-6.1, 0.22, 12.1, 0.5],
      [-7.2, 0.58, 11.4, 0.1], [-6.4, 0.58, 11.9, -0.2], [-5.6, 0.22, 12.6, 0.7],
      [-4.7, 0.22, 13.1, -0.4], [-3.9, 0.22, 13.4, 0.2]
    ];
    for (const [x, y, z, rot] of positions) {
      const bag = new THREE.Mesh(bagGeometry, bagMaterial);
      bag.position.set(x, y, z);
      bag.rotation.set(0, rot, (Math.random() - 0.5) * 0.15);
      bag.castShadow = true;
      bag.receiveShadow = true;
      this.scene.add(bag);
      this.colliders.push(bag);
    }

    const wood = new THREE.MeshStandardMaterial({ color: 0x59442d, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x353a33, roughness: 0.55, metalness: 0.5 });
    const crate = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.95), wood);
    box.position.y = 0.275;
    box.castShadow = true;
    box.receiveShadow = true;
    crate.add(box);
    for (const side of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.57, 1), metal);
      band.position.set(side * 0.44, 0.275, 0);
      crate.add(band);
    }
    crate.position.set(-4.3, 0, 11.3);
    crate.rotation.y = 0.24;
    this.scene.add(crate);
    this.colliders.push(box);

    const radio = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.3), metal);
    body.position.y = 0.72;
    body.castShadow = true;
    radio.add(body);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1d17, roughness: 0.7 }));
    face.position.set(0, 0.74, 0.16);
    radio.add(face);
    const dial = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8b46a, emissive: 0x6a4a12, emissiveIntensity: 0.8 }));
    dial.position.set(0.08, 0.76, 0.172);
    radio.add(dial);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 1.7, 5), metal);
    antenna.position.set(-0.2, 1.6, -0.05);
    antenna.rotation.z = 0.08;
    radio.add(antenna);
    radio.position.set(-4.3, 0, 11.3);
    this.scene.add(radio);

    const helmetGeometry = new THREE.SphereGeometry(0.2, 12, 8);
    const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x464b3b, roughness: 0.7, metalness: 0.12 });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.scale.set(1.1, 0.66, 1.16);
    helmet.position.set(-4.0, 0.62, 11.0);
    helmet.rotation.z = 0.2;
    this.scene.add(helmet);

    const brass = new THREE.MeshStandardMaterial({ color: 0xb98f3f, roughness: 0.4, metalness: 0.7 });
    for (let i = 0; i < 12; i++) {
      const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 5), brass);
      casing.position.set(-3 + Math.random() * 6, 0.03, 10.4 + Math.random() * 4);
      casing.rotation.set(Math.PI / 2, Math.random() * Math.PI, 0);
      this.scene.add(casing);
    }
  }

  buildBunkers() {
    const concrete = new THREE.MeshStandardMaterial({
      map: this.concreteTexture,
      color: 0xa7a698,
      roughness: 0.94,
      metalness: 0.02
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141713, roughness: 1 });
    const makeBunker = (x, z, rot, scale = 1) => {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(9, 3.6, 7.5), concrete);
      base.position.y = 1.8;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.55, 8.3), concrete);
      roof.position.y = 3.85;
      roof.castShadow = true;
      roof.receiveShadow = true;
      group.add(roof);
      const slotA = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 0.5), dark);
      slotA.position.set(0, 2.55, 3.72);
      group.add(slotA);
      const slotB = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.5), dark);
      slotB.position.set(-3.1, 2.6, 3.72);
      group.add(slotB);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.5), dark);
      door.position.set(3.3, 1.15, 3.72);
      group.add(door);
      group.position.set(x, 0, z);
      group.rotation.y = rot;
      group.scale.setScalar(scale);
      this.scene.add(group);
      base.userData.solid = true;
      this.colliders.push(base, roof);
      return group;
    };
    makeBunker(-25, -4, 0.16, 1.0);
    makeBunker(26, -18, -0.24, 0.92);
    makeBunker(-46, -58, 0.5, 1.15);
    makeBunker(52, -68, -0.55, 1.05);

    const rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8a7c, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const size = 0.5 + Math.random() * 1.5;
      const rock = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size * 1.2), rubbleMaterial);
      rock.position.set(-38 + Math.random() * 76, size * 0.3, -34 + Math.random() * 26);
      rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
      this.colliders.push(rock);
    }
  }

  buildHedgehogs() {
    const material = new THREE.MeshStandardMaterial({
      color: 0x3f3d34,
      roughness: 0.7,
      metalness: 0.55
    });
    const beam = new THREE.BoxGeometry(0.17, 3.2, 0.17);
    const rotations = [
      new THREE.Euler(0.9, 0.2, 0.5),
      new THREE.Euler(-0.8, 1.1, -0.4),
      new THREE.Euler(0.2, 2.1, 1.1)
    ];
    for (let i = 0; i < 18; i++) {
      const group = new THREE.Group();
      for (const rotation of rotations) {
        const mesh = new THREE.Mesh(beam, material);
        mesh.rotation.copy(rotation);
        mesh.position.y = 1.5;
        mesh.castShadow = true;
        group.add(mesh);
      }
      const z = -10 - Math.random() * 20;
      const x = -46 + Math.random() * 92;
      group.position.set(x, -0.3 + Math.random() * 0.5, z);
      group.rotation.y = Math.random() * Math.PI;
      group.rotation.z = (Math.random() - 0.5) * 0.3;
      this.scene.add(group);
      group.children.forEach((child) => this.colliders.push(child));
    }
  }

  buildBoats() {
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0x4c504a,
      roughness: 0.78,
      metalness: 0.35
    });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x22261f, roughness: 1 });
    const rustMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.9 });
    const makeBoat = (x, z, rot, sink = 0) => {
      const group = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.25, 8.6), hullMaterial);
      hull.position.y = 0.42;
      hull.castShadow = true;
      hull.receiveShadow = true;
      group.add(hull);
      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 8.6), hullMaterial);
        wall.position.set(side * 1.7, 1.1, 0);
        wall.castShadow = true;
        group.add(wall);
      }
      const interior = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.5, 7.6), darkMaterial);
      interior.position.y = 0.85;
      group.add(interior);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.15, 1.55, 0.18), rustMaterial);
      ramp.position.set(0, 0.92, 4.35);
      ramp.rotation.x = 1.15;
      ramp.castShadow = true;
      group.add(ramp);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 6), hullMaterial);
      mast.position.set(-1.3, 2.6, -2.2);
      group.add(mast);
      group.position.set(x, -0.55 + sink, z);
      group.rotation.set((Math.random() - 0.5) * 0.08, rot, sink > 0 ? (Math.random() - 0.5) * 0.24 : 0);
      this.scene.add(group);
      this.colliders.push(hull);
    };
    makeBoat(-19, -16, 0.24, 0);
    makeBoat(7, -24, -0.12, 0.32);
    makeBoat(28, -12, -0.4, 0.1);
    makeBoat(-39, -6, 0.62, 0.2);
  }

  buildWire() {
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x3f3628, roughness: 1 });
    const points = [];
    const spans = [];
    for (const z of [-1, -6.5]) {
      for (let x = -48; x <= 48; x += 6) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 5), postMaterial);
        post.position.set(x, 0.7, z);
        post.rotation.z = (Math.random() - 0.5) * 0.24;
        post.castShadow = true;
        this.scene.add(post);
      }
      for (let x = -48; x < 48; x += 6) {
        spans.push([x, z, x + 6, z]);
      }
    }
    for (const [x1, z1, x2, z2] of spans) {
      for (let line = 0; line < 2; line++) {
        const yBase = 0.6 + line * 0.48;
        let previous = null;
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const x = x1 + (x2 - x1) * t;
          const z = z1 + (z2 - z1) * t;
          const sag = Math.sin(t * Math.PI) * 0.16;
          const point = new THREE.Vector3(x, yBase - sag, z);
          if (previous) {
            points.push(previous.x, previous.y, previous.z, point.x, point.y, point.z);
          }
          previous = point;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x4a4a40, transparent: true, opacity: 0.8 });
    const wire = new THREE.LineSegments(geometry, material);
    this.scene.add(wire);
  }

  buildCliffs() {
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f553d,
      roughness: 1,
      flatShading: true
    });
    const darkRock = new THREE.MeshStandardMaterial({
      color: 0x363a2c,
      roughness: 1,
      flatShading: true
    });
    const makeCliff = (x, z, sx, sy, sz, mat) => {
      const geometry = new THREE.IcosahedronGeometry(1, 1);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, sy * 0.32 - 6, z);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };
    makeCliff(-116, -55, 46, 34, 60, rockMaterial);
    makeCliff(-98, -105, 38, 26, 50, darkRock);
    makeCliff(-138, -20, 40, 30, 46, darkRock);
    makeCliff(124, -62, 50, 36, 64, rockMaterial);
    makeCliff(108, -118, 42, 28, 54, darkRock);
    makeCliff(148, -16, 44, 32, 52, darkRock);

    const grass = new THREE.MeshStandardMaterial({ color: 0x5f6641, roughness: 1 });
    for (let i = 0; i < 16; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.35 + Math.random() * 0.6, 1.6 + Math.random() * 1.6, 5), grass);
      const side = Math.random() < 0.5 ? -1 : 1;
      tuft.position.set(side * (62 + Math.random() * 50), 0.7, -20 - Math.random() * 80);
      tuft.rotation.z = (Math.random() - 0.5) * 0.2;
      this.scene.add(tuft);
    }
  }

  buildDistantFleet() {
    const material = new THREE.MeshStandardMaterial({ color: 0x39413f, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x252b29, roughness: 1 });
    const makeShip = (x, z, scale) => {
      const group = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 4), material);
      hull.position.y = 1.2;
      group.add(hull);
      const superstructure = new THREE.Mesh(new THREE.BoxGeometry(6, 5.5, 3.4), dark);
      superstructure.position.set(-1, 5.4, 0);
      group.add(superstructure);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 2.6), material);
      bridge.position.set(-2, 8.6, 0);
      group.add(bridge);
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 3.6, 8), dark);
      funnel.position.set(4, 6.4, 0);
      group.add(funnel);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 9, 6), material);
      mast.position.set(-5, 9, 0);
      group.add(mast);
      group.position.set(x, -1.5, z);
      group.scale.setScalar(scale);
      group.rotation.y = (Math.random() - 0.5) * 0.3;
      this.scene.add(group);
    };
    makeShip(-95, -88, 0.72);
    makeShip(-15, -125, 0.92);
    makeShip(70, -98, 0.66);
    makeShip(150, -155, 0.8);
  }

  buildSmoke() {
    const material = new THREE.SpriteMaterial({
      map: this.smokeTexture,
      color: 0x30322c,
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    });
    const plumes = [
      { x: -95, z: -70, scale: 9, speed: 4.2 },
      { x: 150, z: -130, scale: 11, speed: 4.8 }
    ];
    for (const plume of plumes) {
      for (let i = 0; i < 6; i++) {
        const sprite = new THREE.Sprite(material.clone());
        const phase = i / 6;
        sprite.userData = {
          baseX: plume.x,
          baseZ: plume.z,
          scale: plume.scale,
          speed: plume.speed,
          phase,
          drift: (Math.random() - 0.5) * 0.5
        };
        sprite.position.set(plume.x, phase * plume.scale * 4, plume.z);
        sprite.scale.setScalar(plume.scale * (0.5 + phase));
        sprite.material.opacity = 0.3 * (1 - phase * 0.7);
        this.scene.add(sprite);
        this.smoke.push(sprite);
      }
    }
  }

  buildSunGlow(sunDir) {
    const material = new THREE.SpriteMaterial({
      map: this.smokeTexture,
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
    const glow = new THREE.Sprite(material);
    glow.position.copy(sunDir).multiplyScalar(620);
    glow.scale.setScalar(95);
    glow.renderOrder = -10;
    this.scene.add(glow);
    this.sunGlow = glow;

    const flashMaterial = new THREE.SpriteMaterial({
      map: this.flashTexture,
      color: 0xffc070,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    for (let i = 0; i < 4; i++) {
      const flash = new THREE.Sprite(flashMaterial.clone());
      flash.scale.setScalar(22 + Math.random() * 26);
      flash.visible = false;
      this.scene.add(flash);
      this.flashes.push(flash);
    }
  }

  buildDebris() {
    const material = new THREE.MeshStandardMaterial({ color: 0x3a3328, roughness: 0.95 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x2f322d, roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < 22; i++) {
      const isMetal = Math.random() < 0.4;
      const size = 0.15 + Math.random() * 0.4;
      const debris = new THREE.Mesh(
        isMetal ? new THREE.BoxGeometry(size * 2.2, size * 0.2, size) : new THREE.BoxGeometry(size, size * 0.5, size * 1.6),
        isMetal ? metal : material
      );
      debris.position.set(-45 + Math.random() * 90, 0.05, -18 + Math.random() * 30);
      debris.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
      debris.castShadow = true;
      this.scene.add(debris);
    }
    const craterMaterial = new THREE.MeshBasicMaterial({
      color: 0x5d4c34,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    for (let i = 0; i < 12; i++) {
      const crater = new THREE.Mesh(new THREE.CircleGeometry(1.2 + Math.random() * 2.4, 16), craterMaterial);
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(-46 + Math.random() * 92, 0.04, -20 + Math.random() * 30);
      this.scene.add(crater);
    }
  }

  getSpawnPoint() {
    return {
      x: -32 + Math.random() * 64,
      z: -9 - Math.random() * 18
    };
  }

  update(dt, elapsed) {
    this.elapsed = elapsed;
    if (this.oceanMaterial) this.oceanMaterial.uniforms.uTime.value = elapsed;
    if (this.foam) this.foam.material.opacity = 0.2 + Math.sin(elapsed * 0.8) * 0.08;
    if (this.sunGlow) this.sunGlow.material.opacity = 0.32 + Math.sin(elapsed * 0.4) * 0.03;

    for (const sprite of this.smoke) {
      const data = sprite.userData;
      const cycle = 26;
      const t = ((elapsed * data.speed) / cycle + data.phase) % 1;
      const height = t * data.scale * 9;
      sprite.position.set(
        data.baseX + Math.sin(elapsed * 0.12 + data.phase * 9) * data.scale * 0.6 + t * 12,
        height,
        data.baseZ + Math.cos(elapsed * 0.1 + data.phase * 7) * data.scale * 0.4
      );
      sprite.scale.setScalar(data.scale * (0.5 + t * 1.8));
      sprite.material.opacity = 0.3 * Math.sin(Math.PI * t) * (1 - t * 0.4);
    }

    this.flashTimer -= dt;
    if (this.flashTimer <= 0) {
      this.flashTimer = 3 + Math.random() * 7;
      const flash = this.flashes[Math.floor(Math.random() * this.flashes.length)];
      flash.position.set(-120 + Math.random() * 240, 2 + Math.random() * 10, -170 - Math.random() * 80);
      flash.material.opacity = 0.8;
      flash.visible = true;
      flash.userData.life = 0.22;
    }
    for (const flash of this.flashes) {
      if (!flash.visible) continue;
      flash.userData.life -= dt;
      flash.material.opacity = Math.max(0, flash.userData.life / 0.22) * 0.8;
      if (flash.userData.life <= 0) flash.visible = false;
    }
  }
}
