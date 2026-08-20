/* ============================================================
   TYPEBOUND — typing.js
   TypingSystem owns the current word, per-character state, live
   WPM / accuracy, and reports completed words back to combat.
   ============================================================ */

class TypingSystem {
  constructor() {
    this.currentWord = "";
    this.typed = "";           // what the player has correctly matched so far
    this.wordClass = "";       // "short" | "medium" | "long" | "riposte"
    this.locked = false;       // true when typing shouldn't advance the boss fight

    /* accuracy tracking (session) */
    this.totalKeys = 0;
    this.correctKeys = 0;

    /* WPM tracking */
    this.startTime = 0;
    this.charsTypedForWpm = 0;
    this.wpm = 0;
    this.peakWpm = 0;
    this.wordsCompleted = 0;

    /* current-word timing (for crit window) */
    this.wordStart = 0;
    this.wordMistakes = 0;

    /* callbacks */
    this.onComplete = null;    // fn(info)
    this.onProgress = null;    // fn(char, correct)
  }

  reset() {
    this.typed = "";
    this.totalKeys = 0;
    this.correctKeys = 0;
    this.charsTypedForWpm = 0;
    this.wpm = 0;
    this.peakWpm = 0;
    this.wordsCompleted = 0;
    this.startTime = now();
    this.setWord("", "");
  }

  setWord(word, cls) {
    this.currentWord = word;
    this.typed = "";
    this.wordClass = cls;
    this.wordStart = now();
    this.wordMistakes = 0;
  }

  /* generate based on weapon-provided pool weighting */
  generateWord(weapon) {
    const cls = weapon.rollWordClass();
    const word = pick(WORD_POOLS[cls]);
    this.setWord(word, cls);
    return word;
  }

  setRiposteWord() {
    this.setWord(pick(WORD_POOLS.riposte), "riposte");
  }

  handleChar(ch) {
    if (!this.currentWord) return;
    const expected = this.currentWord[this.typed.length];
    this.totalKeys++;
    this.charsTypedForWpm++;

    if (ch === expected) {
      this.correctKeys++;
      this.typed += ch;
      if (this.onProgress) this.onProgress(ch, true);
      if (this.typed.length === this.currentWord.length) this._complete();
    } else {
      this.wordMistakes++;
      if (this.onProgress) this.onProgress(ch, false);
    }
    this._recalcWpm();
  }

  backspace() {
    if (this.typed.length > 0) this.typed = this.typed.slice(0, -1);
  }

  _complete() {
    this.wordsCompleted++;
    const elapsed = Math.max(0.001, now() - this.wordStart);
    const perfect = this.wordMistakes === 0;
    const fast = elapsed < this.currentWord.length * 0.16; // quick clean typing
    const info = {
      word: this.currentWord,
      cls: this.wordClass,
      perfect,
      fast,
      length: this.currentWord.length,
      accuracy: this.accuracy(),
    };
    if (this.onComplete) this.onComplete(info);
  }

  _recalcWpm() {
    const mins = Math.max(1 / 60, (now() - this.startTime) / 60);
    // standard: 5 chars = 1 word
    this.wpm = Math.round((this.charsTypedForWpm / 5) / mins);
    if (this.wpm > this.peakWpm) this.peakWpm = this.wpm;
  }

  accuracy() {
    if (this.totalKeys === 0) return 100;
    return Math.round((this.correctKeys / this.totalKeys) * 100);
  }

  /* accuracy -> damage multiplier */
  accuracyMult() {
    const acc = this.accuracy() / 100;
    // map [0.7 .. 1.0] -> [ACC_MIN_MULT .. 1.0], clamp below
    const t = clamp((acc - 0.7) / 0.3, 0, 1);
    return lerp(CONFIG.ACC_MIN_MULT, CONFIG.ACC_FULL_DMG, t);
  }
}

const Typing = new TypingSystem();
