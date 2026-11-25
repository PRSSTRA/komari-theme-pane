const mediaDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function resolveAppearance(mode) {
  if (mode === "system") {
    return mediaDark && !mediaDark.matches ? "light" : "dark";
  }
  return mode;
}

const state = {
  appearance: "dark", // "dark" | "light" | "system"
  theme: "dark",      // resolved: "dark" | "light"
  lang: "zh-CN",
  view: "card",
  group: "ALL",
  search: "",
  onlyOnline: false,
  sortBy: "weight",
  sortMenuOpen: false,
  viewOptionsOpen: false,
  drawerOpen: false,
  selectedNodeId: null,
  hoveredClusterKey: null,
  pinnedClusterKey: null,
  mapOverlapMode: "cluster",
  eventFilter: "all", // "all" | "alert"
  detailTab: "load",
  detailHours: 6,
  detailPingFocus: -1,
  loggedIn: false,
  adminMenuOpen: false,
  pinnedSearch: "",
  site: {},
  dataStatus: 'loading',
  nodes: [],
  settings: { hero_title: 'Komari Pane', featured_nodes: [], site_notice: '' },
};

const defaultPreferences = {
  card_density: 'comfortable', mapOverlapMode: 'cluster',
  show_summary_bar: true, show_event_feed: true, show_world_map: true,
  show_map_clock: true, show_solar_terminator: true, show_offline_first: true,
  show_total_traffic: true, show_tags: true, show_pricing: false,
  show_traffic_bar: false, show_load_temp: false, reduce_transparency: false,
};

try {
  const saved = JSON.parse(localStorage.getItem('pane.preferences'));
  for (const [key, value] of Object.entries(defaultPreferences)) {
    state.settings[key] = typeof saved?.[key] === 'boolean' && typeof value === 'boolean' ? saved[key] : value;
  }
  if (saved?.card_density === 'compact') state.settings.card_density = 'compact';
  if (saved?.mapOverlapMode === 'spread') state.mapOverlapMode = 'spread';
  const appearance = localStorage.getItem('appearance');
  if (['dark', 'light', 'system'].includes(appearance)) state.appearance = appearance;
  if (localStorage.getItem('language')?.startsWith('en')) state.lang = 'en';
} catch { Object.assign(state.settings, defaultPreferences); }

export function rememberPreferences() {
  try {
    localStorage.setItem('appearance', state.appearance);
    localStorage.setItem('language', state.lang);
    localStorage.setItem('pane.preferences', JSON.stringify(Object.fromEntries(
      Object.keys(defaultPreferences).map(key => [key, key === 'mapOverlapMode' ? state.mapOverlapMode : state.settings[key]]),
    )));
  } catch { /* Preferences still apply to the current page. */ }
}

export function dataMessage() {
  const en = state.lang === 'en';
  if (state.dataStatus === 'loading') return en ? 'Loading node status…' : '正在加载节点状态…';
  if (state.dataStatus === 'private') return en ? 'Sign in to view nodes' : '登录后查看节点';
  return en ? 'Connection interrupted · Reconnecting…' : '连接中断 · 正在重连…';
}

const I18N = {
  "zh-CN": {
    cardView: "卡片",
    tableView: "列表",
    managedTitle: "主题配置",
    onlyOnline: "仅看在线",
    all: "全部",
    mapTitle: "全球节点分布",
    networkTitle: "网络与流量",
    eventsTitle: "实时事件",
    eventsAll: "全部",
    eventsAlerts: "异常",
    eventsHealthy: "全部节点运行平稳 · 实时监听中",
    eventsEmptyAlerts: "当前无异常告警",
    todayTraffic: "今日",
    totalTraffic: "累计",
    online: "在线",
    highLoad: "高载",
    offline: "离线",
    pinned: "置顶",
    quota: "月流量",
    loadTab: "负载历史",
    pingTab: "Ping 延迟",
    empty: "没有符合当前筛选条件的节点",
    sortWeight: "默认",
    sortCpu: "CPU 占用",
    sortRam: "内存占用",
    sortNet: "实时网速",
    sortTraffic: "累计流量",
  },
  "en": {
    cardView: "Cards",
    tableView: "Table",
    managedTitle: "Theme Settings",
    onlyOnline: "Online only",
    all: "All",
    mapTitle: "Global Topology",
    networkTitle: "Network & Traffic",
    eventsTitle: "Live Events",
    eventsAll: "All",
    eventsAlerts: "Alerts",
    eventsHealthy: "All nodes healthy · Listening",
    eventsEmptyAlerts: "No active alerts",
    todayTraffic: "Today",
    totalTraffic: "Total",
    online: "Online",
    highLoad: "High Load",
    offline: "Offline",
    pinned: "Pinned",
    quota: "Quota",
    loadTab: "Load History",
    pingTab: "Ping Latency",
    empty: "No nodes match current filters",
    sortWeight: "Default",
    sortCpu: "CPU Usage",
    sortRam: "RAM Usage",
    sortNet: "Network Speed",
    sortTraffic: "Total Traffic",
  }
};

const SORT_OPTIONS = [
  {
    value: "weight",
    key: "sortWeight",
    icon: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>`,
  },
  {
    value: "cpu",
    key: "sortCpu",
    icon: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/></svg>`,
  },
  {
    value: "ram",
    key: "sortRam",
    icon: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="10" rx="2"/><path d="M7 16v3m5-3v3m5-3v3M7 10v2m4-2v2m4-2v2"/></svg>`,
  },
  {
    value: "net",
    key: "sortNet",
    icon: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  },
  {
    value: "traffic",
    key: "sortTraffic",
    icon: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>`,
  },
];

// Crisp Rounded-Rectangle Vector Flag Registry (viewBox 24x18, curvature matches Solid Glass 25% roundness)
const FLAG_SVGS = {
  JP: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#f7f8fa"/><circle cx="12" cy="9" r="4.6" fill="#c82333"/></svg>`,
  HK: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#de2930"/><g transform="translate(12,9)" fill="#f7f8fa"><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(0)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(72)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(144)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(216)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(288)"/></g></svg>`,
  SG: `<svg viewBox="0 0 24 18"><rect width="24" height="9" fill="#e03038"/><rect y="9" width="24" height="9" fill="#f7f8fa"/><circle cx="6.2" cy="4.5" r="2.8" fill="#f7f8fa"/><circle cx="7.4" cy="4.5" r="2.35" fill="#e03038"/><g fill="#f7f8fa"><circle cx="8.4" cy="3.1" r="0.6"/><circle cx="9.8" cy="4.1" r="0.6"/><circle cx="9.3" cy="5.7" r="0.6"/><circle cx="7.6" cy="5.7" r="0.6"/><circle cx="7.1" cy="4.1" r="0.6"/></g></svg>`,
  KR: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#f7f8fa"/><circle cx="12" cy="9" r="4.1" fill="#cd2e3a"/><path d="M7.9,9 A4.1,4.1 0 0,0 16.1,9 A2.05,2.05 0 0,0 12,9 A2.05,2.05 0 0,1 7.9,9 Z" fill="#0047a0"/><g stroke="#1b1f27" stroke-width="0.95" stroke-linecap="square"><path d="M4.2,5.8 L6.6,3.4 M5.1,6.7 L7.5,4.3 M6,7.6 L8.4,5.2"/><path d="M17.4,3.4 L19.8,5.8 M16.5,4.3 L18.9,6.7 M15.6,5.2 L18,7.6"/><path d="M4.2,12.2 L6.6,14.6 M5.1,11.3 L7.5,13.7 M6,10.4 L8.4,12.8"/><path d="M17.4,14.6 L19.8,12.2 M16.5,13.7 L18.9,11.3 M15.6,12.8 L18,10.4"/></g></svg>`,
  AU: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#0b2a6b"/><g><rect width="12" height="9" fill="#0a286e"/><path d="M0,0 L12,9 M12,0 L0,9" stroke="#f7f8fa" stroke-width="1.6"/><path d="M0,0 L12,9 M12,0 L0,9" stroke="#c82333" stroke-width="0.7"/><path d="M6,0 V9 M0,4.5 H12" stroke="#f7f8fa" stroke-width="2.5"/><path d="M6,0 V9 M0,4.5 H12" stroke="#c82333" stroke-width="1.3"/></g><g fill="#f7f8fa"><circle cx="6" cy="13.5" r="1.45"/><circle cx="18" cy="4.2" r="0.9"/><circle cx="15.5" cy="7.6" r="0.85"/><circle cx="20.2" cy="7.2" r="0.85"/><circle cx="18" cy="13.5" r="1.05"/><circle cx="19.3" cy="9.9" r="0.55"/></g></svg>`,
  DE: `<svg viewBox="0 0 24 18"><rect width="24" height="6" fill="#17191e"/><rect y="6" width="24" height="6" fill="#d62828"/><rect y="12" width="24" height="6" fill="#f2b705"/></svg>`,
  NL: `<svg viewBox="0 0 24 18"><rect width="24" height="6" fill="#c82834"/><rect y="6" width="24" height="6" fill="#f7f8fa"/><rect y="12" width="24" height="6" fill="#21468b"/></svg>`,
  GB: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#0a286e"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#f7f8fa" stroke-width="3.2"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#c82333" stroke-width="1.4"/><path d="M12,0 V18 M0,9 H24" stroke="#f7f8fa" stroke-width="5"/><path d="M12,0 V18 M0,9 H24" stroke="#c82333" stroke-width="2.8"/></svg>`,
  US: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#f7f8fa"/><g fill="#c82b37"><rect y="0" width="24" height="1.5"/><rect y="2.8" width="24" height="1.5"/><rect y="5.6" width="24" height="1.5"/><rect y="8.4" width="24" height="1.5"/><rect y="11.2" width="24" height="1.5"/><rect y="14" width="24" height="1.5"/><rect y="16.6" width="24" height="1.4"/></g><rect width="10.8" height="9.9" fill="#1e3a6e"/><g fill="#f7f8fa"><circle cx="2.2" cy="2.1" r="0.55"/><circle cx="4.6" cy="2.1" r="0.55"/><circle cx="7" cy="2.1" r="0.55"/><circle cx="9.2" cy="2.1" r="0.55"/><circle cx="3.4" cy="3.9" r="0.55"/><circle cx="5.8" cy="3.9" r="0.55"/><circle cx="8.1" cy="3.9" r="0.55"/><circle cx="2.2" cy="5.7" r="0.55"/><circle cx="4.6" cy="5.7" r="0.55"/><circle cx="7" cy="5.7" r="0.55"/><circle cx="9.2" cy="5.7" r="0.55"/><circle cx="3.4" cy="7.5" r="0.55"/><circle cx="5.8" cy="7.5" r="0.55"/><circle cx="8.1" cy="7.5" r="0.55"/></g></svg>`,
  CN: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#de2910"/><g fill="#ffde00"><polygon points="4.8,2.6 5.5,4.7 7.7,4.7 5.9,6 6.6,8.1 4.8,6.8 3,8.1 3.7,6 1.9,4.7 4.1,4.7"/><circle cx="9.2" cy="2.7" r="0.7"/><circle cx="10.4" cy="4.4" r="0.7"/><circle cx="10.4" cy="6.6" r="0.7"/><circle cx="9.2" cy="8.3" r="0.7"/></g></svg>`,
  TW: `<svg viewBox="0 0 24 18"><rect width="24" height="18" fill="#fe2b1e"/><rect width="12" height="9" fill="#002299"/><circle cx="6" cy="4.5" r="2.2" fill="#f7f8fa"/></svg>`,
  FR: `<svg viewBox="0 0 24 18"><rect width="8" height="18" fill="#1d3c8e"/><rect x="8" width="8" height="18" fill="#f7f8fa"/><rect x="16" width="8" height="18" fill="#d92b36"/></svg>`,
  CA: `<svg viewBox="0 0 24 18"><rect width="6" height="18" fill="#d8262e"/><rect x="6" width="12" height="18" fill="#f7f8fa"/><rect x="18" width="6" height="18" fill="#d8262e"/><path d="M12,4.2 L13.1,7 L15.4,6.4 L14.4,8.7 L16,9.7 L13.5,10.5 L13.8,12 L12.4,11.6 L12.4,14 L11.6,14 L11.6,11.6 L10.2,12 L10.5,10.5 L8,9.7 L9.6,8.7 L8.6,6.4 L10.9,7 Z" fill="#d8262e"/></svg>`,
};

function renderFlagBadge(region, size = "md") {
  const code = String(region || "").trim().toUpperCase();
  const svg = (Object.hasOwn(FLAG_SVGS, code) ? FLAG_SVGS[code] : undefined);
  if (svg) {
    return `<span class="sg-flag sg-flag-${size}" aria-label="${code}" title="${code}">${svg}</span>`;
  }
  if (/^[A-Z]{2}$/.test(code)) {
    const flag = String.fromCodePoint(...Array.from(code, c => c.charCodeAt(0) + 127397));
    return `<span class="sg-flag sg-flag-${size} inline-flex items-center justify-center" aria-label="${code}" title="${code}">${flag}</span>`;
  }
  const fallbackLabel = state.lang === "zh-CN" ? "未设置地区" : "Region unset";
  return `<span class="sg-flag sg-flag-${size}" style="background: var(--sg-muted); color: var(--sg-muted-fg);" aria-label="${fallbackLabel}" title="${fallbackLabel}"><svg viewBox="0 0 24 18" class="h-full w-full"><g transform="translate(3,0) scale(0.75)" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5"/><path d="M4.5 12h15"/><path d="M12 4.5a11.5 11.5 0 0 1 3 7.5 11.5 11.5 0 0 1-3 7.5 11.5 11.5 0 0 1-3-7.5 11.5 11.5 0 0 1 3-7.5z"/></g></svg></span>`;
}

const CITY_EN_MAP = {
  "东京": "Tokyo",
  "香港": "Hong Kong",
  "新加坡": "Singapore",
  "首尔": "Seoul",
  "悉尼": "Sydney",
  "法兰克福": "Frankfurt",
  "阿姆斯特丹": "Amsterdam",
  "伦敦": "London",
  "洛杉矶": "Los Angeles",
  "圣何塞": "San Jose",
  "纽约": "New York",
};

function formatCityName(city) {
  if (state.lang === "en") return Object.hasOwn(CITY_EN_MAP, city) ? CITY_EN_MAP[city] : city;
  return city;
}

function formatPriceLabel(price) {
  const s = String(price || "");
  if (state.lang !== "en") return s;
  if (s === "免费") return "Free";
  return s.replace("/月", "/mo").replace("/年", "/yr").replace("/季", "/qtr");
}

function t(key) { return I18N[state.lang][key] || key; }

function formatUptime(sec) {
  if (!sec) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function formatRateParts(mbps) {
  if (!Number.isFinite(mbps) || mbps <= 0) return { value: "0", unit: "B/s", text: "0 B/s" };
  const bps = mbps * 1024 * 1024;
  if (bps < 1024) {
    const v = String(Math.round(bps));
    return { value: v, unit: "B/s", text: `${v} B/s` };
  }
  if (bps < 1024 * 1024) {
    const kb = bps / 1024;
    const v = kb >= 100 ? kb.toFixed(0) : kb.toFixed(1);
    return { value: v, unit: "KB/s", text: `${v} KB/s` };
  }
  if (bps < 1024 * 1024 * 1024) {
    const mb = bps / (1024 * 1024);
    const v = mb >= 100 ? mb.toFixed(0) : mb.toFixed(1);
    return { value: v, unit: "MB/s", text: `${v} MB/s` };
  }
  const gb = bps / (1024 * 1024 * 1024);
  const v = gb >= 100 ? gb.toFixed(0) : gb.toFixed(2);
  return { value: v, unit: "GB/s", text: `${v} GB/s` };
}

function formatRate(mbps) {
  return formatRateParts(mbps).text;
}

function formatTrafficPartsGB(gb) {
  if (!Number.isFinite(gb) || gb <= 0) return { value: "0", unit: "B", text: "0 B" };
  if (gb < 1 / (1024 * 1024)) {
    const v = String(Math.round(gb * 1024 * 1024 * 1024));
    return { value: v, unit: "B", text: `${v} B` };
  }
  if (gb < 1 / 1024) {
    const kb = gb * 1024 * 1024;
    const v = kb >= 100 ? kb.toFixed(0) : kb.toFixed(1);
    return { value: v, unit: "KB", text: `${v} KB` };
  }
  if (gb < 1) {
    const mb = gb * 1024;
    const v = mb >= 100 ? mb.toFixed(0) : mb.toFixed(1);
    return { value: v, unit: "MB", text: `${v} MB` };
  }
  if (gb < 1024) {
    const v = gb >= 100 ? gb.toFixed(0) : gb.toFixed(1);
    return { value: v, unit: "GB", text: `${v} GB` };
  }
  const tb = gb / 1024;
  if (tb < 1024) {
    const v = tb >= 100 ? tb.toFixed(0) : tb.toFixed(2);
    return { value: v, unit: "TB", text: `${v} TB` };
  }
  const pb = tb / 1024;
  const v = pb >= 100 ? pb.toFixed(0) : pb.toFixed(2);
  return { value: v, unit: "PB", text: `${v} PB` };
}

function formatTrafficGB(gb) {
  return formatTrafficPartsGB(gb).text;
}

function toneColor(pct) {
  if (pct >= 88) return "var(--sg-danger)";
  if (pct >= 70) return "var(--sg-warn)";
  return "var(--sg-ink-fill)";
}

function nodeStatusColor(n) {
  if (!n.online) return "var(--sg-danger)";
  if (n.cpu >= 88) return "var(--sg-warn)";
  return "var(--sg-success)";
}

const CONTINENT_ORDER = ["亚洲", "欧洲", "北美洲", "南美洲", "澳洲", "非洲"];
const CONTINENT_EN = {
  "亚洲": "Asia",
  "欧洲": "Europe",
  "北美洲": "North America",
  "南美洲": "South America",
  "澳洲": "Oceania",
  "非洲": "Africa",
};
const CONTINENT_ALIAS = {
  "亚太": "亚洲",
  "北美": "北美洲",
  "南美": "南美洲",
  "大洋洲": "澳洲",
  "大洋": "澳洲",
  "Asia": "亚洲",
  "Europe": "欧洲",
  "North America": "北美洲",
  "South America": "南美洲",
  "Oceania": "澳洲",
  "Australia": "澳洲",
  "Africa": "非洲",
};

const UNGROUPED_KEY = "__UNGROUPED__";

function normalizeGroupName(raw) {
  const key = String(raw || "").trim();
  if (!key) return UNGROUPED_KEY;
  return Object.hasOwn(CONTINENT_ALIAS, key) ? CONTINENT_ALIAS[key] : key;
}

function formatGroupLabel(group) {
  if (group === "ALL") return t("all");
  if (group === UNGROUPED_KEY) return state.lang === "en" ? "Ungrouped" : "未分组";
  if (state.lang === "en") return Object.hasOwn(CONTINENT_EN, group) ? CONTINENT_EN[group] : group;
  return group;
}

const PIN_BADGE_ICON_SVG = `<svg class="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`;
const PIN_BTN_ICON_SVG = `<svg class="sg-pin-icon h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`;

function isNodeFeatured(node) {
  return Array.isArray(state.settings.featured_nodes) && state.settings.featured_nodes.includes(node.uuid);
}

function renderPinnedBadge(nodeUuid, interactive = false) {
  if (interactive && state.loggedIn && nodeUuid) {
    const tip = state.lang === "zh-CN" ? "点击取消置顶" : "Click to unpin";
    return `<button type="button" data-slot="badge" data-variant="brand" data-unpin-node="${nodeUuid}" title="${tip}" aria-label="${tip}" class="sg-pin-badge-btn gap-1 px-1.5 py-0.5 text-[10px]">${PIN_BADGE_ICON_SVG}<span>${t("pinned")}</span></button>`;
  }
  return `<span data-slot="badge" data-variant="brand" class="gap-1 px-1.5 py-0.5 text-[10px]">${PIN_BADGE_ICON_SVG}<span>${t("pinned")}</span></span>`;
}

function getFilteredNodes() {
  const q = state.search.trim().toLowerCase();
  return state.nodes
    .filter((n) => {
      const groupKey = normalizeGroupName(n.group);
      if (state.group !== "ALL" && groupKey !== state.group) return false;
      if (state.onlyOnline && !n.online) return false;
      if (q) {
        const hay = `${n.name} ${n.region} ${groupKey} ${formatGroupLabel(groupKey)} ${n.cpu_name} ${n.os} ${n.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (state.sortBy === "weight") {
        const aPin = isNodeFeatured(a);
        const bPin = isNodeFeatured(b);
        if (aPin !== bPin) return aPin ? -1 : 1;
        if (state.settings.show_offline_first && a.online !== b.online) return a.online ? 1 : -1;
        return a.weight - b.weight;
      }
      if (state.settings.show_offline_first && a.online !== b.online) return a.online ? 1 : -1;
      if (state.sortBy === "cpu") return b.cpu - a.cpu;
      if (state.sortBy === "ram") return percent(b.ramUsed, b.ramTotal) - percent(a.ramUsed, a.ramTotal);
      if (state.sortBy === "net") return (b.netIn + b.netOut) - (a.netIn + a.netOut);
      if (state.sortBy === "traffic") return (b.totalUpGB + b.totalDownGB) - (a.totalUpGB + a.totalDownGB);
      return 0;
    });
}


export function percent(used, total) { return total > 0 ? used / total * 100 : 0; }

export { state, mediaDark, resolveAppearance, t, formatUptime, formatRate, formatRateParts,
  formatTrafficGB, formatTrafficPartsGB, formatPriceLabel, formatCityName, formatGroupLabel,
  renderFlagBadge, toneColor, nodeStatusColor, isNodeFeatured, renderPinnedBadge,
  normalizeGroupName, PIN_BTN_ICON_SVG, UNGROUPED_KEY, CONTINENT_ORDER, SORT_OPTIONS, getFilteredNodes };
