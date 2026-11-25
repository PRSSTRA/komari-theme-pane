import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { getLabels } from '../lib/i18n';
import type { KomariThemeSettings, Language, PreferenceKey } from '../types/komari';

type ToggleKey = 'show_world_map' | 'show_map_clock' | 'show_solar_terminator' | 'show_summary_bar' | 'show_event_feed' | 'reduce_transparency';

export function ThemeSettingsDrawer({ open, onOpenChange, settings, lang, hasOverrides, resetLocalPrefs, setPreference, finalFocus }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: KomariThemeSettings;
  lang: Language;
  hasOverrides: boolean;
  resetLocalPrefs: () => void;
  setPreference: <K extends PreferenceKey>(key: K, value: KomariThemeSettings[K]) => void;
  finalFocus: HTMLElement | null;
}) {
  const t = getLabels(lang);
  const row = (key: ToggleKey, label: string) => (
    <label key={key} className="flex min-h-9 items-center justify-between gap-4 text-sm">
      {label}<Switch aria-label={label} checked={settings[key]} onCheckedChange={value => setPreference(key, value)} />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} finalFocus={() => finalFocus} className="sg-popover sg-settings-drawer fixed top-3 right-3 bottom-3 left-auto flex w-[min(360px,calc(100%-1.5rem))] max-w-none translate-x-0 translate-y-0 flex-col overflow-auto px-4 py-4 ring-0 sm:max-w-none">
        <header className="flex items-center justify-between gap-3">
          <DialogTitle>{t.settings}</DialogTitle>
          <DialogClose render={<Button size="icon" variant="ghost" aria-label={t.close} />}><X aria-hidden="true" /></DialogClose>
        </header>
        <div className="sg-panel space-y-1 rounded-xl px-3 py-2">
          {row('show_world_map', t.worldMap)}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            {t.overlap}
            <Tabs value={settings.map_overlap_mode} onValueChange={mode => setPreference('map_overlap_mode', mode)}>
              <TabsList aria-label={t.overlapLabel}>
                <TabsTrigger value="cluster">{t.cluster}</TabsTrigger>
                <TabsTrigger value="spread">{t.spread}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {row('show_map_clock', t.clock)}
          {row('show_solar_terminator', t.terminator)}
        </div>
        <div className="sg-panel space-y-1 rounded-xl px-3 py-2">
          {row('show_summary_bar', t.network)}
          {row('show_event_feed', t.events)}
        </div>
        <div className="sg-panel rounded-xl px-3 py-2">{row('reduce_transparency', t.opaque)}</div>
        {hasOverrides && <Button variant="outline" onClick={resetLocalPrefs} className="self-start">{t.reset}</Button>}
      </DialogContent>
    </Dialog>
  );
}
