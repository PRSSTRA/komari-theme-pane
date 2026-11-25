import type { KomariClient, Language, NodeStatus } from '../types/komari';

const RATE_UNITS = ['B/s', 'KB/s', 'MB/s', 'GB/s'] as const;
const TRAFFIC_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
const TICK_UNITS = ['B', 'K', 'M', 'G'] as const;
const DAY_MS = 86_400_000;

export interface FormatParts {
  value: string;
  unit: string;
  text: string;
}

function nonnegative(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function unitIndex(bytes: number, length: number): number {
  let index = 0;
  while (bytes >= 1024 && index < length - 1) {
    bytes /= 1024;
    index++;
  }
  return index;
}

function formatBytes(bytes: number, units: readonly string[], extraPrecisionFrom: number): FormatParts {
  const amount = nonnegative(bytes);
  const index = unitIndex(amount, units.length);
  const scaled = amount / 1024 ** index;
  const value = scaled.toFixed(index === 0 || scaled >= 100 ? 0 : index >= extraPrecisionFrom ? 2 : 1);
  const unit = units[index];
  return { value, unit, text: `${value} ${unit}` };
}

export function formatRateParts(bytesPerSec: number): FormatParts {
  return formatBytes(bytesPerSec, RATE_UNITS, 3);
}

export function formatTrafficParts(bytes: number): FormatParts {
  return formatBytes(bytes, TRAFFIC_UNITS, 4);
}

export function fmtRateTick(bytesPerSec: number): string {
  const amount = nonnegative(bytesPerSec);
  if (!amount) return '0';
  const index = unitIndex(amount, TICK_UNITS.length);
  const scaled = amount / 1024 ** index;
  return `${scaled.toFixed(index === 0 || scaled >= 10 ? 0 : 1)}${TICK_UNITS[index]}`;
}

export function parseRegion(region?: string | null): string {
  const code = region?.trim() ?? '';
  if (/^[a-z]{2}$/i.test(code)) return code.toUpperCase();
  if (!/^[\u{1f1e6}-\u{1f1ff}]{2}$/u.test(code)) return '';
  return String.fromCharCode(code.codePointAt(0)! - 0x1f1e6 + 65, code.codePointAt(2)! - 0x1f1e6 + 65);
}

export function parseTags(tags?: string | null): string[] {
  return tags?.split(';').map(tag => tag.trim()).filter(Boolean) ?? [];
}

export function getDaysUntilExpiry(expiryDate?: string | null, nowMs = Date.now()): number | null {
  const expiryMs = Date.parse(expiryDate ?? '');
  if (!Number.isFinite(expiryMs) || !Number.isFinite(nowMs)) return null;
  return Math.ceil((expiryMs - nowMs) / DAY_MS) + 0;
}

const BILLING_CYCLES: Record<number, readonly [string, string]> = {
  30: ['月', 'mo'], 90: ['季', 'qtr'], 365: ['年', 'yr'],
};

type BillingFields = Pick<KomariClient, 'price' | 'currency' | 'billing_cycle' | 'auto_renewal' | 'expired_at'>;

export function formatBilling(node: BillingFields, lang: Language) {
  const price = nonnegative(node.price);
  const cycleDays = nonnegative(node.billing_cycle);
  const currency = node.currency ?? '';
  const free = node.price === -1 ? (lang === 'en' ? 'Free' : '免费') : '';
  const cycle = BILLING_CYCLES[cycleDays]?.[lang === 'en' ? 1 : 0] ?? `${cycleDays}d`;
  const amount = price ? `${currency}${price.toFixed(2)}` : free;
  const label = price ? `${currency}${price}${cycleDays ? `/${cycle}` : ''}` : free;
  const expiryMs = Date.parse(node.expired_at ?? '');
  const expiryDate = Number.isFinite(expiryMs) ? new Date(expiryMs).toISOString().slice(0, 10) : null;
  return { label, amount, cycleDays, autoRenewal: node.auto_renewal === true, expiryDate, hasBilling: Boolean(amount || expiryDate) };
}

type TrafficFields = Pick<KomariClient, 'traffic_limit' | 'traffic_limit_type'> & Pick<NodeStatus, 'totalUp' | 'totalDown'>;

export function getTrafficUsage(node: TrafficFields) {
  const limit = nonnegative(node.traffic_limit);
  const up = nonnegative(node.totalUp);
  const down = nonnegative(node.totalDown);
  let used = up + down;
  if (limit) {
    switch (node.traffic_limit_type?.trim().toLowerCase()) {
      case 'up': used = up; break;
      case 'down': used = down; break;
      case 'min': used = Math.min(up, down); break;
      case 'sum': break;
      default: used = Math.max(up, down);
    }
  }
  return { used, limit, percent: limit ? (used / limit) * 100 : 0 };
}

export function formatUptime(seconds?: number | null): string {
  const uptime = nonnegative(seconds);
  if (!uptime) return '—';
  const days = Math.floor(uptime / 86_400);
  const hours = Math.floor((uptime % 86_400) / 3600);
  return days ? `${days}d ${hours}h` : `${hours}h`;
}

export const UNGROUPED_KEY = '__UNGROUPED__';
export const CONTINENT_ORDER = ['亚洲', '欧洲', '北美洲', '南美洲', '澳洲', '非洲'] as const;
const continentLabels: Partial<Record<string, string>> = {
  亚洲: 'Asia', 欧洲: 'Europe', 北美洲: 'North America', 南美洲: 'South America', 澳洲: 'Oceania', 非洲: 'Africa',
};
const continentAliases: Partial<Record<string, string>> = {
  asia: '亚洲', europe: '欧洲', 'north america': '北美洲', 'south america': '南美洲', oceania: '澳洲', africa: '非洲',
  亚太: '亚洲', 亚太地区: '亚洲', 'asia pacific': '亚洲', apac: '亚洲',
  北美: '北美洲', 南美: '南美洲', 大洋洲: '澳洲', 大洋: '澳洲', australia: '澳洲',
};

export function normalizeGroup(group?: string | null): string {
  const name = group?.trim();
  if (!name) return UNGROUPED_KEY;
  const key = name.toLowerCase();
  return Object.hasOwn(continentAliases, key) ? continentAliases[key]! : name;
}

export function groupLabel(group: string, lang: Language): string {
  if (group === 'ALL') return lang === 'en' ? 'All' : '全部';
  if (group === UNGROUPED_KEY) return lang === 'en' ? 'Ungrouped' : '未分组';
  return lang === 'en' && Object.hasOwn(continentLabels, group) ? continentLabels[group]! : group;
}
