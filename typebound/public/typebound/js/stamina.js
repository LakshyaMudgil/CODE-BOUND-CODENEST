/* ============================================================
   TYPEBOUND — stamina.js
   StaminaSystem: spend / regen with a short delay after actions.
   Kept separate so tuning + UI wiring stays clean.
   ============================================================ */

class StaminaSystem {
  constructor(max) {
    this.max = max;
    this.value = max;
    this.regenBlockedUntil = 0;
  }

  reset() {
    this.value = this.max;
    this.regenBlockedUntil = 0;
  }

  /* returns true if there is enough stamina (without spending) */
  has(amount) { return this.value >= amount; }

  /* spend; returns true if it succeeded */
  spend(amount) {
    if (this.value < amount) return false;
    this.value -= amount;
    this.regenBlockedUntil = now() + CONFIG.STAMINA_REGEN_DELAY;
    return true;
  }

  update(dt) {
    if (now() >= this.regenBlockedUntil && this.value < this.max) {
      this.value = clamp(this.value + CONFIG.STAMINA_REGEN * dt, 0, this.max);
    }
  }

  ratio() { return this.value / this.max; }
}
