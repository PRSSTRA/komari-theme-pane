import { useEffect, useRef, useState } from 'react';
import { formatRateParts, fmtRateTick } from '../lib/format';
import { calcAdaptiveRateCeiling, computeSlatWave, drawSlatRoundRect, fillEasedVignette, GAP_X, GAP_Y, SLAT_SIZE } from '../lib/slats-math';
import { getLabels } from '../lib/i18n';
import type { Language, NetHistoryPoint } from '../types/komari';

const dx = SLAT_SIZE + GAP_X;
const dy = SLAT_SIZE + GAP_Y;
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function NetworkSlats({ points, direction, lang, height, currentRate }: {
  points: readonly NetHistoryPoint[];
  direction: 'up' | 'down';
  lang: Language;
  height?: number;
  currentRate?: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ column: number; x: number } | null>(null);
  const columns = Math.max(1, Math.floor(width / dx));
  const padding = Math.max(columns - points.length, 0);
  const offset = Math.max(points.length - columns, 0);
  const endPoint = points.at(-1);
  const startPoint = points[offset];
  const rate = currentRate === undefined ? endPoint?.[direction] : currentRate;
  const hovered = hover && hover.column >= padding ? points[offset + hover.column - padding] : undefined;
  const label = getLabels(lang)[direction];
  const limit = calcAdaptiveRateCeiling((function* () {
    for (let i = offset; i < points.length; i++) yield points[i][direction];
  })());

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
    if (!canvas || !ctx || width < dx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const size = canvas.clientHeight;
      const dpr = Math.min(2, devicePixelRatio);
      const pixelsX = Math.round(width * dpr);
      const pixelsY = Math.round(size * dpr);
      if (canvas.width !== pixelsX) canvas.width = pixelsX;
      if (canvas.height !== pixelsY) canvas.height = pixelsY;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, size);
      const dark = document.documentElement.classList.contains('dark');
      const rows = Math.floor((size - 1 + dy - SLAT_SIZE) / dy);
      const origin = (width - columns * dx + dx - SLAT_SIZE) * 0.5;
      const base = size - 1;
      const ink = dark ? '177,181,190' : '70,80,98';
      for (let col = 0; col < columns; col++) {
        const point = col >= padding ? points[col + offset - padding] : undefined;
        const rate = point?.[direction] ?? 0;
        const filled = rate > 0 ? Math.max(1, Math.round(rows * rate / limit)) : 0;
        const x = origin + col * dx;
        for (let row = 0; row < rows; row++) {
          const y = base - SLAT_SIZE - row * dy;
          const { light } = computeSlatWave(x + SLAT_SIZE * 0.5, y + SLAT_SIZE * 0.5, width, size);
          const edge = Math.min(1, 0.4 + Math.min(x, width - x) / 24);
          const opacity = row < filled ? (row === filled - 1 ? 0.65 : 0.32 + light * 0.22) : (0.02 + light * 0.035);
          ctx.fillStyle = `rgba(${ink},${opacity * edge + (hover?.column === col && point ? 0.12 : 0)})`;
          drawSlatRoundRect(ctx, x, y);
          ctx.fill();
        }
      }
      if (dark) fillEasedVignette(ctx, width, 0, width - 28, 0, '24, 23, 29', 0.6, Math.max(0, width - 28), 0, Math.min(28, width), size - 1);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(27,30,37,.27)';
      ctx.setLineDash([2, 3]);
      for (const y of [0.5, Math.round(base / 2) + 0.5, base + 0.5]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    draw();
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => theme.disconnect();
  }, [points, width, height, columns, padding, offset, direction, limit, hover?.column]);

  return (
    <div className="grid min-w-0 gap-1.5" style={{ '--pane-net-chart-height': height ? `${height}px` : undefined } as React.CSSProperties}>
      <div className="flex justify-between gap-2 text-[11px]">
        <span className="text-[var(--sg-muted-fg)]">{direction === 'up' ? '↑' : '↓'} {label}</span>
        <span className="mono-num">{rate == null ? '—' : formatRateParts(rate).text}</span>
      </div>
      <div className="relative h-[var(--pane-net-chart-height,72px)]">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-label={label} role="img" onPointerLeave={() => setHover(null)} onPointerMove={event => {
          const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
          const column = Math.min(columns - 1, Math.max(0, Math.floor((x - (width - columns * dx) / 2) / dx)));
          setHover({ column, x: width < 148 ? width / 2 : Math.min(Math.max(74, x), width - 74) });
        }} />
        <div aria-hidden="true" className="mono-num pointer-events-none absolute inset-y-0 right-1 flex flex-col justify-between text-[9px] text-[var(--sg-tick-fg)]">
          <span>{fmtRateTick(limit)}</span><span>{fmtRateTick(limit / 2)}</span><span>0</span>
        </div>
        {hovered && <span role="tooltip" className="sg-popover mono-num pointer-events-none absolute top-1 z-10 w-max max-w-full -translate-x-1/2 rounded-md px-2 py-1 text-center text-[10px]" style={{ left: hover?.x }}>{clock.format(hovered.time)} · {formatRateParts(hovered[direction]).text}</span>}
      </div>
      <div aria-hidden="true" className="mono-num flex h-3 justify-between text-[9px] text-[var(--sg-muted-fg)]">
        <span>{startPoint && clock.format(startPoint.time)}</span><span>{endPoint && clock.format(endPoint.time)}</span>
      </div>
    </div>
  );
}
