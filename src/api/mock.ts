import { DEFAULT_THEME_SETTINGS } from '../lib/settings';
import type { KomariClient, KomariSite, NodeStatus, PingTask } from '../types/komari';
import type { KomariDataSource, TelemetrySnapshot } from './komari';

const HOUR = 3_600_000;
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const DEMO_PERIOD = 2_200;
const SEED_SAMPLES = 120;

interface DemoNode {
  client: KomariClient;
  rate: number;
  cpu: number;
  disk: number;
  total: number;
  online: boolean;
}

const demoNodes: DemoNode[] = [
  { client: { uuid: 'mock-tokyo', name: 'Tokyo-JP-01', region: 'JP', group: 'Asia', tags: 'VPS; IPv6', cpu_name: 'AMD EPYC', cpu_cores: 8, cpu_physical_cores: 4, os: 'Debian 13', arch: 'amd64', virtualization: 'KVM', mem_total: 16 * GIB, swap_total: 2 * GIB, disk_total: 160 * GIB, traffic_limit: 4 * 1024 * GIB, traffic_limit_type: 'sum' }, rate: 7 * MIB, cpu: 92, disk: 65, total: 1800 * GIB, online: true },
  { client: { uuid: 'mock-sydney', name: 'Sydney-AU-01', region: 'AU', group: 'Oceania', tags: 'ARM; IPv6', cpu_cores: 4, os: 'Ubuntu 24.04', arch: 'arm64', mem_total: 8 * GIB, disk_total: 80 * GIB }, rate: 680 * 1024, cpu: 37, disk: 30, total: 360 * GIB, online: true },
  { client: { uuid: 'mock-sanjose', name: 'SanJose-US-03', region: 'US', group: 'North America', tags: 'Edge', cpu_cores: 2, os: 'Alpine Linux', mem_total: 4 * GIB, disk_total: 40 * GIB }, rate: 180 * 1024, cpu: 27, disk: 16, total: 68 * GIB, online: true },
  { client: { uuid: 'mock-frankfurt', name: 'Frankfurt-DE-02', region: 'DE', group: 'Europe', cpu_cores: 2, os: 'Debian 12', mem_total: 2 * GIB, disk_total: 20 * GIB }, rate: 0, cpu: 0, disk: 9, total: 780 * MIB, online: false },
  { client: { uuid: 'mock-minimal', name: 'Lab-Minimal-01', mem_total: 2 * GIB, disk_total: 24 * GIB }, rate: 36 * 1024, cpu: 16, disk: 4, total: 320 * MIB, online: true },
];

const tasks: PingTask[] = [
  { id: 1, name: '电信', weight: 1, clients: ['mock-tokyo', 'mock-sydney', 'mock-sanjose'] },
  { id: 2, name: '联通', weight: 2, clients: ['mock-tokyo', 'mock-sydney'] },
  { id: 3, name: '移动', weight: 3, clients: ['mock-tokyo'] },
];

function status(node: DemoNode, step: number): NodeStatus {
  const variation = Math.sin(step / 5);
  return {
    online: node.online,
    cpu: node.online ? node.cpu + variation * 6 : undefined,
    load: node.online ? (node.cpu + variation * 6) / 20 : undefined,
    temp: node.client.cpu_name ? 58 + variation * 4 : undefined,
    ramUsed: node.online ? Math.round((node.client.mem_total ?? 0) * (0.55 + variation * 0.12)) : undefined,
    diskUsed: node.disk * GIB,
    swapUsed: node.client.swap_total ? 280 * MIB : undefined,
    up: Math.round(node.rate * (0.72 + variation * 0.28)),
    down: Math.round(node.rate * (1.3 + Math.cos(step / 7) * 0.6)),
    totalUp: node.total + step * node.rate,
    totalDown: Math.round(node.total * 1.6 + step * node.rate),
    uptime: node.online ? 880_000 + step * DEMO_PERIOD / 1000 : undefined,
    tcp: node.online ? 24 + Math.round(variation * 8) : undefined,
    udp: node.online ? 8 : undefined,
    process: node.online ? 48 : undefined,
  };
}

const dataSource: KomariDataSource = {
  async fetchLoadHistory(uuid, hours, signal) {
    signal?.throwIfAborted();
    const node = demoNodes.find(item => item.client.uuid === uuid);
    if (!node?.online) return [];
    const end = Date.now();
    return Array.from({ length: hours * 60 }, (_, i) => ({
      time: end - hours * HOUR + i * 60_000,
      cpu: node.cpu * 0.74 + Math.sin(i / 5) * 9,
      ram: 55 + Math.sin(i / 9) * 12,
    }));
  },
  async fetchPingHistory(uuid, hours, signal) {
    signal?.throwIfAborted();
    const assigned = tasks.filter(task => task.clients?.includes(uuid));
    const end = Date.now();
    const count = hours * 120;
    return {
      tasks: assigned,
      records: Array.from({ length: assigned.length ? count : 0 }, (_, i) => assigned.map(task => ({
        taskId: task.id,
        time: end - hours * HOUR + i * 30_000,
        value: i % 79 < 4 || (i + task.id) % 19 === 0 ? -1 : Math.round(22 + task.id * 21 + Math.sin(i / 5) * 14),
      }))).flat(),
    };
  },
  async fetchPingTasks(signal) {
    signal?.throwIfAborted();
    return tasks;
  },
  async fetchRecentNetwork(uuid, signal) {
    signal?.throwIfAborted();
    const node = demoNodes.find(item => item.client.uuid === uuid);
    if (!node) return [];
    const end = Date.now();
    return Array.from({ length: 120 }, (_, i) => {
      const sample = status(node, i);
      return { time: end - (120 - i) * DEMO_PERIOD, up: sample.up ?? 0, down: sample.down ?? 0 };
    });
  },
};

export function startMock(onSnapshot: (frame: TelemetrySnapshot) => void) {
  const now = Date.now();
  const networkHistory = Array.from({ length: SEED_SAMPLES }, (_, step) => {
    let up = 0;
    let down = 0;
    for (const node of demoNodes) {
      const sample = status(node, step);
      up += sample.up ?? 0;
      down += sample.down ?? 0;
    }
    return { time: now - (SEED_SAMPLES - step) * DEMO_PERIOD, up, down };
  });
  const site: KomariSite = {
    sitename: 'Komari Pane · Dev Demo', private_site: false,
    theme_settings: { ...DEFAULT_THEME_SETTINGS, featured_nodes: ['mock-tokyo'] },
  };
  const frame = (step: number): TelemetrySnapshot => new Map(demoNodes.map(node => [node.client.uuid, status(node, step)]));
  let step = SEED_SAMPLES;
  const timer = setInterval(() => onSnapshot(frame(++step)), DEMO_PERIOD);
  return { site, clients: demoNodes.map(node => node.client), snapshot: frame(step), dataSource, networkHistory, stop: () => clearInterval(timer) };
}
