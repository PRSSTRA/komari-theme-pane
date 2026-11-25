import { Radio } from 'lucide-react';
import { useId, useMemo } from 'react';
import { RegionFlag } from '../lib/flags';
import { getLabels, getNodeListLabels } from '../lib/i18n';
import type { KomariEventItem, Language } from '../types/komari';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const eventClock = new Intl.DateTimeFormat('en-GB', { hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const colors: Record<KomariEventItem['kind'], string> = {
  offline: 'var(--sg-danger)', online: 'var(--sg-success)', high_load: 'var(--sg-warn)', expiring: 'var(--sg-warn)', info: 'var(--sg-success)',
};

function eventMessage(event: KomariEventItem, lang: Language) {
  const zh = lang === 'zh-CN';
  const cpu = event.cpu === undefined ? '' : ` ${event.cpu.toFixed(1)}%`;
  switch (event.kind) {
    case 'offline': return zh ? '节点离线 · 心跳中断' : 'Node offline · No heartbeat';
    case 'online': return zh ? '节点重连 · 已恢复在线' : 'Node reconnected · Online';
    case 'high_load': return zh ? `CPU${cpu} 高载` : `High CPU${cpu}`;
    case 'info': return cpu
      ? zh ? `CPU 回落至${cpu} · 已恢复正常` : `CPU settled at${cpu} · Back to normal`
      : zh ? '节点负载已恢复正常' : 'Node load back to normal';
    case 'expiring': return event.days === undefined ? zh ? '即将到期' : 'Expires soon'
      : event.days === 0 ? zh ? '今天到期' : 'Expires today'
      : zh ? `距到期仅剩 ${event.days} 天` : `Expires in ${event.days} ${event.days === 1 ? 'day' : 'days'}`;
  }
}

export function EventFeedPanel({ events, lang, onOpenNode, allowExpiring, besideMap, className }: {
  events: readonly KomariEventItem[];
  lang: Language;
  onOpenNode: (uuid: string) => void;
  allowExpiring: boolean;
  besideMap: boolean;
  className: string;
}) {
  const headingId = useId();
  const ordered = useMemo(() => events.filter(event => allowExpiring || event.kind !== 'expiring')
    .sort((a, b) => b.time - a.time || b.id - a.id), [events, allowExpiring]);
  const alerts = ordered.filter(event => event.isAlert);
  const t = getLabels(lang);
  const zh = lang === 'zh-CN';
  const alertsLabel = zh ? '异常' : 'Alerts';

  return (
    <section id="event-feed-panel" data-slot="panel" aria-labelledby={headingId} className={`sg-panel sg-glass-backdrop relative flex min-w-0 flex-col overflow-hidden rounded-xl ${className}`}>
      <Tabs defaultValue="all" className={`sg-event-tabs min-h-0 flex-1 flex-col gap-0 ${besideMap ? 'max-h-[260px] lg:absolute lg:inset-0 lg:max-h-none' : ''}`}>
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id={headingId} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold tracking-tight">
              <Radio aria-hidden="true" className="size-3.5 shrink-0 text-[var(--sg-muted-fg)]" strokeWidth={1.8} />
              <span className="truncate">{t.events}</span>
            </h2>
            {alerts.length > 0 && <span aria-label={`${alertsLabel}: ${alerts.length}`} className="mono-num inline-flex shrink-0 items-center gap-1 text-[10px] text-[var(--sg-muted-fg)]">
              <span aria-hidden="true" className="size-1.5 rounded-[1.5px] bg-[var(--sg-danger)]" />{alerts.length}
            </span>}
          </div>
          <TabsList aria-label={t.events} activateOnFocus className="h-7 shrink-0">
            <TabsTrigger value="all" className="px-2 text-[11px]">{getNodeListLabels(lang).all}</TabsTrigger>
            <TabsTrigger value="alerts" className="px-2 text-[11px]">{alertsLabel}</TabsTrigger>
          </TabsList>
        </header>
        {(['all', 'alerts'] as const).map(filter => {
          const items = filter === 'all' ? ordered : alerts;
          return <TabsContent key={filter} value={filter} className="sg-scroll-thin min-h-0 overflow-y-auto px-2 pb-2.5">
            {items.length > 0 ? <ul>
              {items.map(event => <li key={event.id}>
                <button type="button" onClick={() => onOpenNode(event.nodeUuid)} className="sg-event-row flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--sg-state-edge)]">
                  <span aria-hidden="true" className="mt-[5px] size-1.5 shrink-0 rounded-[1.5px]" style={{ backgroundColor: colors[event.kind] }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium">
                        <RegionFlag code={event.regionCode} size="sm" /><span className="truncate">{event.nodeName}</span>
                      </span>
                      <time dateTime={new Date(event.time).toISOString()} className="mono-num shrink-0 text-[10px] text-[var(--sg-subtle-fg)]">{eventClock.format(event.time)}</time>
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-[var(--sg-muted-fg)] [overflow-wrap:anywhere]">{eventMessage(event, lang)}</span>
                  </span>
                </button>
              </li>)}
            </ul> : <p className="grid h-full min-h-[140px] place-content-center text-center text-[11.5px] text-[var(--sg-muted-fg)]">
              {filter === 'all' ? zh ? '暂无实时事件' : 'No live events yet' : zh ? '暂无异常事件' : 'No alerts'}
            </p>}
          </TabsContent>;
        })}
      </Tabs>
    </section>
  );
}
