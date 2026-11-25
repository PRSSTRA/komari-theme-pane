import { useRef, useState } from 'react';
import { HeroWordmark } from './components/HeroWordmark';
import { Navbar } from './components/Navbar';
import { NodeDetailModal } from './components/NodeDetailModal';
import { OverviewBento } from './components/OverviewBento';
import { PrivateSiteGate } from './components/PrivateSiteGate';
import { ServerListSection } from './components/ServerListSection';
import { SiteNoticeBanner } from './components/SiteNoticeBanner';
import { ThemeSettingsDrawer } from './components/ThemeSettingsDrawer';
import { TooltipProvider } from './components/ui/tooltip';
import { useKomariTelemetry } from './hooks/useKomariTelemetry';
import { usePreferences } from './hooks/usePreferences';
import { getLabels } from './lib/i18n';
import { DEFAULT_THEME_SETTINGS } from './lib/settings';

export function App() {
  const { site, loggedIn, nodes, status, events, networkHistory, dataSource } = useKomariTelemetry();
  const preferences = usePreferences(site?.theme_settings ?? DEFAULT_THEME_SETTINGS, loggedIn);
  const { appearance, setAppearance, lang, setLang, settings, setPreference, canShowPricing } = preferences;
  const t = getLabels(lang);
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const drawerTrigger = useRef<HTMLElement>(null);
  const nodeTrigger = useRef<HTMLElement>(null);
  const showDashboard = status === 'ready' || status === 'reconnecting';
  const node = showDashboard ? nodes.find(item => item.uuid === selected) : undefined;
  if (selected && !node) setSelected(null);
  const hasOverview = showDashboard && (settings.show_world_map || settings.show_summary_bar || settings.show_event_feed);
  const offlineCount = showDashboard ? nodes.filter(item => !item.online).length : 0;
  const heroTitle = settings.hero_title.trim() || site?.sitename?.trim() || 'Komari Pane';
  const currentFocus = () => document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const openNode = (uuid: string) => {
    nodeTrigger.current = currentFocus();
    setSelected(uuid);
  };

  return (
    <TooltipProvider>
      <div id="sg-stage" className="km-layout flex flex-col antialiased" data-glass={settings.reduce_transparency ? 'opaque' : undefined}>
        <Navbar {...{ appearance, setAppearance, lang, setLang, loggedIn }} settingsTrigger={() => {
          drawerTrigger.current = currentFocus();
          setDrawer(true);
        }} />
        <main className="km-main flex w-full flex-1 flex-col gap-4 px-5 pt-1 pb-5 sm:px-7">
          {(status === 'loading' || status === 'error' || status === 'reconnecting') && <div role={status === 'error' ? 'alert' : 'status'} className="sg-panel relative z-10 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-[var(--sg-muted-fg)]">
            {t[status]}
            {status === 'error' && <button type="button" data-slot="button" data-variant="outline" className="px-2 py-1" onClick={() => location.reload()}>{t.retry}</button>}
          </div>}
          <div className="relative isolate w-full">
            <HeroWordmark title={heroTitle} {...{ offlineCount, lang, hasOverview }} />
            <SiteNoticeBanner notice={settings.site_notice} />
            {showDashboard && <OverviewBento {...{ settings, nodes, events, networkHistory, lang }} onOpenNode={openNode} />}
          </div>
          {status === 'private' && <PrivateSiteGate lang={lang} />}
          {showDashboard && <ServerListSection {...{ settings, nodes, lang, loggedIn, canShowPricing, setPreference }} onOpenNode={openNode} />}
        </main>
        <footer className="km-footer mt-auto px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sg-border)] pt-4 text-[11px] text-[var(--sg-subtle-fg)]">
            <span>Powered by Komari Monitor.</span>
            {settings.footer_extra.trim() && <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{settings.footer_extra.trim()}</span>}
          </div>
        </footer>
        {node && <NodeDetailModal key={node.uuid} {...{ node, lang, canShowPricing, dataSource }} featuredPingTasks={settings.featured_ping_tasks} sampleTime={node.networkSampleTime} finalFocus={nodeTrigger.current} onClose={() => setSelected(null)} />}
        <ThemeSettingsDrawer open={drawer} onOpenChange={setDrawer} {...preferences} finalFocus={drawerTrigger.current} />
      </div>
    </TooltipProvider>
  );
}
