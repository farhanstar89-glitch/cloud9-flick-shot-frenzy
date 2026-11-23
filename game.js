/* ============================================================================
 * Cloud9 Flick Shot Frenzy — Category 3 (Event Mini Game)
 * Cloud9 x JetBrains: Sky's The Limit Hackathon 2026
 *
 * A mouse-only flick-shot arcade game. One input, one verb: click targets —
 * plus Track mode, where you hold your cursor on a mover until the ring fills.
 * Four modes share one engine. 60-second booth rounds (90s classic option).
 * Local Top 10 leaderboard. No external assets, no network calls, no build
 * step — open index.html and play.
 * All art is drawn with canvas vector shapes (original work, no Riot assets).
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Configuration                                                       */
  /* ------------------------------------------------------------------ */

  var LOGICAL_W = 960;
  var LOGICAL_H = 600;
  var ROUND_MS = 90000; // classic round length
  var BOOTH_MS = 60000; // booth default — the field's near-standard for throughput
  var COUNTDOWN_MS = 2400; // 3-2-1-GO
  var SCORE_IDLE_RESET_MS = 15000; // booth: score screen -> attract screen
  var MENU_ATTRACT_MS = 30000; // booth: menu -> attract overlay
  var TRACK_CAPTURE_MS = 900; // hold-to-track time to capture one mover

  // Cloud9 palette (brand blue / white / dark navy). All original.
  var COLORS = {
    bg: '#0a1424',
    bgGlow: '#0e2242',
    arenaLine: 'rgba(0, 144, 255, 0.10)',
    c9blue: '#0090ff',
    c9light: '#5cb8ff',
    white: '#ffffff',
    gold: '#ffc93c',
    goldDark: '#e8a100',
    decoy: '#3a4356',
    decoyEdge: '#232a3a',
    text: '#eaf3ff',
    muted: '#8fa8c8'
  };

  // Per-mode tuning. These numbers are the result of scripted bot playtests
  // (see tests/bot_playtest.py + docs/PLAYTEST-REPORT.md).
  var MODES = {
    precision: {
      label: 'Precision',
      tagline: 'Big targets, slow drift. Pure accuracy wins.',
      spawnMs: 900, spawnMsEnd: 760,
      lifetimeMs: 1400, lifetimeMsEnd: 1250,
      radiusMin: 30, radiusMax: 46,
      driftMin: 20, driftMax: 45,
      shrinkTo: 0.45,
      maxTargets: 3,
      decoyChance: 0,
      baseScore: 100, centerBonusMax: 100,
      par: 60000
    },
    reflex: {
      label: 'Reflex',
      tagline: 'Blink and it is gone. How fast are your flicks?',
      spawnMs: 650, spawnMsEnd: 500,
      lifetimeMs: 950, lifetimeMsEnd: 850,
      radiusMin: 30, radiusMax: 46,
      driftMin: 0, driftMax: 0,
      shrinkTo: 0.9,
      maxTargets: 2,
      decoyChance: 0,
      baseScore: 100, speedBonusMax: 50,
      par: 55000
    },
    chaos: {
      label: 'Chaos',
      tagline: 'Many targets, fast drift. Never click the dark ones.',
      spawnMs: 520, spawnMsEnd: 400,
      lifetimeMs: 1800, lifetimeMsEnd: 1500,
      radiusMin: 28, radiusMax: 48,
      driftMin: 25, driftMax: 60,
      shrinkTo: 0.5,
      maxTargets: 6,
      decoyChance: 0.15,
      baseScore: 100, centerBonusMax: 0,
      par: 60000
    },
    track: {
      label: 'Track',
      tagline: 'One mover, no mercy. Hold your cursor on it till the ring fills.',
      spawnMs: 600, spawnMsEnd: 500,
      lifetimeMs: 120000, lifetimeMsEnd: 120000, // never expires mid-round
      radiusMin: 40, radiusMax: 40,
      driftMin: 70, driftMax: 120, // steering speed px/s — the skill is following
      shrinkTo: 1,
      maxTargets: 1,
      decoyChance: 0,
      baseScore: 150, centerBonusMax: 0,
      captureMs: 900, // hold time to capture one mover
      track: true,
      par: 30000 // S threshold at 90s (perfect bot 50,654 / fast 42,404 / average 28,110); scaled by round length in rankFor
    }
  };

  var GOLDEN_SCORE = 500;
  var FRENZY_MS = 8000;
  var DECOY_PENALTY = 50;
  var COMBO_STEP = 0.25; // +25% per consecutive hit
  var COMBO_CAP = 16; // multiplier caps at x5

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  var canvas, ctx, hud, screens;
  var settings = { muted: false, lastMode: 'precision', durationMs: BOOTH_MS };
  var state = 'menu'; // menu | countdown | playing | paused | score
  var mode = 'precision';
  var targets = [];
  var particles = [];
  var floaters = []; // floating "+250" texts
  var ambient = []; // attract-mode demo targets
  var score = 0, hits = 0, shots = 0, combo = 0, bestCombo = 0;
  var spawned = 0;
  var reactionSum = 0, reactionCount = 0;
  var roundStartAt = 0, roundEndAt = 0, countdownStartAt = 0;
  var roundDurationMs = BOOTH_MS, goldenAt = 0, goldenHit = 0;
  var lastSpawnAt = 0, frenzyUntil = 0, goldenSpawned = 0;
  var rafId = 0, lastFrameAt = 0;
  var lastActivityAt = Date.now();
  var attractOn = false;
  var roundResult = null;
  var pauseStartedAt = 0; // performance.now() when the current pause began
  var countdownHiddenAt = 0; // performance.now() when hidden mid-countdown
  var scoreSaved = false; // guard: one save per round, Enter included
  var audioCtx = null;
  // Track mode: hold-to-track state
  var tracking = null; // { id } while the mouse button is held on the mover
  var mousePos = { x: LOGICAL_W / 2, y: LOGICAL_H / 2 };
  var trackTimeMs = 0; // total ms the cursor actually stayed on the mover

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function $(id) { return document.getElementById(id); }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function comboMultiplier() {
    return 1 + COMBO_STEP * Math.min(combo, COMBO_CAP);
  }

  function frenzyActive(now) { return now < frenzyUntil; }

  function progress01(now) {
    return clamp((now - roundStartAt) / roundDurationMs, 0, 1);
  }

  function modeConfig() { return MODES[mode]; }

  function fmtTime(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return s + 's';
  }

  function fmtClock(ms) {
    // Ceil so a fresh 60s round reads 1:00 (not 0:59) and the final second
    // reads 0:01 (not 0:00) — a countdown should never show time it has.
    var total = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  }

  /* ------------------------------------------------------------------ */
  /* Audio — synthesized with WebAudio, no audio files                   */
  /* ------------------------------------------------------------------ */

  function ensureAudio() {
    if (!audioCtx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
      } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      var rp = audioCtx.resume();
      if (rp && rp.catch) rp.catch(function () { /* autoplay policy */ });
    }
    return audioCtx;
  }

  function beep(freq, dur, type, vol, when) {
    if (settings.muted) return;
    var ac = ensureAudio();
    if (!ac) return;
    try {
      var t = ac.currentTime + (when || 0);
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* audio is best-effort */ }
  }

  var SFX = {
    hit: function () { beep(660 + Math.min(combo, 16) * 28, 0.09, 'sine', 0.14); },
    miss: function () { beep(150, 0.12, 'triangle', 0.08); },
    golden: function () {
      beep(523, 0.1, 'sine', 0.14, 0);
      beep(659, 0.1, 'sine', 0.14, 0.08);
      beep(784, 0.16, 'sine', 0.16, 0.16);
    },
    decoy: function () { beep(220, 0.18, 'sawtooth', 0.07); beep(110, 0.22, 'sawtooth', 0.07, 0.05); },
    count: function () { beep(440, 0.1, 'sine', 0.12); },
    go: function () { beep(880, 0.22, 'sine', 0.16); },
    over: function () {
      beep(392, 0.14, 'sine', 0.13, 0);
      beep(523, 0.14, 'sine', 0.13, 0.13);
      beep(659, 0.3, 'sine', 0.15, 0.26);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Targets                                                             */
  /* ------------------------------------------------------------------ */

  function spawnTarget(now) {
    var cfg = modeConfig();
    var p = progress01(now);
    // Exactly one golden target per round, at a random moment between 20%
    // and 80% of the round. Every player gets one jackpot chance — skill
    // decides whether they cash it in. (No random golden lottery.)
    var isGolden = (goldenSpawned === 0 && now >= goldenAt);
    var isDecoy = !isGolden && Math.random() < cfg.decoyChance;
    var radius = isGolden ? 30 : rand(cfg.radiusMin, cfg.radiusMax);
    var margin = radius + 8;
    var x = rand(margin, LOGICAL_W - margin);
    var y = rand(margin + 40, LOGICAL_H - margin); // keep clear of HUD strip
    var angle = rand(0, Math.PI * 2);
    var speed = rand(cfg.driftMin, cfg.driftMax);
    var life = (cfg.lifetimeMs + (cfg.lifetimeMsEnd - cfg.lifetimeMs) * p);
    if (frenzyActive(now)) life *= 0.9;
    var t = {
      id: Math.random().toString(36).slice(2, 8),
      x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r0: radius, r: radius,
      bornAt: now, lifeMs: life,
      golden: isGolden, decoy: isDecoy,
      shrinkTo: cfg.shrinkTo,
      pulse: rand(0, Math.PI * 2)
    };
    if (cfg.track) {
      // Track mode: one mover that steers, never expires, and is captured
      // by holding the cursor on it — not by clicking it.
      t.track = true;
      t.captureMs = cfg.captureMs || TRACK_CAPTURE_MS;
      t.trackProgress = 0;
      t.steerAt = now + rand(1000, 1800);
      // smooth steering: velocity eases toward the target heading instead
      // of snapping, so the mover's path stays followable by eye.
      t.tvx = t.vx; t.tvy = t.vy;
    }
    targets.push(t);
    if (isGolden) goldenSpawned++;
    spawned++;
  }

  function updateTargets(now, dt) {
    var cfg = modeConfig();
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      var age = now - t.bornAt;
      var lifeFrac = age / t.lifeMs;
      if (lifeFrac >= 1) { targets.splice(i, 1); if (tracking && tracking.id === t.id) tracking = null; continue; } // expired = no penalty
      if (t.track) {
        // steering: pick a new heading every ~1-1.8s; velocity eases toward
        // it over ~300ms so turns are smooth and followable, not snaps.
        if (now >= t.steerAt) {
          var a = rand(0, Math.PI * 2);
          var sp = rand(cfg.driftMin, cfg.driftMax);
          t.tvx = Math.cos(a) * sp; t.tvy = Math.sin(a) * sp;
          t.steerAt = now + rand(1000, 1800);
        }
        var k = Math.min(1, dt / 300);
        t.vx += (t.tvx - t.vx) * k;
        t.vy += (t.tvy - t.vy) * k;
        // hold-to-track progress: fills while the button is held AND the
        // cursor is on the mover (with a small grace ring — tracking aim
        // trainers forgive a few pixels). Drains at half the fill rate,
        // so a brief slip costs time but does not wipe the attempt.
        if (tracking && tracking.id === t.id) {
          var d = Math.hypot(mousePos.x - t.x, mousePos.y - t.y);
          if (d <= t.r + 10) {
            t.trackProgress += dt / t.captureMs;
            trackTimeMs += dt;
            if (t.trackProgress >= 1) {
              captureTrack(t, now);
              targets.splice(i, 1);
              tracking = null;
              updateHud(now);
              continue;
            }
          } else {
            t.trackProgress = Math.max(0, t.trackProgress - dt / (t.captureMs * 2));
          }
        } else {
          t.trackProgress = Math.max(0, t.trackProgress - dt / (t.captureMs * 2));
        }
      }
      t.x += t.vx * dt / 1000;
      t.y += t.vy * dt / 1000;
      // bounce off arena walls (track targets flip their target heading too,
      // or the steering lerp would pull them straight back into the wall)
      if (t.x < t.r0 + 4) { t.x = t.r0 + 4; t.vx = Math.abs(t.vx); if (t.track) t.tvx = Math.abs(t.tvx); }
      if (t.x > LOGICAL_W - t.r0 - 4) { t.x = LOGICAL_W - t.r0 - 4; t.vx = -Math.abs(t.vx); if (t.track) t.tvx = -Math.abs(t.tvx); }
      if (t.y < t.r0 + 44) { t.y = t.r0 + 44; t.vy = Math.abs(t.vy); if (t.track) t.tvy = Math.abs(t.tvy); }
      if (t.y > LOGICAL_H - t.r0 - 4) { t.y = LOGICAL_H - t.r0 - 4; t.vy = -Math.abs(t.vy); if (t.track) t.tvy = -Math.abs(t.tvy); }
      // shrink over lifetime
      var shrink = 1 - (1 - cfg.shrinkTo) * lifeFrac;
      t.r = t.r0 * shrink;
      t.pulse += dt / 100;
    }
    // spawn cadence, ramps with round progress; frenzy spawns faster.
    // The golden target bypasses the max-targets cap: in Track (maxTargets
    // 1, 120s lifetime) an uncaptured mover would otherwise block the one
    // promised jackpot chance for the whole round. And when the golden is
    // the only live Track target, normal spawns continue so the round
    // never stalls waiting for the player to take it.
    var goldenDue = goldenSpawned === 0 && now >= goldenAt;
    var onlyGoldenAlive = cfg.track && targets.length === 1 && targets[0].golden;
    var interval = cfg.spawnMs + (cfg.spawnMsEnd - cfg.spawnMs) * progress01(now);
    if (frenzyActive(now)) interval *= 0.66;
    if ((targets.length < cfg.maxTargets || goldenDue || onlyGoldenAlive) && now - lastSpawnAt >= interval) {
      spawnTarget(now);
      lastSpawnAt = now;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scoring                                                             */
  /* ------------------------------------------------------------------ */

  function registerHit(t, now, px, py) {
    var cfg = modeConfig();
    var dist = Math.hypot(px - t.x, py - t.y);
    var centerFrac = clamp(1 - dist / Math.max(t.r, 1), 0, 1);
    var reaction = now - t.bornAt;
    reactionSum += reaction; reactionCount++;

    var base;
    if (t.golden) {
      base = GOLDEN_SCORE;
    } else if (mode === 'reflex') {
      var speedFrac = clamp(1 - reaction / t.lifeMs, 0, 1);
      base = cfg.baseScore + Math.round(cfg.speedBonusMax * speedFrac);
    } else {
      base = cfg.baseScore + Math.round((cfg.centerBonusMax || 0) * centerFrac);
    }
    var mult = comboMultiplier() * (frenzyActive(now) ? 2 : 1);
    var gained = Math.round(base * mult);
    score += gained;
    hits++;
    combo++;
    if (combo > bestCombo) bestCombo = combo;
    if (t.golden) {
      goldenHit++;
      frenzyUntil = now + FRENZY_MS;
      SFX.golden();
      burst(t.x, t.y, COLORS.gold, 26);
      floaters.push({ x: t.x, y: t.y - 10, text: 'GOLDEN +' + gained + ' — FRENZY!', color: COLORS.gold, bornAt: now, life: 1400 });
    } else {
      SFX.hit();
      burst(t.x, t.y, t.golden ? COLORS.gold : COLORS.c9light, 12);
      floaters.push({ x: t.x, y: t.y - 10, text: '+' + gained, color: '#ffffff', bornAt: now, life: 900 });
    }
  }

  function captureTrack(t, now) {
    // Track mode: holding the cursor on the mover for captureMs captures it.
    // Scoring mirrors a hit: base points x combo multiplier (x2 in FRENZY).
    var base = t.golden ? GOLDEN_SCORE : modeConfig().baseScore;
    var mult = comboMultiplier() * (frenzyActive(now) ? 2 : 1);
    var gained = Math.round(base * mult);
    score += gained;
    hits++;
    combo++;
    if (combo > bestCombo) bestCombo = combo;
    if (t.golden) {
      goldenHit++;
      frenzyUntil = now + FRENZY_MS;
      SFX.golden();
      burst(t.x, t.y, COLORS.gold, 26);
      floaters.push({ x: t.x, y: t.y - 10, text: 'GOLDEN +' + gained + ' — FRENZY!', color: COLORS.gold, bornAt: now, life: 1400 });
    } else {
      SFX.hit();
      burst(t.x, t.y, COLORS.c9light, 12);
      floaters.push({ x: t.x, y: t.y - 10, text: '+' + gained, color: '#ffffff', bornAt: now, life: 900 });
    }
  }

  function registerMiss(now) {
    combo = 0;
    SFX.miss();
  }

  function registerDecoy(t, now) {
    combo = 0;
    var deducted = Math.min(DECOY_PENALTY, score);
    score = Math.max(0, score - DECOY_PENALTY);
    SFX.decoy();
    burst(t.x, t.y, '#ff5d5d', 14);
    floaters.push({ x: t.x, y: t.y - 10, text: '-' + deducted + ' DECOY!', color: '#ff7b7b', bornAt: now, life: 1100 });
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2);
      var sp = rand(40, 220);
      particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rand(2, 5), color: color, bornAt: performance.now(), life: rand(300, 700)
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */

  function canvasPos(ev) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) / rect.width * LOGICAL_W,
      y: (ev.clientY - rect.top) / rect.height * LOGICAL_H
    };
  }

  // Hit-test radius mirrors the rendered disc, which pulses between 94%
  // and 106% of t.r (drawTarget). Decoys do not pulse; they use t.r.
  function hitRadius(t) {
    return t.decoy ? t.r : t.r * (1 + Math.sin(t.pulse) * 0.06);
  }

  function onPointerDown(ev) {
    // Only the primary button shoots / starts a hold. A right-button press
    // must never count as a shot (the context menu is suppressed below).
    if (ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault();
    pokeActivity();
    ensureAudio();
    if (state !== 'playing') return;
    var now = performance.now();
    // Ignore input that lands after the round already ended but before the
    // next animation frame processes the end (no post-deadline points).
    if (now >= roundEndAt) return;
    var p = canvasPos(ev);
    mousePos = p;
    if (mode === 'track') {
      // Track mode: pressing on the mover starts a hold. The capture itself
      // happens in updateTargets once the ring fills — this press is the
      // "attempt" (a shot) and its reaction time is measured here, once per
      // target: re-acquiring the same mover after a release must not
      // re-record (and inflate) the reaction to it.
      for (var i = targets.length - 1; i >= 0; i--) {
        var t = targets[i];
        if (now - t.bornAt < 90) continue; // still fading in — not clickable yet
        var d = Math.hypot(p.x - t.x, p.y - t.y);
        if (d <= hitRadius(t)) {
          shots++;
          if (t.decoy) {
            targets.splice(i, 1);
            registerDecoy(t, now);
          } else {
            if (!tracking) {
              if (!t.reacted) { reactionSum += now - t.bornAt; reactionCount++; t.reacted = true; }
              tracking = { id: t.id };
            }
          }
          updateHud(now);
          return;
        }
      }
      shots++;
      registerMiss(now);
      updateHud(now);
      return;
    }
    shots++;
    // topmost target first (last spawned = on top)
    for (var j = targets.length - 1; j >= 0; j--) {
      var t2 = targets[j];
      if (now - t2.bornAt < 90) continue; // still fading in — not clickable yet
      var d2 = Math.hypot(p.x - t2.x, p.y - t2.y);
      if (d2 <= hitRadius(t2)) {
        targets.splice(j, 1);
        if (t2.decoy) registerDecoy(t2, now);
        else registerHit(t2, now, p.x, p.y);
        updateHud(now);
        return;
      }
    }
    registerMiss(now);
    updateHud(now);
  }

  // Ending a hold without a capture is a failed attempt: it breaks the
  // consecutive-hit combo, like an empty-space miss. (A pause clears the
  // hold separately in togglePause without breaking the combo — pausing
  // is not an attempt outcome. Target expiry also leaves combo alone.)
  function endTracking(breakCombo) { if (tracking && breakCombo) combo = 0; tracking = null; }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function drawBackground(now) {
    var g = ctx.createRadialGradient(LOGICAL_W / 2, LOGICAL_H / 2, 80, LOGICAL_W / 2, LOGICAL_H / 2, 700);
    g.addColorStop(0, COLORS.bgGlow);
    g.addColorStop(1, COLORS.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    // arena grid
    ctx.strokeStyle = COLORS.arenaLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= LOGICAL_W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, LOGICAL_H); }
    for (var y = 0; y <= LOGICAL_H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(LOGICAL_W, y); }
    ctx.stroke();
    // subtle center emblem: nine-point star (Cloud9 nod, original drawing)
    ctx.save();
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = COLORS.c9blue;
    ctx.lineWidth = 2;
    drawStar(0, 0, 9, 150, 62);
    ctx.restore();
  }

  function drawStar(cx, cy, points, outer, inner) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawTarget(t, now) {
    var age = now - t.bornAt;
    var lifeFrac = age / t.lifeMs;
    var fadeIn = clamp(age / 90, 0, 1);
    var blink = lifeFrac > 0.7 ? (Math.sin(now / 60) > 0 ? 1 : 0.45) : 1; // urgency blink near expiry
    ctx.save();
    ctx.globalAlpha = fadeIn * blink;
    ctx.translate(t.x, t.y);

    if (t.decoy) {
      // dark "do not click" target
      ctx.fillStyle = COLORS.decoy;
      ctx.strokeStyle = COLORS.decoyEdge;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, t.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ff5d5d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-t.r * 0.45, -t.r * 0.45); ctx.lineTo(t.r * 0.45, t.r * 0.45);
      ctx.moveTo(t.r * 0.45, -t.r * 0.45); ctx.lineTo(-t.r * 0.45, t.r * 0.45);
      ctx.stroke();
      ctx.restore();
      return;
    }

    var main = t.golden ? COLORS.gold : COLORS.c9blue;
    var light = t.golden ? '#ffe9a8' : COLORS.c9light;
    var pulse = 1 + Math.sin(t.pulse) * 0.06;

    // glow
    ctx.shadowColor = main;
    ctx.shadowBlur = t.golden ? 26 : 14;
    // outer ring
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.arc(0, 0, t.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // middle ring
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, t.r * 0.68 * pulse, 0, Math.PI * 2); ctx.fill();
    // inner disc
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.arc(0, 0, t.r * 0.42 * pulse, 0, Math.PI * 2); ctx.fill();
    // center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, t.r * 0.16 * pulse, 0, Math.PI * 2); ctx.fill();

    if (t.golden) {
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2.5;
      drawStar(0, 0, 5, t.r * 1.18, t.r * 0.55);
    }
    if (t.track) {
      // hold-to-track progress ring: fills gold while the cursor stays on it
      var prog = clamp(t.trackProgress || 0, 0, 1);
      ctx.strokeStyle = prog > 0 ? COLORS.gold : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, t.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
      if (prog === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('HOLD', 0, t.r + 26);
      }
    } else {
      // remaining-life ring
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, t.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lifeFrac));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(now) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      var age = now - p.bornAt;
      if (age >= p.life) { particles.splice(i, 1); continue; }
      var k = 1 - age / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + 0.5, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx * 0.016; p.y += p.vy * 0.016;
      p.vx *= 0.96; p.vy *= 0.96;
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(now) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px system-ui, sans-serif';
    for (var i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      var age = now - f.bornAt;
      if (age >= f.life) { floaters.splice(i, 1); continue; }
      var k = 1 - age / f.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - age * 0.03);
    }
    ctx.globalAlpha = 1;
  }

  function drawAmbient(now, dt) {
    // menu attract animation: soft drifting targets, never clickable
    if (ambient.length < 7 && Math.random() < 0.02) {
      ambient.push({
        x: rand(60, LOGICAL_W - 60), y: rand(100, LOGICAL_H - 60),
        vx: rand(-25, 25), vy: rand(-20, 20),
        r: rand(22, 46), pulse: rand(0, 6), golden: Math.random() < 0.15
      });
    }
    for (var i = ambient.length - 1; i >= 0; i--) {
      var a = ambient[i];
      a.x += a.vx * dt / 1000; a.y += a.vy * dt / 1000;
      if (a.x < 30 || a.x > LOGICAL_W - 30) a.vx *= -1;
      if (a.y < 70 || a.y > LOGICAL_H - 30) a.vy *= -1;
      a.pulse += dt / 100;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.translate(a.x, a.y);
      var main = a.golden ? COLORS.gold : COLORS.c9blue;
      ctx.fillStyle = main;
      ctx.beginPath(); ctx.arc(0, 0, a.r * (1 + Math.sin(a.pulse) * 0.05), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, a.r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = main;
      ctx.beginPath(); ctx.arc(0, 0, a.r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawCountdown(now) {
    var elapsed = now - countdownStartAt;
    var step = Math.floor(elapsed / 800); // 0,1,2 -> 3,2,1 ; 3 -> GO
    var label = step < 3 ? String(3 - step) : 'GO!';
    var frac = (elapsed % 800) / 800;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1 - frac * 0.4;
    ctx.fillStyle = step < 3 ? COLORS.white : COLORS.gold;
    ctx.font = 'bold 120px system-ui, sans-serif';
    ctx.shadowColor = COLORS.c9blue; ctx.shadowBlur = 40;
    ctx.fillText(label, LOGICAL_W / 2, LOGICAL_H / 2 + 40);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* HUD + screens                                                       */
  /* ------------------------------------------------------------------ */

  function updateHud(now) {
    var timeLeft = Math.max(0, roundEndAt - now);
    $('hud-time').textContent = fmtClock(timeLeft);
    $('hud-score').textContent = score.toLocaleString('en-US');
    var mult = comboMultiplier() * (frenzyActive(now) ? 2 : 1);
    $('hud-combo').textContent = combo > 1 ? 'COMBO x' + mult.toFixed(2).replace(/\.?0+$/, '') + '  (' + combo + ')' : '';
    $('hud-combo').classList.toggle('hot', combo >= 8);
    $('hud-frenzy').style.display = frenzyActive(now) ? 'inline-block' : 'none';
    if (frenzyActive(now)) {
      $('hud-frenzy').textContent = 'FRENZY ' + fmtTime(frenzyUntil - now) + ' — 2x POINTS';
    }
    var acc = shots > 0 ? Math.round(hits / shots * 100) : 0;
    $('hud-acc').textContent = shots > 0 ? 'ACC ' + acc + '%' : 'ACC —';
    // time urgency
    $('hud-time').classList.toggle('urgent', timeLeft <= 10000);
  }

  function showScreen(name) {
    ['menu', 'playing', 'score', 'paused'].forEach(function (s) {
      var el = $('screen-' + s);
      if (el) el.classList.toggle('hidden', s !== name);
    });
    $('hud').classList.toggle('hidden', name !== 'playing' && name !== 'paused');
  }

  function renderMenuLeaderboard() {
    var list = window.C9Leaderboard.topScores('all', 10);
    var el = $('menu-top10');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<li class="empty">No scores yet — be the first legend.</li>';
      return;
    }
    el.innerHTML = list.map(function (s, i) {
      return '<li><span class="rank">' + (i + 1) + '</span><span class="name">' +
        escapeHtml(s.name) + '</span><span class="mode-tag">' + s.mode + '</span>' +
        (s.durationMs ? '<span class="dur-tag">' + Math.round(s.durationMs / 1000) + 's</span>' : '') +
        '<span class="pts">' + s.score.toLocaleString('en-US') + '</span></li>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rankFor(acc, sc, avgReact) {
    // par is quoted for a 90s round; scale it so a grade measures skill,
    // not round length (a 60s booth round has 2/3 of the scoring time).
    var par = modeConfig().par * (roundDurationMs / 90000);
    // S also demands fast reactions — a slow-but-accurate player tops out at A.
    if (acc >= 85 && sc >= par && (avgReact === 0 || avgReact <= 600)) return 'S';
    if (acc >= 70 && sc >= par * 0.6) return 'A';
    if (acc >= 50) return 'B';
    return 'C';
  }

  function endRound(now) {
    state = 'score';
    tracking = null;
    SFX.over();
    var acc = shots > 0 ? Math.round(hits / shots * 100) : 0;
    var avgReact = reactionCount > 0 ? Math.round(reactionSum / reactionCount) : 0;
    roundResult = {
      mode: mode, score: score, hits: hits, shots: shots, acc: acc,
      bestCombo: bestCombo, avgReact: avgReact, trackTimeMs: trackTimeMs,
      rank: rankFor(acc, score, avgReact), golden: goldenSpawned,
      durationMs: roundDurationMs
    };
    $('final-score').textContent = score.toLocaleString('en-US');
    $('final-rank').textContent = roundResult.rank;
    $('final-rank').className = 'rank-badge rank-' + roundResult.rank;
    var statsHtml =
      '<div><b>' + hits + '/' + shots + '</b><span>hits / shots</span></div>' +
      '<div><b>' + (shots > 0 ? acc + '%' : '—') + '</b><span>accuracy</span></div>' +
      '<div><b>' + bestCombo + '</b><span>best combo</span></div>' +
      '<div><b>' + (avgReact ? avgReact + ' ms' : '—') + '</b><span>avg reaction</span></div>' +
      '<div><b>' + goldenHit + '</b><span>golden hit</span></div>';
    if (mode === 'track') {
      statsHtml += '<div><b>' + (trackTimeMs / 1000).toFixed(1) + ' s</b><span>on-target time</span></div>';
    }
    $('final-stats').innerHTML = statsHtml;
    $('score-mode-label').textContent = MODES[mode].label + ' — ' + Math.round(roundDurationMs / 1000) + 's round';
    // initials entry (arcade style) — focus only after the screen is
    // visible, or focus() silently fails into the hidden ancestor.
    var input = $('initials');
    input.value = '';
    showScreen('score');
    input.focus();
    lastActivityAt = Date.now();
    renderMenuLeaderboard();
  }

  function saveScoreAndShow() {
    // One save per round: Enter on the initials field must not append the
    // same score again (the button alone being disabled is not enough).
    if (scoreSaved) return;
    scoreSaved = true;
    var name = ($('initials').value || 'ACE').toUpperCase();
    var res = window.C9Leaderboard.addScore({
      name: name, score: roundResult.score, mode: roundResult.mode,
      hits: roundResult.hits, shots: roundResult.shots, acc: roundResult.acc,
      bestCombo: roundResult.bestCombo, durationMs: roundResult.durationMs
    });
    if (!res.saved) {
      $('save-note').textContent = res.error === 'storage'
        ? 'Could not save — browser storage is unavailable.'
        : 'Outside the Top 100 — not saved to the board.';
    } else {
      $('save-note').textContent = res.rank <= 10
        ? 'Saved! You rank #' + res.rank + ' on the local leaderboard.'
        : 'Saved! (Rank #' + res.rank + ' — top 10 shown at the booth.)';
    }
    $('btn-save-score').disabled = true;
    renderMenuLeaderboard();
  }

  /* ------------------------------------------------------------------ */
  /* Flow                                                                */
  /* ------------------------------------------------------------------ */

  function startCountdown(selectedMode, opts) {
    mode = selectedMode || mode;
    settings.lastMode = mode;
    window.C9Leaderboard.saveSettings(settings);
    // Booth default is 60s; the menu toggle (or an explicit opts override)
    // can switch to the 90s classic round.
    var duration = (opts && opts.durationMs) || settings.durationMs || BOOTH_MS;
    score = 0; hits = 0; shots = 0; combo = 0; bestCombo = 0; spawned = 0;
    roundDurationMs = duration; goldenHit = 0;
    reactionSum = 0; reactionCount = 0; goldenSpawned = 0;
    tracking = null; trackTimeMs = 0;
    mousePos = { x: LOGICAL_W / 2, y: LOGICAL_H / 2 };
    targets = []; particles = []; floaters = [];
    frenzyUntil = 0; lastSpawnAt = 0;
    state = 'countdown';
    countdownStartAt = performance.now();
    roundStartAt = countdownStartAt + COUNTDOWN_MS;
    roundEndAt = roundStartAt + duration;
    goldenAt = roundStartAt + duration * rand(0.2, 0.8);
    $('btn-save-score').disabled = false;
    scoreSaved = false;
    $('save-note').textContent = '';
    showScreen('playing');
    updateHud(performance.now());
    pokeActivity();
  }

  function startRoundNow() {
    state = 'playing';
    lastSpawnAt = performance.now();
    SFX.go();
  }

  function quitToMenu(showAttract) {
    state = 'menu';
    targets = []; particles = []; floaters = [];
    tracking = null;
    // Booth flow: an idle reset lands straight on the attract screen, so
    // the next player in line sees "TAP TO PLAY" immediately.
    attractOn = !!showAttract;
    $('attract').classList.toggle('hidden', !attractOn);
    showScreen('menu');
    renderMenuLeaderboard();
    lastActivityAt = Date.now();
  }

  function staffReset() {
    // Booth operator: wipe the local leaderboard and reset to the menu.
    // Button + "R" key. Guarded by confirm() so a stray tap can't nuke it.
    if (!window.confirm('Staff reset: clear the local leaderboard and return to the menu?')) return;
    window.C9Leaderboard.clearScores();
    renderMenuLeaderboard();
    quitToMenu();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      pauseStartedAt = performance.now();
      // A paused hold is interrupted, not failed: clear it without
      // breaking the combo (endTracking(true) would punish the pause).
      tracking = null;
      showScreen('paused');
    } else if (state === 'paused') {
      // Shift every wall-clock deadline by the paused duration, so a pause
      // never eats round time, expires targets, or burns frenzy.
      var pausedMs = pauseStartedAt ? performance.now() - pauseStartedAt : 0;
      roundStartAt += pausedMs; roundEndAt += pausedMs;
      countdownStartAt += pausedMs; goldenAt += pausedMs;
      if (frenzyUntil) frenzyUntil += pausedMs;
      lastSpawnAt += pausedMs;
      targets.forEach(function (t) { t.bornAt += pausedMs; if (t.steerAt) t.steerAt += pausedMs; });
      pauseStartedAt = 0;
      lastFrameAt = performance.now();
      state = 'playing';
      showScreen('playing');
    }
    pokeActivity();
  }

  function pokeActivity() {
    lastActivityAt = Date.now();
    if (attractOn) {
      attractOn = false;
      $('attract').classList.add('hidden');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                           */
  /* ------------------------------------------------------------------ */

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    // Cap the per-frame delta at 100ms (was 50): at low frame rates the
    // round clock is wall time, so a tighter cap makes Track captures and
    // movement lag real time by up to 2x for no benefit.
    var dt = Math.min(100, now - (lastFrameAt || now));
    lastFrameAt = now;

    drawBackground(now);

    if (state === 'menu') {
      drawAmbient(now, dt);
      if (!attractOn && Date.now() - lastActivityAt > MENU_ATTRACT_MS) {
        attractOn = true;
        $('attract').classList.remove('hidden');
      }
    } else if (state === 'countdown') {
      drawCountdown(now);
      var step = Math.floor((now - countdownStartAt) / 800);
      if (step !== frame._lastCountStep) {
        frame._lastCountStep = step;
        if (step < 3) SFX.count();
      }
      if (now >= roundStartAt) startRoundNow();
    } else if (state === 'playing') {
      if (now >= roundEndAt) { endRound(now); }
      else {
        updateTargets(now, dt);
        targets.forEach(function (t) { drawTarget(t, now); });
        drawParticles(now);
        drawFloaters(now);
        updateHud(now);
      }
    } else if (state === 'paused') {
      targets.forEach(function (t) { drawTarget(t, now); });
    } else if (state === 'score') {
      drawParticles(now);
      if (Date.now() - lastActivityAt > SCORE_IDLE_RESET_MS) quitToMenu(true); // booth auto-reset -> attract
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function syncDurationUI() {
    var d = settings.durationMs || BOOTH_MS;
    document.querySelectorAll('.duration-btn').forEach(function (b) {
      var active = Number(b.dataset.duration) === d;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('.mode-play').forEach(function (el) {
      el.textContent = 'PLAY — ' + Math.round(d / 1000) + 's';
    });
    var at = $('attract-sub');
    if (at) at.textContent = Math.round(d / 1000) + ' seconds · mouse only · beat the top score';
  }

  function buildModeCards() {
    var wrap = $('mode-cards');
    Object.keys(MODES).forEach(function (key) {
      var m = MODES[key];
      var card = document.createElement('button');
      card.className = 'mode-card';
      card.dataset.mode = key;
      card.innerHTML = '<span class="mode-name">' + m.label + '</span>' +
        '<span class="mode-tagline">' + m.tagline + '</span>' +
        '<span class="mode-play">PLAY</span>';
      card.addEventListener('click', function () {
        ensureAudio();
        startCountdown(key);
      });
      wrap.appendChild(card);
    });
    syncDurationUI();
  }

  function init() {
    canvas = $('game-canvas');
    ctx = canvas.getContext('2d');
    settings = Object.assign({ muted: false, lastMode: 'precision', durationMs: BOOTH_MS }, window.C9Leaderboard.loadSettings());
    mode = MODES[settings.lastMode] ? settings.lastMode : 'precision';

    // crisp rendering on hidpi
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = LOGICAL_W * dpr;
    canvas.height = LOGICAL_H * dpr;
    ctx.scale(dpr, dpr);

    buildModeCards();
    renderMenuLeaderboard();

    // sound toggle
    var muteBtn = $('btn-mute');
    var syncMute = function () { muteBtn.textContent = settings.muted ? 'SOUND: OFF' : 'SOUND: ON'; };
    muteBtn.addEventListener('click', function () {
      settings.muted = !settings.muted;
      window.C9Leaderboard.saveSettings(settings);
      syncMute();
      if (!settings.muted) SFX.hit();
    });
    syncMute();

    // controls
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', function (ev) { mousePos = canvasPos(ev); });
    canvas.addEventListener('pointerup', function () { endTracking(true); });
    canvas.addEventListener('pointercancel', function () { endTracking(true); });
    canvas.addEventListener('pointerleave', function () { endTracking(true); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('pointerdown', pokeActivity, true);
    document.addEventListener('keydown', function (e) {
      pokeActivity();
      var typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if ((e.key === 'r' || e.key === 'R') && !typing) { staffReset(); return; }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (state === 'playing' || state === 'paused') togglePause();
        else if (state === 'score') quitToMenu();
      }
      if (e.key === 'Enter' && state === 'menu') {
        // Enter on a focused button must trigger that button's own click,
        // not start a round with the previously selected mode (and then
        // let the click land on the newly hidden menu). Bare Enter on the
        // page body starts a round with the last-used mode.
        var tag = e.target && e.target.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return;
        e.preventDefault();
        startCountdown(mode);
      }
    });
    // Shift the countdown's wall-clock deadlines by however long the page
    // was hidden, so returning late never starts (or ends) a round early.
    function shiftRoundTimes(ms) {
      countdownStartAt += ms; roundStartAt += ms; roundEndAt += ms; goldenAt += ms;
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'playing') togglePause(); // booth safety
      else if (document.hidden && state === 'countdown') countdownHiddenAt = performance.now();
      else if (!document.hidden && state === 'countdown' && countdownHiddenAt) {
        shiftRoundTimes(performance.now() - countdownHiddenAt);
        countdownHiddenAt = 0;
      }
    });
    window.addEventListener('blur', function () {
      // Losing window focus pauses play (booth safety); a hidden countdown
      // is shifted instead, so it cannot expire while nobody is watching.
      if (state === 'playing') togglePause();
      else if (state === 'countdown' && !countdownHiddenAt) countdownHiddenAt = performance.now();
    });
    window.addEventListener('focus', function () {
      if (state === 'countdown' && countdownHiddenAt) {
        shiftRoundTimes(performance.now() - countdownHiddenAt);
        countdownHiddenAt = 0;
      }
    });

    $('btn-pause').addEventListener('click', togglePause);
    $('btn-resume').addEventListener('click', togglePause);
    // Wrap: passing quitToMenu directly would hand it the click event as
    // the showAttract flag and land on the attract screen instead of the menu.
    $('btn-quit').addEventListener('click', function () { quitToMenu(); });
    $('btn-again').addEventListener('click', function () { startCountdown(mode); });
    $('btn-menu').addEventListener('click', function () { quitToMenu(); });
    $('btn-booth').addEventListener('click', function () { window.open('booth.html', '_blank'); });
    $('btn-staff-reset').addEventListener('click', staffReset);
    document.querySelectorAll('.duration-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings.durationMs = Number(btn.dataset.duration);
        window.C9Leaderboard.saveSettings(settings);
        syncDurationUI();
        pokeActivity();
      });
    });
    $('btn-save-score').addEventListener('click', saveScoreAndShow);
    $('initials').addEventListener('keydown', function (e) {
      // Typing counts as activity (the stopPropagation below would
      // otherwise hide it from the document handler, and the score screen
      // could auto-reset while a name is being entered).
      pokeActivity();
      if (e.key === 'Enter') saveScoreAndShow();
      e.stopPropagation();
    });

    showScreen('menu');
    rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Debug / test hook (used by tests/bot_playtest.py — harmless in prod) */
  /* ------------------------------------------------------------------ */

  window.FLICK = {
    MODES: MODES,
    getState: function () {
      var now = performance.now();
      return {
        state: state, mode: mode, score: score, hits: hits, shots: shots,
        combo: combo, bestCombo: bestCombo, spawned: spawned,
        timeLeftMs: Math.max(0, roundEndAt - now),
        durationMs: roundDurationMs,
        avgReact: reactionCount ? Math.round(reactionSum / reactionCount) : 0,
        trackTimeMs: trackTimeMs,
        tracking: tracking ? { id: tracking.id } : null,
        targets: targets.map(function (t) {
          return { id: t.id, x: t.x, y: t.y, r: t.r, golden: t.golden, decoy: t.decoy, bornAt: t.bornAt, track: !!t.track, trackProgress: t.trackProgress || 0 };
        }),
        frenzy: frenzyActive(now)
      };
    },
    start: function (m, opts) { startCountdown(m, opts); },
    quitToMenu: quitToMenu,
    canvasBox: function () {
      var r = canvas.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
