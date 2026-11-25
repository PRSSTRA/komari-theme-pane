import { bucketPingPoints, GAP_X, GAP_Y, SLAT_SIZE } from '../lib/slats-math.ts';
import type { HistoryHours, LoadHistoryPoint, PingTrackStats } from '../types/komari';

export const PLOT_HEIGHT = 212;
export const PLOT_TOP = 10;
export const PLOT_PITCH_X = SLAT_SIZE + GAP_X;
export const PLOT_PITCH_Y = SLAT_SIZE + GAP_Y;
const unifiedRowEnd = Math.floor((PLOT_HEIGHT - PLOT_TOP - 26 - SLAT_SIZE) / PLOT_PITCH_Y);
export const PLOT_BOTTOM = PLOT_TOP + unifiedRowEnd * PLOT_PITCH_Y + SLAT_SIZE;
const HOUR = 3_600_000;
export const SERIES_COLORS = ['var(--sg-series-cpu)', 'var(--sg-warn)', 'var(--sg-success)'] as const;
export type SeriesColor = 0 | 1 | 2;

export interface PlotColumn {
  value: number | null;
  loss: number | null;
}

export interface PlotSeries {
  label: string;
  palette: SeriesColor;
  columns: PlotColumn[];
}

export function historyWindow(points: readonly { time: number }[], hours: HistoryHours, requestedAt: number) {
  const end = points.reduce((latest, point) => Math.max(latest, point.time), requestedAt);
  return { start: end - hours * HOUR, end };
}

export function trackRows(count: number, isPing: boolean) {
  if (count === 0) return [];
  const gap = isPing ? 1 : 3;
  const available = unifiedRowEnd + 1 - (count - 1) * gap;
  const each = Math.floor(available / count);
  const remainder = available % count;
  let start = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = each + (index >= count - remainder ? 1 : 0);
    const range = { start, end: start + size - 1 };
    start += size + gap;
    return range;
  });
}

export function loadColumns(points: readonly LoadHistoryPoint[], start: number, end: number, count: number): PlotSeries[] {
  const series = (['cpu', 'ram'] as const).map((name, index) => {
    const sums = new Float64Array(count);
    const totals = new Uint32Array(count);
    const scale = count / (end - start);
    for (const point of points) {
      const value = point[name];
      if (value === null || point.time < start || point.time > end) continue;
      const col = Math.min(count - 1, Math.floor((point.time - start) * scale));
      sums[col] += value;
      totals[col]++;
    }
    return {
      label: name.toUpperCase(), palette: index === 0 ? 0 : 2,
      columns: Array.from(sums, (sum, column): PlotColumn => ({ value: totals[column] ? sum / totals[column] : null, loss: null })),
    } satisfies PlotSeries;
  });
  return series;
}

export function pingColumns(tracks: readonly (PingTrackStats & { label: string; palette: SeriesColor })[], start: number, end: number, count: number): PlotSeries[] {
  return tracks.map(({ label, palette, points }) => ({
    label, palette, columns: bucketPingPoints(points, start, end, count).map(({ latency: value, loss }) => ({ value, loss })),
  }));
}

export function offsetLabel(minutes: number, now: string) {
  if (minutes <= 0) return now;
  if (minutes < 60) return `-${minutes}m`;
  const remainder = minutes % 60;
  return `-${Math.floor(minutes / 60)}h${remainder ? ` ${remainder}m` : ''}`;
}
