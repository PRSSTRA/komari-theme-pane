import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchLoadHistory, fetchNodes, fetchNodesLatestViaRpc2, fetchPingHistory, fetchPingTasks, fetchRecentNetwork,
  fetchSessionMe, fetchSite, isPrivate, isUnavailable, parseWebSocketSnapshot, verifySessionMe,
} from '../src/api/komari.ts';
import { subscribeTelemetry } from '../src/hooks/telemetryTransport.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status });
const success = (data: unknown) => json({ status: 'success', data });
const uuid = 'public-node';
const date = '2026-11-25T15:00:00Z';
const time = Date.parse(date);
const network = { up: 620_987, down: 1_588_492, totalUp: 14_000_000_000, totalDown: 19_000_000_000 };
const reply = { status: 'success', data: { online: [uuid], data: { [uuid]: { network, load: { load1: 1.2, load5: 2.3, load15: 3.4 } } } } };

async function withFetch(handler: typeof fetch, run: () => Promise<void>) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  try { await run(); } finally { globalThis.fetch = previous; }
}

test('WS and RPC map actual Komari field shapes without converting byte units', async () => {
  assert.equal(parseWebSocketSnapshot({ type: 'connected' }), null);
  assert.throws(() => parseWebSocketSnapshot({ status: 'success', data: { online: [], data: [] } }));
  const ws = parseWebSocketSnapshot(reply)?.get(uuid);
  assert.deepEqual([ws?.online, ws?.up, ws?.down, ws?.totalUp, ws?.totalDown], [true, ...Object.values(network)]);
  assert.deepEqual([ws?.load, ws?.load5, ws?.load15], [1.2, 2.3, 3.4]);
  await withFetch(async (url, init) => {
    assert.equal(url, '/api/rpc2');
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    assert.deepEqual(JSON.parse(String(init?.body)), { jsonrpc: '2.0', id: 1, method: 'common:getNodesLatestStatus' });
    return json({ jsonrpc: '2.0', id: 1, result: { [uuid]: {
      online: true, net_in: network.down, net_out: network.up, net_total_up: network.totalUp, net_total_down: network.totalDown,
      load: 1.2, load5: 2.3, load15: 3.4,
    }, offline: { online: false } } });
  }, async () => {
    const snapshot = await fetchNodesLatestViaRpc2();
    assert.deepEqual(snapshot.get(uuid), ws);
    assert.equal(snapshot.get('offline')?.online, false);
  });
});

test('auth denial, unknown session, and an unavailable development proxy are distinct', async () => {
  await withFetch(async () => success({ logged_in: true, username: 'Admin' }), async () => {
    assert.deepEqual(await fetchSessionMe(), { logged_in: true, username: 'Admin' });
  });
  await withFetch(async () => json({ logged_in: false }), async () => {
    assert.equal((await verifySessionMe()).logged_in, false);
  });
  await withFetch(async () => { throw new TypeError('offline'); }, async () => {
    assert.deepEqual(await fetchSessionMe(), { logged_in: false });
    await assert.rejects(verifySessionMe(), isUnavailable);
  });
  const privateMessage = 'Private site enabled, please login first';
  await withFetch(async () => json({ status: 'error', message: privateMessage }, 401), async () => {
    await assert.rejects(fetchNodes(), isPrivate);
    assert.deepEqual(await fetchSessionMe(), { logged_in: false });
  });
  await withFetch(async () => json({ jsonrpc: '2.0', id: 1, error: { code: -32041, message: privateMessage } }), async () => {
    await assert.rejects(fetchNodesLatestViaRpc2(), isPrivate);
  });
  const deniedResponses = [
    json({ jsonrpc: '2.0', id: 1, error: { code: -32603 } }),
    json({ jsonrpc: '2.0', id: 1, error: { code: -32041, message: 'Permission denied' } }),
    json({ status: 'error', message: 'Permission denied' }, 401),
    json({ status: 'error', message: 'Permission denied' }, 403),
    new Response('origin rejected', { status: 403 }),
  ];
  for (const response of deniedResponses) {
    await withFetch(async url => url === '/api/me' ? success({ logged_in: true }) : response.clone(), async () => {
      await assert.rejects(fetchNodesLatestViaRpc2(), error => !isPrivate(error) && !isUnavailable(error));
      await assert.rejects(fetchNodes(), error => !isPrivate(error) && !isUnavailable(error));
      assert.equal((await fetchSessionMe()).logged_in, true);
    });
  }
  await withFetch(async () => new Response(null, { status: 500, headers: { 'Content-Type': 'text/plain' } }), async () => {
    await assert.rejects(fetchSite(), isUnavailable);
  });
  await withFetch(async () => json({ status: 'error' }, 500), async () => {
    await assert.rejects(fetchSite(), error => !isPrivate(error) && !isUnavailable(error));
  });
});

test('history retains real measurements and never invents records or leaks hidden nodes', async () => {
  const task = { id: 1, name: 'TCP', weight: 2, clients: [uuid] };
  const fixtures: Record<string, unknown> = {
    '/api/public': { sitename: 'Komari', private_site: false, theme_settings: { show_pricing: 'true' } },
    '/api/nodes': [{ uuid, name: 'Public' }, { uuid: 'private-node', name: 'Hidden', hidden: true }],
    [`/api/recent/${uuid}`]: [{ uuid, updated_at: date, network }, { uuid: 'other', updated_at: date, network }],
    [`/api/records/load?uuid=${uuid}&hours=1`]: { records: [{ time: date, cpu: 23, ram: 8, ram_total: 16 }, { time: date, cpu: 0, ram: 5, ram_total: 0 }] },
    [`/api/records/ping?uuid=${uuid}&hours=1`]: { records: [
      { task_id: 1, time: date, value: -1, client: uuid }, { task_id: 1, time: date, client: uuid },
      { task_id: 1, time: date, value: 50, client: 'other' },
    ], tasks: [task] },
    [`/api/records/ping?uuid=${uuid}&hours=6`]: { records: null, count: 0 },
    '/api/task/ping': [task],
  };
  await withFetch(async url => {
    assert.ok(Object.hasOwn(fixtures, String(url)), `unexpected HTTP request: ${url}`);
    return success(fixtures[String(url)]);
  }, async () => {
    assert.equal((await fetchSite()).theme_settings.show_pricing, false);
    assert.deepEqual((await fetchNodes()).map(node => node.uuid), [uuid]);
    assert.deepEqual(await fetchRecentNetwork(uuid), [{ time, up: network.up, down: network.down }]);
    assert.deepEqual(await fetchLoadHistory(uuid, 1), [{ time, cpu: 23, ram: 50 }, { time, cpu: 0, ram: null }]);
    assert.deepEqual(await fetchPingHistory(uuid, 1), { records: [{ time, taskId: 1, value: -1 }, { time, taskId: 1, value: null }], tasks: [task] });
    assert.deepEqual(await fetchPingHistory(uuid, 6), { records: [], tasks: [] });
    assert.deepEqual(await fetchPingTasks(), [task]);
  });
});

test('transport starts each period at send time and cancels fallback on hide and WS recovery', async () => {
  const restore = ['window', 'document', 'WebSocket', 'performance', 'setTimeout', 'clearTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let now = 0;
  let nextTimer = 0;
  const timers = new Map<number, { time: number; run: () => void }>();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const sockets: FakeSocket[] = [];
  const requests: Array<{ time: number; signal: AbortSignal | null | undefined; resolve: (response: Response) => void }> = [];
  const received: number[] = [];
  const sent: number[] = [];

  class FakeSocket {
    onopen?: () => void;
    onerror?: () => void;
    onmessage?: (event: { data: string }) => void;
    constructor() { sockets.push(this); }
    close() {}
    send(message: string) {
      assert.equal(message, 'get');
      sent.push(now);
    }
    reply() { this.onmessage?.({ data: JSON.stringify(reply) }); }
  }

  function advance(target: number) {
    while (timers.size) {
      const timer = [...timers].sort((a, b) => a[1].time - b[1].time)[0];
      if (timer[1].time > target) break;
      timers.delete(timer[0]);
      now = timer[1].time;
      timer[1].run();
    }
    now = target;
  }

  const rpcReply = () => json({ jsonrpc: '2.0', id: 1, result: {} });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  for (const [key, value] of Object.entries({
    window: { location: { origin: 'https://example.invalid' } }, document, WebSocket: FakeSocket,
    performance: { now: () => now },
    setTimeout: (run: () => void, delay: number) => {
      timers.set(++nextTimer, { time: now + delay, run });
      return nextTimer;
    },
    clearTimeout: (id: number) => { timers.delete(id); },
  })) Object.defineProperty(globalThis, key, { configurable: true, value });

  try {
    await withFetch((_url, init) => {
      const { promise, resolve } = Promise.withResolvers<Response>();
      requests.push({ time: now, signal: init?.signal, resolve });
      return promise;
    }, async () => {
      const stop = subscribeTelemetry(() => received.push(now), () => {}, () => assert.fail('unexpected private-site denial'));
      try {
        sockets[0].onopen?.();
        advance(700);
        sockets[0].reply();
        advance(2_000);
        assert.deepEqual(sent, [0, 2_000]);
        sockets[0].onerror?.();
        advance(3_000);
        sockets[1].onerror?.();
        assert.equal(requests[0].time, 3_000);
        advance(3_800);
        requests[0].resolve(rpcReply());
        await flush();
        advance(5_500);
        assert.equal(requests[1].time, 5_500);
        document.hidden = true;
        document.dispatchEvent(new Event('visibilitychange'));
        assert.equal(requests[1].signal?.aborted, true);
        requests[1].resolve(rpcReply());
        await flush();
        advance(6_000);
        assert.equal(requests.length, 2);
        document.hidden = false;
        document.dispatchEvent(new Event('visibilitychange'));
        assert.equal(requests[2].time, 6_000);
        sockets[2].onopen?.();
        sockets[2].reply();
        assert.equal(requests[2].signal?.aborted, true);
        requests[2].resolve(rpcReply());
        await flush();
        assert.deepEqual(received, [700, 3_800, 6_000]);
      } finally {
        stop();
      }
      assert.equal(timers.size, 0);
    });
  } finally {
    for (const [key, descriptor] of restore) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
