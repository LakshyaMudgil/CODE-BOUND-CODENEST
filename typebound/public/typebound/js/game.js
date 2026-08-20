/* ============================================================
   TYPEBOUND — game.js
   The Game class owns the state machine, the requestAnimationFrame
   loop, canvas sizing/layout, screen-shake/hitstop/slowmo timers,
   ambient background fx, and wires Player + Boss + Arena +
   Particles + CombatSystem + UI + Typing + Input together.
   ============================================================ */

class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.fxCanvas = document.getElementById("fx-canvas");
    this.fxCtx = this.fxCanvas.getContext("2d");

    this.state = STATE.MENU;
    this.player = new Player();
    this.boss = null;
    this.arena = null;
    this.particles = new ParticleSystem();
    this.combat = new CombatSystem(this);

    this.save = Save.load();

    this.width = 0;
    this.height = 0;
    this._lastTs = 0;

    /* screen shake */
    this.shakeMag = 0;
    this._shakeX = 0;
    this._shakeY = 0;

    /* hitstop (brief full freeze) + slow-mo (partial time scale) */
    this.hitstopUntil = 0;
    this.slowmoUntil = 0;
    this.slowmoScale = CONFIG.SLOWMO_SCALE;

    /* settings */
    this.shakeEnabled = true;
    this.flashEnabled = true;

    this.ambient = [];
    this._spawnAmbient();

    this._loop = this._loop.bind(this);
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
  }

  init() {
    this._resize();
    this.loadBoss(GLITCHED_KNIGHT_DEF);
    requestAnimationFrame(this._loop);
  }

  /* ---------------- boss loading ---------------- */
  loadBoss(def) {
    this.boss = new Boss(def);
    this.arena = new Arena(def);
    this._wireBossCallbacks();
    this._layout();
  }

  _wireBossCallbacks() {
    this.boss.onTelegraph = () => { SFX.play("telegraph"); };
    this.boss.onAttackLand = (attack) => this.combat.handleBossAttackLanding(attack);
    this.boss.onPhaseChange = (phase) => this.combat.handlePhaseChange(phase);
    this.boss.onStagger = () => this.combat.handleBossStagger();
    this.boss.onDeath = () => this.combat.handleBossDeath();
  }

  /* ---------------- layout / resize ---------------- */
  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    for (const c of [this.canvas, this.fxCanvas]) {
      c.width = this.width * dpr;
      c.height = this.height * dpr;
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this._layout();
  }

  _layout() {
    const w = this.width, h = this.height;
    const scale = clamp(h / 1080, 0.55, 1.15);
    this.player.setHome(w * 0.22, h * 0.82, scale);
    if (this.boss) {
      this.boss.x = w * 0.76;
      this.boss.y = h * 0.82;
      this.boss.scale = scale;
    }
  }

  /* ---------------- run lifecycle ---------------- */
  startRun() {
    SFX.init();
    SFX.startMusic();
    this.player.reset();
    this.boss.reset();
    Typing.reset();
    this.combat.resetStats();
    this._layout();

    UI.setIntro(this.boss.def);
    UI.setWeaponName(this.player.weapon.name);
    UI.setPhaseLabel(1);
    UI.setEnraged(false);
    UI.updateCombo(0);
    UI.updateHUD(this.player, this.boss);

    this.setState(STATE.BOSS_INTRO);
    UI.showScreen("screen-intro");
    Input.disable();

    setTimeout(() => {
      if (this.state !== STATE.BOSS_INTRO) return;
      this.setState(STATE.PLAYING);
      UI.showScreen("screen-game");
      Input.enable();
      this.combat._nextWord();
      UI.setTypingHint("TYPE TO ATTACK");
    }, 2400);
  }

  goToMenu() {
    this.setState(STATE.MENU);
    Input.disable();
    UI.showScreen("screen-menu");
  }

  setState(s) { this.state = s; }

  onPlayerDeath() {
    this.setState(STATE.PLAYER_DEAD);
    Input.disable();
    Typing.locked = true;
    SFX.play("death");
    setTimeout(() => this._showResult(false), 1300);
  }

  onBossDeath() {
    this.setState(STATE.BOSS_DEAD);
    Input.disable();
    Typing.locked = true;
    SFX.play("victory");

    const save = this.save;
    if (!save.bossesDefeated.includes(this.boss.def.id)) save.bossesDefeated.push(this.boss.def.id);
    save.fragments += CONFIG.REWARD_FRAGMENTS;
    save.bestWPM = Math.max(save.bestWPM, Typing.peakWpm);
    save.bestAccuracy = Math.max(save.bestAccuracy, Typing.accuracy());
    Save.save(save);

    setTimeout(() => this._showResult(true), 1500);
  }

  _showResult(won) {
    const elapsed = Math.max(0, now() - this.combat.stats.startedAt);
    const stats = won
      ? [
          { label: "TIME", value: elapsed.toFixed(1) + "s" },
          { label: "WPM", value: Typing.peakWpm },
          { label: "ACCURACY", value: Typing.accuracy() + "%" },
          { label: "WORDS TYPED", value: this.combat.stats.wordsTyped },
          { label: "DAMAGE DEALT", value: this.combat.stats.damageDealt },
          { label: "PARRIES", value: this.combat.stats.parries },
          { label: "DODGES", value: this.combat.stats.dodges },
          { label: "CRITICAL HITS", value: this.combat.stats.crits },
        ]
      : [
          { label: "BOSS", value: this.boss.name },
          { label: "DAMAGE DEALT", value: this.combat.stats.damageDealt },
          { label: "WPM", value: Typing.peakWpm },
          { label: "ACCURACY", value: Typing.accuracy() + "%" },
          { label: "TIME SURVIVED", value: elapsed.toFixed(1) + "s" },
          { label: "BEST COMBO", value: this.player.longestCombo },
          { label: "BOSS HP LEFT", value: Math.round(this.boss.hpRatio() * 100) + "%" },
        ];

    UI.showResult({
      won,
      bossName: this.boss.name,
      stats,
      reward: won ? `+${CONFIG.REWARD_FRAGMENTS} CODE FRAGMENTS` : "",
    });
  }

  /* ---------------- fx helpers used by combat.js ---------------- */
  shake(mag) { if (this.shakeEnabled) this.shakeMag = Math.max(this.shakeMag, mag); }

  requestHitstop(dur) { this.hitstopUntil = Math.max(this.hitstopUntil, now() + dur); }

  enterSlowmo(scale = CONFIG.SLOWMO_SCALE, dur = CONFIG.SLOWMO_DURATION) {
    this.slowmoScale = scale;
    this.slowmoUntil = now() + dur;
    UI.setSlowmo(true);
  }

  /* ---------------- ambient background particles (fx-canvas) ---------------- */
  _spawnAmbient() {
    this.ambient = Array.from({ length: 46 }, () => this._ember());
  }
  _ember() {
    return {
      x: Math.random(),
      y: Math.random(),
      vy: -(6 + Math.random() * 14),
      vx: (Math.random() - 0.5) * 6,
      size: 1 + Math.random() * 2.4,
      alpha: 0.15 + Math.random() * 0.35,
      hue: Math.random() < 0.5 ? "#a44dff" : "#35e8ff",
    };
  }
  _updateAmbient(dt) {
    for (const e of this.ambient) {
      e.y += (e.vy * dt) / this.height;
      e.x += (e.vx * dt) / this.width;
      if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
    }
  }
  _drawAmbient() {
    const ctx = this.fxCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const e of this.ambient) {
      ctx.save();
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = e.hue;
      ctx.shadowBlur = 6;
      ctx.shadowColor = e.hue;
      ctx.beginPath();
      ctx.arc(e.x * this.width, e.y * this.height, e.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------- main loop ---------------- */
  _loop(ts) {
    if (!this._lastTs) this._lastTs = ts;
    let dt = Math.min(0.05, (ts - this._lastTs) / 1000);
    this._lastTs = ts;

    if (now() < this.hitstopUntil) {
      dt = 0;
    } else if (now() < this.slowmoUntil) {
      dt *= this.slowmoScale;
    } else if (this.slowmoUntil && now() >= this.slowmoUntil) {
      this.slowmoUntil = 0;
      UI.setSlowmo(false);
    }

    this.update(dt);
    this.draw();

    requestAnimationFrame(this._loop);
  }

  update(dt) {
    this._updateAmbient(dt);

    const playing = this.state === STATE.PLAYING || this.state === STATE.RIPOSTE;
    const canAct = this.state === STATE.PLAYING;

    if (playing || this.state === STATE.PLAYER_DEAD || this.state === STATE.BOSS_DEAD) {
      this.player.update(dt);
      if (this.boss) this.boss.update(dt, canAct);
      if (this.arena) this.arena.update(dt);

      // If the boss's stagger window expired naturally while we were
      // mid-riposte, close the riposte window and resume normal combat.
      if (this.state === STATE.RIPOSTE && this.boss && this.boss.state !== BOSS_STATE.STAGGER) {
        this.combat.endRiposte(false);
      }
    }

    this.particles.update(dt);

    // screen shake decay
    if (this.shakeMag > 0) {
      this.shakeMag = Math.max(0, this.shakeMag - CONFIG.SHAKE_DECAY * dt);
      this._shakeX = (Math.random() - 0.5) * this.shakeMag;
      this._shakeY = (Math.random() - 0.5) * this.shakeMag;
    } else {
      this._shakeX = 0; this._shakeY = 0;
    }
    UI.setShake(this._shakeX, this._shakeY);

    if (playing) {
      UI.updateHUD(this.player, this.boss);
      if (UI.debugVisible()) this._updateDebug();
    }
  }

  draw() {
    const ctx = this.ctx;
    this._drawAmbient();

    if (this.state === STATE.MENU || this.state === STATE.BOSS_INTRO) {
      ctx.clearRect(0, 0, this.width, this.height);
      return;
    }

    if (this.arena) this.arena.draw(ctx, this.width, this.height);
    this.player.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
    this.particles.draw(ctx);
  }

  _updateDebug() {
    const b = this.boss;
    UI.setDebugText(
      `FPS ${Math.round(1 / Math.max(1 / 240, (performance.now() - (this._lastDebugTs || performance.now())) / 1000 || 1 / 60))}\n` +
      `STATE ${this.state}\n` +
      `PLAYER hp ${Math.round(this.player.hp)}/${this.player.maxHp} stamina ${Math.round(this.player.stamina.value)} combo ${this.player.combo}\n` +
      `BOSS ${b ? `hp ${Math.round(b.hp)}/${b.maxHp} stagger ${Math.round(b.stagger)}/${b.maxStagger} state ${b.state} phase ${b.phase}` : "-"}\n` +
      `WORD ${Typing.currentWord}`
    );
    this._lastDebugTs = performance.now();
  }
}
