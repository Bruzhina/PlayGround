import * as THREE from 'three'

export class Input {
  constructor(player, audio, renderer, options = {}) {
    this.player = player
    this.audio = audio
    this.renderer = renderer
    this.canvas = renderer.domElement
    this.options = options
    this.keys = new Set()
    this.moveX = 0
    this.moveY = 0
    this.sprint = false
    this.ascend = false
    this.descend = false
    this.ascendTouch = false
    this.descendTouch = false
    this.firing = false
    this.jumpPressed = false
    this.reloadPressed = false
    this.flyPressed = false
    this.lookImpulseX = 0
    this.lookImpulseY = 0
    this.joystickPointer = null
    this.lookPointer = null
    this.lastTouch = null
    this.dragging = false
    this.lastMouse = { x: 0, y: 0 }
    this.tiltEnabled = false
    this.tiltSensitivity = 1
    this.tiltLast = null
    this.tiltHandler = null
    this.tiltSupported = typeof window.DeviceOrientationEvent !== 'undefined'
    this.isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || window.innerWidth <= 820

    if (this.isTouch) document.body.classList.add('touch')
    this.bindKeyboard()
    this.bindMouse()
    this.bindTouch()
    this.bindSettings()
    this.bindButtons()
  }

  active() {
    return this.options.isActive ? this.options.isActive() : true
  }

  bindKeyboard() {
    window.addEventListener('keydown', event => {
      if (event.repeat) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && this.active()) event.preventDefault()
        return
      }
      this.keys.add(event.code)
      if (event.code === 'KeyF' && this.active()) this.flyPressed = true
      if (event.code === 'KeyR' && this.active()) this.reloadPressed = true
      if (event.code === 'Space' && this.active()) {
        this.jumpPressed = true
        event.preventDefault()
      }
      if (event.code === 'Escape' && this.active()) {
        if (this.options.onPause) this.options.onPause()
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && this.active()) event.preventDefault()
    })
    window.addEventListener('keyup', event => {
      this.keys.delete(event.code)
    })
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.firing = false
      this.ascend = false
      this.descend = false
    })
  }

  bindMouse() {
    this.canvas.addEventListener('mousedown', event => {
      if (!this.active()) return
      if (event.button === 0) this.firing = true
      if (document.pointerLockElement !== this.canvas) {
        this.dragging = true
        this.lastMouse.x = event.clientX
        this.lastMouse.y = event.clientY
      }
    })
    window.addEventListener('mouseup', event => {
      if (event.button === 0) {
        this.firing = false
        this.dragging = false
      }
    })
    window.addEventListener('mousemove', event => {
      if (!this.active()) return
      if (document.pointerLockElement === this.canvas) {
        this.applyLook(event.movementX, event.movementY)
      } else if (this.dragging) {
        const dx = event.clientX - this.lastMouse.x
        const dy = event.clientY - this.lastMouse.y
        this.lastMouse.x = event.clientX
        this.lastMouse.y = event.clientY
        this.applyLook(dx * 1.35, dy * 1.35)
      }
    })
    this.canvas.addEventListener('contextmenu', event => event.preventDefault())
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.canvas && this.active() && this.options.onPointerLockLost) {
        this.options.onPointerLockLost()
      }
    })
  }

  applyLook(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
    this.player.addLook(dx, dy)
    this.lookImpulseX += dx
    this.lookImpulseY += dy
  }

  bindTouch() {
    const stick = document.getElementById('stick-base')
    const knob = document.getElementById('stick-knob')
    if (stick && knob) {
      const updateStick = event => {
        const rect = stick.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const max = rect.width * 0.32
        let dx = event.clientX - cx
        let dy = event.clientY - cy
        const len = Math.hypot(dx, dy)
        if (len > max) {
          dx = (dx / len) * max
          dy = (dy / len) * max
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`
        this.moveX = dx / max
        this.moveY = -dy / max
      }
      const release = () => {
        this.joystickPointer = null
        this.moveX = 0
        this.moveY = 0
        knob.style.transform = ''
      }
      stick.addEventListener('pointerdown', event => {
        if (!this.active()) return
        event.preventDefault()
        this.joystickPointer = event.pointerId
        try { stick.setPointerCapture(event.pointerId) } catch {}
        updateStick(event)
      })
      stick.addEventListener('pointermove', event => {
        if (this.joystickPointer !== event.pointerId) return
        event.preventDefault()
        updateStick(event)
      })
      stick.addEventListener('pointerup', release)
      stick.addEventListener('pointercancel', release)
    }

    this.canvas.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !this.active()) return
      if (event.clientX < window.innerWidth * 0.34) return
      if (this.lookPointer !== null) return
      this.lookPointer = event.pointerId
      this.lastTouch = { x: event.clientX, y: event.clientY }
      try { this.canvas.setPointerCapture(event.pointerId) } catch {}
    })
    this.canvas.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch' || event.pointerId !== this.lookPointer || !this.lastTouch) return
      const dx = event.clientX - this.lastTouch.x
      const dy = event.clientY - this.lastTouch.y
      this.lastTouch.x = event.clientX
      this.lastTouch.y = event.clientY
      this.applyLook(dx * 1.55, dy * 1.55)
    })
    const endTouch = event => {
      if (event.pointerId === this.lookPointer) {
        this.lookPointer = null
        this.lastTouch = null
      }
    }
    this.canvas.addEventListener('pointerup', endTouch)
    this.canvas.addEventListener('pointercancel', endTouch)
  }

  bindButtons() {
    const bindHold = (id, on, off) => {
      const el = document.getElementById(id)
      if (!el) return
      const down = event => {
        event.preventDefault()
        event.stopPropagation()
        if (!this.active()) return
        el.classList.add('pressed')
        try { el.setPointerCapture?.(event.pointerId) } catch {}
        on()
      }
      const up = event => {
        event.preventDefault()
        event.stopPropagation()
        el.classList.remove('pressed')
        off()
      }
      el.addEventListener('pointerdown', down)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
      el.addEventListener('pointerleave', up)
    }
    bindHold('btn-fire', () => { this.firing = true }, () => { this.firing = false })
    bindHold('btn-up', () => { this.ascendTouch = true }, () => { this.ascendTouch = false })
    bindHold('btn-down', () => { this.descendTouch = true }, () => { this.descendTouch = false })
    bindHold('btn-reload', () => { this.reloadPressed = true }, () => {})
    bindHold('btn-fly', () => { this.flyPressed = true }, () => {})
    for (const id of ['btn-pause', 'desktop-pause']) {
      const el = document.getElementById(id)
      if (el) el.addEventListener('click', event => {
        event.stopPropagation()
        if (this.options.onPause) this.options.onPause()
      })
    }
  }

  bindSettings() {
    const sens = document.getElementById('sensitivity')
    const sensValue = document.getElementById('sensitivity-value')
    if (sens) {
      const update = () => {
        this.player.lookSensitivity = Number(sens.value)
        if (sensValue) sensValue.textContent = Number(sens.value).toFixed(2)
      }
      sens.addEventListener('input', update)
      update()
    }
    const tiltSens = document.getElementById('tilt-sensitivity')
    const tiltValue = document.getElementById('tilt-value')
    if (tiltSens) {
      const update = () => {
        this.tiltSensitivity = Number(tiltSens.value)
        if (tiltValue) tiltValue.textContent = Number(tiltSens.value).toFixed(2)
      }
      tiltSens.addEventListener('input', update)
      update()
    }
    const invert = document.getElementById('invert-toggle')
    if (invert) {
      invert.addEventListener('click', () => {
        this.player.invertY = !this.player.invertY
        invert.setAttribute('aria-checked', String(this.player.invertY))
        invert.querySelector('em').textContent = this.player.invertY ? 'ON' : 'OFF'
        this.audio.click()
      })
    }
    const quality = document.getElementById('quality-select')
    if (quality) {
      quality.addEventListener('change', () => {
        if (this.options.onQualityChange) this.options.onQualityChange(quality.value)
      })
    }
    const tiltToggle = document.getElementById('tilt-toggle')
    if (tiltToggle) {
      tiltToggle.addEventListener('click', () => { this.toggleTilt() })
    }
    const quickTilt = document.getElementById('btn-tilt')
    if (quickTilt) {
      quickTilt.addEventListener('click', event => {
        event.stopPropagation()
        this.toggleTilt()
      })
    }
    const calibrate = document.getElementById('tilt-calibrate')
    if (calibrate) {
      calibrate.addEventListener('click', () => {
        this.tiltLast = null
        this.audio.click()
        if (this.options.onToast) this.options.onToast(this.tiltEnabled ? 'TILT RECENTERED' : 'ENABLE TILT FIRST')
      })
    }
  }

  async toggleTilt() {
    if (this.tiltEnabled) {
      this.disableTilt()
      return
    }
    try {
      await this.enableTilt()
    } catch (error) {
      this.setTiltUi(false)
      if (this.options.onToast) this.options.onToast('MOTION PERMISSION DENIED')
    }
  }

  async enableTilt() {
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      if (this.options.onToast) this.options.onToast('MOTION SENSORS NOT AVAILABLE')
      return false
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const state = await DeviceOrientationEvent.requestPermission()
      if (state !== 'granted') {
        this.setTiltUi(false)
        if (this.options.onToast) this.options.onToast('MOTION PERMISSION DENIED')
        return false
      }
    }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { await DeviceMotionEvent.requestPermission() } catch {}
    }
    this.tiltHandler = event => this.onOrientation(event)
    window.addEventListener('deviceorientation', this.tiltHandler, true)
    this.tiltEnabled = true
    this.tiltLast = null
    this.setTiltUi(true)
    this.audio.click()
    if (this.options.onToast) this.options.onToast('TILT AIM ENABLED — RECENTER TO CALIBRATE')
    return true
  }

  disableTilt() {
    if (this.tiltHandler) window.removeEventListener('deviceorientation', this.tiltHandler, true)
    this.tiltHandler = null
    this.tiltEnabled = false
    this.tiltLast = null
    this.setTiltUi(false)
    this.audio.click()
    if (this.options.onToast) this.options.onToast('TILT AIM DISABLED')
  }

  setTiltUi(on) {
    const tiltToggle = document.getElementById('tilt-toggle')
    if (tiltToggle) {
      tiltToggle.setAttribute('aria-checked', String(on))
      const em = tiltToggle.querySelector('em')
      if (em) em.textContent = on ? 'ON' : 'OFF'
    }
    const quick = document.getElementById('btn-tilt')
    if (quick) quick.classList.toggle('active', on)
  }

  onOrientation(event) {
    if (!this.tiltEnabled || event.beta == null || event.gamma == null) return
    if (!this.active()) {
      this.tiltLast = null
      return
    }
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0
    let yawSource
    let pitchSource
    if (angle === 90) {
      yawSource = -event.beta
      pitchSource = -event.gamma
    } else if (angle === -90 || angle === 270) {
      yawSource = event.beta
      pitchSource = event.gamma
    } else if (angle === 180) {
      yawSource = -event.gamma
      pitchSource = -event.beta
    } else {
      yawSource = event.gamma
      pitchSource = event.beta
    }
    if (!this.tiltLast) {
      this.tiltLast = { yaw: yawSource, pitch: pitchSource }
      return
    }
    let dy = yawSource - this.tiltLast.yaw
    let dp = pitchSource - this.tiltLast.pitch
    if (dy > 180) dy -= 360
    if (dy < -180) dy += 360
    this.tiltLast.yaw = yawSource
    this.tiltLast.pitch = pitchSource
    const s = 0.0135 * this.tiltSensitivity
    this.player.yaw -= dy * s
    const pitchDir = this.player.invertY ? 1 : -1
    this.player.pitch = THREE.MathUtils.clamp(this.player.pitch + dp * s * pitchDir, -1.42, 1.42)
  }

  endFrame() {
    this.jumpPressed = false
    this.reloadPressed = false
    this.flyPressed = false
    this.lookImpulseX = 0
    this.lookImpulseY = 0
  }

  update() {
    const k = this.keys
    let x = 0
    let y = 0
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1
    if (x !== 0 || y !== 0) {
      this.moveX = x
      this.moveY = y
    } else if (!this.joystickPointer) {
      this.moveX = 0
      this.moveY = 0
    }
    if (this.isTouch) {
      const jx = this.joystickPointer ? this.moveX : 0
      const jy = this.joystickPointer ? this.moveY : 0
      if (this.joystickPointer) {
        this.moveX = jx
        this.moveY = jy
      }
    }
    this.sprint = k.has('ShiftLeft') || k.has('ShiftRight')
    this.ascend = k.has('Space') || this.ascendTouch
    this.descend = k.has('ControlLeft') || k.has('KeyC') || this.descendTouch
    if (this.player.flying) {
      this.descend = this.descend || k.has('ShiftLeft') || k.has('ShiftRight')
    }
  }

  requestPointerLock() {
    if (this.isTouch) return
    try {
      const result = this.canvas.requestPointerLock()
      if (result && result.catch) result.catch(() => {})
    } catch {}
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.canvas && document.exitPointerLock) document.exitPointerLock()
  }

  reset() {
    this.keys.clear()
    this.firing = false
    this.ascend = false
    this.descend = false
    this.ascendTouch = false
    this.descendTouch = false
    this.jumpPressed = false
    this.reloadPressed = false
    this.flyPressed = false
    this.lookImpulseX = 0
    this.lookImpulseY = 0
    this.moveX = 0
    this.moveY = 0
    this.joystickPointer = null
    this.lookPointer = null
    const knob = document.getElementById('stick-knob')
    if (knob) knob.style.transform = ''
  }
}
