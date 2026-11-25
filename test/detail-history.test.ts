import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadColumns, pingColumns, trackRows } from '../src/components/detail-history-geometry.ts';

test('load, multi-route ping and isolated ping share a bottom row', () => {
  const bottom = trackRows(2, false).at(-1)?.end;
  for (const count of [1, 2, 3]) {
    const ranges = trackRows(count, true);
    assert.equal(ranges[0].start, 0);
    assert.equal(ranges.at(-1)?.end, bottom);
    for (let i = 1; i < ranges.length; i++) assert.equal(ranges[i].start - ranges[i - 1].end, 2);
  }
});

test('history columns preserve missing metrics, partial loss and full timeouts', () => {
  const [cpu, ram] = loadColumns([{ time: 100, cpu: 0, ram: null }], 0, 400, 4);
  assert.deepEqual(cpu.columns.map(column => column.value), [null, 0, null, null]);
  assert.deepEqual(ram.columns.map(column => column.value), [null, null, null, null]);
  const points = [
    { time: 100, value: 40, taskId: 1 }, { time: 130, value: -1, taskId: 1 }, { time: 350, value: null, taskId: 1 },
  ];
  const [ping] = pingColumns([{ task: { id: 1, name: 'Route' }, label: 'Route', palette: 0, latest: null, loss: 200 / 3, points }], 0, 400, 4);
  assert.deepEqual(ping.columns, [
    { value: null, loss: null }, { value: 40, loss: 50 }, { value: null, loss: null }, { value: null, loss: 100 },
  ]);
});
