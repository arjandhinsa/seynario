/**
 * The yellow sticky-note callout — used for the stylist's one-line
 * styling insight ("scuff the heel slightly").
 *
 * Always pinned by the small dark dot at the top centre. Slight tilt
 * by default — pass a different `tilt` per note for variety in flat-lays.
 */
export default function StickyNote({
  children,
  tilt = -2,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`sb-sticky-note ${className}`.trim()}
      style={{ "--sb-tilt": `${tilt}deg`, ...style }}
    >
      {children}
    </div>
  );
}