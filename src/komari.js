const THEME = 'Pane';
const POLL_MS = 2200;
const TIMEOUT_MS = 10000;
const MIB = 1024 ** 2;
const GIB = 1024 ** 3;
const TIB = 1024 ** 4;
const DAY_MS = 86400000;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

function apiError(message, status) {
  return Object.assign(new Error(message), { status });
}

export async function readAPI(path, options) {
  let response;
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw apiError(error.message, 0);
  }
  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw apiError(response.ok ? 'Invalid Komari API response' : response.statusText, response.status);
  }
  if (!response.ok || payload?.status === 'error') {
    throw apiError(payload?.message || payload?.error || response.statusText || 'Komari API request failed', response.status);
  }
  return payload?.status === 'success' ? (payload.data ?? null) : payload;
}

export function loadSite() {
  return readAPI('/api/public');
}

export async function loadNodes() {
  const nodes = await readAPI('/api/nodes');
  if (!Array.isArray(nodes)) throw apiError('Invalid Komari node list', 200);
  return nodes;
}

export async function loadRecentReports(uuids) {
  const history = [];
  for (let i = 0; i < uuids.length; i += 8) {
    const results = await Promise.allSettled(uuids.slice(i, i + 8).map(uuid =>
      readAPI(`/api/recent/${encodeURIComponent(uuid)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
    ));
    for (const result of results) if (result.status === 'fulfilled' && Array.isArray(result.value)) history.push(result.value);
  }
  return history;
}

export async function getSession() {
  const session = await readAPI('/api/me');
  return session?.logged_in === true ? session : null;
}

function postJSON(path, data) {
  return readAPI(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function login({ username, password, twoFactorCode }) {
  await postJSON('/api/login', { username, password, '2fa_code': twoFactorCode });
}

export async function logout() {
  // Komari clears its session cookie then redirects to / with an HTML response.
  const response = await fetch('/api/logout', { credentials: 'same-origin' });
  if (!response.ok) throw apiError(response.statusText || 'Komari logout failed', response.status);
}

export async function saveSettings(settings) {
  // The update endpoint replaces the stored object. Public settings describe only the active theme.
  const site = await loadSite();
  if (site.theme !== THEME) throw apiError('Activate Pane before saving its theme settings', 409);
  const merged = { ...site.theme_settings, ...settings };
  // Managed nodes are exposed as an array, but stored as a JSON string.
  if (Array.isArray(merged.featured_nodes)) merged.featured_nodes = JSON.stringify(merged.featured_nodes);
  await postJSON('/api/admin/theme/settings?theme=Pane', merged);
}

export function subscribeTelemetry(onData, onError) {
  const url = new URL('/api/clients', window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  let socket;
  let timer;

  function connect() {
    const ws = new WebSocket(url);
    socket = ws;
    let awaitingReply = false;

    function reconnect(error) {
      if (socket !== ws) return;
      socket = undefined;
      clearTimeout(timer);
      ws.close();
      timer = setTimeout(connect, POLL_MS);
      onError?.(error);
    }

    function poll() {
      if (socket !== ws || ws.readyState !== WebSocket.OPEN) return;
      awaitingReply = true;
      ws.send('get');
      timer = setTimeout(() => reconnect(new Error('Komari telemetry response timed out')), TIMEOUT_MS);
    }

    timer = setTimeout(() => reconnect(new Error('Komari telemetry connection timed out')), TIMEOUT_MS);
    ws.addEventListener('open', () => {
      if (socket !== ws) return;
      clearTimeout(timer);
      poll();
    });
    ws.addEventListener('message', ({ data }) => {
      if (socket !== ws || !awaitingReply) return;
      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        reconnect(new Error('Invalid Komari telemetry response'));
        return;
      }
      if (payload?.type === 'connected') return;
      awaitingReply = false;
      clearTimeout(timer);
      const snapshot = payload?.data;
      if (payload?.status !== 'success' || !Array.isArray(snapshot?.online) || !snapshot.data || typeof snapshot.data !== 'object' || Array.isArray(snapshot.data)) {
        reconnect(new Error(payload?.error || 'Invalid Komari telemetry response'));
        return;
      }
      timer = setTimeout(poll, POLL_MS);
      onData(snapshot);
    });
    ws.addEventListener('error', () => reconnect(new Error('Komari telemetry connection failed')));
    ws.addEventListener('close', () => reconnect(new Error('Komari telemetry disconnected')));
  }

  connect();
  return () => {
    clearTimeout(timer);
    const ws = socket;
    socket = undefined;
    ws?.close();
  };
}

function countryCode(value) {
  const region = String(value ?? '').trim();
  if (/^[a-z]{2}$/i.test(region)) return region.toUpperCase();
  if (!/^[\u{1f1e6}-\u{1f1ff}]{2}$/u.test(region)) return '';
  return String.fromCharCode(region.codePointAt(0) - 0x1f1e6 + 65, region.codePointAt(2) - 0x1f1e6 + 65);
}

function optionalNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function number(value) {
  return optionalNumber(value) ?? 0;
}

function quotaUsed(up, down, type) {
  switch (type) {
    case 'up': return up;
    case 'down': return down;
    case 'sum': return up + down;
    case 'min': return Math.min(up, down);
    default: return Math.max(up, down);
  }
}

// Text fields are HTML-escaped for text and quoted attributes in the design's templates.
// UUIDs are validated before being used as identifiers. Numbers use binary units.
export function normalizeNodes(clients, snapshot, previous = []) {
  const onlineIds = new Set(snapshot?.online);
  const previousNodes = new Map(previous.map((node) => [node.uuid, node]));
  const now = Date.now();
  const nodes = [];

  for (const client of clients) {
    const uuid = client?.uuid;
    if (typeof uuid !== 'string' || !UUID.test(uuid)) continue;
    const prior = previousNodes.get(uuid);
    const report = snapshot?.data?.[uuid];
    const online = onlineIds.has(uuid);
    const live = online ? report : undefined;
    const network = report?.network;
    const region = countryCode(client.region);
    const location = COUNTRY_COORDINATES[region];
    const [lng, lat] = location ?? NO_COORDINATES;
    const totalUp = optionalNumber(network?.totalUp);
    const totalDown = optionalNumber(network?.totalDown);
    const totalUpGB = totalUp === undefined ? prior?.totalUpGB ?? 0 : totalUp / GIB;
    const totalDownGB = totalDown === undefined ? prior?.totalDownGB ?? 0 : totalDown / GIB;
    const trafficLimitTB = number(client.traffic_limit) / TIB;
    // Komari's quota notifier compares the reported totals using the configured direction.
    // Billing days do not reset these counters; the agent may apply its own monthly reset.
    const trafficUsedGB = trafficLimitTB > 0
      ? quotaUsed(totalUpGB, totalDownGB, String(client.traffic_limit_type ?? '').toLowerCase())
      : totalUpGB + totalDownGB;
    // Komari 1.6.2 does not expose daily counters in the report.
    const todayUp = optionalNumber(network?.todayUp);
    const todayDown = optionalNumber(network?.todayDown);
    const billingCycleDays = Number.isFinite(client.billing_cycle) ? client.billing_cycle : 0;
    const expiry = Date.parse(client.expired_at);
    const hasExpiry = Number.isFinite(expiry);
    const cost = client.price;
    const currency = String(client.currency ?? '');
    // Komari reserves -1 for free nodes and 0 for unconfigured pricing.
    const paid = Number.isFinite(cost) && cost > 0;
    const amount = paid ? currency + cost : cost === -1 ? '免费' : '';
    const billingAmount = paid ? currency + cost.toFixed(2) : amount;
    const cycle = billingCycleDays > 0 ? (BILLING_CYCLE_SUFFIX[billingCycleDays] ?? billingCycleDays + 'd') : '';
    const diskUsed = optionalNumber(report?.disk?.used);

    nodes.push({
      uuid,
      name: escapeHTML(client.name),
      region,
      group: escapeHTML(client.group),
      city: '',
      lng,
      lat,
      online,
      weight: Number.isFinite(client.weight) ? client.weight : 0,
      tags: String(client.tags ?? '').split(';').map((tag) => tag.trim()).filter(Boolean).map(escapeHTML),
      public_remark: escapeHTML(client.public_remark),
      os: escapeHTML(client.os),
      kernel: escapeHTML(client.kernel_version),
      virt: escapeHTML(client.virtualization),
      arch: escapeHTML(client.arch || report?.cpu?.arch),
      cpu_name: escapeHTML(client.cpu_name || report?.cpu?.name),
      cores: number(client.cpu_cores ?? report?.cpu?.cores),
      physicalCores: number(client.cpu_physical_cores),
      gpuName: escapeHTML(client.gpu_name),
      price: escapeHTML(paid && cycle ? amount + '/' + cycle : amount),
      billingAmount: escapeHTML(billingAmount),
      billingCycleDays,
      autoRenewal: client.auto_renewal === true,
      expireDays: hasExpiry ? Math.ceil((expiry - now) / DAY_MS) : null,
      expiredDate: hasExpiry ? new Date(expiry).toISOString().slice(0, 10) : null,
      cpu: number(live?.cpu?.usage),
      ramUsed: number(live?.ram?.used) / GIB,
      ramTotal: number(report?.ram?.total ?? client.mem_total) / GIB,
      swapUsedGB: number(live?.swap?.used) / GIB,
      swapTotalGB: number(report?.swap?.total ?? client.swap_total) / GIB,
      diskUsed: diskUsed === undefined ? prior?.diskUsed ?? 0 : diskUsed / GIB,
      diskTotal: number(report?.disk?.total ?? client.disk_total) / GIB,
      netIn: number(live?.network?.down) / MIB,
      netOut: number(live?.network?.up) / MIB,
      totalUpGB,
      totalDownGB,
      todayUpGB: todayUp === undefined ? undefined : todayUp / GIB,
      todayDownGB: todayDown === undefined ? undefined : todayDown / GIB,
      trafficUsedTB: trafficUsedGB / 1024,
      trafficLimitTB,
      uptimeSec: number(live?.uptime),
      load: number(live?.load?.load1),
      load5: number(live?.load?.load5),
      load15: number(live?.load?.load15),
      temp: number(live?.cpu?.temperature ?? live?.temp),
      proc: number(live?.process),
      tcp: number(live?.connections?.tcp),
      udp: number(live?.connections?.udp),
    });
  }
  return nodes;
}

const NO_COORDINATES = [null, null];
const BILLING_CYCLE_SUFFIX = { 30: '月', 90: '季', 365: '年' };
// Country label points [longitude, latitude] from Natural Earth v5.1.2 (public domain).
// https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson — 10m admin-0 countries/map units.
const COUNTRY_COORDINATES = {
  AD: [1.539, 42.548], AE: [54.547, 23.466], AF: [66.497, 34.164], AG: [-61.791, 17.352], AI: [-63.026, 18.243],
  AL: [20.114, 40.655], AM: [44.801, 40.459], AO: [17.984, -12.183], AQ: [35.885, -79.843], AR: [-64.173, -33.501],
  AS: [-170.747, -14.327], AT: [14.131, 47.519], AU: [134.05, -24.13], AW: [-69.973, 12.517], AX: [19.87, 60.156],
  AZ: [47.211, 40.402], BA: [18.068, 44.091], BB: [-59.569, 13.164], BD: [89.685, 24.215], BE: [4.8, 50.785],
  BF: [-1.364, 12.673], BG: [25.157, 42.509], BH: [50.555, 26.056], BI: [29.917, -3.333], BJ: [2.352, 10.325],
  BL: [-62.833, 17.902], BM: [-64.764, 32.297], BN: [114.552, 4.448], BO: [-64.593, -16.666], BQ: [-63.133, 17.544],
  BR: [-49.559, -12.099], BS: [-77.147, 26.402], BT: [90.04, 27.537], BV: [3.414, -54.415], BW: [24.179, -22.103],
  BY: [28.418, 53.822], BZ: [-88.713, 17.202], CA: [-101.911, 60.324], CC: [96.83, -12.16], CD: [23.459, -1.858],
  CF: [20.907, 6.99], CG: [15.9, 0.142], CH: [7.464, 46.719], CI: [-5.569, 7.491], CK: [-159.786, -21.216],
  CL: [-72.319, -38.152], CM: [12.473, 4.585], CN: [106.337, 32.498], CO: [-73.174, 3.373], CR: [-84.078, 10.065],
  CU: [-77.976, 21.334], CV: [-23.639, 15.075], CW: [-68.921, 12.145], CX: [105.673, -10.491], CY: [33.084, 34.913],
  CZ: [15.378, 49.882], DE: [9.678, 50.962], DJ: [42.499, 11.976], DK: [9.018, 55.967], DM: [-61.345, 15.459],
  DO: [-70.654, 19.104], DZ: [2.808, 27.397], EC: [-78.188, -1.259], EE: [25.867, 58.725], EG: [29.446, 26.186],
  EH: [-12.63, 23.968], ER: [38.286, 15.787], ES: [-3.465, 40.091], ET: [39.089, 8.033], FI: [27.276, 63.252],
  FJ: [177.975, -17.826], FK: [-58.739, -51.609], FM: [158.234, 6.888], FO: [-7.058, 62.186], FR: [2.552, 46.696],
  GA: [11.836, -0.438], GB: [-2.116, 54.403], GD: [-61.68, 12.113], GE: [43.736, 41.87], GF: [-53.068, 3.999],
  GG: [-2.562, 49.464], GH: [-1.037, 7.718], GI: [-5.347, 36.129], GL: [-39.335, 74.319], GM: [-14.998, 13.642],
  GN: [-10.016, 10.619], GP: [-61.434, 16.299], GQ: [8.99, 2.333], GR: [21.726, 39.493], GS: [-31.063, -55.683],
  GT: [-90.497, 14.982], GU: [144.704, 13.354], GW: [-14.524, 12.164], GY: [-58.943, 5.124], HK: [114.098, 22.449],
  HM: [73.505, -53.103], HN: [-86.888, 14.795], HR: [16.372, 45.806], HT: [-72.224, 19.264], HU: [19.448, 47.087],
  ID: [101.893, -0.954], IE: [-7.799, 53.079], IL: [34.848, 30.911], IM: [-4.53, 54.221], IN: [79.358, 22.687],
  IO: [71.348, -6.191], IQ: [43.262, 33.094], IR: [54.931, 32.166], IS: [-18.674, 64.779], IT: [11.077, 44.732],
  JE: [-2.09, 49.221], JM: [-77.319, 18.137], JO: [36.376, 30.805], JP: [138.442, 36.143], KE: [37.908, 0.549],
  KG: [74.533, 41.669], KH: [104.505, 12.648], KI: [-157.385, 1.82], KM: [43.318, -11.728], KN: [-62.758, 17.337],
  KP: [126.445, 39.885], KR: [128.13, 36.385], KW: [47.314, 29.414], KY: [-81.241, 19.32], KZ: [68.686, 49.054],
  LA: [102.534, 19.432], LB: [35.993, 34.133], LC: [-60.98, 13.892], LI: [9.559, 47.111], LK: [80.705, 7.581],
  LR: [-9.46, 6.447], LS: [28.247, -29.48], LT: [24.09, 55.104], LU: [6.078, 49.734], LV: [25.459, 57.067],
  LY: [18.011, 26.639], MA: [-7.187, 31.651], MC: [7.398, 43.74], MD: [28.488, 47.435], ME: [19.144, 42.803],
  MF: [-63.049, 18.081], MG: [46.704, -18.628], MH: [171.194, 7.083], MK: [21.556, 41.558], ML: [-2.038, 18.693],
  MM: [95.804, 21.574], MN: [104.15, 45.997], MO: [113.556, 22.13], MP: [145.734, 15.188], MQ: [-61.056, 14.712],
  MR: [-9.74, 19.587], MS: [-62.188, 16.737], MT: [14.433, 35.893], MU: [57.566, -20.3], MV: [73.508, 4.174],
  MW: [33.608, -13.387], MX: [-102.289, 23.92], MY: [113.837, 2.529], MZ: [37.838, -13.943], NA: [17.108, -20.575],
  NC: [165.084, -21.065], NE: [9.504, 17.446], NF: [167.955, -29.033], NG: [7.503, 9.44], NI: [-85.069, 12.671],
  NL: [5.611, 52.422], NO: [9.68, 61.357], NP: [83.64, 28.298], NR: [166.933, -0.52], NU: [-169.863, -19.046],
  NZ: [172.787, -39.759], OM: [57.337, 22.12], PA: [-80.352, 8.722], PE: [-72.9, -12.977], PF: [-149.462, -17.628],
  PG: [143.91, -5.695], PH: [122.465, 11.198], PK: [68.546, 29.328], PL: [19.49, 51.99], PM: [-56.332, 47.04],
  PN: [-128.318, -24.365], PR: [-66.481, 18.235], PS: [35.291, 32.047], PT: [-8.272, 39.607], PW: [134.58, 7.518],
  PY: [-60.146, -21.675], QA: [51.144, 25.237], RE: [55.536, -21.113], RO: [24.973, 45.733], RS: [20.788, 44.19],
  RU: [44.686, 58.249], RW: [30.104, -1.897], SA: [44.7, 23.807], SB: [159.17, -8.03], SC: [55.48, -4.677],
  SD: [29.261, 16.331], SE: [19.017, 65.859], SG: [103.817, 1.367], SH: [-5.713, -15.95], SI: [14.915, 46.061],
  SJ: [18.081, 78.778], SK: [19.05, 48.734], SL: [-11.764, 8.617], SM: [12.441, 43.934], SN: [-14.779, 15.138],
  SO: [45.192, 3.569], SR: [-55.911, 4.144], SS: [30.39, 7.23], ST: [7.021, 0.971], SV: [-88.89, 13.685],
  SX: [-63.07, 18.041], SY: [38.278, 35.007], SZ: [31.467, -26.534], TC: [-71.753, 21.817], TD: [18.645, 15.143],
  TF: [69.122, -49.304], TG: [1.058, 8.807], TH: [101.073, 15.46], TJ: [72.587, 38.2], TK: [-172.486, -8.562],
  TL: [125.855, -8.804], TM: [58.677, 39.855], TN: [9.008, 33.687], TO: [-175.163, -21.21], TR: [34.508, 39.345],
  TT: [-60.918, 10.999], TV: [179.21, -8.514], TW: [120.868, 23.652], TZ: [34.959, -6.052], UA: [32.141, 49.725],
  UG: [32.949, 1.973], UM: [166.645, 19.286], US: [-97.483, 39.538], UY: [-55.967, -32.961], UZ: [64.005, 41.694],
  VA: [12.453, 41.903], VC: [-61.336, 13.088], VE: [-64.599, 7.182], VG: [-64.637, 18.427], VI: [-64.779, 17.747],
  VN: [105.387, 21.715], VU: [166.909, -15.372], WF: [-178.137, -14.286], WS: [-172.438, -13.639], XD: [35.865, 33.145],
  XK: [20.861, 42.594], YE: [45.874, 15.328], YT: [45.151, -12.775], ZA: [23.666, -29.709], ZM: [26.395, -14.661],
  ZW: [29.925, -18.912],
};
