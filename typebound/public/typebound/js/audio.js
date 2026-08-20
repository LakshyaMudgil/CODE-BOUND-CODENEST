/* ============================================================
   TYPEBOUND — audio.js
   AudioManager: synthesizes placeholder SFX with the Web Audio API
   so the game has satisfying sound with zero asset files.
   Swap synth() calls for buffer playback later to use real assets.
   ============================================================ */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.45;
    this.musicNodes = null;
    this.ready = false;
  }

  /* Must be resumed after a user gesture (browser autoplay policy). */
  init() {
    if (this.ctx) { this._resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.ready = true;
    } catch (e) {
      console.log("[v0] audio unavailable", e);
    }
  }

  _resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  setSfx(v) { this.sfxVolume = clamp(v, 0, 1); }
  setMusic(v) {
    this.musicVolume = clamp(v, 0, 1);
    if (this.musicNodes) this.musicNodes.gain.gain.value = this.musicVolume * 0.18;
  }

  /* core tone generator */
  _tone({ freq = 300, type = "sine", dur = 0.15, vol = 0.4, glideTo = null, attack = 0.005, delay = 0 }) {
    if (!this.ready) return;
    this._resume();
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    const peak = vol * this.sfxVolume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.4, hp = 400, delay = 0 }) {
    if (!this.ready) return;
    this._resume();
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * this.sfxVolume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  /* ---- named SFX (placeholders) ---- */
  play(name) {
    if (!this.ready) return;
    switch (name) {
      case "type":       this._tone({ freq: rand(520, 680), type: "square", dur: 0.03, vol: 0.06 }); break;
      case "swing":      this._noise({ dur: 0.12, vol: 0.18, hp: 800 }); break;
      case "hit":        this._tone({ freq: 220, glideTo: 90, type: "sawtooth", dur: 0.16, vol: 0.28 });
                         this._noise({ dur: 0.08, vol: 0.14, hp: 300 }); break;
      case "heavy":      this._tone({ freq: 140, glideTo: 55, type: "sawtooth", dur: 0.3, vol: 0.36 });
                         this._noise({ dur: 0.16, vol: 0.2, hp: 200 }); break;
      case "crit":       this._tone({ freq: 900, glideTo: 300, type: "square", dur: 0.22, vol: 0.3 });
                         this._tone({ freq: 1400, glideTo: 500, type: "sine", dur: 0.18, vol: 0.2, delay: 0.02 }); break;
      case "parry":      this._tone({ freq: 1800, glideTo: 700, type: "triangle", dur: 0.18, vol: 0.34 });
                         this._noise({ dur: 0.14, vol: 0.24, hp: 2000 }); break;
      case "dodge":      this._noise({ dur: 0.18, vol: 0.14, hp: 500 }); break;
      case "hurt":       this._tone({ freq: 300, glideTo: 120, type: "sawtooth", dur: 0.22, vol: 0.3 }); break;
      case "stagger":    this._tone({ freq: 600, glideTo: 1200, type: "triangle", dur: 0.4, vol: 0.3 }); break;
      case "riposte":    this._tone({ freq: 200, glideTo: 900, type: "square", dur: 0.5, vol: 0.34 });
                         this._noise({ dur: 0.3, vol: 0.2, hp: 600 }); break;
      case "telegraph":  this._tone({ freq: 120, type: "sine", dur: 0.5, vol: 0.16, glideTo: 260 }); break;
      case "roar":       this._tone({ freq: 90, glideTo: 40, type: "sawtooth", dur: 0.9, vol: 0.36 });
                         this._noise({ dur: 0.7, vol: 0.2, hp: 120 }); break;
      case "phase":      this._tone({ freq: 300, glideTo: 900, type: "sawtooth", dur: 0.7, vol: 0.3 }); break;
      case "victory":    [523,659,784,1046].forEach((f,i)=>this._tone({ freq:f, type:"triangle", dur:0.4, vol:0.28, delay:i*0.13 })); break;
      case "death":      this._tone({ freq: 400, glideTo: 40, type: "sawtooth", dur: 1.2, vol: 0.34 }); break;
      case "overdrive":  this._tone({ freq: 200, glideTo: 800, type: "square", dur: 0.6, vol: 0.3 });
                         this._tone({ freq: 400, glideTo: 1200, type: "sine", dur: 0.6, vol: 0.2, delay: 0.05 }); break;
      case "ui":         this._tone({ freq: 440, type: "triangle", dur: 0.06, vol: 0.12 }); break;
      default: break;
    }
  }

  /* Ambient drone "music" — layered detuned oscillators. */
  startMusic() {
    if (!this.ready || this.musicNodes) return;
    this._resume();
    const gain = this.ctx.createGain();
    gain.gain.value = this.musicVolume * 0.18;
    gain.connect(this.master);
    const oscs = [];
    [55, 82.4, 110, 164.8].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? "sine" : "triangle";
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01);
      const g = this.ctx.createGain();
      g.gain.value = 0.5 / (i + 1);
      o.connect(g).connect(gain);
      o.start();
      oscs.push(o);
    });
    this.musicNodes = { gain, oscs };
  }

  setMusicIntensity(level) {
    // level 1..3 -> subtle brightness increase
    if (!this.musicNodes) return;
    this.musicNodes.gain.gain.setTargetAtTime(this.musicVolume * (0.14 + level * 0.04), this.ctx.currentTime, 0.5);
  }

  stopMusic() {
    if (!this.musicNodes) return;
    try { this.musicNodes.oscs.forEach(o => o.stop()); } catch (e) {}
    this.musicNodes = null;
  }
}

// NOTE: `Audio` is a built-in browser global (the HTMLAudioElement constructor),
// so we expose our manager as `SFX` to avoid a redeclaration collision.
const SFX = new AudioManager();
