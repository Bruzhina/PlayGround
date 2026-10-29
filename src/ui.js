export class UI {
  constructor(audio, callbacks = {}) {
    this.audio = audio
    this.callbacks = callbacks
    this.score = 0
    this.wave = 1
    this.flashTime = 0
    this.toastTimer = null
    this.waveTimer = null
    this.panelOpen = null

    this.el = {
      start: document.getElementById('start-screen'),
      hud: document.getElementById('hud'),
      pause: document.getElementById('pause-screen'),
      loading: document.getElementById('loading'),
      score: document.getElementById('score'),
      wave: document.getElementById('wave'),
      ammo: document.getElementById('ammo'),
      reserve: document.getElementById('reserve'),
      reloadBar: document.getElementById('reload-bar'),
      reloadFill: document.querySelector('#reload-bar i'),
      waveBanner: document.getElementById('wave-banner'),
      waveText: document.querySelector('#wave-banner span'),
      toast: document.getElementById('toast'),
      killfeed: document.getElementById('killfeed'),
      hitmarker: document.getElementById('hitmarker'),
      crosshair: document.getElementById('crosshair'),
      flight: document.getElementById('flight-state'),
      altitude: document.getElementById('altitude'),
      companion: document.getElementById('mobile-controls'),
      btnFly: document.getElementById('btn-fly'),
      blockFlash: document.getElementById('block-flash'),
      compass: document.getElementById('compass'),
      radar: document.getElementById('radar'),
      radarWrap: document.getElementById('radar-wrap'),
      settings: document.getElementById('settings-panel'),
      controls: document.getElementById('controls-panel'),
      pauseKills: document.getElementById('pause-kills'),
      pauseWave: document.getElementById('pause-wave'),
      pauseScore: document.getElementById('pause-score')
    }
    this.compassMarks = this.el.compass ? [...this.el.compass.querySelectorAll('span')] : []
    this.radarCtx = this.el.radar ? this.el.radar.getContext('2d') : null
    this.bind()
  }

  bind() {
    const on = (id, fn) => {
      const el = document.getElementById(id)
      if (el) el.addEventListener('click', fn)
    }
    on('start-btn', () => {
      this.audio.init()
      this.audio.click()
      if (this.callbacks.onStart) this.callbacks.onStart()
    })
    on('settings-btn', () => {
      this.audio.click()
      this.openPanel('settings')
    })
    on('controls-btn', () => {
      this.audio.click()
      this.openPanel('controls')
    })
    on('settings-close', () => this.closePanel())
    on('controls-close', () => this.closePanel())
    on('resume-btn', () => {
      this.audio.click()
      if (this.callbacks.onResume) this.callbacks.onResume()
    })
    on('pause-settings-btn', () => {
      this.audio.click()
      this.openPanel('settings')
    })
    on('restart-btn', () => {
      this.audio.click()
      if (this.callbacks.onRestart) this.callbacks.onRestart()
    })
    on('settings-panel', event => event.stopPropagation())
    on('controls-panel', event => event.stopPropagation())
    window.addEventListener('keydown', event => {
      if (event.code === 'Escape' && this.panelOpen) {
        event.stopImmediatePropagation()
        this.closePanel()
      }
    }, true)
  }

  openPanel(name) {
    this.panelOpen = name
    this.el.settings.classList.toggle('hidden', name !== 'settings')
    this.el.controls.classList.toggle('hidden', name !== 'controls')
  }

  closePanel() {
    this.panelOpen = null
    this.el.settings.classList.add('hidden')
    this.el.controls.classList.add('hidden')
  }

  hideLoading() {
    this.el.loading.classList.add('done')
    setTimeout(() => this.el.loading.classList.add('hidden'), 600)
  }

  showStart() {
    this.el.start.classList.remove('hidden')
    this.el.hud.classList.add('hidden')
    this.el.pause.classList.add('hidden')
    this.closePanel()
  }

  startGame() {
    this.el.start.classList.add('hidden')
    this.el.pause.classList.add('hidden')
    this.el.hud.classList.remove('hidden')
    if (document.body.classList.contains('touch')) this.el.companion.classList.remove('hidden')
    this.closePanel()
  }

  showPause() {
    this.el.pause.classList.remove('hidden')
    this.el.pauseKills.textContent = this.callbacks.getKills ? this.callbacks.getKills() : '0'
    this.el.pauseWave.textContent = this.wave
    this.el.pauseScore.textContent = this.score
    this.releaseLook()
  }

  hidePause() {
    this.el.pause.classList.add('hidden')
  }

  releaseLook() {
    if (this.callbacks.releasePointerLock) this.callbacks.releasePointerLock()
  }

  setScore(score) {
    this.score = score
    this.el.score.textContent = score.toLocaleString('en-US')
  }

  addScore(amount) {
    this.setScore(this.score + amount)
  }

  setWave(wave) {
    this.wave = wave
    this.el.wave.textContent = String(wave).padStart(2, '0')
  }

  setAmmo(ammo, reserve) {
    this.el.ammo.textContent = String(ammo).padStart(2, '0')
    this.el.ammo.style.color = ammo <= 5 ? '#ff8a7a' : ''
    this.el.reserve.textContent = String(reserve)
  }

  startReload(duration) {
    this.el.reloadBar.style.opacity = '1'
    this.el.reloadFill.style.width = '0%'
    this.reloadDuration = duration
  }

  updateReload(progress) {
    this.el.reloadFill.style.width = `${Math.round(progress * 100)}%`
  }

  endReload(ammo, reserve) {
    this.el.reloadBar.style.opacity = '0'
    this.setAmmo(ammo, reserve)
  }

  firing() {
    this.el.crosshair.classList.add('firing')
    clearTimeout(this.fireTimer)
    this.fireTimer = setTimeout(() => this.el.crosshair.classList.remove('firing'), 90)
  }

  hitmarker(headshot = false) {
    const el = this.el.hitmarker
    el.classList.remove('show', 'head')
    void el.offsetWidth
    if (headshot) el.classList.add('head')
    el.classList.add('show')
  }

  pulseShield() {
    this.flashTime = 0.35
    const bar = document.querySelector('.bar.shield i')
    if (bar) {
      bar.style.filter = 'brightness(2.2)'
      bar.style.width = '100%'
      setTimeout(() => { bar.style.filter = '' }, 220)
    }
  }

  killfeed(text, headshot = false) {
    const item = document.createElement('div')
    item.className = `kill-item${headshot ? ' head' : ''}`
    item.innerHTML = `<b>${headshot ? '× HEADSHOT' : '×'}</b> ${text}`
    this.el.killfeed.appendChild(item)
    while (this.el.killfeed.children.length > 5) this.el.killfeed.firstChild.remove()
    setTimeout(() => {
      item.classList.add('out')
      setTimeout(() => item.remove(), 320)
    }, 2800)
  }

  showWave(wave) {
    this.setWave(wave)
    this.el.waveText.textContent = `WAVE ${String(wave).padStart(2, '0')} — HOSTILES INBOUND`
    this.el.waveBanner.classList.remove('hidden')
    clearTimeout(this.waveTimer)
    this.waveTimer = setTimeout(() => this.el.waveBanner.classList.add('hidden'), 2600)
  }

  toast(text, duration = 2200) {
    this.el.toast.textContent = text
    this.el.toast.classList.remove('hidden')
    clearTimeout(this.toastTimer)
    this.toastTimer = setTimeout(() => this.el.toast.classList.add('hidden'), duration)
  }

  setFlight(flying, altitude) {
    this.el.flight.textContent = flying ? 'FLIGHT // HOVER' : 'GROUND'
    this.el.flight.classList.toggle('active', flying)
    this.el.altitude.textContent = `ALT ${altitude.toFixed(1)} M`
    this.el.btnFly.classList.toggle('active', flying)
    this.el.btnFly.querySelector('span').textContent = flying ? 'LAND' : 'FLY'
    this.el.crosshair.style.transform = `translate(-50%, -50%) scale(${flying ? 1.05 : 1})`
  }

  updateCompass(yaw) {
    const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360
    for (const mark of this.compassMarks) {
      const deg = Number(mark.dataset.deg)
      let rel = ((deg - heading + 540) % 360) - 180
      if (Math.abs(rel) > 82) {
        mark.style.opacity = '0'
      } else {
        mark.style.opacity = String(1 - Math.abs(rel) / 95)
        mark.style.left = `calc(50% + ${rel * 2.15}px)`
      }
    }
    this.heading = heading
  }

  drawRadar(player, enemies) {
    const ctx = this.radarCtx
    if (!ctx) return
    const w = this.el.radar.width
    const h = this.el.radar.height
    const cx = w / 2
    const cy = h / 2
    const radius = w * 0.43
    const range = 95
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(5,12,15,0.6)'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(124,231,255,0.16)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.arc(cx, cy, (radius / 3) * i, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(cx - radius, cy)
    ctx.lineTo(cx + radius, cy)
    ctx.moveTo(cx, cy - radius)
    ctx.lineTo(cx, cy + radius)
    ctx.stroke()

    const angle = performance.now() * 0.0012
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    grad.addColorStop(0, 'rgba(124,231,255,0.0)')
    grad.addColorStop(1, 'rgba(124,231,255,0.32)')
    ctx.strokeStyle = grad
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    ctx.stroke()

    const fx = -Math.sin(player.yaw)
    const fz = -Math.cos(player.yaw)
    const rx = Math.cos(player.yaw)
    const rz = -Math.sin(player.yaw)
    for (const enemy of enemies) {
      if (!enemy.alive) continue
      const dx = enemy.root.position.x - player.position.x
      const dz = enemy.root.position.z - player.position.z
      const localX = dx * rx + dz * rz
      const localZ = dx * fx + dz * fz
      if (Math.abs(localX) > range || Math.abs(localZ) > range) continue
      const px = cx + (localX / range) * radius
      const py = cy - (localZ / range) * radius
      ctx.fillStyle = '#ff6a52'
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,106,82,0.2)'
      ctx.beginPath()
      ctx.arc(px, py, 6.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#7ce7ff'
    ctx.save()
    ctx.translate(cx, cy)
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(4.5, 4)
    ctx.lineTo(0, 2)
    ctx.lineTo(-4.5, 4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = 'rgba(200,225,235,0.5)'
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('N', cx, 11)
  }

  updateFlash(dt) {
    if (this.flashTime > 0) {
      this.flashTime = Math.max(0, this.flashTime - dt)
      this.el.blockFlash.style.opacity = String((this.flashTime / 0.35) * 0.8)
    } else {
      this.el.blockFlash.style.opacity = '0'
    }
  }
}
