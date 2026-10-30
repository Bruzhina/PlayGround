import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerpAngle(current, target, amount) {
  let delta = ((target - current + Math.PI) % TAU) - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return current + delta * amount;
}

function makeGradientMap() {
  const steps = new Uint8Array([95, 155, 215, 255]);
  const texture = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,248,206,0.9)");
  gradient.addColorStop(0.55, "rgba(255,225,140,0.32)");
  gradient.addColorStop(1, "rgba(255,225,140,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeHeartTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.translate(64, 68);
  ctx.scale(1.1, 1.1);
  const gradient = ctx.createLinearGradient(-50, -50, 45, 55);
  gradient.addColorStop(0, "#ffb3c9");
  gradient.addColorStop(1, "#ff5d88");
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(170, 37, 82, 0.24)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.bezierCurveTo(-10, 22, -52, -2, -43, -31);
  ctx.bezierCurveTo(-36, -53, -8, -54, 0, -30);
  ctx.bezierCurveTo(8, -54, 36, -53, 43, -31);
  ctx.bezierCurveTo(52, -2, 10, 22, 0, 36);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-21, -27, 9, 5, -0.6, 0, TAU);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeNameTag(name, accent = "#ff6f61") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 152;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 152);
  ctx.fillStyle = "rgba(255, 251, 241, 0.96)";
  ctx.beginPath();
  ctx.roundRect(18, 20, 476, 92, 40);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(62, 66, 16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(62, 66, 5.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#252a47";
  ctx.font = "600 35px Fredoka, Trebuchet MS, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 92, 64);
  ctx.fillStyle = "#6d7692";
  ctx.font = "800 17px Nunito, Segoe UI, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("ONLINE", 94, 94);
  ctx.fillStyle = "#39d992";
  ctx.beginPath();
  ctx.arc(75, 94, 5, 0, TAU);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function makeSignTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 1024, 256);
  gradient.addColorStop(0, "#fffdf7");
  gradient.addColorStop(1, "#fff2d2");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(18, 18, 988, 220, 55);
  ctx.fill();
  ctx.strokeStyle = "#ffd16f";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = "#ff6f61";
  ctx.beginPath();
  ctx.arc(145, 128, 58, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "600 68px Fredoka, Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♥", 145, 124);
  ctx.textAlign = "left";
  ctx.fillStyle = "#252a47";
  ctx.font = "600 98px Fredoka, Trebuchet MS, sans-serif";
  ctx.fillText("DUO PLAZA", 240, 120);
  ctx.fillStyle = "#e8514a";
  ctx.font = "900 23px Nunito, Segoe UI, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("ABRACE · ESCOLHA · APRENDA", 246, 184);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.32);
  shape.bezierCurveTo(0, 0.72, -0.36, 1.02, -0.72, 0.71);
  shape.bezierCurveTo(-1.08, 0.39, -0.58, -0.15, 0, -0.67);
  shape.bezierCurveTo(0.58, -0.15, 1.08, 0.39, 0.72, 0.71);
  shape.bezierCurveTo(0.36, 1.02, 0, 0.72, 0, 0.32);
  return shape;
}

function createCharacter(options) {
  const {
    shirt = 0x8b7cf6,
    pants = 0x4a537a,
    skin = 0xc98a64,
    hair = 0x3b2b3a,
    shoe = 0xffffff,
    accent = 0xff6f61,
    accessory = "none",
    name = "Você",
    player = false,
  } = options;

  const gradientMap = options.gradientMap;
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap });
  const skinMaterial = toon(skin);
  const shirtMaterial = toon(shirt);
  const pantsMaterial = toon(pants);
  const hairMaterial = toon(hair);
  const shoeMaterial = toon(shoe);
  const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x252a47 });
  const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMaterial = new THREE.MeshBasicMaterial({ color: 0xff8f9f, transparent: true, opacity: 0.55 });

  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.74, 0.48, 4, 0.15), shirtMaterial);
  torso.position.y = 1.11;
  torso.castShadow = true;
  rig.add(torso);

  const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.19, 0.035, 2, 0.035), toon(accent));
  pocket.position.set(0, 1.04, 0.252);
  rig.add(pocket);

  const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.02), toon(0xffffff));
  zipper.position.set(0, 1.15, 0.257);
  rig.add(zipper);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.14, 12), skinMaterial);
  neck.position.y = 1.51;
  rig.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.81;
  rig.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 24, 18), skinMaterial);
  head.scale.set(1, 1.04, 0.95);
  head.castShadow = true;
  headGroup.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.405, 24, 16, 0, TAU, 0, Math.PI * 0.56),
    hairMaterial
  );
  hairCap.position.y = 0.035;
  hairCap.scale.set(1.03, 1.05, 1.02);
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.398, 20, 12, Math.PI, Math.PI, 0, Math.PI * 0.74),
    hairMaterial
  );
  hairBack.position.y = 0.005;
  hairBack.scale.set(1.02, 1.04, 1.01);
  headGroup.add(hairBack);

  const eyeWhiteLeft = new THREE.Mesh(new THREE.SphereGeometry(0.083, 12, 10), whiteMaterial);
  eyeWhiteLeft.position.set(-0.135, 0.025, 0.338);
  eyeWhiteLeft.scale.set(0.9, 1.12, 0.48);
  headGroup.add(eyeWhiteLeft);
  const eyeWhiteRight = eyeWhiteLeft.clone();
  eyeWhiteRight.position.x = 0.135;
  headGroup.add(eyeWhiteRight);

  const pupilLeft = new THREE.Mesh(new THREE.SphereGeometry(0.039, 10, 8), darkMaterial);
  pupilLeft.position.set(-0.135, 0.02, 0.39);
  pupilLeft.scale.set(1, 1.15, 0.55);
  headGroup.add(pupilLeft);
  const pupilRight = pupilLeft.clone();
  pupilRight.position.x = 0.135;
  headGroup.add(pupilRight);

  const glintLeft = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), whiteMaterial);
  glintLeft.position.set(-0.12, 0.04, 0.414);
  headGroup.add(glintLeft);
  const glintRight = glintLeft.clone();
  glintRight.position.x = 0.15;
  headGroup.add(glintRight);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.013, 6, 12, Math.PI), darkMaterial);
  smile.position.set(0, -0.115, 0.37);
  smile.rotation.z = Math.PI;
  headGroup.add(smile);

  const blushLeft = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), blushMaterial);
  blushLeft.position.set(-0.23, -0.035, 0.355);
  headGroup.add(blushLeft);
  const blushRight = blushLeft.clone();
  blushRight.position.x = 0.23;
  headGroup.add(blushRight);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.47, 1.39, 0);
  rig.add(leftArmPivot);
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 10), shirtMaterial);
  leftArm.position.y = -0.22;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), skinMaterial);
  leftHand.position.y = -0.43;
  leftArmPivot.add(leftHand);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.47, 1.39, 0);
  rig.add(rightArmPivot);
  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 10), shirtMaterial);
  rightArm.position.y = -0.22;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), skinMaterial);
  rightHand.position.y = -0.43;
  rightArmPivot.add(rightHand);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.18, 0.68, 0);
  rig.add(leftLegPivot);
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.3, 6, 10), pantsMaterial);
  leftLeg.position.y = -0.2;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  const leftShoe = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.15, 0.34, 3, 0.06), shoeMaterial);
  leftShoe.position.set(0, -0.47, 0.06);
  leftShoe.castShadow = true;
  leftLegPivot.add(leftShoe);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.18, 0.68, 0);
  rig.add(rightLegPivot);
  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.3, 6, 10), pantsMaterial);
  rightLeg.position.y = -0.2;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  const rightShoe = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.15, 0.34, 3, 0.06), shoeMaterial);
  rightShoe.position.set(0, -0.47, 0.06);
  rightShoe.castShadow = true;
  rightLegPivot.add(rightShoe);

  if (player) {
    const backpack = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.56, 0.22, 4, 0.08), toon(accent));
    backpack.position.set(0, 1.12, -0.35);
    backpack.castShadow = true;
    rig.add(backpack);
    const backpackHeart = new THREE.Mesh(
      new THREE.ExtrudeGeometry(makeHeartShape(), { depth: 0.045, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }),
      toon(0xff6f61)
    );
    backpackHeart.position.set(0, 1.12, -0.465);
    backpackHeart.rotation.y = Math.PI;
    backpackHeart.scale.setScalar(0.21);
    rig.add(backpackHeart);
    const strapLeft = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.46, 0.06, 2, 0.02), toon(0xfff8ec));
    strapLeft.position.set(-0.25, 1.2, 0.245);
    rig.add(strapLeft);
    const strapRight = strapLeft.clone();
    strapRight.position.x = 0.25;
    rig.add(strapRight);
  }

  if (accessory === "bunny") {
    const earLeft = new THREE.Group();
    earLeft.position.set(-0.16, 0.43, 0);
    earLeft.rotation.z = 0.14;
    const earMeshLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 6, 10), hairMaterial);
    earMeshLeft.position.y = 0.19;
    earLeft.add(earMeshLeft);
    const innerLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.27, 5, 8), blushMaterial);
    innerLeft.position.set(0, 0.19, 0.052);
    earLeft.add(innerLeft);
    headGroup.add(earLeft);
    const earRight = earLeft.clone();
    earRight.position.x = 0.16;
    earRight.rotation.z = -0.14;
    headGroup.add(earRight);
  }

  if (accessory === "cap") {
    const capTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.405, 24, 12, 0, TAU, 0, Math.PI * 0.5),
      toon(accent)
    );
    capTop.position.y = 0.15;
    capTop.scale.set(1.02, 0.68, 1.02);
    headGroup.add(capTop);
    const brim = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.055, 0.3, 3, 0.025), toon(accent));
    brim.position.set(0, 0.17, 0.29);
    brim.rotation.x = 0.13;
    headGroup.add(brim);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), toon(0xfff8ec));
    button.position.y = 0.44;
    headGroup.add(button);
  }

  if (accessory === "buns") {
    const bunLeft = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 12), hairMaterial);
    bunLeft.position.set(-0.35, 0.2, -0.03);
    headGroup.add(bunLeft);
    const bunRight = bunLeft.clone();
    bunRight.position.x = 0.35;
    headGroup.add(bunRight);
    const bandLeft = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 14), toon(accent));
    bandLeft.position.set(-0.33, 0.2, -0.03);
    bandLeft.rotation.y = Math.PI / 2;
    headGroup.add(bandLeft);
    const bandRight = bandLeft.clone();
    bandRight.position.x = 0.33;
    headGroup.add(bandRight);
  }

  if (accessory === "beanie") {
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(0.41, 24, 14, 0, TAU, 0, Math.PI * 0.58),
      toon(accent)
    );
    beanie.position.y = 0.12;
    beanie.scale.set(1.04, 0.92, 1.04);
    headGroup.add(beanie);
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.065, 8, 24), toon(0xfff8ec));
    brim.position.y = 0.12;
    brim.rotation.x = Math.PI / 2;
    headGroup.add(brim);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), toon(0xfff8ec));
    pom.position.y = 0.5;
    headGroup.add(pom);
  }

  if (accessory === "glasses") {
    const glassLeft = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 6, 16), toon(0xf0b84b));
    glassLeft.position.set(-0.135, 0.02, 0.392);
    headGroup.add(glassLeft);
    const glassRight = glassLeft.clone();
    glassRight.position.x = 0.135;
    headGroup.add(glassRight);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.018), toon(0xf0b84b));
    bridge.position.set(0, 0.03, 0.397);
    headGroup.add(bridge);
  }

  const tag = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeNameTag(name, accent),
      transparent: true,
      depthWrite: false,
    })
  );
  const tagBaseY = player ? 2.8 : 2.62;
  tag.position.y = tagBaseY;
  tag.scale.set(player ? 1.5 : 1.75, player ? 0.45 : 0.52, 1);
  root.add(tag);

  root.userData = {
    name,
    rig,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    tag,
    tagBaseY,
    baseY: 0,
    phase: Math.random() * TAU,
    walkPhase: Math.random() * TAU,
    facing: 0,
    targetFacing: 0,
    hugging: false,
    hugAmount: 0,
    player,
  };

  return root;
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8dcff);
  scene.fog = new THREE.Fog(0xcbeaff, 20, 46);

  const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 4.6, 10.8);

  const gradientMap = makeGradientMap();
  const glowTexture = makeGlowTexture();
  const heartTexture = makeHeartTexture();

  const hemi = new THREE.HemisphereLight(0xe7f7ff, 0x78b68b, 1.85);
  scene.add(hemi);

  const sunLight = new THREE.DirectionalLight(0xfff2d8, 2.45);
  sunLight.position.set(8, 14, 9);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1536, 1536);
  sunLight.shadow.camera.left = -11;
  sunLight.shadow.camera.right = 11;
  sunLight.shadow.camera.top = 11;
  sunLight.shadow.camera.bottom = -11;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 35;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const fillLight = new THREE.DirectionalLight(0x8fd7ff, 0.65);
  fillLight.position.set(-8, 5, 4);
  scene.add(fillLight);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(52, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x7ecbff) },
        midColor: { value: new THREE.Color(0xc5ebff) },
        bottomColor: { value: new THREE.Color(0xffe7d5) },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying vec3 vPosition;
        void main() {
          float h = normalize(vPosition).y;
          float upper = smoothstep(0.08, 0.82, h);
          float lower = smoothstep(-0.5, 0.08, h);
          vec3 color = mix(bottomColor, midColor, lower);
          color = mix(color, topColor, upper);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  );
  scene.add(sky);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff5c9, toneMapped: false })
  );
  sun.position.set(17, 16, -28);
  scene.add(sun);
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xfff1ae,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
    })
  );
  sunGlow.position.copy(sun.position);
  sunGlow.scale.set(16, 16, 1);
  scene.add(sunGlow);

  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap });
  const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });

  const island = new THREE.Group();
  scene.add(island);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(7.35, 4.5, 2.9, 48), toon(0xb87855));
  base.position.y = -1.75;
  base.receiveShadow = true;
  base.castShadow = true;
  island.add(base);

  const baseBand = new THREE.Mesh(new THREE.CylinderGeometry(7.43, 7.35, 0.34, 48), toon(0x8b5b48));
  baseBand.position.y = -0.38;
  island.add(baseBand);

  const grass = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.42, 0.46, 64), toon(0x7bd6a4));
  grass.position.y = -0.22;
  grass.receiveShadow = true;
  island.add(grass);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.35, 0.16, 8, 64), toon(0xfff1d8));
  rim.position.y = 0.01;
  rim.rotation.x = Math.PI / 2;
  island.add(rim);

  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4.45, 64), toon(0xfff4df));
  plaza.position.y = 0.012;
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  island.add(plaza);

  const plazaRing = new THREE.Mesh(new THREE.RingGeometry(4.42, 4.63, 64), toon(0xffb7a8));
  plazaRing.position.y = 0.018;
  plazaRing.rotation.x = -Math.PI / 2;
  island.add(plazaRing);

  const innerRing = new THREE.Mesh(new THREE.RingGeometry(2.64, 2.76, 64), toon(0x9be5cf));
  innerRing.position.y = 0.021;
  innerRing.rotation.x = -Math.PI / 2;
  island.add(innerRing);

  const heartFloor = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeHeartShape(), { depth: 0.035, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }),
    toon(0xffc4cf)
  );
  heartFloor.position.set(0, 0.018, 0.48);
  heartFloor.scale.setScalar(1.1);
  heartFloor.rotation.x = -Math.PI / 2;
  heartFloor.receiveShadow = true;
  island.add(heartFloor);

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU;
    const stone = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), toon(i % 2 ? 0xffd9c9 : 0xcff2e4));
    stone.position.set(Math.cos(angle) * 3.6, 0.026, Math.sin(angle) * 3.6);
    stone.rotation.x = -Math.PI / 2;
    island.add(stone);
  }

  function addPlanter(x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.31, 0.42, 12), toon(0xffb28f));
    pot.position.y = 0.21;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 12), toon(0x8c5e45));
    soil.position.y = 0.43;
    group.add(soil);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), toon(0x4dbb7d));
    bush.position.y = 0.73;
    bush.scale.set(1, 0.8, 1);
    bush.castShadow = true;
    group.add(bush);
    const flowers = [0xff8fb8, 0xffd166, 0xffffff];
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * TAU + Math.random() * 0.4;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), toon(flowers[i % flowers.length]));
      flower.position.set(Math.cos(angle) * 0.3, 0.93 + Math.random() * 0.12, Math.sin(angle) * 0.3);
      group.add(flower);
    }
    island.add(group);
    return group;
  }

  addPlanter(-5.8, 1.4, 1.05);
  addPlanter(5.85, 1.6, 0.95);
  addPlanter(-4.4, -4.2, 0.85);
  addPlanter(4.4, -4.1, 0.9);
  addPlanter(-6.1, -2.2, 0.8);
  addPlanter(6.15, -2.4, 0.82);

  function addBench(x, z, rotation = 0) {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotation;
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.16, 0.52, 3, 0.07), toon(0xd99365));
    seat.position.y = 0.47;
    seat.castShadow = true;
    seat.receiveShadow = true;
    bench.add(seat);
    const back = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.55, 0.13, 3, 0.06), toon(0xd99365));
    back.position.set(0, 0.78, -0.23);
    back.rotation.x = -0.1;
    back.castShadow = true;
    bench.add(back);
    for (const sx of [-0.64, 0.64]) {
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.45, 0.12, 2, 0.04), toon(0x7e5a52));
      leg.position.set(sx, 0.23, 0);
      bench.add(leg);
    }
    island.add(bench);
  }

  addBench(-5.1, 3.15, 0.22);
  addBench(5.1, 3.1, -0.22);

  function addLamp(x, z) {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.6, 10), toon(0x3d4467));
    post.position.y = 1.3;
    post.castShadow = true;
    lamp.add(post);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.18, 12), toon(0x3d4467));
    cap.position.y = 2.67;
    lamp.add(cap);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a6, toneMapped: false }));
    bulb.position.y = 2.52;
    lamp.add(bulb);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffdf86,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.6,
      })
    );
    glow.position.y = 2.52;
    glow.scale.set(1.8, 1.8, 1);
    lamp.add(glow);
    island.add(lamp);
  }

  addLamp(-3.7, 4.25);
  addLamp(3.7, 4.25);
  addLamp(-6.1, -0.9);
  addLamp(6.1, -0.9);

  const arch = new THREE.Group();
  arch.position.set(0, 0, -4.65);
  island.add(arch);

  for (const x of [-2.35, 2.35]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.5, 12), toon(0xfff6e4));
    pillar.position.set(x, 1.25, 0);
    pillar.castShadow = true;
    arch.add(pillar);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.3, 12), toon(0xffc857));
    foot.position.set(x, 0.15, 0);
    foot.castShadow = true;
    arch.add(foot);
    const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 16), toon(0xffc857));
    topRing.position.set(x, 2.53, 0);
    topRing.rotation.x = Math.PI / 2;
    arch.add(topRing);
  }

  const beam = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.22, 0.34, 3, 0.08), toon(0xfff6e4));
  beam.position.y = 2.55;
  beam.castShadow = true;
  arch.add(beam);

  const signBoard = new THREE.Mesh(new RoundedBoxGeometry(4.5, 1.14, 0.16, 4, 0.08), toon(0xfff4dc));
  signBoard.position.set(0, 3.14, 0);
  signBoard.castShadow = true;
  arch.add(signBoard);

  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.28, 1.06),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(), transparent: true, toneMapped: false })
  );
  signFace.position.set(0, 3.14, 0.09);
  arch.add(signFace);

  const archHeart = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeHeartShape(), { depth: 0.26, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: 0xff5d88, roughness: 0.45, emissive: 0x7a173c, emissiveIntensity: 0.16 })
  );
  archHeart.position.set(0, 4.08, 0);
  archHeart.scale.setScalar(0.63);
  archHeart.castShadow = true;
  arch.add(archHeart);

  const archGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff9ab7,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.38,
    })
  );
  archGlow.position.set(0, 4.08, -0.1);
  archGlow.scale.set(3.2, 3.2, 1);
  arch.add(archGlow);

  for (let i = 0; i < 11; i += 1) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe9a6 : 0xff9ab7, toneMapped: false }));
    bulb.position.set(-2.25 + i * 0.45, 2.55, 0.22);
    arch.add(bulb);
  }

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 2.6),
    toon(0xffb7a8)
  );
  banner.position.set(-4.25, 1.8, -3.2);
  banner.rotation.y = 0.5;
  island.add(banner);

  const bannerHeart = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeHeartShape(), { depth: 0.06, bevelEnabled: false }),
    toon(0xfff8ec)
  );
  bannerHeart.position.set(-4.23, 2.38, -3.12);
  bannerHeart.rotation.y = 0.5;
  bannerHeart.scale.setScalar(0.4);
  island.add(bannerHeart);

  const clouds = new THREE.Group();
  scene.add(clouds);
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 11; i += 1) {
    const cloud = new THREE.Group();
    const angle = (i / 11) * TAU + Math.random() * 0.4;
    const radius = 10 + Math.random() * 9;
    cloud.position.set(Math.cos(angle) * radius, -2.6 - Math.random() * 3.2, Math.sin(angle) * radius);
    const puffs = 3 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random() * 0.8, 10, 8), cloudMaterial);
      puff.position.set((p - puffs / 2) * 0.85, Math.random() * 0.25, Math.random() * 0.3);
      puff.scale.y = 0.7;
      cloud.add(puff);
    }
    cloud.userData.drift = 0.04 + Math.random() * 0.06;
    cloud.userData.origin = cloud.position.clone();
    clouds.add(cloud);
  }

  const sparkleCount = 100;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i += 1) {
    const radius = 2 + Math.random() * 8;
    const angle = Math.random() * TAU;
    sparklePositions[i * 3] = Math.cos(angle) * radius;
    sparklePositions[i * 3 + 1] = 0.8 + Math.random() * 6;
    sparklePositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
  const sparkles = new THREE.Points(
    sparkleGeometry,
    new THREE.PointsMaterial({ color: 0xfff8dd, size: 0.075, transparent: true, opacity: 0.72, depthWrite: false, sizeAttenuation: true })
  );
  scene.add(sparkles);

  const player = createCharacter({
    shirt: 0x8b7cf6,
    pants: 0x434b70,
    skin: 0xc98a64,
    hair: 0x3b2b3a,
    shoe: 0xfff8ec,
    accent: 0x69dcc3,
    accessory: "beanie",
    name: "Você",
    player: true,
    gradientMap,
  });
  player.position.set(0, 0, 3.05);
  player.rotation.y = Math.PI;
  player.userData.facing = Math.PI;
  player.userData.targetFacing = Math.PI;
  scene.add(player);

  const botConfigs = [
    { name: "Luna_Star", x: -1.22, z: 1.44, shirt: 0x5fcfb5, pants: 0x3e5374, hair: 0x9b72d9, accent: 0xff9ab7, accessory: "bunny", skin: 0xf0b48b },
    { name: "Biel_Craft", x: 1.75, z: 1.0, shirt: 0xff9c58, pants: 0x4d507e, hair: 0x3c2b2f, accent: 0x3fa9f5, accessory: "cap", skin: 0xb97856 },
    { name: "Maya_Plays", x: -0.25, z: -1.28, shirt: 0xffd166, pants: 0x6b5fa8, hair: 0x342536, accent: 0xff6f61, accessory: "buns", skin: 0x9a5d42 },
  ];

  const bots = botConfigs.map((config, index) => {
    const bot = createCharacter({
      shirt: config.shirt,
      pants: config.pants,
      skin: config.skin,
      hair: config.hair,
      shoe: 0xfff8ec,
      accent: config.accent,
      accessory: config.accessory,
      name: config.name,
      gradientMap,
    });
    bot.position.set(config.x, 0, config.z);
    bot.userData.home = new THREE.Vector3(config.x, 0, config.z);
    bot.userData.index = index;
    scene.add(bot);
    return bot;
  });

  bots.forEach((bot) => {
    const direction = new THREE.Vector3().subVectors(player.position, bot.position);
    const facing = Math.atan2(direction.x, direction.z);
    bot.rotation.y = facing;
    bot.userData.facing = facing;
    bot.userData.targetFacing = facing;
  });

  const hearts = [];
  for (let i = 0; i < 28; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: heartTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      })
    );
    sprite.visible = false;
    sprite.userData = { life: 0, maxLife: 1, velocity: new THREE.Vector3(), spin: 0 };
    scene.add(sprite);
    hearts.push(sprite);
  }
  let heartCursor = 0;

  function spawnHearts(position, count = 12, spread = 1) {
    for (let i = 0; i < count; i += 1) {
      const sprite = hearts[heartCursor];
      heartCursor = (heartCursor + 1) % hearts.length;
      sprite.visible = true;
      sprite.position.copy(position);
      sprite.position.x += (Math.random() - 0.5) * spread;
      sprite.position.y += Math.random() * 0.35;
      sprite.position.z += (Math.random() - 0.5) * spread;
      sprite.scale.setScalar(0.24 + Math.random() * 0.22);
      sprite.material.opacity = 1;
      sprite.userData.life = 0;
      sprite.userData.maxLife = 1.2 + Math.random() * 0.7;
      sprite.userData.velocity.set((Math.random() - 0.5) * 0.7, 0.7 + Math.random() * 0.8, (Math.random() - 0.5) * 0.7);
      sprite.userData.spin = (Math.random() - 0.5) * 1.8;
    }
  }

  const state = {
    input: new THREE.Vector2(),
    tilt: new THREE.Vector2(),
    moveSpeed: 0,
    mode: "lobby",
    partner: null,
    hugTarget: null,
    hugTimer: 0,
    selectedTarget: null,
    locked: false,
    time: 0,
  };

  const cameraTarget = new THREE.Vector3(0, 1.2, 0.8);
  const cameraPosition = new THREE.Vector3(0, 4.6, 10.8);
  const desiredPosition = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const tempVector = new THREE.Vector3();
  const tempVector2 = new THREE.Vector3();

  function getAspect() {
    return window.innerWidth / Math.max(1, window.innerHeight);
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.55 : 1.8));
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.fov = getAspect() < 0.82 ? 52 : 43;
    camera.updateProjectionMatrix();
  }

  function setInput(x, y) {
    state.input.set(clamp(x, -1, 1), clamp(y, -1, 1));
  }

  function setTilt(x, y) {
    state.tilt.set(clamp(x, -1, 1), clamp(y, -1, 1));
  }

  function setLocked(locked) {
    state.locked = Boolean(locked);
  }

  function setMode(mode) {
    state.mode = mode;
  }

  function nearestBot(maxDistance = 2.25) {
    let best = null;
    let bestDistance = Infinity;
    for (const bot of bots) {
      const distance = player.position.distanceTo(bot.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = bot;
      }
    }
    return bestDistance <= maxDistance ? { bot: best, distance: bestDistance } : null;
  }

  function faceTarget(root, target, dt, speed = 8) {
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.0001) return;
    root.userData.targetFacing = Math.atan2(dx, dz);
    root.rotation.y = lerpAngle(root.rotation.y, root.userData.targetFacing, 1 - Math.exp(-speed * dt));
  }

  function startHug(bot) {
    if (!bot || state.hugTarget) return;
    state.hugTarget = bot;
    state.selectedTarget = bot;
    state.hugTimer = 0;
    player.userData.hugging = true;
    bot.userData.hugging = true;
    faceTarget(player, bot.position, 1, 100);
    faceTarget(bot, player.position, 1, 100);
    tempVector.copy(player.position).add(bot.position).multiplyScalar(0.5);
    tempVector.y += 1.15;
    spawnHearts(tempVector, 18, 1.5);
  }

  function choosePartner(bot) {
    if (!bot) return;
    state.partner = bot;
    state.selectedTarget = bot;
    bot.userData.partner = true;
    player.userData.hugging = true;
    bot.userData.hugging = true;
    const side = new THREE.Vector3(0.92, 0, -0.18);
    const target = player.position.clone().add(side);
    bot.position.copy(target);
    bot.rotation.y = Math.atan2(player.position.x - bot.position.x, player.position.z - bot.position.z);
    bot.userData.facing = bot.rotation.y;
    tempVector.copy(player.position);
    tempVector.y += 1.7;
    spawnHearts(tempVector, 16, 1.2);
  }

  function reset() {
    state.mode = "lobby";
    state.locked = false;
    state.partner = null;
    state.hugTarget = null;
    state.hugTimer = 0;
    state.selectedTarget = null;
    state.input.set(0, 0);
    state.tilt.set(0, 0);
    player.position.set(0, 0, 3.05);
    player.rotation.y = Math.PI;
    player.userData.facing = Math.PI;
    player.userData.targetFacing = Math.PI;
    player.userData.hugging = false;
    player.userData.hugAmount = 0;
    bots.forEach((bot, index) => {
      bot.position.copy(bot.userData.home);
      bot.userData.hugging = false;
      bot.userData.hugAmount = 0;
      bot.userData.partner = false;
      const direction = new THREE.Vector3().subVectors(player.position, bot.position);
      const facing = Math.atan2(direction.x, direction.z);
      bot.rotation.y = facing;
      bot.userData.facing = facing;
      bot.userData.targetFacing = facing;
      bot.userData.phase = index * 1.2;
    });
    cameraPosition.set(0, 4.6, 10.8);
    cameraTarget.set(0, 1.2, 0.8);
  }

  function animateCharacter(root, dt, moving = false) {
    const data = root.userData;
    const phase = state.time * 2.2 + data.phase;
    const walkPhase = data.walkPhase;
    const movingAmount = moving ? 1 : 0;
    const bob = Math.sin(phase * 1.4) * 0.018 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.05 : 0);
    data.rig.position.y = bob;

    const hugTarget = data.hugging ? 1 : 0;
    data.hugAmount += (hugTarget - data.hugAmount) * Math.min(1, dt * 8);

    if (moving) {
      data.walkPhase += dt * 11;
      const swing = Math.sin(data.walkPhase) * 0.62;
      data.leftLegPivot.rotation.x = swing;
      data.rightLegPivot.rotation.x = -swing;
      data.leftArmPivot.rotation.x = -swing * 0.8;
      data.rightArmPivot.rotation.x = swing * 0.8;
      data.leftArmPivot.rotation.z = 0.08;
      data.rightArmPivot.rotation.z = -0.08;
    } else {
      data.leftLegPivot.rotation.x += (0 - data.leftLegPivot.rotation.x) * Math.min(1, dt * 9);
      data.rightLegPivot.rotation.x += (0 - data.rightLegPivot.rotation.x) * Math.min(1, dt * 9);
      data.leftArmPivot.rotation.x += (0 - data.leftArmPivot.rotation.x) * Math.min(1, dt * 9);
      data.rightArmPivot.rotation.x += (0 - data.rightArmPivot.rotation.x) * Math.min(1, dt * 9);
      data.leftArmPivot.rotation.z += (0 - data.leftArmPivot.rotation.z) * Math.min(1, dt * 9);
      data.rightArmPivot.rotation.z += (0 - data.rightArmPivot.rotation.z) * Math.min(1, dt * 9);
    }

    if (data.hugAmount > 0.01) {
      const hug = data.hugAmount;
      data.leftArmPivot.rotation.x = THREE.MathUtils.lerp(data.leftArmPivot.rotation.x, -1.28, hug);
      data.rightArmPivot.rotation.x = THREE.MathUtils.lerp(data.rightArmPivot.rotation.x, -1.28, hug);
      data.leftArmPivot.rotation.z = THREE.MathUtils.lerp(data.leftArmPivot.rotation.z, 0.28, hug);
      data.rightArmPivot.rotation.z = THREE.MathUtils.lerp(data.rightArmPivot.rotation.z, -0.28, hug);
      data.headGroup.rotation.x = THREE.MathUtils.lerp(data.headGroup.rotation.x, 0.1, hug);
    } else {
      data.headGroup.rotation.x += (Math.sin(phase * 0.7) * 0.03 - data.headGroup.rotation.x) * Math.min(1, dt * 4);
    }

    data.tag.position.y = data.tagBaseY + Math.sin(phase * 0.8) * 0.02;
    data.rig.rotation.z = moving ? Math.sin(walkPhase) * 0.015 : Math.sin(phase * 0.6) * 0.008;
  }

  function updateHearts(dt) {
    for (const heart of hearts) {
      if (!heart.visible) continue;
      heart.userData.life += dt;
      const t = heart.userData.life / heart.userData.maxLife;
      if (t >= 1) {
        heart.visible = false;
        heart.material.opacity = 0;
        continue;
      }
      heart.position.addScaledVector(heart.userData.velocity, dt);
      heart.userData.velocity.y -= 0.35 * dt;
      heart.material.opacity = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 0.95;
      heart.material.rotation += heart.userData.spin * dt;
      const scale = heart.scale.x;
      heart.scale.setScalar(scale * (1 + dt * 0.12));
    }
  }

  function update(dt) {
    state.time += dt;
    const active = state.mode === "lobby" && !state.locked;
    let moveX = 0;
    let moveZ = 0;

    if (active) {
      moveX = state.input.x + state.tilt.x;
      moveZ = state.input.y + state.tilt.y;
      const length = Math.hypot(moveX, moveZ);
      if (length > 1) {
        moveX /= length;
        moveZ /= length;
      }
      if (length < 0.08) {
        moveX = 0;
        moveZ = 0;
      }
    }

    const moving = Math.hypot(moveX, moveZ) > 0.02 && !state.hugTarget;
    state.moveSpeed += ((moving ? 1 : 0) - state.moveSpeed) * Math.min(1, dt * 10);

    if (moving) {
      const speed = 2.75;
      player.position.x += moveX * speed * dt;
      player.position.z += moveZ * speed * dt;
      const radius = Math.hypot(player.position.x, player.position.z);
      if (radius > 6.2) {
        player.position.x = (player.position.x / radius) * 6.2;
        player.position.z = (player.position.z / radius) * 6.2;
      }
      if (player.position.z > 4.6) player.position.z = 4.6;
      player.userData.targetFacing = Math.atan2(moveX, moveZ);
    }

    player.rotation.y = lerpAngle(player.rotation.y, player.userData.targetFacing, 1 - Math.exp(-12 * dt));
    player.userData.facing = player.rotation.y;

    if (state.hugTarget) {
      state.hugTimer += dt;
      if (state.hugTimer > 1.15) {
        state.hugTarget = null;
        player.userData.hugging = false;
        const target = state.selectedTarget;
        if (target) target.userData.hugging = false;
      }
    }

    animateCharacter(player, dt, moving);

    for (const bot of bots) {
      const distance = bot.position.distanceTo(player.position);
      const isPartner = state.partner === bot;
      if (isPartner) {
        faceTarget(bot, player.position, dt, 6);
      } else if (!bot.userData.hugging && distance < 4.6) {
        const direction = new THREE.Vector3().subVectors(player.position, bot.position);
        bot.userData.targetFacing = Math.atan2(direction.x, direction.z);
        bot.rotation.y = lerpAngle(bot.rotation.y, bot.userData.targetFacing, 1 - Math.exp(-2.2 * dt));
      } else {
        bot.rotation.y += Math.sin(state.time * 0.55 + bot.userData.phase) * 0.0009;
      }
      animateCharacter(bot, dt, false);
    }

    if (state.mode === "lobby" || state.mode === "duo") {
      const aspect = getAspect();
      const portrait = aspect < 0.82;
      if (state.mode === "duo") {
        desiredPosition.set(player.position.x + (portrait ? 2.8 : 3.4), portrait ? 3.8 : 3.5, player.position.z + (portrait ? 7.8 : 6.4));
        desiredTarget.set(player.position.x + 0.4, 1.35, player.position.z - 0.4);
      } else {
        desiredPosition.set(player.position.x, player.position.y + (portrait ? 5.1 : 4.35), player.position.z + (portrait ? 9.4 : 7.7));
        desiredTarget.set(player.position.x, 1.2, player.position.z - (portrait ? 1.7 : 1.55));
      }
      cameraPosition.lerp(desiredPosition, 1 - Math.exp(-3.2 * dt));
      cameraTarget.lerp(desiredTarget, 1 - Math.exp(-4.2 * dt));
      camera.position.copy(cameraPosition);
      camera.lookAt(cameraTarget);
    }

    clouds.children.forEach((cloud, index) => {
      cloud.position.x = cloud.userData.origin.x + Math.sin(state.time * cloud.userData.drift + index) * 0.6;
      cloud.position.z = cloud.userData.origin.z + Math.cos(state.time * cloud.userData.drift * 0.7 + index) * 0.4;
    });

    sparkles.rotation.y = state.time * 0.018;
    sparkles.position.y = Math.sin(state.time * 0.5) * 0.08;
    archGlow.material.opacity = 0.3 + Math.sin(state.time * 1.8) * 0.08;
    archHeart.rotation.y = Math.sin(state.time * 0.6) * 0.08;

    updateHearts(dt);
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener("resize", resize);

  return {
    renderer,
    scene,
    camera,
    player,
    bots,
    state,
    setInput,
    setTilt,
    setLocked,
    setMode,
    nearestBot,
    startHug,
    choosePartner,
    reset,
    spawnHearts,
    update,
    resize,
    getPartner: () => state.partner,
    dispose: () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}
