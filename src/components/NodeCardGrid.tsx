import { formatTrafficParts } from '../lib/format';
import { getNodeListLabels, type NodeListLabels } from '../lib/i18n';
import type { KomariNode } from '../types/komari';
import { usagePercent } from './node-list-data';
import { MetricBar, NodeName, StatusDot, meterTone, nodeBilling, nodeQuota, nodeRateParts, nodeTrafficParts, nodeUptime, type NodeListViewProps } from './node-list-parts';

function Meter({ label, value, places = 0, detail }: { label: string; value: number | null; places?: number; detail?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-1 text-[11px]">
        <span className="text-[var(--sg-muted-fg)]">{label}</span>
        <span className="mono-num min-w-0 truncate font-medium" style={{ color: value != null && value >= 70 ? meterTone(value) : undefined }}>
          {value == null ? '—' : `${value.toFixed(places)}%`}
          {detail && <span className="ml-1 font-normal text-[var(--sg-subtle-fg)]">{detail}</span>}
        </span>
      </div>
      <MetricBar percent={value} className="h-1.5 w-full" />
    </div>
  );
}

function metricDetail(used: number | undefined, total: number | undefined) {
  return used != null && total != null && total > 0 ? `${formatTrafficParts(used).text} / ${formatTrafficParts(total).text}` : undefined;
}

function NetworkBox({ node, settings, labels }: { node: KomariNode; settings: NodeListViewProps['settings']; labels: NodeListLabels }) {
  const quota = settings.show_traffic_bar ? nodeQuota(node) : null;
  return (
    <div className="sg-inset-pane rounded-lg px-2.5 py-2 text-[11px]">
      <div className="mono-num flex items-center justify-between gap-2 text-[var(--sg-muted-fg)]">
        <span><span aria-hidden="true">↑ </span><span className="sr-only">{labels.up}: </span><strong className="font-medium text-[var(--sg-fg)]">{nodeRateParts(node.online, node.up)?.text ?? '—'}</strong></span>
        <span><span aria-hidden="true">↓ </span><span className="sr-only">{labels.down}: </span><strong className="font-medium text-[var(--sg-fg)]">{nodeRateParts(node.online, node.down)?.text ?? '—'}</strong></span>
      </div>
      {settings.show_total_traffic && (
        <div className="mono-num mt-1 flex items-center justify-between gap-2 text-[10.5px] text-[var(--sg-subtle-fg)]">
          <span><span aria-hidden="true">↑ </span><span className="sr-only">{labels.traffic} · {labels.up}: </span>{nodeTrafficParts(node.totalUp)?.text ?? '—'}</span>
          <span><span aria-hidden="true">↓ </span><span className="sr-only">{labels.traffic} · {labels.down}: </span>{nodeTrafficParts(node.totalDown)?.text ?? '—'}</span>
        </div>
      )}
      {quota && (
        <div className="mt-2 space-y-1">
          <div className="mono-num flex flex-wrap items-center justify-between gap-x-2 text-[10px] text-[var(--sg-subtle-fg)]">
            <span>{labels.quota}</span>
            <span>{quota.used?.text ?? '—'} / {quota.limit.text}{quota.percent == null ? '' : ` (${quota.percent.toFixed(0)}%)`}</span>
          </div>
          <MetricBar percent={quota.percent} className="h-1 w-full" />
        </div>
      )}
    </div>
  );
}

export function NodeCardGrid({ nodes, settings, pinnedNodes, lang, canShowPricing, onOpenNode }: NodeListViewProps) {
  const labels = getNodeListLabels(lang);
  const compact = settings.card_density === 'compact';
  return (
    <div className={`sg-node-card-grid grid px-4 pt-1 pb-4 ${compact ? 'gap-3' : 'gap-3.5'}`} data-density={settings.card_density}>
      {nodes.map(node => {
        const ramTotal = node.ramTotal ?? node.mem_total;
        const diskTotal = node.diskTotal ?? node.disk_total;
        const billing = canShowPricing ? nodeBilling(node, lang, labels) : '';
        return (
          <article key={node.uuid} data-node={node.uuid} data-slot="card" className={`km-node-card sg-card sg-card-interactive relative flex cursor-pointer flex-col rounded-xl ${compact ? 'gap-3 p-4' : 'gap-4 p-5'} ${node.online ? '' : 'opacity-65'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <NodeName node={node} pinned={pinnedNodes.has(node.uuid)} labels={labels} heading onOpen={() => onOpenNode(node.uuid)} />
              </div>
              <span data-slot="badge" data-variant="secondary" className="mono-num shrink-0 px-2 py-0.5 text-[11px]">
                <StatusDot node={node} labels={labels} />{nodeUptime(node, labels)}
              </span>
            </div>
            <div className={`grid ${compact ? 'grid-cols-3 gap-2.5' : 'gap-2'}`}>
              <Meter label="CPU" value={node.online ? node.cpu ?? null : null} places={1} />
              <Meter label="RAM" value={node.online ? usagePercent(node.ramUsed, ramTotal) : null} detail={!compact && node.online ? metricDetail(node.ramUsed, ramTotal) : undefined} />
              <Meter label="Disk" value={usagePercent(node.diskUsed, diskTotal)} detail={compact ? undefined : metricDetail(node.diskUsed, diskTotal)} />
            </div>
            <NetworkBox node={node} settings={settings} labels={labels} />
            <div className="mt-auto flex h-[24px] min-h-[24px] shrink-0 items-center justify-between gap-2 pt-0.5 text-[11px] text-[var(--sg-subtle-fg)]">
              {settings.show_tags && node.tagList.length > 0 && (
                <div className="flex min-w-0 items-center gap-1.5">
                  {node.tagList.slice(0, compact ? 2 : 3).map((tag, index) => (
                    <span data-slot="tag" className="min-w-0" key={`${tag}:${index}`}><span className="truncate">{tag}</span></span>
                  ))}
                </div>
              )}
              {((settings.show_load_temp && node.online) || billing) && (
                <div className="mono-num ml-auto flex min-w-0 items-center gap-2 whitespace-nowrap">
                  {settings.show_load_temp && node.online && (
                    <>
                      {node.load != null && <span><span aria-hidden="true">L </span><span className="sr-only">{labels.loadLabel}: </span>{node.load.toFixed(2)}</span>}
                      {node.temp != null && node.temp > 0 && <span>{node.temp.toFixed(0)}°C</span>}
                    </>
                  )}
                  {billing && <span className="truncate text-[var(--sg-muted-fg)]">{billing}</span>}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
