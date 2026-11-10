import type { ReactNode, SVGProps } from 'react';

export type MarketingIconName =
  | 'catalog'
  | 'doc'
  | 'box'
  | 'report'
  | 'org'
  | 'phone'
  | 'api'
  | 'plug'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'close'
  | 'chev'
  | 'chevd'
  | 'arrow'
  | 'arrowne'
  | 'plus'
  | 'check'
  | 'search'
  | 'globe'
  | 'bell'
  | 'user'
  | 'mail'
  | 'mic'
  | 'bank'
  | 'receipt'
  | 'sparkle'
  | 'shield'
  | 'lock'
  | 'pin'
  | 'chart'
  | 'twitter'
  | 'linkedin'
  | 'yt'
  | 'tg'
  | 'pin2'
  | 'cash'
  | 'layers'
  | 'upload'
  | 'rocket'
  | 'qr'
  | 'truck'
  | 'users'
  | 'headset';

export const MARKETING_ICON_NAMES: MarketingIconName[] = [
  'catalog',
  'doc',
  'box',
  'report',
  'org',
  'phone',
  'api',
  'plug',
  'sun',
  'moon',
  'menu',
  'close',
  'chev',
  'chevd',
  'arrow',
  'arrowne',
  'plus',
  'check',
  'search',
  'globe',
  'bell',
  'user',
  'mail',
  'mic',
  'bank',
  'receipt',
  'sparkle',
  'shield',
  'lock',
  'pin',
  'chart',
  'twitter',
  'linkedin',
  'yt',
  'tg',
  'pin2',
  'cash',
  'layers',
  'upload',
  'rocket',
  'qr',
  'truck',
  'users',
  'headset',
];

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: MarketingIconName;
  size?: number;
}

const PATHS: Record<MarketingIconName, ReactNode> = {
  catalog: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9 5-9-5 9-5 9 5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  report: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16V9M11 16V5M15 16v-4M19 16v-9" />
    </>
  ),
  org: (
    <>
      <path d="M3 9a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 13h18" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  api: (
    <>
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
      <path d="M14 4l-4 16" />
    </>
  ),
  plug: (
    <>
      <path d="M9 2v6M15 2v6" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 16v6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />,
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18M6 6l12 12" />
    </>
  ),
  chev: <path d="M9 18l6-6-6-6" />,
  chevd: <path d="M6 9l6 6 6-6" />,
  arrow: (
    <>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </>
  ),
  arrowne: (
    <>
      <path d="M7 17L17 7M9 7h8v8" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  bank: (
    <>
      <path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-6 10 6" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2 2 2v18l-2-2-2 2-2-2-2 2-2-2-2 2z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 4 4 5-7" />
    </>
  ),
  twitter: (
    <path d="M22 4.5a8.5 8.5 0 0 1-2.5.7A4.2 4.2 0 0 0 21.3 3a8.6 8.6 0 0 1-2.7 1A4.3 4.3 0 0 0 11 7.7c0 .3 0 .7.1 1A12.2 12.2 0 0 1 2.2 4a4.3 4.3 0 0 0 1.3 5.7 4.3 4.3 0 0 1-1.9-.5v.1a4.3 4.3 0 0 0 3.4 4.2 4.3 4.3 0 0 1-1.9.1 4.3 4.3 0 0 0 4 3 8.6 8.6 0 0 1-6.3 1.8A12 12 0 0 0 7.4 20c7.7 0 12-6.4 12-12v-.6c.8-.6 1.5-1.3 2.1-2z" />
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-4 0v6h-4v-6a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="11" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  yt: (
    <>
      <path d="M22 8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4z" />
      <path d="m10 9 6 3-6 3z" />
    </>
  ),
  tg: <path d="M22 3 2 11l6 2 2 7 4-5 6 5z" />,
  pin2: (
    <>
      <path d="M12 22V9" />
      <path d="M5 9h14l-2-7H7z" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 12h.01M17 12h.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </>
  ),
  rocket: (
    <>
      <path d="M5 13l-3 3v5h5l3-3" />
      <path d="M16 13l-4-4" />
      <path d="M21 3l-2 8a8 8 0 0 1-5.7 5.7L11 17l-4-4 .3-2.3A8 8 0 0 1 13 5z" />
      <circle cx="15" cy="9" r="1" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3M20 14v3M14 20h3M20 20v1" />
    </>
  ),
  truck: (
    <>
      <path d="M1 5h13v11H1z" />
      <path d="M14 8h4l3 3v5h-7" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7" />
    </>
  ),
  headset: (
    <>
      <path d="M3 15v-4a9 9 0 0 1 18 0v4" />
      <path d="M21 15a3 3 0 0 1-3 3h-1v-6h1a3 3 0 0 1 3 3zM3 15a3 3 0 0 0 3 3h1v-6H6a3 3 0 0 0-3 3z" />
    </>
  ),
};

export function MarketingIcon({ name, size = 18, ...rest }: Props) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon, labelled by caller props
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rest['aria-hidden'] ?? 'true'}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
