const CHORDS = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [261.63, 329.63, 392.0],
  [196.0, 246.94, 293.66]
];

export class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noise = null;
    this.muted = false;
    this.musicPlaying = false;
    this.step = 0;
    this.nextNote = 0;
    this.timer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.2;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);
    const length = Math.floor(this.ctx.sampleRate * 0.6);
    this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.62, this.ctx.currentTime, 0.04);
    }
  }

  startMusic() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.nextNote = this.ctx.currentTime + 0.06;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 55);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    if (!this.ctx || !this.musicPlaying) return;
    while (this.nextNote < this.ctx.currentTime + 0.22) {
      this.playStep(this.step, this.nextNote);
      this.nextNote += 0.235;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(step, time) {
    const bar = Math.floor(step / 16);
    const chord = CHORDS[bar];
    const inBar = step % 16;
    if (inBar % 4 === 0) {
      this.tone(chord[0] / 2, 0.34, "sawtooth", 0.2, time, "lowpass", 220);
    }
    if (inBar % 2 === 0) {
      const note = chord[(inBar / 2) % chord.length] * 2;
      this.tone(note, 0.12, "square", 0.035, time, "lowpass", 2200);
    }
    if (inBar === 0 || inBar === 8) this.kick(time, inBar === 0 ? 0.28 : 0.16);
    if (inBar % 4 === 2) this.hat(time, 0.035);
    if (inBar === 14) this.tone(chord[2] * 2, 0.2, "triangle", 0.03, time, "lowpass", 3400);
  }

  tone(freq, duration, type, volume, time, filter, cutoff) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    let node = osc;
    if (filter === "lowpass") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = cutoff;
      node.connect(lp);
      node = lp;
    }
    node.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  kick(time, volume) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.17);
  }

  hat(time, volume) {
    if (!this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noise;
    hp.type = "highpass";
    hp.frequency.value = 7200;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.musicBus);
    src.start(time);
    src.stop(time + 0.06);
  }

  fx(type) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (type === "shoot") {
      this.blip(480, 210, 0.075, "triangle", 0.06, now);
    } else if (type === "ice") {
      this.blip(760, 420, 0.09, "sine", 0.05, now);
    } else if (type === "holy") {
      this.blip(900, 1320, 0.07, "sine", 0.045, now);
    } else if (type === "hit") {
      this.noiseHit(0.045, 0.05, 900, now);
    } else if (type === "death") {
      this.blip(190, 62, 0.12, "square", 0.045, now);
    } else if (type === "pickup") {
      this.blip(820, 1180, 0.06, "sine", 0.035, now);
    } else if (type === "level") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.blip(f, f, 0.13, "triangle", 0.055, now + i * 0.075));
    } else if (type === "evolve") {
      this.sweep(140, 980, 0.75, "sawtooth", 0.09, now);
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.blip(f, f, 0.2, "triangle", 0.05, now + 0.4 + i * 0.08));
    } else if (type === "dash") {
      this.noiseHit(0.16, 0.06, 2200, now);
      this.blip(300, 700, 0.16, "sine", 0.04, now);
    } else if (type === "hurt") {
      this.blip(150, 90, 0.2, "square", 0.08, now);
      this.noiseHit(0.12, 0.06, 400, now);
    } else if (type === "boss") {
      this.sweep(90, 38, 1.1, "sawtooth", 0.16, now);
    } else if (type === "victory") {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.blip(f, f, 0.4, "triangle", 0.07, now + i * 0.13));
    } else if (type === "gameover") {
      [440, 349.23, 261.63, 174.61].forEach((f, i) => this.blip(f, f * 0.98, 0.35, "sawtooth", 0.055, now + i * 0.18));
    } else if (type === "ui") {
      this.blip(660, 880, 0.05, "square", 0.03, now);
    } else if (type === "heal") {
      [660, 880, 1100].forEach((f, i) => this.blip(f, f, 0.1, "sine", 0.045, now + i * 0.06));
    } else if (type === "bomb") {
      this.noiseHit(0.5, 0.16, 220, now);
      this.sweep(120, 30, 0.5, "sawtooth", 0.14, now);
    }
  }

  blip(from, to, duration, type, volume, time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  sweep(from, to, duration, type, volume, time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(to, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  noiseHit(duration, volume, cutoff, time) {
    if (!this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noise;
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(time);
    src.stop(time + duration + 0.02);
  }
}
