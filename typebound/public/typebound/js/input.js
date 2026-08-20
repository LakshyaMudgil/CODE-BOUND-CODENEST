/* ============================================================
   TYPEBOUND — input.js
   InputManager routes keyboard events. Non-letter combat controls
   stay separate from TYPING characters so every letter remains usable.
   ============================================================ */

class InputManager {
  constructor() {
    this.combatHandlers = {};   // key -> fn
    this.typingHandler = null;  // fn(char)
    this.backspaceHandler = null;
    this.debugHandlers = {};
    this.enabled = false;
    this.typingEnabled = true;

    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener("keydown", this._onKeyDown);
  }

  onCombat(key, fn) { this.combatHandlers[key] = fn; }
  onDebug(key, fn) { this.debugHandlers[key.toUpperCase()] = fn; }
  onType(fn) { this.typingHandler = fn; }
  onBackspace(fn) { this.backspaceHandler = fn; }

  enable() { this.enabled = true; }
  disable() { this.enabled = false; }
  setTyping(on) { this.typingEnabled = on; }

  _onKeyDown(e) {
    // Debug keys work whenever gameplay input is enabled.
    if (this.debugHandlers[e.key.toUpperCase()]) {
      e.preventDefault();
      this.debugHandlers[e.key.toUpperCase()]();
      return;
    }

    if (!this.enabled) return;

    // CJK IME guard for the (rare) case an input element is focused.
    if (e.isComposing || e.keyCode === 229) return;

    const code = e.code;

    // Combat controls use non-letter physical keys so every A-Z key stays available to typing.
    if (this.combatHandlers[code]) {
      e.preventDefault();
      this.combatHandlers[code]();
      return;
    }

    // Backspace corrects the current word.
    if (e.key === "Backspace") {
      e.preventDefault();
      if (this.typingEnabled && this.backspaceHandler) this.backspaceHandler();
      return;
    }

    // Typing characters: single printable char, no modifier combos.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Only letters/lowercase word chars matter for our word pools,
      // but we forward any single char so accuracy can register mistakes.
      if (this.typingEnabled && this.typingHandler) {
        e.preventDefault();
        this.typingHandler(e.key.toLowerCase());
      }
    }
  }
}

const Input = new InputManager();
