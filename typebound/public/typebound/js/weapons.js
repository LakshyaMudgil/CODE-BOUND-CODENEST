/* ============================================================
   TYPEBOUND — weapons.js
   Modular weapon definitions. A weapon changes gameplay by
   biasing which word-length pool is rolled, its attack speed,
   damage scaling and stamina cost. New weapons = new entry.
   ============================================================ */

class Weapon {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.wordWeights = def.wordWeights;   // { short, medium, long }
    this.dmgMult = def.dmgMult ?? 1;
    this.staminaMult = def.staminaMult ?? 1;
    this.swingSpeed = def.swingSpeed ?? 1; // affects attack animation length
    this.color = def.color ?? "#ff2fb9";
  }

  /* weighted roll of word class */
  rollWordClass() {
    const w = this.wordWeights;
    const total = w.short + w.medium + w.long;
    let r = Math.random() * total;
    if ((r -= w.short) < 0) return "short";
    if ((r -= w.medium) < 0) return "medium";
    return "long";
  }

  /* base damage for a completed word class */
  baseDamage(cls) {
    if (cls === "long") return CONFIG.DMG_HEAVY * this.dmgMult;
    if (cls === "medium") return (CONFIG.DMG_LIGHT + 3) * this.dmgMult;
    return CONFIG.DMG_LIGHT * this.dmgMult;
  }

  staminaCost(cls) {
    const base = cls === "long" ? CONFIG.COST_HEAVY : CONFIG.COST_LIGHT;
    return Math.round(base * this.staminaMult);
  }

  isHeavy(cls) { return cls === "long"; }
}

const WEAPONS = {
  rapid_blade: new Weapon({
    id: "rapid_blade",
    name: "RAPID BLADE",
    wordWeights: { short: 5, medium: 4, long: 1 },
    dmgMult: 1.0,
    staminaMult: 1.0,
    swingSpeed: 1.25,
    color: "#35e8ff",
  }),
  /* --- future weapons (architecture ready) ---
  war_hammer: new Weapon({ id:"war_hammer", name:"WAR HAMMER",
     wordWeights:{short:1,medium:3,long:5}, dmgMult:1.9, staminaMult:1.6, swingSpeed:0.7 }),
  code_bow:  new Weapon({ id:"code_bow", name:"CODE BOW",
     wordWeights:{short:2,medium:5,long:2}, dmgMult:1.2, staminaMult:0.9, swingSpeed:1.0 }),
  */
};
