import { Laptop, LogIn, Moon, Settings, SlidersHorizontal, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getLabels } from '../lib/i18n';
import type { Appearance, Language } from '../types/komari';

const modes = [ ['dark', Moon], ['light', Sun], ['system', Laptop] ] as const;

export function Navbar({ appearance, setAppearance, lang, setLang, loggedIn, settingsTrigger }: {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  loggedIn: boolean;
  settingsTrigger: () => void;
}) {
  const labels = getLabels(lang);
  const sessionLabel = loggedIn ? labels.admin : labels.signIn;
  return (
    <header className="km-navbar relative z-30 flex w-full items-center justify-end px-4 pt-4 sm:px-7">
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
        <Tabs value={appearance} onValueChange={setAppearance}>
          <TabsList aria-label={labels.appearance} className="h-9 shrink-0">
            {modes.map(([mode, Icon]) => (
              <Tooltip key={mode}>
                <TooltipTrigger render={<TabsTrigger value={mode} aria-label={labels[mode]} className="px-2.5" />}>
                  <Icon className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>{labels[mode]}</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </Tabs>
        <Button size="lg" variant="outline" aria-label={lang === 'en' ? '切换为简体中文' : 'Switch to English'} onClick={() => setLang(lang === 'en' ? 'zh-CN' : 'en')} className="px-3 text-xs">{lang === 'en' ? 'EN' : '中'}</Button>
        <Button size="lg" variant="outline" aria-haspopup="dialog" onClick={settingsTrigger} className="px-3 text-xs"><SlidersHorizontal className="size-3.5" aria-hidden="true" />{labels.settings}</Button>
        <a href="/admin" data-slot="button" data-variant="outline" className="inline-flex h-9 items-center gap-1.5 px-3 text-xs font-medium">
          {loggedIn ? <Settings className="size-3.5" aria-hidden="true" /> : <LogIn className="size-3.5" aria-hidden="true" />}{sessionLabel}
        </a>
      </div>
    </header>
  );
}
