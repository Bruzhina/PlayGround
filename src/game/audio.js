export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.ambientGain = null;
    this.ambientFilter = null;
    this.nightGain = null;
    this.enabled = true;
    this.started = false;
  }

  init() {
    if (this.context) {
      this.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.enabled ? 0.62 : 0;
    this.master.connect(this.context.destination);
    this.noiseBuffer = this.makeNoiseBuffer(2.5);
    this.startAmbience();
    this.started = true;
  }

  makeNoiseBuffer(seconds) {
    const rate = this.context.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.context.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[i] = last;
    }
    return buffer;
  }

  startAmbience() {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    this.ambientFilter = ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.value = 460;
    this.ambientFilter.Q.value = 0.4;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.045;
    source.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.master);
    source.start();

    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    const droneFilter = ctx.createBiquadFilter();
    drone.type = 'sawtooth';
    drone.frequency.value = 41;
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 105;
    droneGain.gain.value = 0;
    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.master);
    drone.start();
    this.nightGain = droneGain;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.62 : 0, this.context.currentTime, 0.08);
    }
  }

  resume() {
    if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
  }

  update(nightFactor) {
    if (!this.context || !this.ambientGain || !this.nightGain) return;
    const now = this.context.currentTime;
    this.ambientGain.gain.setTargetAtTime(0.032 + nightFactor * 0.035, now, 1.4);
    this.ambientFilter.frequency.setTargetAtTime(360 + nightFactor * 180, now, 1.2);
    this.nightGain.gain.setTargetAtTime(nightFactor * 0.022, now, 1.8);
  }

  tone({ frequency = 220, endFrequency = frequency, duration = 0.2, gain = 0.1, type = 'sine', filter = 0, delay = 0 }) {
    if (!this.context || !this.enabled) return;
    const ctx = this.context;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.value = filter;
      osc.connect(biquad);
      biquad.connect(envelope);
    } else {
      osc.connect(envelope);
    }
    envelope.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  noise({ duration = 0.18, gain = 0.1, frequency = 900, q = 0.8, type = 'bandpass', delay = 0, rate = 1 }) {
    if (!this.context || !this.enabled) return;
    const ctx = this.context;
    const now = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = rate;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.35), now + duration);
    filter.Q.value = q;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(now, Math.random() * 0.8);
    source.stop(now + duration + 0.03);
  }

  shot() {
    this.noise({ duration: 0.2, gain: 0.22, frequency: 1300, q: 0.6 });
    this.tone({ frequency: 92, endFrequency: 34, duration: 0.18, gain: 0.22, type: 'triangle' });
    this.noise({ duration: 0.05, gain: 0.1, frequency: 3200, type: 'highpass' });
  }

  chop() {
    this.tone({ frequency: 150, endFrequency: 52, duration: 0.12, gain: 0.12, type: 'triangle' });
    this.noise({ duration: 0.06, gain: 0.06, frequency: 500, q: 1.4 });
  }

  hit() {
    this.noise({ duration: 0.08, gain: 0.09, frequency: 2200, type: 'highpass' });
    this.tone({ frequency: 210, endFrequency: 70, duration: 0.1, gain: 0.08, type: 'square' });
  }

  hurt() {
    this.tone({ frequency: 70, endFrequency: 38, duration: 0.28, gain: 0.16, type: 'sawtooth', filter: 220 });
    this.noise({ duration: 0.16, gain: 0.07, frequency: 260, type: 'lowpass' });
  }

  zombie() {
    const base = 58 + Math.random() * 34;
    this.tone({ frequency: base, endFrequency: base * 0.62, duration: 0.55, gain: 0.07, type: 'sawtooth', filter: 240, delay: 0.02 });
    this.tone({ frequency: base * 1.47, endFrequency: base * 0.9, duration: 0.42, gain: 0.035, type: 'square', filter: 310 });
  }

  pickup() {
    this.tone({ frequency: 540, endFrequency: 790, duration: 0.1, gain: 0.055, type: 'sine' });
    this.tone({ frequency: 790, endFrequency: 1040, duration: 0.12, gain: 0.04, type: 'sine', delay: 0.08 });
  }

  build() {
    this.tone({ frequency: 180, endFrequency: 76, duration: 0.18, gain: 0.11, type: 'triangle' });
    this.noise({ duration: 0.12, gain: 0.06, frequency: 720, q: 1.2 });
  }

  reload() {
    this.noise({ duration: 0.04, gain: 0.045, frequency: 1800, q: 1.4 });
    this.noise({ duration: 0.06, gain: 0.05, frequency: 1100, q: 1.2, delay: 0.16 });
  }

  step() {
    this.noise({ duration: 0.045, gain: 0.018, frequency: 320, q: 0.9, type: 'lowpass' });
  }

  nightfall() {
    this.tone({ frequency: 55, endFrequency: 36, duration: 1.8, gain: 0.08, type: 'sawtooth', filter: 180 });
    this.tone({ frequency: 110, endFrequency: 58, duration: 1.4, gain: 0.03, type: 'triangle', filter: 260, delay: 0.2 });
  }

  dawn() {
    this.tone({ frequency: 220, endFrequency: 330, duration: 1.2, gain: 0.035, type: 'sine' });
    this.tone({ frequency: 330, endFrequency: 440, duration: 1.1, gain: 0.025, type: 'sine', delay: 0.25 });
  }
}
