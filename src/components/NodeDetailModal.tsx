import { useRef, useState, type ReactNode } from 'react';
import { Pin, X } from 'lucide-react';
import type { KomariDataSource } from '../api/komari';
import { RegionFlag } from '../lib/flags';
import { formatBilling, formatTrafficParts, formatUptime, getDaysUntilExpiry, getTrafficUsage, groupLabel, normalizeGroup } from '../lib/format';
import { getLabels, getNodeListLabels } from '../lib/i18n';
import type { KomariNode, Language } from '../types/komari';
import { DetailHistoryChart } from './DetailHistoryChart';
import { DetailNetworkChart } from './DetailNetworkChart';
import { detailLabels } from './node-detail-support';
import { SystemInfoCard } from './SystemInfoCard';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

function BillingCard({ node, lang }: { node: KomariNode; lang: Language }) {
  const { hasBilling, amount, expiryDate, cycleDays, autoRenewal } = formatBilling(node, lang);
  if (!hasBilling) return null;
  const t = detailLabels(lang);
  const labels = getNodeListLabels(lang);
  const days = getDaysUntilExpiry(node.expired_at);
  const cycle = cycleDays >= 360 ? t.yearly : cycleDays >= 85 ? t.quarterly : t.monthly;
  const fields: [string, ReactNode][] = [
    [t.cycle, cycleDays > 0 ? `${cycle} · ${t.days(cycleDays)}` : '—'],
    [t.expires, <span className="flex flex-wrap items-baseline gap-x-1.5">
      {expiryDate ?? '—'}
      {days !== null && <span className="text-[10.5px] font-normal" style={{ color: days <= 0 ? 'var(--sg-danger)' : days <= 7 ? 'var(--sg-warn)' : 'var(--sg-subtle-fg)' }}>
        {days <= 0 ? labels.expired : labels.expiresIn(days)}
      </span>}
    </span>],
    [t.amount, amount || '—'],
    [t.renewal, <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-[1.5px]" style={{ backgroundColor: autoRenewal ? 'var(--sg-success)' : 'var(--sg-subtle-fg)' }} />
      {autoRenewal ? t.enabled : t.manual}
    </span>],
  ];

  return (
    <section className="sg-inset-pane mt-3 rounded-xl px-3.5 pt-3 pb-3.5">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-tight">{t.billing}</h2>
        {node.regionCode && <span className="mono-num text-[10px] text-[var(--sg-subtle-fg)]">{node.regionCode}</span>}
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {fields.map(([label, value]) => <div key={label} className="min-w-0">
          <dt className="text-[11px] text-[var(--sg-muted-fg)]">{label}</dt>
          <dd className="mono-num mt-1 text-xs font-medium">{value}</dd>
        </div>)}
      </dl>
    </section>
  );
}

export function NodeDetailModal({ node, lang, canShowPricing, featuredPingTasks, dataSource, onClose, finalFocus, sampleTime }: {
  node: KomariNode;
  lang: Language;
  canShowPricing: boolean;
  featuredPingTasks: readonly number[];
  dataSource: KomariDataSource;
  onClose: () => void;
  finalFocus?: HTMLElement | null;
  sampleTime?: number;
}) {
  const [open, setOpen] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = detailLabels(lang);
  const labels = getNodeListLabels(lang);
  const { used, limit, percent } = getTrafficUsage(node);
  const quotaColor = percent >= 95 ? 'var(--sg-danger)' : percent >= 85 ? 'var(--sg-warn)' : 'var(--sg-subtle-fg)';
  const diskTotal = node.diskTotal ?? node.disk_total;
  const statusColor = node.online ? 'var(--sg-success)' : 'var(--sg-danger)';
  const subtitle = [
    node.geo?.[lang === 'zh-CN' ? 'cityZh' : 'cityEn'], groupLabel(normalizeGroup(node.group), lang),
    [node.os, node.arch && `(${node.arch})`].filter(Boolean).join(' '),
  ].filter(Boolean).join(' · ');
  const remark = node.public_remark?.trim();
  const kpis: [string, ReactNode, ReactNode?][] = [
    [labels.uptime, node.online ? formatUptime(node.uptime) : labels.offline],
    [limit > 0 ? t.monthlyQuota : labels.traffic,
      limit > 0 ? `${formatTrafficParts(used).text} / ${formatTrafficParts(limit).text}` :
        node.totalUp === undefined && node.totalDown === undefined ? '—' : formatTrafficParts(used).text,
      limit > 0 ? <span style={{ color: quotaColor }}>{Math.round(percent)}%</span> : labels.unlimited],
    ['Disk', diskTotal ? `${node.diskUsed === undefined ? '—' : formatTrafficParts(node.diskUsed).text} / ${formatTrafficParts(diskTotal).text}` : '—'],
    ['TCP / UDP / Proc', [node.tcp, node.udp, node.process].map(value => value ?? '—').join(' / ')],
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={shown => { if (!shown) onClose(); }}>
      <DialogContent showCloseButton={false} initialFocus={closeRef} finalFocus={() => finalFocus?.isConnected ? finalFocus : true}
        className="sg-popover block max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-[14px] p-3.5 text-[var(--sg-fg)] ring-0 sm:max-w-3xl sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <RegionFlag code={node.regionCode || node.region} size="md" />
              <DialogTitle className="min-w-0 wrap-anywhere text-base font-semibold tracking-tight">{node.name}</DialogTitle>
              <span data-slot="badge" data-variant="secondary" className="shrink-0 gap-1 px-2 py-0.5 text-[11px]" style={{ color: statusColor }}>
                <span aria-hidden="true" className="size-1.5 rounded-[1.5px]" style={{ backgroundColor: statusColor }} />
                {node.online ? labels.online : labels.offline}
              </span>
              {node.featured && <span data-slot="badge" data-variant="brand" className="shrink-0 gap-1 px-1.5 py-0.5 text-[10px]">
                <Pin className="size-2.5" aria-hidden="true" />{labels.pinned}
              </span>}
            </div>
            <DialogDescription className="mt-1 text-xs text-[var(--sg-muted-fg)]">{subtitle}</DialogDescription>
            {remark && <p className="mt-0.5 wrap-anywhere text-[11px] text-[var(--sg-subtle-fg)]">{remark}</p>}
          </div>
          <DialogClose render={<Button ref={closeRef} size="icon-sm" variant="ghost" aria-label={getLabels(lang).close} />}>
            <X className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </DialogClose>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kpis.map(([label, value, secondary]) => <div key={label} className="sg-inset-pane min-w-0 rounded-lg p-2.5">
            <dt className="flex flex-wrap items-baseline justify-between gap-x-1 text-[11px] text-[var(--sg-muted-fg)]">
              {label}{secondary !== undefined && <span className="text-[10px] text-[var(--sg-subtle-fg)]">{secondary}</span>}
            </dt>
            <dd className="mono-num mt-1 text-sm font-semibold">{value}</dd>
          </div>)}
        </dl>
        <DetailHistoryChart key={node.uuid} {...{ node, lang, dataSource, featuredPingTasks }} />
        <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-[1.06fr_1.18fr]">
          <DetailNetworkChart key={node.uuid} {...{ node, lang, dataSource, sampleTime }} />
          <SystemInfoCard {...{ node, lang }} />
        </div>
        {canShowPricing && <BillingCard node={node} lang={lang} />}
      </DialogContent>
    </Dialog>
  );
}
