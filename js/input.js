const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"
]);

export class Input {
  constructor() {
    this.canvas = null;
    this.enabled = false;
    this.keys = new Set();
    this.dashQueued = false;
    this.pointer = { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, radius: 58 };
    this.tilt = {
      supported: typeof window !== "undefined" && "DeviceOrientationEvent" in window,
      enabled: false,
      available: false,
      baseline: null,
      targetX: 0,
      targetY: 0,
      x: 0,
      y: 0,
      lastEvent: 0
    };
    this.onJoystickChange = null;
    this.onDashRequest = null;
    this.bound = false;
  }

  attach(canvas) {
    this.canvas = canvas;
    if (this.bound) return;
    this.bound = true;
    canvas.addEventListener("pointerdown", event => this.onPointerDown(event));
    canvas.addEventListener("pointermove", event => this.onPointerMove(event));
    canvas.addEventListener("pointerup", event => this.onPointerUp(event));
    canvas.addEventListener("pointercancel", event => this.onPointerUp(event));
    canvas.addEventListener("lostpointercapture", event => this.onPointerUp(event));
    window.addEventListener("keydown", event => this.onKeyDown(event));
    window.addEventListener("keyup", event => this.onKeyUp(event));
    window.addEventListener("blur", () => this.clear());
    window.addEventListener("orientationchange", () => {
      this.tilt.baseline = null;
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  clear() {
    this.keys.clear();
    this.pointer.active = false;
    this.pointer.id = null;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    this.dashQueued = false;
    if (this.onJoystickChange) this.onJoystickChange(this.pointer);
  }

  onKeyDown(event) {
    if (MOVE_KEYS.has(event.code)) {
      this.keys.add(event.code);
      if (this.enabled) event.preventDefault();
    }
    if ((event.code === "Space" || event.code === "ShiftLeft") && this.enabled) {
      event.preventDefault();
      this.requestDash();
    }
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  requestDash() {
    if (!this.enabled) return;
    this.dashQueued = true;
    if (this.onDashRequest) this.onDashRequest();
  }

  onPointerDown(event) {
    if (!this.enabled || this.pointer.active) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    this.pointer.active = true;
    this.pointer.id = event.pointerId;
    this.pointer.ox = event.clientX;
    this.pointer.oy = event.clientY;
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    if (this.onJoystickChange) this.onJoystickChange(this.pointer);
  }

  onPointerMove(event) {
    if (!this.pointer.active || event.pointerId !== this.pointer.id) return;
    event.preventDefault();
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    let dx = event.clientX - this.pointer.ox;
    let dy = event.clientY - this.pointer.oy;
    const radius = this.pointer.radius;
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    const norm = Math.hypot(dx, dy) / radius;
    if (norm < 0.14) {
      this.pointer.dx = 0;
      this.pointer.dy = 0;
    } else {
      const scaled = Math.min(1, (norm - 0.14) / 0.72);
      const inv = length > 0 ? scaled / Math.hypot(dx, dy) : 0;
      this.pointer.dx = dx * inv;
      this.pointer.dy = dy * inv;
    }
    if (this.onJoystickChange) this.onJoystickChange(this.pointer);
  }

  onPointerUp(event) {
    if (!this.pointer.active) return;
    if (event.pointerId !== undefined && event.pointerId !== this.pointer.id) return;
    this.pointer.active = false;
    this.pointer.id = null;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    if (this.onJoystickChange) this.onJoystickChange(this.pointer);
  }

  async toggleTilt() {
    if (this.tilt.enabled) {
      this.disableTilt();
      return { enabled: false, reason: "disabled" };
    }
    if (!this.tilt.supported) {
      return { enabled: false, reason: "unsupported" };
    }
    const Request = window.DeviceOrientationEvent && window.DeviceOrientationEvent.requestPermission;
    if (typeof Request === "function") {
      try {
        const permission = await Request.call(window.DeviceOrientationEvent);
        if (permission !== "granted") return { enabled: false, reason: "denied" };
      } catch {
        return { enabled: false, reason: "denied" };
      }
    }
    this.enableTilt();
    return { enabled: true, reason: "enabled" };
  }

  enableTilt() {
    if (this.tilt.listener) window.removeEventListener("deviceorientation", this.tilt.listener);
    this.tilt.baseline = null;
    this.tilt.enabled = true;
    this.tilt.targetX = 0;
    this.tilt.targetY = 0;
    this.tilt.x = 0;
    this.tilt.y = 0;
    this.tilt.listener = event => this.onOrientation(event);
    window.addEventListener("deviceorientation", this.tilt.listener, true);
  }

  disableTilt() {
    this.tilt.enabled = false;
    this.tilt.available = false;
    this.tilt.targetX = 0;
    this.tilt.targetY = 0;
    this.tilt.x = 0;
    this.tilt.y = 0;
    if (this.tilt.listener) {
      window.removeEventListener("deviceorientation", this.tilt.listener, true);
      this.tilt.listener = null;
    }
  }

  calibrateTilt() {
    this.tilt.baseline = null;
  }

  onOrientation(event) {
    if (event.beta === null && event.gamma === null) return;
    this.tilt.available = true;
    this.tilt.lastEvent = performance.now();
    if (!this.tilt.baseline) {
      this.tilt.baseline = { beta: event.beta || 0, gamma: event.gamma || 0 };
      return;
    }
    let dx = (event.gamma || 0) - this.tilt.baseline.gamma;
    let dy = (event.beta || 0) - this.tilt.baseline.beta;
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    const normalized = ((angle % 360) + 360) % 360;
    if (normalized === 90) {
      const nextX = dy;
      dy = -dx;
      dx = nextX;
    } else if (normalized === 270) {
      const nextX = -dy;
      dy = dx;
      dx = nextX;
    } else if (normalized === 180) {
      dx = -dx;
      dy = -dy;
    }
    let tx = dx / 26;
    let ty = dy / 26;
    const magnitude = Math.hypot(tx, ty);
    if (magnitude < 0.14) {
      tx = 0;
      ty = 0;
    } else {
      const scaled = Math.min(1, (magnitude - 0.14) / 0.72);
      tx = (tx / magnitude) * scaled;
      ty = (ty / magnitude) * scaled;
    }
    this.tilt.targetX = Math.max(-1, Math.min(1, tx));
    this.tilt.targetY = Math.max(-1, Math.min(1, ty));
  }

  update(dt) {
    if (!this.tilt.enabled) return;
    const k = 1 - Math.exp(-dt * 14);
    this.tilt.x += (this.tilt.targetX - this.tilt.x) * k;
    this.tilt.y += (this.tilt.targetY - this.tilt.y) * k;
  }

  vector() {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (this.pointer.active) {
      x += this.pointer.dx;
      y += this.pointer.dy;
    } else if (this.tilt.enabled) {
      x += this.tilt.x;
      y += this.tilt.y;
    }
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y, length: Math.min(1, length) };
  }

  consumeDash() {
    const queued = this.dashQueued;
    this.dashQueued = false;
    return queued;
  }
}
