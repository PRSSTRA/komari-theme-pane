import { LogIn } from 'lucide-react';
import { getLabels } from '../lib/i18n';
import type { Language } from '../types/komari';

export function PrivateSiteGate({ lang }: { lang: Language }) {
  const t = getLabels(lang);
  return (
    <section className="sg-panel mx-auto my-auto max-w-md rounded-xl p-7 text-center">
      <h2 className="font-medium">{t.private}</h2>
      <p className="my-3 text-sm text-[var(--sg-muted-fg)]">{t.privateHelp}</p>
      <a href="/admin" data-slot="button" data-variant="outline" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm"><LogIn aria-hidden="true" className="size-3.5" />{t.signIn}</a>
    </section>
  );
}
