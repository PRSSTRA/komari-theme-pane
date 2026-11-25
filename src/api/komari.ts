import { normalizeThemeSettings } from '../lib/settings.ts';
import type {
  HistoryHours, KomariClient, KomariMeResponse, KomariSite, LoadHistoryPoint,
  NetHistoryPoint, NodeStatus, PingHistoryPoint, PingTask,
} from '../types/komari';

export interface PingHistory {
  records: PingHistoryPoint[];
  tasks: PingTask[];
}

export interface KomariDataSource {
  fetchLoadHistory(uuid: string, hours: HistoryHours, signal?: AbortSignal): Promise<LoadHistoryPoint[]>;
  fetchPingHistory(uuid: string, hours: HistoryHours, signal?: AbortSignal): Promise<PingHistory>;
  fetchPingTasks(signal?: AbortSignal): Promise<PingTask[]>;
  fetchRecentNetwork(uuid: string, signal?: AbortSignal): Promise<NetHistoryPoint[]>;
}

export type TelemetrySnapshot = ReadonlyMap<string, NodeStatus>;

class KomariApiError extends Error {
  readonly kind: 'private' | 'unavailable' | 'response';

  constructor(kind: KomariApiError['kind'], path: string) {
    super(`Komari ${kind}: ${path}`);
    this.kind = kind;
  }
}

export const isPrivate = (error: unknown) => error instanceof KomariApiError && error.kind === 'private';
export const isUnavailable = (error: unknown) => error instanceof KomariApiError && error.kind === 'unavailable';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
const text = (value: unknown) => typeof value === 'string' ? value : undefined;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
const integerId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const timestamp = (value: unknown) => typeof value === 'string' ? Date.parse(value) : NaN;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;

function privateSiteMessage(message: unknown) {
  return message === 'Private site enabled, please login first' || message === 'Private site is enabled, please login first.';
}

async function request(path: string, signal?: AbortSignal, rpc?: string): Promise<unknown> {
  const deadline = AbortSignal.timeout(10_000);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    const response = await fetch(path, {
      credentials: 'include', cache: 'no-store', signal: requestSignal,
      ...(rpc && {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: rpc }),
      }),
    });
    const mime = response.headers.get('content-type');
    if ([502, 503, 504].includes(response.status)) throw new KomariApiError('unavailable', path);
    const body = await response.text();
    // Vite returns an empty 500 on proxy failure, or its index HTML without a proxy.
    if ((response.status === 500 && !body && mime === 'text/plain') ||
      (response.ok && mime?.includes('text/html') && body.includes('/@vite/client'))) {
      throw new KomariApiError('unavailable', path);
    }
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { throw new KomariApiError('response', path); }
    const envelope = object(payload);
    if (envelope?.status === 'error' && privateSiteMessage(envelope.message)) throw new KomariApiError('private', path);
    if (!response.ok || envelope?.status === 'error') throw new KomariApiError('response', path);
    return envelope?.status === 'success' ? envelope.data : payload;
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (error instanceof KomariApiError) throw error;
    throw new KomariApiError('unavailable', path);
  }
}

export async function verifySessionMe(signal?: AbortSignal): Promise<KomariMeResponse> {
  const path = '/api/me';
  const session = object(await request(path, signal));
  if (typeof session?.logged_in !== 'boolean') throw new KomariApiError('response', path);
  return { logged_in: session.logged_in, username: text(session.username) };
}

export async function fetchSessionMe(signal?: AbortSignal): Promise<KomariMeResponse> {
  try {
    return await verifySessionMe(signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { logged_in: false };
  }
}

export async function fetchSite(signal?: AbortSignal): Promise<KomariSite> {
  const path = '/api/public';
  const site = object(await request(path, signal));
  if (!site || typeof site.sitename !== 'string' || typeof site.private_site !== 'boolean') {
    throw new KomariApiError('response', path);
  }
  return { sitename: site.sitename, private_site: site.private_site, theme_settings: normalizeThemeSettings(site.theme_settings) };
}

export async function fetchNodes(signal?: AbortSignal): Promise<KomariClient[]> {
  const path = '/api/nodes';
  const data = await request(path, signal);
  if (!Array.isArray(data)) throw new KomariApiError('response', path);
  const nodes: KomariClient[] = [];
  for (const value of data) {
    const row = object(value);
    // Pane only presents public nodes, including when an administrator is signed in.
    if (!row || row.hidden === true || typeof row.uuid !== 'string' || !row.uuid || typeof row.name !== 'string') continue;
    nodes.push({
      uuid: row.uuid, name: row.name, region: text(row.region), group: text(row.group),
      public_remark: text(row.public_remark), tags: text(row.tags), weight: number(row.weight),
      cpu_name: text(row.cpu_name), cpu_cores: nonnegative(row.cpu_cores),
      cpu_physical_cores: nonnegative(row.cpu_physical_cores), virtualization: text(row.virtualization),
      arch: text(row.arch), os: text(row.os), kernel_version: text(row.kernel_version), gpu_name: text(row.gpu_name),
      mem_total: nonnegative(row.mem_total), swap_total: nonnegative(row.swap_total), disk_total: nonnegative(row.disk_total),
      traffic_limit: nonnegative(row.traffic_limit), traffic_limit_type: text(row.traffic_limit_type),
      price: number(row.price), currency: text(row.currency), billing_cycle: nonnegative(row.billing_cycle),
      auto_renewal: typeof row.auto_renewal === 'boolean' ? row.auto_renewal : undefined,
      expired_at: row.expired_at === null ? null : text(row.expired_at),
    });
  }
  return nodes;
}

function reportStatus(row: JsonObject | undefined, online: boolean): NodeStatus {
  const cpu = object(row?.cpu);
  const ram = object(row?.ram);
  const disk = object(row?.disk);
  const swap = object(row?.swap);
  const network = object(row?.network);
  const connections = object(row?.connections);
  const load = object(row?.load);
  return {
    online, cpu: nonnegative(cpu?.usage), ramUsed: nonnegative(ram?.used), ramTotal: nonnegative(ram?.total),
    diskUsed: nonnegative(disk?.used), diskTotal: nonnegative(disk?.total),
    swapUsed: nonnegative(swap?.used), swapTotal: nonnegative(swap?.total),
    up: nonnegative(network?.up), down: nonnegative(network?.down),
    totalUp: nonnegative(network?.totalUp), totalDown: nonnegative(network?.totalDown),
    uptime: nonnegative(row?.uptime), temp: number(cpu?.temperature ?? row?.temp),
    load: nonnegative(load?.load1), load5: nonnegative(load?.load5), load15: nonnegative(load?.load15),
    tcp: nonnegative(connections?.tcp), udp: nonnegative(connections?.udp), process: nonnegative(row?.process),
  };
}

export function parseWebSocketSnapshot(payload: unknown): TelemetrySnapshot | null {
  const envelope = object(payload);
  if (envelope?.type === 'connected') return null;
  const snapshot = object(envelope?.data);
  const online = strings(snapshot?.online);
  const reports = object(snapshot?.data);
  if (envelope?.status !== 'success' || !online || !reports) throw new KomariApiError('response', '/api/clients');
  const result = new Map<string, NodeStatus>();
  const onlineIds = new Set(online);
  for (const [uuid, report] of Object.entries(reports)) result.set(uuid, reportStatus(object(report), onlineIds.has(uuid)));
  for (const uuid of onlineIds) if (!result.has(uuid)) result.set(uuid, { online: true });
  return result;
}

export async function fetchNodesLatestViaRpc2(signal?: AbortSignal): Promise<TelemetrySnapshot> {
  const path = '/api/rpc2';
  const payload = object(await request(path, signal, 'common:getNodesLatestStatus'));
  const rows = object(payload?.result);
  if (payload?.jsonrpc !== '2.0' || payload.id !== 1) throw new KomariApiError('response', path);
  // Komari 1.6.2 returns HTTP 200 for RPC dispatch errors, including its private-site gate.
  const error = object(payload.error);
  if (error?.code === -32041 && privateSiteMessage(error.message)) throw new KomariApiError('private', path);
  if (!rows || error) throw new KomariApiError('response', path);
  const result = new Map<string, NodeStatus>();
  for (const [uuid, value] of Object.entries(rows)) {
    const row = object(value);
    if (!row || typeof row.online !== 'boolean') throw new KomariApiError('response', path);
    result.set(uuid, {
      online: row.online, cpu: nonnegative(row.cpu), ramUsed: nonnegative(row.ram), ramTotal: nonnegative(row.ram_total),
      diskUsed: nonnegative(row.disk), diskTotal: nonnegative(row.disk_total),
      swapUsed: nonnegative(row.swap), swapTotal: nonnegative(row.swap_total),
      up: nonnegative(row.net_out), down: nonnegative(row.net_in),
      totalUp: nonnegative(row.net_total_up), totalDown: nonnegative(row.net_total_down),
      uptime: nonnegative(row.uptime), temp: number(row.temp),
      load: nonnegative(row.load), load5: nonnegative(row.load5), load15: nonnegative(row.load15),
      tcp: nonnegative(row.connections), udp: nonnegative(row.connections_udp), process: nonnegative(row.process),
    });
  }
  return result;
}

async function history(kind: 'load' | 'ping', uuid: string, hours: HistoryHours, signal?: AbortSignal) {
  const path = `/api/records/${kind}?${new URLSearchParams({ uuid, hours: String(hours) })}`;
  const data = object(await request(path, signal));
  if (data && Array.isArray(data.records)) return { records: data.records as unknown[], tasks: data.tasks };
  if (data?.records === null && data.count === 0) return { records: [], tasks: data.tasks };
  throw new KomariApiError('response', path);
}

export async function fetchLoadHistory(uuid: string, hours: HistoryHours, signal?: AbortSignal): Promise<LoadHistoryPoint[]> {
  const { records } = await history('load', uuid, hours, signal);
  return records.flatMap(value => {
    const row = object(value);
    const time = timestamp(row?.time);
    if (!Number.isFinite(time) || (typeof row?.client === 'string' && row.client !== uuid)) return [];
    const used = nonnegative(row?.ram);
    const total = nonnegative(row?.ram_total);
    return [{ time, cpu: nonnegative(row?.cpu) ?? null, ram: total && used !== undefined ? 100 * used / total : null }];
  }).sort((a, b) => a.time - b.time);
}

function pingTasks(data: unknown): PingTask[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap(value => {
    const task = object(value);
    return task && integerId(task.id) && typeof task.name === 'string'
      ? [{ id: task.id, name: task.name, weight: number(task.weight), clients: strings(task.clients) }] : [];
  });
}

export async function fetchPingHistory(uuid: string, hours: HistoryHours, signal?: AbortSignal): Promise<PingHistory> {
  const { records, tasks } = await history('ping', uuid, hours, signal);
  const points: PingHistoryPoint[] = [];
  for (const value of records) {
    const row = object(value);
    const time = timestamp(row?.time);
    if (row && integerId(row.task_id) && Number.isFinite(time) && (typeof row.client !== 'string' || row.client === uuid)) {
      points.push({ taskId: row.task_id, time, value: number(row.value) ?? null });
    }
  }
  return { records: points.sort((a, b) => a.time - b.time), tasks: pingTasks(tasks) };
}

export async function fetchPingTasks(signal?: AbortSignal): Promise<PingTask[]> {
  const path = '/api/task/ping';
  const data = await request(path, signal);
  if (!Array.isArray(data)) throw new KomariApiError('response', path);
  return pingTasks(data);
}

export async function fetchRecentNetwork(uuid: string, signal?: AbortSignal): Promise<NetHistoryPoint[]> {
  const path = `/api/recent/${encodeURIComponent(uuid)}`;
  const data = await request(path, signal);
  if (!Array.isArray(data)) throw new KomariApiError('response', path);
  const points: NetHistoryPoint[] = [];
  for (const value of data) {
    const row = object(value);
    if (typeof row?.uuid === 'string' && row.uuid !== uuid) continue;
    const time = timestamp(row?.updated_at);
    const network = object(row?.network);
    const up = nonnegative(network?.up);
    const down = nonnegative(network?.down);
    if (Number.isFinite(time) && up !== undefined && down !== undefined) points.push({ time, up, down });
  }
  return points.sort((a, b) => a.time - b.time);
}

export const realDataSource: KomariDataSource = { fetchLoadHistory, fetchPingHistory, fetchPingTasks, fetchRecentNetwork };
