import manifest from '../../komari-theme.json' with { type: 'json' };
import type { KomariThemeSettings, LocalPreferences, PreferenceKey } from '../types/komari';

const localKeys = [
  'show_world_map', 'map_overlap_mode', 'show_map_clock', 'show_solar_terminator',
  'show_summary_bar', 'show_event_feed', 'default_view', 'card_density',
  'show_offline_first', 'show_total_traffic', 'show_tags', 'show_load_temp',
  'show_traffic_bar', 'reduce_transparency',
] as const satisfies readonly PreferenceKey[];

const fields = manifest.configuration.data.filter(field => 'key' in field);

function record(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function array(input: unknown): unknown[] | undefined {
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { return undefined; }
  }
  return Array.isArray(input) ? input : undefined;
}

function readField(field: (typeof fields)[number], value: unknown) {
  switch (field.type) {
    case 'switch': return typeof value === 'boolean' ? value : undefined;
    case 'string': return typeof value === 'string' ? value : undefined;
    case 'select': return typeof value === 'string' && field.options?.split(',').includes(value) ? value : undefined;
    case 'nodes': return array(value)?.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    case 'pingtasks': return array(value)?.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);
  }
}

export function normalizeThemeSettings(input: unknown): KomariThemeSettings {
  const values = record(input);
  return Object.fromEntries(fields.map(field => [field.key,
    readField(field, values[field.key!]) ?? readField(field, field.default),
  ])) as unknown as KomariThemeSettings;
}

export const DEFAULT_THEME_SETTINGS = normalizeThemeSettings(null);

export function normalizeLocalPreferences(input: unknown): LocalPreferences {
  const values = record(input);
  return Object.fromEntries(fields.flatMap(field => {
    const key = field.key as PreferenceKey;
    if (!localKeys.includes(key)) return [];
    const value = readField(field, values[key]);
    return value === undefined ? [] : [[key, value]];
  }));
}
