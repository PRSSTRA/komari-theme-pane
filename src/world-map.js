import { state, getFilteredNodes, renderFlagBadge, nodeStatusColor, formatRate, formatCityName, t } from './state.js';

// ---- 208x96 High-Res World Map Silhouette sampled directly from user's 1024x473 PNG ----
const MATRIX_COLS = 208;
const MATRIX_ROWS = 96;
const WORLD_MASK_RLE =
  "0:265;1334650:9;364566410:177;15812768fffb53acccaaccef:7;ea810:174;2853affd5578bf:17;90:176;31266ea4108ecef:17;40:49;5c836410:105;1310:11;19a9b810:8;bf:15;60:46;acfdf:6;80:103;18eff8244215b79a296950:10;3f:12;d720:40;21002abef:8;b9b898579820:5;210:71;3530:13;875efffee1037801edeffdd20:7;19f:11;8b10:19;12110:16;4fd48ef:21;e72657ffed7331020:59;4adf:5;ca8410489b796128dfbec545ae1055433eff80:7;5f:10;d710:18;49effea320:11;5229f9bf:38;a6795399630:47;9f:23;8778a76648efb6e90004efc20:5;7ef:6;e84410:19;af:9;e822518ebcf:4;bef2f:49;b6610:39;387bf:25;df:7;eda9700059bbdb0:4;4f:6;b920:5;13350:13;9fffedfffb38859fef:10;eaf:51;ebbb20:36;58df:32;eec4da0194effa010:4;3f:4;b10:7;2dfea10:11;8fffe39f:4;a27df:66;911570:34;27aef:32;e70011202104e840:6;4fffc10:9;140:11;17cfffb25f:76;e70:36;bf:6;ef:27;80:7;7fe80:11;9fe30:23;af:5;508f:67;96e2f:4;d10:36;3dffe7751268ef:21;e30:7;2efff1050:9;420:24;9f:5;e21594ef:61;df6002fc5330:37;18ba20:7;2bf:20;d10:7;bfffe7ce0:30;20:4;3969ff7015ef:59;a0:4;20004f910:37;1584230:8;35f:21;a610:4;1cf:7;10:28;3c10:4;181ed005cf:60;50:8;9ffd10:36;210:12;25f:23;e8204bf:8;60:26;164b70:4;4c041108f:60;e10:8;1bff80:51;8f:24;e14f:10;bb10:24;df16f10047fcdaeef:62;d9b210:5;1af70:51;8f:24;d1bf:11;80:24;1e82ffb15f:73;e730:6;990:50;27df:24;ef:6;c9ba8520:27;2775bf:75;a650:6;10:50;1a7f:18;edf:9;b880005ea10:26;128cf:77;4a20:56;1acf:16;b401ef:7;edf700169820:26;29f:22;df:56;4460:56;7f:18;dea688ef:7;ea410:33;cf:17;65e66f:5;c21cf:47;50610:54;2ef:19;a6d16dcf:4;b58840:34;cf:4;ecf3af:7;901845efffe10def:46;e200810:52;1df:19;e2eeaedbfff30010:31;2cc9affc6522ed16df:5;30:5;1afff708f:46;97000de80:51;8f:20;dafd9efffc50:35;3f:5;e500142bd31ef:4;41598201effe4029f:43;b0:5;4210:50;4f:29;60:37;4f:5;321058005c5bfa388f:5;df:5;b01bf:38;98fffa0:5;2d20:50;6f:27;e40:38;8f:4;a140023000804b507f:12;c008f:37;91245f50:6;a80:50;4f:27;30:39;5dffd20:4;1404b1007801ef:11;d404f:37;e87517ea0:4;1ba0:50;1f:27;10:41;6004bedcef3010:4;13024284bf:8;bdf:39;c2007f7013cff0:51;af:24;c40:41;4fbbf:7;30:6;15300051bf:49;b1001812a9d620:52;8f:21;e70:42;7ef:10;b52000520:7;ef:50;70:5;74720:54;6dcf:18;e20:42;2f:15;201fe9510203f:51;e60:5;70:56;486f:10;eaee56aea0:43;7f:16;daf:17;bdf:42;d20:62;a3f:8;e920010006b0:41;16ef:25;cacf:7;42f:43;40:62;c58f:7;50:8;6e020:39;bf:28;57f:7;d03bedf:39;0:63;182f:6;e10:8;19020:38;7f:29;d1bf:7;64017bf:4;df:32;b0:63;1805f:5;a0:11;1010:36;1ef:30;71ef:7;e5bc20:5;bf:30;e3750:62;110bf:4;40:7;277820110:35;af:31;e14f:11;e50:5;7ef:11;eef:13;eb50830:65;7f:4;70:4;7801004c820:35;1f:33;80ef:11;80:5;2e8ef:7;e413f:9;a7d210:70;af:4;b0004fa0:5;2962410:33;df:32;a08f:10;b0:9;ef:7;80005ef:6;d0040:72;2df:4;735ef50:5;2148fb2210:30;bf:32;e40bf:9;40:9;cf:6;80:5;6f:6;d1480:6;210:66;5df:6;d0:6;10:6;10:26;10:4;bf:33;d02df:6;c50:10;8f:5;80:7;eef:5;b10:7;960:68;484affb7830:37;22002ef:34;508f:5;50:12;1efff70:8;71f:6;a0:7;e60:72;8f:4;70:41;4f:36;76ffe820:14;8fff20:10;bf:6;30:6;5920:72;13ef60:41;2ef:36;7a710:16;3fff20:10;4a8f:4;80:6;1750:74;6f40:4;17e5a100010:28;8f:36;d001580:15;aff0:11;1907fff60:6;144820:72;1c80110bfebfebb750:29;8f:36;ddffe0:15;3fb0:11;47003f30:6;5414220:73;19b789f:9;d30:28;1f:40;40:16;92810:9;4d10040:7;5005590:75;115f:11;d20:28;7f:9;df:28;b0:19;a60:10;480:9;11004cc0:4;110:13;10:8;10:48;2f:12;e9950:26;4dffcdd7206f:27;20:14;10:4;210:8;410ba0:7;1bb100520:77;2f:16;70:26;1410:6;155ef:23;a0:15;30:14;5e37f40:5;3efa0:82;8f:16;e10:36;18f:22;b20:31;6d3c80:4;5dff70:5;110:74;4f:18;40:35;118f:21;a0:34;ce450019f:4;e04341420:28;20:45;df:17;b820:34;10bf:20;b0:35;3ef2001f:5;737570530:23;10:49;4f:17;e888d60:34;ef:19;d20:36;7fa000efffe16b60:4;19c0040:17;10:49;1ef:21;dba720:30;3ef:17;e20:37;1ef7005cee80bc4000620e5dfd720:4;510:58;6f:26;d20:30;2f:17;70:39;4ee0:5;1009470:6;27efffe8000180:58;4f:28;e0:30;cf:16;10:40;4520:7;410:9;1af:4;d158220:58;5f:28;10:29;6f:16;20:41;4cbbc510:14;5fffef21003420:57;df:26;d0:30;2f:16;60:44;2355251725710:6;26d819a0:4;14420:55;7f:25;e30:30;1f:16;d0:10;20:39;40150:13;19a10:4;440:11;10:43;1cf:24;90:32;ef:16;110:56;441000510:4;10:5;10:56;2f:23;b0:32;6f:17;2220070:50;3cffa000c40:26;110:40;af:22;a0:32;bf:17;20008e0:47;4c5bfff3000fd10:12;110:11;110:41;7df:20;b0:31;2f:17;8004bfb0:46;4ef:6;a104ff60:12;420:10;10:44;19f:19;90:31;1f:15;d4000cff70:45;7df:8;e7eff60:12;120:5;7400030:46;df:18;80:32;af:14;40:4;cff20:44;1ef:14;50:9;10:9;20:51;6f:18;30:32;4f:13;70:5;dfc0:5;20:37;47df:15;e30:8;270:12;20:47;4f:17;d0:34;bf:12;60:4;5ff60:40;15df:19;b0:9;540:59;5f:15;b820:34;7f:12;b0:4;8ff40:40;af:22;20:9;20:59;6f:13;d40:37;4f:11;d40:4;5fd0:41;ef:22;d10:68;4f:13;80:38;2f:10;d0:7;20:42;ef:23;50:68;6f:13;90:39;ef:9;d0:49;1f:24;20:68;4f:13;30:39;5f:9;40:49;3f:23;e0:69;2f:12;d0:41;bf:6;e40:50;1f:23;70:70;df:11;40:41;2f:6;50:51;1df:5;eb87df:11;b10:70;cf:10;a0:42;2f:4;d40:52;6fffdb50:4;1ebef:7;a10:71;cf:7;d6810:43;431310:53;6a510:8;44f:7;b0:12;110:59;cf:8;70:117;af:5;a10:12;240:59;cf:8;70:117;afffca10:13;2a20:58;8f:6;530:119;3270:15;4ee20:58;7f:4;de20:137;17a10:59;1afffe20:121;6d60:12;2b5510:61;4f:4;70:121;770:11;27d40:65;effe20:132;3af710:65;5fffd10:131;1ba40:68;8fffa0:131;10:71;3fff70:204;8ff30:205;8c60:207;bd30:205;17720:572;";

const MATRIX_GRID = new Float32Array(MATRIX_COLS * MATRIX_ROWS);
(() => {
  let outIdx = 0;
  let k = 0;
  const len = WORLD_MASK_RLE.length;
  while (k < len && outIdx < MATRIX_GRID.length) {
    const val = parseInt(WORLD_MASK_RLE[k], 16) / 15;
    if (k + 1 < len && WORLD_MASK_RLE[k + 1] === ":") {
      const semi = WORLD_MASK_RLE.indexOf(";", k + 2);
      const cnt = parseInt(WORLD_MASK_RLE.slice(k + 2, semi), 10);
      const end = Math.min(MATRIX_GRID.length, outIdx + cnt);
      MATRIX_GRID.fill(val, outIdx, end);
      outIdx = end;
      k = semi + 1;
    } else {
      MATRIX_GRID[outIdx++] = val;
      k += 1;
    }
  }
})();

function sampleWorldLand(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const fx = u * (MATRIX_COLS - 1);
  const fy = v * (MATRIX_ROWS - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(MATRIX_COLS - 1, x0 + 1);
  const y1 = Math.min(MATRIX_ROWS - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = MATRIX_GRID[y0 * MATRIX_COLS + x0];
  const v10 = MATRIX_GRID[y0 * MATRIX_COLS + x1];
  const v01 = MATRIX_GRID[y1 * MATRIX_COLS + x0];
  const v11 = MATRIX_GRID[y1 * MATRIX_COLS + x1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

function projectNode(lng, lat) {
  const col = 0.3108 * lng * (1 - 0.11 * Math.pow(lat / 90, 2)) + 42.323;
  const row = -0.3259 * lat + 26.807;
  const xPct = Math.max(2, Math.min(98, (col / 104) * 100));
  const yPct = Math.max(4, Math.min(96, (row / 48) * 100));
  return { xPct, yPct };
}

// ---- React Bits Pattern Waves World Map Renderer (with in-component server squares) ----
// Exact parameters from user URL:
// pattern=square, spacing=5, speed=0, shine=0.75, scale=3, direction=0, contrast=1,
// cursorStrength=0.5, cursorSize=60, intro=false, fade=bottom, fadeSize=0.45,
// interactive=false, wave=ripple (with silk preset defaults: markSize=0.95, depth=0.95, light=0)
const PW_CFG = {
  pattern: "square",
  wave: "ripple",
  spacing: 5,
  markSize: 0.95,
  depth: 0.95,
  light: 0,
  shine: 0.75,
  scale: 3,
  direction: 0,
  contrast: 1,
  fade: "bottom",
  fadeSize: 0.45,
  speed: 0,
  intro: false,
  interactive: false,
  cursorStrength: 0.5,
  cursorSize: 60,
};

const PW_SPIRAL_OFFSETS = [
  [0, 0], [1, 0], [0, 1], [1, 1],
  [-1, 0], [0, -1], [-1, 1], [1, -1],
  [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2],
];

function pwClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function pwSmoothstep(e0, e1, x) {
  const t = pwClamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// 1:1 port of PatternWaves.tsx GLSL uvec3 scramble() + 3D gradientNoise()
function pwScramble3(ix, iy, iz) {
  let x = (Math.imul((ix + 4096) | 0, 1664525) + 1013904223) >>> 0;
  let y = (Math.imul((iy + 4096) | 0, 1664525) + 1013904223) >>> 0;
  let z = (Math.imul((iz + 4096) | 0, 1664525) + 1013904223) >>> 0;
  x = (x + Math.imul(y, z)) >>> 0;
  y = (y + Math.imul(z, x)) >>> 0;
  z = (z + Math.imul(x, y)) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  y = (y ^ (y >>> 16)) >>> 0;
  z = (z ^ (z >>> 16)) >>> 0;
  x = (x + Math.imul(y, z)) >>> 0;
  y = (y + Math.imul(z, x)) >>> 0;
  z = (z + Math.imul(x, y)) >>> 0;
  return [
    (x & 65535) / 32767.5 - 1.0,
    (y & 65535) / 32767.5 - 1.0,
    (z & 65535) / 32767.5 - 1.0,
  ];
}

function pwDotLattice(ix, iy, iz, fx, fy, fz) {
  const g = pwScramble3(ix, iy, iz);
  return g[0] * fx + g[1] * fy + g[2] * fz;
}

function pwGradientNoise(px, py, pz) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const iz = Math.floor(pz);
  const fx = px - ix;
  const fy = py - iy;
  const fz = pz - iz;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

  const n000 = pwDotLattice(ix, iy, iz, fx, fy, fz);
  const n100 = pwDotLattice(ix + 1, iy, iz, fx - 1, fy, fz);
  const n010 = pwDotLattice(ix, iy + 1, iz, fx, fy - 1, fz);
  const n110 = pwDotLattice(ix + 1, iy + 1, iz, fx - 1, fy - 1, fz);
  const n001 = pwDotLattice(ix, iy, iz + 1, fx, fy, fz - 1);
  const n101 = pwDotLattice(ix + 1, iy, iz + 1, fx - 1, fy, fz - 1);
  const n011 = pwDotLattice(ix, iy + 1, iz + 1, fx, fy - 1, fz - 1);
  const n111 = pwDotLattice(ix + 1, iy + 1, iz + 1, fx - 1, fy - 1, fz - 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function drawRoundedSquare(ctx, cx, cy, extent, r) {
  const x = cx - extent;
  const y = cy - extent;
  const size = extent * 2;
  const cr = Math.min(r, extent);
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, size, size, cr);
  } else {
    ctx.moveTo(x + cr, y);
    ctx.lineTo(x + size - cr, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + cr);
    ctx.lineTo(x + size, y + size - cr);
    ctx.quadraticCurveTo(x + size, y + size, x + size - cr, y + size);
    ctx.lineTo(x + cr, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - cr);
    ctx.lineTo(x, y + cr);
    ctx.quadraticCurveTo(x, y, x + cr, y);
    ctx.closePath();
  }
  ctx.fill();
}

function nodeStatusRgb(n, isLight) {
  if (!n.online) return isLight ? [217, 107, 99] : [218, 114, 105];   // --sg-danger
  if (n.cpu >= 88) return isLight ? [212, 154, 82] : [219, 165, 89]; // --sg-warn
  return isLight ? [86, 168, 121] : [99, 186, 137];                  // --sg-success
}

function sortNodesBySeverity(nodes) {
  return [...nodes].sort((a, b) => {
    const ra = !a.online ? 0 : a.cpu >= 88 ? 1 : 2;
    const rb = !b.online ? 0 : b.cpu >= 88 ? 1 : 2;
    if (ra !== rb) return ra - rb;
    return b.cpu - a.cpu;
  });
}

// Real-time Solar Terminator (晨昏线) astronomy helper + UTC+8 clock
function getSolarSubpoint(nowMs) {
  const d = new Date(nowMs);
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = (nowMs - startOfYear) / 86400000;
  const declRad = ((-23.44 * Math.PI) / 180) * Math.cos((2 * Math.PI * (doy + 10)) / 365);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const subsolarLngDeg = (((12 - utcHours) * 15 + 540) % 360) - 180;
  return {
    declRad,
    subsolarLngRad: (subsolarLngDeg * Math.PI) / 180,
  };
}

export function formatUtc8Time(nowMs) {
  const d = new Date(nowMs + 8 * 3600 * 1000);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

// Static Pattern Waves + Solar Terminator field cache (refreshes cleanly on resize, theme change, or UTC minute tick)
const pwCache = {
  key: "",
  width: 0,
  height: 0,
  mapX: 0,
  mapY: 0,
  mapW: 0,
  mapH: 0,
  cols: 0,
  rows: 0,
  originX: 0,
  originY: 0,
  pitch: PW_CFG.spacing,
  land: null,
  dayFactor: null,
  sunDome: null,
  termGlow: null,
  emphasis: null,
  fade: null,
  lift: null,
  serverHitList: [],
};

function ensurePatternWavesField(width, height, isLight, showTerminator) {
  const minuteBucket = showTerminator ? Math.floor(Date.now() / 60000) : 0;
  const key = `${Math.round(width)}x${Math.round(height)}:${isLight ? "L" : "D"}:${showTerminator ? "T" : "F"}:${minuteBucket}`;
  if (pwCache.key === key && pwCache.land) return pwCache;

  // Contain-fit the 1024:473 world silhouette inside the full-width viewport so continents never distort on wide 1-panel layouts
  const mapAspect = 1024 / 473;
  const viewAspect = width / Math.max(1, height);
  let mapW = width;
  let mapH = height;
  let mapX = 0;
  let mapY = 0;
  if (viewAspect > mapAspect) {
    mapH = height;
    mapW = height * mapAspect;
    mapX = (width - mapW) * 0.5;
  } else {
    mapW = width;
    mapH = width / mapAspect;
    mapY = (height - mapH) * 0.5;
  }

  const pitch = PW_CFG.spacing;
  const cols = Math.ceil(width / pitch) + 1;
  const rows = Math.ceil(height / pitch) + 1;
  const originX = Math.floor((width - cols * pitch) * 0.5);
  const originY = Math.floor((height - rows * pitch) * 0.5);
  const count = cols * rows;

  const land = new Float32Array(count);
  const sinAltGrid = new Float32Array(count);
  const dayFactor = new Float32Array(count);
  const sunDome = new Float32Array(count);
  const termGlow = new Float32Array(count);
  const emphasis = new Float32Array(count);
  const fade = new Float32Array(count);
  const lift = new Float32Array(count);

  const { declRad, subsolarLngRad } = getSolarSubpoint(Date.now());
  const sinDecl = Math.sin(declRad);
  const cosDecl = Math.cos(declRad);
  const uUnit = 520 * PW_CFG.scale;

  // Pass 1: sample 208x96 world map mask, bottom fade, and astronomical solar elevation sin(alpha)
  for (let r = 0; r < rows; r++) {
    const cy = originY + (r + 0.5) * pitch;
    const cyGL = height - cy;
    const fVal = pwSmoothstep(0, PW_CFG.fadeSize, cyGL / height);
    const vNorm = (cy - mapY) / mapH;
    const latDeg = pwClamp((26.807 - vNorm * 48) / 0.3259, -85, 85);
    const latRad = (latDeg * Math.PI) / 180;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const cosFactor = 1 - 0.11 * Math.pow(latDeg / 90, 2);
    const rowBase = r * cols;

    for (let c = 0; c < cols; c++) {
      const cx = originX + (c + 0.5) * pitch;
      const uNorm = (cx - mapX) / mapW;
      const idx = rowBase + c;
      land[idx] = sampleWorldLand(uNorm, vNorm);
      fade[idx] = fVal;

      const noiseVal = pwGradientNoise(((cx - 0.5 * width) / uUnit) * 2.4, ((cyGL - 0.5 * height) / uUnit) * 2.4, 0);
      if (showTerminator) {
        const lngDeg = (uNorm * 104 - 42.323) / (0.3108 * cosFactor);
        const lngRad = (lngDeg * Math.PI) / 180;
        const rawSinAlt = sinLat * sinDecl + cosLat * cosDecl * Math.cos(lngRad - subsolarLngRad);
        // Subtle Pattern Waves 3D gradient noise micro-texture so the terminator feels organically woven into the grid
        sinAltGrid[idx] = rawSinAlt + noiseVal * 0.008;
      } else {
        // Terminator disabled: gentle organic silk modulation across the static world dot-matrix
        dayFactor[idx] = 0.5 + noiseVal * 0.18;
        sunDome[idx] = 0;
        termGlow[idx] = 0;
        emphasis[idx] = 0;
        lift[idx] = pwClamp(noiseVal * 0.08 * PW_CFG.depth, -0.14, 0.14);
      }
    }
  }

  // Pass 2: screen-space SDF normalization (sinAlt / |grad sinAlt|) for a uniformly crisp Pattern Waves terminator highlight
  if (showTerminator) {
    const shineScale = pwClamp(PW_CFG.shine / 0.75, 0.2, 2.0);
    for (let r = 0; r < rows; r++) {
      const rUp = r > 0 ? r - 1 : 0;
      const rDn = r < rows - 1 ? r + 1 : rows - 1;
      const rowBase = r * cols;
      for (let c = 0; c < cols; c++) {
        const cLt = c > 0 ? c - 1 : 0;
        const cRt = c < cols - 1 ? c + 1 : cols - 1;
        const idx = rowBase + c;
        const s = sinAltGrid[idx];
        const dsx = (sinAltGrid[rowBase + cRt] - sinAltGrid[rowBase + cLt]) * (c > 0 && c < cols - 1 ? 0.5 : 1.0);
        const dsy = (sinAltGrid[rDn * cols + c] - sinAltGrid[rUp * cols + c]) * (r > 0 && r < rows - 1 ? 0.5 : 1.0);
        const gradMag = Math.max(Math.hypot(dsx, dsy), 0.0045);
        const dCells = s / gradMag;

        // Day/night smooth transition across terminator + crisp 3-cell specular terminator ribbon
        const dayF = pwSmoothstep(-2.4, 3.4, dCells);
        const dome = Math.pow(pwClamp(s, 0, 1), 0.85);
        const coreGlow = Math.exp(-Math.pow(dCells / (isLight ? 1.42 : 1.5), 2));
        const haloGlow = Math.exp(-Math.pow(dCells / (isLight ? 3.5 : 4.2), 2)) * (isLight ? 0.22 : 0.24);
        const tGlow = pwClamp((coreGlow + haloGlow) * shineScale, 0, 1);

        dayFactor[idx] = dayF;
        sunDome[idx] = dome;
        termGlow[idx] = tGlow;
        emphasis[idx] = pwClamp(coreGlow * (isLight ? 1.25 : 1.15) * shineScale, 0, 1);
        // Subtle Pattern Waves vertical lift along the sunlit dome and terminator crest
        lift[idx] = pwClamp((tGlow * 0.24 + (dayF - 0.5) * 0.14) * PW_CFG.depth, -0.38, 0.38);
      }
    }
  }

  pwCache.key = key;
  pwCache.width = width;
  pwCache.height = height;
  pwCache.mapX = mapX;
  pwCache.mapY = mapY;
  pwCache.mapW = mapW;
  pwCache.mapH = mapH;
  pwCache.cols = cols;
  pwCache.rows = rows;
  pwCache.originX = originX;
  pwCache.originY = originY;
  pwCache.pitch = pitch;
  pwCache.land = land;
  pwCache.dayFactor = dayFactor;
  pwCache.sunDome = sunDome;
  pwCache.termGlow = termGlow;
  pwCache.emphasis = emphasis;
  pwCache.fade = fade;
  pwCache.lift = lift;
  return pwCache;
}

let lastClusters = [];
let openNodeDetail;

function buildMapClusters(filteredIds) {
  const projected = state.nodes
    .filter((n) => Number.isFinite(n.lng) && Number.isFinite(n.lat))
    .map((n) => {
      const pos = projectNode(n.lng, n.lat);
      return { node: n, xPct: pos.xPct, yPct: pos.yPct, active: filteredIds.has(n.uuid) };
    });

  if (state.mapOverlapMode === "cluster") {
    const clusters = [];
    for (const item of projected) {
      let hit = null;
      for (const c of clusters) {
        const dx = item.xPct - c.xPct;
        const dy = (item.yPct - c.yPct) / 2.165;
        if (Math.hypot(dx, dy) < 1.8) {
          hit = c;
          break;
        }
      }
      if (hit) {
        hit.nodes.push(item.node);
        hit.active = hit.active || item.active;
        hit.xPct = hit.nodes.reduce((s, nd) => s + projectNode(nd.lng, nd.lat).xPct, 0) / hit.nodes.length;
        hit.yPct = hit.nodes.reduce((s, nd) => s + projectNode(nd.lng, nd.lat).yPct, 0) / hit.nodes.length;
      } else {
        clusters.push({
          key: `c-${item.node.uuid}`,
          xPct: item.xPct,
          yPct: item.yPct,
          nodes: [item.node],
          active: item.active,
        });
      }
    }
    return clusters;
  }

  if (state.mapOverlapMode === "spread") {
    const byCoord = new Map();
    for (const item of projected) {
      const coordKey = `${item.xPct.toFixed(1)},${item.yPct.toFixed(1)}`;
      if (!byCoord.has(coordKey)) byCoord.set(coordKey, []);
      byCoord.get(coordKey).push(item);
    }
    const out = [];
    for (const group of byCoord.values()) {
      const count = group.length;
      group.forEach((item, idx) => {
        let xPct = item.xPct;
        let yPct = item.yPct;
        if (count > 1) {
          const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
          const rx = count <= 2 ? 0.9 : 1.15;
          const ry = rx * 2.165;
          xPct += Math.cos(angle) * rx;
          yPct += Math.sin(angle) * ry;
        }
        out.push({
          key: `s-${item.node.uuid}`,
          xPct,
          yPct,
          nodes: [item.node],
          active: item.active,
        });
      });
    }
    return out;
  }

  return projected.map((item) => ({
    key: `r-${item.node.uuid}`,
    xPct: item.xPct,
    yPct: item.yPct,
    nodes: [item.node],
    active: item.active,
  }));
}

export function drawWorldMapCanvas() {
  if (!state.settings.show_world_map) return;
  const canvas = document.getElementById("world-map-canvas");
  const viewport = document.getElementById("map-viewport");
  if (!canvas || !viewport) return;

  const rect = viewport.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const isLight = state.theme === "light";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const showTerminator = Boolean(state.settings.show_solar_terminator);
  const field = ensurePatternWavesField(rect.width, rect.height, isLight, showTerminator);
  const { cols, rows, originX, originY, pitch, mapX, mapY, mapW, mapH, land, dayFactor, sunDome, termGlow, emphasis, fade, lift } = field;

  // Refresh cluster assignments and map each server/cluster onto snapped Pattern Waves grid cells
  const filteredIds = new Set(getFilteredNodes().map((n) => n.uuid));
  lastClusters = buildMapClusters(filteredIds);

  const serverCellMap = new Map();
  const occupied = new Set();
  const hitList = [];
  const activeClusterKey = state.pinnedClusterKey || state.hoveredClusterKey;

  for (const cluster of lastClusters) {
    const sortedNodes = sortNodesBySeverity(cluster.nodes);
    const baseCol = pwClamp(Math.round((((cluster.xPct / 100) * mapW + mapX) - originX) / pitch - 0.5), 1, cols - 2);
    const baseRow = pwClamp(Math.round((((cluster.yPct / 100) * mapH + mapY) - originY) / pitch - 0.5), 1, rows - 2);
    const wantCount = state.mapOverlapMode === "cluster" ? Math.min(sortedNodes.length, 4) : 1;
    const assignedCells = [];

    for (let i = 0; i < wantCount; i++) {
      let chosenCol = baseCol;
      let chosenRow = baseRow;
      if (state.mapOverlapMode !== "raw") {
        for (const [dc, dr] of PW_SPIRAL_OFFSETS) {
          const nc = pwClamp(baseCol + dc, 1, cols - 2);
          const nr = pwClamp(baseRow + dr, 1, rows - 2);
          const k = nr * cols + nc;
          if (!occupied.has(k)) {
            chosenCol = nc;
            chosenRow = nr;
            occupied.add(k);
            break;
          }
        }
      }
      const cellIdx = chosenRow * cols + chosenCol;
      const nodeForCell = sortedNodes[i] || sortedNodes[0];
      const cx = originX + (chosenCol + 0.5) * pitch;
      const cy = originY + (chosenRow + 0.5) * pitch - lift[cellIdx] * pitch;
      const cellEntry = {
        col: chosenCol,
        row: chosenRow,
        cellIdx,
        cx,
        cy,
        node: nodeForCell,
        cluster,
        rgb: nodeStatusRgb(nodeForCell, isLight),
        active: cluster.active,
        highlighted: cluster.key === activeClusterKey,
      };
      serverCellMap.set(cellIdx, cellEntry);
      assignedCells.push(cellEntry);
    }

    const avgX = assignedCells.reduce((s, c) => s + c.cx, 0) / assignedCells.length;
    const avgY = assignedCells.reduce((s, c) => s + c.cy, 0) / assignedCells.length;
    cluster._cxPct = (avgX / rect.width) * 100;
    cluster._cyPct = (avgY / rect.height) * 100;
    hitList.push({ cluster, cells: assignedCells, cx: avgX, cy: avgY });
  }
  pwCache.serverHitList = hitList;

  // Base map square palette (balanced light-mode graphite terminator matching dark-mode legibility without harsh black)
  const dayBaseRgb = isLight ? [102, 108, 120] : [192, 198, 210];
  const nightBaseRgb = isLight ? [60, 66, 78] : [192, 198, 210];
  const flatBaseRgb = isLight ? [68, 74, 86] : [192, 198, 210];
  const accentRgb = isLight ? [34, 38, 48] : [236, 240, 246];
  const oceanRgb = isLight ? [70, 76, 88] : [196, 202, 214];
  const span = pitch * PW_CFG.markSize;

  for (let r = 0; r < rows; r++) {
    const baseY = originY + (r + 0.5) * pitch;
    const rowBase = r * cols;
    for (let c = 0; c < cols; c++) {
      const idx = rowBase + c;
      const cx = originX + (c + 0.5) * pitch;
      const cy = baseY - lift[idx] * pitch;

      // In-component Server Square: exact same grid cell, lift, and rounded-square geometry
      const srv = serverCellMap.get(idx);
      if (srv) {
        const emph = emphasis[idx];
        const boost = srv.highlighted ? 0.22 : 0.0;
        // In light mode keep semantic green/amber/red pure even directly on the deep-ink terminator
        const mixT = Math.min(1, (isLight ? 0 : emph * 0.08) + boost);
        const target = isLight ? [24, 28, 34] : [255, 255, 255];
        const cr = Math.round(srv.rgb[0] + (target[0] - srv.rgb[0]) * mixT);
        const cg = Math.round(srv.rgb[1] + (target[1] - srv.rgb[1]) * mixT);
        const cb = Math.round(srv.rgb[2] + (target[2] - srv.rgb[2]) * mixT);
        const extent = 0.5 * span * (srv.highlighted ? 1.05 : 1.0);
        const alpha = srv.active ? 1.0 : 0.24;

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        continue;
      }

      const cov = land[idx];
      const dayF = dayFactor[idx];
      const dome = sunDome[idx];
      const tGlow = termGlow[idx];
      const emph = emphasis[idx];
      const fVal = fade[idx];

      if (cov > 0.06) {
        if (!showTerminator) {
          // Terminator disabled: clean uniform Pattern Waves world dot-matrix
          const rawLvl = (isLight ? 0.42 : 0.44) + (dayF - 0.5) * 0.14;
          const lvl = pwClamp(cov * rawLvl, 0, 0.88);
          const area = Math.max(Math.sqrt(lvl), 0.18);
          const extent = 0.5 * span * area;
          const landFade = (isLight ? 0.44 : 0.32) + (isLight ? 0.56 : 0.68) * fVal;
          const alpha = landFade * (isLight ? 0.50 : 0.46);
          if (alpha < 0.015) continue;
          ctx.fillStyle = `rgba(${flatBaseRgb[0]},${flatBaseRgb[1]},${flatBaseRgb[2]},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else if (isLight) {
          // Light mode: balanced 3-tier contrast — airy sunlit day -> cool slate night -> refined graphite terminator crest
          const nightF = 1 - dayF;
          const rawLvl = 0.25 + nightF * 0.26 + tGlow * 0.44;
          const lvl = pwClamp(cov * rawLvl, 0, 0.88);
          const area = Math.max(Math.sqrt(lvl), 0.20);
          const extent = 0.5 * span * area;
          const landFade = 0.48 + 0.52 * fVal;
          const alpha = landFade * pwClamp(0.35 + nightF * 0.20 + tGlow * 0.30, 0, 0.76);
          if (alpha < 0.015) continue;

          const baseR = dayBaseRgb[0] + (nightBaseRgb[0] - dayBaseRgb[0]) * nightF;
          const baseG = dayBaseRgb[1] + (nightBaseRgb[1] - dayBaseRgb[1]) * nightF;
          const baseB = dayBaseRgb[2] + (nightBaseRgb[2] - dayBaseRgb[2]) * nightF;
          const tintT = pwClamp(emph * 0.78, 0, 1);
          const cr = Math.round(baseR + (accentRgb[0] - baseR) * tintT);
          const cg = Math.round(baseG + (accentRgb[1] - baseG) * tintT);
          const cb = Math.round(baseB + (accentRgb[2] - baseB) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else {
          // Dark mode: gentler Day vs Night contrast & luminous silver Solar Terminator crest
          const rawLvl = 0.28 + dayF * 0.23 + dome * 0.06 + tGlow * 0.34;
          const lvl = pwClamp(cov * rawLvl, 0, 0.88);
          const area = Math.max(Math.sqrt(lvl), 0.18);
          const extent = 0.5 * span * area;
          const landFade = 0.30 + 0.70 * fVal;
          const alpha = landFade * pwClamp(0.28 + dayF * 0.20 + dome * 0.05 + tGlow * 0.26, 0, 0.76);
          if (alpha < 0.015) continue;

          const tintT = pwClamp(emph * 0.68, 0, 1);
          const cr = Math.round(dayBaseRgb[0] + (accentRgb[0] - dayBaseRgb[0]) * tintT);
          const cg = Math.round(dayBaseRgb[1] + (accentRgb[1] - dayBaseRgb[1]) * tintT);
          const cb = Math.round(dayBaseRgb[2] + (accentRgb[2] - dayBaseRgb[2]) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        }
      } else {
        // Subtle Pattern Waves ocean micro-squares (plus continuous twilight arc when terminator is enabled)
        const oceanFade = 0.14 + 0.86 * fVal;
        if (!showTerminator) {
          const extent = 0.5 * span * 0.22;
          const alpha = oceanFade * (isLight ? 0.08 : 0.095);
          if (alpha < 0.008) continue;
          ctx.fillStyle = `rgba(${oceanRgb[0]},${oceanRgb[1]},${oceanRgb[2]},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else if (isLight) {
          const nightF = 1 - dayF;
          const area = 0.20 + nightF * 0.07 + tGlow * 0.25;
          const extent = 0.5 * span * area;
          const alpha = oceanFade * pwClamp(0.065 + nightF * 0.055 + tGlow * 0.24, 0, 0.36);
          if (alpha < 0.008) continue;

          const tintT = pwClamp(emph * 0.72, 0, 1);
          const cr = Math.round(oceanRgb[0] + (accentRgb[0] - oceanRgb[0]) * tintT);
          const cg = Math.round(oceanRgb[1] + (accentRgb[1] - oceanRgb[1]) * tintT);
          const cb = Math.round(oceanRgb[2] + (accentRgb[2] - oceanRgb[2]) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else {
          const area = 0.22 + dayF * 0.07 + tGlow * 0.19;
          const extent = 0.5 * span * area;
          const alpha = oceanFade * (0.085 + dayF * 0.045 + tGlow * 0.16);
          if (alpha < 0.008) continue;

          const tintT = pwClamp(emph * 0.65, 0, 1);
          const cr = Math.round(oceanRgb[0] + (accentRgb[0] - oceanRgb[0]) * tintT);
          const cg = Math.round(oceanRgb[1] + (accentRgb[1] - oceanRgb[1]) * tintT);
          const cb = Math.round(oceanRgb[2] + (accentRgb[2] - oceanRgb[2]) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        }
      }
    }
  }

  // Draw crisp grid-aligned square focus ring around hovered/pinned server or cluster
  if (activeClusterKey) {
    const hit = hitList.find((item) => item.cluster.key === activeClusterKey);
    if (hit && hit.cells.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const half = 0.5 * span;
      for (const cell of hit.cells) {
        if (cell.cx - half < minX) minX = cell.cx - half;
        if (cell.cx + half > maxX) maxX = cell.cx + half;
        if (cell.cy - half < minY) minY = cell.cy - half;
        if (cell.cy + half > maxY) maxY = cell.cy + half;
      }
      const pad = 2.2;
      ctx.save();
      ctx.strokeStyle = isLight ? "rgba(24, 27, 36, 0.55)" : "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2, 2.5);
      } else {
        ctx.rect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

function hitTestMapCluster(localX, localY) {
  let best = null;
  let bestDist = 12; // generous 12px hit radius around each snapped 5px server square
  for (const item of pwCache.serverHitList) {
    for (const cell of item.cells) {
      const d = Math.hypot(localX - cell.cx, localY - cell.cy);
      if (d < bestDist) {
        bestDist = d;
        best = item.cluster;
      }
    }
  }
  return best;
}

export function renderMapMarkers() {
  if (!state.settings.show_world_map) return;
  drawWorldMapCanvas();

  const tooltip = document.getElementById("map-tooltip");
  const activeKey = state.pinnedClusterKey || state.hoveredClusterKey;
  if (activeKey) {
    const found = lastClusters.find((c) => c.key === activeKey);
    if (found) {
      positionMapTooltip(found, Boolean(state.pinnedClusterKey));
    } else {
      state.pinnedClusterKey = null;
      state.hoveredClusterKey = null;
      if (tooltip) tooltip.classList.add("hidden");
    }
  }
}

export function initWorldMapInteractions(openDetail) {
  openNodeDetail = openDetail;
  const canvas = document.getElementById("world-map-canvas");
  const tooltip = document.getElementById("map-tooltip");
  if (!canvas || !tooltip) return;

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTestMapCluster(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hit ? "pointer" : "default";

    const nextKey = hit ? hit.key : null;
    if (state.pinnedClusterKey && nextKey !== state.pinnedClusterKey) return;
    if (nextKey === state.hoveredClusterKey) return;

    state.hoveredClusterKey = nextKey;
    drawWorldMapCanvas();
    if (hit) {
      positionMapTooltip(hit, false);
    } else if (!state.pinnedClusterKey) {
      tooltip.classList.add("hidden");
    }
  });

  canvas.addEventListener("pointerleave", () => {
    canvas.style.cursor = "default";
    if (state.hoveredClusterKey !== null) {
      state.hoveredClusterKey = null;
      drawWorldMapCanvas();
    }
    if (!state.pinnedClusterKey) tooltip.classList.add("hidden");
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTestMapCluster(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) {
      if (state.pinnedClusterKey) {
        state.pinnedClusterKey = null;
        tooltip.classList.add("hidden");
        drawWorldMapCanvas();
      }
      return;
    }
    e.stopPropagation();
    if (hit.nodes.length === 1) {
      state.pinnedClusterKey = null;
      state.hoveredClusterKey = null;
      tooltip.classList.add("hidden");
      drawWorldMapCanvas();
      state.selectedNodeId = hit.nodes[0].uuid;
      openNodeDetail();
    } else {
      state.pinnedClusterKey = state.pinnedClusterKey === hit.key ? null : hit.key;
      drawWorldMapCanvas();
      if (state.pinnedClusterKey) {
        positionMapTooltip(hit, true);
      } else {
        tooltip.classList.add("hidden");
      }
    }
  });
}

function positionMapTooltip(cluster, interactive) {
  const tooltip = document.getElementById("map-tooltip");
  if (!cluster || !tooltip) return;

  const xPct = cluster._cxPct !== undefined ? cluster._cxPct : cluster.xPct;
  const yPct = cluster._cyPct !== undefined ? cluster._cyPct : cluster.yPct;
  const { nodes } = cluster;
  const alignRight = xPct > 58;
  const placeBelow = yPct < 42;

  tooltip.classList.toggle("pointer-events-none", !interactive);
  tooltip.classList.toggle("pointer-events-auto", interactive);

  if (nodes.length === 1) {
    const n = nodes[0];
    const color = nodeStatusColor(n);
    tooltip.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-1.5">
          ${renderFlagBadge(n.region, "sm")}
          <span class="truncate font-medium">${n.name}</span>
        </div>
        <span class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${color};"></span>
      </div>
      <div class="mt-1.5 flex items-center justify-between mono-num text-[10.5px]" style="color: var(--sg-muted-fg);">
        <span>CPU ${n.online ? n.cpu.toFixed(1) + "%" : "—"}</span>
        <span>↑ ${n.online ? formatRate(n.netOut) : "0 B/s"}</span>
      </div>
    `;
  } else {
    const sorted = sortNodesBySeverity(nodes);
    const cityLabel = formatCityName(nodes[0].city || nodes[0].region);
    const onlineCnt = nodes.filter((n) => n.online).length;
    tooltip.innerHTML = `
      <div class="mb-1.5 flex items-center justify-between gap-2 border-b pb-1.5" style="border-color: var(--sg-border);">
        <div class="flex items-center gap-1.5 font-medium">
          ${renderFlagBadge(nodes[0].region, "sm")}
          <span>${cityLabel}</span>
        </div>
        <span class="mono-num text-[10px]" style="color: var(--sg-muted-fg);">${onlineCnt}/${nodes.length} ${t("online")}</span>
      </div>
      <div class="max-h-36 space-y-1 overflow-y-auto">
        ${sorted.map((n) => {
          const color = nodeStatusColor(n);
          return `
            <button type="button" data-pick-node="${n.uuid}" class="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/10">
              <span class="flex min-w-0 items-center gap-1.5">
                <span class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${color};"></span>
                <span class="truncate">${n.name}</span>
              </span>
              <span class="mono-num shrink-0 text-[10px]" style="color: var(--sg-muted-fg);">${n.online ? n.cpu.toFixed(0) + "%" : t("offline")}</span>
            </button>
          `;
        }).join("")}
      </div>
      ${!interactive ? `<div class="mt-1.5 text-[10px]" style="color: var(--sg-subtle-fg);">${state.lang === "en" ? "Click cluster to pin & pick node" : "点击聚合点固定并选择节点"}</div>` : ""}
    `;

    if (interactive) {
      tooltip.querySelectorAll("[data-pick-node]").forEach((rowBtn) => {
        rowBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          state.pinnedClusterKey = null;
          state.hoveredClusterKey = null;
          tooltip.classList.add("hidden");
          drawWorldMapCanvas();
          state.selectedNodeId = rowBtn.getAttribute("data-pick-node");
          openNodeDetail();
        });
      });
    }
  }

  // Reveal first to measure actual rendered dimensions, then strictly clamp inside #map-viewport
  tooltip.style.transform = "none";
  tooltip.classList.remove("hidden");

  const viewport = document.getElementById("map-viewport");
  if (viewport) {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const tipW = tooltip.offsetWidth || 200;
    const tipH = tooltip.offsetHeight || 80;
    const pad = 8;
    const gap = 12;
    const anchorX = (xPct / 100) * vw;
    const anchorY = (yPct / 100) * vh;

    let left = alignRight ? anchorX - tipW - gap : anchorX + gap;
    if (left < pad) left = anchorX + gap;
    if (left + tipW > vw - pad) left = vw - tipW - pad;
    left = Math.max(pad, left);

    let top = placeBelow ? anchorY + gap : anchorY - tipH - gap;
    if (top < pad) top = anchorY + gap;
    if (top + tipH > vh - pad) top = vh - tipH - pad;
    top = Math.max(pad, top);

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  } else {
    tooltip.style.left = `${xPct.toFixed(2)}%`;
    tooltip.style.top = `${yPct.toFixed(2)}%`;
    tooltip.style.transform = `translate(${alignRight ? "calc(-100% - 12px)" : "12px"}, ${placeBelow ? "12px" : "calc(-100% - 12px)"})`;
  }
}

let lastTerminatorMinute = -1;
export function updateUtc8Clock() {
  const now = Date.now();
  if (state.settings.show_map_clock) {
    const clockEl = document.getElementById("map-utc8-time");
    if (clockEl) clockEl.textContent = formatUtc8Time(now);
  }
  const minBucket = Math.floor(now / 60000);
  if (
    lastTerminatorMinute !== -1 &&
    minBucket !== lastTerminatorMinute &&
    state.settings.show_world_map &&
    state.settings.show_solar_terminator
  ) {
    drawWorldMapCanvas();
  }
  lastTerminatorMinute = minBucket;
}

