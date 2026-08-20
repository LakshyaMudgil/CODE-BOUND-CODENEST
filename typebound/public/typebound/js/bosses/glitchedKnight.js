/* ============================================================
   TYPEBOUND — bosses/glitchedKnight.js
   Boss #2: THE GLITCHED KNIGHT.
   Data-driven definition consumed by the generic Boss engine.
   Uses the provided sprite art with a glitch render treatment.
   ============================================================ */

/* Each move: telegraph (warn time), active (strike window),
   recovery, damage, kind, parryOpen (fraction of telegraph the
   parry window is open at the end), stagger gain on parry. */
const GLITCH_MOVES = {
  slash: {
    name: "SLASH", kind: "light",
    telegraph: 0.85, active: 0.34, recovery: 0.6,
    damage: 12, parryOpen: 0.45,
  },
  heavy: {
    name: "HEAVY CLEAVE", kind: "heavy",
    telegraph: 1.15, active: 0.42, recovery: 0.85,
    damage: 22, parryOpen: 0.35,
  },
  thrust: {
    name: "SYNTAX THRUST", kind: "thrust",
    telegraph: 0.7, active: 0.3, recovery: 0.55,
    damage: 15, parryOpen: 0.4,
  },
  delayed: {
    name: "DELAYED STRIKE", kind: "light",
    telegraph: 1.35, active: 0.32, recovery: 0.6,
    damage: 16, parryOpen: 0.28,   // trickier: opens later
  },
};

function drawLightningBolt(ctx, x1, y1, x2, y2, bend, color, width, alpha) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 3.8;
  ctx.shadowBlur = width * 8;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < 6; i++) {
    const p = i / 6;
    const jitter = Math.sin((x1 + y1 + i * 31) * 0.07) * bend * (1 - Math.abs(p - 0.5));
    ctx.lineTo(x1 + dx * p + nx * jitter, y1 + dy * p + ny * jitter);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.shadowBlur = width * 3;
  ctx.strokeStyle = "#effcff";
  ctx.stroke();
  ctx.restore();
}

function drawProceduralKnight(ctx, boss, s, enraged) {
  const t = boss.animTime;
  const attacking = boss.state === BOSS_STATE.ATTACK;
  const telegraphing = boss.state === BOSS_STATE.TELEGRAPH;
  const staggered = boss.state === BOSS_STATE.STAGGER;
  const dead = boss.state === BOSS_STATE.DEAD;
  const pulse = 0.5 + Math.sin(t * (enraged ? 13 : 8)) * 0.5;
  const armor = enraged ? "#351d55" : "#202a48";
  const edge = enraged ? "#ff2fb9" : "#a44dff";
  const cyan = "#35e8ff";
  const bodyBob = staggered ? Math.sin(t * 34) * 5 * s : Math.sin(t * 2.4) * 3 * s;
  const armReach = attacking ? (boss.attack?.kind === "thrust" ? 118 : 88) : telegraphing ? -24 : 0;
  const weaponAngle = attacking ? -0.25 : telegraphing ? -1.25 : -0.6;
  const alpha = dead ? clamp(1 - boss.stateTime / 1.4, 0, 1) : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, bodyBob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Broken neon silhouette and floating code fragments.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.16 + pulse * 0.1;
  ctx.fillStyle = edge;
  ctx.shadowBlur = 28 * s;
  ctx.shadowColor = edge;
  ctx.beginPath(); ctx.ellipse(0, -176 * s, 124 * s, 166 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Ragged corrupted cape with animated torn edges.
  ctx.save();
  ctx.fillStyle = enraged ? "#2b1047" : "#171530";
  ctx.strokeStyle = edge; ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(54 * s, -238 * s);
  ctx.bezierCurveTo(124 * s, -226 * s, 184 * s, -170 * s, 248 * s, -110 * s);
  ctx.lineTo(198 * s, -106 * s); ctx.lineTo(232 * s, -72 * s); ctx.lineTo(168 * s, -84 * s);
  ctx.lineTo(183 * s, -30 * s); ctx.lineTo(118 * s, -68 * s); ctx.lineTo(98 * s, -8 * s);
  ctx.lineTo(62 * s, -92 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.28 + pulse * 0.16;
    ctx.strokeStyle = i % 2 ? cyan : edge;
    ctx.beginPath(); ctx.moveTo((70 + i * 18) * s, (-218 + i * 25) * s); ctx.lineTo((180 + i * 12) * s, (-128 + i * 14) * s); ctx.stroke();
  }
  ctx.restore();

  // Cloak and torso.
  ctx.fillStyle = "#11172b";
  ctx.strokeStyle = edge;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(-68 * s, -244 * s); ctx.lineTo(64 * s, -244 * s);
  ctx.lineTo(108 * s, -18 * s); ctx.lineTo(-122 * s, -18 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = armor;
  ctx.beginPath(); ctx.moveTo(-50 * s, -230 * s); ctx.lineTo(48 * s, -230 * s); ctx.lineTo(72 * s, -42 * s); ctx.lineTo(-72 * s, -42 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#6171a2"; ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo(-42 * s, -205 * s); ctx.lineTo(41 * s, -205 * s); ctx.moveTo(-48 * s, -120 * s); ctx.lineTo(50 * s, -120 * s); ctx.stroke();

  // Helmet with a split visor.
  ctx.fillStyle = "#151b32"; ctx.strokeStyle = cyan; ctx.lineWidth = 5 * s;
  ctx.beginPath(); ctx.moveTo(-72 * s, -258 * s); ctx.lineTo(-47 * s, -318 * s); ctx.lineTo(48 * s, -318 * s); ctx.lineTo(75 * s, -258 * s); ctx.lineTo(48 * s, -222 * s); ctx.lineTo(-48 * s, -222 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#05070f"; ctx.strokeStyle = edge; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.moveTo(-48 * s, -278 * s); ctx.lineTo(51 * s, -278 * s); ctx.lineTo(42 * s, -245 * s); ctx.lineTo(-43 * s, -245 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = cyan; ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo(-5 * s, -278 * s); ctx.lineTo(-5 * s, -245 * s); ctx.stroke();
  ctx.fillStyle = cyan; ctx.shadowBlur = 16 * s; ctx.shadowColor = cyan;
  ctx.fillRect(-32 * s, -264 * s, 16 * s, 5 * s); ctx.fillRect(17 * s, -264 * s, 16 * s, 5 * s);

  // Crown spikes and a sharp V-shaped energy face, matching the reference silhouette.
  ctx.fillStyle = edge; ctx.strokeStyle = cyan; ctx.lineWidth = 3 * s;
  for (let i = 0; i < 7; i++) {
    const x = (-66 + i * 22) * s;
    const h = (28 + (i % 3) * 18 + pulse * 9) * s;
    ctx.beginPath(); ctx.moveTo(x, -310 * s); ctx.lineTo(x + 10 * s, -310 * s - h); ctx.lineTo(x + 18 * s, -310 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = enraged ? "#ff2fb9" : "#a44dff";
  ctx.shadowBlur = 22 * s; ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath(); ctx.moveTo(-27 * s, -270 * s); ctx.lineTo(0, -246 * s); ctx.lineTo(28 * s, -270 * s); ctx.lineTo(12 * s, -238 * s); ctx.lineTo(0, -226 * s); ctx.lineTo(-12 * s, -238 * s); ctx.closePath(); ctx.fill();

  // Bright corrupted core.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = enraged ? "#ff2fb9" : cyan;
  ctx.shadowBlur = 30 * s; ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath(); ctx.moveTo(0, -194 * s); ctx.lineTo(30 * s, -168 * s); ctx.lineTo(0, -132 * s); ctx.lineTo(-30 * s, -168 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f5fdff"; ctx.beginPath(); ctx.arc(0, -169 * s, (7 + pulse * 5) * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Legs, boots, and asymmetric shoulder guards.
  ctx.shadowBlur = 0; ctx.fillStyle = "#0b1020"; ctx.strokeStyle = edge; ctx.lineWidth = 5 * s;
  ctx.beginPath(); ctx.moveTo(-56 * s, -40 * s); ctx.lineTo(-12 * s, -40 * s); ctx.lineTo(-18 * s, 36 * s); ctx.lineTo(-72 * s, 36 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10 * s, -40 * s); ctx.lineTo(59 * s, -40 * s); ctx.lineTo(80 * s, 36 * s); ctx.lineTo(25 * s, 36 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = edge; ctx.fillRect(-80 * s, 32 * s, 67 * s, 10 * s); ctx.fillRect(21 * s, 32 * s, 70 * s, 10 * s);
  ctx.fillStyle = armor; ctx.strokeStyle = cyan;
  ctx.beginPath(); ctx.arc(-68 * s, -214 * s, 30 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(66 * s, -208 * s, 25 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Sword arm and a readable wind-up/strike pose.
  ctx.save(); ctx.translate(46 * s, -202 * s); ctx.rotate(weaponAngle);
  ctx.strokeStyle = "#8794c2"; ctx.lineWidth = 14 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(armReach * s, 0); ctx.stroke();
  ctx.strokeStyle = cyan; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(armReach * s, 0); ctx.lineTo((armReach + 126) * s, 0); ctx.stroke();
  ctx.fillStyle = "#eafaff"; ctx.strokeStyle = edge; ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo((armReach + 116) * s, -12 * s); ctx.lineTo((armReach + 178) * s, 0); ctx.lineTo((armReach + 116) * s, 12 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  // Lightning arcs surge through the armor during wind-up and explode from the blade on impact.
  if (telegraphing || attacking || staggered) {
    const attackPulse = attacking ? 1 : telegraphing ? 0.45 + pulse * 0.45 : 0.3;
    const lightningColor = boss.parryWindowOpen ? "#35e8ff" : (enraged ? "#ff2fb9" : "#a44dff");
    const flash = attacking ? 1 : 0.65;
    const boltCount = attacking ? 5 : 3;
    for (let i = 0; i < boltCount; i++) {
      const phase = t * (7 + i * 0.8) + i * 2.2;
      const startX = (-62 + Math.sin(phase) * 42) * s;
      const startY = (-286 + (i % 3) * 84) * s;
      const endX = attacking ? (-245 - i * 35) * s : (-120 + Math.cos(phase) * 74) * s;
      const endY = attacking ? (-170 + Math.sin(phase) * 125) * s : (-70 + Math.sin(phase * 1.3) * 180) * s;
      drawLightningBolt(ctx, startX, startY, endX, endY, (18 + i * 5) * s, lightningColor, (1.4 + flash * 1.5) * s, attackPulse * (0.42 + i * 0.08));
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = attackPulse * (attacking ? 0.55 : 0.22);
    ctx.fillStyle = lightningColor;
    ctx.shadowBlur = 42 * s;
    ctx.shadowColor = lightningColor;
    ctx.beginPath();
    ctx.arc(attacking ? -178 * s : -86 * s, -160 * s, (attacking ? 30 : 18) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Glitch fragments: RGB-separated armor slices, scanlines, and drifting code debris.
  const glitchStrength = enraged ? 1 : (attacking ? 0.82 : telegraphing ? 0.5 : 0.22);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const channelColors = ["#ff2fb9", "#35e8ff", "#a44dff"];
  for (let i = 0; i < (enraged ? 18 : 10); i++) {
    const phase = t * (3.5 + i * 0.17) + i * 1.9;
    const fy = (-300 + ((phase * 57 + i * 43) % 340)) * s;
    const width = (18 + ((i * 17) % 80)) * s;
    const drift = (Math.sin(phase * 2.3) * (12 + glitchStrength * 24)) * s;
    ctx.globalAlpha = (0.12 + (i % 4) * 0.08) * glitchStrength;
    ctx.fillStyle = channelColors[i % channelColors.length];
    ctx.fillRect((-width / 2 + drift), fy, width, (2 + i % 3) * s);
    if (i % 3 === 0) ctx.fillRect((-width / 2 + drift) + width * 0.55, fy - 9 * s, 12 * s, 7 * s);
  }
  // Cyan/magenta offset echoes create the chromatic aberration from the reference image.
  ctx.globalAlpha = 0.16 * glitchStrength;
  ctx.strokeStyle = "#ff2fb9"; ctx.lineWidth = 4 * s;
  ctx.strokeRect(-92 * s + Math.sin(t * 19) * 5 * s, -310 * s, 184 * s, 342 * s);
  ctx.strokeStyle = "#35e8ff";
  ctx.strokeRect(-88 * s - Math.cos(t * 17) * 5 * s, -306 * s, 176 * s, 334 * s);
  ctx.restore();
  ctx.restore();
}

const GLITCHED_KNIGHT_DEF = {
  id: "glitched_knight",
  name: "THE GLITCHED KNIGHT",
  tier: "TIER II · THE CORRUPTED CODEX",
  tagline: "// SYNTAX IS LAW. ERRORS ARE DEATH. //",
  maxHp: 340,
  // Rendered procedurally in draw(); no boss sprite asset required.
  arenaName: "THE CORRUPTED CODEX",
  words: ["if", "else", "loop", "return"],
  accent: "#a44dff",
  skyTop: "#1a0d33",
  skyBottom: "#05030a",
  staggerTakenMult: 1.0,

  moves: GLITCH_MOVES,

  phases: [
    { // PHASE I — teaching
      hpThreshold: 1.0,
      attacks: ["slash", "heavy", "thrust"],
      gapMin: 1.6, gapMax: 2.6,
      cooldownMult: 1.0,
    },
    { // PHASE II @ 60% — faster + combos
      hpThreshold: 0.6,
      attacks: ["slash", "heavy", "thrust", { combo: ["slash", "slash"] }, "delayed"],
      gapMin: 1.1, gapMax: 1.9,
      cooldownMult: 0.85,
    },
    { // PHASE III @ 25% — enraged
      hpThreshold: 0.25,
      attacks: ["slash", "heavy", "delayed", { combo: ["slash", "slash", "thrust"] }, { combo: ["heavy", "thrust"] }],
      gapMin: 0.8, gapMax: 1.4,
      cooldownMult: 0.7,
    },
  ],

  /* ---------------- custom render ---------------- */
  draw(ctx, boss) {
    const s = boss.scale;
    const enraged = boss.phase === 3;
    const t = boss.animTime;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    // ground shadow
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 6 * s, 120 * s, 26 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // idle bob + telegraph lunge offset
    let bob = Math.sin(t * 1.8) * 5 * s;
    let lungeX = 0;
    if (boss.state === BOSS_STATE.TELEGRAPH) {
      const p = boss.stateTime / boss.attack.telegraph;
      lungeX = -Math.sin(p * Math.PI) * 14 * s; // wind up backward
      bob -= 4 * s;
    } else if (boss.state === BOSS_STATE.ATTACK) {
      const p = boss.stateTime / boss.attack.active;
      lungeX = Math.sin(p * Math.PI) * 60 * s;   // lunge toward player (left)
    } else if (boss.state === BOSS_STATE.STAGGER) {
      bob = Math.sin(t * 20) * 3 * s;            // shaking
    }

    ctx.translate(lungeX, bob);

    // Readable combat telegraph: the knight clearly winds up, then commits
    // to a colored strike lane so the player can react before the hit frame.
    if (boss.attack && (boss.state === BOSS_STATE.TELEGRAPH || boss.state === BOSS_STATE.ATTACK)) {
      const a = boss.attack;
      const progress = boss.state === BOSS_STATE.TELEGRAPH
        ? clamp(boss.stateTime / a.telegraph, 0, 1)
        : clamp(boss.stateTime / a.active, 0, 1);
      const isHeavy = a.kind === "heavy";
      const isThrust = a.kind === "thrust";
      const warning = boss.state === BOSS_STATE.TELEGRAPH;
      const color = boss.parryWindowOpen ? "#35e8ff" : (isHeavy ? "#ff3b6b" : "#ffcf5c");
      const reach = (isThrust ? 270 : isHeavy ? 235 : 205) * s;
      const baseY = -112 * s;

      ctx.save();
      ctx.globalAlpha = warning ? 0.22 + progress * 0.35 : 0.7;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = (warning ? 3 : 6) * s;
      ctx.shadowBlur = warning ? 12 : 24;
      ctx.shadowColor = color;
      ctx.setLineDash(warning ? [10 * s, 8 * s] : []);
      ctx.beginPath();
      ctx.moveTo(-42 * s, baseY);
      ctx.lineTo(-reach * (warning ? 0.72 + progress * 0.28 : 1), baseY - (isThrust ? 12 : 34) * s);
      ctx.stroke();
      ctx.setLineDash([]);

      // Expanding danger wedge makes the attack direction legible even over the sprite.
      ctx.globalAlpha = warning ? 0.05 + progress * 0.1 : 0.16;
      ctx.beginPath();
      ctx.moveTo(-35 * s, baseY - 28 * s);
      ctx.lineTo(-reach, baseY - (isThrust ? 30 : 94) * s);
      ctx.lineTo(-reach, baseY + (isThrust ? 6 : 14) * s);
      ctx.closePath();
      ctx.fill();

      // Parry-ready pulse and a compact timing meter.
      ctx.globalAlpha = 0.95;
      ctx.font = `700 ${11 * s}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(boss.parryWindowOpen ? "PARRY NOW" : a.name, -120 * s, -300 * s);
      ctx.globalAlpha = 0.75;
      ctx.fillRect(-92 * s, -284 * s, 184 * s * progress, 4 * s);
      ctx.globalAlpha = 0.2;
      ctx.fillRect(-92 * s, -284 * s, 184 * s, 4 * s);
      ctx.restore();
    }

    const drawH = 360 * s;
    const drawW = 360 * s;

    // aura glow behind
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const auraColor = enraged ? "rgba(255,47,185,0.30)" : "rgba(164,77,255,0.22)";
    const g = ctx.createRadialGradient(0, -drawH * 0.45, 0, 0, -drawH * 0.45, drawW * 0.7);
    g.addColorStop(0, auraColor);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -drawH * 0.45, drawW * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // The knight is a live canvas model: armor, visor, sword, lightning fragments,
    // and attack pose are generated every frame instead of using a PNG.
    drawProceduralKnight(ctx, boss, s, enraged);

    if (false && boss.imageReady) {
      // telegraph tint ring
      if (boss.state === BOSS_STATE.TELEGRAPH) {
        const p = boss.stateTime / boss.attack.telegraph;
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(p * Math.PI * 6);
        ctx.strokeStyle = boss.parryWindowOpen ? "#35e8ff" : "#ff2fb9";
        ctx.lineWidth = 4 * s;
        ctx.shadowBlur = 20; ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(0, -drawH * 0.42, drawW * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // glitch slices: draw base then a couple of offset RGB-split copies
      const flash = boss.hurtFlash > 0;
      const glitchAmt = enraged ? 6 : (boss.state === BOSS_STATE.ATTACK ? 8 : 2);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.28;
      ctx.drawImage(boss.imgEl, -drawW / 2 - glitchAmt * s, -drawH, drawW, drawH);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(boss.imgEl, -drawW / 2 + glitchAmt * s, -drawH, drawW, drawH);
      ctx.restore();

      ctx.save();
      if (flash) ctx.filter = "brightness(2.2) saturate(0.4)";
      else if (boss.staggered) ctx.filter = "brightness(0.7) saturate(0.5) hue-rotate(20deg)";
      ctx.globalAlpha = boss.state === BOSS_STATE.DEAD ? clamp(1 - boss.stateTime / 1.4, 0, 1) : 1;
      ctx.drawImage(boss.imgEl, -drawW / 2, -drawH, drawW, drawH);
      ctx.restore();

      // Draw the final strike cue over the sprite so it cannot disappear behind the PNG.
      if (boss.attack && (boss.state === BOSS_STATE.TELEGRAPH || boss.state === BOSS_STATE.ATTACK)) {
        const a = boss.attack;
        const progress = boss.state === BOSS_STATE.TELEGRAPH
          ? clamp(boss.stateTime / a.telegraph, 0, 1)
          : clamp(boss.stateTime / a.active, 0, 1);
        const warning = boss.state === BOSS_STATE.TELEGRAPH;
        const color = boss.parryWindowOpen ? "#35e8ff" : (a.kind === "heavy" ? "#ff3b6b" : "#ffcf5c");
        const reach = (a.kind === "thrust" ? 280 : a.kind === "heavy" ? 245 : 220) * s;
        ctx.save();
        ctx.globalAlpha = warning ? 0.72 : 0.95;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = (warning ? 3 : 7) * s;
        ctx.shadowBlur = warning ? 14 : 30;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(-34 * s, -128 * s);
        ctx.lineTo(-reach, -156 * s);
        ctx.stroke();
        if (!warning) {
          ctx.beginPath();
          ctx.moveTo(-reach, -156 * s);
          ctx.lineTo(-reach + 22 * s, -170 * s);
          ctx.lineTo(-reach + 17 * s, -145 * s);
          ctx.closePath();
          ctx.fill();
        }
        ctx.font = `700 ${12 * s}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(boss.parryWindowOpen ? "PARRY WINDOW" : `${a.name}  ${Math.ceil((1 - progress) * 100)}%`, -120 * s, -310 * s);
        ctx.globalAlpha = 0.28;
        ctx.fillRect(-104 * s, -294 * s, 208 * s, 5 * s);
        ctx.globalAlpha = 0.95;
        ctx.fillRect(-104 * s, -294 * s, 208 * s * progress, 5 * s);
        ctx.restore();
      }

      // random horizontal glitch bands in phase 3
      if (enraged && Math.random() < 0.25) {
        const by = -drawH + Math.random() * drawH;
        const bh = rand(4, 16) * s;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.6;
        const off = rand(-14, 14) * s;
        ctx.drawImage(boss.imgEl,
          0, (by + drawH) / drawH * boss.imgEl.height * 0, boss.imgEl.width, 1, // ignored; simple slice below
          -drawW / 2 + off, by, drawW, bh);
        ctx.restore();
      }
    }

    ctx.restore();
  },
};

// Register in a global roster so the engine can load any boss by id.
window.BOSSES = window.BOSSES || {};
window.BOSSES.glitched_knight = GLITCHED_KNIGHT_DEF;
