import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_GROUPS, getNodeList, nodeGroupLabel } from '../src/components/node-list-data.ts';
import { UNGROUPED_KEY } from '../src/lib/format.ts';
import type { KomariNode } from '../src/types/komari.ts';

const node = (uuid: string, fields: Partial<KomariNode> = {}): KomariNode => ({
  uuid, name: uuid, online: true, regionCode: '', geo: null, tagList: [], featured: false, ...fields,
});
const defaults = { selectedGroup: ALL_GROUPS, query: '', onlyOnline: false, sort: 'weight', offlineFirst: true, pinnedNodes: new Set(['pinned']) } as const satisfies Parameters<typeof getNodeList>[2];

const nodes = [
  node('untagged', { weight: 2 }),
  node('offline', { online: false, group: ' ALL ', weight: 3, cpu: 4 }),
  node('pinned', { group: 'Asia', weight: 5, cpu: 20, up: 100, down: 50, totalUp: 400, totalDown: 200 }),
  node('worker', { group: '亚太', weight: 1, regionCode: 'SG', cpu_name: 'AMD Ryzen', tagList: ['Edge'], cpu: 80, up: 400, down: 500, ramUsed: 40, ramTotal: 200, totalUp: 200, totalDown: 200 }),
  node('storage', { group: 'eu-custom', weight: 4, cpu: 40, up: 300, totalUp: 0, totalDown: 900, ramUsed: 15, ramTotal: 30 }),
];

const ids = (items: readonly KomariNode[]) => items.map(item => item.uuid);

test('list keeps pinned nodes first by default and groups aliases with counts', () => {
  const { groups, visible } = getNodeList(nodes, 'en', defaults);
  assert.deepEqual(groups, [['亚洲', 2], ['ALL', 1], ['eu-custom', 1], [UNGROUPED_KEY, 1]]);
  assert.equal(nodeGroupLabel('ALL', 'zh-CN'), 'ALL');
  assert.deepEqual(ids(visible), ['pinned', 'offline', 'worker', 'untagged', 'storage']);
  assert.deepEqual(ids(getNodeList(nodes, 'en', { ...defaults, offlineFirst: false }).visible), ['pinned', 'worker', 'untagged', 'offline', 'storage']);
});

test('filters compose and metric sorts retain offline preference without moving pins ahead of values', () => {
  const select = { ...defaults, onlyOnline: true, selectedGroup: '亚洲' };
  for (const query of ['sg', 'RYZEN', 'edge']) {
    assert.deepEqual(ids(getNodeList(nodes, 'en', { ...select, query }).visible), ['worker']);
  }
  assert.deepEqual(ids(getNodeList(nodes, 'en', { ...defaults, selectedGroup: 'ALL' }).visible), ['offline']);
  assert.equal(getNodeList(nodes, 'en', { ...select, selectedGroup: 'removed' }).group, ALL_GROUPS);
  assert.deepEqual(ids(getNodeList(nodes, 'en', { ...defaults, sort: 'cpu' }).visible).slice(0, 3), ['worker', 'storage', 'pinned']);
  const missing = [node('unknown'), node('known-zero', { cpu: 0, up: 0, down: 0 }), node('stale-offline', { online: false, cpu: 99 })];
  assert.equal(getNodeList(missing, 'en', { ...defaults, sort: 'cpu', offlineFirst: false }).visible[0].uuid, 'known-zero');
  assert.deepEqual(ids(getNodeList(missing, 'en', { ...defaults, sort: 'net' }).visible), ['stale-offline', 'known-zero', 'unknown']);
  for (const [sort, top] of [['ram', 'storage'], ['net', 'worker'], ['traffic', 'storage']] as const) {
    assert.equal(getNodeList(nodes, 'en', { ...defaults, onlyOnline: true, sort }).visible[0].uuid, top);
  }
});
