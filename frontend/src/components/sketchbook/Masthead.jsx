/**
 * Editorial dark band at the top of every sketchbook page.
 *
 * Always warm-charcoal (var(--sb-ink), #1F1E1A) regardless of page theme —
 * it's structural chrome that frames the paper page beneath. So even in
 * dark mode, this stays the same colour. The masthead is "the cover of
 * the magazine"; the paper underneath is "the page".
 *
 * Slots:
 *   - title (left, default "SEYNARIO"): the wordmark or section name,
 *     rendered in Playfair small caps with wide letterspacing.
 *   - eyebrow (right): small letterspaced uppercase metadata —
 *     a date, an issue number, "Vol. 01 · SS · 2026", etc.
 *   - right: React node placed after eyebrow — back link, avatar,
 *     close button.
 *
 * Examples:
 *   <Masthead />                                              // bare
 *   <Masthead eyebrow="Wed · 14 May" />
 *   <Masthead title="Look · I" eyebrow="Drinks · 7pm" />
 *   <Masthead right={<Link to="/">← Back to sign in</Link>} />
 */
export default function Masthead({
  title = "SEYNARIO",
  eyebrow,
  right,
  className = "",
}) {
  return (
    <header className={`sb-masthead ${className}`.trim()}>
      <div
        className="sb-masthead__wordmark"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        {/* Hanger mark — shared DNA with the SEYN family of sites */}
        <svg
          viewBox="0 0 72 72"
          width="20"
          height="20"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M36 20 v6 M16 50 L36 26 L56 50 Z"
            stroke="#6FA3A3"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="36" cy="16" r="5" stroke="#6FA3A3" strokeWidth="4" />
        </svg>
        {title}
      </div>
      <div className="sb-masthead__meta">
        {eyebrow && <span className="sb-masthead__eyebrow">{eyebrow}</span>}
        {right && <span className="sb-masthead__right">{right}</span>}
      </div>
    </header>
  );
}