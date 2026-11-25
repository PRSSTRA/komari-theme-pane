import type { ReactNode } from 'react';
import { parseRegion } from './format';

function Star({ x, y, size, tips = 5 }: { x: number; y: number; size: number; tips?: number }) {
  const points = Array.from({ length: tips * 2 }, (_, i) => {
    const angle = i * Math.PI / tips - Math.PI / 2;
    const radius = i % 2 ? size * 0.48 : size;
    return `${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`;
  });
  return <polygon points={points.join(' ')}/>;
}

function Stripes({ colors }: { colors: readonly [string, string, string] }) {
  return colors.map((fill, row) => <rect key={row} y={row * 6} width="24" height="6" fill={fill}/>);
}

const FLAG_ART: Record<string, ReactNode> = {
  JP: <><rect width="24" height="18" fill="#f7f8fa"/><circle cx="12" cy="9" r="4.6" fill="#c82333"/></>,
  HK: <><rect width="24" height="18" fill="#de2930"/><g transform="translate(12,9)" fill="#f7f8fa"><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(0)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(72)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(144)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(216)"/><path d="M0,-0.6 C-1.4,-1.8 -1.8,-4.2 0,-5.3 C1.2,-4.4 1.3,-2.5 0.5,-0.9 Z" transform="rotate(288)"/></g></>,
  SG: <><rect width="24" height="9" fill="#e03038"/><rect y="9" width="24" height="9" fill="#f7f8fa"/><circle cx="6.2" cy="4.5" r="2.8" fill="#f7f8fa"/><circle cx="7.4" cy="4.5" r="2.35" fill="#e03038"/><g fill="#f7f8fa"><circle cx="8.4" cy="3.1" r="0.6"/><circle cx="9.8" cy="4.1" r="0.6"/><circle cx="9.3" cy="5.7" r="0.6"/><circle cx="7.6" cy="5.7" r="0.6"/><circle cx="7.1" cy="4.1" r="0.6"/></g></>,
  KR: <><rect width="24" height="18" fill="#f7f8fa"/><circle cx="12" cy="9" r="4.1" fill="#cd2e3a"/><path d="M7.9,9 A4.1,4.1 0 0,0 16.1,9 A2.05,2.05 0 0,0 12,9 A2.05,2.05 0 0,1 7.9,9 Z" fill="#0047a0"/><g stroke="#1b1f27" strokeWidth="0.95" strokeLinecap="square"><path d="M4.2,5.8 L6.6,3.4 M5.1,6.7 L7.5,4.3 M6,7.6 L8.4,5.2"/><path d="M17.4,3.4 L19.8,5.8 M16.5,4.3 L18.9,6.7 M15.6,5.2 L18,7.6"/><path d="M4.2,12.2 L6.6,14.6 M5.1,11.3 L7.5,13.7 M6,10.4 L8.4,12.8"/><path d="M17.4,14.6 L19.8,12.2 M16.5,13.7 L18.9,11.3 M15.6,12.8 L18,10.4"/></g></>,
  AU: <><rect width="24" height="18" fill="#0b2a6b"/><g><rect width="12" height="9" fill="#0a286e"/><path d="M0,0 L12,9 M12,0 L0,9" stroke="#f7f8fa" strokeWidth="1.6"/><path d="M0,0 L12,9 M12,0 L0,9" stroke="#c82333" strokeWidth="0.7"/><path d="M6,0 V9 M0,4.5 H12" stroke="#f7f8fa" strokeWidth="2.5"/><path d="M6,0 V9 M0,4.5 H12" stroke="#c82333" strokeWidth="1.3"/></g><g fill="#f7f8fa"><circle cx="6" cy="13.5" r="1.45"/><circle cx="18" cy="4.2" r="0.9"/><circle cx="15.5" cy="7.6" r="0.85"/><circle cx="20.2" cy="7.2" r="0.85"/><circle cx="18" cy="13.5" r="1.05"/><circle cx="19.3" cy="9.9" r="0.55"/></g></>,
  DE: <><rect width="24" height="6" fill="#17191e"/><rect y="6" width="24" height="6" fill="#d62828"/><rect y="12" width="24" height="6" fill="#f2b705"/></>,
  NL: <><rect width="24" height="6" fill="#c82834"/><rect y="6" width="24" height="6" fill="#f7f8fa"/><rect y="12" width="24" height="6" fill="#21468b"/></>,
  GB: <><rect width="24" height="18" fill="#0a286e"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#f7f8fa" strokeWidth="3.2"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#c82333" strokeWidth="1.4"/><path d="M12,0 V18 M0,9 H24" stroke="#f7f8fa" strokeWidth="5"/><path d="M12,0 V18 M0,9 H24" stroke="#c82333" strokeWidth="2.8"/></>,
  US: <><rect width="24" height="18" fill="#f7f8fa"/><g fill="#c82b37"><rect y="0" width="24" height="1.5"/><rect y="2.8" width="24" height="1.5"/><rect y="5.6" width="24" height="1.5"/><rect y="8.4" width="24" height="1.5"/><rect y="11.2" width="24" height="1.5"/><rect y="14" width="24" height="1.5"/><rect y="16.6" width="24" height="1.4"/></g><rect width="10.8" height="9.9" fill="#1e3a6e"/><g fill="#f7f8fa"><circle cx="2.2" cy="2.1" r="0.55"/><circle cx="4.6" cy="2.1" r="0.55"/><circle cx="7" cy="2.1" r="0.55"/><circle cx="9.2" cy="2.1" r="0.55"/><circle cx="3.4" cy="3.9" r="0.55"/><circle cx="5.8" cy="3.9" r="0.55"/><circle cx="8.1" cy="3.9" r="0.55"/><circle cx="2.2" cy="5.7" r="0.55"/><circle cx="4.6" cy="5.7" r="0.55"/><circle cx="7" cy="5.7" r="0.55"/><circle cx="9.2" cy="5.7" r="0.55"/><circle cx="3.4" cy="7.5" r="0.55"/><circle cx="5.8" cy="7.5" r="0.55"/><circle cx="8.1" cy="7.5" r="0.55"/></g></>,
  CN: <><rect width="24" height="18" fill="#de2910"/><g fill="#ffde00"><polygon points="4.8,2.6 5.5,4.7 7.7,4.7 5.9,6 6.6,8.1 4.8,6.8 3,8.1 3.7,6 1.9,4.7 4.1,4.7"/><circle cx="9.2" cy="2.7" r="0.7"/><circle cx="10.4" cy="4.4" r="0.7"/><circle cx="10.4" cy="6.6" r="0.7"/><circle cx="9.2" cy="8.3" r="0.7"/></g></>,
  TW: <><rect width="24" height="18" fill="#fe2b1e"/><rect width="12" height="9" fill="#002299"/><circle cx="6" cy="4.5" r="2.2" fill="#f7f8fa"/></>,
  FR: <><rect width="8" height="18" fill="#1d3c8e"/><rect x="8" width="8" height="18" fill="#f7f8fa"/><rect x="16" width="8" height="18" fill="#d92b36"/></>,
  CA: <><rect width="6" height="18" fill="#d8262e"/><rect x="6" width="12" height="18" fill="#f7f8fa"/><rect x="18" width="6" height="18" fill="#d8262e"/><path d="M12,4.2 L13.1,7 L15.4,6.4 L14.4,8.7 L16,9.7 L13.5,10.5 L13.8,12 L12.4,11.6 L12.4,14 L11.6,14 L11.6,11.6 L10.2,12 L10.5,10.5 L8,9.7 L9.6,8.7 L8.6,6.4 L10.9,7 Z" fill="#d8262e"/></>,
  MO: <><rect width="24" height="18" fill="#077662"/><g fill="#fff"><path d="M12 6.9c-2 1.5-2.3 4-.1 5.3-2.4-1.9-4.6-1.5-5.9-1.3.7 2.3 3 3 6 3s5.3-.7 6-3c-1.3-.2-3.5-.6-5.9 1.3 2.2-1.3 1.9-3.8-.1-5.3ZM7.6 14.4h8.8v.65H7.6ZM9 15.5h6v.55H9Z"/></g><g fill="#ffde00"><Star x={12} y={4.1} size={1}/><Star x={9.4} y={4.8} size={0.65}/><Star x={14.6} y={4.8} size={0.65}/><Star x={7.3} y={6.1} size={0.65}/><Star x={16.7} y={6.1} size={0.65}/></g></>,
  NZ: <><rect width="24" height="18" fill="#0a286e"/><g transform="scale(.5)"><path d="M0 0 24 18M24 0 0 18" stroke="#fff" strokeWidth="3.2"/><path d="M0 0 24 18M24 0 0 18" stroke="#c82333" strokeWidth="1.4"/><path d="M12 0v18M0 9h24" stroke="#fff" strokeWidth="5"/><path d="M12 0v18M0 9h24" stroke="#c82333" strokeWidth="2.8"/></g><g fill="#cc142b" stroke="#fff" strokeWidth=".28" strokeLinejoin="round"><Star x={18} y={4.2} size={1.1}/><Star x={15.1} y={8} size={1.1}/><Star x={21} y={7.4} size={0.95}/><Star x={18} y={13.6} size={1.3}/></g></>,
  RU: <Stripes colors={['#fff', '#17439f', '#d52b1e']}/>,
  IN: <><Stripes colors={['#ff9933', '#fff', '#138808']}/><circle cx="12" cy="9" r="2" fill="none" stroke="#000080" strokeWidth=".5"/><path d="M10 9h4m-2-2v4m-1.4-3.4 2.8 2.8m0-2.8-2.8 2.8" stroke="#000080" strokeWidth=".25"/></>,
  MY: <><rect width="24" height="18" fill="#fff"/><path d="M0 .64h24m-24 2.57h24m-24 2.58h24m-24 2.57h24m-24 2.57h24m-24 2.57h24m-24 2.57h24" stroke="#cc1228" strokeWidth="1.29"/><rect width="12" height="10.28" fill="#0a286e"/><path d="M6.9 2.3a3.15 3.15 0 1 0 0 5.7 3 3 0 1 1 0-5.7" fill="#ffcc00"/><g fill="#ffcc00"><Star x={8.6} y={5.15} size={1.9} tips={14}/></g></>,
  TH: <><rect width="24" height="18" fill="#c92b34"/><rect y="3" width="24" height="12" fill="#fff"/><rect y="6" width="24" height="6" fill="#2d2a4a"/></>,
  VN: <><rect width="24" height="18" fill="#da251d"/><g fill="#ffdf00"><Star x={12} y={9} size={4.7}/></g></>,
  ID: <><rect width="24" height="9" fill="#ce1126"/><rect y="9" width="24" height="9" fill="#fff"/></>,
  PH: <><rect width="24" height="9" fill="#0038a8"/><rect y="9" width="24" height="9" fill="#ce1126"/><path d="M0 0 12 9 0 18Z" fill="#fff"/><g fill="#fcd116"><Star x={5} y={9} size={2.7} tips={8}/><circle cx="5" cy="9" r="1.25"/><Star x={1.6} y={3.4} size={0.85}/><Star x={1.6} y={14.6} size={0.85}/><Star x={9.6} y={9} size={0.85}/></g></>,
  TR: <><rect width="24" height="18" fill="#e30a17"/><path d="M13.4 5.25a4.5 4.5 0 1 0 0 7.5 3.6 3.6 0 1 1 0-7.5" fill="#fff"/><g fill="#fff"><Star x={14.3} y={9} size={2.5}/></g></>,
  SE: <><rect width="24" height="18" fill="#006aa7"/><path d="M0 9h24M8 0v18" stroke="#fecc00" strokeWidth="3.2"/></>,
  NO: <><rect width="24" height="18" fill="#ba0c2f"/><path d="M0 9h24M8 0v18" stroke="#fff" strokeWidth="4.5"/><path d="M0 9h24M8 0v18" stroke="#00205b" strokeWidth="2.25"/></>,
  FI: <><rect width="24" height="18" fill="#fff"/><path d="M0 9h24M8 0v18" stroke="#002f6c" strokeWidth="4.5"/></>,
  CH: <><rect width="24" height="18" fill="#d52b1e"/><path d="M7.5 9h9M12 4.5v9" stroke="#fff" strokeWidth="2.8"/></>,
  IT: <><rect width="8" height="18" fill="#008c45"/><rect x="8" width="8" height="18" fill="#fff"/><rect x="16" width="8" height="18" fill="#cd212a"/></>,
  ES: <><rect width="24" height="18" fill="#aa151b"/><rect y="4.5" width="24" height="9" fill="#f1bf00"/><path d="M6.2 7.7h3.6v3.2l-1.8.8-1.8-.8Z" fill="#aa151b"/><path d="M6.3 7.25h3.4M8 8v3.3M6.5 9.4h3" stroke="#f7f8fa" strokeWidth=".45"/></>,
  PL: <><rect width="24" height="9" fill="#fff"/><rect y="9" width="24" height="9" fill="#dc143c"/></>,
  BR: <><rect width="24" height="18" fill="#009c3b"/><path d="M12 2.5 22 9 12 15.5 2 9Z" fill="#ffdf00"/><circle cx="12" cy="9" r="4" fill="#002776"/><path d="M8.2 7.8c2.6-.5 5.4.2 7.5 2.4l-.45 1C13.3 9 10.8 8.4 8 8.9Z" fill="#fff"/></>,
  AE: <><Stripes colors={['#00843d', '#fff', '#000']}/><rect width="6" height="18" fill="#ef3340"/></>,
  ZA: <><rect width="24" height="9" fill="#de3831"/><rect y="9" width="24" height="9" fill="#002395"/><path d="M0 0 11.7 6.1H24v5.8H11.7L0 18" fill="#fff"/><path d="M0 0 11.7 7.2H24v3.6H11.7L0 18" fill="#007a4d"/><path d="M0 3.3 9.1 9 0 14.7" fill="#ffb612"/><path d="M0 4.6 7 9 0 13.4" fill="#000"/></>,
};

const globe = <g transform="translate(3,0) scale(.75)" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="7.5"/><path d="M4.5 12h15M12 4.5a11.5 11.5 0 0 1 3 7.5 11.5 11.5 0 0 1-3 7.5 11.5 11.5 0 0 1-3-7.5 11.5 11.5 0 0 1 3-7.5z"/>
</g>;

export function RegionFlag({ code, size = 'md' }: { code?: string | null; size?: 'sm' | 'md' }) {
  const region = parseRegion(code);
  const flag = FLAG_ART[region];
  return <span className={`sg-flag sg-flag-${size}`} role="img" aria-label={region || 'Region unset'}
    style={{ width: size === 'sm' ? 16 : 56 / 3, background: flag ? undefined : 'var(--sg-muted)',
      color: flag ? undefined : 'var(--sg-muted-fg)' }}>
    <svg viewBox="0 0 24 18" aria-hidden="true">{flag ?? globe}</svg>
  </span>;
}
