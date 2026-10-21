// Lightweight inline icons (no icon library — keeps the bundle small for 3G).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IdIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M14 10h4M14 13h4M5.5 16c.8-1.4 4.2-1.4 5 0" />
  </svg>
);
export const PassportIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2Z" />
    <circle cx="12" cy="10" r="3" />
    <path d="M9.5 17h5" />
  </svg>
);
export const CarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5h-3M3 18v-5m0 5h3m12 0H9" />
    <circle cx="7.5" cy="18" r="1.6" />
    <circle cx="16.5" cy="18" r="1.6" />
  </svg>
);
export const BabyIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 10h.01M15 10h.01M9 14c.8.8 4.2.8 6 0" />
  </svg>
);
export const BankIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 9l9-5 9 5M4 9v9m16-9v9M4 20h16M8 12v4m4-4v4m4-4v4" />
  </svg>
);
export const TaxIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3h9l3 3v15H6zM9 7h4M9 11h6M9 15h6" />
    <path d="M15 3v3h3" />
  </svg>
);
export const DocIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 3h7l4 4v14H7zM7 9h6M7 13h8M7 17h8" />
  </svg>
);

export const SparkleIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.9L19 9.7l-4.9 1.8L12 16l-1.8-4.5L5 9.7l5.2-1.8z" />
    <path d="M18 15l.7 1.9L20.5 18l-1.8.7L18 20.5l-.7-1.8L15.5 18l1.8-.6z" />
  </svg>
);
export const SendIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const ThumbsUpIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2 2v3h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7" />
  </svg>
);
export const ThumbsDownIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 14V4h3v10zM17 14l-4 7a2 2 0 0 1-2-2v-3H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17" />
  </svg>
);

// Map a category slug (or a keyword in its name) to a service icon.
export function categoryIcon(slugOrName: string) {
  const s = slugOrName.toLowerCase();
  if (/(nic|national|id|ident)/.test(s)) return IdIcon;
  if (/passport/.test(s)) return PassportIcon;
  if (/(driv|vehicle|licen|traffic|motor)/.test(s)) return CarIcon;
  if (/(birth|civil|marriage|death|registr)/.test(s)) return BabyIcon;
  if (/(land|property|deed)/.test(s)) return BankIcon;
  if (/tax/.test(s)) return TaxIcon;
  return DocIcon;
}
