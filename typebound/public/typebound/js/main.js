/* ============================================================
   TYPEBOUND — main.js
   Entry point. Boots the Game, wires DOM buttons, keyboard input
   (combat keys, typing characters, debug keys) and the Typing
   system's callbacks into CombatSystem. Nothing game-logic-heavy
   lives here — this file only connects the pieces.
   ============================================================ */

(function () {
  const game = new Game();
  window.__TYPEBOUND__ = game; // handy for console debugging

  function boot() {
    game.init();

    /* ---------------- menu / overlay buttons ---------------- */
    document.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        SFX.init();
        SFX.play("ui");
        const action = btn.dataset.action;
        switch (action) {
          case "start": game.startRun(); break;
          case "howto": UI.openOverlay("overlay-howto"); break;
          case "settings": UI.openOverlay("overlay-settings"); break;
          case "close-overlay": UI.closeOverlayAll(); break;
          case "retry": game.startRun(); break;
          case "menu": game.goToMenu(); break;
          default: break;
        }
      });
    });

    /* ---------------- settings ---------------- */
    const sfxSlider = document.getElementById("set-sfx");
    const musicSlider = document.getElementById("set-music");
    const shakeToggle = document.getElementById("set-shake");
    const flashToggle = document.getElementById("set-flash");

    if (sfxSlider) sfxSlider.addEventListener("input", (e) => SFX.setSfx(e.target.value / 100));
    if (musicSlider) musicSlider.addEventListener("input", (e) => SFX.setMusic(e.target.value / 100));
    if (shakeToggle) shakeToggle.addEventListener("change", (e) => { game.shakeEnabled = e.target.checked; });
    if (flashToggle) flashToggle.addEventListener("change", (e) => { game.flashEnabled = e.target.checked; });

    /* ---------------- non-letter combat controls ---------------- */
    Input.onCombat(CONTROL_CONFIG.dodgeLeft, () => game.combat.tryDodge(-1));
    Input.onCombat(CONTROL_CONFIG.dodgeRight, () => game.combat.tryDodge(1));
    Input.onCombat(CONTROL_CONFIG.backstep, () => game.combat.tryDodge(0));
    Input.onCombat(CONTROL_CONFIG.parry, () => game.combat.tryParry());
    Input.onCombat(CONTROL_CONFIG.overdrive, () => game.combat.tryOverdrive());

    /* ---------------- typing ---------------- */
    Typing.onProgress = (ch, correct) => {
      UI.renderTypingWord(Typing);
      if (!correct) UI.flashWrongChar();
      SFX.play("type");
    };
    Typing.onComplete = (info) => game.combat.resolvePlayerAttack(info);

    Input.onType((ch) => Typing.handleChar(ch));
    Input.onBackspace(() => { Typing.backspace(); UI.renderTypingWord(Typing); });

    /* ---------------- debug (F3 toggle, F4-F7 cheats) ---------------- */
    Input.onDebug("F3", () => UI.toggleDebug());
    Input.onDebug("F4", () => { game.player.hp = game.player.maxHp; });
    Input.onDebug("F5", () => { if (game.boss) game.boss.takeDamage(40); });
    Input.onDebug("F6", () => { if (game.boss) game.boss.addStagger(999); });
    Input.onDebug("F7", () => { game.player.focus = CONFIG.FOCUS_MAX; });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
