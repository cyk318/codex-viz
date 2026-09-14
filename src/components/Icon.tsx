import type { CSSProperties } from 'react';
const paths = {
  orbit: (
    <>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="18" cy="6" r="1.5" fill="currentColor" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 3v17h17M8 15v-4m5 4V6m5 9V9" />
    </>
  ),
  folder: <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3Z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  refresh: (
    <>
      <path d="M20 7a9 9 0 0 0-15-1L2 9m0-6v6h6M4 17a9 9 0 0 0 15 1l3-3m0 6v-6h-6" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-8Z" />,
  terminal: (
    <>
      <path d="m5 8 4 4-4 4m7 0h6" />
      <rect x="2" y="3" width="20" height="18" rx="4" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  code: (
    <>
      <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 3l-4 18" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="4" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="20" r="2" />
      <path d="M6 6v12m0-4c8 0 12-1 12-6" />
    </>
  ),
  message: (
    <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
  ),
  shield: (
    <>
      <path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z" />
      <path d="m8 11 3 3 5-6" />
    </>
  )
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 18,
  className = '',
  style
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
