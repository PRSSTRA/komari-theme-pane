import { Activity } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { formatTrafficParts } from '../lib/format';
import { getLabels } from '../lib/i18n';
import type { KomariNode, Language, NetHistoryPoint } from '../types/komari';
import { NetworkSlats } from './NetworkSlats';

export function NetworkTrafficPanel({ nodes, points, lang, className }: {
  nodes: readonly KomariNode[];
  points: readonly NetHistoryPoint[];
  lang: Language;
  className: string;
}) {
  const headingId = useId();
  const tracksRef = useRef<HTMLDivElement>(null);
  const [trackHeight, setTrackHeight] = useState<number>();
  const t = getLabels(lang);
  const totals = { up: { bytes: 0, reported: 0 }, down: { bytes: 0, reported: 0 } };
  for (const node of nodes) {
    if (node.totalUp !== undefined) {
      totals.up.bytes += node.totalUp;
      totals.up.reported++;
    }
    if (node.totalDown !== undefined) {
      totals.down.bytes += node.totalDown;
      totals.down.reported++;
    }
  }

  useLayoutEffect(() => {
    const tracks = tracksRef.current;
    if (!tracks) return;
    const observer = new ResizeObserver(([entry]) => {
      // Each track reserves 41px for labels and their gaps; match the 8px gap between tracks.
      setTrackHeight(Math.max(36, Math.floor((entry.contentRect.height - 8) / 2 - 41)));
    });
    observer.observe(tracks);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="summary-bar" data-slot="panel" aria-labelledby={headingId} className={`sg-panel sg-glass-backdrop sg-overview-network relative flex min-w-0 flex-col overflow-hidden rounded-xl px-4 pt-3.5 pb-3 ${className}`}>
      <header className="mb-1 flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={headingId} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-tight">
          <Activity aria-hidden="true" className="size-3.5 text-[var(--sg-muted-fg)]" strokeWidth={1.8} />{t.network}
        </h2>
        <dl className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[10px] text-[var(--sg-muted-fg)]">
          {(['up', 'down'] as const).map(direction => {
            const { bytes, reported } = totals[direction];
            const label = lang === 'zh-CN' ? `总${t[direction]}` : `Total ${t[direction].toLowerCase()}`;
            return <div key={direction} className="inline-flex items-baseline gap-1 whitespace-nowrap">
              <dt><span aria-hidden="true">{direction === 'up' ? '↑' : '↓'} </span>{label}</dt>
              <dd className="inline-flex items-baseline gap-1">
                <span className="mono-num font-medium text-[var(--sg-fg)]">{reported ? formatTrafficParts(bytes).text : '—'}</span>
                {reported > 0 && reported < nodes.length && <span>{lang === 'zh-CN' ? `已上报 ${reported}/${nodes.length}` : `${reported}/${nodes.length} reporting`}</span>}
              </dd>
            </div>;
          })}
        </dl>
      </header>
      <div ref={tracksRef} className="flex min-h-0 flex-1 flex-col justify-between gap-2">
        <NetworkSlats points={points} direction="up" lang={lang} height={trackHeight} />
        <NetworkSlats points={points} direction="down" lang={lang} height={trackHeight} />
      </div>
    </section>
  );
}
