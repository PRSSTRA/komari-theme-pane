import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { getLabels } from '../lib/i18n';
import type { Language } from '../types/komari';

const charset = 'qertyuiopasdfhjklzxcvbn';
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function HeroWordmark({ title, offlineCount, lang, hasOverview }: {
  title: string;
  offlineCount: number;
  lang: Language;
  hasOverview: boolean;
}) {
  const alertText = offlineCount > 0 ? getLabels(lang).offline(offlineCount) : '';
  const [played, setPlayed] = useState('');
  useEffect(() => {
    if (!alertText) {
      setPlayed('');
      return;
    }
    const hold = window.setTimeout(() => setPlayed(alertText), 2000);
    return () => clearTimeout(hold);
  }, [alertText]);
  const alert = alertText !== '' && alertText !== played;
  const text = alert ? alertText : title;
  const glyphs = segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : Array.from(text);
  return (
    <div className={`pointer-events-none relative z-0 overflow-x-clip select-none text-center ${hasOverview ? '-mb-3 sm:-mb-5' : 'mb-1'}`}>
      <h1 key={text} id="hero-wordmark" className={`sg-hero-wordmark relative mx-auto max-w-full ${alert ? 'sg-hero-wordmark-alert' : ''}`}>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" className="sg-pane-shuffle sg-hero-wordmark-ink">
          {glyphs.map((segment, index) => {
            const first = charset[(index * 7 + 4) % charset.length];
            const second = charset[(index * 13 + 2) % charset.length];
            return (
              <span key={index} className="sg-pane-shuffle-cell" style={{ '--shuffle-delay': `${((index * 113) % 451)}ms` } as CSSProperties}>
                <span className="sg-pane-shuffle-target">{segment === ' ' ? '\u00a0' : segment}</span>
                {!alert && segment.trim() && <><span className="sg-pane-shuffle-echo">{first}</span><span className="sg-pane-shuffle-echo">{second}</span></>}
              </span>
            );
          })}
        </span>
      </h1>
    </div>
  );
}
