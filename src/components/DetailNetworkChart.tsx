import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import type { KomariDataSource } from '../api/komari';
import { formatTrafficParts } from '../lib/format';
import { getLabels } from '../lib/i18n';
import type { KomariNode, Language, NetHistoryPoint } from '../types/komari';
import { NetworkSlats } from './NetworkSlats';
import { detailLabels, useDetailRequest } from './node-detail-support';
import { Button } from './ui/button';

const MAX_SAMPLES = 140;
const EMPTY_POINTS: readonly NetHistoryPoint[] = [];

export function DetailNetworkChart({ node, lang, dataSource, sampleTime }: {
  node: KomariNode;
  lang: Language;
  dataSource: Pick<KomariDataSource, 'fetchRecentNetwork'>;
  sampleTime?: number;
}) {
  const { uuid, up, down, totalUp, totalDown } = node;
  const request = useCallback((signal: AbortSignal) => dataSource.fetchRecentNetwork(uuid, signal), [dataSource, uuid]);
  const { result, retry, lastData: recent = EMPTY_POINTS } = useDetailRequest(request);
  const [live, setLive] = useState<NetHistoryPoint[]>([]);

  useEffect(() => {
    if (sampleTime === undefined || up === undefined || down === undefined) return;
    const point = { time: sampleTime, up, down };
    setLive(prior => {
      if (prior.length && prior[prior.length - 1].time >= point.time) return prior;
      return [...prior.slice(1 - MAX_SAMPLES), point];
    });
  }, [sampleTime, up, down]);

  const points = useMemo(() => {
    const lastRecent = recent.at(-1)?.time ?? -Infinity;
    const newer = live.findIndex(point => point.time > lastRecent);
    if (newer < 0) return recent.length > MAX_SAMPLES ? recent.slice(-MAX_SAMPLES) : recent;
    return [...recent.slice(-MAX_SAMPLES), ...live.slice(newer)].slice(-MAX_SAMPLES);
  }, [recent, live]);
  const t = getLabels(lang);
  const detail = detailLabels(lang);

  return (
    <section className="sg-chart-inset relative flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl">
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-3.5 pt-2.5">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-tight">
          <Activity className="size-3.5 text-[var(--sg-muted-fg)]" aria-hidden="true" />{t.network}
        </h2>
        <div className="mono-num flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[var(--sg-subtle-fg)]">
          <span aria-label={t.up} className="whitespace-nowrap">↑ <strong className="font-medium text-[var(--sg-fg)]">{totalUp === undefined ? '—' : formatTrafficParts(totalUp).text}</strong></span>
          <span aria-label={t.down} className="whitespace-nowrap">↓ <strong className="font-medium text-[var(--sg-fg)]">{totalDown === undefined ? '—' : formatTrafficParts(totalDown).text}</strong></span>
        </div>
      </header>
      <div className="grid flex-1 content-between gap-2 px-3.5 pt-1.5 pb-2.5">
        <NetworkSlats points={points} direction="up" lang={lang} height={98} currentRate={node.online ? up ?? null : null} />
        <NetworkSlats points={points} direction="down" lang={lang} height={98} currentRate={node.online ? down ?? null : null} />
      </div>
      {(!points.length || result.status === 'error') && (
        <div role="status" className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-wrap items-center justify-center gap-2 px-4 text-center text-xs text-[var(--sg-muted-fg)]">
          <span className="rounded-md bg-[var(--sg-chart-surface)] px-1">{result.status === 'ready' ? detail.empty : detail[result.status]}</span>
          {result.status === 'error' && <Button variant="outline" size="xs" className="pointer-events-auto" onClick={retry}>{t.retry}</Button>}
        </div>
      )}
    </section>
  );
}
