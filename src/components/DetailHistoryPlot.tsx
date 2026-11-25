import { useEffect, useMemo, useRef, useState } from 'react';
import { computeSlatWave, drawSlatRoundRect, fillEasedVignette, GAP_X, SLAT_RADIUS, SLAT_SIZE, sgSmoothstep } from '../lib/slats-math';
import type { HistoryHours, Language } from '../types/komari';
import { offsetLabel, PLOT_BOTTOM, PLOT_HEIGHT, PLOT_PITCH_X, PLOT_PITCH_Y, PLOT_TOP, SERIES_COLORS, trackRows, type PlotSeries } from './detail-history-geometry';
import { detailLabels } from './node-detail-support';

const LIGHT_PALETTES = [
  [[68, 118, 164], [44, 90, 134], 'rgba(255,255,255,.52)'],
  [[212, 154, 82], [188, 130, 58], 'rgba(255,255,255,.52)'],
  [[86, 168, 121], [64, 146, 100], 'rgba(255,255,255,.52)'],
  [[217, 107, 99], [217, 107, 99], 'rgba(255,255,255,.58)'],
] as const;
const DARK_PALETTES = [
  [[150, 196, 236], [176, 218, 252], 'rgba(218,240,255,.56)'],
  [[219, 165, 89], [238, 192, 124], 'rgba(252,226,184,.56)'],
  [[99, 186, 137], [126, 210, 162], 'rgba(186,242,210,.56)'],
  [[218, 114, 105], [218, 114, 105], 'rgba(255,198,192,.62)'],
] as const;
const yTop = (row: number) => PLOT_TOP + row * PLOT_PITCH_Y;
const yBottom = (row: number) => yTop(row) + SLAT_SIZE;
const DOMAIN_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

export function DetailHistoryPlot({ getSeries, isPing, lang, hours }: {
  getSeries: (columns: number) => PlotSeries[];
  isPing: boolean;
  lang: Language;
  hours: HistoryHours;
}) {
  const t = detailLabels(lang);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const count = Math.max(1, Math.ceil((width + GAP_X) / PLOT_PITCH_X));
  const origin = (width - count * PLOT_PITCH_X + GAP_X) / 2;
  const series = useMemo(() => getSeries(count), [getSeries, count]);
  const tracks = useMemo(() => trackRows(series.length, isPing), [series.length, isPing]);
  const bottom = PLOT_BOTTOM;
  const hasSamples = series.some(track => track.columns.some(col => col.value !== null || col.loss !== null));
  const ceiling = useMemo(() => {
    if (!isPing) return 100;
    let peak = 0;
    for (const track of series) for (const { value } of track.columns) peak = Math.max(peak, value ?? 0);
    return Math.max(120, Math.ceil((peak + 10) / 40) * 40);
  }, [series, isPing]);
  const ticks = useMemo(() => tracks.flatMap(({ start, end }) => {
    const fractions = !isPing ? [1, 0.5, 0] : tracks.length === 1 ? [1, 0.75, 0.5, 0.25, 0] : [1, 0];
    return fractions.map(fraction => ({
      y: yTop(start) + (yBottom(end) - yTop(start)) * (1 - fraction),
      label: `${Math.round(fraction * ceiling)}${isPing ? 'ms' : '%'}`,
    }));
  }), [tracks, isPing, ceiling]);
  const active = hovered === null ? null : Math.min(count - 1, hovered);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || width <= 0) return;

    const draw = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const pixelsX = Math.round(width * dpr);
      const pixelsY = Math.round(PLOT_HEIGHT * dpr);
      if (canvas.width !== pixelsX) canvas.width = pixelsX;
      if (canvas.height !== pixelsY) canvas.height = pixelsY;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, PLOT_HEIGHT);
      const dark = document.documentElement.classList.contains('dark');
      const palettes = dark ? DARK_PALETTES : LIGHT_PALETTES;
      const dormant = dark ? '125,125,125' : '98,104,114';
      const vignette = dark ? '24,23,29' : '236,239,245';
      const rowCount = Math.ceil((PLOT_HEIGHT - PLOT_TOP) / PLOT_PITCH_Y);
      const trackAt = Array.from({ length: rowCount }, (_, row) => tracks.findIndex(({ start, end }) => row >= start && row <= end));
      const lastRow = tracks.at(-1)?.end ?? -1;
      const tops = new Float64Array(tracks.length);
      for (let col = 0; col < count; col++) {
        const x = origin + col * PLOT_PITCH_X;
        const cx = x + SLAT_SIZE / 2;
        const boost = col === active ? 0.14 : col === count - 1 ? 0.06 : 0;
        const left = 0.62 + 0.38 * sgSmoothstep(2, 46, cx);
        const right = 0.78 + 0.22 * sgSmoothstep(width - 2, width - 22, cx);
        const attenuation = col === active ? 1 : (0.82 + 0.18 * left) * (0.92 + 0.08 * right);
        for (let index = 0; index < tracks.length; index++) {
          const { start, end } = tracks[index];
          const { value } = series[index].columns[col];
          tops[index] = value === null ? Infinity : end - Math.max(1, Math.round(Math.min(1, value / ceiling) * (end - start + 1))) + 1;
        }
        for (let row = -1; row < rowCount; row++) {
          const index = trackAt[row] ?? -1;
          if (isPing && index < 0 && row >= 0 && row <= lastRow) continue;
          const y = yTop(row);
          const cy = y + SLAT_SIZE / 2;
          const sample = series[index]?.columns[col];
          const loss = sample?.loss ?? 0;
          const timeout = loss >= 100;
          const lit = index >= 0 && (timeout || row >= tops[index]);
          drawSlatRoundRect(ctx, x, y);
          if (!lit) {
            const fade = (0.28 + 0.72 * sgSmoothstep(0, PLOT_TOP + 4, cy)) * (0.28 + 0.72 * sgSmoothstep(PLOT_HEIGHT - 2, bottom + 4, cy));
            const alpha = (dark ? 0.068 : 0.058) * left * right * fade * (index >= 0 && col === active ? 1.8 : 1);
            ctx.fillStyle = `rgba(${dormant},${alpha})`;
            ctx.fill();
            continue;
          }
          const { light, tint } = computeSlatWave(cx, cy, width, PLOT_HEIGHT);
          const cap = row === (timeout ? tracks[index].start : tops[index]);
          const red = timeout || (loss > 0 && cap);
          const [base, glint, rim] = palettes[red ? 3 : series[index].palette];
          const r = Math.round(base[0] + (glint[0] - base[0]) * tint);
          const g = Math.round(base[1] + (glint[1] - base[1]) * tint);
          const b = Math.round(base[2] + (glint[2] - base[2]) * tint);
          const alpha = cap ? (red ? (dark ? 0.90 : 0.86) : (dark ? 0.86 : 0.82))
            : timeout ? (dark ? 0.22 : 0.18) + light * 0.08 : (dark ? 0.62 : 0.58) + light * 0.18;
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.96, (alpha + boost * (timeout && !cap ? 0.45 : 1)) * attenuation)})`;
          ctx.fill();
          if (cap) {
            ctx.fillStyle = rim;
            ctx.fillRect(x + SLAT_RADIUS, y, SLAT_SIZE - SLAT_RADIUS * 2, 1);
          }
        }
      }
      const leftEdge = Math.min(54, width * 0.2);
      const rightEdge = Math.min(22, width * 0.08);
      fillEasedVignette(ctx, 0, 0, leftEdge, 0, vignette, dark ? 0.42 : 0.46, 0, 0, leftEdge, PLOT_HEIGHT);
      fillEasedVignette(ctx, width, 0, width - rightEdge, 0, vignette, dark ? 0.20 : 0.22, width - rightEdge, 0, rightEdge, PLOT_HEIGHT);
      fillEasedVignette(ctx, 0, PLOT_HEIGHT, 0, bottom + 2, vignette, dark ? 0.36 : 0.40, 0, bottom + 2, width, PLOT_HEIGHT - bottom - 2);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.085)' : 'rgba(30,36,48,.105)';
      ctx.setLineDash([2, 3]);
      for (const { y } of ticks) {
        const line = Math.round(y) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, line);
        ctx.lineTo(width, line);
        ctx.stroke();
      }
    };
    draw();
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => theme.disconnect();
  }, [active, bottom, ceiling, count, isPing, origin, series, ticks, tracks, width]);

  const anchor = active === null ? 0 : origin + (active + 0.5) * PLOT_PITCH_X;
  const right = anchor > width / 2;
  const selected = hasSamples && active !== null ? {
    time: offsetLabel(Math.round(hours * 60 * (1 - active / Math.max(1, count - 1))), t.now),
    metrics: series.map(({ label, palette, columns }) => {
      const { value, loss } = columns[active];
      return {
        label, palette, timedOut: loss === 100,
        value: loss === 100 ? t.timeout : value === null ? '—' : isPing ? `${Math.round(value)}ms` : `${value.toFixed(1)}%`,
        partialLoss: loss !== null && loss > 0 && loss < 100 ? t.loss(loss.toFixed(1)) : '',
      };
    }),
  } : null;
  return (
    <div className="relative" style={{ height: PLOT_HEIGHT }}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full cursor-crosshair focus-visible:outline-[var(--sg-focus-line)]"
        role="img" aria-label={isPing ? t.ping : t.load} tabIndex={hasSamples ? 0 : undefined}
        onPointerMove={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          const y = event.clientY - rect.top;
          const column = Math.floor((event.clientX - rect.left - origin) / PLOT_PITCH_X);
          setHovered(hasSamples && y >= 2 && y <= bottom + 8 && column >= 0 && column < count ? column : null);
        }}
        onPointerLeave={() => setHovered(null)} onBlur={() => setHovered(null)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const step = event.key === 'ArrowLeft' ? -1 : 1;
            setHovered(column => column === null ? count - 1 : Math.max(0, Math.min(count - 1, column + step)));
          }
        }} />
      <div aria-hidden="true" className="mono-num pointer-events-none absolute inset-0 text-[9.5px] leading-none text-[var(--sg-tick-fg)] [text-shadow:var(--sg-tick-shadow)]">
        {ticks.map(({ y, label }) => <span key={y} className="absolute left-3 -translate-y-1/2" style={{ top: y }}>{label}</span>)}
        <div className="absolute inset-x-3.5 flex justify-between text-[var(--sg-subtle-fg)]" style={{ top: bottom + 9 }}>
          {DOMAIN_TICKS.map(fraction => <span key={fraction}>{offsetLabel(Math.round(hours * 60 * (1 - fraction)), t.now)}</span>)}
        </div>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selected ? [selected.time, ...selected.metrics.map(metric => `${metric.label}: ${metric.value}${metric.partialLoss ? `, ${metric.partialLoss}` : ''}`)].join(' · ') : ''}
      </div>
      {selected && (
        <div aria-hidden="true" className="sg-popover mono-num pointer-events-none absolute top-1 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md px-2 py-1 text-[10px]"
          style={right ? { right: Math.max(8, width - anchor + 6) } : { left: Math.max(8, anchor + 6) }}>
          <span className="text-[var(--sg-subtle-fg)]">{selected.time}</span>
          {selected.metrics.map(({ label, palette, timedOut, value, partialLoss }) => (
            <span key={palette} className="inline-flex flex-wrap items-center gap-1">
              <span className="size-1.5 rounded-[1.5px]" style={{ backgroundColor: timedOut ? 'var(--sg-danger)' : SERIES_COLORS[palette] }} />
              <span className="text-[var(--sg-muted-fg)]">{label}</span>
              <strong className={timedOut ? 'text-[var(--sg-danger)]' : undefined}>{value}</strong>
              {partialLoss && <span className="text-[var(--sg-danger)]">{partialLoss}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
