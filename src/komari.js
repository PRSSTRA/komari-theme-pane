import manifest from '../komari-theme.json' with { type: 'json' };
import countryLabelPoints from './country-label-points.js';

const MiB = 1024 ** 2;
const GiB = 1024 ** 3;
const TiB = 1024 ** 4;
const DAY_MS = 86_400_000;
const REQUEST_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_RETRY_MS = 15_000;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value : '';
const number = (value) => Number.isFinite(value) ? value : 0;
const timestamp = (value) => typeof value === 'string' && !value.startsWith('0001-') && Number.isFinite(Date.parse(value)) ? value : null;

function fetchKomari(path, init) {
  return fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...init,
  });
}

function postJson(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function readJson(response, path) {
  try {
    return await response.json();
  } catch (cause) {
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`, { cause });
    if (cause instanceof SyntaxError) throw new Error(`${path}: Invalid JSON response`, { cause });
    throw cause;
  }
}

function responseError(response, path, body) {
  return new Error(text(body?.message) || `${path}: ${response.ok ? 'Unexpected API response' : `HTTP ${response.status}`}`);
}

async function requestData(path, init) {
  const response = await fetchKomari(path, init);
  const body = await readJson(response, path);
  if (!response.ok || body?.status !== 'success') throw responseError(response, path, body);
  return body.data;
}

export async function loadDashboard() {
  const [publicSettings, me] = await Promise.all([
    requestData('/api/public'),
    fetchKomari('/api/me').then(async (response) => {
      const body = await readJson(response, '/api/me');
      if (!response.ok || typeof body?.logged_in !== 'boolean') throw responseError(response, '/api/me', body);
      return body;
    }),
  ]);
  if (!isObject(publicSettings)) throw new Error('/api/public: Expected a settings object');

  const loggedIn = me.logged_in;
  // Komari reports private_site:false to guests holding a valid temporary share cookie.
  const nodes = !loggedIn && publicSettings.private_site === true ? [] : await requestData('/api/nodes');
  if (!Array.isArray(nodes)) throw new Error('/api/nodes: Expected a node array');
  const settings = isObject(publicSettings.theme_settings) ? publicSettings.theme_settings : {};
  return { nodes, settings, loggedIn, publicSettings };
}

export async function login({ username, password, twoFactorCode }) {
  const path = '/api/login';
  const response = await fetchKomari(path, postJson({ username, password, '2fa_code': twoFactorCode }));
  const body = await readJson(response, path);
  if (response.ok && body?.status === 'success') return { status: 'success' };
  if (response.status === 401 && body?.message === '2FA code is required') return { status: '2fa_required' };
  if (response.status === 401 && body?.message === 'Invalid 2FA code') return { status: '2fa_invalid' };
  throw responseError(response, path, body);
}

export async function logout() {
  const response = await fetchKomari('/api/logout', { redirect: 'manual' });
  // The session cookie is cleared by Komari's redirect; don't fetch the dashboard document.
  if (response.type !== 'opaqueredirect' && response.status !== 302 && !response.ok) {
    throw responseError(response, '/api/logout', await readJson(response, '/api/logout'));
  }
}

export async function saveThemeSettings(settings) {
  const query = new URLSearchParams({ theme: manifest.short });
  await requestData(`/api/admin/theme/settings?${query}`, postJson({
    ...settings,
    featured_nodes: JSON.stringify(settings.featured_nodes),
  }));
}

function countryCode(value) {
  const region = text(value).trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(region)) return region;
  if (/^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(region)) {
    return String.fromCharCode(region.codePointAt(0) - 0x1f1a5, region.codePointAt(2) - 0x1f1a5);
  }
  return '';
}

function quotaBytes(up, down, type) {
  switch (text(type).toLowerCase()) {
    case 'up': return up;
    case 'down': return down;
    case 'sum': return up + down;
    case 'min': return Math.min(up, down);
    default: return Math.max(up, down);
  }
}

// Keep Komari's last recorded counters for offline nodes. Presence is unknown
// before the first snapshot; freshness after that is tracked by watchTelemetry.
export function normalizeNodes(rawNodes, snapshot, { loggedIn = false } = {}) {
  const online = snapshot ? new Set(snapshot.online) : null;
  const now = Date.now();
  return rawNodes.map((node) => {
    const report = snapshot?.data[node.uuid];
    const region = countryCode(node.region);
    const point = countryLabelPoints[region];
    const flag = region ? String.fromCodePoint(region.charCodeAt(0) + 0x1f1a5, region.charCodeAt(1) + 0x1f1a5) : '';
    const up = number(report?.network?.totalUp);
    const down = number(report?.network?.totalDown);
    const trafficLimit = Math.max(0, number(node.traffic_limit));
    const expiredAt = loggedIn ? timestamp(node.expired_at) : null;
    const billingCycleDays = loggedIn ? Math.max(0, number(node.billing_cycle)) : 0;
    const currency = text(node.currency).trim();
    const price = loggedIn && node.price > 0 ? [currency, node.price].filter(Boolean).join(' ') : '';
    const swapUsedGB = number(report?.swap?.used) / GiB;
    const swapTotalGB = number(report?.swap?.total ?? node.swap_total) / GiB;

    return {
      uuid: node.uuid,
      name: text(node.name),
      region,
      flag,
      group: text(node.group),
      city: '',
      lng: point?.[0] ?? null,
      lat: point?.[1] ?? null,
      os: text(node.os),
      kernel: text(node.kernel_version),
      virt: text(node.virtualization),
      arch: text(node.arch || report?.cpu?.arch),
      cpu_name: text(node.cpu_name || report?.cpu?.name),
      cores: number(node.cpu_cores || report?.cpu?.cores),
      physicalCores: number(node.cpu_physical_cores),
      gpuName: text(node.gpu_name),
      public_remark: text(node.public_remark),
      online: online?.has(node.uuid) ?? null,
      hasTelemetry: Boolean(report),
      updatedAt: timestamp(report?.updated_at),
      weight: number(node.weight),
      tags: text(node.tags).split(';').map((tag) => tag.trim()).filter(Boolean),
      price,
      billingAmount: price,
      billingCycleDays,
      autoRenewal: loggedIn && node.auto_renewal === true,
      expiredDate: expiredAt?.slice(0, 10) ?? '',
      expireDays: expiredAt ? Math.ceil((Date.parse(expiredAt) - now) / DAY_MS) : null,
      uptimeSec: number(report?.uptime),
      cpu: number(report?.cpu?.usage),
      ramUsed: number(report?.ram?.used) / GiB,
      ramTotal: number(report?.ram?.total ?? node.mem_total) / GiB,
      diskUsed: number(report?.disk?.used) / GiB,
      diskTotal: number(report?.disk?.total ?? node.disk_total) / GiB,
      swapUsed: swapUsedGB,
      swapTotal: swapTotalGB,
      swapUsedGB,
      swapTotalGB,
      netIn: number(report?.network?.down) / MiB,
      netOut: number(report?.network?.up) / MiB,
      // Komari supplies effective counters (session totals or ledger totals).
      // Quota consumption uses the configured direction, not always their sum.
      trafficUsedTB: (trafficLimit > 0 ? quotaBytes(up, down, node.traffic_limit_type) : up + down) / TiB,
      trafficLimitTB: trafficLimit / TiB,
      totalUpGB: up / GiB,
      totalDownGB: down / GiB,
      load: number(report?.load?.load1),
      load5: number(report?.load?.load5),
      load15: number(report?.load?.load15),
      temp: number(report?.temp), // Komari's current WS reports omit system temperature.
      proc: number(report?.process),
      tcp: number(report?.connections?.tcp),
      udp: number(report?.connections?.udp),
    };
  });
}

// Snapshots are unwrapped {online, data} replies. Status is independent of
// node presence: a dropped connection never emits an empty/offline snapshot.
export function watchTelemetry(onSnapshot, onStatus) {
  const url = new URL('/api/clients', location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  let socket;
  let timer;
  let stopped = false;
  let status;
  let retryMs = 1_000;

  function publishStatus(next) {
    if (status === next) return;
    status = next;
    onStatus?.(next);
  }

  function closeSocket() {
    if (!socket) return;
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    socket.close();
    socket = undefined;
  }

  function reconnect(next) {
    clearTimeout(timer);
    closeSocket();
    timer = setTimeout(connect, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    publishStatus(next);
  }

  function request() {
    if (socket?.readyState !== WebSocket.OPEN) {
      reconnect('disconnected');
      return;
    }
    // One outstanding request. A silent or malformed response cannot keep the feed live.
    timer = setTimeout(() => reconnect('stale'), REQUEST_TIMEOUT_MS);
    socket.send('get');
  }

  function connect() {
    if (stopped) return;
    try {
      socket = new WebSocket(url);
    } catch {
      reconnect('disconnected');
      return;
    }
    timer = setTimeout(() => reconnect('disconnected'), REQUEST_TIMEOUT_MS);
    socket.onopen = () => {
      clearTimeout(timer);
      request();
    };
    socket.onerror = socket.onclose = () => reconnect('disconnected');
    socket.onmessage = ({ data }) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      const snapshot = message?.data;
      if (message?.status !== 'success' || !Array.isArray(snapshot?.online) || !isObject(snapshot.data)) return;
      clearTimeout(timer);
      retryMs = 1_000;
      timer = setTimeout(request, POLL_INTERVAL_MS);
      publishStatus('live');
      if (!stopped) onSnapshot(snapshot);
    };
    publishStatus('connecting');
  }

  connect();
  return () => {
    stopped = true;
    clearTimeout(timer);
    closeSocket();
  };
}
