import { Link } from "react-router-dom";
import { SketchbookPage, Masthead } from "./sketchbook";

const S = {
  h2: {
    fontFamily: "var(--sb-font-display)", fontSize: 24,
    color: "var(--sb-charcoal)", margin: "34px 0 10px",
  },
  p: {
    fontFamily: "var(--sb-font-body)", fontSize: 15, lineHeight: 1.65,
    color: "var(--sb-charcoal-soft)", margin: "0 0 12px",
  },
  li: {
    fontFamily: "var(--sb-font-body)", fontSize: 15, lineHeight: 1.65,
    color: "var(--sb-charcoal-soft)", marginBottom: 6,
  },
};

export default function PrivacyPolicy() {
  return (
    <SketchbookPage>
      <Masthead title="PRIVACY" right={<Link to="/">← Back</Link>} />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "12px 20px 60px" }}>
        <div className="sb-eyebrow">HOW WE HANDLE YOUR DATA</div>
        <h1 className="sb-display sb-display-xl" style={{ margin: "8px 0 6px" }}>
          Privacy policy.
        </h1>
        <p style={{ ...S.p, fontStyle: "italic" }}>Last updated: August 2026</p>

        <h2 style={S.h2}>What we collect</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={S.li}>Your email address, password (stored as a bcrypt hash — we never see it), and optional display name.</li>
          <li style={S.li}>Your style profile, if you fill it in: gender, body type, style preference.</li>
          <li style={S.li}>Photos of garments you upload, and the attributes our AI derives from them (category, colour, material, season, formality, a short description).</li>
          <li style={S.li}>Outfit recommendations generated for you, and which ones you save.</li>
        </ul>

        <h2 style={S.h2}>Where your images go</h2>
        <p style={S.p}>
          When you scan a garment, the photo is sent to <strong>OpenAI</strong> (GPT-4o)
          to identify it. Under OpenAI's API data policy, images are not used to train
          their models and are retained for up to 30 days for abuse monitoring, then
          deleted. See{" "}
          <a href="https://openai.com/enterprise-privacy/" target="_blank" rel="noreferrer">
            OpenAI's policy
          </a>.
        </p>
        <p style={S.p}>
          Your photos are stored on <strong>Cloudinary</strong> (our image host) so your
          wardrobe can be displayed back to you. They stay there until you delete the
          garment or your account, at which point they are permanently destroyed.
        </p>

        <h2 style={S.h2}>Affiliate links</h2>
        <p style={S.p}>
          Some "buy" links in recommendations are affiliate links — if you
          purchase through one, Seynario may earn a commission at no cost to
          you. Outbound clicks route through our own server first, where we
          record only that the product link was clicked (no personal
          profile is attached). We disclose these links where they appear.
        </p>

        <h2 style={S.h2}>Analytics</h2>
        <p style={S.p}>
          We use cookieless analytics (Umami) to count page views and
          feature usage in aggregate. No cookies are set, no personal
          identifiers are collected, and no data is shared with advertisers.
        </p>

        <h2 style={S.h2}>Legal basis</h2>
        <p style={S.p}>
          We process your data to provide the service you signed up for (UK GDPR
          Article 6(1)(b) — performance of a contract). We don't sell your data,
          run ads, or share it with anyone beyond the processors named above.
        </p>

        <h2 style={S.h2}>Your rights</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={S.li}>
            <strong>Export</strong> — download everything we hold about you as JSON
            from your Profile page.
          </li>
          <li style={S.li}>
            <strong>Deletion</strong> — delete your account from your Profile page.
            This removes your account, wardrobe, and outfits from our database and
            permanently destroys your images on Cloudinary. It is not reversible.
          </li>
          <li style={S.li}>
            Questions or requests: email{" "}
            <a href="mailto:arjansdhinsa@gmail.com">arjansdhinsa@gmail.com</a>.
          </li>
        </ul>
      </main>
    </SketchbookPage>
  );
}
