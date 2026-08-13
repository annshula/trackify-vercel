import * as React from 'react';

/**
 * Inline SVG flags for the curated currency list.
 *
 * Flag emoji (regional indicator symbol pairs) depend on the OS/browser
 * having a font that renders them as pictures — many don't, and silently
 * fall back to showing the raw two letters or nothing at all. SVG renders
 * identically everywhere, so the 5 curated countries are drawn directly
 * instead of relying on emoji font support.
 */

const FLAGS: Record<string, React.ReactNode> = {
  AU: (
    <>
      <rect width="20" height="15" fill="#00247D" />
      <g transform="scale(0.5)">
        <path d="M0,0 20,15 M20,0 0,15" stroke="#fff" strokeWidth="3" />
        <path d="M0,0 20,15 M20,0 0,15" stroke="#CF142B" strokeWidth="1" />
        <path d="M10,0 10,15 M0,7.5 20,7.5" stroke="#fff" strokeWidth="5" />
        <path d="M10,0 10,15 M0,7.5 20,7.5" stroke="#CF142B" strokeWidth="3" />
      </g>
      <g fill="#fff">
        <circle cx="15" cy="4" r="0.9" />
        <circle cx="17.2" cy="7" r="0.9" />
        <circle cx="15.5" cy="10" r="0.9" />
        <circle cx="12.8" cy="8.5" r="0.7" />
        <circle cx="13.5" cy="5.5" r="0.6" />
      </g>
    </>
  ),
  IN: (
    <>
      <rect width="20" height="5" fill="#FF9933" />
      <rect y="5" width="20" height="5" fill="#fff" />
      <rect y="10" width="20" height="5" fill="#138808" />
      <circle cx="10" cy="7.5" r="1.7" fill="none" stroke="#000080" strokeWidth="0.35" />
      <circle cx="10" cy="7.5" r="0.35" fill="#000080" />
    </>
  ),
  US: (
    <>
      <rect width="20" height="15" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11, 13].map((y) => (
        <rect key={y} y={y} width="20" height="1.15" fill="#fff" />
      ))}
      <rect width="9" height="8.15" fill="#3C3B6E" />
    </>
  ),
  GB: (
    <>
      <rect width="20" height="15" fill="#00247D" />
      <path d="M0,0 20,15 M20,0 0,15" stroke="#fff" strokeWidth="3" />
      <path d="M0,0 20,15 M20,0 0,15" stroke="#CF142B" strokeWidth="1" />
      <path d="M10,0 10,15 M0,7.5 20,7.5" stroke="#fff" strokeWidth="5" />
      <path d="M10,0 10,15 M0,7.5 20,7.5" stroke="#CF142B" strokeWidth="3" />
    </>
  ),
  CA: (
    <>
      <rect width="20" height="15" fill="#fff" />
      <rect width="5" height="15" fill="#FF0000" />
      <rect x="15" width="5" height="15" fill="#FF0000" />
      <path
        d="M10,3.5 10.6,5.2 12.3,4.6 11.5,6 13,6.9 11.3,7.2 11.6,8.8 10,7.9 8.4,8.8 8.7,7.2 7,6.9 8.5,6 7.7,4.6 9.4,5.2 Z"
        fill="#FF0000"
      />
      <rect x="9.4" y="7.9" width="1.2" height="1.8" fill="#FF0000" />
    </>
  ),
};

export function FlagIcon({ countryCode, className }: { countryCode: string; className?: string }) {
  const flag = FLAGS[countryCode.toUpperCase()];
  if (!flag) return <span className={className}>🏳️</span>;
  return (
    <svg
      viewBox="0 0 20 15"
      className={className}
      aria-hidden="true"
      style={{ borderRadius: 2 }}
    >
      {flag}
    </svg>
  );
}
