/* ============================================================
   TYPEBOUND — config.js
   Central tuning values + game states + shared helpers.
   All balance-relevant magic numbers live here.
   ============================================================ */

/* Game state machine values */
const STATE = Object.freeze({
  MENU:        "MENU",
  BOSS_INTRO:  "BOSS_INTRO",
  PLAYING:     "PLAYING",
  RIPOSTE:     "RIPOSTE",     // brief typing-only window after a parry/stagger
  PAUSED:      "PAUSED",
  PLAYER_DEAD: "PLAYER_DEAD",
  BOSS_DEAD:   "BOSS_DEAD",
});

const CONTROL_CONFIG = Object.freeze({
  dodgeLeft: "ArrowLeft",
  dodgeRight: "ArrowRight",
  backstep: "ArrowDown",
  parry: "ShiftLeft",
  overdrive: "Space",
  pause: "Escape",
});

const CONTROL_LABELS = Object.freeze({
  dodgeLeft: "←",
  dodgeRight: "→",
  backstep: "↓",
  parry: "Shift",
  overdrive: "Space",
  pause: "Esc",
});

const CONFIG = Object.freeze({
  /* ---- player ---- */
  PLAYER_MAX_HP:        100,
  PLAYER_MAX_STAMINA:   100,
  STAMINA_REGEN:        22,     // per second when not acting
  STAMINA_REGEN_DELAY:  0.35,   // seconds after an action before regen resumes
  FOCUS_MAX:            100,

  /* stamina costs */
  COST_DODGE:           15,
  COST_PARRY:           10,
  COST_LIGHT:           8,
  COST_HEAVY:           30,
  COST_SPECIAL:         40,

  /* ---- dodge ---- */
  DODGE_DURATION:       0.42,   // seconds
  DODGE_IFRAME_START:   0.02,
  DODGE_IFRAME_END:     0.30,   // i-frames active between these times
  DODGE_COOLDOWN:       0.25,
  DODGE_DISTANCE:       120,    // px lateral

  /* ---- parry ---- */
  PARRY_WINDOW:         0.24,   // seconds the parry press is "active"
  PARRY_PERFECT:        0.14,   // within this of press => perfect (unused fine-grain, kept for tuning)
  PARRY_COOLDOWN:       0.45,
  PARRY_STAGGER_GAIN:   34,     // poise damage on perfect parry

  /* ---- damage ---- */
  DMG_LIGHT:            6,
  DMG_HEAVY:            14,
  DMG_CRIT_MULT:        2.1,
  DMG_RIPOSTE:          30,
  DMG_STAGGER_BONUS:    1.6,    // multiplier while boss staggered
  COMBO_DMG_STEP:       0.03,   // +3% dmg per combo, capped
  COMBO_DMG_CAP:        0.5,    // max +50%
  CRIT_COMBO_MIN:       6,      // combo needed to enable crits

  /* accuracy -> damage scaling */
  ACC_FULL_DMG:         1.0,    // >=100%
  ACC_MIN_MULT:         0.45,   // at very low accuracy

  /* ---- focus / overdrive ---- */
  FOCUS_PER_WORD:       9,
  FOCUS_PER_PARRY:      22,
  FOCUS_PER_CRIT:       6,
  OVERDRIVE_DURATION:   7.0,
  OVERDRIVE_DMG_MULT:   1.5,

  /* ---- combo ---- */
  COMBO_MISS_PENALTY:   0,      // combo resets to 0 on mistake/hit (0 = full reset)

  /* ---- boss stagger ---- */
  STAGGER_MAX:          100,
  STAGGER_DECAY:        6,      // per second poise recovery
  STAGGER_DURATION:     4.0,    // seconds boss is vulnerable
  STAGGER_HIT_GAIN:     4,      // poise damage per normal hit

  /* ---- fx ---- */
  SHAKE_DECAY:          14,
  HITSTOP_LIGHT:        0.05,
  HITSTOP_HEAVY:        0.12,
  HITSTOP_PARRY:        0.22,
  SLOWMO_SCALE:         0.25,   // time scale during perfect parry
  SLOWMO_DURATION:      0.45,
  MAX_PARTICLES:        420,

  /* reward */
  REWARD_FRAGMENTS:     100,
});

/* Word pools (programming-focused, CodeNest identity) */
const WORD_POOLS = Object.freeze({
  short: ["if","for","else","run","loop","code","data","class","return","try","let","var","int","null","void"],
  medium: ["function","variable","compile","execute","integer","boolean","pointer","array","debug","syntax","import","object","string","module","render"],
  long: ["authentication","implementation","architecture","configuration","asynchronous","interoperability","initialization","serialization","polymorphism","optimization"],
  riposte: ["algorithm","refactor","recursion","exception","interface","framework","abstraction"],
});

/* localStorage save schema */
const SAVE_KEY = "typebound_save_v1";
const DEFAULT_SAVE = Object.freeze({
  bossesDefeated: [],
  fragments: 0,
  bestWPM: 0,
  bestAccuracy: 0,
  unlockedWeapons: ["rapid_blade"],
  currentBoss: 2, // The Glitched Knight is boss #2 in the roster
});

/* ---- small shared helpers ---- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const now = () => performance.now() / 1000;

const Save = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
    } catch (e) {
      console.log("[v0] save load failed, using defaults", e);
      return { ...DEFAULT_SAVE };
    }
  },
  save(data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
    catch (e) { console.log("[v0] save write failed", e); }
  },
};
