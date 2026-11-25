export type Language = 'zh-CN' | 'en';
export type Appearance = 'dark' | 'light' | 'system';
export type MapOverlapMode = 'cluster' | 'spread';
export type NodeView = 'card' | 'table';
export type CardDensity = 'comfortable' | 'compact';
export type HistoryHours = 1 | 6 | 24;

export interface KomariThemeSettings {
  hero_title: string;
  site_notice: string;
  show_world_map: boolean;
  map_overlap_mode: MapOverlapMode;
  show_map_clock: boolean;
  show_solar_terminator: boolean;
  show_summary_bar: boolean;
  show_event_feed: boolean;
  default_view: NodeView;
  card_density: CardDensity;
  show_offline_first: boolean;
  show_total_traffic: boolean;
  show_tags: boolean;
  show_load_temp: boolean;
  show_traffic_bar: boolean;
  show_pricing: boolean;
  featured_nodes: string[];
  featured_ping_tasks: number[];
  reduce_transparency: boolean;
  footer_extra: string;
}

export type PreferenceKey = Exclude<keyof KomariThemeSettings,
  'hero_title' | 'site_notice' | 'show_pricing' | 'featured_nodes' | 'featured_ping_tasks' | 'footer_extra'>;
export type LocalPreferences = Partial<Pick<KomariThemeSettings, PreferenceKey>>;

export interface KomariSite {
  sitename: string;
  private_site: boolean;
  theme_settings: KomariThemeSettings;
}

export interface KomariMeResponse {
  logged_in: boolean;
  username?: string;
}

export interface KomariClient {
  uuid: string;
  name: string;
  region?: string;
  public_remark?: string;
  group?: string;
  tags?: string;
  weight?: number;
  cpu_name?: string;
  cpu_cores?: number;
  cpu_physical_cores?: number;
  virtualization?: string;
  arch?: string;
  os?: string;
  kernel_version?: string;
  gpu_name?: string;
  mem_total?: number;
  swap_total?: number;
  disk_total?: number;
  traffic_limit?: number;
  traffic_limit_type?: string;
  price?: number;
  currency?: string;
  billing_cycle?: number;
  auto_renewal?: boolean;
  expired_at?: string | null;
}

export interface GeoLocation {
  lng: number;
  lat: number;
  cityZh: string;
  cityEn: string;
  regionCode: string;
}

export interface NodeStatus {
  online: boolean;
  cpu?: number;
  ramUsed?: number;
  ramTotal?: number;
  diskUsed?: number;
  diskTotal?: number;
  swapUsed?: number;
  swapTotal?: number;
  up?: number;
  down?: number;
  totalUp?: number;
  totalDown?: number;
  uptime?: number;
  load?: number;
  temp?: number;
  tcp?: number;
  udp?: number;
  process?: number;
}

export interface KomariNode extends KomariClient, NodeStatus {
  regionCode: string;
  geo: GeoLocation | null;
  tagList: string[];
  featured: boolean;
}

export interface KomariEventItem {
  id: number;
  kind: 'offline' | 'online' | 'high_load' | 'expiring' | 'info';
  nodeUuid: string;
  nodeName: string;
  regionCode: string;
  time: number;
  isAlert: boolean;
  cpu?: number;
  days?: number;
}

export interface NetHistoryPoint {
  time: number;
  up: number;
  down: number;
}

export interface LoadHistoryPoint {
  time: number;
  cpu: number | null;
  ram: number | null;
}

export interface PingTask {
  id: number;
  name: string;
  weight?: number;
  clients?: string[];
}

export interface PingHistoryPoint {
  taskId: number;
  time: number;
  value: number | null;
}

export interface PingTrackStats {
  task: PingTask;
  latest: number | null;
  loss: number | null;
  points: readonly PingHistoryPoint[];
}

export type DataStatus = 'loading' | 'private' | 'error' | 'ready' | 'reconnecting';
