import { useCallback, useMemo, useState } from 'react';
import type { KomariDataSource } from '../api/komari';
import { formatTrafficParts } from '../lib/format';
import { getLabels } from '../lib/i18n';
import { selectPingTasks, summarizePingTracks } from '../lib/slats-math';
import type { HistoryHours, KomariNode, Language, LoadHistoryPoint, PingTask } from '../types/komari';
import { historyWindow, loadColumns, pingColumns, SERIES_COLORS, type SeriesColor } from './detail-history-geometry';
import { DetailHistoryPlot } from './DetailHistoryPlot';
import { detailLabels, useDetailRequest } from './node-detail-support';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const HOURS = [1, 6, 24] as const;
const PING_REFRESH_MS = 60_000;
const LOAD: readonly LoadHistoryPoint[] = [];
const TASKS: readonly PingTask[] = [];

export function DetailHistoryChart({ node, lang, dataSource, featuredPingTasks }: {
  node: KomariNode;
  lang: Language;
  dataSource: Pick<KomariDataSource, 'fetchLoadHistory' | 'fetchPingHistory' | 'fetchPingTasks'>;
  featuredPingTasks: readonly number[];
}) {
  const t = detailLabels(lang);
  const { uuid } = node;
  const [hours, setHours] = useState<HistoryHours>(6);
  const [tab, setTab] = useState<'load' | 'ping'>('load');
  const [focus, setFocus] = useState<number | null>(null);

  const readLoad = useCallback((signal: AbortSignal) => dataSource.fetchLoadHistory(uuid, hours, signal), [dataSource, uuid, hours]);
  const readPing = useCallback((signal: AbortSignal) => dataSource.fetchPingHistory(uuid, hours, signal), [dataSource, uuid, hours]);
  const readTasks = useCallback((signal: AbortSignal) => dataSource.fetchPingTasks(signal), [dataSource]);
  const { result: load, retry: retryLoad } = useDetailRequest(readLoad);
  const { result: ping, retry: retryPing, lastData: lastPing } = useDetailRequest(readPing, PING_REFRESH_MS);
  const { result: tasks, retry: retryTasks } = useDetailRequest(readTasks);

  const catalogue = tasks.status === 'ready' ? tasks.data : TASKS;
  const taskMetadata = useMemo(() => {
    if (!lastPing) return TASKS;
    const known = new Set([...catalogue, ...lastPing.tasks].map(task => task.id));
    const records = [...lastPing.tasks];
    for (const { taskId } of lastPing.records) {
      if (known.has(taskId)) continue;
      records.push({ id: taskId, name: '' });
      known.add(taskId);
    }
    return records;
  }, [catalogue, lastPing]);
  const routes = useMemo(() => selectPingTasks(catalogue, taskMetadata, uuid, featuredPingTasks), [catalogue, taskMetadata, uuid, featuredPingTasks]);
  const isPing = tab === 'ping' && routes.length > 0;
  const tabValue = isPing ? 'ping' : 'load';
  const selection = routes.some(task => task.id === focus) ? focus : null;

  const loadPlot = useMemo(() => {
    const points = load.status === 'ready' ? load.data : LOAD;
    const range = historyWindow(points, hours, load.status === 'ready' ? load.requestedAt : 0);
    return { ...range, points, hasRecords: points.some(point => point.time >= range.start && (point.cpu !== null || point.ram !== null)) };
  }, [load, hours]);
  const pingPlot = useMemo(() => {
    const points = ping.status === 'ready' ? ping.data.records : [];
    const range = historyWindow(points, hours, ping.status === 'ready' ? ping.requestedAt : 0);
    const tracks = summarizePingTracks(routes, points.filter(point => point.time >= range.start)).map((track, index) => ({
      ...track, label: track.task.name.trim() || `${t.task} ${track.task.id}`, palette: index as SeriesColor,
    }));
    const visible = selection === null ? tracks : tracks.filter(track => track.task.id === selection);
    return { ...range, tracks, visible, hasRecords: visible.some(track => track.points.length > 0) };
  }, [ping, routes, hours, t.task, selection]);
  const getLoadSeries = useCallback((count: number) => loadColumns(loadPlot.points, loadPlot.start, loadPlot.end, count), [loadPlot]);
  const getPingSeries = useCallback((count: number) => pingColumns(pingPlot.visible, pingPlot.start, pingPlot.end, count), [pingPlot]);
  const getSeries = isPing ? getPingSeries : getLoadSeries;

  const status = isPing ? ping.status : load.status;
  const hasRecords = isPing ? pingPlot.hasRecords : loadPlot.hasRecords;
  const historyStatus = status === 'ready' ? hasRecords ? null : t.empty : t[status];
  const missingPing = routes.length === 0 && (ping.status === 'error' || tasks.status === 'error');
  const retryLabel = getLabels(lang).retry;
  const ramTotal = node.ramTotal ?? node.mem_total ?? 0;
  const ramUsed = node.online ? node.ramUsed : undefined;
  const ram = ramUsed !== undefined && ramTotal > 0 ? (100 * ramUsed / ramTotal).toFixed(1) + '%' : '—';
  const cpu = node.online && node.cpu !== undefined ? node.cpu.toFixed(1) + '%' : '—';

  return (
    <Tabs value={tabValue} onValueChange={value => { if (value === 'load' || value === 'ping') setTab(value); }}
      className="km-load-chart sg-chart-inset mt-4 block overflow-hidden rounded-xl">
      <div className="px-3.5 pt-3.5 pb-1">
        <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          {routes.length > 0 ? (
            <TabsList aria-label={t.history}>
              <TabsTrigger value="load" className="px-2.5 text-xs">{t.load}</TabsTrigger>
              <TabsTrigger value="ping" className="px-2.5 text-xs">{t.ping}</TabsTrigger>
            </TabsList>
          ) : <h2 className="inline-flex h-8 items-center text-xs font-semibold tracking-tight">{t.load}</h2>}
          <div data-slot="tabs-list" data-variant="default" role="group" aria-label={t.window} className="mono-num h-7">
            {HOURS.map(value => (
              <button key={value} type="button" data-slot="tabs-trigger" data-active={String(hours === value)}
                className="px-2 text-[11px] focus-visible:outline-2 focus-visible:outline-[var(--sg-focus-line)]"
                aria-pressed={hours === value} onClick={() => setHours(value)}>{value}h</button>
            ))}
          </div>
        </header>
        {missingPing && <div role="status" className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--sg-muted-fg)]">
          <span>{t.pingUnavailable}</span>
          <Button size="xs" variant="outline" onClick={() => {
            if (ping.status === 'error') retryPing();
            if (tasks.status === 'error') retryTasks();
          }}>{retryLabel}</Button>
        </div>}
        <div className="grid min-h-4 items-start">
          <div aria-hidden={isPing || undefined} className={`col-start-1 row-start-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--sg-muted-fg)] ${isPing ? 'invisible' : ''}`}>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-[7px] rounded-[1.5px] bg-[var(--sg-series-cpu)]" />
              CPU (%) · <strong className="mono-num text-[var(--sg-fg)]">{cpu}</strong>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span aria-hidden="true" className="size-[7px] rounded-[1.5px] bg-[var(--sg-success)]" />
              RAM (%) · <strong className="mono-num text-[var(--sg-fg)]">{ram}</strong>
              {ramUsed !== undefined && ramTotal > 0 && <span className="mono-num text-[10.5px] text-[var(--sg-subtle-fg)]">({formatTrafficParts(ramUsed).text} / {formatTrafficParts(ramTotal).text})</span>}
            </span>
          </div>
          {routes.length > 0 && <div aria-hidden={!isPing || undefined} inert={!isPing}
            className={`col-start-1 row-start-1 flex flex-wrap items-center gap-1.5 text-[11px] ${isPing ? '' : 'invisible pointer-events-none select-none'}`}>
            {pingPlot.tracks.map(({ task, label, palette, latest, loss, points }) => {
              const lossColor = (loss ?? 0) >= 3 ? 'var(--sg-danger)' : loss ? 'var(--sg-warn)' : 'var(--sg-subtle-fg)';
              const body = <>
                <span aria-hidden="true" className="size-[7px] shrink-0 rounded-[1.5px]" style={{ backgroundColor: SERIES_COLORS[palette] }} />
                <span className="wrap-anywhere">{label} · <strong className="mono-num text-[var(--sg-fg)]">{latest === null ? points.length ? t.timedOut : '—' : `${Math.round(latest)}ms`}</strong>
                  {' · '}<span className="mono-num" style={{ color: lossColor }}>{loss === null ? '—' : t.loss(loss ? loss.toFixed(1) : '0')}</span></span>
              </>;
              if (routes.length === 1) return <span key={task.id} className="sg-legend-chip max-w-full cursor-default">{body}</span>;
              return <Tooltip key={task.id}>
                <TooltipTrigger render={<button type="button" className="sg-legend-chip max-w-full focus-visible:outline-[var(--sg-focus-line)]" />}
                  data-focused={selection === task.id} data-muted={selection !== null && selection !== task.id}
                  aria-pressed={selection === task.id} onClick={() => setFocus(selection === task.id ? null : task.id)}>{body}</TooltipTrigger>
                <TooltipContent>{t.isolate}</TooltipContent>
              </Tooltip>;
            })}
          </div>}
        </div>
      </div>
      <TabsContent value={tabValue} className="relative" role={routes.length ? undefined : 'region'} aria-label={routes.length ? undefined : t.load} tabIndex={-1}>
        <DetailHistoryPlot key={`${tabValue}:${hours}:${selection ?? ''}`} {...{ getSeries, isPing, lang, hours }} />
        {historyStatus && <div role="status" className="pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-2 px-8 text-center text-xs text-[var(--sg-muted-fg)]">
          <span>{historyStatus}</span>
          {status === 'error' && <Button size="xs" variant="outline" className="pointer-events-auto" onClick={isPing ? retryPing : retryLoad}>{retryLabel}</Button>}
        </div>}
      </TabsContent>
    </Tabs>
  );
}
