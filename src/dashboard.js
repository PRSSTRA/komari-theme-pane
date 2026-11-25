import escapeHtml from 'escape-html';
import morphdom from 'morphdom';
import { bindTooltips, positionMenu } from './floating.js';
import { loadDashboard, normalizeNodes, watchTelemetry, login, logout, saveThemeSettings } from './komari.js';
import { loadNodeHistory } from './history.js';

const preferencesKey = 'komari-pane-preferences';
const preferences = readPreferences();

function readPreferences() {
  try { return JSON.parse(localStorage.getItem(preferencesKey)) ?? {}; } catch { return {}; }
}

const defaultSettings = {
  hero_title: 'Komari Pane',
  featured_nodes: [],
  card_density: "comfortable",
  show_summary_bar: true,
  show_event_feed: true,
  show_world_map: true,
  show_map_clock: true,
  show_solar_terminator: true,
  show_offline_first: true,
  show_total_traffic: true,
  show_tags: true,
  show_pricing: false,
  show_traffic_bar: false,
  show_load_temp: false,
  reduce_transparency: false,
  site_notice: "",
};

// ---- 208x96 High-Res World Map Silhouette sampled directly from user's 1024x473 PNG ----
const MATRIX_COLS = 208;
const MATRIX_ROWS = 96;
const WORLD_MASK_RLE =
  "0:265;1334650:9;364566410:177;15812768fffb53acccaaccef:7;ea810:174;2853affd5578bf:17;90:176;31266ea4108ecef:17;40:49;5c836410:105;1310:11;19a9b810:8;bf:15;60:46;acfdf:6;80:103;18eff8244215b79a296950:10;3f:12;d720:40;21002abef:8;b9b898579820:5;210:71;3530:13;875efffee1037801edeffdd20:7;19f:11;8b10:19;12110:16;4fd48ef:21;e72657ffed7331020:59;4adf:5;ca8410489b796128dfbec545ae1055433eff80:7;5f:10;d710:18;49effea320:11;5229f9bf:38;a6795399630:47;9f:23;8778a76648efb6e90004efc20:5;7ef:6;e84410:19;af:9;e822518ebcf:4;bef2f:49;b6610:39;387bf:25;df:7;eda9700059bbdb0:4;4f:6;b920:5;13350:13;9fffedfffb38859fef:10;eaf:51;ebbb20:36;58df:32;eec4da0194effa010:4;3f:4;b10:7;2dfea10:11;8fffe39f:4;a27df:66;911570:34;27aef:32;e70011202104e840:6;4fffc10:9;140:11;17cfffb25f:76;e70:36;bf:6;ef:27;80:7;7fe80:11;9fe30:23;af:5;508f:67;96e2f:4;d10:36;3dffe7751268ef:21;e30:7;2efff1050:9;420:24;9f:5;e21594ef:61;df6002fc5330:37;18ba20:7;2bf:20;d10:7;bfffe7ce0:30;20:4;3969ff7015ef:59;a0:4;20004f910:37;1584230:8;35f:21;a610:4;1cf:7;10:28;3c10:4;181ed005cf:60;50:8;9ffd10:36;210:12;25f:23;e8204bf:8;60:26;164b70:4;4c041108f:60;e10:8;1bff80:51;8f:24;e14f:10;bb10:24;df16f10047fcdaeef:62;d9b210:5;1af70:51;8f:24;d1bf:11;80:24;1e82ffb15f:73;e730:6;990:50;27df:24;ef:6;c9ba8520:27;2775bf:75;a650:6;10:50;1a7f:18;edf:9;b880005ea10:26;128cf:77;4a20:56;1acf:16;b401ef:7;edf700169820:26;29f:22;df:56;4460:56;7f:18;dea688ef:7;ea410:33;cf:17;65e66f:5;c21cf:47;50610:54;2ef:19;a6d16dcf:4;b58840:34;cf:4;ecf3af:7;901845efffe10def:46;e200810:52;1df:19;e2eeaedbfff30010:31;2cc9affc6522ed16df:5;30:5;1afff708f:46;97000de80:51;8f:20;dafd9efffc50:35;3f:5;e500142bd31ef:4;41598201effe4029f:43;b0:5;4210:50;4f:29;60:37;4f:5;321058005c5bfa388f:5;df:5;b01bf:38;98fffa0:5;2d20:50;6f:27;e40:38;8f:4;a140023000804b507f:12;c008f:37;91245f50:6;a80:50;4f:27;30:39;5dffd20:4;1404b1007801ef:11;d404f:37;e87517ea0:4;1ba0:50;1f:27;10:41;6004bedcef3010:4;13024284bf:8;bdf:39;c2007f7013cff0:51;af:24;c40:41;4fbbf:7;30:6;15300051bf:49;b1001812a9d620:52;8f:21;e70:42;7ef:10;b52000520:7;ef:50;70:5;74720:54;6dcf:18;e20:42;2f:15;201fe9510203f:51;e60:5;70:56;486f:10;eaee56aea0:43;7f:16;daf:17;bdf:42;d20:62;a3f:8;e920010006b0:41;16ef:25;cacf:7;42f:43;40:62;c58f:7;50:8;6e020:39;bf:28;57f:7;d03bedf:39;0:63;182f:6;e10:8;19020:38;7f:29;d1bf:7;64017bf:4;df:32;b0:63;1805f:5;a0:11;1010:36;1ef:30;71ef:7;e5bc20:5;bf:30;e3750:62;110bf:4;40:7;277820110:35;af:31;e14f:11;e50:5;7ef:11;eef:13;eb50830:65;7f:4;70:4;7801004c820:35;1f:33;80ef:11;80:5;2e8ef:7;e413f:9;a7d210:70;af:4;b0004fa0:5;2962410:33;df:32;a08f:10;b0:9;ef:7;80005ef:6;d0040:72;2df:4;735ef50:5;2148fb2210:30;bf:32;e40bf:9;40:9;cf:6;80:5;6f:6;d1480:6;210:66;5df:6;d0:6;10:6;10:26;10:4;bf:33;d02df:6;c50:10;8f:5;80:7;eef:5;b10:7;960:68;484affb7830:37;22002ef:34;508f:5;50:12;1efff70:8;71f:6;a0:7;e60:72;8f:4;70:41;4f:36;76ffe820:14;8fff20:10;bf:6;30:6;5920:72;13ef60:41;2ef:36;7a710:16;3fff20:10;4a8f:4;80:6;1750:74;6f40:4;17e5a100010:28;8f:36;d001580:15;aff0:11;1907fff60:6;144820:72;1c80110bfebfebb750:29;8f:36;ddffe0:15;3fb0:11;47003f30:6;5414220:73;19b789f:9;d30:28;1f:40;40:16;92810:9;4d10040:7;5005590:75;115f:11;d20:28;7f:9;df:28;b0:19;a60:10;480:9;11004cc0:4;110:13;10:8;10:48;2f:12;e9950:26;4dffcdd7206f:27;20:14;10:4;210:8;410ba0:7;1bb100520:77;2f:16;70:26;1410:6;155ef:23;a0:15;30:14;5e37f40:5;3efa0:82;8f:16;e10:36;18f:22;b20:31;6d3c80:4;5dff70:5;110:74;4f:18;40:35;118f:21;a0:34;ce450019f:4;e04341420:28;20:45;df:17;b820:34;10bf:20;b0:35;3ef2001f:5;737570530:23;10:49;4f:17;e888d60:34;ef:19;d20:36;7fa000efffe16b60:4;19c0040:17;10:49;1ef:21;dba720:30;3ef:17;e20:37;1ef7005cee80bc4000620e5dfd720:4;510:58;6f:26;d20:30;2f:17;70:39;4ee0:5;1009470:6;27efffe8000180:58;4f:28;e0:30;cf:16;10:40;4520:7;410:9;1af:4;d158220:58;5f:28;10:29;6f:16;20:41;4cbbc510:14;5fffef21003420:57;df:26;d0:30;2f:16;60:44;2355251725710:6;26d819a0:4;14420:55;7f:25;e30:30;1f:16;d0:10;20:39;40150:13;19a10:4;440:11;10:43;1cf:24;90:32;ef:16;110:56;441000510:4;10:5;10:56;2f:23;b0:32;6f:17;2220070:50;3cffa000c40:26;110:40;af:22;a0:32;bf:17;20008e0:47;4c5bfff3000fd10:12;110:11;110:41;7df:20;b0:31;2f:17;8004bfb0:46;4ef:6;a104ff60:12;420:10;10:44;19f:19;90:31;1f:15;d4000cff70:45;7df:8;e7eff60:12;120:5;7400030:46;df:18;80:32;af:14;40:4;cff20:44;1ef:14;50:9;10:9;20:51;6f:18;30:32;4f:13;70:5;dfc0:5;20:37;47df:15;e30:8;270:12;20:47;4f:17;d0:34;bf:12;60:4;5ff60:40;15df:19;b0:9;540:59;5f:15;b820:34;7f:12;b0:4;8ff40:40;af:22;20:9;20:59;6f:13;d40:37;4f:11;d40:4;5fd0:41;ef:22;d10:68;4f:13;80:38;2f:10;d0:7;20:42;ef:23;50:68;6f:13;90:39;ef:9;d0:49;1f:24;20:68;4f:13;30:39;5f:9;40:49;3f:23;e0:69;2f:12;d0:41;bf:6;e40:50;1f:23;70:70;df:11;40:41;2f:6;50:51;1df:5;eb87df:11;b10:70;cf:10;a0:42;2f:4;d40:52;6fffdb50:4;1ebef:7;a10:71;cf:7;d6810:43;431310:53;6a510:8;44f:7;b0:12;110:59;cf:8;70:117;af:5;a10:12;240:59;cf:8;70:117;afffca10:13;2a20:58;8f:6;530:119;3270:15;4ee20:58;7f:4;de20:137;17a10:59;1afffe20:121;6d60:12;2b5510:61;4f:4;70:121;770:11;27d40:65;effe20:132;3af710:65;5fffd10:131;1ba40:68;8fffa0:131;10:71;3fff70:204;8ff30:205;8c60:207;bd30:205;17720:572;";

const MATRIX_GRID = new Float32Array(MATRIX_COLS * MATRIX_ROWS);
(() => {
  let outIdx = 0;
  let k = 0;
  const len = WORLD_MASK_RLE.length;
  while (k < len && outIdx < MATRIX_GRID.length) {
    const val = parseInt(WORLD_MASK_RLE[k], 16) / 15;
    if (k + 1 < len && WORLD_MASK_RLE[k + 1] === ":") {
      const semi = WORLD_MASK_RLE.indexOf(";", k + 2);
      const cnt = parseInt(WORLD_MASK_RLE.slice(k + 2, semi), 10);
      const end = Math.min(MATRIX_GRID.length, outIdx + cnt);
      MATRIX_GRID.fill(val, outIdx, end);
      outIdx = end;
      k = semi + 1;
    } else {
      MATRIX_GRID[outIdx++] = val;
      k += 1;
    }
  }
})();

function sampleWorldLand(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const fx = u * (MATRIX_COLS - 1);
  const fy = v * (MATRIX_ROWS - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(MATRIX_COLS - 1, x0 + 1);
  const y1 = Math.min(MATRIX_ROWS - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = MATRIX_GRID[y0 * MATRIX_COLS + x0];
  const v10 = MATRIX_GRID[y0 * MATRIX_COLS + x1];
  const v01 = MATRIX_GRID[y1 * MATRIX_COLS + x0];
  const v11 = MATRIX_GRID[y1 * MATRIX_COLS + x1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

function projectNode(lng, lat) {
  const col = 0.3108 * lng * (1 - 0.11 * Math.pow(lat / 90, 2)) + 42.323;
  const row = -0.3259 * lat + 26.807;
  const xPct = Math.max(2, Math.min(98, (col / 104) * 100));
  const yPct = Math.max(4, Math.min(96, (row / 48) * 100));
  return { xPct, yPct };
}

const mediaDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function resolveAppearance(mode) {
  if (mode === "system") {
    return mediaDark && !mediaDark.matches ? "light" : "dark";
  }
  return mode;
}

const state = {
  appearance: preferences.appearance ?? "dark",
  theme: "dark",      // resolved: "dark" | "light"
  lang: preferences.lang === "en" ? "en" : "zh-CN",
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
  mapOverlapMode: preferences.mapOverlapMode === 'spread' ? 'spread' : 'cluster',
  eventFilter: "all", // "all" | "alert"
  detailTab: "load",
  detailHours: 6,
  detailPingFocus: -1,
  loggedIn: false,
  adminMenuOpen: false,
  pinnedSearch: "",
  settings: { ...defaultSettings, ...preferences.settings },
  nodes: [],
  connection: 'connecting',
  loading: true,
  privateSite: false,
};

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
  const svg = FLAG_SVGS[code];
  if (svg) {
    return `<span class="sg-flag sg-flag-${size}" aria-label="${code}" title="${code}">${svg}</span>`;
  }
  const fallbackLabel = code || (state.lang === "zh-CN" ? "未设置地区" : "Region unset");
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
  if (state.lang === "en" && Object.hasOwn(CITY_EN_MAP, city)) return CITY_EN_MAP[city];
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
  if (state.lang === "en" && Object.hasOwn(CONTINENT_EN, group)) return CONTINENT_EN[group];
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
      if (state.sortBy === "ram") return (b.ramUsed / b.ramTotal) - (a.ramUsed / a.ramTotal);
      if (state.sortBy === "net") return (b.netIn + b.netOut) - (a.netIn + a.netOut);
      if (state.sortBy === "traffic") return (b.totalUpGB + b.totalDownGB) - (a.totalUpGB + a.totalDownGB);
      return 0;
    });
}

// ---- React Bits Pattern Waves World Map Renderer (with in-component server squares) ----
// Exact parameters from user URL:
// pattern=square, spacing=5, speed=0, shine=0.75, scale=3, direction=0, contrast=1,
// cursorStrength=0.5, cursorSize=60, intro=false, fade=bottom, fadeSize=0.45,
// interactive=false, wave=ripple (with silk preset defaults: markSize=0.95, depth=0.95, light=0)
const PW_CFG = {
  pattern: "square",
  wave: "ripple",
  spacing: 5,
  markSize: 0.95,
  depth: 0.95,
  light: 0,
  shine: 0.75,
  scale: 3,
  direction: 0,
  contrast: 1,
  fade: "bottom",
  fadeSize: 0.45,
  speed: 0,
  intro: false,
  interactive: false,
  cursorStrength: 0.5,
  cursorSize: 60,
};

const PW_SPIRAL_OFFSETS = [
  [0, 0], [1, 0], [0, 1], [1, 1],
  [-1, 0], [0, -1], [-1, 1], [1, -1],
  [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2],
];

function pwClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function pwSmoothstep(e0, e1, x) {
  const t = pwClamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// 1:1 port of PatternWaves.tsx GLSL uvec3 scramble() + 3D gradientNoise()
function pwScramble3(ix, iy, iz) {
  let x = (Math.imul((ix + 4096) | 0, 1664525) + 1013904223) >>> 0;
  let y = (Math.imul((iy + 4096) | 0, 1664525) + 1013904223) >>> 0;
  let z = (Math.imul((iz + 4096) | 0, 1664525) + 1013904223) >>> 0;
  x = (x + Math.imul(y, z)) >>> 0;
  y = (y + Math.imul(z, x)) >>> 0;
  z = (z + Math.imul(x, y)) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  y = (y ^ (y >>> 16)) >>> 0;
  z = (z ^ (z >>> 16)) >>> 0;
  x = (x + Math.imul(y, z)) >>> 0;
  y = (y + Math.imul(z, x)) >>> 0;
  z = (z + Math.imul(x, y)) >>> 0;
  return [
    (x & 65535) / 32767.5 - 1.0,
    (y & 65535) / 32767.5 - 1.0,
    (z & 65535) / 32767.5 - 1.0,
  ];
}

function pwDotLattice(ix, iy, iz, fx, fy, fz) {
  const g = pwScramble3(ix, iy, iz);
  return g[0] * fx + g[1] * fy + g[2] * fz;
}

function pwGradientNoise(px, py, pz) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const iz = Math.floor(pz);
  const fx = px - ix;
  const fy = py - iy;
  const fz = pz - iz;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

  const n000 = pwDotLattice(ix, iy, iz, fx, fy, fz);
  const n100 = pwDotLattice(ix + 1, iy, iz, fx - 1, fy, fz);
  const n010 = pwDotLattice(ix, iy + 1, iz, fx, fy - 1, fz);
  const n110 = pwDotLattice(ix + 1, iy + 1, iz, fx - 1, fy - 1, fz);
  const n001 = pwDotLattice(ix, iy, iz + 1, fx, fy, fz - 1);
  const n101 = pwDotLattice(ix + 1, iy, iz + 1, fx - 1, fy, fz - 1);
  const n011 = pwDotLattice(ix, iy + 1, iz + 1, fx, fy - 1, fz - 1);
  const n111 = pwDotLattice(ix + 1, iy + 1, iz + 1, fx - 1, fy - 1, fz - 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function drawRoundedSquare(ctx, cx, cy, extent, r) {
  const x = cx - extent;
  const y = cy - extent;
  const size = extent * 2;
  const cr = Math.min(r, extent);
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, size, size, cr);
  } else {
    ctx.moveTo(x + cr, y);
    ctx.lineTo(x + size - cr, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + cr);
    ctx.lineTo(x + size, y + size - cr);
    ctx.quadraticCurveTo(x + size, y + size, x + size - cr, y + size);
    ctx.lineTo(x + cr, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - cr);
    ctx.lineTo(x, y + cr);
    ctx.quadraticCurveTo(x, y, x + cr, y);
    ctx.closePath();
  }
  ctx.fill();
}

function nodeStatusRgb(n, isLight) {
  if (!n.online) return isLight ? [217, 107, 99] : [218, 114, 105];   // --sg-danger
  if (n.cpu >= 88) return isLight ? [212, 154, 82] : [219, 165, 89]; // --sg-warn
  return isLight ? [86, 168, 121] : [99, 186, 137];                  // --sg-success
}

function sortNodesBySeverity(nodes) {
  return [...nodes].sort((a, b) => {
    const ra = !a.online ? 0 : a.cpu >= 88 ? 1 : 2;
    const rb = !b.online ? 0 : b.cpu >= 88 ? 1 : 2;
    if (ra !== rb) return ra - rb;
    return b.cpu - a.cpu;
  });
}

// Real-time Solar Terminator (晨昏线) astronomy helper + UTC+8 clock
function getSolarSubpoint(nowMs) {
  const d = new Date(nowMs);
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = (nowMs - startOfYear) / 86400000;
  const declRad = ((-23.44 * Math.PI) / 180) * Math.cos((2 * Math.PI * (doy + 10)) / 365);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const subsolarLngDeg = (((12 - utcHours) * 15 + 540) % 360) - 180;
  return {
    declRad,
    subsolarLngRad: (subsolarLngDeg * Math.PI) / 180,
  };
}

function formatUtc8Time(nowMs) {
  const d = new Date(nowMs + 8 * 3600 * 1000);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

// Static Pattern Waves + Solar Terminator field cache (refreshes cleanly on resize, theme change, or UTC minute tick)
const pwCache = {
  key: "",
  width: 0,
  height: 0,
  mapX: 0,
  mapY: 0,
  mapW: 0,
  mapH: 0,
  cols: 0,
  rows: 0,
  originX: 0,
  originY: 0,
  pitch: PW_CFG.spacing,
  land: null,
  dayFactor: null,
  sunDome: null,
  termGlow: null,
  emphasis: null,
  fade: null,
  lift: null,
  serverHitList: [],
};

function ensurePatternWavesField(width, height, isLight, showTerminator) {
  const minuteBucket = showTerminator ? Math.floor(Date.now() / 60000) : 0;
  const key = `${Math.round(width)}x${Math.round(height)}:${isLight ? "L" : "D"}:${showTerminator ? "T" : "F"}:${minuteBucket}`;
  if (pwCache.key === key && pwCache.land) return pwCache;

  // Contain-fit the 1024:473 world silhouette inside the full-width viewport so continents never distort on wide 1-panel layouts
  const mapAspect = 1024 / 473;
  const viewAspect = width / Math.max(1, height);
  let mapW = width;
  let mapH = height;
  let mapX = 0;
  let mapY = 0;
  if (viewAspect > mapAspect) {
    mapH = height;
    mapW = height * mapAspect;
    mapX = (width - mapW) * 0.5;
  } else {
    mapW = width;
    mapH = width / mapAspect;
    mapY = (height - mapH) * 0.5;
  }

  const pitch = PW_CFG.spacing;
  const cols = Math.ceil(width / pitch) + 1;
  const rows = Math.ceil(height / pitch) + 1;
  const originX = Math.floor((width - cols * pitch) * 0.5);
  const originY = Math.floor((height - rows * pitch) * 0.5);
  const count = cols * rows;

  const land = new Float32Array(count);
  const sinAltGrid = new Float32Array(count);
  const dayFactor = new Float32Array(count);
  const sunDome = new Float32Array(count);
  const termGlow = new Float32Array(count);
  const emphasis = new Float32Array(count);
  const fade = new Float32Array(count);
  const lift = new Float32Array(count);

  const { declRad, subsolarLngRad } = getSolarSubpoint(Date.now());
  const sinDecl = Math.sin(declRad);
  const cosDecl = Math.cos(declRad);
  const uUnit = 520 * PW_CFG.scale;

  // Pass 1: sample 208x96 world map mask, bottom fade, and astronomical solar elevation sin(alpha)
  for (let r = 0; r < rows; r++) {
    const cy = originY + (r + 0.5) * pitch;
    const cyGL = height - cy;
    const fVal = pwSmoothstep(0, PW_CFG.fadeSize, cyGL / height);
    const vNorm = (cy - mapY) / mapH;
    const latDeg = pwClamp((26.807 - vNorm * 48) / 0.3259, -85, 85);
    const latRad = (latDeg * Math.PI) / 180;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const cosFactor = 1 - 0.11 * Math.pow(latDeg / 90, 2);
    const rowBase = r * cols;

    for (let c = 0; c < cols; c++) {
      const cx = originX + (c + 0.5) * pitch;
      const uNorm = (cx - mapX) / mapW;
      const idx = rowBase + c;
      land[idx] = sampleWorldLand(uNorm, vNorm);
      fade[idx] = fVal;

      const noiseVal = pwGradientNoise(((cx - 0.5 * width) / uUnit) * 2.4, ((cyGL - 0.5 * height) / uUnit) * 2.4, 0);
      if (showTerminator) {
        const lngDeg = (uNorm * 104 - 42.323) / (0.3108 * cosFactor);
        const lngRad = (lngDeg * Math.PI) / 180;
        const rawSinAlt = sinLat * sinDecl + cosLat * cosDecl * Math.cos(lngRad - subsolarLngRad);
        // Subtle Pattern Waves 3D gradient noise micro-texture so the terminator feels organically woven into the grid
        sinAltGrid[idx] = rawSinAlt + noiseVal * 0.008;
      } else {
        // Terminator disabled: gentle organic silk modulation across the static world dot-matrix
        dayFactor[idx] = 0.5 + noiseVal * 0.18;
        sunDome[idx] = 0;
        termGlow[idx] = 0;
        emphasis[idx] = 0;
        lift[idx] = pwClamp(noiseVal * 0.08 * PW_CFG.depth, -0.14, 0.14);
      }
    }
  }

  // Pass 2: screen-space SDF normalization (sinAlt / |grad sinAlt|) for a uniformly crisp Pattern Waves terminator highlight
  if (showTerminator) {
    const shineScale = pwClamp(PW_CFG.shine / 0.75, 0.2, 2.0);
    for (let r = 0; r < rows; r++) {
      const rUp = r > 0 ? r - 1 : 0;
      const rDn = r < rows - 1 ? r + 1 : rows - 1;
      const rowBase = r * cols;
      for (let c = 0; c < cols; c++) {
        const cLt = c > 0 ? c - 1 : 0;
        const cRt = c < cols - 1 ? c + 1 : cols - 1;
        const idx = rowBase + c;
        const s = sinAltGrid[idx];
        const dsx = (sinAltGrid[rowBase + cRt] - sinAltGrid[rowBase + cLt]) * (c > 0 && c < cols - 1 ? 0.5 : 1.0);
        const dsy = (sinAltGrid[rDn * cols + c] - sinAltGrid[rUp * cols + c]) * (r > 0 && r < rows - 1 ? 0.5 : 1.0);
        const gradMag = Math.max(Math.hypot(dsx, dsy), 0.0045);
        const dCells = s / gradMag;

        // Day/night smooth transition across terminator + crisp 3-cell specular terminator ribbon
        const dayF = pwSmoothstep(-2.4, 3.4, dCells);
        const dome = Math.pow(pwClamp(s, 0, 1), 0.85);
        const coreGlow = Math.exp(-Math.pow(dCells / (isLight ? 1.42 : 1.5), 2));
        const haloGlow = Math.exp(-Math.pow(dCells / (isLight ? 3.5 : 4.2), 2)) * (isLight ? 0.22 : 0.24);
        const tGlow = pwClamp((coreGlow + haloGlow) * shineScale, 0, 1);

        dayFactor[idx] = dayF;
        sunDome[idx] = dome;
        termGlow[idx] = tGlow;
        emphasis[idx] = pwClamp(coreGlow * (isLight ? 1.25 : 1.15) * shineScale, 0, 1);
        // Subtle Pattern Waves vertical lift along the sunlit dome and terminator crest
        lift[idx] = pwClamp((tGlow * 0.24 + (dayF - 0.5) * 0.14) * PW_CFG.depth, -0.38, 0.38);
      }
    }
  }

  pwCache.key = key;
  pwCache.width = width;
  pwCache.height = height;
  pwCache.mapX = mapX;
  pwCache.mapY = mapY;
  pwCache.mapW = mapW;
  pwCache.mapH = mapH;
  pwCache.cols = cols;
  pwCache.rows = rows;
  pwCache.originX = originX;
  pwCache.originY = originY;
  pwCache.pitch = pitch;
  pwCache.land = land;
  pwCache.dayFactor = dayFactor;
  pwCache.sunDome = sunDome;
  pwCache.termGlow = termGlow;
  pwCache.emphasis = emphasis;
  pwCache.fade = fade;
  pwCache.lift = lift;
  return pwCache;
}

let lastClusters = [];

function buildMapClusters(filteredIds) {
  const projected = state.nodes
    .filter((n) => Number.isFinite(n.lng) && Number.isFinite(n.lat))
    .map((n) => {
      const pos = projectNode(n.lng, n.lat);
      return { node: n, xPct: pos.xPct, yPct: pos.yPct, active: filteredIds.has(n.uuid) };
    });

  if (state.mapOverlapMode === "cluster") {
    const clusters = [];
    for (const item of projected) {
      let hit = null;
      for (const c of clusters) {
        const dx = item.xPct - c.xPct;
        const dy = (item.yPct - c.yPct) / 2.165;
        if (Math.hypot(dx, dy) < 1.8) {
          hit = c;
          break;
        }
      }
      if (hit) {
        hit.nodes.push(item.node);
        hit.active = hit.active || item.active;
        hit.xPct = hit.nodes.reduce((s, nd) => s + projectNode(nd.lng, nd.lat).xPct, 0) / hit.nodes.length;
        hit.yPct = hit.nodes.reduce((s, nd) => s + projectNode(nd.lng, nd.lat).yPct, 0) / hit.nodes.length;
      } else {
        clusters.push({
          key: `c-${item.node.uuid}`,
          xPct: item.xPct,
          yPct: item.yPct,
          nodes: [item.node],
          active: item.active,
        });
      }
    }
    return clusters;
  }

  if (state.mapOverlapMode === "spread") {
    const byCoord = new Map();
    for (const item of projected) {
      const coordKey = `${item.xPct.toFixed(1)},${item.yPct.toFixed(1)}`;
      if (!byCoord.has(coordKey)) byCoord.set(coordKey, []);
      byCoord.get(coordKey).push(item);
    }
    const out = [];
    for (const group of byCoord.values()) {
      const count = group.length;
      group.forEach((item, idx) => {
        let xPct = item.xPct;
        let yPct = item.yPct;
        if (count > 1) {
          const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
          const rx = count <= 2 ? 0.9 : 1.15;
          const ry = rx * 2.165;
          xPct += Math.cos(angle) * rx;
          yPct += Math.sin(angle) * ry;
        }
        out.push({
          key: `s-${item.node.uuid}`,
          xPct,
          yPct,
          nodes: [item.node],
          active: item.active,
        });
      });
    }
    return out;
  }

  return projected.map((item) => ({
    key: `r-${item.node.uuid}`,
    xPct: item.xPct,
    yPct: item.yPct,
    nodes: [item.node],
    active: item.active,
  }));
}

function drawWorldMapCanvas() {
  if (!state.settings.show_world_map) return;
  const canvas = document.getElementById("world-map-canvas");
  const viewport = document.getElementById("map-viewport");
  if (!canvas || !viewport) return;

  const rect = viewport.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const isLight = state.theme === "light";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const showTerminator = Boolean(state.settings.show_solar_terminator);
  const field = ensurePatternWavesField(rect.width, rect.height, isLight, showTerminator);
  const { cols, rows, originX, originY, pitch, mapX, mapY, mapW, mapH, land, dayFactor, sunDome, termGlow, emphasis, fade, lift } = field;

  // Refresh cluster assignments and map each server/cluster onto snapped Pattern Waves grid cells
  const filteredIds = new Set(getFilteredNodes().map((n) => n.uuid));
  lastClusters = buildMapClusters(filteredIds);

  const serverCellMap = new Map();
  const occupied = new Set();
  const hitList = [];
  const activeClusterKey = state.pinnedClusterKey || state.hoveredClusterKey;

  for (const cluster of lastClusters) {
    const sortedNodes = sortNodesBySeverity(cluster.nodes);
    const baseCol = pwClamp(Math.round((((cluster.xPct / 100) * mapW + mapX) - originX) / pitch - 0.5), 1, cols - 2);
    const baseRow = pwClamp(Math.round((((cluster.yPct / 100) * mapH + mapY) - originY) / pitch - 0.5), 1, rows - 2);
    const wantCount = state.mapOverlapMode === "cluster" ? Math.min(sortedNodes.length, 4) : 1;
    const assignedCells = [];

    for (let i = 0; i < wantCount; i++) {
      let chosenCol = baseCol;
      let chosenRow = baseRow;
      if (state.mapOverlapMode !== "raw") {
        for (const [dc, dr] of PW_SPIRAL_OFFSETS) {
          const nc = pwClamp(baseCol + dc, 1, cols - 2);
          const nr = pwClamp(baseRow + dr, 1, rows - 2);
          const k = nr * cols + nc;
          if (!occupied.has(k)) {
            chosenCol = nc;
            chosenRow = nr;
            occupied.add(k);
            break;
          }
        }
      }
      const cellIdx = chosenRow * cols + chosenCol;
      const nodeForCell = sortedNodes[i] || sortedNodes[0];
      const cx = originX + (chosenCol + 0.5) * pitch;
      const cy = originY + (chosenRow + 0.5) * pitch - lift[cellIdx] * pitch;
      const cellEntry = {
        col: chosenCol,
        row: chosenRow,
        cellIdx,
        cx,
        cy,
        node: nodeForCell,
        cluster,
        rgb: nodeStatusRgb(nodeForCell, isLight),
        active: cluster.active,
        highlighted: cluster.key === activeClusterKey,
      };
      serverCellMap.set(cellIdx, cellEntry);
      assignedCells.push(cellEntry);
    }

    const avgX = assignedCells.reduce((s, c) => s + c.cx, 0) / assignedCells.length;
    const avgY = assignedCells.reduce((s, c) => s + c.cy, 0) / assignedCells.length;
    cluster._cxPct = (avgX / rect.width) * 100;
    cluster._cyPct = (avgY / rect.height) * 100;
    hitList.push({ cluster, cells: assignedCells, cx: avgX, cy: avgY });
  }
  pwCache.serverHitList = hitList;

  // Base map square palette (balanced light-mode graphite terminator matching dark-mode legibility without harsh black)
  const dayBaseRgb = isLight ? [102, 108, 120] : [192, 198, 210];
  const nightBaseRgb = isLight ? [60, 66, 78] : [192, 198, 210];
  const flatBaseRgb = isLight ? [68, 74, 86] : [192, 198, 210];
  const accentRgb = isLight ? [34, 38, 48] : [236, 240, 246];
  const oceanRgb = isLight ? [70, 76, 88] : [196, 202, 214];
  const span = pitch * PW_CFG.markSize;

  for (let r = 0; r < rows; r++) {
    const baseY = originY + (r + 0.5) * pitch;
    const rowBase = r * cols;
    for (let c = 0; c < cols; c++) {
      const idx = rowBase + c;
      const cx = originX + (c + 0.5) * pitch;
      const cy = baseY - lift[idx] * pitch;

      // In-component Server Square: exact same grid cell, lift, and rounded-square geometry
      const srv = serverCellMap.get(idx);
      if (srv) {
        const emph = emphasis[idx];
        const boost = srv.highlighted ? 0.22 : 0.0;
        // In light mode keep semantic green/amber/red pure even directly on the deep-ink terminator
        const mixT = Math.min(1, (isLight ? 0 : emph * 0.08) + boost);
        const target = isLight ? [24, 28, 34] : [255, 255, 255];
        const cr = Math.round(srv.rgb[0] + (target[0] - srv.rgb[0]) * mixT);
        const cg = Math.round(srv.rgb[1] + (target[1] - srv.rgb[1]) * mixT);
        const cb = Math.round(srv.rgb[2] + (target[2] - srv.rgb[2]) * mixT);
        const extent = 0.5 * span * (srv.highlighted ? 1.05 : 1.0);
        const alpha = srv.active ? 1.0 : 0.24;

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        continue;
      }

      const cov = land[idx];
      const dayF = dayFactor[idx];
      const dome = sunDome[idx];
      const tGlow = termGlow[idx];
      const emph = emphasis[idx];
      const fVal = fade[idx];

      if (cov > 0.06) {
        if (!showTerminator) {
          // Terminator disabled: clean uniform Pattern Waves world dot-matrix
          const rawLvl = (isLight ? 0.42 : 0.44) + (dayF - 0.5) * 0.14;
          const lvl = pwClamp(cov * rawLvl, 0, 0.88);
          const area = Math.max(Math.sqrt(lvl), 0.18);
          const extent = 0.5 * span * area;
          const landFade = (isLight ? 0.44 : 0.32) + (isLight ? 0.56 : 0.68) * fVal;
          const alpha = landFade * (isLight ? 0.50 : 0.46);
          if (alpha < 0.015) continue;
          ctx.fillStyle = `rgba(${flatBaseRgb[0]},${flatBaseRgb[1]},${flatBaseRgb[2]},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else if (isLight) {
          // Light mode: balanced 3-tier contrast — airy sunlit day -> cool slate night -> refined graphite terminator crest
          const nightF = 1 - dayF;
          const rawLvl = 0.25 + nightF * 0.26 + tGlow * 0.44;
          const lvl = pwClamp(cov * rawLvl, 0, 0.88);
          const area = Math.max(Math.sqrt(lvl), 0.20);
          const extent = 0.5 * span * area;
          const landFade = 0.48 + 0.52 * fVal;
          const alpha = landFade * pwClamp(0.35 + nightF * 0.20 + tGlow * 0.30, 0, 0.76);
          if (alpha < 0.015) continue;

          const baseR = dayBaseRgb[0] + (nightBaseRgb[0] - dayBaseRgb[0]) * nightF;
          const baseG = dayBaseRgb[1] + (nightBaseRgb[1] - dayBaseRgb[1]) * nightF;
          const baseB = dayBaseRgb[2] + (nightBaseRgb[2] - dayBaseRgb[2]) * nightF;
          const tintT = pwClamp(emph * 0.78, 0, 1);
          const cr = Math.round(baseR + (accentRgb[0] - baseR) * tintT);
          const cg = Math.round(baseG + (accentRgb[1] - baseG) * tintT);
          const cb = Math.round(baseB + (accentRgb[2] - baseB) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else {
          // Dark mode: gentler Day vs Night contrast & luminous silver Solar Terminator crest
          const rawLvl = 0.28 + dayF * 0.23 + dome * 0.06 + tGlow * 0.34;
          const lvl = pwClamp(cov * rawLvl, 0, 0.88);
          const area = Math.max(Math.sqrt(lvl), 0.18);
          const extent = 0.5 * span * area;
          const landFade = 0.30 + 0.70 * fVal;
          const alpha = landFade * pwClamp(0.28 + dayF * 0.20 + dome * 0.05 + tGlow * 0.26, 0, 0.76);
          if (alpha < 0.015) continue;

          const tintT = pwClamp(emph * 0.68, 0, 1);
          const cr = Math.round(dayBaseRgb[0] + (accentRgb[0] - dayBaseRgb[0]) * tintT);
          const cg = Math.round(dayBaseRgb[1] + (accentRgb[1] - dayBaseRgb[1]) * tintT);
          const cb = Math.round(dayBaseRgb[2] + (accentRgb[2] - dayBaseRgb[2]) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        }
      } else {
        // Subtle Pattern Waves ocean micro-squares (plus continuous twilight arc when terminator is enabled)
        const oceanFade = 0.14 + 0.86 * fVal;
        if (!showTerminator) {
          const extent = 0.5 * span * 0.22;
          const alpha = oceanFade * (isLight ? 0.08 : 0.095);
          if (alpha < 0.008) continue;
          ctx.fillStyle = `rgba(${oceanRgb[0]},${oceanRgb[1]},${oceanRgb[2]},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else if (isLight) {
          const nightF = 1 - dayF;
          const area = 0.20 + nightF * 0.07 + tGlow * 0.25;
          const extent = 0.5 * span * area;
          const alpha = oceanFade * pwClamp(0.065 + nightF * 0.055 + tGlow * 0.24, 0, 0.36);
          if (alpha < 0.008) continue;

          const tintT = pwClamp(emph * 0.72, 0, 1);
          const cr = Math.round(oceanRgb[0] + (accentRgb[0] - oceanRgb[0]) * tintT);
          const cg = Math.round(oceanRgb[1] + (accentRgb[1] - oceanRgb[1]) * tintT);
          const cb = Math.round(oceanRgb[2] + (accentRgb[2] - oceanRgb[2]) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        } else {
          const area = 0.22 + dayF * 0.07 + tGlow * 0.19;
          const extent = 0.5 * span * area;
          const alpha = oceanFade * (0.085 + dayF * 0.045 + tGlow * 0.16);
          if (alpha < 0.008) continue;

          const tintT = pwClamp(emph * 0.65, 0, 1);
          const cr = Math.round(oceanRgb[0] + (accentRgb[0] - oceanRgb[0]) * tintT);
          const cg = Math.round(oceanRgb[1] + (accentRgb[1] - oceanRgb[1]) * tintT);
          const cb = Math.round(oceanRgb[2] + (accentRgb[2] - oceanRgb[2]) * tintT);

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
          drawRoundedSquare(ctx, cx, cy, extent, extent * 0.3);
        }
      }
    }
  }

  // Draw crisp grid-aligned square focus ring around hovered/pinned server or cluster
  if (activeClusterKey) {
    const hit = hitList.find((item) => item.cluster.key === activeClusterKey);
    if (hit && hit.cells.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const half = 0.5 * span;
      for (const cell of hit.cells) {
        if (cell.cx - half < minX) minX = cell.cx - half;
        if (cell.cx + half > maxX) maxX = cell.cx + half;
        if (cell.cy - half < minY) minY = cell.cy - half;
        if (cell.cy + half > maxY) maxY = cell.cy + half;
      }
      const pad = 2.2;
      ctx.save();
      ctx.strokeStyle = isLight ? "rgba(24, 27, 36, 0.55)" : "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2, 2.5);
      } else {
        ctx.rect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

function hitTestMapCluster(localX, localY) {
  let best = null;
  let bestDist = 12; // generous 12px hit radius around each snapped 5px server square
  for (const item of pwCache.serverHitList) {
    for (const cell of item.cells) {
      const d = Math.hypot(localX - cell.cx, localY - cell.cy);
      if (d < bestDist) {
        bestDist = d;
        best = item.cluster;
      }
    }
  }
  return best;
}

function renderMapMarkers() {
  if (!state.settings.show_world_map) return;
  drawWorldMapCanvas();

  const tooltip = document.getElementById("map-tooltip");
  const activeKey = state.pinnedClusterKey || state.hoveredClusterKey;
  if (activeKey) {
    const found = lastClusters.find((c) => c.key === activeKey);
    if (found) {
      positionMapTooltip(found, Boolean(state.pinnedClusterKey));
    } else {
      state.pinnedClusterKey = null;
      state.hoveredClusterKey = null;
      if (tooltip) tooltip.classList.add("hidden");
    }
  }
}

function initWorldMapInteractions() {
  const canvas = document.getElementById("world-map-canvas");
  const tooltip = document.getElementById("map-tooltip");
  if (!canvas || !tooltip) return;

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTestMapCluster(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hit ? "pointer" : "default";

    const nextKey = hit ? hit.key : null;
    if (state.pinnedClusterKey && nextKey !== state.pinnedClusterKey) return;
    if (nextKey === state.hoveredClusterKey) return;

    state.hoveredClusterKey = nextKey;
    drawWorldMapCanvas();
    if (hit) {
      positionMapTooltip(hit, false);
    } else if (!state.pinnedClusterKey) {
      tooltip.classList.add("hidden");
    }
  });

  canvas.addEventListener("pointerleave", () => {
    canvas.style.cursor = "default";
    if (state.hoveredClusterKey !== null) {
      state.hoveredClusterKey = null;
      drawWorldMapCanvas();
    }
    if (!state.pinnedClusterKey) tooltip.classList.add("hidden");
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTestMapCluster(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) {
      if (state.pinnedClusterKey) {
        state.pinnedClusterKey = null;
        tooltip.classList.add("hidden");
        drawWorldMapCanvas();
      }
      return;
    }
    e.stopPropagation();
    if (hit.nodes.length === 1) {
      state.pinnedClusterKey = null;
      state.hoveredClusterKey = null;
      tooltip.classList.add("hidden");
      drawWorldMapCanvas();
      state.selectedNodeId = hit.nodes[0].uuid;
      renderDetailModal();
    } else {
      state.pinnedClusterKey = state.pinnedClusterKey === hit.key ? null : hit.key;
      drawWorldMapCanvas();
      if (state.pinnedClusterKey) {
        positionMapTooltip(hit, true);
      } else {
        tooltip.classList.add("hidden");
      }
    }
  });
}

function positionMapTooltip(cluster, interactive) {
  const tooltip = document.getElementById("map-tooltip");
  if (!cluster || !tooltip) return;

  const xPct = cluster._cxPct !== undefined ? cluster._cxPct : cluster.xPct;
  const yPct = cluster._cyPct !== undefined ? cluster._cyPct : cluster.yPct;
  const { nodes } = cluster;
  const alignRight = xPct > 58;
  const placeBelow = yPct < 42;

  tooltip.classList.toggle("pointer-events-none", !interactive);
  tooltip.classList.toggle("pointer-events-auto", interactive);

  if (nodes.length === 1) {
    const n = nodes[0];
    const color = nodeStatusColor(n);
    tooltip.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-1.5">
          ${renderFlagBadge(n.region, "sm")}
          <span class="truncate font-medium">${escapeHtml(n.name)}</span>
        </div>
        <span class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${color};"></span>
      </div>
      <div class="mt-1.5 flex items-center justify-between mono-num text-[10.5px]" style="color: var(--sg-muted-fg);">
        <span>CPU ${n.online ? n.cpu.toFixed(1) + "%" : "—"}</span>
        <span>↑ ${n.online ? formatRate(n.netOut) : "0 B/s"}</span>
      </div>
    `;
  } else {
    const sorted = sortNodesBySeverity(nodes);
    const cityLabel = formatCityName(nodes[0].city || nodes[0].region);
    const onlineCnt = nodes.filter((n) => n.online).length;
    tooltip.innerHTML = `
      <div class="mb-1.5 flex items-center justify-between gap-2 border-b pb-1.5" style="border-color: var(--sg-border);">
        <div class="flex items-center gap-1.5 font-medium">
          ${renderFlagBadge(nodes[0].region, "sm")}
          <span>${cityLabel}</span>
        </div>
        <span class="mono-num text-[10px]" style="color: var(--sg-muted-fg);">${onlineCnt}/${nodes.length} ${t("online")}</span>
      </div>
      <div class="max-h-36 space-y-1 overflow-y-auto">
        ${sorted.map((n) => {
          const color = nodeStatusColor(n);
          return `
            <button type="button" data-pick-node="${escapeHtml(n.uuid)}" class="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/10">
              <span class="flex min-w-0 items-center gap-1.5">
                <span class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${color};"></span>
                <span class="truncate">${escapeHtml(n.name)}</span>
              </span>
              <span class="mono-num shrink-0 text-[10px]" style="color: var(--sg-muted-fg);">${n.online ? n.cpu.toFixed(0) + "%" : t("offline")}</span>
            </button>
          `;
        }).join("")}
      </div>
      ${!interactive ? `<div class="mt-1.5 text-[10px]" style="color: var(--sg-subtle-fg);">${state.lang === "en" ? "Click cluster to pin & pick node" : "点击聚合点固定并选择节点"}</div>` : ""}
    `;

    if (interactive) {
      tooltip.querySelectorAll("[data-pick-node]").forEach((rowBtn) => {
        rowBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          state.pinnedClusterKey = null;
          state.hoveredClusterKey = null;
          tooltip.classList.add("hidden");
          drawWorldMapCanvas();
          state.selectedNodeId = rowBtn.getAttribute("data-pick-node");
          renderDetailModal();
        });
      });
    }
  }

  // Reveal first to measure actual rendered dimensions, then strictly clamp inside #map-viewport
  tooltip.style.transform = "none";
  tooltip.classList.remove("hidden");

  const viewport = document.getElementById("map-viewport");
  if (viewport) {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const tipW = tooltip.offsetWidth || 200;
    const tipH = tooltip.offsetHeight || 80;
    const pad = 8;
    const gap = 12;
    const anchorX = (xPct / 100) * vw;
    const anchorY = (yPct / 100) * vh;

    let left = alignRight ? anchorX - tipW - gap : anchorX + gap;
    if (left < pad) left = anchorX + gap;
    if (left + tipW > vw - pad) left = vw - tipW - pad;
    left = Math.max(pad, left);

    let top = placeBelow ? anchorY + gap : anchorY - tipH - gap;
    if (top < pad) top = anchorY + gap;
    if (top + tipH > vh - pad) top = vh - tipH - pad;
    top = Math.max(pad, top);

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  } else {
    tooltip.style.left = `${xPct.toFixed(2)}%`;
    tooltip.style.top = `${yPct.toFixed(2)}%`;
    tooltip.style.transform = `translate(${alignRight ? "calc(-100% - 12px)" : "12px"}, ${placeBelow ? "12px" : "calc(-100% - 12px)"})`;
  }
}

function renderOverviewLayout() {
  const hero = document.getElementById("overview-hero");
  const mapPanel = document.getElementById("world-map-panel");
  const mapViewport = document.getElementById("map-viewport");
  const summaryPanel = document.getElementById("summary-bar");
  const eventPanel = document.getElementById("event-feed-panel");
  const eventInner = document.getElementById("event-feed-inner");
  const wordmarkWrap = document.getElementById("hero-wordmark-wrap");

  const showMap = Boolean(state.settings.show_world_map);
  const showSummary = Boolean(state.settings.show_summary_bar);
  const showEvents = Boolean(state.settings.show_event_feed);
  const showClock = Boolean(state.settings.show_map_clock);
  const visibleCount = (showMap ? 1 : 0) + (showSummary ? 1 : 0) + (showEvents ? 1 : 0);
  const hasHero = visibleCount > 0;

  const mapClockEl = document.getElementById("map-utc8-clock");
  if (mapClockEl) {
    mapClockEl.classList.toggle("hidden", !showClock);
    mapClockEl.classList.toggle("inline-flex", showClock);
    if (showClock) {
      const clockTimeEl = document.getElementById("map-utc8-time");
      if (clockTimeEl) clockTimeEl.textContent = formatUtc8Time(Date.now());
    }
  }

  // Keep wordmark tucked behind the top panels when hero is visible; cleanly spaced if all hero panels are hidden
  wordmarkWrap.className = hasHero
    ? "pointer-events-none relative z-0 -mb-3 select-none text-center sm:-mb-5"
    : "pointer-events-none relative z-0 mb-1 select-none text-center";

  // Reset base panel classes cleanly (applying hidden AFTER base classes so toggles always work reliably)
  if (!hasHero) {
    hero.className = "hidden";
  } else if (visibleCount === 3) {
    hero.className = "relative z-10 grid w-full items-stretch gap-4 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[1.45fr_0.95fr_0.82fr]";
  } else if (visibleCount === 2) {
    if (showMap) {
      hero.className = "relative z-10 grid w-full items-stretch gap-4 lg:grid-cols-[1.58fr_1fr]";
    } else {
      hero.className = "relative z-10 grid w-full items-stretch gap-4 lg:grid-cols-[1.28fr_1fr]";
    }
  } else {
    hero.className = "relative z-10 grid w-full grid-cols-1 gap-4";
  }

  mapPanel.className = showMap
    ? "sg-panel sg-glass-backdrop relative order-1 flex min-w-0 flex-col overflow-hidden rounded-xl p-4"
    : "hidden";

  if (mapViewport) {
    if (showMap && visibleCount === 1) {
      mapViewport.className = "relative h-[340px] w-full overflow-hidden rounded-lg sm:h-[400px]";
      mapViewport.style.aspectRatio = "";
      mapViewport.style.maxHeight = "";
    } else {
      mapViewport.className = "relative w-full overflow-hidden rounded-lg";
      mapViewport.style.aspectRatio = "1024 / 473";
      mapViewport.style.maxHeight = "400px";
    }
  }

  if (!showSummary) {
    summaryPanel.className = "hidden";
  } else if (visibleCount === 3) {
    // When 3 panels are enabled and width < xl (not enough for 3 columns), Network & Traffic drops to full-width row 2 (order-3)
    // while Live Events swaps up beside the map (order-2); on xl+, Network & Traffic sits in the middle column (xl:order-2).
    summaryPanel.className = "sg-panel sg-glass-backdrop relative order-3 flex h-[280px] min-w-0 flex-col overflow-hidden rounded-xl lg:col-span-2 xl:order-2 xl:col-span-1 xl:h-full xl:min-h-0";
  } else if (showMap) {
    summaryPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden rounded-xl lg:min-h-0";
  } else {
    summaryPanel.className = "sg-panel sg-glass-backdrop relative order-1 flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl sm:h-[340px]";
  }

  if (!showEvents) {
    eventPanel.className = "hidden";
  } else if (visibleCount === 3) {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex min-h-[240px] min-w-0 flex-col overflow-hidden rounded-xl lg:min-h-0 xl:order-3";
    if (eventInner) eventInner.className = "flex max-h-[260px] min-h-0 flex-1 flex-col lg:absolute lg:inset-0 lg:max-h-none";
  } else if (visibleCount === 2 && showMap) {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl lg:min-h-0";
    if (eventInner) eventInner.className = "flex max-h-[260px] min-h-0 flex-1 flex-col lg:absolute lg:inset-0 lg:max-h-none";
  } else if (visibleCount === 2) {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl sm:h-[340px]";
    if (eventInner) eventInner.className = "flex h-full min-h-0 flex-1 flex-col";
  } else {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-1 flex h-[300px] min-w-0 flex-col overflow-hidden rounded-xl";
    if (eventInner) eventInner.className = "flex h-full min-h-0 flex-1 flex-col";
  }
}

// ---- Real-time Telemetry Event Feed (Derived strictly from public node telemetry & state diffs) ----
const eventFeed = {
  items: [],
  nextId: 1,
  highCpuSet: new Set(),
};

function formatEventMessage(ev) {
  const en = state.lang === "en";
  switch (ev.type) {
    case "offline":
      return en ? "Node offline · No heartbeat" : "节点离线 · 心跳中断";
    case "high_cpu":
      return en
        ? `High CPU ${ev.cpu.toFixed(1)}% · Load ${ev.load.toFixed(2)}`
        : `CPU ${ev.cpu.toFixed(1)}% 高载 · Load ${ev.load.toFixed(2)}`;
    case "recovered":
      return en
        ? `CPU settled at ${ev.cpu.toFixed(1)}% · Back to normal`
        : `CPU 回落至 ${ev.cpu.toFixed(1)}% · 已恢复正常`;
    case "quota":
      return en
        ? `Monthly traffic at ${ev.pct.toFixed(0)}% (${ev.used.toFixed(2)}/${ev.limit.toFixed(1)} TB)`
        : `月流量已用 ${ev.pct.toFixed(0)}%（${ev.used.toFixed(2)}/${ev.limit.toFixed(1)} TB）`;
    case "expiring":
      return en
        ? `Expires in ${ev.days} ${ev.days === 1 ? "day" : "days"} · ${formatPriceLabel(ev.price)}`
        : `距到期仅剩 ${ev.days} 天 · ${ev.price}`;
    case "online":
      return en ? "Node reconnected · Online" : "节点重连 · 已恢复在线";
    case "reboot":
      return en ? "System reboot detected" : "检测到节点系统重启";
    default:
      return "";
  }
}

function eventSeverityColor(sev) {
  if (sev === "danger") return "var(--sg-danger)";
  if (sev === "warn") return "var(--sg-warn)";
  if (sev === "success") return "var(--sg-success)";
  return "var(--sg-subtle-fg)";
}

function updateEvents(previous, at) {
  const byId = new Map(previous.map(node => [node.uuid, node]));
  const current = [];
  for (const n of state.nodes) {
    const old = byId.get(n.uuid);
    const add = (type, severity, fields = {}) => current.push({
      id: eventFeed.nextId++, nodeUuid: n.uuid, nodeName: n.name,
      type, severity, isAlert: severity !== 'success', timeStr: fmtClock(at), ...fields,
    });
    if (!n.online) {
      eventFeed.highCpuSet.delete(n.uuid);
      if (!old || old.online) add('offline', 'danger');
      continue;
    }
    const wasHigh = eventFeed.highCpuSet.has(n.uuid);
    if (n.cpu >= 88 && !wasHigh) {
      eventFeed.highCpuSet.add(n.uuid);
      add('high_cpu', 'warn', { cpu: n.cpu, load: n.load });
    } else if (wasHigh && n.cpu < 78) {
      eventFeed.highCpuSet.delete(n.uuid);
      add('recovered', 'success', { cpu: n.cpu });
    }
    const pct = n.trafficUsedTB / n.trafficLimitTB * 100;
    if (n.trafficLimitTB > 0 && pct >= 85 && !(old?.trafficLimitTB > 0 && old.trafficUsedTB / old.trafficLimitTB >= 0.85)) {
      add('quota', pct >= 98 ? 'danger' : 'warn', { pct, used: n.trafficUsedTB, limit: n.trafficLimitTB });
    }
    if (state.loggedIn && n.expireDays !== null && n.expireDays <= 7 && n.expireDays !== old?.expireDays) {
      add('expiring', 'warn', { days: n.expireDays, price: n.price });
    }
    if (old && !old.online) add('online', 'success');
    if (old?.online && n.uptimeSec > 0 && n.uptimeSec < old.uptimeSec) add('reboot', 'warn');
  }
  const order = { offline: 0, high_cpu: 1, quota: 2, expiring: 3 };
  if (!previous.length) current.sort((a, b) => order[a.type] - order[b.type]);
  if (current.length) eventFeed.items = [...current, ...eventFeed.items].slice(0, 32);
  renderEventFeed();
}

function renderEventFeed() {
  if (!state.settings.show_event_feed) return;
  const inner = document.getElementById("event-feed-inner");
  if (!inner) return;

  const eligibleItems = state.loggedIn
    ? eventFeed.items
    : eventFeed.items.filter((ev) => ev.type !== "expiring");
  const alertCount = eligibleItems.filter((ev) => ev.isAlert).length;
  const visibleItems = state.eventFilter === "alert"
    ? eligibleItems.filter((ev) => ev.isAlert)
    : eligibleItems;

  if (!inner.dataset.inited) {
    inner.dataset.inited = "1";
    inner.innerHTML = `
      <div class="flex min-h-7 shrink-0 items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div class="flex min-w-0 items-center gap-2">
          <span class="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
            <span id="event-feed-title" class="truncate"></span>
          </span>
          <span id="event-feed-alert-badge" class="mono-num hidden shrink-0 items-center gap-1 text-[10.5px]" style="color: var(--sg-muted-fg);"><span class="h-[6px] w-[6px] rounded-[1.5px]" style="background: var(--sg-danger);"></span><span id="event-feed-alert-num"></span></span>
        </div>
        <div data-slot="tabs-list" data-variant="default" role="tablist" class="h-7 shrink-0">
          <button type="button" role="tab" data-slot="tabs-trigger" data-evfilter="all" data-active="true" aria-selected="true" class="px-2 text-[11px]"></button>
          <button type="button" role="tab" data-slot="tabs-trigger" data-evfilter="alert" data-active="false" aria-selected="false" class="px-2 text-[11px]"></button>
        </div>
      </div>
      <p id="event-connection-status" role="status" class="empty:hidden px-4 pb-2 text-[11px]" style="color: var(--sg-warn);"></p>
      <div id="event-feed-list" class="sg-scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2.5"></div>
    `;
    inner.querySelectorAll("[data-evfilter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.eventFilter = btn.getAttribute("data-evfilter");
        renderEventFeed();
      });
    });
  }

  const evTitleEl = document.getElementById("event-feed-title");
  if (evTitleEl) evTitleEl.textContent = t("eventsTitle");
  document.getElementById("event-connection-status").textContent = state.nodes.length && state.connection !== 'live' ? connectionMessage() : '';
  const evAlertBadge = document.getElementById("event-feed-alert-badge");
  const evAlertNum = document.getElementById("event-feed-alert-num");
  if (evAlertBadge && evAlertNum) {
    if (alertCount > 0) {
      evAlertNum.textContent = String(alertCount);
      evAlertBadge.classList.remove("hidden");
      evAlertBadge.classList.add("inline-flex");
    } else {
      evAlertBadge.classList.add("hidden");
      evAlertBadge.classList.remove("inline-flex");
    }
  }
  inner.querySelectorAll("[data-evfilter]").forEach((btn) => {
    const key = btn.getAttribute("data-evfilter");
    const active = state.eventFilter === key;
    btn.setAttribute("data-active", String(active));
    btn.setAttribute("aria-selected", String(active));
    btn.textContent = key === "all" ? t("eventsAll") : t("eventsAlerts");
  });

  const listEl = document.getElementById("event-feed-list");
  if (!listEl) return;
  listEl.innerHTML = visibleItems.length ? visibleItems.map((ev) => {
    const evNode = state.nodes.find((x) => x.uuid === ev.nodeUuid);
    const evRegion = ev.region || (evNode ? evNode.region : "");
    return `
    <button type="button" data-event-node="${escapeHtml(ev.nodeUuid)}" class="sg-event-row flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left">
      <span class="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${eventSeverityColor(ev.severity)};"></span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <span class="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium">
            ${renderFlagBadge(evRegion, "sm")}
            <span class="truncate" style="color: var(--sg-fg);">${escapeHtml(ev.nodeName)}</span>
          </span>
          <span class="mono-num shrink-0 text-[10px]" style="color: var(--sg-subtle-fg);">${ev.timeStr}</span>
        </div>
        <div class="mt-0.5 truncate text-[10.5px] mono-num" style="color: var(--sg-muted-fg);">${escapeHtml(formatEventMessage(ev))}</div>
      </div>
    </button>
  `;
  }).join("") : `
    <div class="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-center text-[11.5px]" style="color: var(--sg-muted-fg);">
      <span class="h-[6px] w-[6px] rounded-[1.5px]" style="background: ${state.connection === 'live' ? 'var(--sg-success)' : 'var(--sg-warn)'};"></span>
      <span>${state.connection === 'live' ? t(state.eventFilter === "alert" ? "eventsEmptyAlerts" : "eventsHealthy") : connectionMessage()}</span>
    </div>
  `;

  listEl.querySelectorAll("[data-event-node]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedNodeId = row.getAttribute("data-event-node");
      renderDetailModal();
    });
  });
}

// ---- Real-time Network Throughput rolling buffers & timestamps ----
function fmtClock(ms) {
  const d = new Date(ms);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function fmtRateTick(mbps) {
  if (!Number.isFinite(mbps) || mbps <= 0) return "0";
  const bps = mbps * 1024 * 1024;
  if (bps < 1024) return `${Math.round(bps)}B`;
  if (bps < 1024 * 1024) {
    const kb = bps / 1024;
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)}K`;
  }
  if (bps < 1024 * 1024 * 1024) {
    const mb = bps / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}M`;
  }
  const gb = bps / (1024 * 1024 * 1024);
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)}G`;
}

const netTelemetry = {
  hoveredKind: null,
  hoveredCol: -1,
  timestamps: [],
  upHistory: [],
  downHistory: [],
};

let netUnifiedMeta = null;

function sgSmoothstep(e0, e1, x) {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const u = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

function drawSlatRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Multi-stop smoothstep-eased vignette band (zero Mach-band seam)
function fillEasedVignette(ctx, x0, y0, x1, y1, rgbStr, maxAlpha, rx, ry, rw, rh) {
  if (maxAlpha <= 0 || rw <= 0 || rh <= 0) return;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0.0, `rgba(${rgbStr}, ${maxAlpha.toFixed(3)})`);
  grad.addColorStop(0.22, `rgba(${rgbStr}, ${(maxAlpha * 0.78).toFixed(3)})`);
  grad.addColorStop(0.48, `rgba(${rgbStr}, ${(maxAlpha * 0.44).toFixed(3)})`);
  grad.addColorStop(0.72, `rgba(${rgbStr}, ${(maxAlpha * 0.16).toFixed(3)})`);
  grad.addColorStop(0.88, `rgba(${rgbStr}, ${(maxAlpha * 0.035).toFixed(3)})`);
  grad.addColorStop(1.0, `rgba(${rgbStr}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(rx, ry, rw, rh);
}

function computeSlatWave(cx, cy, rectW, rectH) {
  const direction = (271 * Math.PI) / 180;
  const scale = 2.5;
  const contrast = 0.7;
  const glintStrength = 0.8;
  const TURN = [0, 0.34, -0.42, 0.78];
  const LENGTH = [1.8, 1.15, 0.76, 0.48];
  const HEIGHT = [1.0, 0.58, 0.34, 0.18];
  const SHIFT = [0.6, 2.1, 4.3, 1.4];

  const v = Math.max(0, Math.min(1, cy / rectH));
  const horizon = 8.0;
  const depth = (1.0 + horizon) / (v + horizon);
  const wx = (((cx - rectW * 0.5) / rectH) * depth) / scale;
  const wy = ((depth - 1.0) * horizon * 2.2) / scale;

  const meander =
    0.55 * Math.sin((wx * 0.23 + wy * 0.41) * 0.9) +
    0.3 * Math.sin((wx * -0.37 + wy * 0.19) * 1.4);

  let waveHeight = 0;
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const angle = direction + TURN[i];
    const k = (Math.PI * 2) / LENGTH[i];
    const theta = k * (wx * Math.cos(angle) + wy * Math.sin(angle)) + SHIFT[i] + meander * (0.6 + 0.3 * i);
    waveHeight += HEIGHT[i] * Math.cos(theta);
    total += HEIGHT[i];
  }

  const level = Math.max(0, Math.min(1, 0.5 + (0.5 * waveHeight) / (total * 0.85)));
  const crest = sgSmoothstep(0.6, 1.0, level);
  const glint = crest * crest * glintStrength;
  const light = Math.max(0.35, Math.min(1, Math.pow(level, contrast) + glint * 0.8));
  const tint = Math.max(0, Math.min(1, glint * 1.4));
  return { light, tint };
}

function drawNetSlatsChartCanvas() {
  const canvas = document.getElementById("net-slats-canvas");
  const cell = document.getElementById("network-traffic-cell");
  if (!canvas || !cell) return;

  const rect = cell.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Unified square finer Micro Slats synced 1:1 with Load History & Ping Latency
  const slatW = 5.5;
  const slatH = 5.5;
  const gapX = 2.5;
  const gapY = 1.8;
  const roundness = 0.25;
  const pitchX = slatW + gapX;
  const pitchY = slatH + gapY;

  const cols = Math.max(18, Math.ceil((rect.width + gapX) / pitchX) + 1);
  const rows = Math.max(22, Math.ceil((rect.height + gapY) / pitchY) + 1);

  const totalGridW = cols * pitchX - gapX;
  const totalGridH = rows * pitchY - gapY;
  const originX = (rect.width - totalGridW) * 0.5;
  const originY = (rect.height - totalGridH) * 0.5;
  const radius = Math.max(0.6, roundness * Math.min(slatW * 0.5, slatH * 0.5));

  // Bars strictly above bottom timestamps (reserving >= 25px below Download baseline for timestamps + breathing room)
  const topHeaderEl = document.getElementById("net-top-header");
  const topClearY = topHeaderEl ? topHeaderEl.offsetTop + topHeaderEl.offsetHeight + 4 : 46;
  const downBaseRow = Math.max(
    14,
    Math.min(rows - 2, Math.floor((rect.height - 25 - slatH - originY) / pitchY))
  );
  const downBaseLineY = originY + downBaseRow * pitchY + slatH;

  const upPlotMinY = topClearY + 12;
  const midBudgetPx = 54; // 23px (Upload timestamp + gap) + 19px (Download header) + 12px (Download Y-max)
  const halfPlotPx = Math.max(4 * pitchY, (downBaseLineY - upPlotMinY - midBudgetPx) * 0.5);
  const upBaseRow = Math.max(
    6,
    Math.min(downBaseRow - 8, Math.floor((upPlotMinY + halfPlotPx - slatH - originY) / pitchY))
  );
  const upBaseLineY = originY + upBaseRow * pitchY + slatH;
  const downHeaderY = Math.round(upBaseLineY + 23);
  const downPlotMinY = downHeaderY + 30;
  const splitRow = upBaseRow + 3;

  const upAvailRows = Math.max(4, Math.floor((upBaseLineY - slatH - upPlotMinY) / pitchY) + 1);
  const downAvailRows = Math.max(4, Math.floor((downBaseLineY - slatH - downPlotMinY) / pitchY) + 1);
  const maxBarRows = Math.max(4, Math.min(upAvailRows, downAvailRows));

  const upBarTopY = originY + (upBaseRow - maxBarRows + 1) * pitchY;
  const upBarMidY = originY + (upBaseRow - Math.round(maxBarRows * 0.5) + 1) * pitchY;
  const downBarTopY = originY + (downBaseRow - maxBarRows + 1) * pitchY;
  const downBarMidY = originY + (downBaseRow - Math.round(maxBarRows * 0.5) + 1) * pitchY;

  const upSamples = netTelemetry.upHistory.slice(-cols);
  const downSamples = netTelemetry.downHistory.slice(-cols);
  const times = netTelemetry.timestamps.slice(-cols);
  while (upSamples.length < cols) {
    upSamples.unshift(null);
    downSamples.unshift(null);
    times.unshift('');
  }

  const calcCeiling = (arr) => {
    const rawMax = Math.max(200, ...arr);
    const step = rawMax >= 800 ? 200 : rawMax >= 400 ? 100 : 50;
    return Math.ceil((rawMax * 1.1) / step) * step;
  };
  const upMax = calcCeiling(upSamples);
  const downMax = calcCeiling(downSamples);

  netUnifiedMeta = {
    cols,
    rows,
    upBaseRow,
    downBaseRow,
    splitRow,
    originX,
    originY,
    pitchX,
    pitchY,
    slatW,
    upSamples,
    downSamples,
    times,
    upBarTopY,
    downBarTopY,
    downHeaderY,
    rectW: rect.width,
    rectH: rect.height,
  };

  const isDark = state.theme === "dark";
  const baseRgb = isDark ? [132, 134, 138] : [98, 104, 114];
  const glintRgb = isDark ? [164, 166, 172] : [68, 74, 84];
  const guideColor = isDark ? "rgba(255, 255, 255, 0.085)" : "rgba(30, 36, 48, 0.105)";
  const rimColor = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.44)";
  const vigRgb = isDark ? "24, 23, 29" : "236, 239, 245";

  for (let c = 0; c < cols; c++) {
    const upVal = upSamples[c];
    const downVal = downSamples[c];
    const upNorm = Math.max(0.08, Math.min(1, upVal / upMax));
    const downNorm = Math.max(0.08, Math.min(1, downVal / downMax));
    const upLitCount = upVal > 0 ? Math.max(1, Math.round(upNorm * maxBarRows)) : 0;
    const downLitCount = downVal > 0 ? Math.max(1, Math.round(downNorm * maxBarRows)) : 0;
    const upTopLitRow = upBaseRow - upLitCount + 1;
    const downTopLitRow = downBaseRow - downLitCount + 1;

    const isLatest = c === cols - 1;
    const isUpHovered = netTelemetry.hoveredKind === "up" && netTelemetry.hoveredCol === c;
    const isDownHovered = netTelemetry.hoveredKind === "down" && netTelemetry.hoveredCol === c;

    for (let r = 0; r < rows; r++) {
      const isUpHalf = r < splitRow;
      const isUpBar = r <= upBaseRow && r >= upTopLitRow;
      const isDownBar = r > splitRow && r <= downBaseRow && r >= downTopLitRow;
      const isLit = isUpBar || isDownBar;
      const topLitRow = isUpHalf ? upTopLitRow : downTopLitRow;
      const isHovered = isUpHalf ? (r <= upBaseRow && isUpHovered) : (r > splitRow && r <= downBaseRow && isDownHovered);

      const x = originX + c * pitchX;
      const y = originY + r * pitchY;
      const cx = x + slatW * 0.5;
      const cy = y + slatH * 0.5;

      const { light, tint } = computeSlatWave(cx, cy, rect.width, rect.height);
      drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

      // Smooth outer tick/edge attenuation shared with Detail chart
      const rightTickFade = 0.66 + 0.34 * sgSmoothstep(rect.width - 2, rect.width - 44, cx);
      const leftEdgeFade = 0.78 + 0.22 * sgSmoothstep(2, 22, cx);
      const xBottomFade = isUpHalf
        ? 0.30 + 0.70 * sgSmoothstep(upBaseLineY + 18, upBaseLineY - 2, cy)
        : 0.28 + 0.72 * sgSmoothstep(rect.height - 2, downBaseLineY - 2, cy);

      if (isLit) {
        const isCrest = r === topLitRow;
        const cr = Math.round(baseRgb[0] + (glintRgb[0] - baseRgb[0]) * tint);
        const cg = Math.round(baseRgb[1] + (glintRgb[1] - baseRgb[1]) * tint);
        const cb = Math.round(baseRgb[2] + (glintRgb[2] - baseRgb[2]) * tint);
        const boost = isHovered ? 0.18 : isLatest ? 0.06 : 0;
        const litEdgeAtten = isHovered
          ? 1
          : (0.84 + 0.16 * rightTickFade) * (0.92 + 0.08 * leftEdgeFade);
        const baseAlpha = isCrest ? (isDark ? 0.72 : 0.68) : (isDark ? 0.42 + light * 0.22 : 0.36 + light * 0.22);
        const alpha = Math.min(0.88, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();

        if (isCrest) {
          ctx.fillStyle = rimColor;
          ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
        }
      } else {
        let textDim = 1;
        if (isUpHalf) {
          const topFade = sgSmoothstep(8, Math.max(54, upBarTopY + 6), cy);
          textDim = (0.28 + 0.72 * topFade) * rightTickFade * leftEdgeFade * xBottomFade;
        } else {
          const downFade = sgSmoothstep(downHeaderY - 4, Math.max(downHeaderY + 32, downBarTopY + 6), cy);
          textDim = (0.28 + 0.72 * downFade) * rightTickFade * leftEdgeFade * xBottomFade;
        }
        const hoverBoost = ((isUpHalf && r <= upBaseRow) || (!isUpHalf && r > splitRow && r <= downBaseRow)) && isHovered ? 1.8 : 1;
        const alpha = ((isDark ? 0.068 : 0.058) * textDim * hoverBoost).toFixed(4);
        ctx.fillStyle = `rgba(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]}, ${alpha})`;
        ctx.fill();
      }
    }
  }

  // Lighter, airier smooth optical vignettes strictly outside the lit bar bands
  const topVigEnd = Math.min(rect.height, Math.max(54, upBarTopY + 6));
  fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, rect.width, topVigEnd);

  const midVigEnd = Math.min(rect.height, Math.max(downHeaderY + 26, downBarTopY + 4));
  fillEasedVignette(ctx, 0, upBaseLineY + 2, 0, midVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, upBaseLineY + 2, rect.width, Math.max(0, midVigEnd - (upBaseLineY + 2)));

  const botVigStart = Math.min(rect.height - 2, downBaseLineY + 2);
  fillEasedVignette(ctx, 0, rect.height, 0, botVigStart, vigRgb, isDark ? 0.38 : 0.42, 0, botVigStart, rect.width, rect.height - botVigStart);

  const rightVigW = Math.min(50, rect.width * 0.22);
  fillEasedVignette(ctx, rect.width, 0, rect.width - rightVigW, 0, vigRgb, isDark ? 0.28 : 0.30, rect.width - rightVigW, 0, rightVigW, rect.height);

  const leftVigW = Math.min(22, rect.width * 0.09);
  fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.18 : 0.20, 0, 0, leftVigW, rect.height);

  ctx.save();
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  [upBarTopY, upBarMidY, upBaseLineY, downBarTopY, downBarMidY, downBaseLineY].forEach((gy) => {
    const yLine = Math.round(gy) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(rect.width, yLine);
    ctx.stroke();
  });
  ctx.restore();

  const upYMaxRow = document.getElementById("net-up-ymax-row");
  const upYMidRow = document.getElementById("net-up-ymid-row");
  const upXRow = document.getElementById("net-up-x-row");
  const safeUpMaxTop = Math.max(topClearY, upBarTopY - 11);
  const safeUpMidTop = Math.max(safeUpMaxTop + 13, upBarMidY - 11);
  if (upYMaxRow) upYMaxRow.style.top = `${safeUpMaxTop}px`;
  if (upYMidRow) upYMidRow.style.top = `${safeUpMidTop}px`;
  if (upXRow) upXRow.style.top = `${Math.round(upBaseLineY + 7)}px`;

  const downHeader = document.getElementById("net-down-header");
  const downYMaxRow = document.getElementById("net-down-ymax-row");
  const downYMidRow = document.getElementById("net-down-ymid-row");
  const downXRow = document.getElementById("net-down-x-row");
  const downClearY = downHeader ? downHeaderY + Math.max(18, downHeader.offsetHeight + 2) : downHeaderY + 18;
  const safeDownMaxTop = Math.max(downClearY, downBarTopY - 11);
  const safeDownMidTop = Math.max(safeDownMaxTop + 13, downBarMidY - 11);
  if (downHeader) downHeader.style.top = `${downHeaderY}px`;
  if (downYMaxRow) downYMaxRow.style.top = `${safeDownMaxTop}px`;
  if (downYMidRow) downYMidRow.style.top = `${safeDownMidTop}px`;
  if (downXRow) downXRow.style.top = `${Math.round(downBaseLineY + 7)}px`;

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setTxt("net-up-ymax", fmtRateTick(upMax));
  setTxt("net-up-ymid", fmtRateTick(upMax * 0.5));
  setTxt("net-up-xstart", times.find(Boolean) || "");
  setTxt("net-up-xend", times[times.length - 1] || "");

  setTxt("net-down-ymax", fmtRateTick(downMax));
  setTxt("net-down-ymid", fmtRateTick(downMax * 0.5));
  setTxt("net-down-xstart", times.find(Boolean) || "");
  setTxt("net-down-xend", times[times.length - 1] || "");
}

function renderSummary() {
  if (!state.settings.show_summary_bar) return;
  const el = document.getElementById("summary-bar");

  const onlineNodes = state.nodes.filter((n) => n.online);
  const totalUp = onlineNodes.reduce((s, n) => s + n.netOut, 0);
  const totalDown = onlineNodes.reduce((s, n) => s + n.netIn, 0);
  const totalTraffic = state.nodes.reduce((s, n) => s + n.totalUpGB + n.totalDownGB, 0);

  const upLabel = state.lang === "zh-CN" ? "上行" : "Upload";
  const downLabel = state.lang === "zh-CN" ? "下行" : "Download";

  if (!document.getElementById("network-traffic-cell")) {
    el.innerHTML = `
      <div id="network-traffic-cell" class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <canvas id="net-slats-canvas" class="absolute inset-0 block h-full w-full cursor-crosshair" aria-hidden="true"></canvas>

        <div id="net-top-header" class="pointer-events-none relative z-10 flex flex-col gap-0.5 px-4 pt-3.5">
          <div class="flex min-h-7 flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5">
            <span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
              <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span id="net-title-label"></span>
            </span>
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mono-num text-[10px] sm:text-[10.5px]">
              <span id="net-today" class="pointer-events-auto whitespace-nowrap" style="color: var(--sg-subtle-fg);"><span id="net-today-label"></span> <strong class="font-medium" style="color: var(--sg-fg);">—</strong></span>
              <span class="whitespace-nowrap" style="color: var(--sg-subtle-fg);"><span id="net-total-label"></span> <strong id="net-total-val" class="font-medium" style="color: var(--sg-fg);"></strong></span>
            </div>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span id="net-up-label" class="whitespace-nowrap text-[10.5px]" style="color: var(--sg-muted-fg);"></span>
            <span class="mono-num whitespace-nowrap text-[11.5px] font-semibold"><span id="net-up-rate"></span> <span id="net-up-unit" class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);"></span></span>
          </div>
        </div>

        <div id="net-up-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-up-ymax"></span>
        </div>
        <div id="net-up-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-up-ymid"></span>
        </div>
        <div id="net-up-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-4 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-up-xstart"></span>
          <span id="net-up-xend"></span>
        </div>

        <div id="net-down-header" class="pointer-events-none absolute inset-x-0 z-10 flex items-baseline justify-between gap-2 px-4">
          <span id="net-down-label" class="text-[10.5px]" style="color: var(--sg-muted-fg);"></span>
          <span class="mono-num text-[11.5px] font-semibold"><span id="net-down-rate"></span> <span id="net-down-unit" class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);"></span></span>
        </div>

        <div id="net-down-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-down-ymax"></span>
        </div>
        <div id="net-down-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-4 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-down-ymid"></span>
        </div>
        <div id="net-down-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-4 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="net-down-xstart"></span>
          <span id="net-down-xend"></span>
        </div>

        <div id="net-unified-tip" class="sg-popover pointer-events-none absolute z-20 hidden rounded-md px-1.5 py-0.5 mono-num text-[9.5px] whitespace-nowrap"></div>
      </div>
    `;

    const netCanvas = document.getElementById("net-slats-canvas");
    const tipEl = document.getElementById("net-unified-tip");
    if (netCanvas && tipEl) {
      netCanvas.addEventListener("mousemove", (evt) => {
        const meta = netUnifiedMeta;
        if (!meta) return;
        const r = netCanvas.getBoundingClientRect();
        const mx = evt.clientX - r.left;
        const my = evt.clientY - r.top;
        const c = Math.floor((mx - meta.originX) / meta.pitchX);
        const rowIdx = Math.floor((my - meta.originY) / meta.pitchY);
        const inUp = rowIdx >= 0 && rowIdx <= meta.upBaseRow;
        const inDown = rowIdx > meta.splitRow && rowIdx <= meta.downBaseRow;
        if (c >= 0 && c < meta.cols && (inUp || inDown)) {
          const isUp = inUp;
          const kind = isUp ? "up" : "down";
          if (netTelemetry.hoveredKind !== kind || netTelemetry.hoveredCol !== c) {
            netTelemetry.hoveredKind = kind;
            netTelemetry.hoveredCol = c;
            drawNetSlatsChartCanvas();
          }
          const val = isUp ? meta.upSamples[c] : meta.downSamples[c];
          const ts = meta.times[c];
          const arrow = isUp ? "↑" : "↓";
          tipEl.textContent = `${ts || "—"} · ${arrow} ${val === null ? "—" : formatRate(val)}`;
          tipEl.style.transform = "none";
          tipEl.classList.remove("hidden");
          const tipW = tipEl.offsetWidth || 120;
          const barCenterX = meta.originX + c * meta.pitchX + meta.slatW * 0.5;
          const preferredLeft = barCenterX > r.width * 0.58 ? barCenterX - tipW - 6 : barCenterX + 6;
          const clampedLeft = Math.max(8, Math.min(r.width - tipW - 8, preferredLeft));
          tipEl.style.left = `${Math.round(clampedLeft)}px`;
          tipEl.style.top = isUp
            ? `${Math.max(46, Math.round(meta.upBarTopY - 4))}px`
            : `${Math.max(meta.downHeaderY + 20, Math.round(meta.downBarTopY - 4))}px`;
        } else if (netTelemetry.hoveredKind !== null) {
          netTelemetry.hoveredKind = null;
          netTelemetry.hoveredCol = -1;
          tipEl.classList.add("hidden");
          drawNetSlatsChartCanvas();
        }
      });

      netCanvas.addEventListener("mouseleave", () => {
        if (netTelemetry.hoveredKind !== null) {
          netTelemetry.hoveredKind = null;
          netTelemetry.hoveredCol = -1;
          drawNetSlatsChartCanvas();
        }
        tipEl.classList.add("hidden");
      });
    }
  }

  const setTxt = (id, txt) => {
    const node = document.getElementById(id);
    if (node) node.textContent = txt;
  };
  const upParts = formatRateParts(totalUp);
  const downParts = formatRateParts(totalDown);
  setTxt("net-title-label", t("networkTitle"));
  setTxt("net-today-label", t("todayTraffic"));
  document.getElementById("net-today").title = bilingual('Komari 未提供今日流量总计', 'Komari does not report a daily traffic total');
  setTxt("net-total-label", t("totalTraffic"));
  setTxt("net-total-val", state.nodes.length ? formatTrafficGB(totalTraffic) : "—");
  setTxt("net-up-label", `↑ ${upLabel}`);
  setTxt("net-up-rate", upParts.value);
  setTxt("net-up-unit", upParts.unit);
  setTxt("net-down-label", `↓ ${downLabel}`);
  setTxt("net-down-rate", downParts.value);
  setTxt("net-down-unit", downParts.unit);

  drawNetSlatsChartCanvas();
}

function clampMenuInViewport(rootEl, menuEl) {
  if (menuEl?.dataset.open === 'true') void positionMenu(rootEl, menuEl);
}

let lastSortMenuSig = "";

function renderSortSelect() {
  const currentOpt = SORT_OPTIONS.find((o) => o.value === state.sortBy) || SORT_OPTIONS[0];
  const iconEl = document.getElementById("sort-select-icon");
  if (iconEl) iconEl.innerHTML = currentOpt.icon;
  document.getElementById("sort-select-label").textContent = t(currentOpt.key);

  const trigger = document.getElementById("sort-select-trigger");
  const menu = document.getElementById("sort-select-menu");
  trigger.setAttribute("aria-expanded", String(state.sortMenuOpen));
  menu.setAttribute("data-open", String(state.sortMenuOpen));

  const sig = state.lang;
  if (lastSortMenuSig !== sig) {
    lastSortMenuSig = sig;
    menu.innerHTML = SORT_OPTIONS.map((opt) => `
      <button type="button" role="option" data-slot="select-item" data-sort-val="${opt.value}" class="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left" style="color: var(--sg-fg);">
        <span class="inline-flex items-center gap-2">
          <span data-sort-icon class="inline-flex items-center">${opt.icon}</span>
          <span>${t(opt.key)}</span>
        </span>
        <svg data-sort-check class="h-3.5 w-3.5 shrink-0 transition-opacity duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
      </button>
    `).join("");

    menu.querySelectorAll("[data-sort-val]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.sortBy = btn.getAttribute("data-sort-val");
        state.sortMenuOpen = false;
        renderSortSelect();
        renderNodes();
      });
    });
  }

  menu.querySelectorAll("[data-sort-val]").forEach((btn) => {
    const selected = btn.getAttribute("data-sort-val") === state.sortBy;
    btn.setAttribute("data-selected", String(selected));
    const ic = btn.querySelector("[data-sort-icon]");
    if (ic) ic.style.color = selected ? "var(--sg-fg)" : "var(--sg-muted-fg)";
    const ck = btn.querySelector("[data-sort-check]");
    if (ck) ck.style.opacity = selected ? "1" : "0";
  });

  if (state.sortMenuOpen) {
    clampMenuInViewport(document.getElementById("sort-select-root"), menu);
  }
}

const VIEW_OPTION_ICONS = {
  show_offline_first: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`,
  show_total_traffic: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>`,
  show_traffic_bar: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="20" height="6" rx="3"/><path d="M6 12h7"/></svg>`,
  show_tags: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".75" fill="currentColor"/></svg>`,
  show_load_temp: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
  show_pricing: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
};

let lastViewOptionsSig = "";

function renderViewOptionsMenu() {
  const trigger = document.getElementById("btn-view-options");
  const menu = document.getElementById("view-options-menu");
  if (!trigger || !menu) return;

  const isCard = state.view === "card";
  const en = state.lang === "en";
  trigger.setAttribute("aria-expanded", String(state.viewOptionsOpen));
  menu.setAttribute("data-open", String(state.viewOptionsOpen));

  const sig = `${state.view}|${state.lang}|${state.loggedIn}`;
  if (lastViewOptionsSig !== sig) {
    lastViewOptionsSig = sig;
    const rawFields = isCard
      ? [
          { key: "show_offline_first", label: en ? "Pin Offline First" : "离线节点置顶" },
          { key: "show_total_traffic", label: en ? "Cumulative Traffic" : "节点累计流量", sub: en ? "Up / Down" : "↑ 上行 / ↓ 下行" },
          { key: "show_pricing", label: en ? "Billing & Expiry" : "费用与到期时间" },
          { key: "show_traffic_bar", label: en ? "Monthly Quota Bar" : "月流量配额进度条" },
          { key: "show_tags", label: en ? "Node Tags" : "节点标签" },
          { key: "show_load_temp", label: en ? "Load & Temp" : "Load 负载与温度" },
        ]
      : [
          { key: "show_offline_first", label: en ? "Pin Offline First" : "离线节点置顶" },
          { key: "show_total_traffic", label: en ? "Cumulative Traffic" : "累计流量列", sub: en ? "Up / Down" : "↑ 上行 / ↓ 下行" },
          { key: "show_pricing", label: en ? "Billing Info" : "费用与到期时间" },
          { key: "show_traffic_bar", label: en ? "Monthly Quota" : "月流量配额进度条" },
          { key: "show_tags", label: en ? "Node Tags" : "节点标签" },
          { key: "show_load_temp", label: en ? "Load & Temp" : "Load 负载与温度" },
        ];
    const fields = state.loggedIn ? rawFields : rawFields.filter((f) => f.key !== "show_pricing");

    const headerTitle = isCard
      ? (en ? "Card Display" : "卡片显示项")
      : (en ? "Table Columns" : "列表显示项");

    const densityBlock = isCard
      ? `
        <div class="mb-3 space-y-1.5">
          <div class="text-[11px] font-medium" style="color: var(--sg-muted-fg);">${en ? "Card Density" : "卡片密度"}</div>
          <div data-slot="tabs-list" data-variant="default" class="flex h-8 w-full">
            <button type="button" data-slot="tabs-trigger" data-vo-density="comfortable" class="flex-1 px-2 text-xs">${en ? "Standard" : "标准"}</button>
            <button type="button" data-slot="tabs-trigger" data-vo-density="compact" class="flex-1 px-2 text-xs">${en ? "Compact" : "紧凑"}</button>
          </div>
        </div>
      `
      : "";

    menu.innerHTML = `
      <div class="mb-2.5 flex items-center">
        <span class="text-[11px] font-semibold tracking-tight" style="color: var(--sg-fg);">${headerTitle}</span>
      </div>
      ${densityBlock}
      <div class="space-y-1">
        ${fields.map((f) => {
          const icon = VIEW_OPTION_ICONS[f.key] || "";
          return `
            <div class="flex items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--sg-hover-faint)]">
              <div class="flex min-w-0 items-center gap-2">
                <span data-vo-icon="${f.key}" class="inline-flex shrink-0 items-center transition-colors duration-150">${icon}</span>
                <div class="min-w-0">
                  <div class="truncate text-xs" style="color: var(--sg-fg);">${f.label}</div>
                  ${f.sub ? `<div class="mono-num truncate text-[10px]" style="color: var(--sg-subtle-fg);">${f.sub}</div>` : ""}
                </div>
              </div>
              <button type="button" role="switch" data-slot="switch" data-vo-sw="${f.key}" class="shrink-0">
                <span data-slot="switch-thumb"></span>
              </button>
            </div>
          `;
        }).join("")}
      </div>
    `;

    menu.querySelectorAll("[data-vo-density]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.settings.card_density = btn.getAttribute("data-vo-density");
        storePreferences();
        renderAll();
      });
    });

    menu.querySelectorAll("[data-vo-sw]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = btn.getAttribute("data-vo-sw");
        const next = !state.settings[k];
        state.settings[k] = next;
        // One-way open coupling: turning ON either Node Tags or Load & Temp enables both; turning OFF acts independently
        if (next) {
          if (k === "show_tags") state.settings.show_load_temp = true;
          else if (k === "show_load_temp") state.settings.show_tags = true;
        }
        storePreferences();
        renderAll();
      });
    });
  }

  // Patch density tabs & switches in-place so CSS thumb/tab transitions run smoothly
  menu.querySelectorAll("[data-vo-density]").forEach((btn) => {
    const active = btn.getAttribute("data-vo-density") === state.settings.card_density;
    btn.setAttribute("data-active", String(active));
  });
  menu.querySelectorAll("[data-vo-sw]").forEach((btn) => {
    const k = btn.getAttribute("data-vo-sw");
    const checked = Boolean(state.settings[k]);
    btn.setAttribute("aria-checked", String(checked));
    btn.setAttribute("data-checked", String(checked));
    const ic = menu.querySelector(`[data-vo-icon="${k}"]`);
    if (ic) ic.style.color = checked ? "var(--sg-fg)" : "var(--sg-muted-fg)";
  });

  // Keep #view-options-menu strictly within viewport (left >= 12px and right <= vw - 12px)
  if (state.viewOptionsOpen) {
    clampMenuInViewport(document.getElementById("view-tabs-root"), menu);
  }
}

function setDrawerOpen(open) {
  state.drawerOpen = open;
  const drawer = document.getElementById("managed-drawer");
  const btn = document.getElementById("btn-managed");
  btn.setAttribute("aria-expanded", String(open));

  if (open) {
    if (!drawer.open) drawer.showModal();
    requestAnimationFrame(() => {
      drawer.setAttribute("data-open", "true");
    });
  } else {
    drawer.setAttribute("data-open", "false");
    setTimeout(() => {
      if (!state.drawerOpen && drawer.open) {
        drawer.close();
      }
    }, 230);
  }
}

function togglePinnedNode(uuid) {
  if (!state.loggedIn) return;
  const list = Array.isArray(state.settings.featured_nodes) ? state.settings.featured_nodes : [];
  const idx = list.indexOf(uuid);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(uuid);
  }
  state.settings.featured_nodes = list;
  void saveSiteSettings();
  renderPinnedNodesDrawer();
  renderNodes();
}

function renderPinnedNodesDrawer() {
  const isZh = state.lang === "zh-CN";
  const lbl = document.getElementById("drawer-pinned-label");
  const cntEl = document.getElementById("drawer-pinned-count");
  const clearBtn = document.getElementById("btn-clear-pinned");
  const searchEl = document.getElementById("input-pinned-search");
  const listEl = document.getElementById("pinned-nodes-list");
  const emptyEl = document.getElementById("pinned-nodes-empty");
  if (!listEl) return;

  const pinnedSet = new Set(Array.isArray(state.settings.featured_nodes) ? state.settings.featured_nodes : []);
  if (lbl) lbl.textContent = isZh ? "置顶服务器" : "Pinned Servers";
  if (cntEl) cntEl.textContent = pinnedSet.size > 0 ? String(pinnedSet.size) : "";
  if (clearBtn) {
    clearBtn.textContent = isZh ? "清空" : "Clear";
    clearBtn.classList.toggle("hidden", pinnedSet.size === 0);
  }
  if (searchEl) searchEl.placeholder = isZh ? "筛选服务器…" : "Filter servers…";
  if (emptyEl) emptyEl.textContent = isZh ? "无匹配服务器" : "No matching servers";

  const nodeSig = state.nodes.map((n) => n.uuid).join(",");
  if (listEl.dataset.sig !== nodeSig) {
    listEl.dataset.sig = nodeSig;
    listEl.innerHTML = state.nodes.map((n) => `
      <div data-pin-row="${escapeHtml(n.uuid)}" class="sg-event-row flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-1.5">
        <span class="flex min-w-0 flex-1 items-center gap-2">
          ${renderFlagBadge(n.region, "sm")}
          <span class="truncate text-xs" style="color: var(--sg-fg);">${escapeHtml(n.name)}</span>
        </span>
        <button type="button" role="switch" data-slot="switch" data-pin-sw="${escapeHtml(n.uuid)}" class="shrink-0" aria-label="${escapeHtml(n.name)}">
          <span data-slot="switch-thumb"></span>
        </button>
      </div>
    `).join("");

    listEl.querySelectorAll("[data-pin-row]").forEach((row) => {
      row.addEventListener("click", () => {
        togglePinnedNode(row.getAttribute("data-pin-row"));
      });
    });
  }

  const q = (state.pinnedSearch || "").trim().toLowerCase();
  let visibleCount = 0;
  state.nodes.forEach((n) => {
    const row = listEl.querySelector(`[data-pin-row="${CSS.escape(n.uuid)}"]`);
    const sw = listEl.querySelector(`[data-pin-sw="${CSS.escape(n.uuid)}"]`);
    const checked = pinnedSet.has(n.uuid);
    if (sw) {
      sw.setAttribute("aria-checked", String(checked));
      sw.setAttribute("data-checked", String(checked));
    }
    if (row) {
      const hay = `${n.name} ${n.region} ${n.city} ${escapeHtml(formatCityName(n.city))} ${normalizeGroupName(n.group)} ${escapeHtml(formatGroupLabel(normalizeGroupName(n.group)))}`.toLowerCase();
      const match = !q || hay.includes(q);
      row.classList.toggle("hidden", !match);
      if (match) visibleCount += 1;
    }
  });
  if (emptyEl) emptyEl.classList.toggle("hidden", visibleCount > 0);
}

function renderHeader() {
  state.theme = resolveAppearance(state.appearance);
  document.documentElement.lang = state.lang;
  document.documentElement.style.colorScheme = state.theme;
  const stage = document.getElementById("sg-stage");
  stage.setAttribute("data-theme", state.theme);
  stage.setAttribute("data-glass", state.settings.reduce_transparency ? "opaque" : "translucent");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.getElementById("btn-lang").textContent = state.lang === "zh-CN" ? "中" : "EN";

  const isZh = state.lang === "zh-CN";
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.placeholder = isZh ? "搜索节点、地区、CPU、标签…" : "Search nodes, region, CPU, tags…";
  }
  const themeTitleMap = isZh
    ? { dark: "暗黑模式", light: "明亮模式", system: "跟随系统" }
    : { dark: "Dark mode", light: "Light mode", system: "System theme" };
  document.querySelectorAll("#theme-tabs [data-appearance]").forEach((tab) => {
    const mode = tab.getAttribute("data-appearance");
    if (themeTitleMap[mode]) {
      tab.setAttribute("title", themeTitleMap[mode]);
      tab.setAttribute("aria-label", themeTitleMap[mode]);
    }
  });
  const viewOptBtn = document.getElementById("btn-view-options");
  if (viewOptBtn) {
    const voTitle = isZh ? "显示项设置" : "Display options";
    viewOptBtn.setAttribute("title", voTitle);
    viewOptBtn.setAttribute("aria-label", voTitle);
  }
  const replayBtn = document.getElementById("btn-replay-hero");
  if (replayBtn) {
    replayBtn.textContent = isZh ? "重播入场" : "Replay";
    replayBtn.setAttribute("title", isZh ? "重播顶部标语动画" : "Replay wordmark animation");
  }
  const managedLabel = document.getElementById("btn-managed-label");
  const managedBtn = document.getElementById("btn-managed");
  if (managedLabel) managedLabel.textContent = isZh ? "主题配置" : "Theme";
  if (managedBtn) {
    const titleTxt = isZh ? "主题配置" : "Theme Settings";
    managedBtn.setAttribute("title", titleTxt);
    managedBtn.setAttribute("aria-label", titleTxt);
  }

  const authBtn = document.getElementById("btn-auth");
  const authIcon = document.getElementById("btn-auth-icon");
  const authLabel = document.getElementById("btn-auth-label");
  const adminMenu = document.getElementById("admin-menu");
  if (authBtn && authIcon && authLabel) {
    if (state.loggedIn) {
      authIcon.innerHTML = `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;
      authLabel.textContent = isZh ? "管理后台" : "Admin";
      authBtn.setAttribute("title", isZh ? "Komari 管理后台" : "Komari Admin");
      authBtn.setAttribute("aria-expanded", String(state.adminMenuOpen));
    } else {
      authIcon.innerHTML = `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`;
      authLabel.textContent = isZh ? "登录" : "Sign in";
      authBtn.setAttribute("title", isZh ? "登录 Komari" : "Sign in to Komari");
      authBtn.setAttribute("aria-expanded", "false");
    }
  }
  if (adminMenu) {
    const openAdmin = state.loggedIn && state.adminMenuOpen;
    adminMenu.setAttribute("data-open", String(openAdmin));
    if (openAdmin) {
      clampMenuInViewport(document.getElementById("auth-control-root"), adminMenu);
    }
  }
  const setSimpleTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setSimpleTxt("admin-goto-label", isZh ? "进入 Komari 后台" : "Open Komari Admin");
  setSimpleTxt("admin-logout-label", isZh ? "退出登录" : "Sign Out");
  setSimpleTxt("auth-title", isZh ? "登录 Komari" : "Sign in to Komari");
  setSimpleTxt("auth-desc", isZh ? "登录后可进入 Komari 后台管理，并查看节点费用与续费信息。" : "Sign in to access Komari Admin and view node billing & renewal info.");
  setSimpleTxt("auth-user-label", isZh ? "用户名" : "Username");
  setSimpleTxt("auth-pass-label", isZh ? "密码" : "Password");
  setSimpleTxt("auth-otp-label", isZh ? "两步验证码" : "Two-factor code");
  setSimpleTxt("btn-auth-cancel", isZh ? "取消" : "Cancel");
  setSimpleTxt("auth-submit-label", isZh ? "登录" : "Sign in");

  // Only show custom hero_title & pinned_nodes fields inside Theme Drawer when logged in
  const heroField = document.getElementById("hero-title-field");
  if (heroField) {
    heroField.classList.toggle("hidden", !state.loggedIn);
  }
  const pinnedField = document.getElementById("pinned-nodes-field");
  if (pinnedField) {
    pinnedField.classList.toggle("hidden", !state.loggedIn);
  }
  renderPinnedNodesDrawer();

  // Solid Glass Theme Mode Tabs (Dark / Light / System)
  document.querySelectorAll("#theme-tabs [data-appearance]").forEach((tab) => {
    const active = tab.getAttribute("data-appearance") === state.appearance;
    tab.setAttribute("data-active", String(active));
    tab.setAttribute("aria-selected", String(active));
  });

  // Solid Glass View Switcher Tabs (Card / Table) in Server List Toolbar
  const cardBtn = document.getElementById("btn-view-card");
  const tableBtn = document.getElementById("btn-view-table");
  cardBtn.setAttribute("data-active", String(state.view === "card"));
  cardBtn.setAttribute("aria-selected", String(state.view === "card"));
  tableBtn.setAttribute("data-active", String(state.view === "table"));
  tableBtn.setAttribute("aria-selected", String(state.view === "table"));

  // Solid Glass Online Toggle
  const onlyOnlineBtn = document.getElementById("btn-online-only");
  onlyOnlineBtn.setAttribute("aria-pressed", String(state.onlyOnline));

  // Guard removed "raw" overlap mode -> fallback to "cluster"
  if (state.mapOverlapMode !== "cluster" && state.mapOverlapMode !== "spread") {
    state.mapOverlapMode = "cluster";
  }

  // Drawer Density Tabs (if present)
  document.querySelectorAll(".density-btn").forEach((btn) => {
    const active = btn.getAttribute("data-density") === state.settings.card_density;
    btn.setAttribute("data-active", String(active));
  });

  const heroLbl = document.getElementById("drawer-hero-label");
  if (heroLbl) heroLbl.textContent = isZh ? "顶部自定义标语" : "Hero Wordmark";

  // Render Panel-Grouped Managed Settings Cards once per language, then patch switches & tabs in-place for smooth animations
  const swContainer = document.getElementById("managed-switches");
  const swHtml = (key) => `
    <button type="button" role="switch" data-slot="switch" data-sw="${key}" class="shrink-0">
      <span data-slot="switch-thumb"></span>
    </button>
  `;

  if (swContainer.dataset.langSig !== state.lang) {
    swContainer.dataset.langSig = state.lang;
    swContainer.innerHTML = `
      <!-- Panel Card: World Map -->
      <div class="sg-inset-pane rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>${t("mapTitle")}</span>
          </span>
          ${swHtml("show_world_map")}
        </div>

        <div id="drawer-map-subopts" class="mt-3 space-y-2.5 transition-opacity duration-200">
          <div class="space-y-1.5">
            <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "同区策略" : "Overlap Strategy"}</div>
            <div data-slot="tabs-list" data-variant="default" class="flex h-8 w-full">
              <button type="button" data-slot="tabs-trigger" data-overlap="cluster" class="overlap-btn flex-1 px-2 text-xs">${isZh ? "聚合" : "Cluster"}</button>
              <button type="button" data-slot="tabs-trigger" data-overlap="spread" class="overlap-btn flex-1 px-2 text-xs">${isZh ? "微散开" : "Spread"}</button>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-0.5">
            <span class="text-xs" style="color: var(--sg-muted-fg);">${isZh ? "地图时间显示" : "Map Clock (UTC+8)"}</span>
            ${swHtml("show_map_clock")}
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-xs" style="color: var(--sg-muted-fg);">${isZh ? "地图昼夜晨昏线" : "Solar Terminator"}</span>
            ${swHtml("show_solar_terminator")}
          </div>
        </div>
      </div>

      <!-- Panel Card: Network & Traffic -->
      <div class="sg-inset-pane rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>${t("networkTitle")}</span>
          </span>
          ${swHtml("show_summary_bar")}
        </div>
      </div>

      <!-- Panel Card: Live Events -->
      <div class="sg-inset-pane rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
            <span>${t("eventsTitle")}</span>
          </span>
          ${swHtml("show_event_feed")}
        </div>
      </div>

      <!-- Panel Card: Appearance & Performance -->
      <div class="sg-inset-pane space-y-2.5 rounded-xl p-3.5">
        <div class="flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
          <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
          <span>${isZh ? "外观与性能" : "Appearance & Performance"}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs" style="color: var(--sg-muted-fg);">${isZh ? "低透明高性能模式" : "Reduce Transparency"}</span>
          ${swHtml("reduce_transparency")}
        </div>
      </div>
    `;

    swContainer.querySelectorAll("[data-sw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.getAttribute("data-sw");
        state.settings[k] = !state.settings[k];
        storePreferences();
        renderAll();
      });
    });

    swContainer.querySelectorAll(".overlap-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mapOverlapMode = btn.getAttribute("data-overlap");
        storePreferences();
        state.pinnedClusterKey = null;
        state.hoveredClusterKey = null;
        const mapTip = document.getElementById("map-tooltip");
        if (mapTip) mapTip.classList.add("hidden");
        renderAll();
      });
    });
  }

  // Patch switches, overlap tabs, and map sub-options state in-place for smooth CSS transitions
  swContainer.querySelectorAll("[data-sw]").forEach((btn) => {
    const k = btn.getAttribute("data-sw");
    const checked = Boolean(state.settings[k]);
    btn.setAttribute("aria-checked", String(checked));
    btn.setAttribute("data-checked", String(checked));
  });
  swContainer.querySelectorAll(".overlap-btn").forEach((btn) => {
    const active = btn.getAttribute("data-overlap") === state.mapOverlapMode;
    btn.setAttribute("data-active", String(active));
  });
  const mapSubOpts = document.getElementById("drawer-map-subopts");
  if (mapSubOpts) {
    const mapOn = Boolean(state.settings.show_world_map);
    mapSubOpts.classList.toggle("pointer-events-none", !mapOn);
    mapSubOpts.classList.toggle("opacity-45", !mapOn);
  }

  renderSortSelect();
  renderViewOptionsMenu();

  const noticeBar = document.getElementById("notice-bar");
  const hasNotice = Boolean(state.settings.site_notice && state.settings.site_notice.trim());
  noticeBar.classList.toggle("hidden", !hasNotice);
  noticeBar.classList.toggle("flex", hasNotice);
  document.getElementById("notice-text").textContent = state.settings.site_notice;
}

function renderGroups() {
  const counts = Object.assign(Object.create(null), { ALL: state.nodes.length });
  state.nodes.forEach((n) => {
    const g = normalizeGroupName(n.group);
    if (!g) return;
    counts[g] = (counts[g] || 0) + 1;
  });
  const presentGroups = Object.keys(counts)
    .filter((g) => g !== "ALL" && counts[g] > 0)
    .sort((a, b) => {
      if (a === UNGROUPED_KEY && b !== UNGROUPED_KEY) return 1;
      if (b === UNGROUPED_KEY && a !== UNGROUPED_KEY) return -1;
      const ia = CONTINENT_ORDER.indexOf(a);
      const ib = CONTINENT_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  if (state.group !== "ALL" && !counts[state.group]) {
    state.group = "ALL";
  }
  const groups = ["ALL", ...presentGroups];

  const container = document.getElementById("group-tabs");
  const groupSig = `${state.lang}|${groups.map((g) => `${g}:${counts[g]}`).join(",")}`;
  if (container.dataset.sig !== groupSig) {
    container.dataset.sig = groupSig;
    container.innerHTML = groups.map((g, idx) => {
      const label = formatGroupLabel(g);
      const spanAll = idx === 0 && groups.length % 2 === 1;
      return `
        <button type="button" role="tab" data-slot="tabs-trigger" data-group="${escapeHtml(g)}" data-span-all="${spanAll}" class="shrink-0 whitespace-nowrap px-2.5 text-xs">
          <span>${escapeHtml(label)}</span>
          <span class="mono-num text-[11px] opacity-65">${counts[g]}</span>
        </button>
      `;
    }).join("");

    container.querySelectorAll("[data-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.group = btn.getAttribute("data-group");
        renderAll();
      });
    });
  }

  container.querySelectorAll("[data-group]").forEach((btn) => {
    const active = state.group === btn.getAttribute("data-group");
    btn.setAttribute("data-active", String(active));
    btn.setAttribute("aria-selected", String(active));
  });
}

function renderMeter(label, valueText, pct, subText, metricKey) {
  const color = toneColor(pct);
  return `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-[11px]">
        <span style="color: var(--sg-muted-fg);">${label}</span>
        <span data-m-val="${metricKey}" class="mono-num font-medium" style="color: ${pct >= 70 ? color : "var(--sg-fg)"};">
          ${valueText}${subText ? `<span class="ml-1 font-normal" style="color: var(--sg-subtle-fg);">${subText}</span>` : ""}
        </span>
      </div>
      <div data-slot="progress-track" class="h-1.5 w-full overflow-hidden rounded-full">
        <div data-m-bar="${metricKey}" data-slot="progress-indicator" class="h-full rounded-full" style="width: ${Math.min(100, Math.max(0, pct))}%; background: ${color};"></div>
      </div>
    </div>
  `;
}

function renderCardGrid(list) {
  const compact = state.settings.card_density === "compact";
  const minCardW = compact ? "272px" : "320px";
  return `
    <div class="grid ${compact ? "gap-3" : "gap-3.5"} px-4 pb-4 pt-1" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, ${minCardW}), 1fr));">
      ${list.map((n) => {
        const ramPct = n.ramTotal > 0 ? n.ramUsed / n.ramTotal * 100 : 0;
        const diskPct = n.diskTotal > 0 ? n.diskUsed / n.diskTotal * 100 : 0;
        const quotaPct = n.trafficLimitTB > 0 ? (n.trafficUsedTB / n.trafficLimitTB) * 100 : 0;
        const dotColor = nodeStatusColor(n);

        return `
          <article data-slot="card" data-node="${escapeHtml(n.uuid)}" tabindex="0" class="km-node-card sg-card sg-card-interactive relative flex cursor-pointer flex-col rounded-xl ${compact ? "gap-3 p-4" : "gap-4 p-5"} ${!n.online ? "opacity-65" : ""}">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  ${renderFlagBadge(n.region, "md")}
                  <h3 class="truncate text-sm font-medium tracking-tight">${escapeHtml(n.name)}</h3>
                  ${isNodeFeatured(n) ? renderPinnedBadge(n.uuid, true) : ""}
                </div>
              </div>
              <span data-slot="badge" data-variant="secondary" class="shrink-0 px-2 py-0.5 text-[11px] mono-num">
                <span data-m-dot class="h-[6px] w-[6px] rounded-[1.5px]" style="background: ${dotColor};"></span>
                <span data-m-uptime>${n.online ? formatUptime(n.uptimeSec) : t("offline")}</span>
              </span>
            </div>

            <div class="grid ${compact ? "grid-cols-3 gap-2.5" : "grid-cols-1 gap-2"}">
              ${renderMeter("CPU", n.online ? `${n.cpu.toFixed(1)}%` : "—", n.online ? n.cpu : 0, "", "cpu")}
              ${renderMeter("RAM", n.online && n.ramTotal ? `${ramPct.toFixed(0)}%` : "—", n.online ? ramPct : 0, compact || !n.online || !n.ramTotal ? "" : `${n.ramUsed.toFixed(1)}/${n.ramTotal}G`, "ram")}
              ${renderMeter("Disk", n.hasTelemetry && n.diskTotal ? `${diskPct.toFixed(0)}%` : "—", diskPct, compact || !n.hasTelemetry || !n.diskTotal ? "" : `${n.diskUsed.toFixed(0)}/${n.diskTotal}G`, "disk")}
            </div>

            <div class="sg-inset-pane rounded-lg px-2.5 py-2 text-[11px]">
              <div class="flex items-center justify-between mono-num">
                <span style="color: var(--sg-muted-fg);">↑ <strong data-m-up class="font-medium" style="color: var(--sg-fg);">${formatRate(n.online ? n.netOut : 0)}</strong></span>
                <span style="color: var(--sg-muted-fg);">↓ <strong data-m-down class="font-medium" style="color: var(--sg-fg);">${formatRate(n.online ? n.netIn : 0)}</strong></span>
              </div>
              ${state.settings.show_total_traffic ? `
                <div class="mt-1 flex items-center justify-between mono-num text-[10.5px]" style="color: var(--sg-subtle-fg);">
                  <span>↑ <span data-m-totup>${formatTrafficGB(n.totalUpGB)}</span></span>
                  <span>↓ <span data-m-totdown>${formatTrafficGB(n.totalDownGB)}</span></span>
                </div>
              ` : ""}
              ${state.settings.show_traffic_bar && n.trafficLimitTB > 0 ? `
                <div class="mt-2 space-y-1">
                  <div class="flex items-center justify-between text-[10px] mono-num" style="color: var(--sg-subtle-fg);">
                    <span>${t("quota")}</span>
                    <span>${n.trafficUsedTB.toFixed(2)} / ${n.trafficLimitTB.toFixed(1)} TB (${quotaPct.toFixed(0)}%)</span>
                  </div>
                  <div data-slot="progress-track" class="h-1 w-full overflow-hidden rounded-full">
                    <div data-slot="progress-indicator" class="h-full rounded-full" style="width: ${Math.min(100, quotaPct)}%; background: ${toneColor(quotaPct)};"></div>
                  </div>
                </div>
              ` : ""}
            </div>

            ${(state.settings.show_tags || state.settings.show_load_temp || (state.loggedIn && state.settings.show_pricing)) ? `
              <div class="mt-auto flex min-h-[24px] flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]" style="color: var(--sg-subtle-fg);">
                <div class="flex flex-wrap items-center gap-1.5">
                  ${state.settings.show_tags ? n.tags.slice(0, compact ? 2 : 3).map((tag) => `<span data-slot="tag">${escapeHtml(tag)}</span>`).join("") : ""}
                </div>
                <div class="flex items-center gap-2 mono-num">
                  ${state.settings.show_load_temp && n.online ? `<span data-m-load>L ${n.load.toFixed(2)}</span>${n.temp > 0 ? `<span>${n.temp.toFixed(0)}°C</span>` : ""}` : ""}
                  ${state.loggedIn && state.settings.show_pricing && (Boolean(n.price) || n.expireDays !== null) ? `<span style="color: var(--sg-muted-fg);">${escapeHtml(formatPriceLabel(n.price))}${n.price && n.expireDays !== null ? " · " : ""}${n.expireDays !== null ? `${n.expireDays}d` : ""}</span>` : ""}
                </div>
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTableView(list) {
  const en = state.lang === "en";
  const showBillingCol = state.loggedIn && state.settings.show_pricing;
  const cols = [
    { min: 220, track: "minmax(220px, 2.6fr)" },
    { min: 76, track: "minmax(76px, 0.80fr)" },
    { min: 76, track: "minmax(76px, 0.80fr)" },
    { min: 76, track: "minmax(76px, 0.80fr)" },
    { min: 104, track: "minmax(104px, 0.96fr)" },
  ];
  if (state.settings.show_total_traffic) cols.push({ min: 96, track: "minmax(96px, 0.88fr)" });
  if (state.settings.show_traffic_bar) cols.push({ min: 98, track: "minmax(98px, 0.90fr)" });
  if (state.settings.show_load_temp) cols.push({ min: 82, track: "minmax(82px, 0.72fr)" });
  cols.push(showBillingCol ? { min: 108, track: "minmax(108px, 0.80fr)" } : { min: 78, track: "minmax(78px, 0.56fr)" });

  const gridCols = cols.map((c) => c.track).join(" ");
  const minTableWidth = cols.reduce((acc, c) => acc + c.min, 24);
  const dirLegend = `<span class="ml-1 mono-num text-[10px] font-normal"><span style="color: var(--sg-fg);">↑</span><span style="color: var(--sg-subtle-fg);">/↓</span></span>`;

  return `
    <div class="px-4 pb-4 pt-1">
      <div data-slot="table-container" class="sg-table-shell overflow-hidden rounded-xl">
        <div class="sg-scroll-thin overflow-x-auto">
          <div data-slot="table" role="table" class="km-ui-table w-full text-left text-xs" style="min-width: ${minTableWidth}px; --sg-table-cols: ${gridCols};">
            <!-- Bright outer top header slab (px-3 = 6px outer frame + 6px inner well padding for 1:1 column alignment) -->
            <div data-slot="table-header" role="rowgroup" class="px-3">
              <div role="row" class="sg-table-grid items-center py-2.5 text-[11px] font-medium" style="color: var(--sg-muted-fg);">
                <div role="columnheader" class="min-w-0 px-2.5">${en ? "Node / Region" : "节点 / 区域"}</div>
                <div role="columnheader" class="min-w-0 px-2.5">CPU</div>
                <div role="columnheader" class="min-w-0 px-2.5">${en ? "RAM" : "内存"}</div>
                <div role="columnheader" class="min-w-0 px-2.5">${en ? "Disk" : "磁盘"}</div>
                <div role="columnheader" class="min-w-0 whitespace-nowrap px-2.5">${en ? "Live Speed" : "实时速率"}${dirLegend}</div>
                ${state.settings.show_total_traffic ? `<div role="columnheader" class="min-w-0 whitespace-nowrap px-2.5">${en ? "Total Traffic" : "累计流量"}${dirLegend}</div>` : ""}
                ${state.settings.show_traffic_bar ? `<div role="columnheader" class="min-w-0 px-2.5">${en ? "Monthly Quota" : "月流量"}</div>` : ""}
                ${state.settings.show_load_temp ? `<div role="columnheader" class="min-w-0 px-2.5">${en ? "Load / Temp" : "负载 / 温度"}</div>` : ""}
                <div role="columnheader" class="min-w-0 px-2.5 text-right">${showBillingCol ? (en ? "Uptime / Billing" : "在线 / 费用") : (en ? "Uptime" : "在线时长")}</div>
              </div>
            </div>

            <!-- Recessed rounded-rectangle shadow body well (zero row separators) -->
            <div class="px-1.5 pb-1.5">
              <div data-slot="table-body" role="rowgroup" class="sg-table-body space-y-0.5 rounded-[9px] p-1.5">
                ${list.map((n) => {
                  const ramPct = n.ramTotal > 0 ? n.ramUsed / n.ramTotal * 100 : 0;
                  const diskPct = n.diskTotal > 0 ? n.diskUsed / n.diskTotal * 100 : 0;
                  const quotaPct = n.trafficLimitTB > 0 ? (n.trafficUsedTB / n.trafficLimitTB) * 100 : 0;
                  const dotColor = nodeStatusColor(n);
                  const upParts = formatRateParts(n.online ? n.netOut : 0);
                  const downParts = formatRateParts(n.online ? n.netIn : 0);
                  const totUpParts = formatTrafficPartsGB(n.totalUpGB);
                  const totDownParts = formatTrafficPartsGB(n.totalDownGB);

                  const miniBar = (pct, key) => `
                    <div data-slot="progress-track" class="mt-1 h-1 w-14 overflow-hidden rounded-full">
                      <div ${key ? `data-m-bar="${key}"` : ""} data-slot="progress-indicator" class="h-full rounded-full" style="width: ${pct}%; background: ${toneColor(pct)};"></div>
                    </div>
                  `;

                  return `
                    <div data-slot="table-row" role="row" data-node="${escapeHtml(n.uuid)}" tabindex="0" class="km-ui-table-row sg-table-row sg-table-grid cursor-pointer items-center py-2 ${!n.online ? "opacity-60" : ""}">
                      <div role="cell" class="min-w-0 px-2.5">
                        <div class="flex items-center gap-2">
                          <span data-m-dot class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${dotColor};"></span>
                          ${renderFlagBadge(n.region, "md")}
                          <span class="truncate font-medium">${escapeHtml(n.name)}</span>
                          ${isNodeFeatured(n) ? renderPinnedBadge(n.uuid, true) : ""}
                        </div>
                        <div class="mt-0.5 truncate pl-3.5 text-[11px]" style="color: var(--sg-subtle-fg);">${escapeHtml(formatGroupLabel(normalizeGroupName(n.group)))}${state.settings.show_tags && n.tags.length ? ` · ${escapeHtml(n.tags.slice(0, 2).join(" / "))}` : ""}</div>
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num">
                        <div data-m-val="cpu" style="color: ${n.cpu >= 70 ? toneColor(n.cpu) : "var(--sg-fg)"};">${n.online ? `${n.cpu.toFixed(1)}%` : "—"}</div>
                        ${miniBar(n.online ? n.cpu : 0, "cpu")}
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num">
                        <div style="color: ${ramPct >= 70 ? toneColor(ramPct) : "var(--sg-fg)"};">${n.online && n.ramTotal ? `${ramPct.toFixed(0)}%` : "—"}</div>
                        ${miniBar(n.online ? ramPct : 0, "")}
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num">
                        <div>${n.hasTelemetry && n.diskTotal ? diskPct.toFixed(0) + "%" : "—"}</div>
                        ${miniBar(diskPct, "")}
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                        <div class="sg-rate-line">
                          <span data-m-up>${upParts.value}</span>
                          <span data-m-up-unit style="color: var(--sg-subtle-fg);">${upParts.unit}</span>
                        </div>
                        <div class="sg-rate-line" style="color: var(--sg-muted-fg);">
                          <span data-m-down>${downParts.value}</span>
                          <span data-m-down-unit style="color: var(--sg-subtle-fg);">${downParts.unit}</span>
                        </div>
                      </div>
                      ${state.settings.show_total_traffic ? `
                        <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                          <div class="sg-traffic-line">
                            <span data-m-totup>${totUpParts.value}</span>
                            <span data-m-totup-unit style="color: var(--sg-subtle-fg);">${totUpParts.unit}</span>
                          </div>
                          <div class="sg-traffic-line" style="color: var(--sg-muted-fg);">
                            <span data-m-totdown>${totDownParts.value}</span>
                            <span data-m-totdown-unit style="color: var(--sg-subtle-fg);">${totDownParts.unit}</span>
                          </div>
                        </div>
                      ` : ""}
                      ${state.settings.show_traffic_bar ? `
                        <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                          <div class="truncate">${n.trafficLimitTB > 0 ? `${n.trafficUsedTB.toFixed(2)}/${n.trafficLimitTB}T` : formatTrafficGB(n.trafficUsedTB * 1024)}</div>
                          ${n.trafficLimitTB > 0 ? miniBar(quotaPct, "") : `<div class="text-[10px]" style="color: var(--sg-subtle-fg);">${en ? "Unlimited" : "不限"}</div>`}
                        </div>
                      ` : ""}
                      ${state.settings.show_load_temp ? `
                        <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                          <div data-m-load>${n.online ? n.load.toFixed(2) : "—"}</div>
                          ${n.online && n.temp > 0 ? `<div class="text-[11px]" style="color: var(--sg-subtle-fg);">${n.temp.toFixed(1)}°C</div>` : ""}
                        </div>
                      ` : ""}
                      <div role="cell" class="min-w-0 px-2.5 text-right mono-num whitespace-nowrap">
                        <div data-m-uptime>${n.online ? formatUptime(n.uptimeSec) : t("offline")}</div>
                        ${showBillingCol && (Boolean(n.price) || n.expireDays !== null) ? `<div class="truncate text-[11px]" style="color: var(--sg-subtle-fg);">${escapeHtml(formatPriceLabel(n.price))}${n.price && n.expireDays !== null ? " · " : ""}${n.expireDays !== null ? `${n.expireDays}d` : ""}</div>` : ""}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

const nodesContainer = document.getElementById("nodes-container");
const nodeMarkup = document.createElement('div');

function renderNodes() {
  const list = getFilteredNodes();
  nodeMarkup.innerHTML = list.length
    ? (state.view === 'card' ? renderCardGrid(list) : renderTableView(list))
    : `<p class="py-14 text-center text-xs" style="color: var(--sg-muted-fg);" role="status">${emptyNodesMessage()}</p>`;
  morphdom(nodesContainer, nodeMarkup, {
    childrenOnly: true,
    getNodeKey: element => element.id || element.dataset?.node,
    onBeforeElUpdated: (current, next) => !current.isEqualNode(next),
  });
}

function activateNode(event) {
  const unpin = event.target.closest('[data-unpin-node]');
  if (unpin) {
    togglePinnedNode(unpin.dataset.unpinNode);
    return;
  }
  const node = event.target.closest('[data-node]');
  if (node) {
    state.selectedNodeId = node.dataset.node;
    renderDetailModal();
  }
}

nodesContainer.addEventListener('click', activateNode);
nodesContainer.addEventListener('keydown', event => {
  if (event.target.matches('[data-node]') && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    activateNode(event);
  }
});

let detailChartMeta = null;
let detailChartHoverCol = -1;
let detailCloseTimer = 0;

function closeDetailModal() {
  state.selectedNodeId = null;
  detailHistory?.controller.abort();
  detailHistory = undefined;
  detailChartHoverCol = -1;
  detailChartMeta = null;
  detailNetMeta = null;
  detailNetHover = { kind: null, col: -1 };
  const modal = document.getElementById("detail-modal");
  if (!modal || !modal.open) return;
  modal.setAttribute("data-open", "false");
  clearTimeout(detailCloseTimer);
  detailCloseTimer = setTimeout(() => {
    if (!state.selectedNodeId && modal.open) {
      modal.close();
    }
  }, 170);
}

let detailHistory;
const pingPalette = ['ct', 'cu', 'cm'];

function pingSeries(series) {
  return series.map((item, index) => {
    const key = pingPalette[index % pingPalette.length];
    return { ...item, key, label: item.name, swatch: `var(--sg-series-${key})` };
  });
}

function ensureDetailHistory(node) {
  const { detailHours: hours } = state;
  if (detailHistory?.uuid === node.uuid && detailHistory.hours === hours) return;
  detailHistory?.controller.abort();
  const request = { uuid: node.uuid, hours, controller: new AbortController() };
  detailHistory = request;
  for (const tab of ['load', 'ping']) {
    loadNodeHistory(node.uuid, hours, tab, request.controller.signal).then(
      result => { request[tab] = result; },
      error => { if (error.name !== 'AbortError') request[tab] = false; },
    ).then(() => {
      if (detailHistory === request && state.selectedNodeId === node.uuid) renderDetailModal();
    });
  }
}

function historyStatus(tab) {
  const data = detailHistory?.[tab];
  if (data === undefined) return bilingual('正在读取记录…', 'Loading records…');
  if (data === false) return bilingual('读取记录失败', 'Could not load records');
  if (tab === 'load' && data.empty) return bilingual('暂无历史记录', 'No history records');
  return '';
}

function drawDetailSlatsChartCanvas() {
  const card = document.getElementById("detail-chart-card");
  const canvas = document.getElementById("detail-slats-canvas");
  const plotArea = document.getElementById("detail-plot-area");
  if (!card || !canvas || !plotArea) return;

  const node = state.nodes.find((n) => n.uuid === state.selectedNodeId);
  if (!node) return;

  const W = card.offsetWidth;
  const H = card.offsetHeight;
  const plotBoxTop = plotArea.offsetTop;
  const plotBoxH = plotArea.offsetHeight;
  if (W < 20 || H < 20 || plotBoxH < 20) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Finer Micro Slats pitch (~22-24 vertical rows) for crisp multi-series legibility
  const slatW = 5.5;
  const slatH = 5.5;
  const gapX = 2.5;
  const gapY = 1.8;
  const roundness = 0.25;
  const pitchX = slatW + gapX;
  const pitchY = slatH + gapY;
  const radius = Math.max(0.6, roundness * Math.min(slatW * 0.5, slatH * 0.5));

  const cols = Math.max(24, Math.ceil((W + gapX) / pitchX) + 1);
  const rows = Math.max(22, Math.ceil((H + gapY) / pitchY) + 1);
  const totalGridW = cols * pitchX - gapX;
  const totalGridH = rows * pitchY - gapY;
  const originX = (W - totalGridW) * 0.5;
  const originY = (H - totalGridH) * 0.5;

  // Full-bleed left-to-right plot area spanning the entire card width (like Network & Traffic)
  const isLoad = state.detailTab === "load";
  const padT = 10;
  const padB = 26;

  const plotColStart = 0;
  const plotColEnd = cols - 1;
  const plotCols = cols;

  const plotRowStart = Math.max(1, Math.ceil((plotBoxTop + padT - originY) / pitchY));
  const plotRowEnd = Math.min(rows - 2, Math.floor((plotBoxTop + plotBoxH - padB - slatH - originY) / pitchY));
  const plotRows = Math.max(12, plotRowEnd - plotRowStart + 1);

  const gridLeftX = 0;
  const gridRightX = W;
  const gridTopY = originY + plotRowStart * pitchY;
  let gridBottomY = originY + plotRowEnd * pitchY + slatH;

  const history = detailHistory?.[state.detailTab];
  if (!history || (!isLoad && !history.series.length)) {
    detailChartMeta = null;
    for (const id of ['detail-xticks', 'detail-yticks']) {
      const el = document.getElementById(id);
      el.replaceChildren();
      delete el.dataset.sig;
    }
    return;
  }
  const samples = isLoad ? history.sample(plotCols, node.ramTotal * 2 ** 30) : history.sample(plotCols);

  const isDark = state.theme === "dark";
  const dormantBaseRgb = isDark ? [125, 125, 125] : [98, 104, 114];
  const guideColor = isDark ? "rgba(255, 255, 255, 0.085)" : "rgba(30, 36, 48, 0.105)";
  const vigRgb = isDark ? "24, 23, 29" : "236, 239, 245";

  // Restrained low-saturation Solid Glass multi-series palettes (CPU=CT sky blue, RAM=CM=--sg-success online green)
  const seriesPalettes = isDark
    ? {
        cpu: { base: [150, 196, 236], glint: [176, 218, 252], rim: "rgba(218, 240, 255, 0.56)" },
        ram: { base: [99, 186, 137], glint: [126, 210, 162], rim: "rgba(186, 242, 210, 0.56)" },
        ct: { base: [150, 196, 236], glint: [176, 218, 252], rim: "rgba(218, 240, 255, 0.56)" },
        cu: { base: [219, 165, 89], glint: [238, 192, 124], rim: "rgba(252, 226, 184, 0.56)" },
        cm: { base: [99, 186, 137], glint: [126, 210, 162], rim: "rgba(186, 242, 210, 0.56)" },
        loss: { rgb: [218, 114, 105], rim: "rgba(255, 198, 192, 0.62)" },
      }
    : {
        cpu: { base: [68, 118, 164], glint: [44, 90, 134], rim: "rgba(255, 255, 255, 0.52)" },
        ram: { base: [86, 168, 121], glint: [64, 146, 100], rim: "rgba(255, 255, 255, 0.52)" },
        ct: { base: [68, 118, 164], glint: [44, 90, 134], rim: "rgba(255, 255, 255, 0.52)" },
        cu: { base: [212, 154, 82], glint: [188, 130, 58], rim: "rgba(255, 255, 255, 0.52)" },
        cm: { base: [86, 168, 121], glint: [64, 146, 100], rim: "rgba(255, 255, 255, 0.52)" },
        loss: { rgb: [217, 107, 99], rim: "rgba(255, 255, 255, 0.58)" },
      };

  // Compute unified bottom row shared by Load History & Ping Latency so 0%/0ms and X-axis never shift
  const pCnt = detailHistory?.ping?.series?.length || 0;
  const pingSpanRows = pCnt >= 2
    ? Math.min(plotRows, Math.max(5, Math.floor((plotRows - (pCnt - 1)) / pCnt)) * pCnt + (pCnt - 1))
    : plotRows;
  const loadMidGapRows = 3;
  const loadTrackRows = Math.max(5, Math.floor((pingSpanRows - loadMidGapRows) / 2));
  const unifiedRowEnd = Math.min(plotRowStart + pingSpanRows - 1, plotRowStart + loadTrackRows * 2 + loadMidGapRows - 1);

  if (isLoad) {
    // ---- Mode A: Full-Width Dual-Track Micro Slats (Top: CPU, Bottom: RAM) ----
    const midGapRows = loadMidGapRows;
    const trackRows = loadTrackRows;
    const cpuRowStart = plotRowStart;
    const cpuRowEnd = cpuRowStart + trackRows - 1;
    const gapRow = cpuRowEnd + 1;
    const gapRowY = originY + gapRow * pitchY;
    const ramRowStart = cpuRowEnd + midGapRows + 1;
    const ramRowEnd = unifiedRowEnd;
    const effRamRows = Math.max(5, ramRowEnd - ramRowStart + 1);

    const cpuTopY = originY + cpuRowStart * pitchY;
    const cpuBottomY = originY + cpuRowEnd * pitchY + slatH;
    const ramTopY = originY + ramRowStart * pitchY;
    const ramBottomY = originY + ramRowEnd * pitchY + slatH;
    gridBottomY = ramBottomY;

    const { cpu: cpuValues, ram: ramValues } = samples;
    const seriesDefs = [
      { label: "CPU", swatch: "var(--sg-series-cpu)", values: cpuValues },
      { label: "RAM", swatch: "var(--sg-series-ram)", values: ramValues },
    ];

    const cpuTops = cpuValues.map((v) => {
      if (v === null || v === 0) return cpuRowEnd + 1;
      const lit = Math.max(1, Math.round(Math.max(0.06, Math.min(1, v / 100)) * trackRows));
      return Math.max(cpuRowStart, cpuRowEnd - lit + 1);
    });
    const ramTops = ramValues.map((v) => {
      if (v === null || v === 0) return ramRowEnd + 1;
      const lit = Math.max(1, Math.round(Math.max(0.06, Math.min(1, v / 100)) * effRamRows));
      return Math.max(ramRowStart, ramRowEnd - lit + 1);
    });

    detailChartMeta = {
      mode: "load",
      W,
      H,
      plotBoxTop,
      originX,
      originY,
      pitchX,
      pitchY,
      slatW,
      plotColStart,
      plotColEnd,
      plotCols,
      gridLeftX,
      gridRightX,
      gridTopY: cpuTopY,
      gridBottomY: ramBottomY,
      seriesDefs,
      unit: "%",
      times: samples.times,
    };

    for (let c = 0; c < cols; c++) {
      const pCol = c;
      const isLatest = c === cols - 1;
      const isHovered = detailChartHoverCol === pCol;

      for (let r = 0; r < rows; r++) {
        const x = originX + c * pitchX;
        const y = originY + r * pitchY;
        const cx = x + slatW * 0.5;
        const cy = y + slatH * 0.5;

        const isCpuHalf = r < gapRow;
        const inCpuTrack = r >= cpuRowStart && r <= cpuRowEnd;
        const inRamTrack = r >= ramRowStart && r <= ramRowEnd;

        const isCpuLit = inCpuTrack && r >= cpuTops[pCol];
        const isRamLit = inRamTrack && r >= ramTops[pCol];

        const { light, tint } = computeSlatWave(cx, cy, W, H);
        drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

        const leftTickFade = 0.62 + 0.38 * sgSmoothstep(2, 46, cx);
        const rightEdgeFade = 0.78 + 0.22 * sgSmoothstep(W - 2, W - 22, cx);

        if (isCpuLit || isRamLit) {
          const pal = isCpuLit ? seriesPalettes.cpu : seriesPalettes.ram;
          const isCrest = isCpuLit ? r === cpuTops[pCol] : r === ramTops[pCol];
          const cr = Math.round(pal.base[0] + (pal.glint[0] - pal.base[0]) * tint);
          const cg = Math.round(pal.base[1] + (pal.glint[1] - pal.base[1]) * tint);
          const cb = Math.round(pal.base[2] + (pal.glint[2] - pal.base[2]) * tint);
          const boost = isHovered ? 0.14 : isLatest ? 0.06 : 0;
          const litEdgeAtten = isHovered ? 1 : (0.82 + 0.18 * leftTickFade) * (0.92 + 0.08 * rightEdgeFade);
          const baseAlpha = isCrest ? (isDark ? 0.86 : 0.82) : (isDark ? 0.62 + light * 0.18 : 0.58 + light * 0.18);
          const alpha = Math.min(0.96, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
          ctx.fill();

          if (isCrest) {
            ctx.fillStyle = pal.rim;
            ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
          }
        } else {
          let vertVis = 1;
          if (isCpuHalf) {
            vertVis = 0.28 + 0.72 * sgSmoothstep(6, cpuTopY + 4, cy);
          } else {
            const downFade = 0.28 + 0.72 * sgSmoothstep(gapRowY, ramTopY + 10, cy);
            const botFade = 0.28 + 0.72 * sgSmoothstep(H - 2, ramBottomY + 4, cy);
            vertVis = downFade * botFade;
          }
          const edgeVis = vertVis * leftTickFade * rightEdgeFade;
          const hoverBoost = (inCpuTrack || inRamTrack) && isHovered ? 1.8 : 1;
          const alpha = ((isDark ? 0.068 : 0.058) * edgeVis * hoverBoost).toFixed(4);
          ctx.fillStyle = `rgba(${dormantBaseRgb[0]}, ${dormantBaseRgb[1]}, ${dormantBaseRgb[2]}, ${alpha})`;
          ctx.fill();
        }
      }
    }

    // Smooth edge vignettes over outer text & ticks + Network-&-Traffic-style downward separator at gapRowY
    const topVigEnd = Math.min(H, cpuTopY + 4);
    fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, W, topVigEnd);

    const downVigEnd = Math.min(H, ramTopY + 12);
    fillEasedVignette(ctx, 0, gapRowY, 0, downVigEnd, vigRgb, isDark ? 0.38 : 0.40, 0, gapRowY, W, downVigEnd - gapRowY);

    const leftVigW = Math.min(54, W * 0.2);
    fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.42 : 0.46, 0, 0, leftVigW, H);

    const botVigStart = Math.min(H - 2, ramBottomY + 2);
    fillEasedVignette(ctx, 0, H, 0, botVigStart, vigRgb, isDark ? 0.36 : 0.40, 0, botVigStart, W, H - botVigStart);

    const rightVigW = Math.min(22, W * 0.08);
    fillEasedVignette(ctx, W, 0, W - rightVigW, 0, vigRgb, isDark ? 0.20 : 0.22, W - rightVigW, 0, rightVigW, H);

    // Full-width dashed horizontal reference lines (100% / 50% / 0% per track)
    ctx.save();
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    [
      { top: cpuTopY, bot: cpuBottomY },
      { top: ramTopY, bot: ramBottomY },
    ].forEach((tr) => {
      [0, 0.5, 1].forEach((ratio) => {
        const gy = Math.round(tr.top + (tr.bot - tr.top) * (1 - ratio)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      });
    });
    ctx.restore();

    // Update Y-axis ticks floating inside the left vignette
    const yTicksEl = document.getElementById("detail-yticks");
    if (yTicksEl) {
      const tickRows = [
        { top: cpuTopY, bot: cpuBottomY },
        { top: ramTopY, bot: ramBottomY },
      ];
      const yHtml = tickRows
        .map((tr) =>
          [0, 0.5, 1]
            .map((ratio) => {
              const topPx = tr.top + (tr.bot - tr.top) * (1 - ratio) - plotBoxTop;
              const val = Math.round(100 * ratio);
              return `<span class="absolute left-3 -translate-y-1/2 text-left mono-num text-[9.5px] leading-none" style="top: ${topPx.toFixed(1)}px; color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">${val}%</span>`;
            })
            .join("")
        )
        .join("");
      if (yTicksEl.dataset.sig !== yHtml) {
        yTicksEl.dataset.sig = yHtml;
        yTicksEl.innerHTML = yHtml;
      }
    }
  } else {
    // ---- Mode B: Dynamic N-Track Separated Micro Slats Ping + L1 Packet Loss (1 deleted blank row between tracks) ----
    const allSeriesDefs = pingSeries(samples.series);
    const maxY = Math.max(120, Math.ceil(Math.max(...allSeriesDefs.map(series => series.maxLatency ?? 0)) / 40) * 40);
    const focusIdx = state.detailPingFocus >= 0 && state.detailPingFocus < allSeriesDefs.length ? state.detailPingFocus : -1;
    const visibleSeries = focusIdx >= 0 ? [allSeriesDefs[focusIdx]] : allSeriesDefs;
    const trackCount = visibleSeries.length;

    let tracks = [];
    const gapRowSet = new Set();

    if (trackCount === 1) {
      // Lock single-track Ping bottom row to unifiedRowEnd (exact same height & X-axis position as Load History)
      const soloRowEnd = unifiedRowEnd;
      tracks = [
        {
          ...visibleSeries[0],
          rStart: plotRowStart,
          rEnd: soloRowEnd,
          rCount: Math.max(6, soloRowEnd - plotRowStart + 1),
        },
      ];
    } else {
      // N tracks separated by exactly 1 deleted blank row (no slats drawn on separator rows)
      const gapRows = 1;
      const trackRows = Math.max(5, Math.floor((plotRows - gapRows * (trackCount - 1)) / trackCount));
      for (let i = 0; i < trackCount; i++) {
        const rStart = plotRowStart + i * (trackRows + gapRows);
        const rEnd = i === trackCount - 1 ? Math.min(plotRowEnd, rStart + trackRows - 1) : rStart + trackRows - 1;
        tracks.push({
          ...visibleSeries[i],
          rStart,
          rEnd,
          rCount: Math.max(4, rEnd - rStart + 1),
        });
        if (i < trackCount - 1) {
          gapRowSet.add(rEnd + 1);
        }
      }
    }

    tracks.forEach((tr) => {
      tr.topY = originY + tr.rStart * pitchY;
      tr.botY = originY + tr.rEnd * pitchY + slatH;
      tr.tops = tr.values.map((v, idx) => {
        if (tr.losses[idx] >= 100 || v === null) return -1;
        const norm = Math.max(0.05, Math.min(1, v / maxY));
        const lit = Math.max(1, Math.round(norm * tr.rCount));
        return Math.max(tr.rStart, tr.rEnd - lit + 1);
      });
    });

    gridBottomY = tracks[tracks.length - 1].botY;
    const gridPlotH = gridBottomY - gridTopY;

    detailChartMeta = {
      mode: "ping",
      W,
      H,
      plotBoxTop,
      originX,
      originY,
      pitchX,
      pitchY,
      slatW,
      plotColStart,
      plotColEnd,
      plotCols,
      gridLeftX: 0,
      gridRightX: W,
      gridTopY,
      gridBottomY,
      seriesDefs: visibleSeries,
      unit: "ms",
      times: samples.times,
    };

    const lossPal = seriesPalettes.loss;

    for (let c = 0; c < cols; c++) {
      const pCol = c;
      const isLatest = c === cols - 1;
      const isHovered = detailChartHoverCol === pCol;

      for (let r = 0; r < rows; r++) {
        // Deleted separator row: skip drawing any slat for a crisp 1-row negative-space channel
        if (gapRowSet.has(r)) continue;

        const x = originX + c * pitchX;
        const y = originY + r * pitchY;
        const cx = x + slatW * 0.5;
        const cy = y + slatH * 0.5;

        let activeTr = null;
        for (let tIdx = 0; tIdx < tracks.length; tIdx++) {
          if (r >= tracks[tIdx].rStart && r <= tracks[tIdx].rEnd) {
            activeTr = tracks[tIdx];
            break;
          }
        }

        const { light, tint } = computeSlatWave(cx, cy, W, H);
        drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

        const leftTickFade = 0.62 + 0.38 * sgSmoothstep(2, 46, cx);
        const rightEdgeFade = 0.78 + 0.22 * sgSmoothstep(W - 2, W - 22, cx);

        if (activeTr) {
          const loss = activeTr.losses[pCol];
          const topRow = activeTr.tops[pCol];
          const boost = isHovered ? 0.14 : isLatest ? 0.06 : 0;
          const litEdgeAtten = isHovered ? 1 : (0.82 + 0.18 * leftTickFade) * (0.90 + 0.10 * rightEdgeFade);

          if (loss >= 100) {
            // L1 Full 100% Packet Loss (Timeout): translucent red outage column + bright red top cap
            const isTopCap = r === activeTr.rStart;
            const baseAlpha = isTopCap
              ? (isDark ? 0.90 : 0.86)
              : (isDark ? 0.22 + light * 0.08 : 0.18 + light * 0.08);
            const alpha = Math.min(0.96, (baseAlpha + boost * (isTopCap ? 1 : 0.45)) * litEdgeAtten).toFixed(3);
            ctx.fillStyle = `rgba(${lossPal.rgb[0]}, ${lossPal.rgb[1]}, ${lossPal.rgb[2]}, ${alpha})`;
            ctx.fill();
            if (isTopCap) {
              ctx.fillStyle = lossPal.rim;
              ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
            }
            continue;
          }

          if (topRow >= 0 && r >= topRow) {
            const isCrest = r === topRow;
            if (loss > 0 && isCrest) {
              // L1 Partial Packet Loss: keep latency bar intact, flag top crest slat in semantic red
              const alpha = Math.min(0.96, ((isDark ? 0.90 : 0.86) + boost) * litEdgeAtten).toFixed(3);
              ctx.fillStyle = `rgba(${lossPal.rgb[0]}, ${lossPal.rgb[1]}, ${lossPal.rgb[2]}, ${alpha})`;
              ctx.fill();
              ctx.fillStyle = lossPal.rim;
              ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
            } else {
              // Style A solid Micro Slats latency bar
              const pal = seriesPalettes[activeTr.key];
              const cr = Math.round(pal.base[0] + (pal.glint[0] - pal.base[0]) * tint);
              const cg = Math.round(pal.base[1] + (pal.glint[1] - pal.base[1]) * tint);
              const cb = Math.round(pal.base[2] + (pal.glint[2] - pal.base[2]) * tint);
              const baseAlpha = isCrest ? (isDark ? 0.86 : 0.82) : (isDark ? 0.62 + light * 0.18 : 0.58 + light * 0.18);
              const alpha = Math.min(0.96, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
              ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
              ctx.fill();
              if (isCrest) {
                ctx.fillStyle = pal.rim;
                ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
              }
            }
            continue;
          }
        }

        // Dormant background slats
        const topVis = 0.28 + 0.72 * sgSmoothstep(6, gridTopY + 4, cy);
        const bottomVis = 0.28 + 0.72 * sgSmoothstep(H - 2, gridBottomY + 4, cy);
        const edgeVis = topVis * leftTickFade * bottomVis * rightEdgeFade;
        const hoverBoost = activeTr && isHovered ? 1.8 : 1;
        const alpha = ((isDark ? 0.068 : 0.058) * edgeVis * hoverBoost).toFixed(4);
        ctx.fillStyle = `rgba(${dormantBaseRgb[0]}, ${dormantBaseRgb[1]}, ${dormantBaseRgb[2]}, ${alpha})`;
        ctx.fill();
      }
    }

    // Smooth outer edge vignettes
    const topVigEnd = Math.min(H, gridTopY + 4);
    fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, W, topVigEnd);

    const leftVigW = Math.min(54, W * 0.2);
    fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.42 : 0.46, 0, 0, leftVigW, H);

    const botVigStart = Math.min(H - 2, gridBottomY + 2);
    fillEasedVignette(ctx, 0, H, 0, botVigStart, vigRgb, isDark ? 0.36 : 0.40, 0, botVigStart, W, H - botVigStart);

    const rightVigW = Math.min(22, W * 0.08);
    fillEasedVignette(ctx, W, 0, W - rightVigW, 0, vigRgb, isDark ? 0.20 : 0.22, W - rightVigW, 0, rightVigW, H);

    // Full-width dashed reference guides
    ctx.save();
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    if (tracks.length === 1) {
      [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
        const gy = Math.round(gridTopY + gridPlotH * (1 - ratio)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      });
    } else {
      tracks.forEach((tr) => {
        [tr.topY, tr.botY].forEach((gy) => {
          const yLine = Math.round(gy) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, yLine);
          ctx.lineTo(W, yLine);
          ctx.stroke();
        });
      });
    }
    ctx.restore();

    // Update Y-axis ticks
    const yTicksEl = document.getElementById("detail-yticks");
    if (yTicksEl) {
      let yHtml = "";
      if (tracks.length === 1) {
        yHtml = [0, 0.25, 0.5, 0.75, 1]
          .map((ratio) => {
            const topPx = gridTopY + gridPlotH * (1 - ratio) - plotBoxTop;
            const val = Math.round(maxY * ratio);
            return `<span class="absolute left-3 -translate-y-1/2 text-left mono-num text-[9.5px] leading-none" style="top: ${topPx.toFixed(1)}px; color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">${val}ms</span>`;
          })
          .join("");
      } else {
        yHtml = tracks
          .map((tr) => {
            const topPx = tr.topY - plotBoxTop + 1;
            const botPx = tr.botY - plotBoxTop - 9.5;
            return `
              <span class="absolute left-3 text-left mono-num text-[9px] leading-none" style="top: ${topPx.toFixed(1)}px; color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);">${maxY}ms</span>
              <span class="absolute left-3 text-left mono-num text-[9px] leading-none" style="top: ${botPx.toFixed(1)}px; color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">0ms</span>
            `;
          })
          .join("");
      }
      if (yTicksEl.dataset.sig !== yHtml) {
        yTicksEl.dataset.sig = yHtml;
        yTicksEl.innerHTML = yHtml;
      }
    }
  }

  // Update X-axis ticks spanning full width with clean 14px outer edge inset
  const xTicksEl = document.getElementById("detail-xticks");
  if (xTicksEl) {
    const labels = Array.from({ length: 6 }, (_, i) => {
      const minutes = Math.round(state.detailHours * 12 * (5 - i));
      return i === 5 ? "Now" : minutes < 60 ? `-${minutes}m` : `-${Math.round(minutes / 60)}h`;
    });
    const topPx = gridBottomY - plotBoxTop + 9;
    const insetX = 14;
    const xHtml = labels
      .map((lb, idx, arr) => {
        const leftPx = insetX + (idx / (arr.length - 1)) * (W - insetX * 2);
        const tx = idx === 0 ? "0%" : idx === arr.length - 1 ? "-100%" : "-50%";
        return `<span class="absolute mono-num text-[9.5px] leading-none" style="left: ${leftPx.toFixed(1)}px; top: ${topPx.toFixed(1)}px; transform: translateX(${tx}); color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">${lb}</span>`;
      })
      .join("");
    if (xTicksEl.dataset.sig !== xHtml) {
      xTicksEl.dataset.sig = xHtml;
      xTicksEl.innerHTML = xHtml;
    }
  }
}

let detailNetMeta = null;
let detailNetHover = { kind: null, col: -1 };

function drawDetailNetSlatsCanvas() {
  const canvas = document.getElementById("detail-net-canvas");
  const cell = document.getElementById("detail-net-cell");
  const node = state.nodes.find((n) => n.uuid === state.selectedNodeId);
  if (!canvas || !cell || !node) return;

  const W = cell.offsetWidth;
  const H = cell.offsetHeight;
  if (W < 20 || H < 20) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Unified square finer Micro Slats synced 1:1 with Load History & Ping Latency
  const slatW = 5.5;
  const slatH = 5.5;
  const gapX = 2.5;
  const gapY = 1.8;
  const roundness = 0.25;
  const pitchX = slatW + gapX;
  const pitchY = slatH + gapY;

  const cols = Math.max(16, Math.ceil((W + gapX) / pitchX) + 1);
  const rows = Math.max(22, Math.ceil((H + gapY) / pitchY) + 1);

  const totalGridW = cols * pitchX - gapX;
  const totalGridH = rows * pitchY - gapY;
  const originX = (W - totalGridW) * 0.5;
  const originY = (H - totalGridH) * 0.5;
  const radius = Math.max(0.6, roundness * Math.min(slatW * 0.5, slatH * 0.5));

  // Bars strictly above bottom timestamps (synced 1:1 with homepage Network & Traffic)
  const topHeaderEl = document.getElementById("dnet-top-header");
  const topClearY = topHeaderEl ? topHeaderEl.offsetTop + topHeaderEl.offsetHeight + 4 : 46;
  const downBaseRow = Math.max(
    14,
    Math.min(rows - 2, Math.floor((H - 25 - slatH - originY) / pitchY))
  );
  const downBaseLineY = originY + downBaseRow * pitchY + slatH;

  const upPlotMinY = topClearY + 12;
  const midBudgetPx = 54;
  const halfPlotPx = Math.max(4 * pitchY, (downBaseLineY - upPlotMinY - midBudgetPx) * 0.5);
  const upBaseRow = Math.max(
    6,
    Math.min(downBaseRow - 8, Math.floor((upPlotMinY + halfPlotPx - slatH - originY) / pitchY))
  );
  const upBaseLineY = originY + upBaseRow * pitchY + slatH;
  const downHeaderY = Math.round(upBaseLineY + 23);
  const downPlotMinY = downHeaderY + 30;
  const splitRow = upBaseRow + 3;

  const upAvailRows = Math.max(4, Math.floor((upBaseLineY - slatH - upPlotMinY) / pitchY) + 1);
  const downAvailRows = Math.max(4, Math.floor((downBaseLineY - slatH - downPlotMinY) / pitchY) + 1);
  const maxBarRows = Math.max(4, Math.min(upAvailRows, downAvailRows));

  const upBarTopY = originY + (upBaseRow - maxBarRows + 1) * pitchY;
  const upBarMidY = originY + (upBaseRow - Math.round(maxBarRows * 0.5) + 1) * pitchY;
  const downBarTopY = originY + (downBaseRow - maxBarRows + 1) * pitchY;
  const downBarMidY = originY + (downBaseRow - Math.round(maxBarRows * 0.5) + 1) * pitchY;

  const history = detailHistory?.load;
  const samples = history ? history.sample(cols, node.ramTotal * 2 ** 30) : null;
  const upSamples = samples?.up ?? Array(cols).fill(null);
  const downSamples = samples?.down ?? upSamples;
  const times = samples?.times.map(fmtClock) ?? [];

  const calcNodeCeiling = (arr) => {
    const peak = Math.max(0, ...arr);
    if (peak < 1) {
      const kbPeak = Math.max(10, peak * 1024);
      const kbStep = kbPeak >= 500 ? 200 : kbPeak >= 200 ? 100 : kbPeak >= 80 ? 50 : kbPeak >= 20 ? 20 : 10;
      return (Math.ceil((kbPeak * 1.15) / kbStep) * kbStep) / 1024;
    }
    const rawMax = Math.max(2, peak);
    const step = rawMax >= 200 ? 50 : rawMax >= 80 ? 20 : rawMax >= 30 ? 10 : rawMax >= 10 ? 5 : 2;
    return Math.ceil((rawMax * 1.15) / step) * step;
  };
  const upMax = calcNodeCeiling(upSamples);
  const downMax = calcNodeCeiling(downSamples);

  detailNetMeta = {
    cols,
    rows,
    upBaseRow,
    downBaseRow,
    splitRow,
    originX,
    originY,
    pitchX,
    pitchY,
    slatW,
    upSamples,
    downSamples,
    times,
    upBarTopY,
    downBarTopY,
    downHeaderY,
    rectW: W,
    rectH: H,
  };

  const isDark = state.theme === "dark";
  const baseRgb = isDark ? [132, 134, 138] : [98, 104, 114];
  const glintRgb = isDark ? [164, 166, 172] : [68, 74, 84];
  const guideColor = isDark ? "rgba(255, 255, 255, 0.085)" : "rgba(30, 36, 48, 0.105)";
  const rimColor = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.44)";
  const vigRgb = isDark ? "24, 23, 29" : "236, 239, 245";

  for (let c = 0; c < cols; c++) {
    const upVal = upSamples[c];
    const downVal = downSamples[c];
    const upLitCount = upVal > 0 ? Math.max(1, Math.round(Math.max(0.08, Math.min(1, upVal / upMax)) * maxBarRows)) : 0;
    const downLitCount = downVal > 0 ? Math.max(1, Math.round(Math.max(0.08, Math.min(1, downVal / downMax)) * maxBarRows)) : 0;
    const upTopLitRow = upBaseRow - upLitCount + 1;
    const downTopLitRow = downBaseRow - downLitCount + 1;

    const isLatest = c === cols - 1;
    const isUpHovered = detailNetHover.kind === "up" && detailNetHover.col === c;
    const isDownHovered = detailNetHover.kind === "down" && detailNetHover.col === c;

    for (let r = 0; r < rows; r++) {
      const isUpHalf = r < splitRow;
      const isUpBar = node.online && r <= upBaseRow && r >= upTopLitRow;
      const isDownBar = node.online && r > splitRow && r <= downBaseRow && r >= downTopLitRow;
      const isLit = isUpBar || isDownBar;
      const topLitRow = isUpHalf ? upTopLitRow : downTopLitRow;
      const isHovered = isUpHalf ? (r <= upBaseRow && isUpHovered) : (r > splitRow && r <= downBaseRow && isDownHovered);

      const x = originX + c * pitchX;
      const y = originY + r * pitchY;
      const cx = x + slatW * 0.5;
      const cy = y + slatH * 0.5;

      const { light, tint } = computeSlatWave(cx, cy, W, H);
      drawSlatRoundRect(ctx, x, y, slatW, slatH, radius);

      const rightTickFade = 0.66 + 0.34 * sgSmoothstep(W - 2, W - 44, cx);
      const leftEdgeFade = 0.78 + 0.22 * sgSmoothstep(2, 22, cx);
      const xBottomFade = isUpHalf
        ? 0.30 + 0.70 * sgSmoothstep(upBaseLineY + 18, upBaseLineY - 2, cy)
        : 0.28 + 0.72 * sgSmoothstep(H - 2, downBaseLineY - 2, cy);

      if (isLit) {
        const isCrest = r === topLitRow;
        const cr = Math.round(baseRgb[0] + (glintRgb[0] - baseRgb[0]) * tint);
        const cg = Math.round(baseRgb[1] + (glintRgb[1] - baseRgb[1]) * tint);
        const cb = Math.round(baseRgb[2] + (glintRgb[2] - baseRgb[2]) * tint);
        const boost = isHovered ? 0.18 : isLatest ? 0.06 : 0;
        const litEdgeAtten = isHovered
          ? 1
          : (0.84 + 0.16 * rightTickFade) * (0.92 + 0.08 * leftEdgeFade);
        const baseAlpha = isCrest ? (isDark ? 0.72 : 0.68) : (isDark ? 0.42 + light * 0.22 : 0.36 + light * 0.22);
        const alpha = Math.min(0.88, (baseAlpha + boost) * litEdgeAtten).toFixed(3);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();

        if (isCrest) {
          ctx.fillStyle = rimColor;
          ctx.fillRect(x + radius, y, Math.max(1, slatW - radius * 2), 1);
        }
      } else {
        let textDim = 1;
        if (isUpHalf) {
          const topFade = sgSmoothstep(8, Math.max(54, upBarTopY + 6), cy);
          textDim = (0.28 + 0.72 * topFade) * rightTickFade * leftEdgeFade * xBottomFade;
        } else {
          const downFade = sgSmoothstep(downHeaderY - 4, Math.max(downHeaderY + 32, downBarTopY + 6), cy);
          textDim = (0.28 + 0.72 * downFade) * rightTickFade * leftEdgeFade * xBottomFade;
        }
        const hoverBoost = ((isUpHalf && r <= upBaseRow) || (!isUpHalf && r > splitRow && r <= downBaseRow)) && isHovered ? 1.8 : 1;
        const alpha = ((isDark ? 0.068 : 0.058) * textDim * hoverBoost).toFixed(4);
        ctx.fillStyle = `rgba(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]}, ${alpha})`;
        ctx.fill();
      }
    }
  }

  // Lighter, airier smooth optical vignettes synced 1:1 with homepage Network & Traffic
  const topVigEnd = Math.min(H, Math.max(54, upBarTopY + 6));
  fillEasedVignette(ctx, 0, 0, 0, topVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, 0, W, topVigEnd);

  const midVigEnd = Math.min(H, Math.max(downHeaderY + 26, downBarTopY + 4));
  fillEasedVignette(ctx, 0, upBaseLineY + 2, 0, midVigEnd, vigRgb, isDark ? 0.38 : 0.42, 0, upBaseLineY + 2, W, Math.max(0, midVigEnd - (upBaseLineY + 2)));

  const botVigStart = Math.min(H - 2, downBaseLineY + 2);
  fillEasedVignette(ctx, 0, H, 0, botVigStart, vigRgb, isDark ? 0.38 : 0.42, 0, botVigStart, W, H - botVigStart);

  const rightVigW = Math.min(50, W * 0.22);
  fillEasedVignette(ctx, W, 0, W - rightVigW, 0, vigRgb, isDark ? 0.28 : 0.30, W - rightVigW, 0, rightVigW, H);

  const leftVigW = Math.min(22, W * 0.09);
  fillEasedVignette(ctx, 0, 0, leftVigW, 0, vigRgb, isDark ? 0.18 : 0.20, 0, 0, leftVigW, H);

  ctx.save();
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  [upBarTopY, upBarMidY, upBaseLineY, downBarTopY, downBarMidY, downBaseLineY].forEach((gy) => {
    const yLine = Math.round(gy) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(W, yLine);
    ctx.stroke();
  });
  ctx.restore();

  const setPos = (id, topPx) => {
    const el = document.getElementById(id);
    if (el) el.style.top = `${topPx}px`;
  };
  const safeUpMaxTop = Math.max(topClearY, upBarTopY - 11);
  const safeUpMidTop = Math.max(safeUpMaxTop + 13, upBarMidY - 11);
  const downHeaderEl = document.getElementById("dnet-down-header");
  const downClearY = downHeaderEl ? downHeaderY + Math.max(18, downHeaderEl.offsetHeight + 2) : downHeaderY + 18;
  const safeDownMaxTop = Math.max(downClearY, downBarTopY - 11);
  const safeDownMidTop = Math.max(safeDownMaxTop + 13, downBarMidY - 11);
  setPos("dnet-up-ymax-row", safeUpMaxTop);
  setPos("dnet-up-ymid-row", safeUpMidTop);
  setPos("dnet-up-x-row", Math.round(upBaseLineY + 7));
  setPos("dnet-down-header", downHeaderY);
  setPos("dnet-down-ymax-row", safeDownMaxTop);
  setPos("dnet-down-ymid-row", safeDownMidTop);
  setPos("dnet-down-x-row", Math.round(downBaseLineY + 7));

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setTxt("dnet-up-ymax", fmtRateTick(upMax));
  setTxt("dnet-up-ymid", fmtRateTick(upMax * 0.5));
  setTxt("dnet-up-xstart", history ? fmtClock(history.startTime) : "");
  setTxt("dnet-up-xend", history ? fmtClock(history.endTime) : "");
  setTxt("dnet-down-ymax", fmtRateTick(downMax));
  setTxt("dnet-down-ymid", fmtRateTick(downMax * 0.5));
  setTxt("dnet-down-xstart", history ? fmtClock(history.startTime) : "");
  setTxt("dnet-down-xend", history ? fmtClock(history.endTime) : "");
}

function renderDetailModal() {
  const modal = document.getElementById("detail-modal");
  const dialog = document.getElementById("detail-dialog");
  const node = state.nodes.find((n) => n.uuid === state.selectedNodeId);
  if (!node) {
    closeDetailModal();
    return;
  }

  clearTimeout(detailCloseTimer);
  detailChartHoverCol = -1;
  detailNetHover = { kind: null, col: -1 };
  ensureDetailHistory(node);
  const pingCount = detailHistory?.ping?.series?.length;
  if (pingCount === 0) {
    state.detailTab = "load";
    state.detailPingFocus = -1;
  } else if (state.detailPingFocus >= pingCount) {
    state.detailPingFocus = -1;
  }

  const ramPctVal = node.online && node.ramTotal > 0 ? (node.ramUsed / node.ramTotal * 100).toFixed(1) + '%' : "—";
  const hasQuota = node.trafficLimitTB > 0;
  const quotaPct = hasQuota ? Math.min(100, (node.trafficUsedTB / node.trafficLimitTB) * 100) : 0;
  const quotaPctColor = quotaPct >= 95 ? "var(--sg-danger)" : quotaPct >= 85 ? "var(--sg-warn)" : "var(--sg-subtle-fg)";

  const isZh = state.lang === "zh-CN";
  const pingTipTitle = isZh ? "点击单独查看该线路（再次点击恢复全部）" : "Click to isolate route (click again to show all)";
  const buildDetailLegendHtml = () => {
    const pf = state.detailPingFocus;
    const loadLegendHtml = `
      <div class="flex flex-wrap items-center gap-4 text-[11px]" style="color: var(--sg-muted-fg);">
        <span class="flex items-center gap-1.5"><span class="h-[7px] w-[7px] rounded-[1.5px]" style="background: var(--sg-series-cpu);"></span>CPU (%) · <strong class="mono-num" style="color: var(--sg-fg);">${node.online ? node.cpu.toFixed(1) + "%" : "—"}</strong></span>
        <span class="flex items-center gap-1.5"><span class="h-[7px] w-[7px] rounded-[1.5px]" style="background: var(--sg-series-ram);"></span>RAM (%) · <strong class="mono-num" style="color: var(--sg-fg);">${ramPctVal}</strong> <span class="mono-num text-[10.5px]" style="color: var(--sg-subtle-fg);">(${node.ramUsed.toFixed(1)} / ${node.ramTotal} GB)</span></span>
      </div>
    `;
    if (pingCount === 0) {
      return loadLegendHtml;
    }
    const pingPreview = pingSeries(detailHistory?.ping?.series ?? []);
    const canIsolate = pingPreview.length > 1;
    const renderPingChips = (interactive) => `
      <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
        ${pingPreview.map((sp, idx) => {
          const lossColor = sp.avgLoss >= 3 ? "var(--sg-danger)" : sp.avgLoss > 0 ? "var(--sg-warn)" : "var(--sg-subtle-fg)";
          const lossTxt = sp.avgLoss == null ? "—" : sp.avgLoss > 0
            ? (isZh ? `丢包 ${sp.avgLoss.toFixed(1)}%` : `${sp.avgLoss.toFixed(1)}% loss`)
            : (isZh ? "0% 丢包" : "0% loss");
          const latTxt = sp.latest?.value == null ? "—" : `${Math.round(sp.latest.value)}ms`;
          const inner = `
            <span class="h-[7px] w-[7px] rounded-[1.5px]" style="background: ${sp.swatch};"></span>
            <span>${escapeHtml(sp.name)} · <strong class="mono-num" style="color: var(--sg-fg);">${latTxt}</strong> · <span class="mono-num" style="color: ${lossColor};">${lossTxt}</span></span>
          `;
          if (!interactive || !canIsolate) {
            return `<span class="sg-legend-chip" style="${!canIsolate ? "cursor: default;" : ""}">${inner}</span>`;
          }
          return `
            <button type="button" class="sg-legend-chip" data-ping-focus="${idx}" data-focused="${pf === idx}" data-muted="${pf >= 0 && pf !== idx}" title="${pingTipTitle}">
              ${inner}
            </button>
          `;
        }).join("")}
      </div>
    `;
    // Grid overlay keeps #detail-legend-slot locked to Ping's exact height in both tabs at every viewport width
    return `
      <div class="grid items-start">
        <div class="col-start-1 row-start-1 invisible pointer-events-none select-none" aria-hidden="true">${renderPingChips(false)}</div>
        <div class="col-start-1 row-start-1">${state.detailTab === "load" ? loadLegendHtml : renderPingChips(true)}</div>
      </div>
    `;
  };
  const legendHtml = buildDetailLegendHtml();

  const hasBilling = Boolean(node.billingAmount || node.price) || node.expireDays !== null;
  const cycleLabel =
    node.billingCycleDays >= 360
      ? (isZh ? `年付 · ${node.billingCycleDays} 天` : `Yearly · ${node.billingCycleDays}d`)
      : node.billingCycleDays >= 85
        ? (isZh ? `季付 · ${node.billingCycleDays} 天` : `Quarterly · ${node.billingCycleDays}d`)
        : (isZh ? `月付 · ${node.billingCycleDays} 天` : `Monthly · ${node.billingCycleDays}d`);
  const expireBadgeColor =
    node.expireDays !== null && node.expireDays <= 0
      ? "var(--sg-danger)"
      : node.expireDays !== null && node.expireDays <= 7
        ? "var(--sg-warn)"
        : "var(--sg-subtle-fg)";
  const expireRemainTxt =
    node.expireDays === null
      ? ""
      : node.expireDays <= 0
        ? (isZh ? "已到期" : "Expired")
        : (isZh ? `剩 ${node.expireDays} 天` : `${node.expireDays}d left`);

  const sysRows = [];
  if (node.cpu_name) {
    sysRows.push([isZh ? "处理器" : "Processor", `<span class="block truncate" title="${escapeHtml(node.cpu_name)}">${escapeHtml(node.cpu_name)}</span>`]);
  }
  sysRows.push([
    isZh ? "核心" : "Cores",
    `<span class="mono-num">${
      node.physicalCores > 0
        ? (isZh ? `${node.cores} 逻辑 / ${node.physicalCores} 物理` : `${node.cores} Logical / ${node.physicalCores} Physical`)
        : (isZh ? `${node.cores} 核` : `${node.cores} Cores`)
    }</span>`,
  ]);
  if (node.os) {
    sysRows.push([isZh ? "操作系统" : "OS", `<span>${escapeHtml(node.os)}</span>`]);
  }
  if (node.kernel) {
    sysRows.push([isZh ? "内核" : "Kernel", `<span class="mono-num">${escapeHtml(node.kernel)}</span>`]);
  }
  if (node.arch || node.virt) {
    const archVirtVal = [node.arch, node.virt].filter(Boolean).join(" / ");
    const archVirtLbl = node.arch && node.virt
      ? (isZh ? "架构 / 虚拟化" : "Arch / Virt")
      : node.arch
        ? (isZh ? "架构" : "Arch")
        : (isZh ? "虚拟化" : "Virtualization");
    sysRows.push([archVirtLbl, `<span class="mono-num">${archVirtVal}</span>`]);
  }
  if (node.gpuName && node.gpuName !== "None") {
    sysRows.push(["GPU", `<span class="mono-num">${escapeHtml(node.gpuName)}</span>`]);
  }
  sysRows.push([
    node.swapTotalGB > 0 ? (isZh ? "内存 / 交换" : "RAM / Swap") : (isZh ? "内存" : "RAM"),
    `<span class="mono-num">${node.swapTotalGB > 0 ? `${node.ramTotal} GB / ${node.swapTotalGB} GB` : `${node.ramTotal} GB`}</span>`,
  ]);
  sysRows.push([
    isZh ? "负载 1m / 5m / 15m" : "Load 1m / 5m / 15m",
    `<span class="mono-num">${node.online ? `${node.load.toFixed(2)} / ${node.load5.toFixed(2)} / ${node.load15.toFixed(2)}` : "—"}</span>`,
  ]);
  if (node.temp > 0) {
    sysRows.push([isZh ? "温度" : "Temp", `<span class="mono-num">${node.online ? `${node.temp.toFixed(1)}°C` : "—"}</span>`]);
  }
  sysRows.push([
    node.tags.length > 0 ? (isZh ? "分组 / 标签" : "Group / Tags") : (isZh ? "分组" : "Group"),
    `<span class="inline-flex flex-wrap items-center justify-end gap-1"><span style="color: var(--sg-fg);">${escapeHtml(formatGroupLabel(normalizeGroupName(node.group)))}</span>${node.tags.map((tg) => `<span data-slot="tag" class="px-1.5 py-0 text-[10px] leading-[18px]">${escapeHtml(tg)}</span>`).join("")}</span>`,
  ]);

  // Full-width 4-column Billing & Renewal card (ONLY rendered when logged in AND node has billing data; separator-free like server cards)
  const billingCardHtml = state.loggedIn && hasBilling
    ? `
      <div class="sg-inset-pane mt-3 rounded-xl px-3.5 pt-3 pb-3.5">
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <span class="text-xs font-semibold tracking-tight">${isZh ? "续费信息" : "Billing & Renewal"}</span>
          ${node.region ? `<span class="mono-num text-[10px]" style="color: var(--sg-subtle-fg);">${escapeHtml(node.region)}</span>` : ""}
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div class="min-w-0">
            <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "续费周期" : "Cycle"}</div>
            <div class="mt-1 text-xs font-medium mono-num" style="color: var(--sg-fg);">${cycleLabel}</div>
          </div>
          <div class="min-w-0">
            <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "到期日" : "Expires"}</div>
            <div class="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs font-medium mono-num" style="color: var(--sg-fg);">
              <span>${escapeHtml(node.expiredDate || "—")}</span>
              ${expireRemainTxt ? `<span class="text-[10.5px] font-normal" style="color: ${expireBadgeColor};">${expireRemainTxt}</span>` : ""}
            </div>
          </div>
          <div class="min-w-0">
            <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "续费金额" : "Amount"}</div>
            <div class="mt-1 text-xs font-medium mono-num" style="color: var(--sg-fg);">${escapeHtml(formatPriceLabel(node.billingAmount || node.price) || "—")}</div>
          </div>
          <div class="min-w-0">
            <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "自动续期标记" : "Auto-Renewal"}</div>
            <div class="mt-1 inline-flex items-center gap-1.5 text-xs font-medium" style="color: ${node.autoRenewal ? "var(--sg-fg)" : "var(--sg-muted-fg)"};">
              <span class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${node.autoRenewal ? "var(--sg-success)" : "var(--sg-subtle-fg)"};"></span>
              <span>${node.autoRenewal ? (isZh ? "已标记" : "Enabled") : (isZh ? "未标记" : "Manual")}</span>
            </div>
          </div>
        </div>
      </div>
    `
    : "";

  const isPinned = isNodeFeatured(node);
  const detailPinActionHtml = state.loggedIn
    ? `
      <button id="btn-detail-pin" type="button" data-slot="button" data-variant="outline" data-pinned="${isPinned}" class="sg-pin-btn inline-flex h-[22px] shrink-0 items-center gap-1 px-2 text-[11px] font-medium" title="${isPinned ? (isZh ? "取消置顶" : "Unpin server") : (isZh ? "置顶服务器" : "Pin server")}">
        ${PIN_BTN_ICON_SVG}
        <span id="detail-pin-label">${isPinned ? (isZh ? "取消置顶" : "Unpin") : t("pinned")}</span>
      </button>
    `
    : (isPinned ? renderPinnedBadge(node.uuid, false) : "");

  const subtitleParts = [
    formatCityName(node.city),
    formatGroupLabel(normalizeGroupName(node.group)),
    [node.os, node.arch ? `(${node.arch})` : ""].filter(Boolean).join(" "),
  ].filter(Boolean);

  const chartHeaderLeftHtml = pingCount !== 0
    ? `
      <div data-slot="tabs-list" data-variant="default" class="h-8">
        <button type="button" data-slot="tabs-trigger" data-dtab="load" data-active="${state.detailTab === "load"}" class="px-2.5 text-xs">${t("loadTab")}</button>
        <button type="button" data-slot="tabs-trigger" data-dtab="ping" data-active="${state.detailTab === "ping"}" class="px-2.5 text-xs">${t("pingTab")}</button>
      </div>
    `
    : `<span class="inline-flex h-8 items-center text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">${t("loadTab")}</span>`;

  dialog.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          ${renderFlagBadge(node.region, "lg")}
          <h1 id="detail-title" class="min-w-0 truncate text-base font-semibold tracking-tight">${escapeHtml(node.name)}</h1>
          <span data-slot="badge" data-variant="secondary" class="shrink-0 px-2 py-0.5 text-[11px] mono-num" style="color: ${node.online ? "var(--sg-success)" : "var(--sg-danger)"};">
            <span class="h-[6px] w-[6px] rounded-[1.5px]" style="background: ${node.online ? "var(--sg-success)" : "var(--sg-danger)"};"></span>
            ${node.online ? t("online") : t("offline")}
          </span>
          ${detailPinActionHtml}
        </div>
        <div class="mt-1 truncate text-xs" style="color: var(--sg-muted-fg);">${escapeHtml(subtitleParts.join(" · "))}</div>
        ${node.public_remark ? `<div class="mt-0.5 truncate text-[11px]" style="color: var(--sg-subtle-fg);">${escapeHtml(node.public_remark)}</div>` : ""}
      </div>
      <button id="btn-close-detail" type="button" data-slot="button" data-variant="ghost" aria-label="关闭" autofocus class="inline-flex h-7 w-7 shrink-0 items-center justify-center">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <div class="sg-inset-pane rounded-lg p-2.5">
        <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "在线时长" : "Uptime"}</div>
        <div class="mt-1 text-sm font-semibold mono-num" style="color: ${node.online ? "var(--sg-fg)" : "var(--sg-muted-fg)"};">${node.online ? formatUptime(node.uptimeSec) : (isZh ? "离线" : "Offline")}</div>
      </div>
      <div class="sg-inset-pane rounded-lg p-2.5">
        <div class="flex items-center justify-between gap-1 text-[11px]" style="color: var(--sg-muted-fg);">
          <span>${hasQuota ? (isZh ? "月流量配额" : "Monthly Quota") : (isZh ? "累计流量" : "Total Traffic")}</span>
          ${hasQuota ? `<span class="mono-num text-[10px]" style="color: ${quotaPctColor};">${Math.round(quotaPct)}%</span>` : `<span class="text-[10px]" style="color: var(--sg-subtle-fg);">${isZh ? "不限" : "Unlimited"}</span>`}
        </div>
        <div class="mt-1 text-sm font-semibold mono-num">${hasQuota ? `${node.trafficUsedTB.toFixed(2)} / ${node.trafficLimitTB} TB` : formatTrafficGB(node.totalUpGB + node.totalDownGB)}</div>
      </div>
      <div class="sg-inset-pane rounded-lg p-2.5">
        <div class="text-[11px]" style="color: var(--sg-muted-fg);">Disk</div>
        <div class="mt-1 text-sm font-semibold mono-num">${node.diskUsed.toFixed(0)} / ${node.diskTotal} GB</div>
      </div>
      <div class="sg-inset-pane rounded-lg p-2.5">
        <div class="text-[11px]" style="color: var(--sg-muted-fg);">TCP / UDP / Proc</div>
        <div class="mt-1 text-sm font-semibold mono-num">${node.tcp} / ${node.udp} / ${node.proc}</div>
      </div>
    </div>

    <div id="detail-chart-card" class="km-load-chart sg-chart-inset relative mt-4 overflow-hidden rounded-xl">
      <canvas id="detail-slats-canvas" class="absolute inset-0 block h-full w-full cursor-crosshair" aria-hidden="true"></canvas>
      <div class="relative z-10 px-3.5 pt-3.5 pb-1">
        <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          ${chartHeaderLeftHtml}
          <div data-slot="tabs-list" data-variant="default" class="h-7 mono-num">
            ${[1, 6, 24].map((h) => `<button type="button" data-slot="tabs-trigger" data-dhours="${h}" data-active="${state.detailHours === h}" class="px-2 text-[11px]">${h}h</button>`).join("")}
          </div>
        </div>
        <div id="detail-legend-slot">${legendHtml}</div>
      </div>
      <div id="detail-plot-area" class="pointer-events-none relative z-10 h-[212px] w-full" style="min-height:${Math.max(212, 42 * (pingCount ?? 0) + 36)}px">
        <span id="detail-history-status" class="absolute inset-0 grid place-items-center text-xs empty:hidden" role="status" style="color: var(--sg-muted-fg);">${historyStatus(state.detailTab)}</span>
        <div id="detail-yticks" class="absolute inset-0"></div>
        <div id="detail-xticks" class="absolute inset-0"></div>
        <div id="detail-slats-tip" class="sg-popover pointer-events-none absolute z-20 hidden max-w-[calc(100%-16px)] flex-wrap items-center gap-y-0.5 rounded-md px-2 py-1 mono-num text-[10px]"></div>
      </div>
    </div>

    <div class="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-[1.06fr_1.18fr]">
      <!-- Left Card: Node Network & Traffic Micro Slats Chart (1:1 synced with homepage Network & Traffic depth) -->
      <div id="detail-net-cell" class="sg-chart-inset relative flex min-h-[320px] flex-col overflow-hidden rounded-xl">
        <canvas id="detail-net-canvas" class="absolute inset-0 block h-full w-full cursor-crosshair" aria-hidden="true"></canvas>

        <div id="dnet-top-header" class="pointer-events-none relative z-10 flex flex-col gap-1 px-3.5 pt-2.5">
          <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
              <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>${isZh ? "网络与流量" : "Network & Traffic"}</span>
            </span>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mono-num text-[10px]" style="color: var(--sg-subtle-fg);">
              <span class="whitespace-nowrap">↑ <strong class="font-medium" style="color: var(--sg-fg);">${formatTrafficGB(node.totalUpGB)}</strong></span>
              <span class="whitespace-nowrap">↓ <strong class="font-medium" style="color: var(--sg-fg);">${formatTrafficGB(node.totalDownGB)}</strong></span>
            </div>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span class="whitespace-nowrap text-[10.5px]" style="color: var(--sg-muted-fg);">↑ ${isZh ? "上行" : "Upload"}</span>
            ${(() => { const p = formatRateParts(node.online ? node.netOut : 0); return `<span class="mono-num whitespace-nowrap text-[11.5px] font-semibold">${p.value} <span class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);">${p.unit}</span></span>`; })()}
          </div>
        </div>

        <div id="dnet-up-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-up-ymax"></span></div>
        <div id="dnet-up-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-up-ymid"></span></div>
        <div id="dnet-up-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-3.5 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="dnet-up-xstart"></span>
          <span id="dnet-up-xend"></span>
        </div>

        <div id="dnet-down-header" class="pointer-events-none absolute inset-x-0 z-10 flex items-baseline justify-between gap-2 px-3.5">
          <span class="text-[10.5px]" style="color: var(--sg-muted-fg);">↓ ${isZh ? "下行" : "Download"}</span>
          ${(() => { const p = formatRateParts(node.online ? node.netIn : 0); return `<span class="mono-num text-[11.5px] font-semibold">${p.value} <span class="text-[9.5px] font-normal" style="color: var(--sg-subtle-fg);">${p.unit}</span></span>`; })()}
        </div>

        <div id="dnet-down-ymax-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-down-ymax"></span></div>
        <div id="dnet-down-ymid-row" class="pointer-events-none absolute inset-x-0 z-10 px-3.5 text-right mono-num text-[9px] leading-tight" style="color: var(--sg-tick-fg); text-shadow: var(--sg-tick-shadow);"><span id="dnet-down-ymid"></span></div>
        <div id="dnet-down-x-row" class="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-3.5 mono-num text-[9px] leading-none" style="color: var(--sg-subtle-fg); text-shadow: var(--sg-tick-shadow);">
          <span id="dnet-down-xstart"></span>
          <span id="dnet-down-xend"></span>
        </div>

        <div id="dnet-tip" class="sg-popover pointer-events-none absolute z-20 hidden rounded-md px-1.5 py-0.5 mono-num text-[9.5px] whitespace-nowrap"></div>
      </div>

      <!-- Right Card: System Info Spec Card (Bright top header slab + recessed rounded-rect shadow body, zero row separators) -->
      <div class="sg-spec-shell flex flex-col overflow-hidden rounded-xl">
        <div class="flex items-center justify-between px-3.5 py-2.5">
          <span class="text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">${isZh ? "系统信息" : "System Info"}</span>
          ${node.arch ? `<span class="mono-num text-[10px]" style="color: var(--sg-subtle-fg);">${escapeHtml(node.arch)}</span>` : ""}
        </div>
        <div class="flex flex-1 flex-col px-1.5 pb-1.5">
          <div class="sg-spec-body flex-1 space-y-0.5 rounded-[9px] p-1.5">
            ${sysRows
              .map(
                ([k, v]) => `
                  <div class="sg-spec-row flex items-center justify-between gap-3 px-2 py-1.5 text-xs">
                    <span class="shrink-0" style="color: var(--sg-muted-fg);">${k}</span>
                    <span class="min-w-0 text-right font-medium" style="color: var(--sg-fg);">${v}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>

    ${billingCardHtml}
  `;

  if (!modal.open) {
    modal.setAttribute("data-open", "false");
    modal.showModal();
    void dialog.offsetWidth;
    requestAnimationFrame(() => {
      if (state.selectedNodeId && modal.open) {
        modal.setAttribute("data-open", "true");
      }
    });
  } else {
    modal.setAttribute("data-open", "true");
  }

  const detailCanvas = document.getElementById("detail-slats-canvas");
  const detailTip = document.getElementById("detail-slats-tip");
  if (detailCanvas && detailTip) {
    detailCanvas.addEventListener("mousemove", (evt) => {
      const meta = detailChartMeta;
      if (!meta) return;
      const r = detailCanvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const mx = ((evt.clientX - r.left) * meta.W) / r.width;
      const my = ((evt.clientY - r.top) * meta.H) / r.height;
      const inY = my >= meta.gridTopY - 8 && my <= meta.gridBottomY + 8;

      let activeIdx = -1;
      let anchorX = mx;

      if (inY && mx >= 0 && mx <= meta.W) {
        const c = Math.floor((mx - meta.originX) / meta.pitchX);
        if (c >= meta.plotColStart && c <= meta.plotColEnd) {
          activeIdx = c - meta.plotColStart;
          anchorX = meta.originX + c * meta.pitchX + meta.slatW * 0.5;
        }
      }

      if (activeIdx >= 0) {
        if (detailChartHoverCol !== activeIdx) {
          detailChartHoverCol = activeIdx;
          drawDetailSlatsChartCanvas();
        }
        const timeTxt = fmtClock(meta.times[activeIdx]);
        const itemsHtml = meta.seriesDefs
          .map((s) => {
            const v = s.values[activeIdx];
            const loss = Array.isArray(s.losses) ? s.losses[activeIdx] : 0;
            if (meta.unit === "%") {
              return `<span class="inline-flex items-center gap-1"><span class="inline-block h-[6px] w-[6px] rounded-[1.5px]" style="background:${s.swatch};"></span><span style="color:var(--sg-muted-fg);">${s.label}</span> <strong>${v === null ? "—" : v.toFixed(1) + "%"}</strong></span>`;
            }
            if (loss >= 100) {
              const timeoutTxt = state.lang === "zh-CN" ? "超时 100%" : "Timeout 100%";
              return `<span class="inline-flex items-center gap-1"><span class="inline-block h-[6px] w-[6px] rounded-[1.5px]" style="background:var(--sg-danger);"></span><span style="color:var(--sg-muted-fg);">${escapeHtml(s.label)}</span> <strong style="color:var(--sg-danger);">${timeoutTxt}</strong></span>`;
            }
            const lossSuffix = loss > 0
              ? ` <span style="color:var(--sg-danger);">(${state.lang === "zh-CN" ? "丢包" : "loss"} ${loss}%)</span>`
              : "";
            return `<span class="inline-flex items-center gap-1"><span class="inline-block h-[6px] w-[6px] rounded-[1.5px]" style="background:${s.swatch};"></span><span style="color:var(--sg-muted-fg);">${escapeHtml(s.label)}</span> <strong>${v === null ? "—" : Math.round(v) + "ms"}</strong>${lossSuffix}</span>`;
          })
          .join('<span class="mx-1 opacity-40">·</span>');
        detailTip.innerHTML = `<span style="color:var(--sg-subtle-fg);">${timeTxt}</span><span class="mx-1.5 opacity-40">|</span>${itemsHtml}`;
        detailTip.style.transform = "none";
        detailTip.classList.remove("hidden");
        detailTip.classList.add("inline-flex");
        const tipW = detailTip.offsetWidth || 160;
        const preferredLeft = anchorX > meta.W * 0.56 ? anchorX - tipW - 6 : anchorX + 6;
        const clampedLeft = Math.max(8, Math.min(meta.W - tipW - 8, preferredLeft));
        detailTip.style.left = `${Math.round(clampedLeft)}px`;
        detailTip.style.top = `${Math.max(4, Math.round(meta.gridTopY - meta.plotBoxTop - 2))}px`;
      } else if (detailChartHoverCol !== -1) {
        detailChartHoverCol = -1;
        detailTip.classList.add("hidden");
        detailTip.classList.remove("inline-flex");
        drawDetailSlatsChartCanvas();
      }
    });
    detailCanvas.addEventListener("mouseleave", () => {
      if (detailChartHoverCol !== -1) {
        detailChartHoverCol = -1;
        drawDetailSlatsChartCanvas();
      }
      detailTip.classList.add("hidden");
      detailTip.classList.remove("inline-flex");
    });
  }

  const dnetCanvas = document.getElementById("detail-net-canvas");
  const dnetTip = document.getElementById("dnet-tip");
  if (dnetCanvas && dnetTip) {
    dnetCanvas.addEventListener("mousemove", (evt) => {
      const meta = detailNetMeta;
      if (!meta) return;
      const r = dnetCanvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const mx = ((evt.clientX - r.left) * meta.rectW) / r.width;
      const my = ((evt.clientY - r.top) * meta.rectH) / r.height;
      const c = Math.floor((mx - meta.originX) / meta.pitchX);
      const rowIdx = Math.floor((my - meta.originY) / meta.pitchY);
      const inUp = rowIdx >= 0 && rowIdx <= meta.upBaseRow;
      const inDown = rowIdx > meta.splitRow && rowIdx <= meta.downBaseRow;
      if (c >= 0 && c < meta.cols && (inUp || inDown)) {
        const isUp = inUp;
        const kind = isUp ? "up" : "down";
        if (detailNetHover.kind !== kind || detailNetHover.col !== c) {
          detailNetHover = { kind, col: c };
          drawDetailNetSlatsCanvas();
        }
        const val = isUp ? meta.upSamples[c] : meta.downSamples[c];
        const ts = meta.times[c];
        const arrow = isUp ? "↑" : "↓";
        dnetTip.textContent = `${ts || "—"} · ${arrow} ${val == null ? "—" : formatRate(val)}`;
        dnetTip.style.transform = "none";
        dnetTip.classList.remove("hidden");
        const tipW = dnetTip.offsetWidth || 120;
        const barCenterX = meta.originX + c * meta.pitchX + meta.slatW * 0.5;
        const preferredLeft = barCenterX > meta.rectW * 0.58 ? barCenterX - tipW - 6 : barCenterX + 6;
        const clampedLeft = Math.max(8, Math.min(meta.rectW - tipW - 8, preferredLeft));
        dnetTip.style.left = `${Math.round(clampedLeft)}px`;
        dnetTip.style.top = isUp
          ? `${Math.max(46, Math.round(meta.upBarTopY - 4))}px`
          : `${Math.max(meta.downHeaderY + 20, Math.round(meta.downBarTopY - 4))}px`;
      } else if (detailNetHover.kind !== null) {
        detailNetHover = { kind: null, col: -1 };
        dnetTip.classList.add("hidden");
        drawDetailNetSlatsCanvas();
      }
    });
    dnetCanvas.addEventListener("mouseleave", () => {
      if (detailNetHover.kind !== null) {
        detailNetHover = { kind: null, col: -1 };
        drawDetailNetSlatsCanvas();
      }
      dnetTip.classList.add("hidden");
    });
  }

  drawDetailSlatsChartCanvas();
  drawDetailNetSlatsCanvas();
  requestAnimationFrame(() => {
    drawDetailSlatsChartCanvas();
    drawDetailNetSlatsCanvas();
  });

  const bindPingFocusButtons = () => {
    dialog.querySelectorAll("[data-ping-focus]").forEach((b) => {
      b.addEventListener("click", () => {
        const idx = Number(b.getAttribute("data-ping-focus"));
        state.detailPingFocus = state.detailPingFocus === idx ? -1 : idx;
        const pf = state.detailPingFocus;
        dialog.querySelectorAll("[data-ping-focus]").forEach((chip) => {
          const cIdx = Number(chip.getAttribute("data-ping-focus"));
          chip.setAttribute("data-focused", String(pf === cIdx));
          chip.setAttribute("data-muted", String(pf >= 0 && pf !== cIdx));
        });
        detailChartHoverCol = -1;
        if (detailTip) {
          detailTip.classList.add("hidden");
          detailTip.classList.remove("inline-flex");
        }
        drawDetailSlatsChartCanvas();
      });
    });
  };

  const syncDetailChartInPlace = (rebuildLegend) => {
    dialog.querySelectorAll("[data-dtab]").forEach((b) => {
      b.setAttribute("data-active", String(b.getAttribute("data-dtab") === state.detailTab));
    });
    dialog.querySelectorAll("[data-dhours]").forEach((b) => {
      b.setAttribute("data-active", String(Number(b.getAttribute("data-dhours")) === state.detailHours));
    });
    if (rebuildLegend) {
      const slot = document.getElementById("detail-legend-slot");
      if (slot) {
        slot.innerHTML = buildDetailLegendHtml();
        bindPingFocusButtons();
      }
    }
    detailChartHoverCol = -1;
    if (detailTip) {
      detailTip.classList.add("hidden");
      detailTip.classList.remove("inline-flex");
    }
    document.getElementById("detail-history-status").textContent = historyStatus(state.detailTab);
    drawDetailSlatsChartCanvas();
  };

  document.getElementById("btn-close-detail").addEventListener("click", () => {
    closeDetailModal();
  });
  const detailPinBtn = document.getElementById("btn-detail-pin");
  if (detailPinBtn) {
    detailPinBtn.addEventListener("click", () => {
      togglePinnedNode(node.uuid);
      const nowPinned = isNodeFeatured(node);
      detailPinBtn.setAttribute("data-pinned", String(nowPinned));
      const lblEl = document.getElementById("detail-pin-label");
      if (lblEl) lblEl.textContent = nowPinned ? (isZh ? "取消置顶" : "Unpin") : t("pinned");
      detailPinBtn.setAttribute("title", nowPinned ? (isZh ? "取消置顶" : "Unpin server") : (isZh ? "置顶服务器" : "Pin server"));
    });
  }
  dialog.querySelectorAll("[data-dtab]").forEach((b) => {
    b.addEventListener("click", () => {
      const nextTab = b.getAttribute("data-dtab");
      if (state.detailTab === nextTab) return;
      state.detailTab = nextTab;
      syncDetailChartInPlace(true);
    });
  });
  dialog.querySelectorAll("[data-dhours]").forEach((b) => {
    b.addEventListener("click", () => {
      const nextHours = Number(b.getAttribute("data-dhours"));
      if (state.detailHours === nextHours) return;
      state.detailHours = nextHours;
      renderDetailModal();
    });
  });
  bindPingFocusButtons();
}

function renderAll() {
  renderHeader();
  renderOverviewLayout();
  renderSummary();
  renderEventFeed();
  renderGroups();
  renderNodes();
  requestAnimationFrame(() => {
    renderMapMarkers();
    drawNetSlatsChartCanvas();
  });
  if (state.selectedNodeId) renderDetailModal();
}

// ---- Event Listeners ----
document.querySelectorAll("#theme-tabs [data-appearance]").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.appearance = tab.getAttribute("data-appearance");
    storePreferences();
    renderAll();
  });
});

if (mediaDark && mediaDark.addEventListener) {
  mediaDark.addEventListener("change", () => {
    if (state.appearance === "system") renderAll();
  });
}

document.getElementById("btn-view-card").addEventListener("click", () => { state.view = "card"; renderAll(); });
document.getElementById("btn-view-table").addEventListener("click", () => { state.view = "table"; renderAll(); });
document.getElementById("btn-lang").addEventListener("click", () => {
  state.lang = state.lang === "zh-CN" ? "en" : "zh-CN";
  storePreferences();
  renderAll();
});
document.getElementById("btn-online-only").addEventListener("click", () => { state.onlyOnline = !state.onlyOnline; renderAll(); });
document.getElementById("search-input").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderNodes();
  renderMapMarkers();
});

// Integrated View Display Options Popover & Custom Solid Glass Select (mutually exclusive with Admin menu)
document.getElementById("btn-view-options").addEventListener("click", (e) => {
  e.stopPropagation();
  state.viewOptionsOpen = !state.viewOptionsOpen;
  if (state.viewOptionsOpen) {
    if (state.sortMenuOpen) { state.sortMenuOpen = false; renderSortSelect(); }
    if (state.adminMenuOpen) { state.adminMenuOpen = false; renderHeader(); }
  }
  renderViewOptionsMenu();
});
document.getElementById("sort-select-trigger").addEventListener("click", (e) => {
  e.stopPropagation();
  state.sortMenuOpen = !state.sortMenuOpen;
  if (state.sortMenuOpen) {
    if (state.viewOptionsOpen) { state.viewOptionsOpen = false; renderViewOptionsMenu(); }
    if (state.adminMenuOpen) { state.adminMenuOpen = false; renderHeader(); }
  }
  renderSortSelect();
});

// Native <dialog> Right Drawer handlers (Escape via cancel, light-dismiss outside sheet)
const managedDrawerEl = document.getElementById("managed-drawer");
const managedDrawerPanelEl = document.getElementById("managed-drawer-panel");
document.getElementById("btn-managed").addEventListener("click", (e) => {
  e.stopPropagation();
  setDrawerOpen(!state.drawerOpen);
});
document.getElementById("btn-drawer-close").addEventListener("click", () => setDrawerOpen(false));
managedDrawerEl.addEventListener("cancel", (e) => {
  if (e.cancelable) {
    e.preventDefault();
    setDrawerOpen(false);
  }
});
managedDrawerEl.addEventListener("close", () => {
  state.drawerOpen = false;
  managedDrawerEl.setAttribute("data-open", "false");
  document.getElementById("btn-managed").setAttribute("aria-expanded", "false");
});
let drawerPressedOutside = false;
managedDrawerEl.addEventListener("pointerdown", (e) => {
  drawerPressedOutside = !managedDrawerPanelEl.contains(e.target);
});
managedDrawerEl.addEventListener("pointerup", (e) => {
  if (drawerPressedOutside && !managedDrawerPanelEl.contains(e.target)) {
    setDrawerOpen(false);
  }
  drawerPressedOutside = false;
});

// Native <dialog> Detail Modal handlers (animated Alert-Dialog Esc + backdrop light-dismiss)
const detailModalEl = document.getElementById("detail-modal");
const detailCardEl = document.getElementById("detail-dialog");
detailModalEl.addEventListener("cancel", (e) => {
  if (e.cancelable) {
    e.preventDefault();
    closeDetailModal();
  }
});
detailModalEl.addEventListener("close", () => {
  state.selectedNodeId = null;
  detailHistory?.controller.abort();
  detailHistory = undefined;
  detailModalEl.setAttribute("data-open", "false");
  detailModalEl.returnValue = "";
});
let detailPressedOutside = false;
const isOutsideEl = (e, el) => {
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};
detailModalEl.addEventListener("pointerdown", (e) => {
  detailPressedOutside = isOutsideEl(e, detailCardEl);
});
detailModalEl.addEventListener("pointerup", (e) => {
  if (detailPressedOutside && isOutsideEl(e, detailCardEl)) {
    closeDetailModal();
  }
  detailPressedOutside = false;
});

// Auth Modal (Login Alert Dialog) + Komari Admin Gear Menu handlers
const authModalEl = document.getElementById("auth-modal");
const authDialogEl = document.getElementById("auth-dialog");
let authCloseTimer = 0;

function openAuthModal() {
  clearTimeout(authCloseTimer);
  if (!authModalEl.open) {
    authModalEl.setAttribute("data-open", "false");
    authModalEl.showModal();
    void authDialogEl.offsetWidth;
    requestAnimationFrame(() => {
      if (authModalEl.open) authModalEl.setAttribute("data-open", "true");
    });
  } else {
    authModalEl.setAttribute("data-open", "true");
  }
}

function closeAuthModal() {
  if (!authModalEl.open) return;
  authModalEl.setAttribute("data-open", "false");
  clearTimeout(authCloseTimer);
  authCloseTimer = setTimeout(() => {
    if (authModalEl.getAttribute("data-open") === "false" && authModalEl.open) {
      authModalEl.close();
    }
  }, 170);
}

document.getElementById("btn-auth").addEventListener("click", (e) => {
  e.stopPropagation();
  if (!state.loggedIn) {
    openAuthModal();
  } else {
    state.adminMenuOpen = !state.adminMenuOpen;
    if (state.adminMenuOpen) {
      if (state.sortMenuOpen) { state.sortMenuOpen = false; renderSortSelect(); }
      if (state.viewOptionsOpen) { state.viewOptionsOpen = false; renderViewOptionsMenu(); }
    }
    renderHeader();
  }
});
document.getElementById("btn-auth-close").addEventListener("click", () => closeAuthModal());
document.getElementById("btn-auth-cancel").addEventListener("click", () => closeAuthModal());
authDialogEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = document.getElementById("btn-auth-submit");
  const error = document.getElementById("auth-error");
  const otp = document.getElementById("auth-otp");
  error.textContent = "";
  submit.disabled = true;
  try {
    const { status } = await login({
      username: document.getElementById("auth-user").value,
      password: document.getElementById("auth-pass").value,
      twoFactorCode: otp.value,
    });
    if (status === 'success') {
      await refreshDashboard();
      closeAuthModal();
    } else {
      document.getElementById("auth-otp-field").hidden = false;
      if (status === '2fa_invalid') error.textContent = bilingual("验证码无效", "Invalid two-factor code");
      otp.focus();
    }
  } catch {
    error.textContent = bilingual("登录失败，请确认账号和密码后重试。", "Sign-in failed. Check your credentials and try again.");
  } finally {
    submit.disabled = false;
  }
});
authModalEl.addEventListener("cancel", (e) => {
  if (e.cancelable) {
    e.preventDefault();
    closeAuthModal();
  }
});
authModalEl.addEventListener("close", () => {
  authModalEl.setAttribute("data-open", "false");
  authModalEl.returnValue = "";
  authDialogEl.reset();
  document.getElementById("auth-otp-field").hidden = true;
  document.getElementById("auth-error").textContent = "";
});
let authPressedOutside = false;
authModalEl.addEventListener("pointerdown", (e) => {
  authPressedOutside = isOutsideEl(e, authDialogEl);
});
authModalEl.addEventListener("pointerup", (e) => {
  if (authPressedOutside && isOutsideEl(e, authDialogEl)) {
    closeAuthModal();
  }
  authPressedOutside = false;
});
document.getElementById("btn-goto-admin").addEventListener("click", () => location.assign("/admin"));
document.getElementById("btn-logout").addEventListener("click", async () => {
  try {
    await logout();
    await refreshDashboard();
  } catch {
    window.alert(bilingual("退出登录失败，请重试。", "Sign-out failed. Try again."));
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.sortMenuOpen) {
      state.sortMenuOpen = false;
      renderSortSelect();
    }
    if (state.viewOptionsOpen) {
      state.viewOptionsOpen = false;
      renderViewOptionsMenu();
    }
    if (state.adminMenuOpen) {
      state.adminMenuOpen = false;
      renderHeader();
    }
  }
});

document.addEventListener("click", (e) => {
  const sortRoot = document.getElementById("sort-select-root");
  if (state.sortMenuOpen && sortRoot && !sortRoot.contains(e.target)) {
    state.sortMenuOpen = false;
    renderSortSelect();
  }
  const viewRoot = document.getElementById("view-tabs-root");
  if (state.viewOptionsOpen && viewRoot && !viewRoot.contains(e.target)) {
    state.viewOptionsOpen = false;
    renderViewOptionsMenu();
  }
  const authRoot = document.getElementById("auth-control-root");
  if (state.adminMenuOpen && authRoot && !authRoot.contains(e.target)) {
    state.adminMenuOpen = false;
    renderHeader();
  }
  const mapTooltip = document.getElementById("map-tooltip");
  if (state.pinnedClusterKey && !mapTooltip.contains(e.target)) {
    state.pinnedClusterKey = null;
    mapTooltip.classList.add("hidden");
    drawWorldMapCanvas();
  }
});

// rAF-throttled resize to avoid redundant canvas re-rasterization
let resizeRaf = 0;
window.addEventListener("resize", () => {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    drawWorldMapCanvas();
    drawNetSlatsChartCanvas();
    if (state.selectedNodeId) {
      drawDetailSlatsChartCanvas();
      drawDetailNetSlatsCanvas();
    }
    if (state.viewOptionsOpen) clampMenuInViewport(document.getElementById("view-tabs-root"), document.getElementById("view-options-menu"));
    if (state.sortMenuOpen) clampMenuInViewport(document.getElementById("sort-select-root"), document.getElementById("sort-select-menu"));
    if (state.loggedIn && state.adminMenuOpen) clampMenuInViewport(document.getElementById("auth-control-root"), document.getElementById("admin-menu"));
  });
});


// ---- Custom Hero Slogan + Continuous React Bits Shuffle Morph ("N个节点离线" -> Custom Slogan) ----
// Exact tuned Shuffle params: shuffleDirection="up", animationMode="random", duration=0.9s,
// maxDelay=0.45s, scrambleCharset="qertyuiopasdfhjklzxcvbn", motionBlur=true,
// shuffleTimes=2, ease="expo.out", triggerOnHover=false (keeps System font & smoky ink)
const heroWordmarkCtrl = {
  runId: 0,
  holdTimer: 0,
  rafId: 0,
};

function getConfiguredHeroTitle() {
  const raw = (state.settings.hero_title || "").trim();
  return raw || "Komari Pane";
}

function getOfflineAlertText(offlineCount) {
  if (state.lang === "en") {
    return `${offlineCount} ${offlineCount === 1 ? "Node" : "Nodes"} Offline`;
  }
  return `${offlineCount}个节点离线`;
}

function clearHeroWordmarkTimers() {
  heroWordmarkCtrl.runId += 1;
  if (heroWordmarkCtrl.holdTimer) {
    clearTimeout(heroWordmarkCtrl.holdTimer);
    heroWordmarkCtrl.holdTimer = 0;
  }
  if (heroWordmarkCtrl.rafId) {
    cancelAnimationFrame(heroWordmarkCtrl.rafId);
    heroWordmarkCtrl.rafId = 0;
  }
  return heroWordmarkCtrl.runId;
}

function renderStaticHeroWordmark(text, isAlert = false) {
  const el = document.getElementById("hero-wordmark");
  const defs = document.getElementById("sg-shuffle-defs");
  if (!el) return;
  el.innerHTML = "";
  if (defs) defs.innerHTML = "";
  el.setAttribute("aria-label", text);

  const cls = isAlert ? "sg-hero-wordmark-alert" : "sg-hero-wordmark-ink";
  Array.from(text).forEach((char) => {
    if (char === " ") {
      const sp = document.createElement("span");
      sp.className = "sg-shuffle-space";
      sp.innerHTML = "&nbsp;";
      el.appendChild(sp);
      return;
    }
    const cell = document.createElement("span");
    cell.className = "sg-shuffle-cell";
    const track = document.createElement("span");
    track.className = "sg-shuffle-track";
    const glyph = document.createElement("span");
    glyph.className = `sg-shuffle-glyph ${cls}`;
    glyph.textContent = char;
    track.appendChild(glyph);
    cell.appendChild(track);
    el.appendChild(cell);
  });
}

// Measure exact center-relative X coordinates for every non-space character so morph has ZERO flexbox reflow jitter
function measureHeroLayout(el, text) {
  const style = getComputedStyle(el);
  const fontSizePx = parseFloat(style.fontSize) || 48;
  const spacePx = fontSizePx * 0.42;
  const marginHalfPx = fontSizePx * 0.055;

  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;white-space:pre;line-height:1;";
  el.appendChild(probe);

  const cache = new Map();
  const getW = (ch) => {
    if (ch === " ") return spacePx;
    if (cache.has(ch)) return cache.get(ch);
    probe.textContent = ch;
    const w = probe.getBoundingClientRect().width;
    cache.set(ch, w);
    return w;
  };

  const glyphs = [];
  let cursor = 0;
  for (const ch of Array.from(text)) {
    const w = getW(ch);
    const centerX = cursor + marginHalfPx + w * 0.5;
    cursor += w + marginHalfPx * 2;
    if (ch !== " ") {
      glyphs.push({ char: ch, w, centerX });
    }
  }
  probe.remove();

  const halfTotal = cursor * 0.5;
  for (const g of glyphs) g.centerX -= halfTotal;
  return { glyphs, totalWidth: cursor, fontSizePx };
}

// In-Flow Anchor + Out-of-Flow Echo React Bits Shuffle Engine:
// 1. Each permanent target glyph (.sg-shuffle-glyph) sits IN NORMAL FLOW at y=0 inside .sg-shuffle-track,
//    with constant base identity `translate: 0px` on both .sg-shuffle-cell and .sg-shuffle-track
//    (stacking context, clip-path, and box height NEVER change during or after animation).
// 2. Temporary scramble/source glyphs (.sg-shuffle-echo) are out-of-flow `position: absolute` above y=0
//    spaced at exact integer pixel stride `slotStepPx` (0.000px subpixel accumulation, zero descender bleed).
// 3. Shared discrete SVG blur steps (like official React Bits Shuffle) detach `filter` as soon as velocity
//    settles (u >= 0.50, while still in motion), eliminating offscreen filter surface snapping on late chars.
// 4. Exact C^4 `quintOut` curve reaches <0.15px by u=0.75 and exact 0.000px at u=1 without expoOut's 350ms droop.
function runHeroShuffleTransition(fromText, toText, runId, holdBeforeMorphMs = 0) {
  const el = document.getElementById("hero-wordmark");
  const defs = document.getElementById("sg-shuffle-defs");
  if (!el || runId !== heroWordmarkCtrl.runId) return;

  const charset = "qertyuiopasdfhjklzxcvbn";
  const narrowCharset = "ijlrtf";
  const shuffleTimes = 2;
  const durationMs = 780;
  const maxDelayMs = 340;
  const motionBlur = true;
  const BLUR_STEPS = 10;
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    if (fromText && holdBeforeMorphMs > 0) {
      renderStaticHeroWordmark(fromText, true);
      heroWordmarkCtrl.holdTimer = setTimeout(() => {
        heroWordmarkCtrl.holdTimer = 0;
        if (runId !== heroWordmarkCtrl.runId) return;
        renderStaticHeroWordmark(toText, false);
      }, holdBeforeMorphMs);
    } else {
      renderStaticHeroWordmark(toText, false);
    }
    return;
  }

  const pickRandomFrom = (pool, exclude) => {
    let ch = pool[Math.floor(Math.random() * pool.length)];
    while (ch === exclude && pool.length > 1) {
      ch = pool[Math.floor(Math.random() * pool.length)];
    }
    return ch;
  };

  const isMorph = Boolean(fromText);
  const svgNS = "http://www.w3.org/2000/svg";
  const quintOut = (u) => (u >= 1 ? 1 : 1 - Math.pow(1 - u, 5));
  const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  el.innerHTML = "";
  if (defs) defs.innerHTML = "";
  el.setAttribute("aria-label", isMorph ? fromText : toText);

  if (motionBlur && defs) {
    const blurMax = 5.2;
    for (let k = 1; k <= BLUR_STEPS; k++) {
      const filter = document.createElementNS(svgNS, "filter");
      filter.setAttribute("id", `sg-shuffle-blur-${runId}-${k}`);
      filter.setAttribute("x", "-15%");
      filter.setAttribute("y", "-90%");
      filter.setAttribute("width", "130%");
      filter.setAttribute("height", "280%");
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const blur = document.createElementNS(svgNS, "feGaussianBlur");
      const amount = (blurMax * Math.pow(k / BLUR_STEPS, 1.4)).toFixed(2);
      blur.setAttribute("stdDeviation", `0 ${amount}`);
      filter.appendChild(blur);
      defs.appendChild(filter);
    }
  }

  const fromG = isMorph ? measureHeroLayout(el, fromText).glyphs : [];

  // 1) Render permanent responsive flex cells with real in-flow target glyphs at y=0
  const toCells = [];
  Array.from(toText).forEach((char) => {
    if (char === " ") {
      const sp = document.createElement("span");
      sp.className = "sg-shuffle-space";
      sp.innerHTML = "&nbsp;";
      el.appendChild(sp);
      return;
    }
    const cell = document.createElement("span");
    cell.className = "sg-shuffle-cell";
    const track = document.createElement("span");
    track.className = "sg-shuffle-track";
    const glyph = document.createElement("span");
    glyph.className = "sg-shuffle-glyph sg-hero-wordmark-ink";
    glyph.textContent = char;
    track.appendChild(glyph);
    cell.appendChild(track);
    el.appendChild(cell);
    toCells.push({ char, cell, track });
  });

  const stageRect = el.getBoundingClientRect();
  const stageMidX = stageRect.left + stageRect.width * 0.5;
  const cellH = stageRect.height || (parseFloat(getComputedStyle(el).fontSize) || 48) * 1.08;
  // Exact integer pixel stride guarantees 0.000px subpixel drift and keeps upper descenders clear of top clip
  const slotStepPx = Math.max(1, Math.ceil(cellH * 1.18));

  toCells.forEach((entry) => {
    const r = entry.cell.getBoundingClientRect();
    entry.centerX = r.left + r.width * 0.5 - stageMidX;
    entry.w = r.width;
  });

  const m = fromG.length;
  const n = toCells.length;
  const pairCount = isMorph ? Math.min(m, n) : 0;
  const fromStart = Math.floor((m - pairCount) / 2);
  const toStart = Math.floor((n - pairCount) / 2);
  const maxAbsToX = Math.max(1, ...toCells.map((g) => Math.abs(g.centerX)));
  const maxAbsFromX = Math.max(1, ...fromG.map((g) => Math.abs(g.centerX)));

  const actors = [];

  const populateEchoes = (track, upperSlots) => {
    const steps = Math.max(1, upperSlots.length);
    const echoNodes = [];
    upperSlots.forEach(({ glyph, isAlert }, idx) => {
      const echo = document.createElement("span");
      echo.className = "sg-shuffle-echo";
      echo.style.top = `${-(steps - idx) * slotStepPx}px`;
      if (glyph) {
        const inner = document.createElement("span");
        inner.className = `sg-shuffle-glyph ${isAlert ? "sg-hero-wordmark-alert" : "sg-hero-wordmark-ink"}`;
        inner.textContent = glyph;
        echo.appendChild(inner);
      }
      track.insertBefore(echo, track.firstChild);
      echoNodes.push(echo);
    });
    const startY = steps * slotStepPx;
    track.style.translate = `0px ${startY}px`;
    return { echoNodes, startY, blurLevel: 0 };
  };

  // 2) Configure upper scramble echoes + FLIP starting X offsets on every permanent cell
  toCells.forEach((entry, i) => {
    const pool = "ijlrtfI1|.,!:".includes(entry.char) ? narrowCharset : charset;
    let prev = entry.char.toLowerCase();

    if (!isMorph) {
      const upperSlots = [];
      for (let s = 0; s <= shuffleTimes; s++) {
        const next = pickRandomFrom(pool, prev);
        upperSlots.push({ glyph: next, isAlert: false });
        prev = next;
      }
      const built = populateEchoes(entry.track, upperSlots);
      actors.push({
        kind: "direct",
        cell: entry.cell,
        track: entry.track,
        ...built,
        startDx: 0,
        delayMs: Math.random() * maxDelayMs,
        reelDurationMs: durationMs,
        done: false,
      });
      return;
    }

    const isPaired = i >= toStart && i < toStart + pairCount;
    if (isPaired) {
      const fg = fromG[fromStart + (i - toStart)];
      const upperSlots = [{ glyph: fg.char, isAlert: true }];
      for (let s = 0; s < shuffleTimes; s++) {
        const next = pickRandomFrom(pool, prev);
        upperSlots.push({ glyph: next, isAlert: false });
        prev = next;
      }
      const built = populateEchoes(entry.track, upperSlots);
      const startDx = fg.centerX - entry.centerX;
      entry.cell.style.translate = `${startDx.toFixed(2)}px 0px`;
      const centerDelayCap = n > m ? 180 : n < m ? 220 : 280;
      actors.push({
        kind: "pair",
        cell: entry.cell,
        track: entry.track,
        ...built,
        startDx,
        delayMs: Math.random() * centerDelayCap,
        reelDurationMs: durationMs,
        done: false,
      });
    } else {
      const upperSlots = [{ glyph: "", isAlert: false }];
      for (let s = 0; s < shuffleTimes; s++) {
        const next = pickRandomFrom(pool, prev);
        upperSlots.push({ glyph: next, isAlert: false });
        prev = next;
      }
      const built = populateEchoes(entry.track, upperSlots);
      const normDist = Math.abs(entry.centerX) / maxAbsToX;
      const dirSign = entry.centerX >= 0 ? 1 : -1;
      const startDx = -dirSign * 14;
      entry.cell.style.translate = `${startDx.toFixed(2)}px 0px`;
      entry.cell.style.opacity = "0";
      actors.push({
        kind: "enter",
        cell: entry.cell,
        track: entry.track,
        ...built,
        startDx,
        delayMs: 35 + normDist * 135 + Math.random() * 110,
        reelDurationMs: durationMs,
        done: false,
      });
    }
  });

  // 3) Lightweight out-of-flow exit cells when custom slogan is shorter than offline alert (n < m)
  if (isMorph && n < m) {
    for (let j = 0; j < m; j++) {
      if (j >= fromStart && j < fromStart + pairCount) continue;
      const fg = fromG[j];
      const cell = document.createElement("span");
      cell.className = "sg-shuffle-exit-cell";
      const boxW = fg.w + 2;
      cell.style.width = `${boxW.toFixed(2)}px`;
      const baseOffset = fg.centerX - boxW * 0.5;
      cell.style.translate = `${baseOffset.toFixed(2)}px 0px`;

      const track = document.createElement("span");
      track.className = "sg-shuffle-track";
      const spacer = document.createElement("span");
      spacer.className = "sg-shuffle-glyph invisible select-none";
      spacer.textContent = fg.char;
      track.appendChild(spacer);
      cell.appendChild(track);
      el.appendChild(cell);

      const upperSlots = [
        { glyph: fg.char, isAlert: true },
        { glyph: pickRandomFrom(charset, fg.char.toLowerCase()), isAlert: true },
      ];
      const built = populateEchoes(track, upperSlots);
      const normEdge = 1 - Math.abs(fg.centerX) / maxAbsFromX;
      const dirSign = fg.centerX >= 0 ? 1 : -1;
      actors.push({
        kind: "exit",
        cell,
        track,
        ...built,
        baseOffset,
        startDx: 0,
        exitShift: -dirSign * 10,
        delayMs: normEdge * 70 + Math.random() * 80,
        reelDurationMs: 480,
        done: false,
      });
    }
  }

  const glideDurationMs = 540;

  const applyBlurLevel = (item, nextLevel) => {
    if (!motionBlur || !defs || nextLevel === item.blurLevel) return;
    item.blurLevel = nextLevel;
    item.track.style.filter = nextLevel > 0 ? `url(#sg-shuffle-blur-${runId}-${nextLevel})` : "";
  };

  function beginRoll(startLeadMs) {
    if (runId !== heroWordmarkCtrl.runId) return;
    el.setAttribute("aria-label", toText);
    const startEpoch = performance.now() + startLeadMs;

    function tick(now) {
      if (runId !== heroWordmarkCtrl.runId) return;
      const totalElapsed = now - startEpoch;
      const glideU = isMorph ? Math.min(1, Math.max(0, totalElapsed / glideDurationMs)) : 1;
      const glideP = easeInOutCubic(glideU);

      let anyActive = glideU < 1;

      for (const item of actors) {
        if (isMorph) {
          if (item.kind === "exit") {
            const x = item.baseOffset + item.exitShift * glideP;
            item.cell.style.translate = `${x.toFixed(2)}px 0px`;
          } else if (glideU >= 1) {
            if (item.cell.style.translate !== "0px") item.cell.style.translate = "0px";
          } else {
            const dx = item.startDx * (1 - glideP);
            item.cell.style.translate = `${dx.toFixed(2)}px 0px`;
          }
        }

        if (item.done) continue;
        const elapsed = totalElapsed - item.delayMs;
        if (elapsed <= 0) {
          anyActive = true;
          continue;
        }

        const u = Math.min(1, elapsed / item.reelDurationMs);
        const progress = quintOut(u);
        const curY = u >= 1 ? 0 : item.startY * (1 - progress);
        item.track.style.translate = curY <= 0.02 ? "0px" : `0px ${curY.toFixed(2)}px`;

        if (item.kind === "enter") {
          item.cell.style.opacity = u >= 0.45 ? "" : `${Math.min(1, progress * 3.2).toFixed(3)}`;
        } else if (item.kind === "exit") {
          item.cell.style.opacity = `${Math.max(0, 1 - progress * 1.35).toFixed(3)}`;
        }

        // Velocity factor (1 - u)^4 drops below 1 step around u=0.46 -> filter detaches WHILE STILL IN MOTION,
        // so the entire settling phase (u=0.48..1.00) renders via native unfiltered glyph rasterization!
        const velNorm = u >= 1 ? 0 : Math.pow(1 - u, 4);
        const level = velNorm < 0.08 ? 0 : Math.min(BLUR_STEPS, Math.round(velNorm * BLUR_STEPS));
        applyBlurLevel(item, level);

        if (u >= 1) {
          item.done = true;
          applyBlurLevel(item, 0);
          item.track.style.translate = "0px";
          if (item.kind !== "exit") item.cell.style.opacity = "";
        } else {
          anyActive = true;
        }
      }

      if (anyActive) {
        heroWordmarkCtrl.rafId = requestAnimationFrame(tick);
      } else {
        heroWordmarkCtrl.rafId = 0;
        // Prune out-of-flow absolute echoes & exit overlays AFTER all tracks are settled:
        // zero height/transform/clip-path/layer change on any target glyph!
        for (const item of actors) {
          if (item.kind === "exit") {
            item.cell.remove();
          } else {
            for (const echo of item.echoNodes) echo.remove();
          }
        }
        if (defs) defs.innerHTML = "";
      }
    }

    heroWordmarkCtrl.rafId = requestAnimationFrame(tick);
  }

  if (isMorph && holdBeforeMorphMs > 0) {
    heroWordmarkCtrl.holdTimer = setTimeout(() => {
      heroWordmarkCtrl.holdTimer = 0;
      beginRoll(0);
    }, holdBeforeMorphMs);
  } else {
    beginRoll(90);
  }
}

function initHeroWordmarkShuffle() {
  const runId = clearHeroWordmarkTimers();
  const targetTitle = getConfiguredHeroTitle();
  const offlineCount = state.nodes.filter((n) => !n.online).length;

  if (offlineCount > 0) {
    runHeroShuffleTransition(getOfflineAlertText(offlineCount), targetTitle, runId, 2000);
  } else {
    runHeroShuffleTransition(null, targetTitle, runId, 0);
  }
}

// Bind custom hero_title input (editable only when logged in) & replay button inside Managed Settings Drawer
const heroTitleInput = document.getElementById("input-hero-title");
if (heroTitleInput) {
  heroTitleInput.value = state.settings.hero_title;
  heroTitleInput.addEventListener("input", (e) => {
    if (!state.loggedIn) {
      e.target.value = state.settings.hero_title;
      return;
    }
    state.settings.hero_title = e.target.value;
    scheduleSiteSettingsSave();
    clearHeroWordmarkTimers();
    renderStaticHeroWordmark(getConfiguredHeroTitle(), false);
  });
  heroTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (state.loggedIn) initHeroWordmarkShuffle();
    }
  });
}
const replayHeroBtn = document.getElementById("btn-replay-hero");
if (replayHeroBtn) {
  replayHeroBtn.addEventListener("click", () => {
    initHeroWordmarkShuffle();
  });
}
const pinnedSearchInput = document.getElementById("input-pinned-search");
if (pinnedSearchInput) {
  pinnedSearchInput.addEventListener("input", (e) => {
    state.pinnedSearch = e.target.value;
    renderPinnedNodesDrawer();
  });
}
const clearPinnedBtn = document.getElementById("btn-clear-pinned");

if (clearPinnedBtn) {
  clearPinnedBtn.addEventListener("click", () => {
    if (!state.loggedIn) return;
    state.settings.featured_nodes = [];
    void saveSiteSettings();
    renderPinnedNodesDrawer();
    renderNodes();
  });
}

let lastTerminatorMinute = -1;
function updateUtc8Clock() {
  const now = Date.now();
  if (state.settings.show_map_clock) {
    const clockEl = document.getElementById("map-utc8-time");
    if (clockEl) clockEl.textContent = formatUtc8Time(now);
  }
  const minBucket = Math.floor(now / 60000);
  if (
    lastTerminatorMinute !== -1 &&
    minBucket !== lastTerminatorMinute &&
    state.settings.show_world_map &&
    state.settings.show_solar_terminator
  ) {
    drawWorldMapCanvas();
  }
  lastTerminatorMinute = minBucket;
}


function bilingual(zh, en) {
  return state.lang === 'zh-CN' ? zh : en;
}

function connectionMessage() {
  if (state.privateSite) return bilingual('登录后查看节点', 'Sign in to view nodes');
  if (state.connection === 'connecting') return bilingual('正在连接 Komari…', 'Connecting to Komari…');
  if (state.nodes.length) return bilingual('连接中断 · 显示上次数据', 'Connection lost · Showing last data');
  return bilingual('未连接到 Komari', 'Not connected to Komari');
}

function emptyNodesMessage() {
  if (state.loading || state.privateSite || (state.connection !== 'live' && !state.nodes.length)) return connectionMessage();
  return t('empty');
}

function storePreferences() {
  const { appearance, lang, mapOverlapMode, settings } = state;
  const local = Object.fromEntries(Object.keys(defaultSettings)
    .filter(key => !['hero_title', 'featured_nodes', 'site_notice'].includes(key))
    .map(key => [key, settings[key]]));
  preferences.settings = local;
  try { localStorage.setItem(preferencesKey, JSON.stringify({ appearance, lang, mapOverlapMode, settings: local })); } catch {}
}

let saveTimer;
let settingsWrite = Promise.resolve();

function saveSiteSettings() {
  clearTimeout(saveTimer);
  const settings = { ...siteSettings, hero_title: state.settings.hero_title, featured_nodes: [...state.settings.featured_nodes] };
  settingsWrite = settingsWrite.then(async () => {
    if (!state.loggedIn) return;
    const status = document.getElementById('settings-status');
    try {
      await saveThemeSettings(settings);
      siteSettings = settings;
      status.textContent = '';
    } catch {
      status.textContent = bilingual('未能保存主题配置', 'Theme settings could not be saved');
    }
  });
  return settingsWrite;
}

function scheduleSiteSettingsSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSiteSettings, 450);
}

let stopTelemetry;
let siteSettings = {};
let receivedSnapshot = false;

async function refreshDashboard() {
  stopTelemetry?.();
  state.loading = true;
  state.connection = 'connecting';
  state.nodes = [];
  receivedSnapshot = false;
  eventFeed.items = [];
  eventFeed.highCpuSet.clear();
  netTelemetry.timestamps.length = netTelemetry.upHistory.length = netTelemetry.downHistory.length = 0;
  closeDetailModal();
  renderAll();
  let dashboard;
  try {
    dashboard = await loadDashboard();
  } catch (error) {
    state.loading = false;
    state.connection = 'disconnected';
    renderAll();
    throw error;
  }
  const { nodes, settings, publicSettings, loggedIn } = dashboard;
  state.loggedIn = loggedIn;
  state.privateSite = Boolean(publicSettings.private_site && !loggedIn);
  siteSettings = settings;
  state.settings = { ...defaultSettings, ...settings, ...preferences.settings };
  heroTitleInput.value = state.settings.hero_title;
  renderStaticHeroWordmark(getConfiguredHeroTitle(), false);
  state.loading = !state.privateSite;
  renderAll();
  if (state.privateSite) return;

  stopTelemetry = watchTelemetry(snapshot => {
    const previous = state.nodes;
    state.nodes = normalizeNodes(nodes, snapshot, { loggedIn });
    state.connection = 'live';
    state.loading = false;
    const at = Date.now();
    const network = state.nodes.reduce((n, node) => {
      if (node.online) { n.up += node.netOut; n.down += node.netIn; }
      return n;
    }, { up: 0, down: 0 });
    netTelemetry.timestamps.push(fmtClock(at));
    netTelemetry.upHistory.push(network.up);
    netTelemetry.downHistory.push(network.down);
    if (netTelemetry.timestamps.length > 160) {
      netTelemetry.timestamps.shift();
      netTelemetry.upHistory.shift();
      netTelemetry.downHistory.shift();
    }
    updateEvents(previous, at);
    renderSummary();
    renderGroups();
    renderNodes();
    renderMapMarkers();
    if (!receivedSnapshot) {
      receivedSnapshot = true;
      initHeroWordmarkShuffle();
    }
  }, status => {
    state.connection = status;
    if (status !== 'connecting') state.loading = false;
    renderEventFeed();
    if (!state.nodes.length) renderNodes();
  });
}

bindTooltips(document.getElementById('sg-tooltip'));
initWorldMapInteractions();
updateUtc8Clock();
setInterval(() => { if (!document.hidden) updateUtc8Clock(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateUtc8Clock(); });
void refreshDashboard().catch(() => {});
