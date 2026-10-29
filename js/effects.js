import * as THREE from 'three';

const PARTICLE_VERTEX = `
  attribute float size;
  attribute float alpha;
  attribute vec3 color;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = alpha;
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (320.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAGMENT = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.1, d) * vAlpha;
    if (a < 0.012) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.count = 720;
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.alphas = new Float32Array(this.count);
    this.velocity = new Float32Array(this.count * 3);
    this.life = new Float32Array(this.count);
    this.maxLife = new Float32Array(this.count);
    this.gravity = new Float32Array(this.count);
    this.drag = new Float32Array(this.count);
    this.baseSize = new Float32Array(this.count);
    this.growth = new Float32Array(this.count);
    this.cursor = 0;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);

    this.tracerPool = [];
    for (let i = 0; i < 28; i++) {
      const tracerGeometry = new THREE.BufferGeometry();
      tracerGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const tracerMaterial = new THREE.LineBasicMaterial({
        color: 0xffd28a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(tracerGeometry, tracerMaterial);
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      this.tracerPool.push({ line, life: 0, max: 0.09 });
    }
    this.tracerCursor = 0;
    this.tempColor = new THREE.Color();
  }

  spawn(position, options = {}) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const i3 = index * 3;
    const color = options.color !== undefined ? options.color : 0xd8c39a;
    this.tempColor.set(color);
    const jitter = options.colorJitter || 0;
    this.colors[i3] = Math.max(0, Math.min(1, this.tempColor.r + (Math.random() - 0.5) * jitter));
    this.colors[i3 + 1] = Math.max(0, Math.min(1, this.tempColor.g + (Math.random() - 0.5) * jitter));
    this.colors[i3 + 2] = Math.max(0, Math.min(1, this.tempColor.b + (Math.random() - 0.5) * jitter));

    this.positions[i3] = position.x + (Math.random() - 0.5) * (options.spread || 0.2);
    this.positions[i3 + 1] = position.y + (Math.random() - 0.5) * (options.spread || 0.2);
    this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * (options.spread || 0.2);

    const speed = options.speed || 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const magnitude = speed * (0.35 + Math.random() * 0.65);
    this.velocity[i3] = Math.sin(phi) * Math.cos(theta) * magnitude;
    this.velocity[i3 + 1] = Math.abs(Math.cos(phi)) * magnitude * (options.upBias ?? 0.8) + (options.rise || 0);
    this.velocity[i3 + 2] = Math.sin(phi) * Math.sin(theta) * magnitude;

    const size = (options.size || 0.22) * (0.65 + Math.random() * 0.7);
    this.baseSize[index] = size;
    this.sizes[index] = size;
    this.growth[index] = options.growth ?? 0.4;
    this.life[index] = options.life || 0.8;
    this.maxLife[index] = this.life[index];
    this.alphas[index] = 1;
    this.gravity[index] = options.gravity ?? 4;
    this.drag[index] = options.drag ?? 1.2;
  }

  burst(position, options = {}) {
    const count = options.count || 10;
    for (let i = 0; i < count; i++) this.spawn(position, options);
  }

  tracer(from, to, color = 0xffd28a, opacity = 0.9, thickness = 1) {
    const item = this.tracerPool[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % this.tracerPool.length;
    const attribute = item.line.geometry.attributes.position;
    attribute.setXYZ(0, from.x, from.y, from.z);
    attribute.setXYZ(1, to.x, to.y, to.z);
    attribute.needsUpdate = true;
    item.line.material.color.set(color);
    item.line.material.opacity = opacity;
    item.line.material.linewidth = thickness;
    item.line.visible = true;
    item.life = item.max;
  }

  reset() {
    this.life.fill(0);
    this.alphas.fill(0);
    this.sizes.fill(0);
    this.points.geometry.attributes.alpha.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    for (const item of this.tracerPool) {
      item.line.visible = false;
      item.life = 0;
    }
  }

  update(dt) {
    const positionAttribute = this.points.geometry.attributes.position;
    const colorAttribute = this.points.geometry.attributes.color;
    const sizeAttribute = this.points.geometry.attributes.size;
    const alphaAttribute = this.points.geometry.attributes.alpha;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      const i3 = i * 3;
      const damp = Math.max(0, 1 - this.drag[i] * dt);
      this.velocity[i3] *= damp;
      this.velocity[i3 + 1] = this.velocity[i3 + 1] * damp - this.gravity[i] * dt;
      this.velocity[i3 + 2] *= damp;
      this.positions[i3] += this.velocity[i3] * dt;
      this.positions[i3 + 1] += this.velocity[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocity[i3 + 2] * dt;
      if (this.positions[i3 + 1] < 0.02 && this.gravity[i] > 0) {
        this.positions[i3 + 1] = 0.02;
        this.velocity[i3 + 1] *= -0.2;
      }
      const t = 1 - this.life[i] / this.maxLife[i];
      this.alphas[i] = Math.max(0, 1 - t * t);
      this.sizes[i] = this.baseSize[i] * (1 + this.growth[i] * t);
    }
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;
    alphaAttribute.needsUpdate = true;

    for (const item of this.tracerPool) {
      if (item.life <= 0) continue;
      item.life -= dt;
      item.line.material.opacity = Math.max(0, item.life / item.max) * 0.95;
      if (item.life <= 0) item.line.visible = false;
    }
  }
}
