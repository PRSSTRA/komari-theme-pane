import { useId, useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUpDown, Cpu, Gauge, Grid2x2, List, MemoryStick, Search } from 'lucide-react';
import { getNodeListLabels } from '../lib/i18n';
import type { KomariNode, KomariThemeSettings, Language, PreferenceKey } from '../types/komari';
import { NodeCardGrid } from './NodeCardGrid';
import { NodeTableView } from './NodeTableView';
import { ViewOptionsPopover } from './ViewOptionsPopover';
import { ALL_GROUPS, getNodeList, nodeGroupLabel, type NodeSortKey } from './node-list-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Toggle } from './ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import './node-list.css';

const sorts = {
  weight: ArrowDownUp,
  cpu: Cpu,
  ram: MemoryStick,
  net: Gauge,
  traffic: ArrowUpDown,
} satisfies Record<NodeSortKey, typeof ArrowDownUp>;
const sortKeys = Object.keys(sorts) as NodeSortKey[];

export function ServerListSection({ nodes, settings, lang, loggedIn, canShowPricing, onOpenNode, setPreference }: {
  nodes: readonly KomariNode[];
  settings: KomariThemeSettings;
  lang: Language;
  loggedIn: boolean;
  canShowPricing: boolean;
  onOpenNode: (uuid: string) => void;
  setPreference: <K extends PreferenceKey>(key: K, value: KomariThemeSettings[K]) => void;
}) {
  const labels = getNodeListLabels(lang);
  const sectionId = useId();
  const groupTabId = useId();
  const viewTabId = useId();
  const resultsId = useId();
  const sortId = useId();
  const [query, setQuery] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [sort, setSort] = useState<NodeSortKey>('weight');
  const [selectedGroup, setGroup] = useState<string | typeof ALL_GROUPS>(ALL_GROUPS);
  const pinnedNodes = useMemo(() => new Set(settings.featured_nodes), [settings.featured_nodes]);
  const { groups, group, visible } = getNodeList(nodes, lang, {
    selectedGroup, query, onlyOnline, sort, offlineFirst: settings.show_offline_first, pinnedNodes,
  });
  if (selectedGroup !== group) setGroup(group);
  const activeGroupIndex = group === ALL_GROUPS ? 0 : groups.findIndex(([key]) => key === group) + 1;
  const SortIcon = sorts[sort];
  const view = settings.default_view;
  const viewProps = { nodes: visible, settings, pinnedNodes, lang, canShowPricing: loggedIn && canShowPricing && settings.show_pricing, onOpenNode };

  return (
    <section id="nodes-panel" aria-labelledby={sectionId} data-slot="panel" className="sg-panel relative isolate z-20 flex w-full min-w-0 flex-col rounded-xl">
      <h2 id={sectionId} className="sr-only">{labels.nodes}</h2>
      <div id="toolbar-section" className="relative z-20 flex flex-col gap-2.5 px-4 pt-3.5 pb-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={group} onValueChange={setGroup} className="min-w-0 sm:max-w-full sm:self-start xl:flex-1">
          <TabsList id="group-tabs" aria-label={labels.groups} className="sg-scroll-none h-9 max-w-full justify-start overflow-x-auto" activateOnFocus>
            <TabsTrigger value={ALL_GROUPS} id={`${groupTabId}-0`} aria-controls={resultsId} data-span-all={(groups.length + 1) % 2 === 1} className="min-w-0 shrink-0 grow-0 px-2.5 text-xs">
              {labels.all}<span className="mono-num text-[11px] opacity-65">{nodes.length}</span>
            </TabsTrigger>
            {groups.map(([key, count], index) => (
              <TabsTrigger key={key} value={key} id={`${groupTabId}-${index + 1}`} aria-controls={resultsId} className="min-w-0 shrink-0 grow-0 px-2.5 text-xs">
                <span className="min-w-0 truncate">{nodeGroupLabel(key, lang)}</span><span className="mono-num shrink-0 text-[11px] opacity-65">{count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-2.5 xl:w-auto xl:shrink-0 xl:flex-nowrap xl:items-center xl:justify-end">
          <label data-slot="input-group" className="flex h-9 min-w-[min(180px,100%)] flex-1 items-center gap-2 px-3 xl:w-56 xl:flex-initial">
            <Search className="size-3.5 shrink-0 text-[var(--sg-subtle-fg)]" aria-hidden="true" />
            <span className="sr-only">{labels.search}</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={labels.search} className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:opacity-60" />
          </label>
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
            <Toggle id="btn-online-only" variant="outline" size="lg" pressed={onlyOnline} onPressedChange={setOnlyOnline} className="shrink-0 gap-1.5 px-3 text-xs">
              <span aria-hidden="true" className="size-1.5 rounded-[1.5px] bg-[var(--sg-success)]" />{labels.onlineOnly}
            </Toggle>
            <div id="view-tabs-root" data-slot="tabs-list" data-variant="default" className="h-9 shrink-0">
              <Tabs value={view} onValueChange={value => setPreference('default_view', value)} className="h-full">
                <TabsList id="view-tabs" variant="line" aria-label={labels.view} className="sg-node-view-tabs h-full gap-0.5 p-0" activateOnFocus>
                  {(['card', 'table'] as const).map(key => {
                    const Icon = key === 'card' ? Grid2x2 : List;
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger render={<TabsTrigger value={key} id={`${viewTabId}-${key}`} aria-controls={resultsId} aria-label={labels[key]} className="px-2.5 text-xs md:px-3" />}>
                          <Icon className="size-3.5" aria-hidden="true" /><span className="hidden md:inline">{labels[key]}</span>
                        </TooltipTrigger>
                        <TooltipContent>{labels[key]}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TabsList>
              </Tabs>
              <ViewOptionsPopover {...{ settings, lang, loggedIn, setPreference }} />
            </div>
            <span id={sortId} className="sr-only">{labels.sort}</span>
            <Select<NodeSortKey> value={sort} onValueChange={value => { if (value !== null) setSort(value); }}>
              <SelectTrigger aria-labelledby={sortId} className="sg-node-sort min-w-[104px] px-3 text-xs font-medium md:min-w-[116px]">
                <SelectValue><SortIcon aria-hidden="true" className="size-3.5 text-[var(--sg-muted-fg)]" />{labels[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false} className="sg-popover sg-node-sort-menu w-max min-w-[152px] max-w-[calc(100vw-24px)] rounded-xl p-1.5 ring-0">
                {sortKeys.map(key => {
                  const Icon = sorts[key];
                  return <SelectItem key={key} value={key} className="min-h-8 text-xs"><Icon aria-hidden="true" className="size-3.5" />{labels[key]}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div id={resultsId} role="tabpanel" aria-labelledby={`${groupTabId}-${activeGroupIndex} ${viewTabId}-${view}`} tabIndex={0} className="km-node-display relative z-10 rounded-b-xl">
        {visible.length === 0 ? (
          <p role="status" className="px-4 pt-4 pb-8 text-center text-sm text-[var(--sg-muted-fg)]">{labels.empty}</p>
        ) : view === 'card' ? <NodeCardGrid {...viewProps} /> : <NodeTableView {...viewProps} />}
      </div>
    </section>
  );
}
