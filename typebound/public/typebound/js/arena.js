// arena.js — renders the battle backdrop for the current boss.
// Uses the provided arena artwork when available, with an animated
// procedural fallback (parallax pillars + glowing floor runes).

class Arena {
  constructor(bossDef) {
    this.def = bossDef;
    this.img = null;
    this.imgReady = false;
    this.t = 0;

    // Floating code keywords that drift in the background.
    this.keywords = (bossDef.words || ['if', 'else', 'loop', 'return']).slice();
    this.drifters = [];
    for (let i = 0; i < 10; i++) {
      this.drifters.push({
        word: this.keywords[i % this.keywords.length],
        x: Math.random(),
        y: Math.random() * 0.55,
        speed: 0.004 + Math.random() * 0.01,
        alpha: 0.08 + Math.random() * 0.14,
        size: 14 + Math.random() * 22,
      });
    }

    if (bossDef.arenaImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { this.imgReady = true; };
      img.onerror = () => { this.imgReady = false; };
      img.src = bossDef.arenaImage;
      this.img = img;
    }
  }

  update(dt) {
    this.t += dt;
    for (const d of this.drifters) {
      d.y += d.speed * dt * 0.06;
      if (d.y > 0.62) {
        d.y = -0.05;
        d.x = Math.random();
        d.word = this.keywords[(Math.random() * this.keywords.length) | 0];
      }
    }
  }

  draw(ctx, w, h) {
    const accent = this.def.accent || '#a855f7';

    // Base vignette gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, this.def.skyTop || '#120821');
    bg.addColorStop(1, this.def.skyBottom || '#05030a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (this.imgReady && this.img) {
      // Cover-fit the artwork, darkened so the fighters read on top.
      const ir = this.img.width / this.img.height;
      const cr = w / h;
      let dw, dh, dx, dy;
      if (cr > ir) { dw = w; dh = w / ir; dx = 0; dy = (h - dh) * 0.35; }
      else { dh = h; dw = h * ir; dy = 0; dx = (w - dw) / 2; }
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.img, dx, dy, dw, dh);
      ctx.globalAlpha = 1;

      // Darkening overlay for contrast
      const ov = ctx.createLinearGradient(0, 0, 0, h);
      ov.addColorStop(0, 'rgba(5,3,10,0.35)');
      ov.addColorStop(0.6, 'rgba(5,3,10,0.15)');
      ov.addColorStop(1, 'rgba(5,3,10,0.75)');
      ctx.fillStyle = ov;
      ctx.fillRect(0, 0, w, h);
    } else {
      this._drawProceduralBackdrop(ctx, w, h, accent);
    }

    // Drifting code keywords (subtle, behind fighters)
    ctx.save();
    ctx.font = '600 1px monospace';
    for (const d of this.drifters) {
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = accent;
      ctx.font = `600 ${d.size}px "JetBrains Mono", monospace`;
      ctx.fillText(d.word, d.x * w, d.y * h);
    }
    ctx.restore();

    // Ground plane
    this._drawGround(ctx, w, h, accent);

    // Edge vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  _drawProceduralBackdrop(ctx, w, h, accent) {
    // Distant pillars
    const cols = 7;
    for (let i = 0; i < cols; i++) {
      const px = (i / (cols - 1)) * w;
      const pw = w * 0.06;
      const ph = h * (0.35 + 0.1 * Math.sin(i * 1.3));
      const flick = 0.06 + 0.05 * Math.abs(Math.sin(this.t * 0.002 + i));
      ctx.fillStyle = 'rgba(15,10,28,0.85)';
      ctx.fillRect(px - pw / 2, h * 0.15, pw, ph);
      ctx.fillStyle = this._rgba(accent, flick);
      ctx.fillRect(px - pw / 2, h * 0.15, 3, ph);
      ctx.fillRect(px + pw / 2 - 3, h * 0.15, 3, ph);
    }
    // Central arch glow
    const glow = ctx.createRadialGradient(w / 2, h * 0.3, 10, w / 2, h * 0.3, h * 0.5);
    glow.addColorStop(0, this._rgba(accent, 0.28));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h * 0.7);
  }

  _drawGround(ctx, w, h, accent) {
    const gy = h * 0.72;
    const g = ctx.createLinearGradient(0, gy, 0, h);
    g.addColorStop(0, 'rgba(20,12,34,0.9)');
    g.addColorStop(1, 'rgba(4,2,8,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, w, h - gy);

    // Glowing rune circle on the floor
    ctx.save();
    ctx.translate(w / 2, gy + (h - gy) * 0.45);
    ctx.scale(1, 0.32);
    const pulse = 0.35 + 0.25 * Math.sin(this.t * 0.003);
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.arc(0, 0, w * (0.14 + r * 0.07), 0, Math.PI * 2);
      ctx.strokeStyle = this._rgba(accent, pulse * (1 - r * 0.25));
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  _rgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
}

window.Arena = Arena;
