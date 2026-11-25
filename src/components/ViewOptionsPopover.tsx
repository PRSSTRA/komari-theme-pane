import { useId } from 'react';
import { Activity, ArrowDownUp, ChevronDown, CircleDollarSign, Gauge, Tags, WifiOff } from 'lucide-react';
import { getNodeListLabels } from '../lib/i18n';
import type { KomariThemeSettings, Language, PreferenceKey } from '../types/komari';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type OptionProps = {
  settings: KomariThemeSettings;
  lang: Language;
  loggedIn: boolean;
  setPreference: <K extends PreferenceKey>(key: K, value: KomariThemeSettings[K]) => void;
};

export function ViewOptionsPopover({ settings, lang, loggedIn, setPreference }: OptionProps) {
  const labels = getNodeListLabels(lang);
  const isCard = settings.default_view === 'card';
  const densityName = useId();
  const switches = [
    ['show_offline_first', labels.offlineFirst, WifiOff],
    ['show_total_traffic', isCard ? labels.totalTraffic : labels.tableTraffic, ArrowDownUp],
    ['show_traffic_bar', labels.quotaBar, Gauge],
    ['show_tags', labels.tags, Tags],
    ['show_load_temp', labels.loadTemp, Activity],
  ] as const;
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger className="sg-view-options-trigger" aria-label={labels.options} />}>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{labels.options}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={7} className="sg-popover w-64 max-w-[calc(100vw-24px)] gap-2 rounded-xl p-3 text-xs ring-0">
        <PopoverTitle className="text-[11px] font-semibold">{isCard ? labels.cardOptions : labels.tableOptions}</PopoverTitle>
        {isCard && (
          <fieldset className="space-y-1.5">
            <legend className="text-[11px] font-medium text-[var(--sg-muted-fg)]">{labels.density}</legend>
            <div data-slot="tabs-list" data-variant="default" className="sg-node-density h-8 w-full">
              {(['comfortable', 'compact'] as const).map(value => (
                <label key={value} className="relative flex-1 px-2 text-xs" data-slot="tabs-trigger" data-active={settings.card_density === value}>
                  <input type="radio" name={densityName} className="sr-only" checked={settings.card_density === value} onChange={() => setPreference('card_density', value)} />
                  {value === 'comfortable' ? labels.standard : labels.compact}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="space-y-1">
          {switches.map(([key, label, Icon]) => (
            <label key={key} className="flex min-h-8 cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--sg-hover-faint)]">
              <span className="flex min-w-0 items-center gap-2">
                <Icon className={`size-3.5 shrink-0 ${settings[key] ? '' : 'text-[var(--sg-muted-fg)]'}`} aria-hidden="true" />
                <span>
                  {label}
                  {key === 'show_total_traffic' && <span aria-hidden="true" className="mono-num block text-[10px] text-[var(--sg-subtle-fg)]">↑ {labels.up} / ↓ {labels.down}</span>}
                </span>
              </span>
              <Switch aria-label={label} checked={settings[key]} onCheckedChange={value => setPreference(key, value)} />
            </label>
          ))}
          {loggedIn && (
            <div className="flex min-h-8 items-center justify-between gap-2 rounded-lg px-2 py-1.5">
              <span className="flex items-center gap-2">
                <CircleDollarSign className="size-3.5 shrink-0 text-[var(--sg-muted-fg)]" aria-hidden="true" />{labels.pricing}
              </span>
              <span className="shrink-0 text-[10px] text-[var(--sg-muted-fg)]">{settings.show_pricing ? labels.managedOn : labels.managedOff}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
