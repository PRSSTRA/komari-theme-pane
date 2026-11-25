import { Pin } from 'lucide-react';
import { RegionFlag } from '../lib/flags';
import { formatBilling, formatRateParts, formatTrafficParts, formatUptime, getDaysUntilExpiry, getTrafficUsage } from '../lib/format';
import type { NodeListLabels } from '../lib/i18n';
import type { KomariNode, KomariThemeSettings, Language } from '../types/komari';

export interface NodeListViewProps {
  nodes: readonly KomariNode[];
  settings: KomariThemeSettings;
  pinnedNodes: ReadonlySet<string>;
  lang: Language;
  canShowPricing: boolean;
  onOpenNode: (uuid: string) => void;
}

export function nodeRateParts(online: boolean, bytes?: number) {
  return online ? bytes == null ? null : formatRateParts(bytes) : formatRateParts(0);
}

export function nodeTrafficParts(bytes?: number) {
  return bytes == null ? null : formatTrafficParts(bytes);
}

export function nodeQuota(node: KomariNode) {
  const quota = getTrafficUsage(node);
  if (quota.limit <= 0) return null;
  const mode = node.traffic_limit_type?.trim().toLowerCase();
  const known = (mode === 'up' || node.totalDown != null) && (mode === 'down' || node.totalUp != null);
  return { limit: formatTrafficParts(quota.limit), used: known ? formatTrafficParts(quota.used) : null, percent: known ? quota.percent : null };
}

export function meterTone(percent: number | null) {
  return (percent ?? 0) >= 88 ? 'var(--sg-danger)' : (percent ?? 0) >= 70 ? 'var(--sg-warn)' : 'var(--sg-ink-fill)';
}

export function MetricBar({ percent, className }: { percent: number | null; className: string }) {
  return (
    <div data-slot="progress-track" aria-hidden="true" className={`overflow-hidden rounded-full ${className}`}>
      <div data-slot="progress-indicator" className="h-full rounded-full" style={{
        backgroundColor: meterTone(percent), width: `${Math.max(0, Math.min(percent ?? 0, 100))}%`,
      }} />
    </div>
  );
}

export function NodeName({ node, pinned, labels, onOpen, heading = false }: {
  node: KomariNode; pinned: boolean; labels: NodeListLabels; onOpen: () => void; heading?: boolean;
}) {
  const name = <button type="button" className="sg-node-open block max-w-full min-w-0 truncate text-left font-medium" onClick={onOpen}>{node.name}</button>;
  return (
    <>
      <RegionFlag code={node.regionCode || node.region} size="md" />
      {heading ? <h3 className="min-w-0 truncate text-sm tracking-tight">{name}</h3> : name}
      {pinned && <span data-slot="badge" data-variant="brand" className="shrink-0 gap-1 px-1.5 py-0.5 text-[10px]">
        <Pin className="size-2.5 shrink-0" aria-hidden="true" />{labels.pinned}
      </span>}
    </>
  );
}

export function StatusDot({ node, labels }: { node: KomariNode; labels: NodeListLabels }) {
  const high = node.online && (node.cpu ?? 0) >= 88;
  return (
    <>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-[1.5px]" style={{
        backgroundColor: node.online ? high ? 'var(--sg-warn)' : 'var(--sg-success)' : 'var(--sg-danger)',
      }} />
      {node.online && <span className="sr-only">{high ? labels.highLoad : labels.online}: </span>}
    </>
  );
}

export function nodeUptime(node: KomariNode, labels: NodeListLabels) {
  return node.online ? formatUptime(node.uptime) : labels.offline;
}

export function nodeBilling(node: KomariNode, lang: Language, labels: NodeListLabels) {
  const { label } = formatBilling(node, lang);
  const days = getDaysUntilExpiry(node.expired_at);
  const expiry = days === null ? '' : days <= 0 ? labels.expired : labels.expiresIn(days);
  return label && expiry ? `${label} · ${expiry}` : label || expiry;
}
