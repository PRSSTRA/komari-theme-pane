import { state, t, formatRate, formatRateParts, formatTrafficGB } from './state.js';

// ---- Real-time Network Throughput rolling buffers & timestamps ----
function fmtClock(ms) {
  const d = new Date(ms);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function fmtRateTick(mbps) {
  if (!Number.isFinite(mbps) || mbps <= 0) return "0";
  const bps = mbps * 1024 * 1024;
  if (bps < 1024) return `${Math.round(bps)}B`;
  if (bps < 1024 * 1024) {
    const kb = bps / 1024;
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)}K`;
  }
  if (bps < 1024 * 1024 * 1024) {
    const mb = bps / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}M`;
  }
  const gb = bps / (1024 * 1024 * 1024);
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)}G`;
}

const netTelemetry = {
  todayGB: null, hoveredKind: null, hoveredCol: -1,
  timestamps: [], upHistory: [], downHistory: [],
};

export function resetNetwork() {
  netTelemetry.todayGB = null;
  netTelemetry.timestamps.length = netTelemetry.upHistory.length = netTelemetry.downHistory.length = 0;
}

export function seedNetwork(history, cutoff) {
  const buckets = new Map();
  for (const records of history) {
    const perNode = new Map();
    for (const record of records) {
      const time = Date.parse(record.updated_at);
      const { up, down } = record.network ?? {};
      if (time >= cutoff || time < cutoff - 160 * 2200 || !Number.isFinite(time) ||
        !Number.isFinite(up) || !Number.isFinite(down) || up < 0 || down < 0) continue;
      const key = Math.floor(time / 2200) * 2200;
      perNode.set(key, { up, down });
    }
    for (const [key, { up, down }] of perNode) {
      const total = buckets.get(key) ?? { up: 0, down: 0 };
      total.up += up;
      total.down += down;
      buckets.set(key, total);
    }
  }
  for (const time of [...buckets.keys()].sort((a, b) => b - a)) {
    const { up, down } = buckets.get(time);
    netTelemetry.timestamps.unshift(fmtClock(time));
    netTelemetry.upHistory.unshift(up / 1024 ** 2);
    netTelemetry.downHistory.unshift(down / 1024 ** 2);
  }
}

export function recordNetwork(now) {
  let up = 0, down = 0, today = null;
  for (const node of state.nodes) {
    if (node.online) { up += node.netOut; down += node.netIn; }
    if (Number.isFinite(node.todayUpGB) || Number.isFinite(node.todayDownGB)) {
      today = (today ?? 0) + (node.todayUpGB ?? 0) + (node.todayDownGB ?? 0);
    }
  }
  netTelemetry.todayGB = today;
  netTelemetry.timestamps.push(fmtClock(now));
  netTelemetry.upHistory.push(up);
  netTelemetry.downHistory.push(down);
  if (netTelemetry.timestamps.length > 160) {
    netTelemetry.timestamps.shift();
    netTelemetry.upHistory.shift();
    netTelemetry.downHistory.shift();
  }
}

let netUnifiedMeta = null;

function sgSmoothstep(e0, e1, x) {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const u = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

function drawSlatRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

// Multi-stop smoothstep-eased vignette band (zero Mach-band seam)
function fillEasedVignette(ctx, x0, y0, x1, y1, rgbStr, maxAlpha, rx, ry, rw, rh) {
  if (maxAlpha <= 0 || rw <= 0 || rh <= 0) return;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0.0, `rgba(${rgbStr}, ${maxAlpha.toFixed(3)})`);
  grad.addColorStop(0.22, `rgba(${rgbStr}, ${(maxAlpha * 0.78).toFixed(3)})`);
  grad.addColorStop(0.48, `rgba(${rgbStr}, ${(maxAlpha * 0.44).toFixed(3)})`);
  grad.addColorStop(0.72, `rgba(${rgbStr}, ${(maxAlpha * 0.16).toFixed(3)})`);
  grad.addColorStop(0.88, `rgba(${rgbStr}, ${(maxAlpha * 0.035).toFixed(3)})`);
  grad.addColorStop(1.0, `rgba(${rgbStr}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(rx, ry, rw, rh);
}

function computeSlatWave(cx, cy, rectW, rectH) {
  const direction = (271 * Math.PI) / 180;
  const scale = 2.5;
  const contrast = 0.7;
  const glintStrength = 0.8;
  const TURN = [0, 0.34, -0.42, 0.78];
  const LENGTH = [1.8, 1.15, 0.76, 0.48];
  const HEIGHT = [1.0, 0.58, 0.34, 0.18];
  const SHIFT = [0.6, 2.1, 4.3, 1.4];

  const v = Math.max(0, Math.min(1, cy / rectH));
  const horizon = 8.0;
  const depth = (1.0 + horizon) / (v + horizon);
  const wx = (((cx - rectW * 0.5) / rectH) * depth) / scale;
  const wy = ((depth - 1.0) * horizon * 2.2) / scale;

  const meander =
    0.55 * Math.sin((wx * 0.23 + wy * 0.41) * 0.9) +
    0.3 * Math.sin((wx * -0.37 + wy * 0.19) * 1.4);

  let waveHeight = 0;
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const angle = direction + TURN[i];
    const k = (Math.PI * 2) / LENGTH[i];
    const theta = k * (wx * Math.cos(angle) + wy * Math.sin(angle)) + SHIFT[i] + meander * (0.6 + 0.3 * i);
    waveHeight += HEIGHT[i] * Math.cos(theta);
    total += HEIGHT[i];
  }

  const level = Math.max(0, Math.min(1, 0.5 + (0.5 * waveHeight) / (total * 0.85)));
  const crest = sgSmoothstep(0.6, 1.0, level);
  const glint = crest * crest * glintStrength;
  const light = Math.max(0.35, Math.min(1, Math.pow(level, contrast) + glint * 0.8));
  const tint = Math.max(0, Math.min(1, glint * 1.4));
  return { light, tint };
}

function drawNetSlatsChartCanvas() {
  const canvas = document.getElementById("net-slats-canvas");
  const cell = document.getElementById("network-traffic-cell");
  if (!canvas || !cell) return;

  const rect = cell.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Unified square finer Micro Slats synced 1:1 with Load History & Ping Latency
  const slatW = 5.5;
  const slatH = 5.5;
  const gapX = 2.5;
  const gapY = 1.8;
  const roundness = 0.25;
  const pitchX = slatW + gapX;
  const pitchY = slatH + gapY;

  const cols = Math.max(18, Math.ceil((rect.width + gapX) / pitchX) + 1);
  const rows = Math.max(22, Math.ceil((rect.height + gapY) / pitchY) + 1);

  const totalGridW = cols * pitchX - gapX;
  const totalGridH = rows * pitchY - gapY;
  const originX = (rect.width - totalGridW) * 0.5;
  const originY = (rect.height - totalGridH) * 0.5;
  const radius = Math.max(0.6, roundness * Math.min(slatW * 0.5, slatH * 0.5));

  // Bars strictly above bottom timestamps (reserving >= 25px below Download baseline for timestamps + breathing room)
  const topHeaderEl = document.getElementById("net-top-header");
  const topClearY = topHeaderEl ? topHeaderEl.offsetTop + topHeaderEl.offsetHeight + 4 : 46;
  const downBaseRow = Math.max(
    14,
    Math.min(rows - 2, Math.floor((rect.height - 25 - slatH - originY) / pitchY))
  );
  const downBaseLineY = originY + downBaseRow * pitchY + slatH;

  const upPlotMinY = topClearY + 12;
  const midBudgetPx = 54; // 23px (Upload timestamp + gap) + 19px (Download header) + 12px (Download Y-max)
  const halfPlotPx = Math.max(4 * pitchY, (downBaseLineY - upPlotMinY - midBudgetPx) * 0.5);
  const upBaseRow = Math.max(
    6,
    Math.min(downBaseRow - 8, Math.floor((upPlotMinY + halfPlotPx - slatH - originY) / pitchY))
  );
  const upBaseLineY = originY + upBaseRow * pitchY + slatH;
  const downHeaderY = Math.round(upBaseLineY + 23);
  const downPlotMinY = downHeaderY + 30;
  const splitRow = upBaseRow + 3;

  const upAvailRows = Math.max(4, Math.floor((upBaseLineY - slatH - upPlotMinY) / pitchY) + 1);
  const downAvailRows = Math.max(4, Math.floor((downBaseLineY - slatH - downPlotMinY) / pitchY) + 1);
  const maxBarRows = Math.max(4, Math.min(upAvailRows, downAvailRows));

  const upBarTopY = originY + (upBaseRow - maxBarRows + 1) * pitchY;
  const upBarMidY = originY + (upBaseRow - Math.round(maxBarRows * 0.5) + 1) * pitchY;
  const downBarTopY = originY + (downBaseRow - maxBarRows + 1) * pitchY;
  const downBarMidY = originY + (downBaseRow - Math.round(maxBarRows * 0.5) + 1) * pitchY;

  const upSamples = netTelemetry.upHistory.slice(-cols);
  const downSamples = netTelemetry.downHistory.slice(-cols);
  const times = netTelemetry.timestamps.slice(-cols);
  while (upSamples.length < cols) {
    upSamples.unshift(null);
    downSamples.unshift(null);
    times.unshift(null);
  }

  const calcCeiling = (arr) => {
    const rawMax = Math.max(1 / 1024, ...arr) * 1.1;
    const magnitude = 10 ** Math.floor(Math.log10(rawMax));
    return Math.ceil(rawMax / magnitude * 2) * magnitude / 2;
  };
  const upMax = calcCeiling(upSamples);
  const downMax = calcCeiling(downSamples);

  netUnifiedMeta = {
    cols,
    rows,
    upBaseRow,
    downBaseRow,
    splitRow,
    originX,
    originY,
    pitchX,
    pitchY,
    slatW,
    upSamples,
    downSamples,
    times,
    upBarTopY,
    downBarTopY,
    downHeaderY,
    rectW: rect.width,
    rectH: rect.height,
  };

  const isDark = state.theme === "dark";
  const baseRgb = isDark ? [132, 134, 138] : [98, 104, 114];
  const glintRgb = isDark ? [164, 166, 172] : [68, 74, 84];
  const guideColor = isDark ? "rgba(255, 255, 255, 0.085)" : "rgba(30, 36, 48, 0.105)";
  const rimColor = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.44)";
  const vigRgb = isDark ? "24, 23, 29" : "236, 239, 245";

  for (let c = 0; c < cols; c++) {
    const upVal = upSamples[c];
    const downVal = downSamples[c];
    const upNorm = Math.max(0.08, Math.min(1, upVal / upMax));
    const downNorm = Math.max(0.08, Math.min(1, downVal / downMax));
    const upLitCount = upVal > 0 ? Math.max(1, Math.round(upNorm * maxBarRows)) : 0;
    const downLitCount = downVal > 0 ? Math.max(1, Math.round(downNorm * maxBarRows)) : 0;
    const upTopLitRow = upBaseRow - upLitCount + 1;
    const downTopLitRow = downBaseRow - downLitCount + 1;

    const isLatest = c === cols - 1;
    const isUpHovered = netTelemetry.hoveredKind === "up" && netTelemetry.hoveredCol === c;
    const isDownHovered = netTelemetry.hoveredKind === "down" && netTelemetry.hoveredCol === c;

    for (let r = 0; r < rows; r++) {
      const isUpHalf = r < splitRow;
      const isUpBar = r <= upBaseRow && r >= upTopLitRow;
      const isDownBar = r > splitRow && r <= downBaseRow && r >= downTopLitRow;
      const isLit = isUpBar || isDownBar;
      const topLitRow = isUpHalf ? upTopLitRow : downTopLitRow;
      const isHovered = isUpHalf ? (r <= upBaseRow && isUpHovered) : (r > splitRow && r <= downBaseRow && isDownHovered);

      const x = originX + c * pitchX;
      const y = originY + r * pitchY;
      const cx = x + slatW * 0.5;
      const cy = y + slatH * 0.5;

      const { light, tint } = computeSlatWave(cx, cy, rect.width, rect.height);
      drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

      // Smooth outer tick/edge attenuation shared with Detail chart
      const rightTickFade = 0.66 + 0.34 * sgSmoothstep(rect.width - 2, rect.width - 44, cx);
      const leftEdgeFade = 0.78 + 0.22 * sgSmoothstep(2, 22, cx);
      const xBottomFade = isUpHalf
        ? 0.30 + 0.70 * sgSmoothstep(upBaseLineY + 18, upBaseLineY - 2, cy)
        : 0.28 + 0.72 * sgSmoothstep(rect.height - 2, downBaseLineY - 2, cy);

      if (isLit) {
        const isCrest = r === topLitRow;
        const cr = Math.round(baseRgb[0] + (glintRgb[0] - baseRgb[0]) * tint);
        const cg = Math.round(baseRgb[1] + (glintRgb[1] - baseRgb[1]) * tint);
        const cb = Math.round(baseRgb[2] + (glintRgb[2] - baseRgb[2]) * tint);
        const boost = isHovered ? 0.18 : isLatest ? 0.06 : 0;
        const litEdgeAtten = isHovered
          ? 1
          : (0.84 + 0.16 * rightTickFade) * (0.92 + 0.08 * leftEdgeFade);
        const baseAlpha = isCrest ? (isDark ? 0.72 : 0.68) : (isDark ? 0.42 + light * 0.22 : 0.36 + light * 0.22);
        const alpha = Math.min(0.88, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();

        if (isCrest) {
          ctx.fillStyle = rimColor;
          ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
        }
      } else {
        let textDim = 1;
        if (isUpHalf) {
          const topFade = sgSmoothstep(8, Math.max(54, upBarTopY + 6), cy);
          textDim = (0.28 + 0.72 * topFade) * rightTickFade * leftEdgeFade * xBottomFade;
        } else {
          const downFade = sgSmoothstep(downHeaderY - 4, Math.max(downHeaderY + 32, downBarTopY + 6), cy);
          textDim = (0.28 + 0.72 * downFade) * rightTickFade * leftEdgeFade * xBottomFade;
        }
        const hoverBoost = ((isUpHalf && r <= upBaseRow) || (!isUpHalf && r > splitRow && r <= downBaseRow)) && isHovered ? 1.8 : 1;
        const alpha = ((isDark ? 0.068 : 0.058) * textDim * hoverBoost).toFixed(4);
        ctx.fillStyle = `rgba(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]}, ${alpha})`;
        ctx.fill();
      }
    }
  }

  // Lighter, airier smooth optical vignettes strictly outside the lit bar bands
  const topVigEnd = Math.min(rect.height, Math.max(54, upBarTopY + 6));
  fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, rect.width, topVigEnd);

  const midVigEnd = Math.min(rect.height, Math.max(downHeaderY + 26, downBarTopY + 4));
  fillEasedVignette(ctx, 0, upBaseLineY + 2, 0, midVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, upBaseLineY + 2, rect.width, Math.max(0, midVigEnd - (upBaseLineY + 2)));

  const botVigStart = Math.min(rect.height - 2, downBaseLineY + 2);
  fillEasedVignette(ctx, 0, rect.height, 0, botVigStart, vigRgb, isDark ? 0.38 : 0.42, 0, botVigStart, rect.width, rect.height - botVigStart);

  const rightVigW = Math.min(50, rect.width * 0.22);
  fillEasedVignette(ctx, rect.width, 0, rect.width - rightVigW, 0, vigRgb, isDark ? 0.28 : 0.30, rect.width - rightVigW, 0, rightVigW, rect.height);

  const leftVigW = Math.min(22, rect.width * 0.09);
  fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.18 : 0.20, 0, 0, leftVigW, rect.height);

  ctx.save();
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  [upBarTopY, upBarMidY, upBaseLineY, downBarTopY, downBarMidY, downBaseLineY].forEach((gy) => {
    const yLine = Math.round(gy) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(rect.width, yLine);
    ctx.stroke();
  });
  ctx.restore();

  const upYMaxRow = document.getElementById("net-up-ymax-row");
  const upYMidRow = document.getElementById("net-up-ymid-row");
  const upXRow = document.getElementById("net-up-x-row");
  const safeUpMaxTop = Math.max(topClearY, upBarTopY - 11);
  const safeUpMidTop = Math.max(safeUpMaxTop + 13, upBarMidY - 11);
  if (upYMaxRow) upYMaxRow.style.top = `${safeUpMaxTop}px`;
  if (upYMidRow) upYMidRow.style.top = `${safeUpMidTop}px`;
  if (upXRow) upXRow.style.top = `${Math.round(upBaseLineY + 7)}px`;

  const downHeader = document.getElementById("net-down-header");
  const downYMaxRow = document.getElementById("net-down-ymax-row");
  const downYMidRow = document.getElementById("net-down-ymid-row");
  const downXRow = document.getElementById("net-down-x-row");
  const downClearY = downHeader ? downHeaderY + Math.max(18, downHeader.offsetHeight + 2) : downHeaderY + 18;
  const safeDownMaxTop = Math.max(downClearY, downBarTopY - 11);
  const safeDownMidTop = Math.max(safeDownMaxTop + 13, downBarMidY - 11);
  if (downHeader) downHeader.style.top = `${downHeaderY}px`;
  if (downYMaxRow) downYMaxRow.style.top = `${safeDownMaxTop}px`;
  if (downYMidRow) downYMidRow.style.top = `${safeDownMidTop}px`;
  if (downXRow) downXRow.style.top = `${Math.round(downBaseLineY + 7)}px`;

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setTxt("net-up-ymax", fmtRateTick(upMax));
  setTxt("net-up-ymid", fmtRateTick(upMax * 0.5));
  setTxt("net-up-xstart", times.find(Boolean) || "");
  setTxt("net-up-xend", times[times.length - 1] || "");

  setTxt("net-down-ymax", fmtRateTick(downMax));
  setTxt("net-down-ymid", fmtRateTick(downMax * 0.5));
  setTxt("net-down-xstart", times.find(Boolean) || "");
  setTxt("net-down-xend", times[times.length - 1] || "");
}

function renderSummary() {
  if (!state.settings.show_summary_bar) return;
  const el = document.getElementById("summary-bar");

  const onlineNodes = state.nodes.filter((n) => n.online);
  const totalUp = onlineNodes.reduce((s, n) => s + n.netOut, 0);
  const totalDown = onlineNodes.reduce((s, n) => s + n.netIn, 0);
  const totalTraffic = state.nodes.reduce((s, n) => s + n.totalUpGB + n.totalDownGB, 0);

  const upLabel = state.lang === "zh-CN" ? "上行" : "Upload";
  const downLabel = state.lang === "zh-CN" ? "下行" : "Download";

  if (!document.getElementById("network-traffic-cell")) {
    el.innerHTML = `
      <div id="network-traffic-cell" class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <canvas id="net-slats-canvas" class="absolute inset-0 block h-full w-full cursor-crosshair" aria-hidden="true"></canvas>

        <div id="net-top-header" class="pointer-events-none relative z-10 flex flex-col gap-0.5 px-4 pt-3.5">
          <div class="flex min-h-7 flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5">
            <span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
              <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span id="net-title-label"></span>
            </span>
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mono-num text-[10px] sm:text-[10.5px]">
              <span class="whitespace-nowrap" style="color: var(--sg-subtle-fg);"><span id="net-today-label"></span> <strong id="net-today-val" class="font-medium" style="color: var(--sg-fg);"></strong></span>
              <span class="whitespace-nowrap" style="color: var(--sg-subtle-fg);"><span id="net-total-label"></span> <strong id="net-total-val" class="font-medium" style="color: var(--sg-fg);"></strong></span>
            </div>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span id="net-up-label" class="whitespace-nowrap text-[10.5px]" style="color: var(--sg-muted-fg);"></span>
            <span class="mono-num whitespace-nowrap text-[11.5px] font-semibold"><span id="net-up-rate"></span> <span id="net-up-unit" class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);"></span></span>
          </div>
        </div>

        <div id="net-up-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-up-ymax"></span>
        </div>
        <div id="net-up-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-up-ymid"></span>
        </div>
        <div id="net-up-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-4 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-up-xstart"></span>
          <span id="net-up-xend"></span>
        </div>

        <div id="net-down-header" class="pointer-events-none absolute inset-x-0 z-10 flex items-baseline justify-between gap-2 px-4">
          <span id="net-down-label" class="text-[10.5px]" style="color: var(--sg-muted-fg);"></span>
          <span class="mono-num text-[11.5px] font-semibold"><span id="net-down-rate"></span> <span id="net-down-unit" class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);"></span></span>
        </div>

        <div id="net-down-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-down-ymax"></span>
        </div>
        <div id="net-down-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-down-ymid"></span>
        </div>
        <div id="net-down-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-4 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-down-xstart"></span>
          <span id="net-down-xend"></span>
        </div>

        <div id="net-unified-tip" class="sg-popover pointer-events-none absolute z-20 hidden rounded-md px-1.5 py-0.5 mono-num text-[9.5px] whitespace-nowrap"></div>
      </div>
    `;

    const netCanvas = document.getElementById("net-slats-canvas");
    const tipEl = document.getElementById("net-unified-tip");
    if (netCanvas && tipEl) {
      netCanvas.addEventListener("mousemove", (evt) => {
        const meta = netUnifiedMeta;
        if (!meta) return;
        const r = netCanvas.getBoundingClientRect();
        const mx = evt.clientX - r.left;
        const my = evt.clientY - r.top;
        const c = Math.floor((mx - meta.originX) / meta.pitchX);
        const rowIdx = Math.floor((my - meta.originY) / meta.pitchY);
        const inUp = rowIdx >= 0 && rowIdx <= meta.upBaseRow;
        const inDown = rowIdx > meta.splitRow && rowIdx <= meta.downBaseRow;
        if (c >= 0 && c < meta.cols && (inUp || inDown) && meta.times[c]) {
          const isUp = inUp;
          const kind = isUp ? "up" : "down";
          if (netTelemetry.hoveredKind !== kind || netTelemetry.hoveredCol !== c) {
            netTelemetry.hoveredKind = kind;
            netTelemetry.hoveredCol = c;
            drawNetSlatsChartCanvas();
          }
          const val = isUp ? meta.upSamples[c] : meta.downSamples[c];
          const ts = meta.times[c];
          const arrow = isUp ? "↑" : "↓";
          tipEl.textContent = `${ts} · ${arrow} ${formatRate(val)}`;
          tipEl.style.transform = "none";
          tipEl.classList.remove("hidden");
          const tipW = tipEl.offsetWidth || 120;
          const barCenterX = meta.originX + c * meta.pitchX + meta.slatW * 0.5;
          const preferredLeft = barCenterX > r.width * 0.58 ? barCenterX - tipW - 6 : barCenterX + 6;
          const clampedLeft = Math.max(8, Math.min(r.width - tipW - 8, preferredLeft));
          tipEl.style.left = `${Math.round(clampedLeft)}px`;
          tipEl.style.top = isUp
            ? `${Math.max(46, Math.round(meta.upBarTopY - 4))}px`
            : `${Math.max(meta.downHeaderY + 20, Math.round(meta.downBarTopY - 4))}px`;
        } else if (netTelemetry.hoveredKind !== null) {
          netTelemetry.hoveredKind = null;
          netTelemetry.hoveredCol = -1;
          tipEl.classList.add("hidden");
          drawNetSlatsChartCanvas();
        }
      });

      netCanvas.addEventListener("mouseleave", () => {
        if (netTelemetry.hoveredKind !== null) {
          netTelemetry.hoveredKind = null;
          netTelemetry.hoveredCol = -1;
          drawNetSlatsChartCanvas();
        }
        tipEl.classList.add("hidden");
      });
    }
  }

  const setTxt = (id, txt) => {
    const node = document.getElementById(id);
    if (node) node.textContent = txt;
  };
  const upParts = formatRateParts(totalUp);
  const downParts = formatRateParts(totalDown);
  setTxt("net-title-label", t("networkTitle"));
  setTxt("net-today-label", t("todayTraffic"));
  setTxt("net-today-val", netTelemetry.todayGB === null ? "—" : formatTrafficGB(netTelemetry.todayGB));
  setTxt("net-total-label", t("totalTraffic"));
  setTxt("net-total-val", state.dataStatus === "loading" || state.dataStatus === "private" ? "—" : formatTrafficGB(totalTraffic));
  setTxt("net-up-label", `↑ ${upLabel}`);
  setTxt("net-up-rate", upParts.value);
  setTxt("net-up-unit", upParts.unit);
  setTxt("net-down-label", `↓ ${downLabel}`);
  setTxt("net-down-rate", downParts.value);
  setTxt("net-down-unit", downParts.unit);

  drawNetSlatsChartCanvas();
}


export { fmtClock, fmtRateTick, drawSlatRoundRect, sgSmoothstep, fillEasedVignette, computeSlatWave, drawNetSlatsChartCanvas, renderSummary };
