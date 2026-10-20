import React, { SVGProps } from "react";

// Small SVG icon set (16-grid, 1.6 stroke). Icons are decorative by default; pass `title` via
// aria-label on the parent control instead of relying on the glyph.
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Base({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const SunIcon = (p: IconProps) => (
  <Base {...p}><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" /></Base>
);
export const MoonIcon = (p: IconProps) => (
  <Base {...p}><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" /></Base>
);
export const ArrowIcon = (p: IconProps) => (
  <Base {...p}><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></Base>
);
export const CheckIcon = (p: IconProps) => (
  <Base {...p}><path d="m3 8.5 3.2 3.2L13 4.8" /></Base>
);
export const LockIcon = (p: IconProps) => (
  <Base {...p}><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" /></Base>
);
export const TrainIcon = (p: IconProps) => (
  <Base {...p}><rect x="3.5" y="2" width="9" height="9" rx="2" /><path d="M3.5 7h9M6 14l1-3M10 14l-1-3" /><circle cx="6" cy="9" r=".6" fill="currentColor" /><circle cx="10" cy="9" r=".6" fill="currentColor" /></Base>
);
export const MenuIcon = (p: IconProps) => (
  <Base {...p}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></Base>
);
export const CloseIcon = (p: IconProps) => (
  <Base {...p}><path d="m3.5 3.5 9 9M12.5 3.5l-9 9" /></Base>
);
export const SettingsIcon = (p: IconProps) => (
  <Base {...p}><path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" /></Base>
);
export const SignOutIcon = (p: IconProps) => (
  <Base {...p}><path d="M6.5 2.5h-3v11h3M6 8h7.5M10.5 4.8 13.5 8l-3 3.2" /></Base>
);
export const WarningIcon = (p: IconProps) => (
  <Base {...p}><path d="M8 2 14.5 13.5h-13Z" /><path d="M8 6.5v3.2" /><circle cx="8" cy="11.6" r=".5" fill="currentColor" /></Base>
);
export const InfoIcon = (p: IconProps) => (
  <Base {...p}><circle cx="8" cy="8" r="6" /><path d="M8 7.2v3.6" /><circle cx="8" cy="5.2" r=".5" fill="currentColor" /></Base>
);
export const SearchIcon = (p: IconProps) => (
  <Base {...p}><circle cx="7" cy="7" r="4.2" /><path d="m10.2 10.2 3.3 3.3" /></Base>
);
export const RouteIcon = (p: IconProps) => (
  <Base {...p}><circle cx="3.5" cy="12.5" r="1.6" /><circle cx="12.5" cy="3.5" r="1.6" /><path d="M5 12.5h4a2 2 0 0 0 2-2v-1.5a2 2 0 0 0-2-2H7a2 2 0 0 1-2-2V5.2" /></Base>
);
export const StationIcon = (p: IconProps) => (
  <Base {...p}><circle cx="8" cy="8" r="4.2" /></Base>
);
export const PlusIcon = (p: IconProps) => (
  <Base {...p}><path d="M8 3v10M3 8h10" /></Base>
);
export const MinusIcon = (p: IconProps) => (
  <Base {...p}><path d="M3 8h10" /></Base>
);
export const FitIcon = (p: IconProps) => (
  <Base {...p}><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></Base>
);
