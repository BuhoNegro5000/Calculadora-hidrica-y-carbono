import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'arrow-right' | 'arrow-left' | 'arrow-up-right' | 'check' | 'close' | 'sun' | 'moon'
  | 'settings' | 'globe' | 'chevron-down' | 'chevron-right' | 'info' | 'alert' | 'download'
  | 'print' | 'plus' | 'trash' | 'edit' | 'leaf' | 'droplet' | 'cloud' | 'flame' | 'home'
  | 'car' | 'plane' | 'bed' | 'bolt' | 'bag' | 'recycle' | 'users' | 'truck' | 'factory'
  | 'box' | 'plate' | 'cup' | 'water' | 'target' | 'sparkle' | 'shield' | 'search'
  | 'external' | 'copy' | 'menu' | 'tree' | 'bottle' | 'pool' | 'route' | 'chart'
  | 'scale' | 'lock' | 'database' | 'file' | 'wand' | 'refresh' | 'compass' | 'clock'
  | 'building' | 'calendar' | 'pin' | 'book' | 'code' | 'eye' | 'heart' | 'link';

const paths: Record<IconName, ReactNode> = {
  'arrow-right': <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  'arrow-left': <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
  'arrow-up-right': <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  check: <path d="m4 12.5 5 5L20 6.5" />,
  close: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></>,
  print: <><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 17h12v4H6z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  leaf: <><path d="M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 10-6 10-16Z" /><path d="M4 21c2-6 5-9 11-12" /></>,
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  cloud: <path d="M7 18a4 4 0 0 1-.8-7.9A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9Z" />,
  flame: <path d="M12 22c4 0 6.5-2.6 6.5-6 0-4.5-4-6.5-4-11 0 0-3 2-3 6 0 1.6-1.5 2-2.2.6-.4 1.3-.8 2.3-.8 4 0 3.6 2 6.4 3.5 6.4Z" />,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  car: <><path d="M5 16h14M3 16v-4l2-5h14l2 5v4" /><path d="M5 16v2M19 16v2" /><circle cx="7.5" cy="13" r="1.2" /><circle cx="16.5" cy="13" r="1.2" /></>,
  plane: <path d="M10 21 12 13l8-5-1.5-2-7 3-4-6-2 1 2 7-4 3 1 2 5-1 1.5 6Z" />,
  bed: <><path d="M3 18V8M3 12h18v6M21 18v-4M3 18h18" /><path d="M7 12V9h4v3" /></>,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />,
  bag: <><path d="M5 8h14l1 12H4Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  recycle: <><path d="m7 7 2.5-4h5L17 7" /><path d="M4 15l3-5M20 15l-3-5" /><path d="M7 21h10l2-4H5Z" /><path d="M9 3l-3 4M15 3l3 4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.5M18 20a5 5 0 0 0-2-4" /></>,
  truck: <><path d="M3 7h11v10H3zM14 11h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
  factory: <><path d="M3 21V9l5 3V9l5 3V9l5 3v9Z" /><path d="M18 9V4h3v5" /><path d="M7 21v-4h3v4M13 21v-4h3v4" /></>,
  box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 21v-9" /></>,
  plate: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /></>,
  cup: <><path d="M4 6h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><path d="M17 8h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M7 2v2M11 2v2M15 2v2" /></>,
  water: <><path d="M3 7c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0M3 12c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0M3 17c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></>,
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" /><path d="M19 16v4M17 18h4M5 3v2M4 4h2" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  external: <><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  tree: <><path d="M12 2 6 11h3l-3 5h5v6h2v-6h5l-3-5h3Z" /></>,
  bottle: <><path d="M10 2h4v3l1 2v13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7l1-2Z" /><path d="M9 10h6M9 15h6" /></>,
  pool: <><path d="M3 16c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0M3 20c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" /><path d="M7 13V6a2 2 0 0 1 2-2M17 13V6a2 2 0 0 0-2-2M7 13h10" /></>,
  route: <><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h7a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  scale: <><path d="M12 3v18M6 21h12" /><path d="M12 6 5 9l-2 5a4 4 0 0 0 8 0L7 9M12 6l7 3 2 5a4 4 0 0 1-8 0l4-5" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  wand: <><path d="M15 4V2M15 10V8M12.5 6.5h-2M19.5 6.5h-2M18 3.5l-1.5 1.5M18 9.5 16.5 8M3 21 14 10l1 1L4 22Z" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-4L3 10" /><path d="M3 5v5h5M4 13a8 8 0 0 0 14 4l3-3" /><path d="M21 19v-5h-5" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.3 5.7L8 16l2.3-5.7Z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  building: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h3a1 1 0 0 1 1 1v11M2 21h20" /><path d="M8 7h2M8 11h2M8 15h2M12 7h1M12 11h1M12 15h1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="17" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z" /><path d="M4 19.5V21h16v-4" /></>,
  code: <><path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16" /></>,
  eye: <><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  heart: <path d="M12 21c-6-3.5-9-7-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-3 7.5-9 11Z" />,
  link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></>,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, strokeWidth = 1.7, filled, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

const categoryIcons: Record<string, IconName> = {
  car: 'car', home: 'home', plate: 'plate', bag: 'bag', recycle: 'recycle',
  bolt: 'bolt', truck: 'truck', water: 'droplet', users: 'users', plane: 'plane',
  bed: 'bed', cup: 'cup', box: 'box', factory: 'factory',
};

export function categoryIcon(name: string): IconName {
  return categoryIcons[name] ?? 'leaf';
}
