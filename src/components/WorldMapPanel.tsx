import { Globe } from 'lucide-react';
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RegionFlag } from '../lib/flags';
import { getLabels, getNodeListLabels } from '../lib/i18n';
import { sgSmoothstep } from '../lib/slats-math';
import { formatUtc8Time, getSolarSubpoint, projectGeoToMapPercent, sampleWorldLand } from '../lib/world-map-matrix';
import type { KomariNode, Language, MapOverlapMode } from '../types/komari';

const ASPECT = 1024 / 473;
const PITCH = 5;
const MARK = PITCH * 0.95;
const MARKER_SIZE = 24;
const RAD = Math.PI / 180;
const colors = { online: 'var(--sg-success)', highLoad: 'var(--sg-warn)', offline: 'var(--sg-danger)' };
type Size = { width: number; height: number };
type MapGrid = { w: number; h: number; cols: number; rows: number; left: number; top: number; x: number; y: number };

function nodeStatus(node: KomariNode) {
  return !node.online ? 'offline' : (node.cpu ?? 0) >= 88 ? 'highLoad' : 'online';
}

function mapGrid({ width, height }: Size): MapGrid {
  const w = Math.min(width, height * ASPECT);
  const h = w / ASPECT;
  const cols = Math.floor(w / PITCH);
  const rows = Math.floor(h / PITCH);
  return {
    w, h, cols, rows, left: (width - w) / 2, top: (height - h) / 2,
    x: (width - (cols - 1) * PITCH) / 2, y: (height - (rows - 1) * PITCH) / 2,
  };
}

function drawWorld(ctx: CanvasRenderingContext2D, grid: MapGrid, dark: boolean, terminator: boolean) {
  const { w, h, x, y, cols, rows, left, top } = grid;
  const sun = terminator ? getSolarSubpoint(Date.now()) : undefined;
  const sunLat = Math.sin(sun?.declRad ?? 0);
  const sunCos = Math.cos(sun?.declRad ?? 0);
  const baseColor = dark ? '#c0c6d2' : '#626a77';
  const crestColor = dark ? '#ecf0f6' : '#222630';
  let ink = '';
  ctx.save();
  for (let row = 0; row < rows; row++) {
    const cy = y + row * PITCH;
    const v = (cy - top) / h;
    const lat = (26.807 - 48 * v) / 0.3259;
    const latRad = lat * RAD;
    const lonScale = 0.3108 * (1 - 0.11 * (lat / 90) ** 2);
    const latitudeLight = Math.sin(latRad) * sunLat;
    const longitudeLight = Math.cos(latRad) * sunCos;
    const southFade = sgSmoothstep(0, 0.42, 1 - v);
    for (let col = 0; col < cols; col++) {
      const cx = x + col * PITCH;
      const u = (cx - left) / w;
      const land = sampleWorldLand(u, v);
      const altitude = sun ? latitudeLight + longitudeLight * Math.cos((104 * u - 42.323) / lonScale * RAD - sun.subsolarLngRad) : 0;
      const twilight = sun ? Math.exp(-((altitude / 0.09) ** 2)) : 0;
      const day = sun ? sgSmoothstep(-0.12, 0.12, altitude) : 0.5;
      const lift = dark ? day : 1 - day;
      // Interference between a circular ripple and a diagonal wave gives the dots their texture.
      const wave = Math.cos(46 * Math.hypot(u - 0.34, (v - 0.22) / ASPECT) + 0.8 * Math.sin(21 * u + 11 * v));
      const color = twilight > 0.48 ? crestColor : baseColor;
      if (ink !== color) ctx.fillStyle = ink = color;
      let diameter: number;
      if (land > 0.06) {
        diameter = MARK * Math.sqrt(land * Math.min(0.95, 0.28 + 0.23 * lift + 0.42 * twilight + 0.048 * wave));
        ctx.globalAlpha = Math.min(0.76, 0.27 + 0.20 * lift + 0.30 * twilight + 0.039 * wave) * (0.34 + 0.66 * southFade);
      } else {
        const sideFade = sgSmoothstep(0, 0.14, Math.min(u, 1 - u));
        diameter = 0.65 + 0.32 * wave + 0.25 * twilight;
        ctx.globalAlpha = (0.041 + 0.04 * twilight) * sideFade * southFade;
      }
      ctx.beginPath();
      ctx.roundRect(cx - diameter / 2, cy - diameter / 2, diameter, diameter, diameter * 0.15);
      ctx.fill();
    }
  }
  ctx.restore();
}

function WorldCanvas({ size, grid, showTerminator }: { size: Size; grid: MapGrid; showTerminator: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    const { width, height } = size;
    if (!canvas || !ctx || !width || !height) return;
    let visible = false;
    let minuteTimer: number | undefined;
    let resolution: MediaQueryList | undefined;

    function draw() {
      window.clearTimeout(minuteTimer);
      if (!canvas || !ctx || !visible || document.hidden) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelsX = Math.max(1, Math.round(width * dpr));
      const pixelsY = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelsX) canvas.width = pixelsX;
      if (canvas.height !== pixelsY) canvas.height = pixelsY;
      ctx.setTransform(pixelsX / width, 0, 0, pixelsY / height, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawWorld(ctx, grid, document.documentElement.classList.contains('dark'), showTerminator);
      if (showTerminator) minuteTimer = window.setTimeout(draw, 60_000 - Date.now() % 60_000);
    }

    function watchResolution() {
      resolution?.removeEventListener('change', watchResolution);
      resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      resolution.addEventListener('change', watchResolution);
      draw();
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      draw();
    });
    intersection.observe(canvas);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', draw);
    watchResolution();
    return () => {
      window.clearTimeout(minuteTimer);
      intersection.disconnect();
      theme.disconnect();
      document.removeEventListener('visibilitychange', draw);
      resolution?.removeEventListener('change', watchResolution);
    };
  }, [size, grid, showTerminator]);
  return <canvas id="world-map-canvas" ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />;
}

function MapClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: number | undefined;
    function tick() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      const next = Date.now();
      setNow(next);
      timer = window.setTimeout(tick, 1_000 - next % 1_000);
    }
    tick();
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return <span className="mono-num inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] text-[var(--sg-muted-fg)]">
    <span className="text-[var(--sg-subtle-fg)]">UTC+8</span><time>{formatUtc8Time(now)}</time>
  </span>;
}

type Marker = { nodes: KomariNode[]; x: number; y: number; key: string };
const clamp = (number: number, min: number, max: number) => Math.min(Math.max(min, number), max);

function placeMarkers(nodes: readonly KomariNode[], mode: MapOverlapMode, grid: MapGrid): Marker[] {
  const { cols, rows, left, top, w, h } = grid;
  if (!cols || !rows) return [];
  const groups: Marker[] = [];
  const radius = w * 0.018;
  for (const node of nodes) {
    if (!node.geo || !node.region?.trim()) continue;
    const { xPct, yPct } = projectGeoToMapPercent(node.geo.lng, node.geo.lat);
    const x = left + w * xPct / 100;
    const y = top + h * yPct / 100;
    const group = mode === 'cluster' && groups.find(group => (x - group.x) ** 2 + (y - group.y) ** 2 < radius ** 2);
    if (!group) {
      groups.push({ nodes: [node], x, y, key: node.uuid });
      continue;
    }
    group.nodes.push(node);
    group.x += (x - group.x) / group.nodes.length;
    group.y += (y - group.y) / group.nodes.length;
  }

  const crowded = new Set<number>();
  const placed: Marker[] = [];
  const pad = Math.min(2, Math.floor((Math.min(cols, rows) - 1) / 2));
  for (const group of groups) {
    const col = clamp(Math.round((group.x - grid.x) / PITCH), pad, cols - 1 - pad);
    const row = clamp(Math.round((group.y - grid.y) / PITCH), pad, rows - 1 - pad);
    let best: number | undefined;
    // Search locally so separating neighboring markers never sends them across the map.
    for (let ring = 0; ring <= 5 && best === undefined; ring++) {
      for (let dy = -ring; dy <= ring && best === undefined; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const x = col + dx;
          const y = row + dy;
          if (x < pad || x >= cols - pad || y < pad || y >= rows - pad) continue;
          const cell = y * cols + x;
          if (!crowded.has(cell)) {
            best = cell;
            break;
          }
        }
      }
    }
    if (best === undefined) {
      // A count shows when the dense local grid runs out of distinct touch targets.
      let nearest = placed[0];
      for (const marker of placed) {
        if ((marker.x - group.x) ** 2 + (marker.y - group.y) ** 2 < (nearest.x - group.x) ** 2 + (nearest.y - group.y) ** 2) nearest = marker;
      }
      nearest.nodes.push(...group.nodes);
      continue;
    }
    const cx = best % cols;
    const cy = Math.floor(best / cols);
    for (let dy = Math.max(0, cy - 4); dy <= Math.min(rows - 1, cy + 4); dy++) {
      for (let dx = Math.max(0, cx - 4); dx <= Math.min(cols - 1, cx + 4); dx++) crowded.add(dy * cols + dx);
    }
    group.x = grid.x + cx * PITCH;
    group.y = grid.y + cy * PITCH;
    placed.push(group);
  }
  const severity = { offline: 0, highLoad: 1, online: 2 };
  for (const marker of placed) marker.nodes.sort((a, b) => severity[nodeStatus(a)] - severity[nodeStatus(b)]);
  return placed;
}

function MapBubble({ marker, size, id, lang, onOpenNode, onEnter, onLeave }: {
  marker: Marker; size: Size; id: string; lang: Language; onOpenNode: (uuid: string) => void;
  onEnter: () => void; onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const cluster = marker.nodes.length > 1;
  const labels = getNodeListLabels(lang);
  useLayoutEffect(() => {
    const bubble = ref.current;
    if (!bubble) return;
    function place(width: number, height: number) {
      const right = marker.x + 12;
      const below = marker.y + 12;
      const x = right + width + 8 <= size.width ? right : marker.x - width - 12;
      const y = below + height + 8 <= size.height ? below : marker.y - height - 12;
      const left = clamp(x, 8, Math.max(8, size.width - width - 8));
      const top = clamp(y, 8, Math.max(8, size.height - height - 8));
      setPosition(current => current.left === left && current.top === top ? current : { left, top });
    }
    const update = () => place(bubble.offsetWidth, bubble.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bubble);
    return () => observer.disconnect();
  }, [marker.x, marker.y, size]);

  return <div id={id} ref={ref} role={cluster ? 'group' : 'tooltip'} aria-label={cluster ? getLabels(lang).worldMap : undefined}
    onPointerEnter={onEnter} onPointerLeave={onLeave}
    className="sg-popover sg-scroll-thin sg-map-bubble absolute z-20 overflow-y-auto rounded-lg p-1.5 text-[11px]"
    style={position}>
    {marker.nodes.map(node => {
      const status = nodeStatus(node);
      const content = <>
        <span className="flex min-w-0 items-center gap-1.5 font-medium"><RegionFlag code={node.regionCode} size="sm" /><span className="truncate">{node.name}</span></span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--sg-muted-fg)]">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-[1.5px]" style={{ backgroundColor: colors[status] }} />
          <span className="truncate">{node.geo && (lang === 'zh-CN' ? node.geo.cityZh : node.geo.cityEn)} · {labels[status]}</span>
        </span>
      </>;
      return cluster ? <button key={node.uuid} type="button" onClick={() => onOpenNode(node.uuid)}
        className="sg-event-row block w-full cursor-pointer rounded-md px-1.5 py-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--sg-state-edge)]">{content}</button>
        : <div key={node.uuid} className="px-1.5 py-1">{content}</div>;
    })}
  </div>;
}

export function WorldMapPanel({ nodes, lang, standalone, showClock, showTerminator, overlapMode, onOpenNode }: {
  nodes: readonly KomariNode[];
  lang: Language;
  standalone: boolean;
  showClock: boolean;
  showTerminator: boolean;
  overlapMode: MapOverlapMode;
  onOpenNode: (uuid: string) => void;
}) {
  const headingId = useId();
  const bubbleId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(undefined);
  const enterBubble = useRef(false);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [preview, setPreview] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const t = getLabels(lang);
  const status = getNodeListLabels(lang);
  const grid = useMemo(() => mapGrid(size), [size]);
  const markers = useMemo(() => placeMarkers(nodes, overlapMode, grid), [nodes, overlapMode, grid]);
  const active = markers.find(marker => marker.key === (pinned ?? preview));

  function cancelClose() {
    window.clearTimeout(closeTimer.current);
  }

  function queueClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      const focused = document.activeElement;
      if (document.getElementById(bubbleId)?.contains(focused) || (focused?.matches(':focus-visible') && viewport.current?.contains(focused))) return;
      setPreview(null);
    }, 220);
  }

  function dismiss(restoreFocus = false) {
    cancelClose();
    enterBubble.current = false;
    if (active && restoreFocus) viewport.current?.querySelector<HTMLButtonElement>(`[data-map-marker="${CSS.escape(active.key)}"]`)?.focus();
    setPinned(null);
    setPreview(null);
  }

  useLayoutEffect(() => {
    const map = viewport.current;
    if (!map) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(current => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pinned) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && viewport.current?.contains(event.target)) return;
      setPinned(null);
      setPreview(null);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [pinned]);

  useLayoutEffect(() => {
    if (!pinned || !enterBubble.current) return;
    enterBubble.current = false;
    document.getElementById(bubbleId)?.querySelector('button')?.focus();
  }, [bubbleId, pinned]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <section id="world-map-panel" data-slot="panel" aria-labelledby={headingId} className="sg-panel sg-glass-backdrop relative order-1 flex min-w-0 flex-col overflow-hidden rounded-xl px-4 pt-3.5 pb-4">
      <header className="mb-2.5 flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 id={headingId} className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold tracking-tight">
            <Globe aria-hidden="true" className="size-3.5 shrink-0 text-[var(--sg-muted-fg)]" strokeWidth={1.8} />{t.worldMap}
          </h2>
          {showClock && <MapClock />}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[var(--sg-muted-fg)]">
          {(['online', 'highLoad', 'offline'] as const).map(key => <li key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-[1.5px]" style={{ backgroundColor: colors[key] }} />
            {key === 'highLoad' && lang === 'zh-CN' ? '高载' : status[key]}
          </li>)}
        </ul>
      </header>
      <div id="map-viewport" ref={viewport} data-standalone={standalone || undefined} className="sg-map-viewport relative w-full shrink-0 overflow-hidden rounded-lg"
        onPointerDown={event => { if (event.target === event.currentTarget) dismiss(); }}
        onBlur={event => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) dismiss();
        }}
        onKeyDown={event => {
          if (event.key !== 'Escape' || !active) return;
          event.stopPropagation();
          dismiss(document.getElementById(bubbleId)?.contains(document.activeElement));
        }}>
        <WorldCanvas {...{ size, grid, showTerminator }} />
        {markers.map(marker => {
          const cluster = marker.nodes.length > 1;
          const isActive = active === marker;
          const city = lang === 'zh-CN' ? marker.nodes[0].geo?.cityZh : marker.nodes[0].geo?.cityEn;
          const label = cluster ? (lang === 'zh-CN' ? `${city} · ${marker.nodes.length} 个节点` : `${city} · ${marker.nodes.length} nodes`)
            : `${marker.nodes[0].name} · ${status[nodeStatus(marker.nodes[0])]}`;
          return <Fragment key={marker.key}>
            <button type="button" data-map-marker={marker.key} aria-label={label}
              aria-expanded={cluster ? isActive : undefined} aria-controls={cluster && isActive ? bubbleId : undefined}
              aria-describedby={!cluster && isActive ? bubbleId : undefined}
              className={`absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-md focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--sg-state-edge)] ${isActive ? 'z-10' : ''}`}
              style={{ left: marker.x, top: marker.y, width: MARKER_SIZE, height: MARKER_SIZE }}
              onPointerEnter={event => {
                if (event.pointerType === 'touch' || document.getElementById(bubbleId)?.contains(document.activeElement)) return;
                cancelClose();
                setPreview(marker.key);
              }}
              onPointerLeave={queueClose}
              onFocus={() => {
                cancelClose();
                if (pinned !== marker.key) setPinned(null);
                setPreview(marker.key);
              }}
              onClick={event => {
                if (!cluster) {
                  event.currentTarget.focus();
                  dismiss();
                  onOpenNode(marker.nodes[0].uuid);
                } else if (pinned === marker.key && event.detail !== 0) {
                  dismiss();
                } else {
                  if (event.detail === 0 && !isActive) enterBubble.current = true;
                  setPinned(marker.key);
                  if (event.detail === 0 && isActive) document.getElementById(bubbleId)?.querySelector('button')?.focus();
                }
              }}>
              <span aria-hidden="true" className={`grid ${cluster ? 'grid-cols-2' : 'grid-cols-1'} ${isActive ? 'brightness-125' : ''}`}>
                {marker.nodes.slice(0, 4).map(node => <span key={node.uuid} className="grid size-[5px] place-items-center">
                  <span className="rounded-[0.75px]" style={{ width: MARK, height: MARK, backgroundColor: colors[nodeStatus(node)] }} />
                </span>)}
              </span>
              {cluster && (overlapMode === 'spread' || marker.nodes.length > 4) && <span aria-hidden="true" className="mono-num pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 rounded bg-[var(--sg-chart-surface)] px-0.5 text-[9px] leading-3 text-[var(--sg-fg)]">{marker.nodes.length}</span>}
            </button>
            {isActive && <MapBubble marker={marker} size={size} id={bubbleId} lang={lang} onEnter={cancelClose} onLeave={queueClose} onOpenNode={uuid => {
              dismiss(true);
              onOpenNode(uuid);
            }} />}
          </Fragment>;
        })}
      </div>
    </section>
  );
}
