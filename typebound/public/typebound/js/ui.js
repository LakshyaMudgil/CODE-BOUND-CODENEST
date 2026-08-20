/* ============================================================
   TYPEBOUND — ui.js
   UIManager: every DOM read/write lives here so game.js and
   combat.js never touch the DOM directly. Canvas-space fx
   (particles, screen shake target) stay in game.js; this file
   owns screens, overlays, HUD bars, banners and the typing zone.
   ============================================================ */

class UIManager {
  constructor() {
    this.el = {};
    [
      "screen-menu", "screen-intro", "screen-game", "screen-result",
      "overlay-howto", "overlay-settings",
      "intro-tier", "intro-name", "intro-tag",
      "hud-weapon", "player-hp-fill", "player-hp-label",
      "player-stamina-fill", "player-focus-fill", "focus-ready",
      "stat-wpm", "stat-acc",
      "boss-name", "boss-phase", "boss-hp-fill", "boss-stagger-fill",
      "hud-combo", "combo-n",
      "action-banner",
      "typing-zone", "typing-word", "typing-hint",
      "debug-overlay",
      "vignette", "damage-flash", "slowmo-tint",
      "result-title", "result-sub", "result-stats", "result-reward",
    ].forEach((id) => { this.el[id] = document.getElementById(id); });

    this._bannerTimeout = null;
    this._hintTimeout = null;
    this._comboBumpTimeout = null;
  }

  /* ---------------- screens ---------------- */
  showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("screen--active"));
    const target = this.el[id] || document.getElementById(id);
    if (target) target.classList.add("screen--active");
  }

  /* ---------------- overlays ---------------- */
  openOverlay(id) {
    const target = this.el[id] || document.getElementById(id);
    if (target) target.classList.add("overlay--open");
  }
  closeOverlayAll() {
    document.querySelectorAll(".overlay").forEach((o) => o.classList.remove("overlay--open"));
  }

  /* ---------------- boss intro ---------------- */
  setIntro(def) {
    if (this.el["intro-tier"]) this.el["intro-tier"].textContent = def.tier || "";
    if (this.el["intro-name"]) {
      this.el["intro-name"].textContent = def.name;
      this.el["intro-name"].dataset.text = def.name;
    }
    if (this.el["intro-tag"]) this.el["intro-tag"].textContent = def.tagline || "";
    if (this.el["screen-intro"]) {
      this.el["screen-intro"].querySelector(".intro-backdrop").style.backgroundImage =
        def.arenaImage ? `url(${def.arenaImage})` : "none";
    }
  }

  /* ---------------- HUD: player + boss bars ---------------- */
  setWeaponName(name) { if (this.el["hud-weapon"]) this.el["hud-weapon"].textContent = name; }

  updateHUD(player, boss) {
    const hpPct = clamp(player.hpRatio(), 0, 1) * 100;
    this.el["player-hp-fill"].style.width = hpPct + "%";
    this.el["player-hp-label"].textContent = `${Math.round(player.hp)} / ${player.maxHp}`;

    this.el["player-stamina-fill"].style.width = clamp(player.stamina.ratio(), 0, 1) * 100 + "%";

    const focusPct = clamp(player.focusRatio(), 0, 1) * 100;
    this.el["player-focus-fill"].style.width = focusPct + "%";
    this.setFocusReady(player.focusReady());

    this.el["stat-wpm"].textContent = Typing.wpm;
    this.el["stat-acc"].textContent = Typing.accuracy() + "%";

    if (boss) {
      this.el["boss-name"].textContent = boss.name;
      this.el["boss-hp-fill"].style.width = clamp(boss.hpRatio(), 0, 1) * 100 + "%";
      const stagFill = this.el["boss-stagger-fill"];
      stagFill.style.width = clamp(boss.staggerRatio(), 0, 1) * 100 + "%";
      stagFill.parentElement.classList.toggle("full", boss.staggered);
    }
  }

  setFocusReady(ready) {
    this.el["player-focus-fill"].parentElement.classList.toggle("ready", ready);
  }

  setPhaseLabel(phase) {
    const roman = ["", "I", "II", "III", "IV", "V"][phase] || phase;
    this.el["boss-phase"].textContent = "PHASE " + roman;
  }

  /* ---------------- combo ---------------- */
  updateCombo(n) {
    this.el["combo-n"].textContent = n;
    this.el["hud-combo"].classList.toggle("show", n > 0);
    this.el["hud-combo"].classList.remove("bump");
    if (n > 0) {
      // restart the bump animation
      void this.el["hud-combo"].offsetWidth;
      this.el["hud-combo"].classList.add("bump");
    }
  }

  /* ---------------- center action banner ---------------- */
  showBanner(text, cls) {
    const b = this.el["action-banner"];
    b.className = "action-banner";
    b.textContent = text;
    // restart the pop animation even if the same class repeats
    void b.offsetWidth;
    b.classList.add(cls, "show");
    clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => b.classList.remove("show"), 1100);
  }

  /* ---------------- typing zone ---------------- */
  renderTypingWord(typing) {
    const wordEl = this.el["typing-word"];
    wordEl.classList.toggle("riposte-word", typing.wordClass === "riposte");
    wordEl.classList.toggle("locked", typing.locked);
    if (!typing.currentWord) { wordEl.innerHTML = ""; return; }
    let html = "";
    for (let i = 0; i < typing.currentWord.length; i++) {
      const ch = typing.currentWord[i];
      let cls = "char";
      if (i < typing.typed.length) cls += " done";
      if (i === typing.typed.length) cls += " cursor";
      html += `<span class="${cls}">${ch}</span>`;
    }
    wordEl.innerHTML = html;
  }

  flashWrongChar() {
    const wordEl = this.el["typing-word"];
    const cursor = wordEl.querySelector(".cursor");
    if (cursor) {
      cursor.classList.add("wrong");
      setTimeout(() => cursor.classList.remove("wrong"), 120);
    }
  }

  setTypingHint(text, cls) {
    const hint = this.el["typing-hint"];
    hint.textContent = text;
    hint.classList.remove("warn", "good");
    if (cls) hint.classList.add(cls);
    if (cls) {
      clearTimeout(this._hintTimeout);
      this._hintTimeout = setTimeout(() => { hint.textContent = "TYPE TO ATTACK"; hint.classList.remove("warn", "good"); }, 1400);
    }
  }

  /* ---------------- screen fx ---------------- */
  flashDamage(enabled) {
    if (enabled === false) return;
    const el = this.el["damage-flash"];
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }

  setSlowmo(active) { this.el["slowmo-tint"].classList.toggle("active", active); }
  setEnraged(active) { this.el["vignette"].classList.toggle("enraged", active); }

  setShake(x, y) {
    document.getElementById("game-root").style.setProperty("--shake-x", x.toFixed(1) + "px");
    document.getElementById("game-root").style.setProperty("--shake-y", y.toFixed(1) + "px");
  }

  /* ---------------- debug ---------------- */
  toggleDebug() { this.el["debug-overlay"].classList.toggle("show"); }
  setDebugText(str) { this.el["debug-overlay"].textContent = str; }
  debugVisible() { return this.el["debug-overlay"].classList.contains("show"); }

  /* ---------------- result screen ---------------- */
  showResult({ won, bossName, stats, reward }) {
    const title = this.el["result-title"];
    title.textContent = won ? "BOSS DEFEATED" : "YOU DIED";
    title.className = "result-title " + (won ? "won" : "died");
    this.el["result-sub"].textContent = won
      ? `${bossName} HAS FALLEN`
      : `${bossName} PREVAILS`;

    this.el["result-stats"].innerHTML = stats.map((s) => `
      <div class="result-stat">
        <span class="rs-label">${s.label}</span>
        <span class="rs-value">${s.value}</span>
      </div>`).join("");

    this.el["result-reward"].textContent = reward || "";
    this.showScreen("screen-result");
  }
}

const UI = new UIManager();
