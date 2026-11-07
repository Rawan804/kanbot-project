/**
 * Friendly pastel illustration for empty states: three fanned cards and a spark.
 * Colours come from the theme tokens, so it works in light and dark mode.
 */
export function EmptyArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      role="presentation"
      aria-hidden="true"
      fill="none"
    >
      <rect x="22" y="34" width="86" height="72" rx="16" transform="rotate(-9 22 34)" fill="var(--kb-sky-bg)" />
      <rect x="92" y="30" width="86" height="72" rx="16" transform="rotate(8 92 30)" fill="var(--kb-rose-bg)" />
      <rect x="56" y="26" width="88" height="80" rx="18" fill="var(--kb-surface)" stroke="var(--kb-line)" strokeWidth="2" />
      <rect x="70" y="42" width="34" height="9" rx="4.5" fill="var(--kb-lav-bg)" />
      <rect x="70" y="60" width="58" height="7" rx="3.5" fill="var(--kb-soft)" />
      <rect x="70" y="73" width="44" height="7" rx="3.5" fill="var(--kb-soft)" />
      <circle cx="76" cy="92" r="5" fill="var(--kb-sage-dot)" />
      <circle cx="92" cy="92" r="5" fill="var(--kb-sand-dot)" />
      <path d="M160 18v14M153 25h14" stroke="var(--kb-lav-dot)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="22" r="4" fill="var(--kb-sand-dot)" opacity="0.7" />
    </svg>
  );
}
