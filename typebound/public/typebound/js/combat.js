/* ============================================================
   TYPEBOUND — combat.js
   CombatSystem ties Player + Boss + TypingSystem + Particles + UI
   together into the actual fight: typed attacks, dodge, parry,
   riposte, stagger, phases, damage/accuracy math and run stats.
   Boss/Player stay dumb state machines; all decisions live here.
   ============================================================ */

class CombatSystem {
  constructor(game) {
    this.game = game;
    this.riposteActive = false;
    this.resetStats();
  }

  resetStats() {
    this.stats = {
      wordsTyped: 0,
      damageDealt: 0,
      damageTaken: 0,
      parries: 0,
      dodges: 0,
      crits: 0,
      startedAt: now(),
    };
    this.riposteActive = false;
  }

  /* ============================================================
     PLAYER OFFENSE — driven by Typing.onComplete
     ============================================================ */
  resolvePlayerAttack(info) {
    const { player, boss, state } = this.game;
    if (!boss || boss.state === BOSS_STATE.DEAD || player.state === PLAYER_STATE.DEAD) return;
    if (state !== STATE.PLAYING && state !== STATE.RIPOSTE) return;

    if (state === STATE.RIPOSTE) { this._resolveRiposte(info); return; }

    const weapon = player.weapon;
    const cost = weapon.staminaCost(info.cls);

    if (!player.stamina.has(cost)) {
      UI.setTypingHint("NOT ENOUGH STAMINA", "warn");
      this._nextWord();
      return;
    }
    player.stamina.spend(cost);

    const heavy = weapon.isHeavy(info.cls);
    const accMult = Typing.accuracyMult();
    const comboMult = 1 + Math.min(player.combo * CONFIG.COMBO_DMG_STEP, CONFIG.COMBO_DMG_CAP);
    const critEligible = info.perfect && info.fast && player.combo + 1 >= CONFIG.CRIT_COMBO_MIN;
    const isCrit = critEligible;

    let dmg = weapon.baseDamage(info.cls) * accMult * comboMult;
    if (player.overdrive) dmg *= CONFIG.OVERDRIVE_DMG_MULT;
    if (isCrit) dmg *= CONFIG.DMG_CRIT_MULT;
    dmg = Math.max(1, Math.round(dmg));

    player.swing(heavy);
    player.addCombo();
    player.addFocus(CONFIG.FOCUS_PER_WORD + (isCrit ? CONFIG.FOCUS_PER_CRIT : 0));

    const dealt = boss.takeDamage(dmg);
    boss.addStagger(CONFIG.STAGGER_HIT_GAIN * (heavy ? 1.6 : 1));

    this.stats.wordsTyped++;
    this.stats.damageDealt += dealt;
    if (isCrit) this.stats.crits++;

    const hitX = boss.x - 50 * boss.scale;
    const hitY = boss.y - 150 * boss.scale;
    this.game.particles.hitSpark(hitX, hitY, -1);
    if (heavy) this.game.particles.heavySpark(hitX, hitY, -1);
    this.game.particles.damageNumber(hitX, hitY, dealt, isCrit ? "#ff2fb9" : "#ffffff", isCrit);

    SFX.play(isCrit ? "crit" : heavy ? "heavy" : "hit");
    if (isCrit) UI.showBanner("CRITICAL HIT", "crit");

    this.game.requestHitstop(heavy ? CONFIG.HITSTOP_HEAVY : CONFIG.HITSTOP_LIGHT);
    this.game.shake(heavy ? 7 : 3);
    UI.updateCombo(player.combo);

    if (boss.state === BOSS_STATE.DEAD) return; // death flow takes over via onDeath
    this._nextWord();
  }

  _nextWord() {
    const word = Typing.generateWord(this.game.player.weapon);
    UI.renderTypingWord(Typing);
    return word;
  }

  /* ============================================================
     BOSS OFFENSE — driven by Boss.onAttackLand
     ============================================================ */
  handleBossAttackLanding(attack) {
    const { player } = this.game;
    if (player.state === PLAYER_STATE.DEAD) return;

    if (player.iFrames) {
      UI.showBanner("PERFECT DODGE", "dodge");
      this.game.particles.dust(player.x, player.y - 40, player.dodgeDir || 1);
      SFX.play("dodge");
      this.stats.dodges++;
      return;
    }

    const dmg = Math.round(attack.damage);
    const died = player.takeHit(dmg);
    this.stats.damageTaken += dmg;

    SFX.play("hurt");
    UI.flashDamage(this.game.flashEnabled);
    this.game.shake(attack.kind === "heavy" ? 15 : 8);
    this.game.particles.hitSpark(player.x, player.y - 60, 1);
    UI.updateCombo(0);

    if (died) this.game.onPlayerDeath();
  }

  /* ============================================================
     DODGE
     ============================================================ */
  tryDodge(dir) {
    const { player, state } = this.game;
    if (state !== STATE.PLAYING) return;
    if (!player.canDodge()) return;
    player.startDodge(dir);
    SFX.play("dodge");
    this.game.particles.dust(player.x, player.y - 20, dir || 1);
  }

  /* ============================================================
     PARRY
     ============================================================ */
  tryParry() {
    const { player, boss, state } = this.game;
    if (state !== STATE.PLAYING) return;
    if (!player.canParry()) return;

    const willSucceed = boss && boss.state === BOSS_STATE.TELEGRAPH && boss.parryWindowOpen;
    player.startParry();

    if (willSucceed) {
      this.stats.parries++;
      boss._enterStagger();
      this.game.enterSlowmo();
      this.game.particles.parryBurst(boss.x - 30 * boss.scale, boss.y - 160 * boss.scale);
      this.game.shake(11);
      SFX.play("parry");
      UI.showBanner("PERFECT PARRY", "parry");
    } else {
      SFX.play("ui");
      UI.setTypingHint("PARRY FAILED", "warn");
    }
  }

  /* ============================================================
     STAGGER -> RIPOSTE
     ============================================================ */
  handleBossStagger() {
    UI.showBanner("STAGGERED", "stagger");
    this.game.setState(STATE.RIPOSTE);
    this.riposteActive = true;
    Typing.locked = false;
    Typing.setRiposteWord();
    UI.renderTypingWord(Typing);
    UI.setTypingHint("RIPOSTE — TYPE TO FINISH");
  }

  _resolveRiposte(info) {
    const { player, boss } = this.game;
    let dmg = CONFIG.DMG_RIPOSTE;
    if (player.overdrive) dmg *= CONFIG.OVERDRIVE_DMG_MULT;
    dmg = Math.round(dmg);

    const dealt = boss.takeDamage(dmg);
    this.stats.damageDealt += dealt;

    const hitX = boss.x - 60 * boss.scale;
    const hitY = boss.y - 170 * boss.scale;
    this.game.particles.heavySpark(hitX, hitY, -1);
    this.game.particles.damageNumber(hitX, hitY, dealt, "#ffd27a", true);
    SFX.play("riposte");
    UI.showBanner("PERFECT RIPOSTE", "riposte");
    this.game.shake(18);
    this.game.requestHitstop(CONFIG.HITSTOP_HEAVY);
    player.addFocus(CONFIG.FOCUS_PER_PARRY);

    if (boss.state !== BOSS_STATE.DEAD) this.endRiposte(true);
  }

  endRiposte(success) {
    if (!this.riposteActive) return;
    this.riposteActive = false;
    const { boss } = this.game;
    if (!success) UI.setTypingHint("OPENING CLOSED", "warn");
    if (boss.staggered) boss._exitStagger();
    if (this.game.state === STATE.RIPOSTE) this.game.setState(STATE.PLAYING);
    this._nextWord();
  }

  /* ============================================================
     PHASES / OVERDRIVE / DEATH
     ============================================================ */
  handlePhaseChange(phase) {
    UI.showBanner("PHASE " + (["", "I", "II", "III"][phase] || phase), "phase");
    UI.setPhaseLabel(phase);
    UI.setEnraged(phase >= 3);
    this.game.shake(20);
    this.game.enterSlowmo(0.5, 0.35);
    SFX.setMusicIntensity(phase);
  }

  tryOverdrive() {
    const { player, state } = this.game;
    if (state !== STATE.PLAYING) return;
    if (!player.focusReady()) return;
    player.startOverdrive();
    SFX.play("overdrive");
    UI.showBanner("OVERDRIVE", "crit");
    this.game.particles.death(player.x, player.y - 60, ["#c98bff", "#a44dff", "#ffffff"]);
    UI.setFocusReady(false);
  }

  handleBossDeath() {
    this.game.onBossDeath();
  }
}
