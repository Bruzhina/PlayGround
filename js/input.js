const DEG = Math.PI / 180;

export class InputManager {
  constructor({ canvas, stickBase, stickKnob }) {
    this.canvas = canvas;
    this.stickBase = stickBase;
    this.stickKnob = stickKnob;
    this.enabled = false;
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.firing = false;
    this.ads = false;
    this.keys = new Set();
    this.pointerLocked = false;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.stickPointer = null;
    this.stickCenter = { x: 0, y: 0 };
    this.stickRadius = 52;
    this.lookPointer = null;
    this.lastLook = { x: 0, y: 0 };
    this.mouseDrag = null;
    this.tiltEnabled = false;
    this.tiltReady = false;
    this.tilt = { x: 0, y: 0 };
    this.tiltTarget = { x: 0, y: 0 };
    this.tiltBase = null;
    this.tiltListener = null;
    this.onAction = () => {};
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      const code = event.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'].includes(code)) {
        event.preventDefault();
      }
      this.keys.add(code);
      if (code === 'KeyR') this.onAction('reload');
      if (code === 'Escape') this.onAction('pause');
      if (code === 'KeyT') this.onAction('tilt');
      if (code === 'Space') this.firing = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'Space') this.firing = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.firing = false;
      this.ads = false;
      this.endStick();
      this.endLook();
    });

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    this.canvas.addEventListener('pointerdown', (event) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        if (event.button === 0) {
          this.firing = true;
          this.onAction('fire');
          if (!this.pointerLocked) {
            this.mouseDrag = { x: event.clientX, y: event.clientY };
            this.requestLock();
          }
        }
        if (event.button === 2) this.ads = true;
        return;
      }
      event.preventDefault();
      if (this.isStickZone(event.clientX, event.clientY) && this.stickPointer === null) {
        this.beginStick(event);
      } else if (this.lookPointer === null) {
        this.beginLook(event);
      }
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.enabled) return;
      if (event.pointerId === this.stickPointer) {
        this.updateStick(event);
        return;
      }
      if (event.pointerId === this.lookPointer) {
        this.look.x += event.clientX - this.lastLook.x;
        this.look.y += event.clientY - this.lastLook.y;
        this.lastLook.x = event.clientX;
        this.lastLook.y = event.clientY;
        return;
      }
      if (event.pointerType === 'mouse' && this.mouseDrag && !this.pointerLocked) {
        this.look.x += event.clientX - this.mouseDrag.x;
        this.look.y += event.clientY - this.mouseDrag.y;
        this.mouseDrag.x = event.clientX;
        this.mouseDrag.y = event.clientY;
      }
    });

    const release = (event) => {
      if (event.pointerId === this.stickPointer) this.endStick();
      if (event.pointerId === this.lookPointer) this.endLook();
    };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', release);

    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.firing = false;
      if (event.button === 2) this.ads = false;
      this.mouseDrag = null;
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.enabled || !this.pointerLocked) return;
      this.look.x += event.movementX;
      this.look.y += event.movementY;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('orientationchange', () => {
      this.tiltBase = null;
    });
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', () => {
        this.tiltBase = null;
      });
    }
  }

  isStickZone(x, y) {
    return x < window.innerWidth * 0.44 && y > window.innerHeight * 0.4;
  }

  requestLock() {
    if (this.isTouch) return;
    const request = this.canvas.requestPointerLock;
    if (request) {
      try {
        const result = request.call(this.canvas);
        if (result && result.catch) result.catch(() => {});
      } catch (error) {
        this.mouseDrag = { x: 0, y: 0 };
      }
    }
  }

  beginStick(event) {
    this.stickPointer = event.pointerId;
    this.stickCenter.x = event.clientX;
    this.stickCenter.y = event.clientY;
    this.stickRadius = Math.max(44, Math.min(64, window.innerWidth * 0.1));
    const size = this.stickBase.offsetWidth || 112;
    this.stickBase.style.left = `${event.clientX - size / 2}px`;
    this.stickBase.style.top = `${event.clientY - size / 2}px`;
    this.stickBase.style.bottom = 'auto';
    this.stickBase.classList.remove('stick-idle');
    this.stickBase.classList.add('stick-active');
    try { this.canvas.setPointerCapture(event.pointerId); } catch (error) {}
    this.updateStick(event);
  }

  updateStick(event) {
    let dx = event.clientX - this.stickCenter.x;
    let dy = event.clientY - this.stickCenter.y;
    const length = Math.hypot(dx, dy);
    const max = this.stickRadius;
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    this.move.x = dx / max;
    this.move.y = -dy / max;
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  endStick() {
    this.stickPointer = null;
    this.move.x = 0;
    this.move.y = 0;
    this.stickKnob.style.transform = 'translate(0px, 0px)';
    this.stickBase.classList.remove('stick-active');
    this.stickBase.classList.add('stick-idle');
    this.stickBase.style.left = '';
    this.stickBase.style.top = '';
    this.stickBase.style.bottom = '';
  }

  beginLook(event) {
    this.lookPointer = event.pointerId;
    this.lastLook.x = event.clientX;
    this.lastLook.y = event.clientY;
    try { this.canvas.setPointerCapture(event.pointerId); } catch (error) {}
  }

  endLook() {
    this.lookPointer = null;
  }

  update(dt) {
    if (this.stickPointer === null) {
      let x = 0;
      let y = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      this.move.x = x;
      this.move.y = y;
    }
    const smooth = Math.min(1, dt * 9);
    this.tilt.x += (this.tiltTarget.x - this.tilt.x) * smooth;
    this.tilt.y += (this.tiltTarget.y - this.tilt.y) * smooth;
  }

  takeLook() {
    const look = { x: this.look.x, y: this.look.y };
    this.look.x = 0;
    this.look.y = 0;
    return look;
  }

  get sprint() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.firing = false;
      this.ads = false;
      this.keys.clear();
      this.endStick();
      this.endLook();
      this.move.x = 0;
      this.move.y = 0;
      if (this.pointerLocked) document.exitPointerLock?.();
    }
  }

  screenAngle() {
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
      return ((window.screen.orientation.angle % 360) + 360) % 360;
    }
    return typeof window.orientation === 'number' ? ((window.orientation % 360) + 360) % 360 : 0;
  }

  async enableTilt() {
    const OrientationEvent = window.DeviceOrientationEvent;
    if (!OrientationEvent) return { ok: false, reason: 'unsupported' };
    if (typeof OrientationEvent.requestPermission === 'function') {
      try {
        const response = await OrientationEvent.requestPermission();
        if (response !== 'granted') return { ok: false, reason: 'denied' };
      } catch (error) {
        return { ok: false, reason: 'denied' };
      }
    }
    if (!this.tiltListener) {
      this.tiltListener = (event) => this.handleOrientation(event);
      window.addEventListener('deviceorientation', this.tiltListener, true);
    }
    this.tiltEnabled = true;
    this.tiltBase = null;
    this.tiltTarget.x = 0;
    this.tiltTarget.y = 0;
    return { ok: true, reason: 'granted' };
  }

  disableTilt() {
    this.tiltEnabled = false;
    this.tiltTarget.x = 0;
    this.tiltTarget.y = 0;
    this.tilt.x = 0;
    this.tilt.y = 0;
  }

  recenterTilt() {
    this.tiltBase = null;
  }

  handleOrientation(event) {
    if (!this.tiltEnabled) return;
    const beta = typeof event.beta === 'number' ? event.beta : 0;
    const gamma = typeof event.gamma === 'number' ? event.gamma : 0;
    if (event.beta === null && event.gamma === null) return;
    if (!this.tiltBase) {
      this.tiltBase = { beta, gamma };
      return;
    }
    this.tiltReady = true;
    const angle = this.screenAngle();
    let dy;
    let dp;
    if (angle === 90) {
      dy = beta - this.tiltBase.beta;
      dp = -(gamma - this.tiltBase.gamma);
    } else if (angle === 270) {
      dy = -(beta - this.tiltBase.beta);
      dp = gamma - this.tiltBase.gamma;
    } else {
      dy = gamma - this.tiltBase.gamma;
      dp = beta - this.tiltBase.beta;
    }
    const dead = 1.4;
    if (Math.abs(dy) < dead) dy = 0;
    if (Math.abs(dp) < dead) dp = 0;
    const yaw = Math.max(-55, Math.min(55, dy)) * DEG * 0.85;
    const pitch = Math.max(-40, Math.min(40, dp)) * DEG * 0.7;
    this.tiltTarget.x = yaw;
    this.tiltTarget.y = pitch;
  }
}
