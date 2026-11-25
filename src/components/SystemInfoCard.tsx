import type { ReactNode } from 'react';
import { formatTrafficParts, groupLabel, normalizeGroup } from '../lib/format';
import type { KomariNode, Language } from '../types/komari';
import { detailLabels } from './node-detail-support';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function SystemInfoCard({ node, lang }: { node: KomariNode; lang: Language }) {
  const t = detailLabels(lang);
  const group = groupLabel(normalizeGroup(node.group), lang);
  const ram = node.ramTotal ?? node.mem_total ?? 0;
  const swap = node.swapTotal ?? node.swap_total ?? 0;
  const ramCapacity = ram > 0 ? formatTrafficParts(ram).text : '—';
  const rows: [string, ReactNode][] = [];

  if (node.cpu_name) rows.push([t.processor, (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} className="block truncate" />}>{node.cpu_name}</TooltipTrigger>
      <TooltipContent>{node.cpu_name}</TooltipContent>
    </Tooltip>
  )]);
  if (node.cpu_cores) rows.push([t.cores, <span className="mono-num">{t.cpuCores(node.cpu_cores, node.cpu_physical_cores)}</span>]);
  if (node.os) rows.push([t.os, node.os]);
  if (node.kernel_version) rows.push([t.kernel, <span className="mono-num break-all">{node.kernel_version}</span>]);
  if (node.arch || node.virtualization) rows.push([
    node.arch && node.virtualization ? t.archVirt : node.arch ? t.arch : t.virt,
    <span className="mono-num">{[node.arch, node.virtualization].filter(Boolean).join(' / ')}</span>,
  ]);
  const gpu = node.gpu_name?.trim();
  if (gpu && !/^(none|n\/a)$/i.test(gpu)) rows.push(['GPU', <span className="mono-num wrap-anywhere">{gpu}</span>]);
  rows.push([swap > 0 ? t.ramSwap : t.ram, <span className="mono-num">{ramCapacity}{swap > 0 && ` / ${formatTrafficParts(swap).text}`}</span>]);
  rows.push([t.loadAverages, <span className="mono-num">
    {node.online ? [node.load, node.load5, node.load15].map(value => value?.toFixed(2) ?? '—').join(' / ') : '—'}
  </span>]);
  if (node.temp !== undefined && node.temp > 0) rows.push([t.temp, <span className="mono-num">{node.online ? `${node.temp.toFixed(1)}°C` : '—'}</span>]);
  rows.push([node.tagList.length ? t.groupTags : t.group, (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      <span>{group}</span>
      {node.tagList.map((tag, index) => <span key={`${tag}-${index}`} data-slot="tag" className="px-1.5 py-0 text-[10px] leading-[18px]">{tag}</span>)}
    </span>
  )]);

  return (
    <section className="sg-spec-shell flex min-w-0 flex-col overflow-hidden rounded-xl">
      <header className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <h2 className="text-xs font-semibold tracking-tight">{t.system}</h2>
        {node.arch && <span className="mono-num text-[10px] text-[var(--sg-subtle-fg)]">{node.arch}</span>}
      </header>
      <div className="flex flex-1 flex-col px-1.5 pb-1.5">
        <dl className="sg-spec-body flex-1 space-y-0.5 rounded-[9px] p-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="sg-spec-row flex items-center justify-between gap-3 px-2 py-1.5 text-xs">
              <dt className="shrink-0 text-[var(--sg-muted-fg)]">{label}</dt>
              <dd className="min-w-0 text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
