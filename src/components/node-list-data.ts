import { CONTINENT_ORDER, UNGROUPED_KEY, groupLabel, normalizeGroup } from '../lib/format.ts';
import type { KomariNode, Language } from '../types/komari';

export type NodeSortKey = 'weight' | 'cpu' | 'ram' | 'net' | 'traffic';

export const ALL_GROUPS = Symbol('all groups');

const groupOrder = new Map<string, number>(CONTINENT_ORDER.map((group, index) => [group, index]));

export function nodeGroupLabel(key: string, lang: Language) {
  return key === 'ALL' ? key : groupLabel(key, lang);
}

export function usagePercent(used?: number, total?: number) {
  return used != null && total != null && total > 0 ? used / total * 100 : null;
}

function compareGroups(a: string, b: string, lang: Language) {
  if (a === b) return 0;
  if (a === UNGROUPED_KEY) return 1;
  if (b === UNGROUPED_KEY) return -1;
  const difference = (groupOrder.get(a) ?? groupOrder.size) - (groupOrder.get(b) ?? groupOrder.size);
  return difference || a.localeCompare(b, lang);
}

function sortMetric(node: KomariNode, key: NodeSortKey): number | null {
  switch (key) {
    case 'weight': return node.weight ?? null;
    case 'cpu': return node.online ? node.cpu ?? null : null;
    case 'ram': return node.online ? usagePercent(node.ramUsed, node.ramTotal ?? node.mem_total) : null;
    case 'net': return !node.online ? 0 : node.up != null && node.down != null ? node.up + node.down : null;
    case 'traffic': return node.totalUp != null && node.totalDown != null ? node.totalUp + node.totalDown : null;
  }
}

export function getNodeList(nodes: readonly KomariNode[], lang: Language, { selectedGroup, query, onlyOnline, sort, offlineFirst, pinnedNodes }: {
  selectedGroup: string | typeof ALL_GROUPS;
  query: string;
  onlyOnline: boolean;
  sort: NodeSortKey;
  offlineFirst: boolean;
  pinnedNodes: ReadonlySet<string>;
}): { groups: [string, number][]; group: string | typeof ALL_GROUPS; visible: KomariNode[] } {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const group = normalizeGroup(node.group);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const group = typeof selectedGroup === 'string' && counts.has(selectedGroup) ? selectedGroup : ALL_GROUPS;
  const needle = query.trim().toLowerCase();
  const visible = nodes.filter(node => {
    if (onlyOnline && !node.online) return false;
    if (group === ALL_GROUPS && !needle) return true;
    const key = normalizeGroup(node.group);
    return (group === ALL_GROUPS || group === key) && (!needle ||
      [node.name, node.region, node.regionCode, node.geo?.cityZh, node.geo?.cityEn, node.group, key, nodeGroupLabel(key, lang), node.cpu_name, node.os, ...node.tagList]
        .join(' ').toLowerCase().includes(needle));
  });
  visible.sort((a, b) => {
    if (sort === 'weight') {
      const pinned = Number(pinnedNodes.has(b.uuid)) - Number(pinnedNodes.has(a.uuid));
      if (pinned) return pinned;
    }
    const aValue = sortMetric(a, sort);
    const bValue = sortMetric(b, sort);
    const missing = Number(aValue === null) - Number(bValue === null);
    if (sort !== 'weight' && missing) return missing;
    if (offlineFirst && a.online !== b.online) return a.online ? 1 : -1;
    if (missing) return missing;
    return sort === 'weight' ? (aValue ?? 0) - (bValue ?? 0) : (bValue ?? 0) - (aValue ?? 0);
  });
  const groups = [...counts].sort(([a], [b]) => compareGroups(a, b, lang));
  return { groups, group, visible };
}
