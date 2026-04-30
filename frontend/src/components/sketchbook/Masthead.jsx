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
      <div className="sb-masthead__wordmark">{title}</div>
      <div className="sb-masthead__meta">
        {eyebrow && <span className="sb-masthead__eyebrow">{eyebrow}</span>}
        {right && <span className="sb-masthead__right">{right}</span>}
      </div>
    </header>
  );
}