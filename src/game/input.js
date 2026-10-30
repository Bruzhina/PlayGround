import { clamp } from './utils.js';

const DEADZONE = 3.5;

export class InputManager {
  constructor({ canvas, onAction, onPause, onTiltChange }) {
    this.canvas = canvas;
    this.onAction = onAction;
    this.onPause = onPause;
    this.onTiltChange = onTiltChange;
    this.enabled = false;
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.lookDelta = { x: 0, y: 0 };
    this.fireHeld = false;
    this.sprint = false;
    this.sensitivity = 1;
    this.isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.pointerLocked = false;
    this.tiltEnabled = false;
    this.tiltAvailable = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    this.tiltRate = { x: 0, y: 0 };
    this.tiltBase = null;
    this.tiltScreenAngle = 0;
    this.joyPointer = null;
    this.lookPointer = null;
    this.lookLast = { x: 0, y: 0 };
    this.dragLook = false;
    this.suppressUnlockPause = false;
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    window.addEventListener('keyup', (event) => this.handleKeyUp(event));
    window.addEventListener('blur', () => this.releaseAll());

    this.canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled || this.isTouch) return;
      if (!this.pointerLocked) {
        this.requestPointerLock();
        return;
      }
      if (event.button === 0) this.fireHeld = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.fireHeld = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.pointerLocked;
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (wasLocked && !this.pointerLocked) {
        this.fireHeld = false;
        this.keys.clear();
        if (this.suppressUnlockPause) this.suppressUnlockPause = false;
        else this.onPause?.();
      }
    });
    document.addEventListener('mousemove', (event) => {
      if (!this.enabled || !this.pointerLocked) return;
      this.lookDelta.x += event.movementX || 0;
      this.lookDelta.y += event.movementY || 0;
    });

    const joystick = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    if (joystick && stick) {
      const updateJoystick = (event) => {
        const rect = joystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const radius = rect.width * 0.32;
        let dx = event.clientX - cx;
        let dy = event.clientY - cy;
        const length = Math.hypot(dx, dy);
        if (length > radius) {
          dx = (dx / length) * radius;
          dy = (dy / length) * radius;
        }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        this.move.x = dx / radius;
        this.move.y = -dy / radius;
      };
      joystick.addEventListener('pointerdown', (event) => {
        if (!this.enabled) return;
        event.preventDefault();
        this.joyPointer = event.pointerId;
        joystick.setPointerCapture?.(event.pointerId);
        updateJoystick(event);
      });
      joystick.addEventListener('pointermove', (event) => {
        if (event.pointerId !== this.joyPointer) return;
        event.preventDefault();
        updateJoystick(event);
      });
      const endJoystick = (event) => {
        if (event.pointerId !== this.joyPointer) return;
        this.joyPointer = null;
        this.move.x = 0;
        this.move.y = 0;
        stick.style.transform = 'translate(0, 0)';
      };
      joystick.addEventListener('pointerup', endJoystick);
      joystick.addEventListener('pointercancel', endJoystick);
      joystick.addEventListener('lostpointercapture', endJoystick);
    }

    const lookZone = document.getElementById('look-zone');
    if (lookZone) {
      lookZone.addEventListener('pointerdown', (event) => {
        if (!this.enabled) return;
        event.preventDefault();
        this.lookPointer = event.pointerId;
        this.lookLast.x = event.clientX;
        this.lookLast.y = event.clientY;
        lookZone.setPointerCapture?.(event.pointerId);
      });
      lookZone.addEventListener('pointermove', (event) => {
        if (event.pointerId !== this.lookPointer) return;
        event.preventDefault();
        this.lookDelta.x += event.clientX - this.lookLast.x;
        this.lookDelta.y += event.clientY - this.lookLast.y;
        this.lookLast.x = event.clientX;
        this.lookLast.y = event.clientY;
      });
      const endLook = (event) => {
        if (event.pointerId === this.lookPointer) this.lookPointer = null;
      };
      lookZone.addEventListener('pointerup', endLook);
      lookZone.addEventListener('pointercancel', endLook);
      lookZone.addEventListener('lostpointercapture', endLook);
    }

    document.querySelectorAll('[data-action]').forEach((button) => {
      const action = button.dataset.action;
      button.addEventListener('pointerdown', (event) => {
        if (!this.enabled) return;
        event.preventDefault();
        event.stopPropagation();
        if (action === 'fire') {
          this.fireHeld = true;
          button.classList.add('held');
          button.setPointerCapture?.(event.pointerId);
        } else {
          this.onAction?.(action);
        }
      });
      const release = (event) => {
        if (action === 'fire') {
          this.fireHeld = false;
          button.classList.remove('held');
        }
        if (event?.pointerId != null) {
          try { button.releasePointerCapture(event.pointerId); } catch {}
        }
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    });

    if (this.tiltAvailable) {
      window.addEventListener('deviceorientation', (event) => this.handleOrientation(event), true);
    }
  }

  handleKeyDown(event) {
    if (!this.enabled) return;
    const code = event.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      event.preventDefault();
    }
    if (code === 'Escape') {
      this.onPause?.();
      return;
    }
    if (this.keys.has(code)) return;
    this.keys.add(code);
    if (code === 'Space') this.onAction?.('jump');
    if (code === 'KeyB') this.onAction?.('build');
    if (code === 'KeyR') this.onAction?.('reload');
    if (code === 'KeyF') this.onAction?.('eat');
    if (code === 'KeyT') this.onAction?.('tilt');
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.sprint = true;
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.sprint = false;
  }

  requestPointerLock() {
    if (this.isTouch) return;
    this.canvas.requestPointerLock?.();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.releaseAll();
    if (!enabled && document.pointerLockElement === this.canvas) {
      this.suppressUnlockPause = true;
      document.exitPointerLock?.();
    }
  }

  releaseAll() {
    this.keys.clear();
    this.move.x = 0;
    this.move.y = 0;
    this.fireHeld = false;
    this.sprint = false;
    this.lookPointer = null;
    this.joyPointer = null;
    this.tiltRate.x = 0;
    this.tiltRate.y = 0;
    document.querySelectorAll('.tbtn.held').forEach((button) => button.classList.remove('held'));
  }

  getMovement() {
    let x = this.move.x;
    let y = this.move.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  consumeLook() {
    const result = {
      x: this.lookDelta.x * 0.00235 * this.sensitivity,
      y: this.lookDelta.y * 0.0021 * this.sensitivity
    };
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return result;
  }

  consumeTilt(dt) {
    if (!this.tiltEnabled) return { x: 0, y: 0 };
    return {
      x: this.tiltRate.x * dt * 1.7 * this.sensitivity,
      y: this.tiltRate.y * dt * 1.15 * this.sensitivity
    };
  }

  setSensitivity(value) {
    this.sensitivity = clamp(value, 0.5, 2);
  }

  handleOrientation(event) {
    if (!this.tiltEnabled) return;
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    this.tiltScreenAngle = angle;
    let rawX = event.gamma || 0;
    let rawY = event.beta || 0;
    if (Math.abs(angle) === 90) {
      const swapped = rawX;
      rawX = rawY;
      rawY = -swapped;
    } else if (Math.abs(angle) === 180) {
      rawX = -rawX;
      rawY = -rawY;
    }
    if (!this.tiltBase) {
      this.tiltBase = { x: rawX, y: rawY };
      return;
    }
    const applyDeadzone = (value) => {
      if (Math.abs(value) < DEADZONE) return 0;
      return Math.sign(value) * (Math.abs(value) - DEADZONE);
    };
    this.tiltRate.x = clamp(applyDeadzone(rawX - this.tiltBase.x) / 28, -1, 1);
    this.tiltRate.y = clamp(applyDeadzone(rawY - this.tiltBase.y) / 32, -1, 1);
  }

  recenterTilt() {
    this.tiltBase = null;
    this.tiltRate.x = 0;
    this.tiltRate.y = 0;
  }

  async enableTilt() {
    if (!this.tiltAvailable) return { granted: false, reason: 'unavailable' };
    try {
      const MotionEvent = window.DeviceMotionEvent;
      const OrientationEvent = window.DeviceOrientationEvent;
      if (MotionEvent && typeof MotionEvent.requestPermission === 'function') {
        const motion = await MotionEvent.requestPermission();
        if (motion !== 'granted') return { granted: false, reason: 'denied' };
      }
      if (OrientationEvent && typeof OrientationEvent.requestPermission === 'function') {
        const orientation = await OrientationEvent.requestPermission();
        if (orientation !== 'granted') return { granted: false, reason: 'denied' };
      }
      this.tiltEnabled = true;
      this.tiltBase = null;
      this.tiltRate.x = 0;
      this.tiltRate.y = 0;
      this.onTiltChange?.(true);
      return { granted: true };
    } catch (error) {
      return { granted: false, reason: error?.message || 'error' };
    }
  }

  disableTilt() {
    this.tiltEnabled = false;
    this.tiltBase = null;
    this.tiltRate.x = 0;
    this.tiltRate.y = 0;
    this.onTiltChange?.(false);
  }
}
