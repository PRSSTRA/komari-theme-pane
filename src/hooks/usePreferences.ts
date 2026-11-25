import { useEffect, useState } from 'react';
import { normalizeLocalPreferences } from '../lib/settings';
import type { Appearance, KomariThemeSettings, Language, LocalPreferences, PreferenceKey } from '../types/komari';

const PREFS = 'komari_pane_prefs_v1';

function load(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* The preference still applies in this tab. */ }
}

function readOverrides(): LocalPreferences {
  try { return normalizeLocalPreferences(JSON.parse(load(PREFS) ?? 'null')); }
  catch { return {}; }
}

function readAppearance(): Appearance {
  const value = load('appearance');
  return value === 'light' || value === 'system' ? value : 'dark';
}

export function usePreferences(defaults: KomariThemeSettings, loggedIn: boolean) {
  const [appearance, setAppearanceState] = useState(readAppearance);
  const [lang, setLangState] = useState<Language>(() => load('language') === 'en' ? 'en' : 'zh-CN');
  const [overrides, setOverrides] = useState(readOverrides);
  const settings = { ...defaults, ...overrides };

  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', appearance === 'dark' || (appearance === 'system' && system.matches));
    apply();
    if (appearance !== 'system') return;
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [appearance]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    save(PREFS, Object.keys(overrides).length ? JSON.stringify(overrides) : null);
  }, [overrides]);

  function setAppearance(value: Appearance) {
    setAppearanceState(value);
    save('appearance', value);
  }

  function setLang(value: Language) {
    setLangState(value);
    save('language', value);
  }

  function setPreference<K extends PreferenceKey>(key: K, value: KomariThemeSettings[K]) {
    setOverrides(previous => {
      const next = { ...previous, [key]: value };
      if (value === true && (previous[key] ?? defaults[key]) === false) {
        if (key === 'show_tags') next.show_load_temp = true;
        if (key === 'show_load_temp') next.show_tags = true;
      }
      return next;
    });
  }

  return {
    appearance, setAppearance, lang, setLang, settings, setPreference,
    canShowPricing: loggedIn && defaults.show_pricing,
    hasOverrides: Object.keys(overrides).length > 0,
    resetLocalPrefs: () => setOverrides({}),
  };
}
