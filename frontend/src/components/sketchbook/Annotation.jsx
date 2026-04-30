/**
 * Handwritten Caveat callout with a small curved arrow squiggle.
 * Positioned absolutely by the parent — drop it next to a polaroid
 * with `style={{ position: "absolute", left, top }}`.
 *
 * Props:
 *   side    — "right" (default) or "left". Controls which side the arrow
 *             squiggles toward.
 *   colour  — CSS colour for the arrow + accent words. Defaults to charcoal.
 */
export default function Annotation({
  children,
  side = "right",
  colour,
  className = "",
  style = {},
}) {
  const colourStyle = colour ? { "--sb-annotation-colour": colour } : undefined;
  return (
    <div
      className={`sb-annotation sb-annotation--${side} ${className}`.trim()}
      style={{ ...colourStyle, ...style }}
    >
      <span className="sb-annotation__text">{children}</span>
      <ArrowSquiggle side={side} />
    </div>
  );
}

function ArrowSquiggle({ side }) {
  const path =
    side === "right"
      ? { curve: "M82 8 Q60 0 38 14 Q18 26 8 46", head: "M8 46 L18 38 M8 46 L16 50" }
      : { curve: "M6 8 Q28 0 50 14 Q70 26 80 46", head: "M80 46 L70 38 M80 46 L72 50" };
  return (
    <svg
      className="sb-annotation__arrow"
      viewBox="0 0 88 54"
      aria-hidden="true"
    >
      <path d={path.curve} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d={path.head}  stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}