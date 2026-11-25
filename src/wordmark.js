import { state } from './state.js';

// ---- Custom Hero Slogan + Continuous React Bits Shuffle Morph ("N个节点离线" -> Custom Slogan) ----
// Exact tuned Shuffle params: shuffleDirection="up", animationMode="random", duration=0.9s,
// maxDelay=0.45s, scrambleCharset="qertyuiopasdfhjklzxcvbn", motionBlur=true,
// shuffleTimes=2, ease="expo.out", triggerOnHover=false (keeps System font & smoky ink)
const heroWordmarkCtrl = {
  runId: 0,
  holdTimer: 0,
  rafId: 0,
};

export function getConfiguredHeroTitle() {
  const raw = (state.settings.hero_title || "").trim();
  return raw || "Komari Pane";
}

function getOfflineAlertText(offlineCount) {
  if (state.lang === "en") {
    return `${offlineCount} ${offlineCount === 1 ? "Node" : "Nodes"} Offline`;
  }
  return `${offlineCount}个节点离线`;
}

export function clearHeroWordmarkTimers() {
  heroWordmarkCtrl.runId += 1;
  if (heroWordmarkCtrl.holdTimer) {
    clearTimeout(heroWordmarkCtrl.holdTimer);
    heroWordmarkCtrl.holdTimer = 0;
  }
  if (heroWordmarkCtrl.rafId) {
    cancelAnimationFrame(heroWordmarkCtrl.rafId);
    heroWordmarkCtrl.rafId = 0;
  }
  return heroWordmarkCtrl.runId;
}

export function renderStaticHeroWordmark(text, isAlert = false) {
  const el = document.getElementById("hero-wordmark");
  const defs = document.getElementById("sg-shuffle-defs");
  if (!el) return;
  el.innerHTML = "";
  if (defs) defs.innerHTML = "";
  el.setAttribute("aria-label", text);

  const cls = isAlert ? "sg-hero-wordmark-alert" : "sg-hero-wordmark-ink";
  Array.from(text).forEach((char) => {
    if (char === " ") {
      const sp = document.createElement("span");
      sp.className = "sg-shuffle-space";
      sp.innerHTML = "&nbsp;";
      el.appendChild(sp);
      return;
    }
    const cell = document.createElement("span");
    cell.className = "sg-shuffle-cell";
    const track = document.createElement("span");
    track.className = "sg-shuffle-track";
    const glyph = document.createElement("span");
    glyph.className = `sg-shuffle-glyph ${cls}`;
    glyph.textContent = char;
    track.appendChild(glyph);
    cell.appendChild(track);
    el.appendChild(cell);
  });
}

// Measure exact center-relative X coordinates for every non-space character so morph has ZERO flexbox reflow jitter
function measureHeroLayout(el, text) {
  const style = getComputedStyle(el);
  const fontSizePx = parseFloat(style.fontSize) || 48;
  const spacePx = fontSizePx * 0.42;
  const marginHalfPx = fontSizePx * 0.055;

  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;white-space:pre;line-height:1;";
  el.appendChild(probe);

  const cache = new Map();
  const getW = (ch) => {
    if (ch === " ") return spacePx;
    if (cache.has(ch)) return cache.get(ch);
    probe.textContent = ch;
    const w = probe.getBoundingClientRect().width;
    cache.set(ch, w);
    return w;
  };

  const glyphs = [];
  let cursor = 0;
  for (const ch of Array.from(text)) {
    const w = getW(ch);
    const centerX = cursor + marginHalfPx + w * 0.5;
    cursor += w + marginHalfPx * 2;
    if (ch !== " ") {
      glyphs.push({ char: ch, w, centerX });
    }
  }
  probe.remove();

  const halfTotal = cursor * 0.5;
  for (const g of glyphs) g.centerX -= halfTotal;
  return { glyphs, totalWidth: cursor, fontSizePx };
}

// In-Flow Anchor + Out-of-Flow Echo React Bits Shuffle Engine:
// 1. Each permanent target glyph (.sg-shuffle-glyph) sits IN NORMAL FLOW at y=0 inside .sg-shuffle-track,
//    with constant base identity `translate: 0px` on both .sg-shuffle-cell and .sg-shuffle-track
//    (stacking context, clip-path, and box height NEVER change during or after animation).
// 2. Temporary scramble/source glyphs (.sg-shuffle-echo) are out-of-flow `position: absolute` above y=0
//    spaced at exact integer pixel stride `slotStepPx` (0.000px subpixel accumulation, zero descender bleed).
// 3. Shared discrete SVG blur steps (like official React Bits Shuffle) detach `filter` as soon as velocity
//    settles (u >= 0.50, while still in motion), eliminating offscreen filter surface snapping on late chars.
// 4. Exact C^4 `quintOut` curve reaches <0.15px by u=0.75 and exact 0.000px at u=1 without expoOut's 350ms droop.
function runHeroShuffleTransition(fromText, toText, runId, holdBeforeMorphMs = 0) {
  const el = document.getElementById("hero-wordmark");
  const defs = document.getElementById("sg-shuffle-defs");
  if (!el || runId !== heroWordmarkCtrl.runId) return;

  const charset = "qertyuiopasdfhjklzxcvbn";
  const narrowCharset = "ijlrtf";
  const shuffleTimes = 2;
  const durationMs = 780;
  const maxDelayMs = 340;
  const motionBlur = true;
  const BLUR_STEPS = 10;
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    if (fromText && holdBeforeMorphMs > 0) {
      renderStaticHeroWordmark(fromText, true);
      heroWordmarkCtrl.holdTimer = setTimeout(() => {
        heroWordmarkCtrl.holdTimer = 0;
        if (runId !== heroWordmarkCtrl.runId) return;
        renderStaticHeroWordmark(toText, false);
      }, holdBeforeMorphMs);
    } else {
      renderStaticHeroWordmark(toText, false);
    }
    return;
  }

  const pickRandomFrom = (pool, exclude) => {
    let ch = pool[Math.floor(Math.random() * pool.length)];
    while (ch === exclude && pool.length > 1) {
      ch = pool[Math.floor(Math.random() * pool.length)];
    }
    return ch;
  };

  const isMorph = Boolean(fromText);
  const svgNS = "http://www.w3.org/2000/svg";
  const quintOut = (u) => (u >= 1 ? 1 : 1 - Math.pow(1 - u, 5));
  const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  el.innerHTML = "";
  if (defs) defs.innerHTML = "";
  el.setAttribute("aria-label", isMorph ? fromText : toText);

  if (motionBlur && defs) {
    const blurMax = 5.2;
    for (let k = 1; k <= BLUR_STEPS; k++) {
      const filter = document.createElementNS(svgNS, "filter");
      filter.setAttribute("id", `sg-shuffle-blur-${runId}-${k}`);
      filter.setAttribute("x", "-15%");
      filter.setAttribute("y", "-90%");
      filter.setAttribute("width", "130%");
      filter.setAttribute("height", "280%");
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const blur = document.createElementNS(svgNS, "feGaussianBlur");
      const amount = (blurMax * Math.pow(k / BLUR_STEPS, 1.4)).toFixed(2);
      blur.setAttribute("stdDeviation", `0 ${amount}`);
      filter.appendChild(blur);
      defs.appendChild(filter);
    }
  }

  const fromG = isMorph ? measureHeroLayout(el, fromText).glyphs : [];

  // 1) Render permanent responsive flex cells with real in-flow target glyphs at y=0
  const toCells = [];
  Array.from(toText).forEach((char) => {
    if (char === " ") {
      const sp = document.createElement("span");
      sp.className = "sg-shuffle-space";
      sp.innerHTML = "&nbsp;";
      el.appendChild(sp);
      return;
    }
    const cell = document.createElement("span");
    cell.className = "sg-shuffle-cell";
    const track = document.createElement("span");
    track.className = "sg-shuffle-track";
    const glyph = document.createElement("span");
    glyph.className = "sg-shuffle-glyph sg-hero-wordmark-ink";
    glyph.textContent = char;
    track.appendChild(glyph);
    cell.appendChild(track);
    el.appendChild(cell);
    toCells.push({ char, cell, track });
  });

  const stageRect = el.getBoundingClientRect();
  const stageMidX = stageRect.left + stageRect.width * 0.5;
  const cellH = stageRect.height || (parseFloat(getComputedStyle(el).fontSize) || 48) * 1.08;
  // Exact integer pixel stride guarantees 0.000px subpixel drift and keeps upper descenders clear of top clip
  const slotStepPx = Math.max(1, Math.ceil(cellH * 1.18));

  toCells.forEach((entry) => {
    const r = entry.cell.getBoundingClientRect();
    entry.centerX = r.left + r.width * 0.5 - stageMidX;
    entry.w = r.width;
  });

  const m = fromG.length;
  const n = toCells.length;
  const pairCount = isMorph ? Math.min(m, n) : 0;
  const fromStart = Math.floor((m - pairCount) / 2);
  const toStart = Math.floor((n - pairCount) / 2);
  const maxAbsToX = Math.max(1, ...toCells.map((g) => Math.abs(g.centerX)));
  const maxAbsFromX = Math.max(1, ...fromG.map((g) => Math.abs(g.centerX)));

  const actors = [];

  const populateEchoes = (track, upperSlots) => {
    const steps = Math.max(1, upperSlots.length);
    const echoNodes = [];
    upperSlots.forEach(({ glyph, isAlert }, idx) => {
      const echo = document.createElement("span");
      echo.className = "sg-shuffle-echo";
      echo.style.top = `${-(steps - idx) * slotStepPx}px`;
      if (glyph) {
        const inner = document.createElement("span");
        inner.className = `sg-shuffle-glyph ${isAlert ? "sg-hero-wordmark-alert" : "sg-hero-wordmark-ink"}`;
        inner.textContent = glyph;
        echo.appendChild(inner);
      }
      track.insertBefore(echo, track.firstChild);
      echoNodes.push(echo);
    });
    const startY = steps * slotStepPx;
    track.style.translate = `0px ${startY}px`;
    return { echoNodes, startY, blurLevel: 0 };
  };

  // 2) Configure upper scramble echoes + FLIP starting X offsets on every permanent cell
  toCells.forEach((entry, i) => {
    const pool = "ijlrtfI1|.,!:".includes(entry.char) ? narrowCharset : charset;
    let prev = entry.char.toLowerCase();

    if (!isMorph) {
      const upperSlots = [];
      for (let s = 0; s <= shuffleTimes; s++) {
        const next = pickRandomFrom(pool, prev);
        upperSlots.push({ glyph: next, isAlert: false });
        prev = next;
      }
      const built = populateEchoes(entry.track, upperSlots);
      actors.push({
        kind: "direct",
        cell: entry.cell,
        track: entry.track,
        ...built,
        startDx: 0,
        delayMs: Math.random() * maxDelayMs,
        reelDurationMs: durationMs,
        done: false,
      });
      return;
    }

    const isPaired = i >= toStart && i < toStart + pairCount;
    if (isPaired) {
      const fg = fromG[fromStart + (i - toStart)];
      const upperSlots = [{ glyph: fg.char, isAlert: true }];
      for (let s = 0; s < shuffleTimes; s++) {
        const next = pickRandomFrom(pool, prev);
        upperSlots.push({ glyph: next, isAlert: false });
        prev = next;
      }
      const built = populateEchoes(entry.track, upperSlots);
      const startDx = fg.centerX - entry.centerX;
      entry.cell.style.translate = `${startDx.toFixed(2)}px 0px`;
      const centerDelayCap = n > m ? 180 : n < m ? 220 : 280;
      actors.push({
        kind: "pair",
        cell: entry.cell,
        track: entry.track,
        ...built,
        startDx,
        delayMs: Math.random() * centerDelayCap,
        reelDurationMs: durationMs,
        done: false,
      });
    } else {
      const upperSlots = [{ glyph: "", isAlert: false }];
      for (let s = 0; s < shuffleTimes; s++) {
        const next = pickRandomFrom(pool, prev);
        upperSlots.push({ glyph: next, isAlert: false });
        prev = next;
      }
      const built = populateEchoes(entry.track, upperSlots);
      const normDist = Math.abs(entry.centerX) / maxAbsToX;
      const dirSign = entry.centerX >= 0 ? 1 : -1;
      const startDx = -dirSign * 14;
      entry.cell.style.translate = `${startDx.toFixed(2)}px 0px`;
      entry.cell.style.opacity = "0";
      actors.push({
        kind: "enter",
        cell: entry.cell,
        track: entry.track,
        ...built,
        startDx,
        delayMs: 35 + normDist * 135 + Math.random() * 110,
        reelDurationMs: durationMs,
        done: false,
      });
    }
  });

  // 3) Lightweight out-of-flow exit cells when custom slogan is shorter than offline alert (n < m)
  if (isMorph && n < m) {
    for (let j = 0; j < m; j++) {
      if (j >= fromStart && j < fromStart + pairCount) continue;
      const fg = fromG[j];
      const cell = document.createElement("span");
      cell.className = "sg-shuffle-exit-cell";
      const boxW = fg.w + 2;
      cell.style.width = `${boxW.toFixed(2)}px`;
      const baseOffset = fg.centerX - boxW * 0.5;
      cell.style.translate = `${baseOffset.toFixed(2)}px 0px`;

      const track = document.createElement("span");
      track.className = "sg-shuffle-track";
      const spacer = document.createElement("span");
      spacer.className = "sg-shuffle-glyph invisible select-none";
      spacer.textContent = fg.char;
      track.appendChild(spacer);
      cell.appendChild(track);
      el.appendChild(cell);

      const upperSlots = [
        { glyph: fg.char, isAlert: true },
        { glyph: pickRandomFrom(charset, fg.char.toLowerCase()), isAlert: true },
      ];
      const built = populateEchoes(track, upperSlots);
      const normEdge = 1 - Math.abs(fg.centerX) / maxAbsFromX;
      const dirSign = fg.centerX >= 0 ? 1 : -1;
      actors.push({
        kind: "exit",
        cell,
        track,
        ...built,
        baseOffset,
        startDx: 0,
        exitShift: -dirSign * 10,
        delayMs: normEdge * 70 + Math.random() * 80,
        reelDurationMs: 480,
        done: false,
      });
    }
  }

  const glideDurationMs = 540;

  const applyBlurLevel = (item, nextLevel) => {
    if (!motionBlur || !defs || nextLevel === item.blurLevel) return;
    item.blurLevel = nextLevel;
    item.track.style.filter = nextLevel > 0 ? `url(#sg-shuffle-blur-${runId}-${nextLevel})` : "";
  };

  function beginRoll(startLeadMs) {
    if (runId !== heroWordmarkCtrl.runId) return;
    el.setAttribute("aria-label", toText);
    const startEpoch = performance.now() + startLeadMs;

    function tick(now) {
      if (runId !== heroWordmarkCtrl.runId) return;
      const totalElapsed = now - startEpoch;
      const glideU = isMorph ? Math.min(1, Math.max(0, totalElapsed / glideDurationMs)) : 1;
      const glideP = easeInOutCubic(glideU);

      let anyActive = glideU < 1;

      for (const item of actors) {
        if (isMorph) {
          if (item.kind === "exit") {
            const x = item.baseOffset + item.exitShift * glideP;
            item.cell.style.translate = `${x.toFixed(2)}px 0px`;
          } else if (glideU >= 1) {
            if (item.cell.style.translate !== "0px") item.cell.style.translate = "0px";
          } else {
            const dx = item.startDx * (1 - glideP);
            item.cell.style.translate = `${dx.toFixed(2)}px 0px`;
          }
        }

        if (item.done) continue;
        const elapsed = totalElapsed - item.delayMs;
        if (elapsed <= 0) {
          anyActive = true;
          continue;
        }

        const u = Math.min(1, elapsed / item.reelDurationMs);
        const progress = quintOut(u);
        const curY = u >= 1 ? 0 : item.startY * (1 - progress);
        item.track.style.translate = curY <= 0.02 ? "0px" : `0px ${curY.toFixed(2)}px`;

        if (item.kind === "enter") {
          item.cell.style.opacity = u >= 0.45 ? "" : `${Math.min(1, progress * 3.2).toFixed(3)}`;
        } else if (item.kind === "exit") {
          item.cell.style.opacity = `${Math.max(0, 1 - progress * 1.35).toFixed(3)}`;
        }

        // Velocity factor (1 - u)^4 drops below 1 step around u=0.46 -> filter detaches WHILE STILL IN MOTION,
        // so the entire settling phase (u=0.48..1.00) renders via native unfiltered glyph rasterization!
        const velNorm = u >= 1 ? 0 : Math.pow(1 - u, 4);
        const level = velNorm < 0.08 ? 0 : Math.min(BLUR_STEPS, Math.round(velNorm * BLUR_STEPS));
        applyBlurLevel(item, level);

        if (u >= 1) {
          item.done = true;
          applyBlurLevel(item, 0);
          item.track.style.translate = "0px";
          if (item.kind !== "exit") item.cell.style.opacity = "";
        } else {
          anyActive = true;
        }
      }

      if (anyActive) {
        heroWordmarkCtrl.rafId = requestAnimationFrame(tick);
      } else {
        heroWordmarkCtrl.rafId = 0;
        // Prune out-of-flow absolute echoes & exit overlays AFTER all tracks are settled:
        // zero height/transform/clip-path/layer change on any target glyph!
        for (const item of actors) {
          if (item.kind === "exit") {
            item.cell.remove();
          } else {
            for (const echo of item.echoNodes) echo.remove();
          }
        }
        if (defs) defs.innerHTML = "";
      }
    }

    heroWordmarkCtrl.rafId = requestAnimationFrame(tick);
  }

  if (isMorph && holdBeforeMorphMs > 0) {
    heroWordmarkCtrl.holdTimer = setTimeout(() => {
      heroWordmarkCtrl.holdTimer = 0;
      beginRoll(0);
    }, holdBeforeMorphMs);
  } else {
    beginRoll(90);
  }
}

export function initHeroWordmarkShuffle() {
  const runId = clearHeroWordmarkTimers();
  const targetTitle = getConfiguredHeroTitle();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderStaticHeroWordmark(targetTitle);
    return;
  }
  const offlineCount = state.nodes.filter((n) => !n.online).length;

  if (offlineCount > 0) {
    runHeroShuffleTransition(getOfflineAlertText(offlineCount), targetTitle, runId, 2000);
  } else {
    runHeroShuffleTransition(null, targetTitle, runId, 0);
  }
}

