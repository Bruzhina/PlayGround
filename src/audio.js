export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.enabled = true
    this.noiseBuffer = null
    this.ambientStarted = false
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.55
    this.master.connect(this.ctx.destination)

    const length = Math.floor(this.ctx.sampleRate * 2)
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

    this.startAmbient()
  }

  startAmbient() {
    if (!this.ctx || this.ambientStarted) return
    this.ambientStarted = true
    const ctx = this.ctx

    const wind = ctx.createBufferSource()
    wind.buffer = this.noiseBuffer
    wind.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 420
    windFilter.Q.value = 0.35
    const windGain = ctx.createGain()
    windGain.gain.value = 0.035
    wind.connect(windFilter).connect(windGain).connect(this.master)
    wind.start()

    const drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 48
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.032
    drone.connect(droneGain).connect(this.master)
    drone.start()

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 14
    lfo.connect(lfoGain).connect(windFilter.frequency)
    lfo.start()
  }

  noise(duration = 0.12, volume = 0.4, freq = 1200, type = 'lowpass', rate = 1) {
    if (!this.ctx || !this.enabled) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.playbackRate.value = rate
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, now)
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.25), now + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(now)
    src.stop(now + duration + 0.02)
  }

  tone(freq, endFreq, duration, volume, type = 'sine', delay = 0) {
    if (!this.ctx || !this.enabled) return
    const ctx = this.ctx
    const now = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0006, now + duration)
    osc.connect(gain).connect(this.master)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  shot() {
    this.noise(0.11, 0.34, 5200, 'lowpass', 1.1)
    this.tone(150, 42, 0.13, 0.32, 'square')
    this.tone(920, 130, 0.06, 0.08, 'sawtooth')
    setTimeout(() => this.noise(0.05, 0.08, 2600, 'bandpass', 1.4), 55)
  }

  enemyShot() {
    this.tone(680, 140, 0.24, 0.12, 'sawtooth')
    this.noise(0.12, 0.08, 2400, 'bandpass', 0.8)
  }

  hit() {
    this.tone(1450, 900, 0.05, 0.12, 'triangle')
    this.noise(0.035, 0.07, 4200, 'highpass', 1.8)
  }

  headshot() {
    this.tone(2100, 1500, 0.07, 0.15, 'square')
    this.tone(3000, 2200, 0.05, 0.08, 'sine', 0.03)
  }

  explosion() {
    this.noise(0.55, 0.45, 900, 'lowpass', 0.55)
    this.tone(90, 24, 0.5, 0.4, 'sine')
  }

  reload() {
    this.noise(0.045, 0.15, 1800, 'bandpass', 1.2)
    setTimeout(() => this.noise(0.05, 0.13, 1200, 'bandpass', 0.9), 190)
    setTimeout(() => this.tone(520, 300, 0.06, 0.09, 'square'), 360)
  }

  shield() {
    this.tone(280, 760, 0.3, 0.12, 'sine')
    this.tone(540, 1280, 0.26, 0.06, 'triangle', 0.03)
    this.noise(0.18, 0.1, 3000, 'highpass', 1.3)
  }

  flight(on) {
    if (on) {
      this.tone(220, 660, 0.45, 0.16, 'sawtooth')
      this.noise(0.4, 0.12, 900, 'bandpass', 0.7)
    } else {
      this.tone(660, 180, 0.35, 0.12, 'sawtooth')
    }
  }

  click() {
    this.tone(900, 540, 0.05, 0.07, 'square')
  }

  deny() {
    this.tone(180, 120, 0.16, 0.12, 'square')
  }

  wave() {
    this.tone(320, 640, 0.5, 0.1, 'triangle')
    this.tone(480, 960, 0.6, 0.07, 'sine', 0.12)
  }
}
