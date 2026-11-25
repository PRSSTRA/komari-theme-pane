import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fmtRateTick, formatBilling, formatRateParts, formatTrafficParts, formatUptime, getDaysUntilExpiry,
  getTrafficUsage, groupLabel, normalizeGroup, parseRegion, parseTags, UNGROUPED_KEY,
} from '../src/lib/format.ts';
import { resolveNodeGeo } from '../src/lib/geo-lookup.ts';
import { formatUtc8Time, getSolarSubpoint, projectGeoToMapPercent, sampleWorldLand } from '../src/lib/world-map-matrix.ts';
import { bucketPingPoints, calcAdaptiveRateCeiling, selectPingTasks, summarizePingTracks } from '../src/lib/slats-math.ts';

const KiB = 1024;

test('formatters accept raw bytes and preserve the prototype unit precision', () => {
  assert.deepEqual(formatRateParts(KiB), { value: '1.0', unit: 'KB/s', text: '1.0 KB/s' });
  assert.equal(formatRateParts(100 * KiB ** 2).text, '100 MB/s');
  assert.equal(formatRateParts(1.25 * KiB ** 3).text, '1.25 GB/s');
  assert.equal(formatTrafficParts(1.25 * KiB ** 4).text, '1.25 TB');
  assert.equal(formatTrafficParts(KiB ** 5).text, '1.00 PB');
  assert.deepEqual([0, 419, 90 * KiB, KiB ** 2, 1.4 * KiB ** 3].map(fmtRateTick), ['0', '419B', '90K', '1.0M', '1.4G']);
});

test('billing, traffic and groups retain Komari meanings', () => {
  const node = { price: 4.5, currency: '$', billing_cycle: 30, expired_at: '2026-11-27T00:00:00Z' };
  assert.equal(formatBilling(node, 'en').label, '$4.5/mo');
  assert.equal(formatBilling(node, 'zh-CN').amount, '$4.50');
  assert.equal(formatBilling({ price: -1 }, 'zh-CN').label, '免费');
  assert.equal(formatBilling({ price: 0 }, 'en').hasBilling, false);
  assert.equal(getDaysUntilExpiry(node.expired_at, Date.UTC(2026, 10, 25, 12)), 2);
  assert.equal(getDaysUntilExpiry(node.expired_at, Date.UTC(2026, 10, 27, 1)), 0);
  assert.equal(getDaysUntilExpiry('no expiry'), null);
  assert.equal(formatUptime(90_000), '1d 1h');
  const totals = { totalUp: 30, totalDown: 80 };
  const usage = (traffic_limit_type: string) => getTrafficUsage({ ...totals, traffic_limit: 100, traffic_limit_type }).used;
  assert.deepEqual(['sum', 'max', 'min', 'up', 'down'].map(usage), [110, 80, 30, 30, 80]);
  assert.deepEqual(getTrafficUsage(totals), { used: 110, limit: 0, percent: 0 });
  assert.deepEqual(parseTags(' hk ; ; edge,fast ; BGP '), ['hk', 'edge,fast', 'BGP']);
  assert.equal(normalizeGroup(' NORTH AMERICA '), '北美洲');
  assert.equal(normalizeGroup('亚太'), '亚洲');
  assert.equal(normalizeGroup('  '), UNGROUPED_KEY);
  assert.equal(groupLabel(UNGROUPED_KEY, 'en'), 'Ungrouped');
});

test('locations require a region and match alias tokens, not substrings', () => {
  assert.equal(parseRegion(' 🇯🇵 '), 'JP');
  assert.equal(parseRegion('jP'), 'JP');
  assert.equal(resolveNodeGeo({ uuid: 'node', name: 'Tokyo-Core-01', region: ' ' }), null);
  assert.equal(resolveNodeGeo({ uuid: 'node', name: 'Unknown', region: 'ZZ' }), null);
  assert.deepEqual(resolveNodeGeo({ uuid: 'node', name: 'Node-sea-01', region: 'US' }),
    { lng: -122.33, lat: 47.61, cityZh: '西雅图', cityEn: 'Seattle', regionCode: 'US' });
  const fallback = resolveNodeGeo({ uuid: 'node', name: 'Canary-overseas', region: 'CA' });
  assert.deepEqual([fallback?.lng, fallback?.lat, fallback?.regionCode], [-101.911, 60.324, 'CA']);
  assert.equal(resolveNodeGeo({ uuid: 'node', name: 'Edge-01', public_remark: '机房：San-Jose', region: 'US' })?.cityEn, 'San Jose');
});

test('map mask decodes runs and interpolates at prototype pixel positions', () => {
  assert.equal(sampleWorldLand(56 / 207, 1 / 95), 0);
  const firstLand = sampleWorldLand(57 / 207, 1 / 95);
  assert.ok(Math.abs(firstLand - 1 / 15) < 1e-7);
  assert.ok(Math.abs(sampleWorldLand(56.5 / 207, 1 / 95) - firstLand / 2) < 1e-7);
  const { xPct, yPct } = projectGeoToMapPercent(0, 0);
  assert.equal(xPct, 42.323 / 104 * 100);
  assert.equal(yPct, 26.807 / 48 * 100);
  assert.equal(formatUtc8Time(Date.UTC(2026, 0, 1, 16, 2, 3)), '00:02:03');
  assert.equal(getSolarSubpoint(Date.UTC(2026, 0, 1, 12)).subsolarLngRad, 0);
});

test('rate ceiling adapts from bytes per second through gigabytes', () => {
  assert.equal(calcAdaptiveRateCeiling([]), 1);
  for (const peak of [20, 80 * KiB, 8 * KiB ** 2, KiB ** 3]) {
    const ceiling = calcAdaptiveRateCeiling([null, 0, peak]);
    assert.ok(ceiling > peak && ceiling < peak * 1.6);
  }
});

test('ping selection filters node membership and prioritizes configured tracks', () => {
  const tasks = [{ id: 1, name: 'Global' }, { id: 2, name: 'Other node', clients: ['other'] },
    { id: 3, name: 'Local', clients: ['node'] }, { id: 4, name: 'Backup' }];
  const recordTasks = [{ id: 3, name: 'Duplicate' }, { id: 5, name: 'Record only' }];
  assert.deepEqual(selectPingTasks(tasks, recordTasks, 'node', [5, 2, 5, 3]), [recordTasks[1], tasks[2]]);
  assert.deepEqual(selectPingTasks(tasks, recordTasks, 'node', [2]).map(task => task.id), [1, 3, 4]);
  assert.deepEqual(selectPingTasks(tasks.slice(1, 2), [], 'node'), []);
});

test('ping buckets distinguish partial loss, empty buckets and complete timeout', () => {
  const points = [{ taskId: 1, time: 1, value: 20 }, { taskId: 1, time: 2, value: 40 },
    { taskId: 1, time: 3, value: -5 }, { taskId: 1, time: 30, value: null }];
  assert.deepEqual(bucketPingPoints(points, 0, 30, 3), [
    { latency: 30, loss: 100 / 3 }, { latency: null, loss: null }, { latency: null, loss: 100 },
  ]);
  const [track, empty] = summarizePingTracks([{ id: 1, name: 'Local' }, { id: 3, name: 'Empty' }], points);
  assert.deepEqual([track.latest, track.loss, empty.latest, empty.loss], [null, 50, null, null]);
});
