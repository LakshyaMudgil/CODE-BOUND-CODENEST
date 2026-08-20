/* ============================================================
   TYPEBOUND — boss.js
   Base Boss class: an attack state machine + phase system that
   is fully data-driven so all 10 bosses reuse the same engine.
   A concrete boss (e.g. glitchedKnight.js) supplies a `def`.
   ============================================================ */

const BOSS_STATE = Object.freeze({
  IDLE: "IDLE", TELEGRAPH: "TELEGRAPH", ATTACK: "ATTACK",
  RECOVERY: "RECOVERY", STAGGER: "STAGGER", DEAD: "DEAD",
});

class Boss {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;

    this.maxStagger = CONFIG.STAGGER_MAX;
    this.stagger = 0;
    this.staggered = false;
    this.staggerUntil = 0;

    this.phase = 1;
    this.phaseCount = def.phases.length;

    /* world */
    this.x = 0; this.y = 0; this.scale = 1;
    this.facing = -1; // faces left toward player

    /* state machine */
    this.state = BOSS_STATE.IDLE;
    this.stateTime = 0;
    this.animTime = 0;
    this.nextActionAt = 0;

    /* current attack descriptor */
    this.attack = null;          // { name, telegraph, active, recovery, damage, kind }
    this.attackStep = 0;         // for combo attacks
    this.comboQueue = [];

    /* signals read by combat/game each frame */
    this.pendingHit = false;     // true for one frame when the attack "lands"
    this.parryWindowOpen = false;
    this.telegraphKind = "";

    /* fx */
    this.hurtFlash = 0;
    this.image = def.image || null;
    this.imageReady = false;
    if (this.image) {
      this.imgEl = new Image();
      this.imgEl.crossOrigin = "anonymous";
      this.imgEl.onload = () => { this.imageReady = true; };
      this.imgEl.src = this.image;
    }

    /* callbacks (wired by game) */
    this.onTelegraph = null;   // fn(attack)
    this.onAttackLand = null;  // fn(attack)
    this.onPhaseChange = null; // fn(phase)
    this.onStagger = null;
    this.onDeath = null;
  }

  reset() {
    this.hp = this.maxHp;
    this.stagger = 0;
    this.staggered = false;
    this.phase = 1;
    this.setState(BOSS_STATE.IDLE);
    this.attack = null;
    this.comboQueue = [];
    this.pendingHit = false;
    this.hurtFlash = 0;
    this._scheduleNext(1.4);
  }

  setState(s) { this.state = s; this.stateTime = 0; }

  get phaseDef() { return this.def.phases[this.phase - 1]; }

  _scheduleNext(delay) {
    this.nextActionAt = now() + delay * (this.phaseDef.cooldownMult ?? 1);
  }

  /* choose an attack (or combo) for the current phase */
  _chooseAttack() {
    const pool = this.phaseDef.attacks;
    const chosen = pick(pool);
    if (chosen.combo) {
      this.comboQueue = chosen.combo.map(k => this.def.moves[k]);
    } else {
      this.comboQueue = [this.def.moves[chosen]];
    }
    this.attackStep = 0;
    this._beginTelegraph(this.comboQueue[0]);
  }

  _beginTelegraph(move) {
    this.attack = move;
    this.telegraphKind = move.kind;
    this.setState(BOSS_STATE.TELEGRAPH);
    this.parryWindowOpen = false;
    if (this.onTelegraph) this.onTelegraph(move);
    SFX.play("telegraph");
  }

  /* ---------- damage in ---------- */
  takeDamage(amount) {
    if (this.state === BOSS_STATE.DEAD) return 0;
    let dmg = amount;
    if (this.staggered) dmg *= CONFIG.DMG_STAGGER_BONUS;
    dmg = Math.round(dmg);
    this.hp = clamp(this.hp - dmg, 0, this.maxHp);
    this.hurtFlash = 1;
    this._checkPhase();
    if (this.hp <= 0) this._die();
    return dmg;
  }

  addStagger(amount) {
    if (this.staggered || this.state === BOSS_STATE.DEAD) return;
    this.stagger = clamp(this.stagger + amount * (this.def.staggerTakenMult ?? 1), 0, this.maxStagger);
    if (this.stagger >= this.maxStagger) this._enterStagger();
  }

  _enterStagger() {
    this.staggered = true;
    this.staggerUntil = now() + CONFIG.STAGGER_DURATION;
    this.stagger = this.maxStagger;
    this.attack = null;
    this.comboQueue = [];
    this.parryWindowOpen = false;
    this.setState(BOSS_STATE.STAGGER);
    SFX.play("stagger");
    if (this.onStagger) this.onStagger();
  }

  _exitStagger() {
    this.staggered = false;
    this.stagger = 0;
    this.setState(BOSS_STATE.RECOVERY);
    this._scheduleNext(0.8);
  }

  _checkPhase() {
    const ratio = this.hp / this.maxHp;
    for (let i = this.def.phases.length; i >= 1; i--) {
      const threshold = this.def.phases[i - 1].hpThreshold;
      if (ratio <= threshold && this.phase < i) {
        this.phase = i;
        if (this.onPhaseChange) this.onPhaseChange(this.phase);
        SFX.play("phase");
        break;
      }
    }
  }

  _die() {
    this.setState(BOSS_STATE.DEAD);
    this.attack = null;
    this.parryWindowOpen = false;
    SFX.play("roar");
    if (this.onDeath) this.onDeath();
  }

  /* ---------- update ---------- */
  update(dt, canAct) {
    this.stateTime += dt;
    this.animTime += dt;
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);
    this.pendingHit = false;

    // poise recovers slowly while not staggered
    if (!this.staggered && this.stagger > 0 && this.state !== BOSS_STATE.TELEGRAPH) {
      this.stagger = clamp(this.stagger - CONFIG.STAGGER_DECAY * dt, 0, this.maxStagger);
    }

    switch (this.state) {
      case BOSS_STATE.IDLE:
        if (canAct && now() >= this.nextActionAt) this._chooseAttack();
        break;

      case BOSS_STATE.TELEGRAPH: {
        const a = this.attack;
        // parry window opens near the end of the telegraph
        const p = this.stateTime / a.telegraph;
        this.parryWindowOpen = p >= (1 - a.parryOpen);
        if (this.stateTime >= a.telegraph) {
          this.setState(BOSS_STATE.ATTACK);
          this.parryWindowOpen = false;
        }
        break;
      }

      case BOSS_STATE.ATTACK: {
        const a = this.attack;
        // hit lands at the mid-point of the active window
        if (!a._landed && this.stateTime >= a.active * 0.5) {
          a._landed = true;
          this.pendingHit = true;
          if (this.onAttackLand) this.onAttackLand(a);
          SFX.play(a.kind === "heavy" ? "heavy" : "swing");
        }
        if (this.stateTime >= a.active) {
          a._landed = false;
          this.attackStep++;
          if (this.attackStep < this.comboQueue.length) {
            this._beginTelegraph(this.comboQueue[this.attackStep]);
          } else {
            this.setState(BOSS_STATE.RECOVERY);
          }
        }
        break;
      }

      case BOSS_STATE.RECOVERY:
        if (this.stateTime >= (this.attack ? this.attack.recovery : 0.6)) {
          this.setState(BOSS_STATE.IDLE);
          this._scheduleNext(rand(this.phaseDef.gapMin, this.phaseDef.gapMax));
        }
        break;

      case BOSS_STATE.STAGGER:
        if (now() >= this.staggerUntil) this._exitStagger();
        break;

      default: break;
    }
  }

  /* the boss defers drawing to its def, falling back to a silhouette */
  draw(ctx) {
    if (this.def.draw) { this.def.draw(ctx, this); return; }
    this._drawFallback(ctx);
  }

  _drawFallback(ctx) {
    const s = this.scale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.hurtFlash > 0 ? "#ffffff" : "#1a0d30";
    ctx.strokeStyle = "rgba(164,77,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-50 * s, 0);
    ctx.lineTo(-30 * s, -150 * s);
    ctx.lineTo(0, -180 * s);
    ctx.lineTo(30 * s, -150 * s);
    ctx.lineTo(50 * s, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  hpRatio() { return this.hp / this.maxHp; }
  staggerRatio() { return this.stagger / this.maxStagger; }
}
