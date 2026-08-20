/* ============================================================
   TYPEBOUND — particles.js
   Lightweight capped particle system + floating damage numbers.
   Draws to the game canvas each frame.
   ============================================================ */

class Particle {
  constructor() { this.dead = true; }
  spawn(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx; this.vy = o.vy;
    this.life = o.life; this.maxLife = o.life;
    this.size = o.size;
    this.color = o.color;
    this.gravity = o.gravity || 0;
    this.drag = o.drag ?? 0.98;
    this.shape = o.shape || "spark";  // spark | dust | shard | glow
    this.rot = o.rot || 0;
    this.vrot = o.vrot || 0;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.gravity * dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.vrot * dt;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(t, 0, 1);
    ctx.translate(this.x, this.y);
    if (this.shape === "glow") {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      g.addColorStop(0, this.color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill();
    } else if (this.shape === "shard") {
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8; ctx.shadowColor = this.color;
      const s = this.size;
      ctx.fillRect(-s * 0.5, -s * 0.5, s, s * (0.4 + t));
    } else if (this.shape === "dust") {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, 0, this.size * t, 0, Math.PI * 2); ctx.fill();
    } else { // spark
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size * t;
      ctx.shadowBlur = 6; ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-this.vx * 0.02, -this.vy * 0.02);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color, size, crit) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.size = size; this.life = crit ? 1.1 : 0.85; this.maxLife = this.life;
    this.vy = crit ? -70 : -55; this.crit = crit;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    this.vy *= 0.94;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(t * 1.3, 0, 1);
    ctx.font = `900 ${this.size * (this.crit ? 1 + (1 - t) * 0.3 : 1)}px "Cinzel", serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12; ctx.shadowColor = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.pool = Array.from({ length: CONFIG.MAX_PARTICLES }, () => new Particle());
    this.texts = [];
  }

  _get() {
    for (const p of this.pool) if (p.dead) return p;
    return null; // pool exhausted -> skip (cap respected)
  }

  emit(count, opts) {
    for (let i = 0; i < count; i++) {
      const p = this._get();
      if (!p) break;
      const ang = opts.angle != null ? opts.angle + rand(-opts.spread, opts.spread) : rand(0, Math.PI * 2);
      const spd = rand(opts.speedMin, opts.speedMax);
      p.spawn({
        x: opts.x + rand(-4, 4),
        y: opts.y + rand(-4, 4),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: rand(opts.lifeMin, opts.lifeMax),
        size: rand(opts.sizeMin, opts.sizeMax),
        color: pick(opts.colors),
        gravity: opts.gravity || 0,
        drag: opts.drag,
        shape: opts.shape,
        rot: rand(0, Math.PI * 2),
        vrot: rand(-8, 8),
      });
    }
  }

  /* presets */
  hitSpark(x, y, dir = -1) {
    this.emit(14, { x, y, angle: dir > 0 ? 0 : Math.PI, spread: 0.9,
      speedMin: 120, speedMax: 340, lifeMin: 0.18, lifeMax: 0.4,
      sizeMin: 6, sizeMax: 14, colors: ["#ff2fb9","#ff74d4","#ffffff"], shape: "spark", drag: 0.9 });
  }
  heavySpark(x, y, dir = -1) {
    this.emit(26, { x, y, angle: dir > 0 ? 0 : Math.PI, spread: 1.1,
      speedMin: 150, speedMax: 460, lifeMin: 0.25, lifeMax: 0.6,
      sizeMin: 8, sizeMax: 20, colors: ["#ff2fb9","#a44dff","#ffffff"], shape: "shard", drag: 0.9, gravity: 300 });
  }
  parryBurst(x, y) {
    this.emit(34, { x, y, spread: Math.PI, speedMin: 200, speedMax: 560,
      lifeMin: 0.2, lifeMax: 0.55, sizeMin: 5, sizeMax: 14,
      colors: ["#35e8ff","#b6f7ff","#ffffff"], shape: "spark", drag: 0.88 });
    this.emit(1, { x, y, spread: 0, speedMin: 0, speedMax: 0, lifeMin: 0.35, lifeMax: 0.35,
      sizeMin: 120, sizeMax: 120, colors: ["rgba(53,232,255,0.8)"], shape: "glow" });
  }
  dust(x, y, dir) {
    this.emit(12, { x, y, angle: dir > 0 ? 0.3 : Math.PI - 0.3, spread: 0.5,
      speedMin: 40, speedMax: 160, lifeMin: 0.3, lifeMax: 0.7,
      sizeMin: 6, sizeMax: 16, colors: ["rgba(150,120,200,0.5)","rgba(120,90,170,0.4)"], shape: "dust", drag: 0.9 });
  }
  glitch(x, y) {
    this.emit(18, { x, y, spread: Math.PI, speedMin: 40, speedMax: 300,
      lifeMin: 0.2, lifeMax: 0.6, sizeMin: 4, sizeMax: 14,
      colors: ["#a44dff","#35e8ff","#ff2fb9"], shape: "shard", drag: 0.92 });
  }
  death(x, y, colors) {
    this.emit(60, { x, y, spread: Math.PI, speedMin: 60, speedMax: 460,
      lifeMin: 0.5, lifeMax: 1.3, sizeMin: 6, sizeMax: 22,
      colors: colors || ["#a44dff","#ff2fb9","#35e8ff","#ffffff"], shape: "shard", drag: 0.94, gravity: 200 });
  }
  ember(x, y) {
    this.emit(1, { x, y, spread: 0.4, angle: -Math.PI / 2, speedMin: 10, speedMax: 40,
      lifeMin: 1.4, lifeMax: 2.6, sizeMin: 2, sizeMax: 5,
      colors: ["#a44dff","#ff2fb9","#35e8ff"], shape: "glow", drag: 0.99 });
  }

  damageNumber(x, y, amount, color, crit) {
    this.texts.push(new FloatingText(x, y, crit ? amount + "!" : "" + amount, color, crit ? 40 : 26, crit));
  }
  banner(x, y, text, color) {
    this.texts.push(new FloatingText(x, y, text, color, 30, true));
  }

  update(dt) {
    for (const p of this.pool) if (!p.dead) p.update(dt);
    for (const t of this.texts) t.update(dt);
    this.texts = this.texts.filter(t => !t.dead);
  }
  draw(ctx) {
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.pool) if (!p.dead) p.draw(ctx);
    ctx.globalCompositeOperation = "source-over";
    for (const t of this.texts) t.draw(ctx);
  }
  clear() {
    for (const p of this.pool) p.dead = true;
    this.texts.length = 0;
  }
}
