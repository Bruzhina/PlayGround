export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.enabled = true;
    this.ambientStarted = false;
    this.boomTimer = 4 + Math.random() * 4;
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;
    this.master = ctx.createGain();
    this.master.gain.value = 0.68;
    this.master.connect(compressor);
    compressor.connect(ctx.destination);
    this.noise = this.createNoise(3);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.68 : 0;
  }

  createNoise(seconds) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = white * 0.6 + last * 2.4;
    }
    return buffer;
  }

  envGain(peak, attack, decay, start) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    return gain;
  }

  noiseBurst({ peak = 0.5, attack = 0.002, decay = 0.2, filter = 'lowpass', freq = 1200, q = 0.7, rate = 1, when = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    const gain = this.envGain(peak, attack, decay, t);
    src.connect(f);
    f.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + attack + decay + 0.05);
    return { filter: f, gain };
  }

  tone({ freq = 200, endFreq = 60, type = 'sine', peak = 0.4, attack = 0.002, decay = 0.2, when = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + attack + decay);
    const gain = this.envGain(peak, attack, decay, t);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  shot() {
    this.noiseBurst({ peak: 0.75, decay: 0.16, freq: 2600, filter: 'bandpass', q: 0.6, rate: 1.7 });
    this.noiseBurst({ peak: 0.5, decay: 0.28, freq: 700, filter: 'lowpass' });
    this.tone({ freq: 150, endFreq: 42, type: 'triangle', peak: 0.55, decay: 0.17 });
    this.noiseBurst({ peak: 0.2, decay: 0.03, freq: 5200, filter: 'highpass', when: 0.015 });
  }

  enemyShot(volume = 0.3) {
    this.noiseBurst({ peak: 0.26 * volume, decay: 0.13, freq: 1500, filter: 'bandpass', q: 0.8, rate: 1.4 });
    this.tone({ freq: 120, endFreq: 48, type: 'triangle', peak: 0.18 * volume, decay: 0.13 });
  }

  reload() {
    this.noiseBurst({ peak: 0.18, decay: 0.05, freq: 2400, filter: 'bandpass', q: 2.5, rate: 1.2 });
    this.tone({ freq: 420, endFreq: 260, type: 'square', peak: 0.06, decay: 0.05, when: 0.16 });
    this.noiseBurst({ peak: 0.22, decay: 0.06, freq: 1700, filter: 'bandpass', q: 2, rate: 0.9, when: 0.95 });
    this.tone({ freq: 300, endFreq: 190, type: 'square', peak: 0.05, decay: 0.05, when: 1.15 });
    this.noiseBurst({ peak: 0.14, decay: 0.04, freq: 3000, filter: 'highpass', when: 1.42 });
  }

  dryFire() {
    this.noiseBurst({ peak: 0.12, decay: 0.03, freq: 3200, filter: 'bandpass', q: 3, rate: 1.6 });
  }

  hit(head = false) {
    this.tone({ freq: head ? 1500 : 1050, endFreq: head ? 1900 : 1200, type: 'square', peak: 0.09, decay: 0.05 });
    if (head) this.tone({ freq: 2100, endFreq: 2500, type: 'sine', peak: 0.05, decay: 0.07, when: 0.03 });
  }

  impact() {
    this.noiseBurst({ peak: 0.1, decay: 0.06, freq: 900, filter: 'bandpass', q: 1.2, rate: 1.3 });
  }

  playerHurt() {
    this.noiseBurst({ peak: 0.32, decay: 0.22, freq: 320, filter: 'lowpass' });
    this.tone({ freq: 90, endFreq: 40, type: 'sine', peak: 0.28, decay: 0.25 });
  }

  explosion(distance = 1) {
    const v = Math.max(0.08, Math.min(1, 1 / (1 + distance * 0.03)));
    this.noiseBurst({ peak: 0.5 * v, decay: 0.9, freq: 220, filter: 'lowpass', rate: 0.6 });
    this.tone({ freq: 70, endFreq: 28, type: 'sine', peak: 0.45 * v, decay: 0.8 });
    this.noiseBurst({ peak: 0.2 * v, decay: 0.18, freq: 1800, filter: 'bandpass', q: 0.6, when: 0.02 });
  }

  waveHorn() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [110, 164.81, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'sine' : 'sawtooth';
      osc.frequency.value = freq;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.35);
      gain.gain.setValueAtTime(0.07, t + 1.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 2);
    });
  }

  click() {
    this.noiseBurst({ peak: 0.1, decay: 0.035, freq: 2600, filter: 'bandpass', q: 2.4, rate: 1.5 });
  }

  startAmbient() {
    if (!this.ctx || this.ambientStarted) return;
    this.ambientStarted = true;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.5;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const gain = ctx.createGain();
    gain.gain.value = 0.075;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();
    this.ambientGain = gain;
  }

  update(dt) {
    if (!this.ctx || !this.enabled) return;
    this.boomTimer -= dt;
    if (this.boomTimer <= 0) {
      this.boomTimer = 5 + Math.random() * 9;
      this.explosion(70 + Math.random() * 90);
    }
  }
}
