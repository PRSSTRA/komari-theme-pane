import type { KomariEventItem, KomariNode, KomariThemeSettings, Language, NetHistoryPoint } from '../types/komari';
import { EventFeedPanel } from './EventFeedPanel';
import { NetworkTrafficPanel } from './NetworkTrafficPanel';
import { WorldMapPanel } from './WorldMapPanel';

export function OverviewBento({ settings, nodes, events, networkHistory, lang, onOpenNode }: {
  settings: KomariThemeSettings;
  nodes: readonly KomariNode[];
  events: readonly KomariEventItem[];
  networkHistory: readonly NetHistoryPoint[];
  lang: Language;
  onOpenNode: (uuid: string) => void;
}) {
  const { show_world_map: map, show_summary_bar: network, show_event_feed: feed } = settings;
  const count = Number(map) + Number(network) + Number(feed);
  if (count === 0) return null;

  const columns = count === 3 ? 'lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[1.45fr_0.95fr_0.82fr]'
    : count === 2 ? map ? 'lg:grid-cols-[1.58fr_1fr]' : 'lg:grid-cols-[1.28fr_1fr]' : '';
  const networkLayout = count === 3 ? 'order-3 min-h-[280px] lg:col-span-2 xl:order-2 xl:col-span-1'
    : map ? 'order-2 min-h-[280px]' : 'order-1 h-[320px] sm:h-[340px]';
  const eventLayout = count === 3 ? 'order-2 min-h-[240px] xl:order-3'
    : map ? 'order-2 min-h-[260px]' : count === 2 ? 'order-2 h-[320px] sm:h-[340px]' : 'h-[300px]';

  return (
    <div id="overview-hero" className={`relative z-10 grid w-full items-stretch gap-4 ${columns}`}>
      {map && <WorldMapPanel {...{ nodes, lang, onOpenNode }} standalone={count === 1} overlapMode={settings.map_overlap_mode} showClock={settings.show_map_clock} showTerminator={settings.show_solar_terminator} />}
      {feed && <EventFeedPanel {...{ events, lang, onOpenNode }} allowExpiring={settings.show_pricing} besideMap={map} className={eventLayout} />}
      {network && <NetworkTrafficPanel {...{ nodes, lang }} points={networkHistory} className={networkLayout} />}
    </div>
  );
}
