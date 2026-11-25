import type { PingHistoryPoint, PingTask, PingTrackStats } from '../types/komari';

export const SLAT_SIZE = 5.5;
export const GAP_X = 2.5;
export const GAP_Y = 1.8;
export const ROUNDNESS = 0.25;
export const SLAT_RADIUS = Math.max(0.6, ROUNDNESS * SLAT_SIZE / 2);

export function sgSmoothstep(e0: number, e1: number, x: number): number {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const u = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

export function drawSlatRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number,
  w = SLAT_SIZE, h = SLAT_SIZE, r = SLAT_RADIUS): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

// Multi-stop fade avoids a visible seam at the chart edges.
export function fillEasedVignette(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number,
  rgb: string, maxAlpha: number, rx: number, ry: number, rw: number, rh: number): void {
  if (maxAlpha <= 0 || rw <= 0 || rh <= 0) return;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, `rgba(${rgb}, ${maxAlpha.toFixed(3)})`);
  grad.addColorStop(0.22, `rgba(${rgb}, ${(maxAlpha * 0.78).toFixed(3)})`);
  grad.addColorStop(0.48, `rgba(${rgb}, ${(maxAlpha * 0.44).toFixed(3)})`);
  grad.addColorStop(0.72, `rgba(${rgb}, ${(maxAlpha * 0.16).toFixed(3)})`);
  grad.addColorStop(0.88, `rgba(${rgb}, ${(maxAlpha * 0.035).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(rx, ry, rw, rh);
}

const direction = 271 * Math.PI / 180;
const waveLayers = [
  [0, 1.8, 1.0, 0.6], [0.34, 1.15, 0.58, 2.1], [-0.42, 0.76, 0.34, 4.3], [0.78, 0.48, 0.18, 1.4],
].map(([turn, length, height, shift], i) => {
  const angle = direction + turn;
  const k = 2 * Math.PI / length;
  return { k, cos: Math.cos(angle), sin: Math.sin(angle), height, shift, warp: 0.6 + 0.3 * i };
});
const waveHeightTotal = waveLayers.reduce((total, { height }) => total + height, 0);

export function computeSlatWave(cx: number, cy: number, W: number, H: number) {
  const v = Math.max(0, Math.min(1, cy / H));
  const depth = 9 / (v + 8);
  const wx = ((cx - W * 0.5) / H) * depth / 2.5;
  const wy = (depth - 1) * 8 * 2.2 / 2.5;
  const meander = 0.55 * Math.sin((wx * 0.23 + wy * 0.41) * 0.9)
    + 0.3 * Math.sin((wx * -0.37 + wy * 0.19) * 1.4);

  let waveHeight = 0;
  for (const { k, cos, sin, height, shift, warp } of waveLayers) {
    waveHeight += height * Math.cos(k * (wx * cos + wy * sin) + shift + meander * warp);
  }
  const level = Math.max(0, Math.min(1, 0.5 + 0.5 * waveHeight / (waveHeightTotal * 0.85)));
  const crest = sgSmoothstep(0.6, 1, level);
  const glint = crest * crest * 0.8;
  const light = Math.max(0.35, Math.min(1, level ** 0.7 + glint * 0.8));
  const tint = Math.max(0, Math.min(1, glint * 1.4));
  return { light, tint };
}

export function calcAdaptiveRateCeiling(bytesPerSecArr: Iterable<number | null | undefined>): number {
  let peak = 0;
  for (const rate of bytesPerSecArr) {
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > peak) peak = rate;
  }
  const target = Math.max(1, peak * 1.1);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return Math.ceil(target / magnitude * 2) * magnitude / 2;
}

export function selectPingTasks(tasks: readonly PingTask[], recordTasks: readonly PingTask[],
  nodeUuid: string, featuredTaskIds: readonly number[] = []): PingTask[] {
  const merged = new Map<number, PingTask>();
  for (const task of tasks) merged.set(task.id, task);
  for (const task of recordTasks) {
    if (!merged.has(task.id)) merged.set(task.id, task);
  }
  for (const [id, task] of merged) {
    if (task.clients?.length && !task.clients.includes(nodeUuid)) merged.delete(id);
  }
  const selected: PingTask[] = [];
  for (const id of featuredTaskIds) {
    const task = merged.get(id);
    if (!task) continue;
    selected.push(task);
    if (selected.length === 3) return selected;
    merged.delete(id);
  }
  if (selected.length) return selected;
  for (const task of merged.values()) {
    selected.push(task);
    if (selected.length === 3) break;
  }
  return selected;
}

function isSuccessfulPing(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function summarizePingTracks(tasks: readonly PingTask[], points: readonly PingHistoryPoint[]): PingTrackStats[] {
  return tasks.map(task => {
    const records = points.filter(point => point.taskId === task.id);
    let latestTime = -Infinity;
    let latest: number | null = null;
    let failures = 0;
    for (const { time, value } of records) {
      const latency = isSuccessfulPing(value) ? value : null;
      if (latency === null) failures++;
      if (time >= latestTime) {
        latestTime = time;
        latest = latency;
      }
    }
    return { task, latest, loss: records.length ? 100 * failures / records.length : null, points: records };
  });
}

export interface PingBucket {
  latency: number | null;
  loss: number | null;
}

// Bucket one task's records; null loss means no observation, not a successful probe.
export function bucketPingPoints(points: readonly PingHistoryPoint[], start: number, end: number, count: number): PingBucket[] {
  const buckets = Array.from({ length: count }, (): PingBucket => ({ latency: null, loss: null }));
  if (count <= 0 || end <= start) return buckets;
  const totals = new Uint32Array(count);
  const successes = new Uint32Array(count);
  const sums = new Float64Array(count);
  const scale = count / (end - start);
  for (const { time, value } of points) {
    if (time < start || time > end) continue;
    const col = Math.min(count - 1, Math.floor((time - start) * scale));
    totals[col]++;
    if (isSuccessfulPing(value)) {
      successes[col]++;
      sums[col] += value;
    }
  }
  for (let col = 0; col < count; col++) {
    if (!totals[col]) continue;
    buckets[col].loss = 100 * (totals[col] - successes[col]) / totals[col];
    if (successes[col]) buckets[col].latency = sums[col] / successes[col];
  }
  return buckets;
}
