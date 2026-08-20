/* ============================================================
   TYPEBOUND — player.js
   The player avatar: state machine + canvas rendering of a
   stylized cyan-runed knight (silhouette, no emoji/art needed).
   ============================================================ */

const PLAYER_STATE = Object.freeze({
  IDLE: "IDLE", ATTACK: "ATTACK", HEAVY: "HEAVY",
  DODGE: "DODGE", PARRY: "PARRY", HURT: "HURT", DEAD: "DEAD",
});

class Player {
  constructor() {
    this.maxHp = CONFIG.PLAYER_MAX_HP;
    this.hp = this.maxHp;
    this.stamina = new StaminaSystem(CONFIG.PLAYER_MAX_STAMINA);
    this.focus = 0;
    this.weapon = WEAPONS.rapid_blade;

    this.combo = 0;
    this.longestCombo = 0;

    /* world */
    this.homeX = 0; this.homeY = 0;   // set on arena resize
    this.x = 0; this.y = 0;
    this.facing = 1;                  // 1 = facing right (toward boss)
    this.scale = 1;

    /* state */
    this.state = PLAYER_STATE.IDLE;
    this.stateTime = 0;
    this.animTime = 0;

    /* dodge */
    this.dodgeDir = 0;
    this.dodgeCooldownUntil = 0;
    this.iFrames = false;

    /* parry */
    this.parryCooldownUntil = 0;
    this.parryActiveUntil = 0;

    /* overdrive */
    this.overdrive = false;
    this.overdriveUntil = 0;

    /* fx */
    this.attackSwing = 0; // 0..1 animation of the swing arc
    this.hurtFlash = 0;
  }

  reset() {
    this.hp = this.maxHp;
    this.stamina.reset();
    this.focus = 0;
    this.combo = 0;
    this.longestCombo = 0;
    this.x = this.homeX; this.y = this.homeY;
    this.setState(PLAYER_STATE.IDLE);
    this.overdrive = false;
    this.dodgeDir = 0;
    this.iFrames = false;
    this.hurtFlash = 0;
  }

  setHome(x, y, scale) { this.homeX = x; this.homeY = y; this.x = x; this.y = y; this.scale = scale; }

  setState(s) {
    this.state = s;
    this.stateTime = 0;
    this.animTime = 0;
  }

  addCombo() {
    this.combo++;
    if (this.combo > this.longestCombo) this.longestCombo = this.combo;
  }
  breakCombo() { this.combo = 0; }

  addFocus(v) {
    if (this.overdrive) return;
    this.focus = clamp(this.focus + v, 0, CONFIG.FOCUS_MAX);
  }
  focusReady() { return this.focus >= CONFIG.FOCUS_MAX && !this.overdrive; }

  startOverdrive() {
    this.overdrive = true;
    this.overdriveUntil = now() + CONFIG.OVERDRIVE_DURATION;
    this.focus = 0;
  }

  canDodge() {
    return now() >= this.dodgeCooldownUntil &&
      this.stamina.has(CONFIG.COST_DODGE) &&
      this.state !== PLAYER_STATE.DODGE &&
      this.state !== PLAYER_STATE.DEAD;
  }
  canParry() {
    return now() >= this.parryCooldownUntil &&
      this.stamina.has(CONFIG.COST_PARRY) &&
      this.state !== PLAYER_STATE.DEAD;
  }

  startDodge(dir) {
    this.stamina.spend(CONFIG.COST_DODGE);
    this.dodgeDir = dir;
    this.dodgeCooldownUntil = now() + CONFIG.DODGE_DURATION + CONFIG.DODGE_COOLDOWN;
    this.setState(PLAYER_STATE.DODGE);
  }

  startParry() {
    this.stamina.spend(CONFIG.COST_PARRY);
    this.parryCooldownUntil = now() + CONFIG.PARRY_COOLDOWN;
    this.parryActiveUntil = now() + CONFIG.PARRY_WINDOW;
    this.setState(PLAYER_STATE.PARRY);
  }
  parryActive() { return now() <= this.parryActiveUntil; }

  swing(heavy) {
    this.setState(heavy ? PLAYER_STATE.HEAVY : PLAYER_STATE.ATTACK);
    this.attackSwing = 0;
  }

  takeHit(dmg) {
    this.hp = clamp(this.hp - dmg, 0, this.maxHp);
    this.hurtFlash = 1;
    this.breakCombo();
    if (this.hp <= 0) { this.setState(PLAYER_STATE.DEAD); return true; }
    this.setState(PLAYER_STATE.HURT);
    return false;
  }

  update(dt) {
    this.stateTime += dt;
    this.animTime += dt;
    this.stamina.update(dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);

    if (this.overdrive && now() >= this.overdriveUntil) this.overdrive = false;

    switch (this.state) {
      case PLAYER_STATE.DODGE: {
        const t = this.stateTime / CONFIG.DODGE_DURATION;
        this.iFrames = t >= CONFIG.DODGE_IFRAME_START / CONFIG.DODGE_DURATION &&
                       t <= CONFIG.DODGE_IFRAME_END / CONFIG.DODGE_DURATION;
        // ease out and back to home
        const off = Math.sin(clamp(t, 0, 1) * Math.PI) * CONFIG.DODGE_DISTANCE;
        this.x = this.homeX + this.dodgeDir * off;
        this.y = this.homeY + (this.dodgeDir === 0 ? off * 0.5 : 0); // S = back = slight down/back
        if (t >= 1) { this.iFrames = false; this.x = this.homeX; this.y = this.homeY; this.setState(PLAYER_STATE.IDLE); }
        break;
      }
      case PLAYER_STATE.PARRY:
        if (this.stateTime > 0.35) this.setState(PLAYER_STATE.IDLE);
        break;
      case PLAYER_STATE.ATTACK:
        this.attackSwing = clamp(this.stateTime / (0.28 / this.weapon.swingSpeed), 0, 1);
        if (this.attackSwing >= 1) this.setState(PLAYER_STATE.IDLE);
        break;
      case PLAYER_STATE.HEAVY:
        this.attackSwing = clamp(this.stateTime / (0.5 / this.weapon.swingSpeed), 0, 1);
        if (this.attackSwing >= 1) this.setState(PLAYER_STATE.IDLE);
        break;
      case PLAYER_STATE.HURT:
        if (this.stateTime > 0.3) this.setState(PLAYER_STATE.IDLE);
        break;
      default: break;
    }
  }

  /* ---------------- rendering ---------------- */
  draw(ctx) {
    const s = this.scale;
    ctx.save();
    ctx.translate(this.x, this.y);

    // ground shadow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 4 * s, 46 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // dodge motion blur
    if (this.state === PLAYER_STATE.DODGE && this.iFrames) {
      ctx.globalAlpha = 0.35;
      this._drawBody(ctx, s, -this.dodgeDir * 22 * s, "#35e8ff");
      ctx.globalAlpha = 1;
    }

    const bob = this.state === PLAYER_STATE.IDLE ? Math.sin(this.animTime * 2.4) * 3 * s : 0;
    ctx.translate(0, bob);

    const tint = this.hurtFlash > 0 ? "#ff5f7f" : (this.overdrive ? "#c98bff" : "#dfe9ff");
    this._drawAura(ctx, s);
    this._drawBody(ctx, s, 0, tint);
    this._drawWeapon(ctx, s);
    this._drawGlitchTrail(ctx, s);

    // overdrive aura
    if (this.overdrive) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(0, -50 * s, 0, 0, -50 * s, 90 * s);
      g.addColorStop(0, "rgba(164,77,255,0.25)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -50 * s, 90 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawAura(ctx, s) {
    const active = this.overdrive || this.state === PLAYER_STATE.PARRY || this.state === PLAYER_STATE.ATTACK || this.state === PLAYER_STATE.HEAVY;
    if (!active) return;
    const color = this.overdrive ? "#c98bff" : "#35e8ff";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = this.overdrive ? 0.34 : 0.18;
    ctx.fillStyle = color;
    ctx.shadowBlur = 28 * s;
    ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(0, -54 * s, (48 + Math.sin(this.animTime * 10) * 6) * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawGlitchTrail(ctx, s) {
    if (this.state !== PLAYER_STATE.DODGE && !this.overdrive) return;
    const color = this.overdrive ? "#c98bff" : "#35e8ff";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = (0.22 - i * 0.025) * (this.overdrive ? 1 : 0.8);
      ctx.fillStyle = i % 2 ? color : "#9d6cff";
      const x = -this.dodgeDir * (18 + i * 12) * s + Math.sin(this.animTime * 18 + i) * 4 * s;
      const y = (-32 + i * 13) * s;
      ctx.fillRect(x, y, (12 + (i % 3) * 9) * s, 3 * s);
    }
    ctx.restore();
  }

  _drawBody(ctx, s, dx, tint) {
    ctx.save();
    ctx.translate(dx, 0);
    const crouch = this.state === PLAYER_STATE.HURT ? 6 * s : 0;

    // cloak / body (dark silhouette)
    ctx.fillStyle = "#160c26";
    ctx.strokeStyle = "rgba(53,232,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-22 * s, -6 * s + crouch);
    ctx.lineTo(-14 * s, -70 * s);
    ctx.lineTo(0, -84 * s);
    ctx.lineTo(14 * s, -70 * s);
    ctx.lineTo(22 * s, -6 * s + crouch);
    ctx.lineTo(10 * s, -2 * s + crouch);
    ctx.lineTo(-10 * s, -2 * s + crouch);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Split shoulder armor and a flowing digital scarf.
    ctx.fillStyle = "#261546";
    ctx.strokeStyle = "#9d6cff";
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.moveTo(-16 * s, -67 * s); ctx.lineTo(-40 * s, -59 * s); ctx.lineTo(-29 * s, -45 * s); ctx.lineTo(-12 * s, -54 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16 * s, -67 * s); ctx.lineTo(40 * s, -59 * s); ctx.lineTo(29 * s, -45 * s); ctx.lineTo(12 * s, -54 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = tint;
    ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(-13 * s, -67 * s); ctx.quadraticCurveTo(-50 * s, -45 * s, -61 * s, -14 * s); ctx.moveTo(13 * s, -67 * s); ctx.quadraticCurveTo(48 * s, -44 * s, 63 * s, -18 * s); ctx.stroke();
    ctx.restore();

    // chest rune
    ctx.fillStyle = tint;
    ctx.shadowBlur = 14; ctx.shadowColor = "#35e8ff";
    ctx.beginPath();
    ctx.arc(0, -50 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // helm
    ctx.fillStyle = "#1c1130";
    ctx.strokeStyle = "rgba(53,232,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(-10 * s, -78 * s);
    ctx.lineTo(0, -92 * s);
    ctx.lineTo(10 * s, -78 * s);
    ctx.lineTo(6 * s, -70 * s);
    ctx.lineTo(-6 * s, -70 * s);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // swept crest and visor slit
    ctx.fillStyle = "#9d6cff";
    ctx.strokeStyle = "#35e8ff";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(-4 * s, -90 * s); ctx.lineTo(0, -108 * s); ctx.lineTo(5 * s, -90 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#35e8ff"; ctx.lineWidth = 2 * s; ctx.shadowBlur = 10 * s; ctx.shadowColor = "#35e8ff";
    ctx.beginPath(); ctx.moveTo(-6 * s, -80 * s); ctx.lineTo(6 * s, -80 * s); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawWeapon(ctx, s) {
    // swing arc based on state
    let ang = -0.5; // rest angle
    if (this.state === PLAYER_STATE.ATTACK || this.state === PLAYER_STATE.HEAVY) {
      ang = lerp(-2.2, 0.9, this.attackSwing);
    } else if (this.state === PLAYER_STATE.PARRY) {
      ang = -1.4;
    }
    ctx.save();
    ctx.translate(16 * s, -46 * s);
    ctx.rotate(ang);
    // blade
    const bladeLen = (this.state === PLAYER_STATE.HEAVY ? 78 : 62) * s;
    const grad = ctx.createLinearGradient(0, 0, bladeLen, 0);
    grad.addColorStop(0, "#7bd6ff");
    grad.addColorStop(1, "#35e8ff");
    ctx.fillStyle = grad;
    ctx.shadowBlur = 16 * s; ctx.shadowColor = "#35e8ff";
    ctx.beginPath();
    ctx.moveTo(0, -2.5 * s);
    ctx.lineTo(bladeLen, -1 * s);
    ctx.lineTo(bladeLen + 8 * s, 0);
    ctx.lineTo(bladeLen, 1 * s);
    ctx.lineTo(0, 2.5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f5fdff";
    ctx.lineWidth = 1.5 * s;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo((18 + i * 13) * s, -2 * s); ctx.lineTo((24 + i * 13) * s, 2 * s); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // guard
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#2a1a44";
    ctx.fillRect(-4 * s, -6 * s, 6 * s, 12 * s);

    // swing trail
    if ((this.state === PLAYER_STATE.ATTACK || this.state === PLAYER_STATE.HEAVY) && this.attackSwing < 0.8) {
      ctx.globalAlpha = (1 - this.attackSwing) * 0.5;
      ctx.strokeStyle = "#35e8ff";
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.arc(0, 0, bladeLen * 0.8, -2.2, ang, false);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  hpRatio() { return this.hp / this.maxHp; }
  focusRatio() { return this.focus / CONFIG.FOCUS_MAX; }
}
