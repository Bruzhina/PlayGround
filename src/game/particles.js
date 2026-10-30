import * as THREE from 'three';

const vertexShader = `
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = alpha;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (340.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float mask = smoothstep(0.5, 0.08, d);
    if (mask < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha * mask);
  }
`;

export class ParticleField {
  constructor(scene, capacity = 220, blending = THREE.NormalBlending) {
    this.capacity = capacity;
    this.cursor = 0;
    this.particles = [];
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.positions.fill(-9999);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending,
      vertexColors: true
    });

    this.geometry = geometry;
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  spawn(position, color, options = {}) {
    const {
      count = 1,
      speed = 2,
      spread = 1,
      gravity = -6,
      size = 0.12,
      life = 0.7,
      upward = 0.3,
      drag = 0.98
    } = options;

    for (let i = 0; i < count; i += 1) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      const particle = this.particles[index] || {};
      particle.life = life * (0.65 + Math.random() * 0.6);
      particle.maxLife = particle.life;
      particle.gravity = gravity;
      particle.drag = drag;
      particle.vx = (Math.random() - 0.5) * speed * spread;
      particle.vy = Math.random() * speed + upward;
      particle.vz = (Math.random() - 0.5) * speed * spread;
      this.particles[index] = particle;

      const offset = index * 3;
      this.positions[offset] = position.x + (Math.random() - 0.5) * 0.3;
      this.positions[offset + 1] = position.y + (Math.random() - 0.5) * 0.3;
      this.positions[offset + 2] = position.z + (Math.random() - 0.5) * 0.3;
      const tint = color instanceof THREE.Color ? color : new THREE.Color(color);
      const variation = 0.8 + Math.random() * 0.4;
      this.colors[offset] = tint.r * variation;
      this.colors[offset + 1] = tint.g * variation;
      this.colors[offset + 2] = tint.b * variation;
      this.sizes[index] = size * (0.65 + Math.random() * 0.7);
      this.alphas[index] = 1;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
  }

  update(dt) {
    let active = false;
    for (let i = 0; i < this.capacity; i += 1) {
      const particle = this.particles[i];
      if (!particle || particle.life <= 0) {
        if (this.alphas[i] !== 0) {
          this.alphas[i] = 0;
          active = true;
        }
        continue;
      }
      active = true;
      particle.life -= dt;
      particle.vy += particle.gravity * dt;
      particle.vx *= particle.drag;
      particle.vz *= particle.drag;
      const offset = i * 3;
      this.positions[offset] += particle.vx * dt;
      this.positions[offset + 1] += particle.vy * dt;
      this.positions[offset + 2] += particle.vz * dt;
      this.alphas[i] = Math.max(0, particle.life / particle.maxLife);
      if (particle.life <= 0) this.positions[offset + 1] = -9999;
    }
    if (active) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.alpha.needsUpdate = true;
    }
  }
}
