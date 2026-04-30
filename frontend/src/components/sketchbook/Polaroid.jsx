/**
 * Pinned photo card — the workhorse of the sketchbook aesthetic. Renders
 * a paper-white card with a slight rotation, drop shadow, optional washi
 * tape strip at the top, optional pushpin, and a handwritten caption
 * underneath.
 *
 * Children render as the photo content (an <img>, an inline <svg>, etc.).
 *
 * Props:
 *   tilt     — rotation in degrees, default -2. Pass slightly different values
 *              per polaroid in a flat-lay so they read as casually placed.
 *   caption  — text rendered in Caveat below the photo.
 *   washi    — null (default) | "coral" | "mustard" | "blue" — adds a strip
 *              of decorative tape at the top.
 *   pin      — bool, default false — shows a pushpin at the top instead of
 *              washi tape (use one or the other, not both).
 *
 * Usage:
 *   <Polaroid tilt={-3} caption="cream linen shirt" washi="coral">
 *     <img src="/wardrobe/cream-linen-camp-collar-shirt.svg" alt="" />
 *   </Polaroid>
 */
export default function Polaroid({
  tilt = -2,
  caption,
  washi,
  pin = false,
  children,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`sb-polaroid ${className}`.trim()}
      style={{ "--sb-tilt": `${tilt}deg`, ...style }}
    >
      <div className="sb-polaroid__photo">{children}</div>
      {caption && <div className="sb-polaroid__caption">{caption}</div>}
      {washi && <WashiTape colour={washi} />}
      {pin && <Pushpin />}
    </div>
  );
}

function WashiTape({ colour = "coral" }) {
  return <span className={`sb-washi sb-washi--${colour}`} aria-hidden="true" />;
}

function Pushpin() {
  return <span className="sb-pushpin" aria-hidden="true" />;
}