import type { Language } from '../types/komari';

const messages = {
  'zh-CN': {
    dark: '暗黑模式', light: '明亮模式', system: '跟随系统', appearance: '外观',
    settings: '主题配置', signIn: '登录', admin: '管理后台', close: '关闭',
    worldMap: '全球节点分布', overlap: '节点重合', overlapLabel: '节点重合模式', cluster: '聚合', spread: '散开',
    clock: 'UTC+8 地图时钟', terminator: '晨昏线', network: '网络与流量', events: '实时事件',
    opaque: '低透明高性能模式', reset: '恢复站点默认', private: '这是私有站点',
    privateHelp: '登录 Komari 后查看节点状态。', loading: '正在加载节点状态…',
    error: '无法读取 Komari 节点状态。请检查连接后重试。', reconnecting: '实时连接中断 · 正在重连…',
    retry: '重试', up: '上行', down: '下行',
    offline: (count: number) => `${count}个节点离线`,
  },
  en: {
    dark: 'Dark mode', light: 'Light mode', system: 'System theme', appearance: 'Appearance',
    settings: 'Theme Settings', signIn: 'Sign in', admin: 'Admin', close: 'Close',
    worldMap: 'Global Topology', overlap: 'Marker overlap', overlapLabel: 'Marker overlap mode', cluster: 'Cluster', spread: 'Spread',
    clock: 'UTC+8 map clock', terminator: 'Day/night boundary', network: 'Network & Traffic', events: 'Live Events',
    opaque: 'Reduce transparency', reset: 'Restore site defaults', private: 'This site is private',
    privateHelp: 'Sign in to Komari to view node status.', loading: 'Loading node status…',
    error: 'Could not load Komari node status. Check your connection and retry.', reconnecting: 'Live connection interrupted · Reconnecting…',
    retry: 'Retry', up: 'Upload', down: 'Download',
    offline: (count: number) => `${count} ${count === 1 ? 'Node' : 'Nodes'} Offline`,
  },
};

export function getLabels(lang: Language) {
  return messages[lang];
}

const nodeListMessages = {
  'zh-CN': {
    nodes: '节点列表', groups: '节点分组', all: '全部', empty: '没有符合当前筛选条件的节点',
    search: '搜索节点、地区、分组、CPU、标签…', onlineOnly: '仅看在线',
    view: '视图切换', card: '卡片', table: '列表', options: '显示项设置',
    cardOptions: '卡片显示项', tableOptions: '列表显示项', density: '卡片密度', standard: '标准', compact: '紧凑',
    sort: '排序', weight: '默认', cpu: 'CPU 占用', ram: '内存占用', net: '实时速率', traffic: '累计流量',
    offlineFirst: '离线节点优先', totalTraffic: '节点累计流量', tableTraffic: '累计流量列',
    pricing: '费用与到期时间', managedOn: '后台开启', managedOff: '后台关闭',
    quotaBar: '月流量配额进度条', tags: '节点标签', loadTemp: 'Load 负载与温度',
    online: '在线', offline: '离线', highLoad: '高负载', pinned: '置顶', quota: '月流量', unlimited: '不限',
    nodeRegion: '节点 / 区域', ramLabel: '内存', diskLabel: '磁盘', loadLabel: '负载', tableLoadTemp: '负载 / 温度',
    uptime: '在线时长', uptimeBilling: '在线 / 费用', up: '上行', down: '下行', expired: '已到期',
    expiresIn: (days: number) => `剩 ${days} 天`,
  },
  en: {
    nodes: 'Server list', groups: 'Node groups', all: 'All', empty: 'No nodes match the current filters',
    search: 'Search nodes, regions, groups, CPU, tags…', onlineOnly: 'Online only',
    view: 'Node view', card: 'Cards', table: 'Table', options: 'Display options',
    cardOptions: 'Card display', tableOptions: 'Table columns', density: 'Card density', standard: 'Standard', compact: 'Compact',
    sort: 'Sort nodes', weight: 'Default', cpu: 'CPU usage', ram: 'RAM usage', net: 'Live speed', traffic: 'Total traffic',
    offlineFirst: 'Offline nodes first', totalTraffic: 'Cumulative traffic', tableTraffic: 'Cumulative traffic',
    pricing: 'Billing & expiry', managedOn: 'Enabled by admin', managedOff: 'Disabled by admin',
    quotaBar: 'Monthly quota bar', tags: 'Node tags', loadTemp: 'Load & temperature',
    online: 'Online', offline: 'Offline', highLoad: 'High load', pinned: 'Pinned', quota: 'Monthly quota', unlimited: 'Unlimited',
    nodeRegion: 'Node / Region', ramLabel: 'RAM', diskLabel: 'Disk', loadLabel: 'Load', tableLoadTemp: 'Load / Temp',
    uptime: 'Uptime', uptimeBilling: 'Uptime / Billing', up: 'Upload', down: 'Download', expired: 'Expired',
    expiresIn: (days: number) => `${days}d left`,
  },
};

export type NodeListLabels = typeof nodeListMessages[Language];

export function getNodeListLabels(lang: Language): NodeListLabels {
  return nodeListMessages[lang];
}
