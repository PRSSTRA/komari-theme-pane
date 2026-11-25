import { escapeHTML, readAPI } from "./komari.js";

const HOUR = 3_600_000;
const PING_PALETTES = ["ct", "cu", "cm"];
const validNumber = (value) => Number.isFinite(value) && value >= 0;
const formatCapacity = (value) => value > 0 ? `${Number(value.toFixed(1))} GB` : "—";

function loadSamples(records) {
  return records.flatMap((row) => {
    const time = Date.parse(row?.time);
    if (!Number.isFinite(time)) return [];
    const cpu = validNumber(row.cpu) ? row.cpu : null;
    const ram = validNumber(row.ram) && validNumber(row.ram_total) && row.ram_total > 0
      ? (100 * row.ram) / row.ram_total : null;
    const up = validNumber(row.net_out) ? row.net_out / 1024 ** 2 : null;
    const down = validNumber(row.net_in) ? row.net_in / 1024 ** 2 : null;
    return cpu !== null || ram !== null || up !== null || down !== null
      ? [{ time, values: [cpu, ram, up, down] }] : [];
  });
}

function pingRoutes(records, tasks) {
  const routes = new Map();
  function getRoute(id) {
    let route = routes.get(id);
    if (!route) {
      const key = PING_PALETTES[routes.size % PING_PALETTES.length];
      route = { id, key, swatch: `var(--sg-series-${key})`, records: [], latestTime: -Infinity, latest: null, avgLoss: null, failures: 0 };
      routes.set(id, route);
    }
    return route;
  }
  for (const task of tasks ?? []) {
    const id = Number(task?.id);
    if (!Number.isSafeInteger(id) || id < 1) continue;
    if (typeof task.name === "string" && task.name.trim()) getRoute(id).name = escapeHTML(task.name);
    else getRoute(id);
  }
  for (const row of records) {
    const id = Number(row?.task_id);
    const time = Date.parse(row?.time);
    const value = row?.value;
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isFinite(time) || (value !== -1 && !validNumber(value))) continue;
    const route = getRoute(id);
    const loss = value === -1 ? 100 : 0;
    const latency = loss ? null : value;
    route.records.push({ time, values: [latency, loss] });
    if (loss) route.failures++;
    if (time >= route.latestTime) {
      route.latestTime = time;
      route.latest = latency;
    }
  }
  for (const route of routes.values()) {
    if (route.records.length) route.avgLoss = 100 * route.failures / route.records.length;
  }
  return [...routes.values()];
}

// Average only observed values in each time column; an empty column is never a timeout.
function bucketValues(records, count, start, end, size) {
  const sums = Array.from({ length: size }, () => new Float64Array(count));
  const totals = Array.from({ length: size }, () => new Uint32Array(count));
  const span = end - start;
  for (const { time, values } of records) {
    if (time < start || time > end) continue;
    const col = Math.min(count - 1, Math.floor((time - start) * count / span));
    for (let i = 0; i < size; i++) {
      if (values[i] === null) continue;
      sums[i][col] += values[i];
      totals[i][col]++;
    }
  }
  return sums.map((sum, i) => Array.from(sum, (value, col) => totals[i][col] ? value / totals[i][col] : null));
}

export function createDetail({
  state, t, formatUptime, formatRate, formatRateParts, formatTrafficGB, formatPriceLabel,
  formatCityName, formatGroupLabel, normalizeGroupName, renderFlagBadge, isNodeFeatured,
  renderPinnedBadge, togglePinnedNode, PIN_BTN_ICON_SVG, drawSlatRoundRect, sgSmoothstep,
  fillEasedVignette, computeSlatWave, fmtClock, fmtRateTick,
}) {
  let history = null;
  let syncDetailHistory = null;

  function requestHistory(entry, kind) {
    const series = entry[kind];
    series.status = "loading";
    const params = new URLSearchParams({ uuid: entry.uuid, hours: entry.hours });
    const requestTime = Date.now();
    readAPI(`/api/records/${kind}?${params}`, { signal: entry.controller.signal })
      .then((data) => {
        if (history !== entry) return;
        if (!Array.isArray(data?.records) && !(data?.records === null && data.count === 0)) {
          throw new Error("Invalid history response");
        }
        const records = data.records ?? [];
        series.end = requestTime;
        if (kind === "ping") {
          series.routes = pingRoutes(records, Array.isArray(data.tasks) ? data.tasks : []);
          for (const route of series.routes) series.end = Math.max(series.end, route.latestTime);
          if (!series.routes.some((route) => route.id === state.detailPingFocus)) state.detailPingFocus = -1;
        } else {
          series.records = loadSamples(records);
          for (const row of series.records) series.end = Math.max(series.end, row.time);
          series.hasLoad = series.records.some(({ values }) => values[0] !== null || values[1] !== null);
          series.hasNetwork = series.records.some(({ values }) => values[2] !== null || values[3] !== null);
          series.chartBuckets = null;
          series.netBuckets = null;
        }
        series.start = series.end - entry.hours * HOUR;
        series.status = "ready";
      })
      .catch(() => {
        if (history === entry) series.status = "error";
      })
      .finally(() => {
        if (history === entry) syncDetailHistory?.();
      });
  }

  function selectHistory(uuid) {
    if (history?.uuid === uuid && history.hours === state.detailHours) return;
    history?.controller.abort();
    if (history?.uuid !== uuid) state.detailPingFocus = -1;
    const routes = history?.uuid === uuid ? history.ping.routes.map((route) => ({
      id: route.id, key: route.key, swatch: route.swatch, name: route.name,
      records: [], latest: null, avgLoss: null,
    })) : [];
    history = {
      uuid, hours: state.detailHours, controller: new AbortController(),
      load: { records: [] }, ping: { routes },
    };
    requestHistory(history, "load");
    requestHistory(history, "ping");
  }

  function loadBuckets(cols, key) {
    const series = history.load;
    if (series[key]?.cols !== cols) {
      series[key] = { cols, values: bucketValues(series.records, cols, series.start, series.end, 4) };
    }
    return series[key].values;
  }

  function visiblePingRoutes() {
    const routes = history.ping.routes;
    const focused = routes.find((route) => route.id === state.detailPingFocus);
    return focused ? [focused] : routes;
  }

  function visibleRoutesHaveRecords() {
    return visiblePingRoutes().some((route) => route.records.length > 0);
  }

  function pingBuckets(cols) {
    const series = history.ping;
    return visiblePingRoutes().map((route) => {
      if (route.cols !== cols) {
        route.cols = cols;
        [route.values, route.losses] = bucketValues(route.records, cols, series.start, series.end, 2);
      }
      return { key: route.key, swatch: route.swatch, values: route.values, losses: route.losses, label: pingRouteName(route) };
    });
  }

  function pingRouteName(route) {
    return route.name ?? (state.lang === "zh-CN" ? `任务 ${route.id}` : `Task ${route.id}`);
  }

  function historyStatusHtml(series, kind, hasRecords) {
    if (series.status === "ready" && hasRecords) return "";
    const isZh = state.lang === "zh-CN";
    if (series.status === "loading") return isZh ? "正在加载历史记录…" : "Loading history…";
    if (series.status === "error") {
      const message = isZh ? "无法加载历史记录" : "Could not load history";
      const retry = isZh ? "重试" : "Retry";
      return `<span>${message}</span><button type="button" data-slot="button" data-variant="outline" data-history-retry="${kind}" class="pointer-events-auto px-2.5 py-1">${retry}</button>`;
    }
    return isZh ? "此时间段暂无记录" : "No records in this time range";
  }

  let detailChartMeta = null;
  let detailChartHoverCol = -1;
  let detailCloseTimer = 0;

  function closeDetailModal() {
    state.selectedNodeId = null;
    history?.controller.abort();
    history = null;
    syncDetailHistory = null;
    detailChartHoverCol = -1;
    detailChartMeta = null;
    detailNetMeta = null;
    detailNetHover = { kind: null, col: -1 };
    const modal = document.getElementById("detail-modal");
    if (!modal || !modal.open) return;
    modal.setAttribute("data-open", "false");
    clearTimeout(detailCloseTimer);
    detailCloseTimer = setTimeout(() => {
      if (!state.selectedNodeId && modal.open) {
        modal.close();
      }
    }, 170);
  }

  function getDetailTimeLabels(hours) {
    if (hours === 1) return ["-60m", "-48m", "-36m", "-24m", "-12m", "Now"];
    if (hours === 24) return ["-24h", "-19h", "-14h", "-10h", "-5h", "Now"];
    return ["-6h", "-5h", "-4h", "-2h", "-1h", "Now"];
  }

  function fmtDetailOffset(hours, frac) {
    if (frac >= 0.985) return "Now";
    const minsAgo = Math.max(1, Math.round((1 - frac) * hours * 60));
    if (minsAgo < 60) return `-${minsAgo}m`;
    const h = Math.floor(minsAgo / 60);
    const m = minsAgo % 60;
    return m === 0 ? `-${h}h` : `-${h}h ${m}m`;
  }

  function drawDetailSlatsChartCanvas() {
    const card = document.getElementById("detail-chart-card");
    const canvas = document.getElementById("detail-slats-canvas");
    const plotArea = document.getElementById("detail-plot-area");
    if (!card || !canvas || !plotArea || history?.uuid !== state.selectedNodeId) return;

    const W = card.offsetWidth;
    const H = card.offsetHeight;
    const plotBoxTop = plotArea.offsetTop;
    const plotBoxH = plotArea.offsetHeight;
    if (W < 20 || H < 20 || plotBoxH < 20) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Finer Micro Slats pitch (~22-24 vertical rows) for crisp multi-series legibility
    const slatW = 5.5;
    const slatH = 5.5;
    const gapX = 2.5;
    const gapY = 1.8;
    const roundness = 0.25;
    const pitchX = slatW + gapX;
    const pitchY = slatH + gapY;
    const radius = Math.max(0.6, roundness * Math.min(slatW * 0.5, slatH * 0.5));

    const cols = Math.max(24, Math.ceil((W + gapX) / pitchX));
    const rows = Math.max(22, Math.ceil((H + gapY) / pitchY) + 1);
    const totalGridW = cols * pitchX - gapX;
    const totalGridH = rows * pitchY - gapY;
    const originX = (W - totalGridW) * 0.5;
    const originY = (H - totalGridH) * 0.5;

    // Full-bleed left-to-right plot area spanning the entire card width (like Network & Traffic)
    const isLoad = state.detailTab === "load";
    const padT = 10;
    const padB = 26;

    const plotColStart = 0;
    const plotColEnd = cols - 1;
    const plotCols = cols;

    const plotRowStart = Math.max(1, Math.ceil((plotBoxTop + padT - originY) / pitchY));
    const plotRowEnd = Math.min(rows - 2, Math.floor((plotBoxTop + plotBoxH - padB - slatH - originY) / pitchY));
    const plotRows = Math.max(12, plotRowEnd - plotRowStart + 1);

    const gridLeftX = 0;
    const gridRightX = W;
    const gridTopY = originY + plotRowStart * pitchY;
    let gridBottomY = originY + plotRowEnd * pitchY + slatH;

    const isDark = state.theme === "dark";
    const dormantBaseRgb = isDark ? [125, 125, 125] : [98, 104, 114];
    const guideColor = isDark ? "rgba(255, 255, 255, 0.085)" : "rgba(30, 36, 48, 0.105)";
    const vigRgb = isDark ? "24, 23, 29" : "236, 239, 245";

    // Restrained low-saturation Solid Glass multi-series palettes (CPU=CT sky blue, RAM=CM=--sg-success online green)
    const seriesPalettes = isDark
      ? {
          cpu: { base: [150, 196, 236], glint: [176, 218, 252], rim: "rgba(218, 240, 255, 0.56)" },
          ram: { base: [99, 186, 137], glint: [126, 210, 162], rim: "rgba(186, 242, 210, 0.56)" },
          ct: { base: [150, 196, 236], glint: [176, 218, 252], rim: "rgba(218, 240, 255, 0.56)" },
          cu: { base: [219, 165, 89], glint: [238, 192, 124], rim: "rgba(252, 226, 184, 0.56)" },
          cm: { base: [99, 186, 137], glint: [126, 210, 162], rim: "rgba(186, 242, 210, 0.56)" },
          loss: { rgb: [218, 114, 105], rim: "rgba(255, 198, 192, 0.62)" },
        }
      : {
          cpu: { base: [68, 118, 164], glint: [44, 90, 134], rim: "rgba(255, 255, 255, 0.52)" },
          ram: { base: [86, 168, 121], glint: [64, 146, 100], rim: "rgba(255, 255, 255, 0.52)" },
          ct: { base: [68, 118, 164], glint: [44, 90, 134], rim: "rgba(255, 255, 255, 0.52)" },
          cu: { base: [212, 154, 82], glint: [188, 130, 58], rim: "rgba(255, 255, 255, 0.52)" },
          cm: { base: [86, 168, 121], glint: [64, 146, 100], rim: "rgba(255, 255, 255, 0.52)" },
          loss: { rgb: [217, 107, 99], rim: "rgba(255, 255, 255, 0.58)" },
        };

    // Compute unified bottom row shared by Load History & Ping Latency so 0%/0ms and X-axis never shift
    const pCnt = history.ping.routes.length;
    const pingSpanRows = pCnt >= 2
      ? Math.min(plotRows, Math.max(5, Math.floor((plotRows - (pCnt - 1)) / pCnt)) * pCnt + (pCnt - 1))
      : plotRows;
    const loadMidGapRows = 3;
    const loadTrackRows = Math.max(5, Math.floor((pingSpanRows - loadMidGapRows) / 2));
    const unifiedRowEnd = Math.min(plotRowStart + pingSpanRows - 1, plotRowStart + loadTrackRows * 2 + loadMidGapRows - 1);

    if (isLoad) {
      // ---- Mode A: Full-Width Dual-Track Micro Slats (Top: CPU, Bottom: RAM) ----
      const midGapRows = loadMidGapRows;
      const trackRows = loadTrackRows;
      const cpuRowStart = plotRowStart;
      const cpuRowEnd = cpuRowStart + trackRows - 1;
      const gapRow = cpuRowEnd + 1;
      const gapRowY = originY + gapRow * pitchY;
      const ramRowStart = cpuRowEnd + midGapRows + 1;
      const ramRowEnd = unifiedRowEnd;
      const effRamRows = Math.max(5, ramRowEnd - ramRowStart + 1);

      const cpuTopY = originY + cpuRowStart * pitchY;
      const cpuBottomY = originY + cpuRowEnd * pitchY + slatH;
      const ramTopY = originY + ramRowStart * pitchY;
      const ramBottomY = originY + ramRowEnd * pitchY + slatH;
      gridBottomY = ramBottomY;

      const [cpuValues, ramValues] = loadBuckets(plotCols, "chartBuckets");
      const seriesDefs = [
        { label: "CPU", swatch: "var(--sg-series-cpu)", values: cpuValues },
        { label: "RAM", swatch: "var(--sg-series-ram)", values: ramValues },
      ];

      const cpuTops = cpuValues.map((v) => {
        if (v === null) return Infinity;
        const lit = Math.max(1, Math.round(Math.max(0.06, Math.min(1, v / 100)) * trackRows));
        return Math.max(cpuRowStart, cpuRowEnd - lit + 1);
      });
      const ramTops = ramValues.map((v) => {
        if (v === null) return Infinity;
        const lit = Math.max(1, Math.round(Math.max(0.06, Math.min(1, v / 100)) * effRamRows));
        return Math.max(ramRowStart, ramRowEnd - lit + 1);
      });

      detailChartMeta = history.load.hasLoad ? {
        W,
        H,
        plotBoxTop,
        originX,
        originY,
        pitchX,
        pitchY,
        slatW,
        plotColStart,
        plotColEnd,
        plotCols,
        gridLeftX,
        gridRightX,
        gridTopY: cpuTopY,
        gridBottomY: ramBottomY,
        seriesDefs,
        unit: "%",
        hours: state.detailHours,
      } : null;

      for (let c = 0; c < cols; c++) {
        const pCol = c;
        const isLatest = c === cols - 1;
        const isHovered = detailChartHoverCol === pCol;

        for (let r = 0; r < rows; r++) {
          const x = originX + c * pitchX;
          const y = originY + r * pitchY;
          const cx = x + slatW * 0.5;
          const cy = y + slatH * 0.5;

          const isCpuHalf = r < gapRow;
          const inCpuTrack = r >= cpuRowStart && r <= cpuRowEnd;
          const inRamTrack = r >= ramRowStart && r <= ramRowEnd;

          const isCpuLit = inCpuTrack && r >= cpuTops[pCol];
          const isRamLit = inRamTrack && r >= ramTops[pCol];

          const { light, tint } = computeSlatWave(cx, cy, W, H);
          drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

          const leftTickFade = 0.62 + 0.38 * sgSmoothstep(2, 46, cx);
          const rightEdgeFade = 0.78 + 0.22 * sgSmoothstep(W - 2, W - 22, cx);

          if (isCpuLit || isRamLit) {
            const pal = isCpuLit ? seriesPalettes.cpu : seriesPalettes.ram;
            const isCrest = isCpuLit ? r === cpuTops[pCol] : r === ramTops[pCol];
            const cr = Math.round(pal.base[0] + (pal.glint[0] - pal.base[0]) * tint);
            const cg = Math.round(pal.base[1] + (pal.glint[1] - pal.base[1]) * tint);
            const cb = Math.round(pal.base[2] + (pal.glint[2] - pal.base[2]) * tint);
            const boost = isHovered ? 0.14 : isLatest ? 0.06 : 0;
            const litEdgeAtten = isHovered ? 1 : (0.82 + 0.18 * leftTickFade) * (0.92 + 0.08 * rightEdgeFade);
            const baseAlpha = isCrest ? (isDark ? 0.86 : 0.82) : (isDark ? 0.62 + light * 0.18 : 0.58 + light * 0.18);
            const alpha = Math.min(0.96, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
            ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
            ctx.fill();

            if (isCrest) {
              ctx.fillStyle = pal.rim;
              ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
            }
          } else {
            let vertVis = 1;
            if (isCpuHalf) {
              vertVis = 0.28 + 0.72 * sgSmoothstep(6, cpuTopY + 4, cy);
            } else {
              const downFade = 0.28 + 0.72 * sgSmoothstep(gapRowY, ramTopY + 10, cy);
              const botFade = 0.28 + 0.72 * sgSmoothstep(H - 2, ramBottomY + 4, cy);
              vertVis = downFade * botFade;
            }
            const edgeVis = vertVis * leftTickFade * rightEdgeFade;
            const hoverBoost = (inCpuTrack || inRamTrack) && isHovered ? 1.8 : 1;
            const alpha = ((isDark ? 0.068 : 0.058) * edgeVis * hoverBoost).toFixed(4);
            ctx.fillStyle = `rgba(${dormantBaseRgb[0]}, ${dormantBaseRgb[1]}, ${dormantBaseRgb[2]}, ${alpha})`;
            ctx.fill();
          }
        }
      }

      // Smooth edge vignettes over outer text & ticks + Network-&-Traffic-style downward separator at gapRowY
      const topVigEnd = Math.min(H, cpuTopY + 4);
      fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, W, topVigEnd);

      const downVigEnd = Math.min(H, ramTopY + 12);
      fillEasedVignette(ctx, 0, gapRowY, 0, downVigEnd, vigRgb, isDark ? 0.38 : 0.40, 0, gapRowY, W, downVigEnd - gapRowY);

      const leftVigW = Math.min(54, W * 0.2);
      fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.42 : 0.46, 0, 0, leftVigW, H);

      const botVigStart = Math.min(H - 2, ramBottomY + 2);
      fillEasedVignette(ctx, 0, H, 0, botVigStart, vigRgb, isDark ? 0.36 : 0.40, 0, botVigStart, W, H - botVigStart);

      const rightVigW = Math.min(22, W * 0.08);
      fillEasedVignette(ctx, W, 0, W - rightVigW, 0, vigRgb, isDark ? 0.20 : 0.22, W - rightVigW, 0, rightVigW, H);

      // Full-width dashed horizontal reference lines (100% / 50% / 0% per track)
      ctx.save();
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      [
        { top: cpuTopY, bot: cpuBottomY },
        { top: ramTopY, bot: ramBottomY },
      ].forEach((tr) => {
        [0, 0.5, 1].forEach((ratio) => {
          const gy = Math.round(tr.top + (tr.bot - tr.top) * (1 - ratio)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        });
      });
      ctx.restore();

      // Update Y-axis ticks floating inside the left vignette
      const yTicksEl = document.getElementById("detail-yticks");
      if (yTicksEl) {
        const tickRows = [
          { top: cpuTopY, bot: cpuBottomY },
          { top: ramTopY, bot: ramBottomY },
        ];
        const yHtml = tickRows
          .map((tr) =>
            [0, 0.5, 1]
              .map((ratio) => {
                const topPx = tr.top + (tr.bot - tr.top) * (1 - ratio) - plotBoxTop;
                const val = Math.round(100 * ratio);
                return `<span class="absolute left-3 -translate-y-1/2 text-left mono-num text-[9.5px] leading-none" style="top: ${topPx.toFixed(1)}px; color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">${val}%</span>`;
              })
              .join("")
          )
          .join("");
        if (yTicksEl.dataset.sig !== yHtml) {
          yTicksEl.dataset.sig = yHtml;
          yTicksEl.innerHTML = yHtml;
        }
      }
    } else {
      // ---- Mode B: Dynamic N-Track Separated Micro Slats Ping + L1 Packet Loss (1 deleted blank row between tracks) ----
      const visibleSeries = pingBuckets(plotCols);
      let peak = 0;
      for (const series of visibleSeries) {
        for (const value of series.values) if (value > peak) peak = value;
      }
      const maxY = Math.max(120, Math.ceil((peak + 10) / 40) * 40);
      const trackCount = visibleSeries.length;

      let tracks = [];
      const gapRowSet = new Set();

      if (trackCount === 1) {
        // Lock single-track Ping bottom row to unifiedRowEnd (exact same height & X-axis position as Load History)
        const soloRowEnd = unifiedRowEnd;
        tracks = [
          {
            ...visibleSeries[0],
            rStart: plotRowStart,
            rEnd: soloRowEnd,
            rCount: Math.max(6, soloRowEnd - plotRowStart + 1),
          },
        ];
      } else if (trackCount > 1) {
        // N tracks separated by exactly 1 deleted blank row (no slats drawn on separator rows)
        const gapRows = 1;
        const trackRows = Math.max(5, Math.floor((plotRows - gapRows * (trackCount - 1)) / trackCount));
        for (let i = 0; i < trackCount; i++) {
          const rStart = plotRowStart + i * (trackRows + gapRows);
          const rEnd = i === trackCount - 1 ? Math.min(plotRowEnd, rStart + trackRows - 1) : rStart + trackRows - 1;
          tracks.push({
            ...visibleSeries[i],
            rStart,
            rEnd,
            rCount: Math.max(4, rEnd - rStart + 1),
          });
          if (i < trackCount - 1) {
            gapRowSet.add(rEnd + 1);
          }
        }
      }

      tracks.forEach((tr) => {
        tr.topY = originY + tr.rStart * pitchY;
        tr.botY = originY + tr.rEnd * pitchY + slatH;
        tr.tops = tr.values.map((v, idx) => {
          if (tr.losses[idx] >= 100 || v === null) return -1;
          const norm = Math.max(0.05, Math.min(1, v / maxY));
          const lit = Math.max(1, Math.round(norm * tr.rCount));
          return Math.max(tr.rStart, tr.rEnd - lit + 1);
        });
      });

      gridBottomY = tracks.at(-1)?.botY ?? originY + unifiedRowEnd * pitchY + slatH;
      const gridPlotH = gridBottomY - gridTopY;

      detailChartMeta = visibleRoutesHaveRecords() ? {
        W,
        H,
        plotBoxTop,
        originX,
        originY,
        pitchX,
        pitchY,
        slatW,
        plotColStart,
        plotColEnd,
        plotCols,
        gridLeftX: 0,
        gridRightX: W,
        gridTopY,
        gridBottomY,
        seriesDefs: visibleSeries,
        unit: "ms",
        hours: state.detailHours,
      } : null;

      const lossPal = seriesPalettes.loss;

      for (let c = 0; c < cols; c++) {
        const pCol = c;
        const isLatest = c === cols - 1;
        const isHovered = detailChartHoverCol === pCol;

        for (let r = 0; r < rows; r++) {
          // Deleted separator row: skip drawing any slat for a crisp 1-row negative-space channel
          if (gapRowSet.has(r)) continue;

          const x = originX + c * pitchX;
          const y = originY + r * pitchY;
          const cx = x + slatW * 0.5;
          const cy = y + slatH * 0.5;

          let activeTr = null;
          for (let tIdx = 0; tIdx < tracks.length; tIdx++) {
            if (r >= tracks[tIdx].rStart && r <= tracks[tIdx].rEnd) {
              activeTr = tracks[tIdx];
              break;
            }
          }

          const { light, tint } = computeSlatWave(cx, cy, W, H);
          drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

          const leftTickFade = 0.62 + 0.38 * sgSmoothstep(2, 46, cx);
          const rightEdgeFade = 0.78 + 0.22 * sgSmoothstep(W - 2, W - 22, cx);

          if (activeTr) {
            const loss = activeTr.losses[pCol];
            const topRow = activeTr.tops[pCol];
            const boost = isHovered ? 0.14 : isLatest ? 0.06 : 0;
            const litEdgeAtten = isHovered ? 1 : (0.82 + 0.18 * leftTickFade) * (0.90 + 0.10 * rightEdgeFade);

            if (loss >= 100) {
              // L1 Full 100% Packet Loss (Timeout): translucent red outage column + bright red top cap
              const isTopCap = r === activeTr.rStart;
              const baseAlpha = isTopCap
                ? (isDark ? 0.90 : 0.86)
                : (isDark ? 0.22 + light * 0.08 : 0.18 + light * 0.08);
              const alpha = Math.min(0.96, (baseAlpha + boost * (isTopCap ? 1 : 0.45)) * litEdgeAtten).toFixed(3);
              ctx.fillStyle = `rgba(${lossPal.rgb[0]}, ${lossPal.rgb[1]}, ${lossPal.rgb[2]}, ${alpha})`;
              ctx.fill();
              if (isTopCap) {
                ctx.fillStyle = lossPal.rim;
                ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
              }
              continue;
            }

            if (topRow >= 0 && r >= topRow) {
              const isCrest = r === topRow;
              if (loss > 0 && isCrest) {
                // L1 Partial Packet Loss: keep latency bar intact, flag top crest slat in semantic red
                const alpha = Math.min(0.96, ((isDark ? 0.90 : 0.86) + boost) * litEdgeAtten).toFixed(3);
                ctx.fillStyle = `rgba(${lossPal.rgb[0]}, ${lossPal.rgb[1]}, ${lossPal.rgb[2]}, ${alpha})`;
                ctx.fill();
                ctx.fillStyle = lossPal.rim;
                ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
              } else {
                // Style A solid Micro Slats latency bar
                const pal = seriesPalettes[activeTr.key];
                const cr = Math.round(pal.base[0] + (pal.glint[0] - pal.base[0]) * tint);
                const cg = Math.round(pal.base[1] + (pal.glint[1] - pal.base[1]) * tint);
                const cb = Math.round(pal.base[2] + (pal.glint[2] - pal.base[2]) * tint);
                const baseAlpha = isCrest ? (isDark ? 0.86 : 0.82) : (isDark ? 0.62 + light * 0.18 : 0.58 + light * 0.18);
                const alpha = Math.min(0.96, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
                ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
                ctx.fill();
                if (isCrest) {
                  ctx.fillStyle = pal.rim;
                  ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
                }
              }
              continue;
            }
          }

          // Dormant background slats
          const topVis = 0.28 + 0.72 * sgSmoothstep(6, gridTopY + 4, cy);
          const bottomVis = 0.28 + 0.72 * sgSmoothstep(H - 2, gridBottomY + 4, cy);
          const edgeVis = topVis * leftTickFade * bottomVis * rightEdgeFade;
          const hoverBoost = activeTr && isHovered ? 1.8 : 1;
          const alpha = ((isDark ? 0.068 : 0.058) * edgeVis * hoverBoost).toFixed(4);
          ctx.fillStyle = `rgba(${dormantBaseRgb[0]}, ${dormantBaseRgb[1]}, ${dormantBaseRgb[2]}, ${alpha})`;
          ctx.fill();
        }
      }

      // Smooth outer edge vignettes
      const topVigEnd = Math.min(H, gridTopY + 4);
      fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, W, topVigEnd);

      const leftVigW = Math.min(54, W * 0.2);
      fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.42 : 0.46, 0, 0, leftVigW, H);

      const botVigStart = Math.min(H - 2, gridBottomY + 2);
      fillEasedVignette(ctx, 0, H, 0, botVigStart, vigRgb, isDark ? 0.36 : 0.40, 0, botVigStart, W, H - botVigStart);

      const rightVigW = Math.min(22, W * 0.08);
      fillEasedVignette(ctx, W, 0, W - rightVigW, 0, vigRgb, isDark ? 0.20 : 0.22, W - rightVigW, 0, rightVigW, H);

      // Full-width dashed reference guides
      ctx.save();
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      if (tracks.length === 1) {
        [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
          const gy = Math.round(gridTopY + gridPlotH * (1 - ratio)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        });
      } else {
        tracks.forEach((tr) => {
          [tr.topY, tr.botY].forEach((gy) => {
            const yLine = Math.round(gy) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, yLine);
            ctx.lineTo(W, yLine);
            ctx.stroke();
          });
        });
      }
      ctx.restore();

      // Update Y-axis ticks
      const yTicksEl = document.getElementById("detail-yticks");
      if (yTicksEl) {
        let yHtml = "";
        if (tracks.length === 1) {
          yHtml = [0, 0.25, 0.5, 0.75, 1]
            .map((ratio) => {
              const topPx = gridTopY + gridPlotH * (1 - ratio) - plotBoxTop;
              const val = Math.round(maxY * ratio);
              return `<span class="absolute left-3 -translate-y-1/2 text-left mono-num text-[9.5px] leading-none" style="top: ${topPx.toFixed(1)}px; color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">${val}ms</span>`;
            })
            .join("");
        } else {
          yHtml = tracks
            .map((tr) => {
              const topPx = tr.topY - plotBoxTop + 1;
              const botPx = tr.botY - plotBoxTop - 9.5;
              return `
                <span class="absolute left-3 text-left mono-num text-[9px] leading-none" style="top: ${topPx.toFixed(1)}px; color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">${maxY}ms</span>
                <span class="absolute left-3 text-left mono-num text-[9px] leading-none" style="top: ${botPx.toFixed(1)}px; color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">0ms</span>
              `;
            })
            .join("");
        }
        if (yTicksEl.dataset.sig !== yHtml) {
          yTicksEl.dataset.sig = yHtml;
          yTicksEl.innerHTML = yHtml;
        }
      }
    }

    // Update X-axis ticks spanning full width with clean 14px outer edge inset
    const xTicksEl = document.getElementById("detail-xticks");
    if (xTicksEl) {
      const labels = getDetailTimeLabels(state.detailHours);
      const topPx = gridBottomY - plotBoxTop + 9;
      const insetX = 14;
      const xHtml = labels
        .map((lb, idx, arr) => {
          const leftPx = insetX + (idx / (arr.length - 1)) * (W - insetX * 2);
          const tx = idx === 0 ? "0%" : idx === arr.length - 1 ? "-100%" : "-50%";
          return `<span class="absolute mono-num text-[9.5px] leading-none" style="left: ${leftPx.toFixed(1)}px; top: ${topPx.toFixed(1)}px; transform: translateX(${tx}); color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">${lb}</span>`;
        })
        .join("");
      if (xTicksEl.dataset.sig !== xHtml) {
        xTicksEl.dataset.sig = xHtml;
        xTicksEl.innerHTML = xHtml;
      }
    }
  }

  let detailNetMeta = null;
  let detailNetHover = { kind: null, col: -1 };

  function drawDetailNetSlatsCanvas() {
    const canvas = document.getElementById("detail-net-canvas");
    const cell = document.getElementById("detail-net-cell");
    if (!canvas || !cell || history?.uuid !== state.selectedNodeId) return;

    const W = cell.offsetWidth;
    const H = cell.offsetHeight;
    if (W < 20 || H < 20) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Unified square finer Micro Slats synced 1:1 with Load History & Ping Latency
    const slatW = 5.5;
    const slatH = 5.5;
    const gapX = 2.5;
    const gapY = 1.8;
    const roundness = 0.25;
    const pitchX = slatW + gapX;
    const pitchY = slatH + gapY;

    const cols = Math.max(16, Math.ceil((W + gapX) / pitchX));
    const rows = Math.max(22, Math.ceil((H + gapY) / pitchY) + 1);

    const totalGridW = cols * pitchX - gapX;
    const totalGridH = rows * pitchY - gapY;
    const originX = (W - totalGridW) * 0.5;
    const originY = (H - totalGridH) * 0.5;
    const radius = Math.max(0.6, roundness * Math.min(slatW * 0.5, slatH * 0.5));

    // Bars strictly above bottom timestamps (synced 1:1 with homepage Network & Traffic)
    const topHeaderEl = document.getElementById("dnet-top-header");
    const topClearY = topHeaderEl ? topHeaderEl.offsetTop + topHeaderEl.offsetHeight + 4 : 46;
    const downBaseRow = Math.max(
      14,
      Math.min(rows - 2, Math.floor((H - 25 - slatH - originY) / pitchY))
    );
    const downBaseLineY = originY + downBaseRow * pitchY + slatH;

    const upPlotMinY = topClearY + 12;
    const midBudgetPx = 54;
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

    const { start, end } = history.load;
    const [, , upSamples, downSamples] = loadBuckets(cols, "netBuckets");

    const calcNodeCeiling = (arr) => {
      const peak = Math.max(0, ...arr);
      if (peak < 1) {
        const kbPeak = Math.max(10, peak * 1024);
        const kbStep = kbPeak >= 500 ? 200 : kbPeak >= 200 ? 100 : kbPeak >= 80 ? 50 : kbPeak >= 20 ? 20 : 10;
        return (Math.ceil((kbPeak * 1.15) / kbStep) * kbStep) / 1024;
      }
      const rawMax = Math.max(2, peak);
      const step = rawMax >= 200 ? 50 : rawMax >= 80 ? 20 : rawMax >= 30 ? 10 : rawMax >= 10 ? 5 : 2;
      return Math.ceil((rawMax * 1.15) / step) * step;
    };
    const upMax = calcNodeCeiling(upSamples);
    const downMax = calcNodeCeiling(downSamples);

    detailNetMeta = history.load.hasNetwork ? {
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
      start,
      end,
      upBarTopY,
      downBarTopY,
      downHeaderY,
      rectW: W,
      rectH: H,
    } : null;

    const isDark = state.theme === "dark";
    const baseRgb = isDark ? [132, 134, 138] : [98, 104, 114];
    const glintRgb = isDark ? [164, 166, 172] : [68, 74, 84];
    const guideColor = isDark ? "rgba(255, 255, 255, 0.085)" : "rgba(30, 36, 48, 0.105)";
    const rimColor = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.44)";
    const vigRgb = isDark ? "24, 23, 29" : "236, 239, 245";

    for (let c = 0; c < cols; c++) {
      const upVal = upSamples[c];
      const downVal = downSamples[c];
      const upLitCount = upVal > 0 ? Math.max(1, Math.round(Math.max(0.08, Math.min(1, upVal / upMax)) * maxBarRows)) : 0;
      const downLitCount = downVal > 0 ? Math.max(1, Math.round(Math.max(0.08, Math.min(1, downVal / downMax)) * maxBarRows)) : 0;
      const upTopLitRow = upBaseRow - upLitCount + 1;
      const downTopLitRow = downBaseRow - downLitCount + 1;

      const isLatest = c === cols - 1;
      const isUpHovered = detailNetHover.kind === "up" && detailNetHover.col === c;
      const isDownHovered = detailNetHover.kind === "down" && detailNetHover.col === c;

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

        const { light, tint } = computeSlatWave(cx, cy, W, H);
        drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

        const rightTickFade = 0.66 + 0.34 * sgSmoothstep(W - 2, W - 44, cx);
        const leftEdgeFade = 0.78 + 0.22 * sgSmoothstep(2, 22, cx);
        const xBottomFade = isUpHalf
          ? 0.30 + 0.70 * sgSmoothstep(upBaseLineY + 18, upBaseLineY - 2, cy)
          : 0.28 + 0.72 * sgSmoothstep(H - 2, downBaseLineY - 2, cy);

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

    // Lighter, airier smooth optical vignettes synced 1:1 with homepage Network & Traffic
    const topVigEnd = Math.min(H, Math.max(54, upBarTopY + 6));
    fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, W, topVigEnd);

    const midVigEnd = Math.min(H, Math.max(downHeaderY + 26, downBarTopY + 4));
    fillEasedVignette(ctx, 0, upBaseLineY + 2, 0, midVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, upBaseLineY + 2, W, Math.max(0, midVigEnd - (upBaseLineY + 2)));

    const botVigStart = Math.min(H - 2, downBaseLineY + 2);
    fillEasedVignette(ctx, 0, H, 0, botVigStart, vigRgb, isDark ? 0.38 : 0.42, 0, botVigStart, W, H - botVigStart);

    const rightVigW = Math.min(50, W * 0.22);
    fillEasedVignette(ctx, W, 0, W - rightVigW, 0, vigRgb, isDark ? 0.28 : 0.30, W - rightVigW, 0, rightVigW, H);

    const leftVigW = Math.min(22, W * 0.09);
    fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.18 : 0.20, 0, 0, leftVigW, H);

    ctx.save();
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    [upBarTopY, upBarMidY, upBaseLineY, downBarTopY, downBarMidY, downBaseLineY].forEach((gy) => {
      const yLine = Math.round(gy) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, yLine);
      ctx.lineTo(W, yLine);
      ctx.stroke();
    });
    ctx.restore();

    const setPos = (id, topPx) => {
      const el = document.getElementById(id);
      if (el) el.style.top = `${topPx}px`;
    };
    const safeUpMaxTop = Math.max(topClearY, upBarTopY - 11);
    const safeUpMidTop = Math.max(safeUpMaxTop + 13, upBarMidY - 11);
    const downHeaderEl = document.getElementById("dnet-down-header");
    const downClearY = downHeaderEl ? downHeaderY + Math.max(18, downHeaderEl.offsetHeight + 2) : downHeaderY + 18;
    const safeDownMaxTop = Math.max(downClearY, downBarTopY - 11);
    const safeDownMidTop = Math.max(safeDownMaxTop + 13, downBarMidY - 11);
    setPos("dnet-up-ymax-row", safeUpMaxTop);
    setPos("dnet-up-ymid-row", safeUpMidTop);
    setPos("dnet-up-x-row", Math.round(upBaseLineY + 7));
    setPos("dnet-down-header", downHeaderY);
    setPos("dnet-down-ymax-row", safeDownMaxTop);
    setPos("dnet-down-ymid-row", safeDownMidTop);
    setPos("dnet-down-x-row", Math.round(downBaseLineY + 7));

    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    setTxt("dnet-up-ymax", upSamples.some((value) => value !== null) ? fmtRateTick(upMax) : "");
    setTxt("dnet-up-ymid", upSamples.some((value) => value !== null) ? fmtRateTick(upMax * 0.5) : "");
    const xStart = Number.isFinite(start) ? fmtClock(start) : "";
    const xEnd = Number.isFinite(end) ? fmtClock(end) : "";
    setTxt("dnet-up-xstart", xStart);
    setTxt("dnet-up-xend", xEnd);
    setTxt("dnet-down-ymax", downSamples.some((value) => value !== null) ? fmtRateTick(downMax) : "");
    setTxt("dnet-down-ymid", downSamples.some((value) => value !== null) ? fmtRateTick(downMax * 0.5) : "");
    setTxt("dnet-down-xstart", xStart);
    setTxt("dnet-down-xend", xEnd);
  }

  function renderDetailModal() {
    const modal = document.getElementById("detail-modal");
    const dialog = document.getElementById("detail-dialog");
    const node = state.nodes.find((n) => n.uuid === state.selectedNodeId);
    if (!node) {
      closeDetailModal();
      return;
    }

    clearTimeout(detailCloseTimer);
    detailChartHoverCol = -1;
    detailNetHover = { kind: null, col: -1 };
    selectHistory(node.uuid);

    const ramPctVal = node.ramTotal > 0 ? `${((node.ramUsed / node.ramTotal) * 100).toFixed(1)}%` : "—";
    const ramTotal = formatCapacity(node.ramTotal);
    const hasQuota = node.trafficLimitTB > 0;
    const quotaPct = hasQuota ? Math.min(100, (node.trafficUsedTB / node.trafficLimitTB) * 100) : 0;
    const quotaPctColor = quotaPct >= 95 ? "var(--sg-danger)" : quotaPct >= 85 ? "var(--sg-warn)" : "var(--sg-subtle-fg)";

    const isZh = state.lang === "zh-CN";
    const pingTipTitle = isZh ? "点击单独查看该线路（再次点击恢复全部）" : "Click to isolate route (click again to show all)";
    const buildDetailLegendHtml = () => {
      const pf = state.detailPingFocus;
      const loadLegendHtml = `
        <div class="flex flex-wrap items-center gap-4 text-[11px]" style="color: var(--sg-muted-fg);">
          <span class="flex items-center gap-1.5"><span class="h-[7px] w-[7px] rounded-[1.5px]" style="background: var(--sg-series-cpu);"></span>CPU (%) · <strong class="mono-num" style="color: var(--sg-fg);">${node.online ? node.cpu.toFixed(1) + "%" : "—"}</strong></span>
          <span class="flex items-center gap-1.5"><span class="h-[7px] w-[7px] rounded-[1.5px]" style="background: var(--sg-series-ram);"></span>RAM (%) · <strong class="mono-num" style="color: var(--sg-fg);">${ramPctVal}</strong>${node.ramTotal > 0 ? ` <span class="mono-num text-[10.5px]" style="color: var(--sg-subtle-fg);">(${node.ramUsed.toFixed(1)} / ${ramTotal})</span>` : ""}</span>
        </div>
      `;
      const pingPreview = history.ping.routes;
      if (!pingPreview.length) return state.detailTab === "load" ? loadLegendHtml : "";
      const canIsolate = pingPreview.length > 1;
      const renderPingChips = (interactive) => `
        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          ${pingPreview.map((sp) => {
            const lossColor = sp.avgLoss >= 3 ? "var(--sg-danger)" : sp.avgLoss > 0 ? "var(--sg-warn)" : "var(--sg-subtle-fg)";
            const lossTxt = sp.avgLoss === null ? "—" : sp.avgLoss > 0
              ? (isZh ? `丢包 ${sp.avgLoss.toFixed(1)}%` : `${sp.avgLoss.toFixed(1)}% loss`)
              : (isZh ? "0% 丢包" : "0% loss");
            const latTxt = sp.latest === null ? "—" : `${sp.latest}ms`;
            const inner = `
              <span class="h-[7px] w-[7px] rounded-[1.5px]" style="background: ${sp.swatch};"></span>
              <span>${pingRouteName(sp)} · <strong class="mono-num" style="color: var(--sg-fg);">${latTxt}</strong> · <span class="mono-num" style="color: ${lossColor};">${lossTxt}</span></span>
            `;
            if (!interactive || !canIsolate) {
              return `<span class="sg-legend-chip" style="${!canIsolate ? "cursor: default;" : ""}">${inner}</span>`;
            }
            return `
              <button type="button" class="sg-legend-chip" data-ping-focus="${sp.id}" data-focused="${pf === sp.id}" data-muted="${pf >= 0 && pf !== sp.id}" aria-pressed="${pf === sp.id}" title="${pingTipTitle}">
                ${inner}
              </button>
            `;
          }).join("")}
        </div>
      `;
      // Grid overlay keeps #detail-legend-slot locked to Ping's exact height in both tabs at every viewport width
      return `
        <div class="grid items-start">
          <div class="col-start-1 row-start-1 invisible pointer-events-none select-none" aria-hidden="true">${renderPingChips(false)}</div>
          <div class="col-start-1 row-start-1">${state.detailTab === "load" ? loadLegendHtml : renderPingChips(true)}</div>
        </div>
      `;
    };
    const legendHtml = buildDetailLegendHtml();

    const hasBilling = Boolean(node.billingAmount || node.price) || node.expireDays !== null;
    const cycleLabel =
      node.billingCycleDays >= 360
        ? (isZh ? `年付 · ${node.billingCycleDays} 天` : `Yearly · ${node.billingCycleDays}d`)
        : node.billingCycleDays >= 85
          ? (isZh ? `季付 · ${node.billingCycleDays} 天` : `Quarterly · ${node.billingCycleDays}d`)
          : (isZh ? `月付 · ${node.billingCycleDays} 天` : `Monthly · ${node.billingCycleDays}d`);
    const expireBadgeColor =
      node.expireDays !== null && node.expireDays <= 0
        ? "var(--sg-danger)"
        : node.expireDays !== null && node.expireDays <= 7
          ? "var(--sg-warn)"
          : "var(--sg-subtle-fg)";
    const expireRemainTxt =
      node.expireDays === null
        ? ""
        : node.expireDays <= 0
          ? (isZh ? "已到期" : "Expired")
          : (isZh ? `剩 ${node.expireDays} 天` : `${node.expireDays}d left`);

    const sysRows = [];
    if (node.cpu_name) {
      sysRows.push([isZh ? "处理器" : "Processor", `<span class="block truncate" title="${node.cpu_name}">${node.cpu_name}</span>`]);
    }
    sysRows.push([
      isZh ? "核心" : "Cores",
      `<span class="mono-num">${
        node.physicalCores > 0
          ? (isZh ? `${node.cores} 逻辑 / ${node.physicalCores} 物理` : `${node.cores} Logical / ${node.physicalCores} Physical`)
          : (isZh ? `${node.cores} 核` : `${node.cores} Cores`)
      }</span>`,
    ]);
    if (node.os) {
      sysRows.push([isZh ? "操作系统" : "OS", `<span>${node.os}</span>`]);
    }
    if (node.kernel) {
      sysRows.push([isZh ? "内核" : "Kernel", `<span class="mono-num">${node.kernel}</span>`]);
    }
    if (node.arch || node.virt) {
      const archVirtVal = [node.arch, node.virt].filter(Boolean).join(" / ");
      const archVirtLbl = node.arch && node.virt
        ? (isZh ? "架构 / 虚拟化" : "Arch / Virt")
        : node.arch
          ? (isZh ? "架构" : "Arch")
          : (isZh ? "虚拟化" : "Virtualization");
      sysRows.push([archVirtLbl, `<span class="mono-num">${archVirtVal}</span>`]);
    }
    if (node.gpuName && node.gpuName !== "None") {
      sysRows.push(["GPU", `<span class="mono-num">${node.gpuName}</span>`]);
    }
    sysRows.push([
      node.swapTotalGB > 0 ? (isZh ? "内存 / 交换" : "RAM / Swap") : (isZh ? "内存" : "RAM"),
      `<span class="mono-num">${node.swapTotalGB > 0 ? `${ramTotal} / ${formatCapacity(node.swapTotalGB)}` : ramTotal}</span>`,
    ]);
    sysRows.push([
      isZh ? "负载 1m / 5m / 15m" : "Load 1m / 5m / 15m",
      `<span class="mono-num">${node.online ? `${node.load.toFixed(2)} / ${node.load5.toFixed(2)} / ${node.load15.toFixed(2)}` : "—"}</span>`,
    ]);
    if (node.temp > 0) {
      sysRows.push([isZh ? "温度" : "Temp", `<span class="mono-num">${node.online ? `${node.temp.toFixed(1)}°C` : "—"}</span>`]);
    }
    sysRows.push([
      node.tags.length > 0 ? (isZh ? "分组 / 标签" : "Group / Tags") : (isZh ? "分组" : "Group"),
      `<span class="inline-flex flex-wrap items-center justify-end gap-1"><span style="color: var(--sg-fg);">${formatGroupLabel(normalizeGroupName(node.group))}</span>${node.tags.map((tg) => `<span data-slot="tag" class="px-1.5 py-0 text-[10px] leading-[18px]">${tg}</span>`).join("")}</span>`,
    ]);

    // Full-width 4-column Billing & Renewal card (ONLY rendered when logged in AND node has billing data; separator-free like server cards)
    const billingCardHtml = state.loggedIn && hasBilling
      ? `
        <div class="sg-inset-pane mt-3 rounded-xl px-3.5 pt-3 pb-3.5">
          <div class="mb-2.5 flex items-center justify-between gap-2">
            <span class="text-xs font-semibold tracking-tight">${isZh ? "续费信息" : "Billing & Renewal"}</span>
            ${node.region ? `<span class="mono-num text-[10px]" style="color: var(--sg-subtle-fg);">${node.region}</span>` : ""}
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div class="min-w-0">
              <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "续费周期" : "Cycle"}</div>
              <div class="mt-1 text-xs font-medium mono-num" style="color: var(--sg-fg);">${cycleLabel}</div>
            </div>
            <div class="min-w-0">
              <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "到期日" : "Expires"}</div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs font-medium mono-num" style="color: var(--sg-fg);">
                <span>${node.expiredDate || "—"}</span>
                ${expireRemainTxt ? `<span class="text-[10.5px] font-normal" style="color: ${expireBadgeColor};">${expireRemainTxt}</span>` : ""}
              </div>
            </div>
            <div class="min-w-0">
              <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "续费金额" : "Amount"}</div>
              <div class="mt-1 text-xs font-medium mono-num" style="color: var(--sg-fg);">${formatPriceLabel(node.billingAmount || node.price) || "—"}</div>
            </div>
            <div class="min-w-0">
              <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "自动续期标记" : "Auto-Renewal"}</div>
              <div class="mt-1 inline-flex items-center gap-1.5 text-xs font-medium" style="color: ${node.autoRenewal ? "var(--sg-fg)" : "var(--sg-muted-fg)"};">
                <span class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${node.autoRenewal ? "var(--sg-success)" : "var(--sg-subtle-fg)"};"></span>
                <span>${node.autoRenewal ? (isZh ? "已标记" : "Enabled") : (isZh ? "未标记" : "Manual")}</span>
              </div>
            </div>
          </div>
        </div>
      `
      : "";

    const isPinned = isNodeFeatured(node);
    const detailPinActionHtml = state.loggedIn
      ? `
        <button id="btn-detail-pin" type="button" data-detail-pin data-slot="button" data-variant="outline" data-pinned="${isPinned}" class="sg-pin-btn inline-flex h-[22px] shrink-0 items-center gap-1 px-2 text-[11px] font-medium" title="${isPinned ? (isZh ? "取消置顶" : "Unpin server") : (isZh ? "置顶服务器" : "Pin server")}">
          ${PIN_BTN_ICON_SVG}
          <span>${isPinned ? (isZh ? "取消置顶" : "Unpin") : t("pinned")}</span>
        </button>
      `
      : (isPinned ? renderPinnedBadge(node.uuid, false) : "");

    const subtitleParts = [
      formatCityName(node.city),
      formatGroupLabel(normalizeGroupName(node.group)),
      [node.os, node.arch ? `(${node.arch})` : ""].filter(Boolean).join(" "),
    ].filter(Boolean);

    dialog.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            ${renderFlagBadge(node.region, "lg")}
            <h1 id="detail-title" class="min-w-0 truncate text-base font-semibold tracking-tight">${node.name}</h1>
            <span data-slot="badge" data-variant="secondary" class="shrink-0 px-2 py-0.5 text-[11px] mono-num" style="color: ${node.online ? "var(--sg-success)" : "var(--sg-danger)"};">
              <span class="h-[6px] w-[6px] rounded-[1.5px]" style="background: ${node.online ? "var(--sg-success)" : "var(--sg-danger)"};"></span>
              ${node.online ? t("online") : t("offline")}
            </span>
            ${detailPinActionHtml}
          </div>
          <div class="mt-1 truncate text-xs" style="color: var(--sg-muted-fg);">${subtitleParts.join(" · ")}</div>
          ${node.public_remark ? `<div class="mt-0.5 truncate text-[11px]" style="color: var(--sg-subtle-fg);">${node.public_remark}</div>` : ""}
        </div>
        <button id="btn-close-detail" type="button" data-slot="button" data-variant="ghost" aria-label="${isZh ? "关闭" : "Close"}" autofocus class="inline-flex h-7 w-7 shrink-0 items-center justify-center">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <p id="detail-settings-error" class="mt-2 hidden text-xs" style="color: var(--sg-danger);" role="alert"></p>

      <div class="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div class="sg-inset-pane rounded-lg p-2.5">
          <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "在线时长" : "Uptime"}</div>
          <div class="mt-1 text-sm font-semibold mono-num" style="color: ${node.online ? "var(--sg-fg)" : "var(--sg-muted-fg)"};">${node.online ? formatUptime(node.uptimeSec) : (isZh ? "离线" : "Offline")}</div>
        </div>
        <div class="sg-inset-pane rounded-lg p-2.5">
          <div class="flex items-center justify-between gap-1 text-[11px]" style="color: var(--sg-muted-fg);">
            <span>${hasQuota ? (isZh ? "月流量配额" : "Monthly Quota") : (isZh ? "累计流量" : "Total Traffic")}</span>
            ${hasQuota ? `<span class="mono-num text-[10px]" style="color: ${quotaPctColor};">${Math.round(quotaPct)}%</span>` : `<span class="text-[10px]" style="color: var(--sg-subtle-fg);">${isZh ? "不限" : "Unlimited"}</span>`}
          </div>
          <div class="mt-1 text-sm font-semibold mono-num">${hasQuota ? `${node.trafficUsedTB.toFixed(2)} / ${node.trafficLimitTB} TB` : formatTrafficGB(node.totalUpGB + node.totalDownGB)}</div>
        </div>
        <div class="sg-inset-pane rounded-lg p-2.5">
          <div class="text-[11px]" style="color: var(--sg-muted-fg);">Disk</div>
          <div class="mt-1 text-sm font-semibold mono-num">${node.diskTotal > 0 ? `${node.diskUsed.toFixed(0)} / ${formatCapacity(node.diskTotal)}` : "—"}</div>
        </div>
        <div class="sg-inset-pane rounded-lg p-2.5">
          <div class="text-[11px]" style="color: var(--sg-muted-fg);">TCP / UDP / Proc</div>
          <div class="mt-1 text-sm font-semibold mono-num">${node.tcp} / ${node.udp} / ${node.proc}</div>
        </div>
      </div>

      <div id="detail-chart-card" class="km-load-chart sg-chart-inset relative mt-4 overflow-hidden rounded-xl">
        <canvas id="detail-slats-canvas" class="absolute inset-0 block h-full w-full cursor-crosshair" aria-hidden="true"></canvas>
        <div class="relative z-10 px-3.5 pt-3.5 pb-1">
          <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div id="detail-chart-tabs" data-slot="tabs-list" data-variant="default" class="h-8">
              <button type="button" data-slot="tabs-trigger" data-dtab="load" class="px-2.5 text-xs">${t("loadTab")}</button>
              <button type="button" data-slot="tabs-trigger" data-dtab="ping" class="px-2.5 text-xs">${t("pingTab")}</button>
            </div>
            <span id="detail-chart-title" class="hidden h-8 items-center text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">${t("loadTab")}</span>
            <div data-slot="tabs-list" data-variant="default" class="h-7 mono-num">
              ${[1, 6, 24].map((h) => `<button type="button" data-slot="tabs-trigger" data-dhours="${h}" data-active="${state.detailHours === h}" class="px-2 text-[11px]">${h}h</button>`).join("")}
            </div>
          </div>
          <div id="detail-legend-slot">${legendHtml}</div>
        </div>
        <div id="detail-plot-area" class="pointer-events-none relative z-10 h-[212px] w-full">
          <div id="detail-yticks" class="absolute inset-0"></div>
          <div id="detail-xticks" class="absolute inset-0"></div>
          <div id="detail-history-status" class="absolute inset-0 flex flex-wrap items-center justify-center gap-2 px-8 text-center text-xs" style="color: var(--sg-muted-fg);" aria-live="polite"></div>
          <div id="detail-slats-tip" class="sg-popover pointer-events-none absolute z-20 hidden max-w-[calc(100%-16px)] flex-wrap items-center gap-y-0.5 rounded-md px-2 py-1 mono-num text-[10px]"></div>
        </div>
      </div>

      <div class="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-[1.06fr_1.18fr]">
        <!-- Left Card: Node Network & Traffic Micro Slats Chart (1:1 synced with homepage Network & Traffic depth) -->
        <div id="detail-net-cell" class="sg-chart-inset relative flex min-h-[320px] flex-col overflow-hidden rounded-xl">
          <canvas id="detail-net-canvas" class="absolute inset-0 block h-full w-full cursor-crosshair" aria-hidden="true"></canvas>

          <div id="dnet-top-header" class="pointer-events-none relative z-10 flex flex-col gap-1 px-3.5 pt-2.5">
            <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
                <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <span>${isZh ? "网络与流量" : "Network & Traffic"}</span>
              </span>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mono-num text-[10px]" style="color: var(--sg-subtle-fg);">
                <span class="whitespace-nowrap">↑ <strong class="font-medium" style="color: var(--sg-fg);">${formatTrafficGB(node.totalUpGB)}</strong></span>
                <span class="whitespace-nowrap">↓ <strong class="font-medium" style="color: var(--sg-fg);">${formatTrafficGB(node.totalDownGB)}</strong></span>
              </div>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <span class="whitespace-nowrap text-[10.5px]" style="color: var(--sg-muted-fg);">↑ ${isZh ? "上行" : "Upload"}</span>
              ${(() => { const p = formatRateParts(node.online ? node.netOut : 0); return `<span class="mono-num whitespace-nowrap text-[11.5px] font-semibold">${p.value} <span class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);">${p.unit}</span></span>`; })()}
            </div>
          </div>

          <div id="dnet-up-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-up-ymax"></span></div>
          <div id="dnet-up-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-up-ymid"></span></div>
          <div id="dnet-up-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-3.5 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
            <span id="dnet-up-xstart"></span>
            <span id="dnet-up-xend"></span>
          </div>

          <div id="dnet-down-header" class="pointer-events-none absolute inset-x-0 z-10 flex items-baseline justify-between gap-2 px-3.5">
            <span class="text-[10.5px]" style="color: var(--sg-muted-fg);">↓ ${isZh ? "下行" : "Download"}</span>
            ${(() => { const p = formatRateParts(node.online ? node.netIn : 0); return `<span class="mono-num text-[11.5px] font-semibold">${p.value} <span class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);">${p.unit}</span></span>`; })()}
          </div>

          <div id="dnet-down-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-down-ymax"></span></div>
          <div id="dnet-down-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-down-ymid"></span></div>
          <div id="dnet-down-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-3.5 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
            <span id="dnet-down-xstart"></span>
            <span id="dnet-down-xend"></span>
          </div>

          <div id="detail-net-status" class="pointer-events-none absolute inset-0 z-10 flex flex-wrap items-center justify-center gap-2 px-8 text-center text-xs" style="color: var(--sg-muted-fg);" aria-live="polite"></div>
          <div id="dnet-tip" class="sg-popover pointer-events-none absolute z-20 hidden rounded-md px-1.5 py-0.5 mono-num text-[9.5px] whitespace-nowrap"></div>
        </div>

        <!-- Right Card: System Info Spec Card (Bright top header slab + recessed rounded-rect shadow body, zero row separators) -->
        <div class="sg-spec-shell flex flex-col overflow-hidden rounded-xl">
          <div class="flex items-center justify-between px-3.5 py-2.5">
            <span class="text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">${isZh ? "系统信息" : "System Info"}</span>
            ${node.arch ? `<span class="mono-num text-[10px]" style="color: var(--sg-subtle-fg);">${node.arch}</span>` : ""}
          </div>
          <div class="flex flex-1 flex-col px-1.5 pb-1.5">
            <div class="sg-spec-body flex-1 space-y-0.5 rounded-[9px] p-1.5">
              ${sysRows
                .map(
                  ([k, v]) => `
                    <div class="sg-spec-row flex items-center justify-between gap-3 px-2 py-1.5 text-xs">
                      <span class="shrink-0" style="color: var(--sg-muted-fg);">${k}</span>
                      <span class="min-w-0 text-right font-medium" style="color: var(--sg-fg);">${v}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>

      ${billingCardHtml}
    `;

    if (!modal.open) {
      modal.setAttribute("data-open", "false");
      modal.showModal();
      void dialog.offsetWidth;
      requestAnimationFrame(() => {
        if (state.selectedNodeId && modal.open) {
          modal.setAttribute("data-open", "true");
        }
      });
    } else {
      modal.setAttribute("data-open", "true");
    }

    const detailCanvas = document.getElementById("detail-slats-canvas");
    const detailTip = document.getElementById("detail-slats-tip");
    if (detailCanvas && detailTip) {
      detailCanvas.addEventListener("mousemove", (evt) => {
        const meta = detailChartMeta;
        if (!meta) return;
        const r = detailCanvas.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const mx = ((evt.clientX - r.left) * meta.W) / r.width;
        const my = ((evt.clientY - r.top) * meta.H) / r.height;
        const inY = my >= meta.gridTopY - 8 && my <= meta.gridBottomY + 8;

        let activeIdx = -1;
        let count = 1;
        let anchorX = mx;

        if (inY && mx >= 0 && mx <= meta.W) {
          const c = Math.floor((mx - meta.originX) / meta.pitchX);
          if (c >= meta.plotColStart && c <= meta.plotColEnd) {
            count = meta.plotCols;
            activeIdx = c - meta.plotColStart;
            anchorX = meta.originX + c * meta.pitchX + meta.slatW * 0.5;
          }
        }

        if (activeIdx >= 0) {
          if (detailChartHoverCol !== activeIdx) {
            detailChartHoverCol = activeIdx;
            drawDetailSlatsChartCanvas();
          }
          const frac = activeIdx / Math.max(1, count - 1);
          const timeTxt = fmtDetailOffset(meta.hours, frac);
          const itemsHtml = meta.seriesDefs
            .map((s) => {
              const v = s.values[activeIdx];
              const loss = s.losses?.[activeIdx];
              if (v === null && loss !== 100) {
                return `<span style="color:var(--sg-muted-fg);">${s.label} · —</span>`;
              }
              if (meta.unit === "%") {
                return `<span class="inline-flex items-center gap-1"><span class="inline-block h-[6px] w-[6px] rounded-[1.5px]" style="background:${s.swatch};"></span><span style="color:var(--sg-muted-fg);">${s.label}</span> <strong>${v.toFixed(1)}%</strong></span>`;
              }
              if (loss >= 100) {
                const timeoutTxt = state.lang === "zh-CN" ? "超时 100%" : "Timeout 100%";
                return `<span class="inline-flex items-center gap-1"><span class="inline-block h-[6px] w-[6px] rounded-[1.5px]" style="background:var(--sg-danger);"></span><span style="color:var(--sg-muted-fg);">${s.label}</span> <strong style="color:var(--sg-danger);">${timeoutTxt}</strong></span>`;
              }
              const lossSuffix = loss > 0
                ? ` <span style="color:var(--sg-danger);">(${state.lang === "zh-CN" ? "丢包" : "loss"} ${Number(loss.toFixed(1))}%)</span>`
                : "";
              return `<span class="inline-flex items-center gap-1"><span class="inline-block h-[6px] w-[6px] rounded-[1.5px]" style="background:${s.swatch};"></span><span style="color:var(--sg-muted-fg);">${s.label}</span> <strong>${Math.round(v)}ms</strong>${lossSuffix}</span>`;
            })
            .join('<span class="mx-1 opacity-40">·</span>');
          detailTip.innerHTML = `<span style="color:var(--sg-subtle-fg);">${timeTxt}</span><span class="mx-1.5 opacity-40">|</span>${itemsHtml}`;
          detailTip.style.transform = "none";
          detailTip.classList.remove("hidden");
          detailTip.classList.add("inline-flex");
          const tipW = detailTip.offsetWidth || 160;
          const preferredLeft = anchorX > meta.W * 0.56 ? anchorX - tipW - 6 : anchorX + 6;
          const clampedLeft = Math.max(8, Math.min(meta.W - tipW - 8, preferredLeft));
          detailTip.style.left = `${Math.round(clampedLeft)}px`;
          detailTip.style.top = `${Math.max(4, Math.round(meta.gridTopY - meta.plotBoxTop - 2))}px`;
        } else if (detailChartHoverCol !== -1) {
          detailChartHoverCol = -1;
          detailTip.classList.add("hidden");
          detailTip.classList.remove("inline-flex");
          drawDetailSlatsChartCanvas();
        }
      });
      detailCanvas.addEventListener("mouseleave", () => {
        if (detailChartHoverCol !== -1) {
          detailChartHoverCol = -1;
          drawDetailSlatsChartCanvas();
        }
        detailTip.classList.add("hidden");
        detailTip.classList.remove("inline-flex");
      });
    }

    const dnetCanvas = document.getElementById("detail-net-canvas");
    const dnetTip = document.getElementById("dnet-tip");
    if (dnetCanvas && dnetTip) {
      dnetCanvas.addEventListener("mousemove", (evt) => {
        const meta = detailNetMeta;
        if (!meta) return;
        const r = dnetCanvas.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const mx = ((evt.clientX - r.left) * meta.rectW) / r.width;
        const my = ((evt.clientY - r.top) * meta.rectH) / r.height;
        const c = Math.floor((mx - meta.originX) / meta.pitchX);
        const rowIdx = Math.floor((my - meta.originY) / meta.pitchY);
        const inUp = rowIdx >= 0 && rowIdx <= meta.upBaseRow;
        const inDown = rowIdx > meta.splitRow && rowIdx <= meta.downBaseRow;
        if (c >= 0 && c < meta.cols && (inUp || inDown)) {
          const isUp = inUp;
          const kind = isUp ? "up" : "down";
          if (detailNetHover.kind !== kind || detailNetHover.col !== c) {
            detailNetHover = { kind, col: c };
            drawDetailNetSlatsCanvas();
          }
          const val = isUp ? meta.upSamples[c] : meta.downSamples[c];
          const ts = fmtClock(meta.start + (meta.end - meta.start) * ((c + 0.5) / meta.cols));
          const arrow = isUp ? "↑" : "↓";
          dnetTip.textContent = `${ts} · ${arrow} ${val === null ? "—" : formatRate(val)}`;
          dnetTip.style.transform = "none";
          dnetTip.classList.remove("hidden");
          const tipW = dnetTip.offsetWidth || 120;
          const barCenterX = meta.originX + c * meta.pitchX + meta.slatW * 0.5;
          const preferredLeft = barCenterX > meta.rectW * 0.58 ? barCenterX - tipW - 6 : barCenterX + 6;
          const clampedLeft = Math.max(8, Math.min(meta.rectW - tipW - 8, preferredLeft));
          dnetTip.style.left = `${Math.round(clampedLeft)}px`;
          dnetTip.style.top = isUp
            ? `${Math.max(46, Math.round(meta.upBarTopY - 4))}px`
            : `${Math.max(meta.downHeaderY + 20, Math.round(meta.downBarTopY - 4))}px`;
        } else if (detailNetHover.kind !== null) {
          detailNetHover = { kind: null, col: -1 };
          dnetTip.classList.add("hidden");
          drawDetailNetSlatsCanvas();
        }
      });
      dnetCanvas.addEventListener("mouseleave", () => {
        if (detailNetHover.kind !== null) {
          detailNetHover = { kind: null, col: -1 };
          drawDetailNetSlatsCanvas();
        }
        dnetTip.classList.add("hidden");
      });
    }

    function setHTML(id, html) {
      const el = document.getElementById(id);
      if (el.dataset.sig !== html) {
        el.innerHTML = html;
        el.dataset.sig = html;
      }
    }

    function syncChart() {
      const { load, ping } = history;
      const showTabs = state.detailTab === "ping" || ping.status !== "ready" || ping.routes.length > 0;
      document.getElementById("detail-chart-tabs").style.display = showTabs ? "" : "none";
      document.getElementById("detail-chart-title").style.display = showTabs ? "none" : "inline-flex";
      for (const b of dialog.querySelectorAll("[data-dtab], [data-dhours]")) {
        const active = b.dataset.dtab ? b.dataset.dtab === state.detailTab : Number(b.dataset.dhours) === state.detailHours;
        b.dataset.active = String(active);
        b.setAttribute("aria-pressed", String(active));
      }
      const isLoad = state.detailTab === "load";
      const visibleTrackCount = isLoad ? 0 : visiblePingRoutes().length;
      // Preserve the original plot height for up to three routes, giving larger sets room for every track.
      const extraRows = Math.max(0, visibleTrackCount * 6 - 23);
      document.getElementById("detail-plot-area").style.height = extraRows ? `${212 + 7.3 * extraRows}px` : "";
      const kind = isLoad ? "load" : "ping";
      setHTML("detail-history-status", historyStatusHtml(history[kind], kind, isLoad ? load.hasLoad : visibleRoutesHaveRecords()));
      detailChartHoverCol = -1;
      detailTip.classList.add("hidden");
      detailTip.classList.remove("inline-flex");
      drawDetailSlatsChartCanvas();
    }

    syncDetailHistory = () => {
      setHTML("detail-legend-slot", buildDetailLegendHtml());
      syncChart();
      setHTML("detail-net-status", historyStatusHtml(history.load, "load", history.load.hasNetwork));
      detailNetHover = { kind: null, col: -1 };
      dnetTip.classList.add("hidden");
      drawDetailNetSlatsCanvas();
    };

    document.getElementById("btn-close-detail").onclick = closeDetailModal;
    const detailPinBtn = document.getElementById("btn-detail-pin");
    if (detailPinBtn) detailPinBtn.onclick = () => togglePinnedNode(node.uuid);
    dialog.onclick = (evt) => {
      const button = evt.target.closest("button");
      if (!button || !history) return;
      const { dtab, dhours, pingFocus, historyRetry } = button.dataset;
      if (dtab && dtab !== state.detailTab) {
        state.detailTab = dtab;
        setHTML("detail-legend-slot", buildDetailLegendHtml());
        syncChart();
      } else if (dhours && Number(dhours) !== state.detailHours) {
        state.detailHours = Number(dhours);
        selectHistory(node.uuid);
        syncDetailHistory();
      } else if (pingFocus) {
        const id = Number(pingFocus);
        state.detailPingFocus = state.detailPingFocus === id ? -1 : id;
        for (const chip of dialog.querySelectorAll("[data-ping-focus]")) {
          const selected = Number(chip.dataset.pingFocus) === state.detailPingFocus;
          chip.dataset.focused = String(selected);
          chip.dataset.muted = String(state.detailPingFocus >= 0 && !selected);
          chip.setAttribute("aria-pressed", String(selected));
        }
        syncChart();
      } else if (historyRetry && history[historyRetry].status === "error") {
        requestHistory(history, historyRetry);
        syncDetailHistory();
      }
    };
    syncDetailHistory();
    requestAnimationFrame(() => {
      drawDetailSlatsChartCanvas();
      drawDetailNetSlatsCanvas();
    });
  }

  return { renderDetailModal, closeDetailModal, drawDetailSlatsChartCanvas, drawDetailNetSlatsCanvas };
}
