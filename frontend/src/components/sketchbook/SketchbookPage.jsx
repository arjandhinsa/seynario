/**
 * Outer wrapper for any sketchbook-themed screen.
 *
 * - Applies the warm-paper background (flips to dark via [data-theme="dark"]
 *   set on <html>; we'll add the toggle on a later screen).
 * - Renders the subtle grain overlay so the page reads as paper, not flat fill.
 * - Optionally rotates the per-page accent colour via the `accent` prop.
 *
 * Usage:
 *   <SketchbookPage accent="var(--sb-coral)">
 *     <Masthead />
 *     ...rest of page
 *   </SketchbookPage>
 */
export default function SketchbookPage({ accent, children, className = "" }) {
  const style = accent ? { "--sb-accent": accent } : undefined;

  return (
    <div className={`sb-page ${className}`.trim()} style={style}>
      <SketchbookGrain />
      {children}
    </div>
  );
}

function SketchbookGrain() {
  return (
    <svg
      className="sb-page__grain"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 600 800"
      aria-hidden="true"
    >
      <filter id="sb-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .30  0 0 0 .35 0" />
      </filter>
      <rect width="600" height="800" filter="url(#sb-grain)" />
    </svg>
  );
}