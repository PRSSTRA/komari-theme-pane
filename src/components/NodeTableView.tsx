import type { CSSProperties, ReactNode } from 'react';
import { normalizeGroup, type FormatParts } from '../lib/format';
import { getNodeListLabels, type NodeListLabels } from '../lib/i18n';
import { nodeGroupLabel, usagePercent } from './node-list-data';
import { MetricBar, NodeName, StatusDot, meterTone, nodeBilling, nodeQuota, nodeRateParts, nodeTrafficParts, nodeUptime, type NodeListViewProps } from './node-list-parts';

function DirectionLegend({ labels }: { labels: NodeListLabels }) {
  return (
    <span className="mono-num ml-1 whitespace-nowrap text-[10px] font-normal">
      <span className="sr-only">{labels.up} / {labels.down}</span>
      <span aria-hidden="true" className="text-[var(--sg-fg)]">↑</span><span aria-hidden="true" className="text-[var(--sg-subtle-fg)]">/↓</span>
    </span>
  );
}

function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div role="cell" className={`min-w-0 px-2.5 ${className}`}>{children}</div>;
}

function MeterCell({ value, places = 0 }: { value: number | null; places?: number }) {
  return (
    <Cell className="mono-num">
      <span style={{ color: value != null && value >= 70 ? meterTone(value) : undefined }}>{value == null ? '—' : `${value.toFixed(places)}%`}</span>
      <MetricBar percent={value} className="mt-1 h-1 w-14 max-w-full" />
    </Cell>
  );
}

function DirectionCell({ up, down, labels, lineClass }: { up: FormatParts | null; down: FormatParts | null; labels: NodeListLabels; lineClass: string }) {
  return (
    <Cell className="mono-num whitespace-nowrap">
      <div className={lineClass}>
        <span className="sr-only">{labels.up}: </span><span>{up?.value ?? '—'}</span>{up && <span className="text-[var(--sg-subtle-fg)]">{up.unit}</span>}
      </div>
      <div className={`${lineClass} text-[var(--sg-muted-fg)]`}>
        <span className="sr-only">{labels.down}: </span><span>{down?.value ?? '—'}</span>{down && <span className="text-[var(--sg-subtle-fg)]">{down.unit}</span>}
      </div>
    </Cell>
  );
}

export function NodeTableView({ nodes, settings, pinnedNodes, lang, canShowPricing, onOpenNode }: NodeListViewProps) {
  const labels = getNodeListLabels(lang);
  const legend = <DirectionLegend labels={labels} />;
  const columns: { label: string; min: number; ratio: number | string; directions?: true }[] = [
    { label: labels.nodeRegion, min: 220, ratio: 2.6 },
    { label: 'CPU', min: 76, ratio: 0.8 },
    { label: labels.ramLabel, min: 76, ratio: 0.8 },
    { label: labels.diskLabel, min: 76, ratio: 0.8 },
    { label: labels.net, min: 104, ratio: 0.96, directions: true },
  ];
  if (settings.show_total_traffic) columns.push({ label: labels.traffic, min: 96, ratio: 0.88, directions: true });
  if (settings.show_traffic_bar) columns.push({ label: labels.quota, min: 98, ratio: 0.9 });
  if (settings.show_load_temp) columns.push({ label: labels.tableLoadTemp, min: 82, ratio: 0.72 });
  columns.push(canShowPricing
    ? { label: labels.uptimeBilling, min: 108, ratio: '0.80' }
    : { label: labels.uptime, min: 78, ratio: '0.56' });
  const tableStyle = {
    minWidth: columns.reduce((width, column) => width + column.min, 24),
    '--sg-table-cols': columns.map(({ min, ratio }) => `minmax(${min}px, ${ratio}fr)`).join(' '),
  } as CSSProperties;

  return (
    <div className="px-4 pt-1 pb-4">
      <div data-slot="table-container" className="sg-table-shell overflow-hidden rounded-xl">
        <div className="sg-scroll-thin sg-node-table-scroll overflow-x-auto" role="region" aria-label={labels.table} tabIndex={0}>
          <div role="table" aria-label={labels.nodes} data-slot="table" className="km-ui-table w-full text-left text-xs" style={tableStyle}>
            <div role="rowgroup" data-slot="table-header" className="px-3">
              <div role="row" className="sg-table-grid items-center py-2.5 text-[11px] font-medium text-[var(--sg-muted-fg)]">
                {columns.map(({ label, directions }, index) => (
                  <div role="columnheader" key={label} className={`min-w-0 px-2.5 ${index === columns.length - 1 ? 'text-right' : ''}`}>
                    {directions ? <span className="inline-flex items-baseline whitespace-nowrap">{label}{legend}</span> : label}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-1.5 pb-1.5">
              <div role="rowgroup" data-slot="table-body" className="sg-table-body space-y-0.5 rounded-[9px] p-1.5">
                {nodes.map(node => {
                  const quota = settings.show_traffic_bar ? nodeQuota(node) : null;
                  const billing = canShowPricing ? nodeBilling(node, lang, labels) : '';
                  return (
                    <div role="row" key={node.uuid} data-node={node.uuid} data-slot="table-row" className={`km-ui-table-row sg-table-row sg-table-grid relative cursor-pointer items-center py-2 ${node.online ? '' : 'opacity-60'}`}>
                      <Cell>
                        <div className="flex min-w-0 items-center gap-2">
                          <StatusDot node={node} labels={labels} />
                          <NodeName node={node} pinned={pinnedNodes.has(node.uuid)} labels={labels} onOpen={() => onOpenNode(node.uuid)} />
                        </div>
                        <div className="mt-0.5 truncate pl-3.5 text-[11px] text-[var(--sg-subtle-fg)]">
                          {nodeGroupLabel(normalizeGroup(node.group), lang)}
                          {settings.show_tags && node.tagList.length > 0 && ` · ${node.tagList.slice(0, 2).join(' / ')}`}
                        </div>
                      </Cell>
                      <MeterCell value={node.online ? node.cpu ?? null : null} places={1} />
                      <MeterCell value={node.online ? usagePercent(node.ramUsed, node.ramTotal ?? node.mem_total) : null} />
                      <MeterCell value={usagePercent(node.diskUsed, node.diskTotal ?? node.disk_total)} />
                      <DirectionCell up={nodeRateParts(node.online, node.up)} down={nodeRateParts(node.online, node.down)} labels={labels} lineClass="sg-rate-line" />
                      {settings.show_total_traffic && <DirectionCell up={nodeTrafficParts(node.totalUp)} down={nodeTrafficParts(node.totalDown)} labels={labels} lineClass="sg-traffic-line" />}
                      {settings.show_traffic_bar && (
                        <Cell className="mono-num whitespace-nowrap">
                          {quota ? (
                            <>
                              <div aria-hidden="true" className="truncate text-[10px]">{quota.used ? `${quota.used.value}${quota.used.unit}` : '—'}/{quota.limit.value}{quota.limit.unit}</div>
                              <span className="sr-only">{quota.used?.text ?? '—'} / {quota.limit.text}{quota.percent == null ? '' : ` (${quota.percent.toFixed(0)}%)`}</span>
                              <MetricBar percent={quota.percent} className="mt-1 h-1 w-14 max-w-full" />
                            </>
                          ) : (
                            <>
                              <div>—</div>
                              <div className="text-[10px] text-[var(--sg-subtle-fg)]">{labels.unlimited}</div>
                            </>
                          )}
                        </Cell>
                      )}
                      {settings.show_load_temp && (
                        <Cell className="mono-num whitespace-nowrap">
                          <div>{node.online && node.load != null ? node.load.toFixed(2) : '—'}</div>
                          {node.online && node.temp != null && node.temp > 0 && <div className="text-[11px] text-[var(--sg-subtle-fg)]">{node.temp.toFixed(1)}°C</div>}
                        </Cell>
                      )}
                      <Cell className="mono-num text-right whitespace-nowrap">
                        <div>{nodeUptime(node, labels)}</div>
                        {billing && <div className="break-words whitespace-normal text-[11px] text-[var(--sg-subtle-fg)]">{billing}</div>}
                      </Cell>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
