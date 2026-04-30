import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";
import { SketchbookPage, Masthead } from "./sketchbook";


const GENDERS = [
  { id: "male",                label: "Male" },
  { id: "female",              label: "Female" },
  { id: "non-binary",          label: "Non-binary" },
  { id: "prefer not to say",   label: "Prefer not to say" },
];

const BODY_TYPES = [
  { id: "slim",       label: "Slim" },
  { id: "athletic",   label: "Athletic" },
  { id: "average",    label: "Average" },
  { id: "curvy",      label: "Curvy" },
  { id: "plus-size",  label: "Plus-size" },
];

const STYLES = [
  { id: "minimal",        label: "Minimal",        blurb: "Neutral palette, clean lines, no logos." },
  { id: "classic",        label: "Classic",        blurb: "Timeless staples; oxford shirts, navy blazers, denim." },
  { id: "smart-casual",   label: "Smart-casual",   blurb: "Polished but relaxed; chinos and an open collar." },
  { id: "tailored",       label: "Tailored",       blurb: "Suit-led, structured shoulders, considered fit." },
  { id: "old-money",      label: "Old money",      blurb: "Understated wealth; cashmere, no branding, soft tans." },
  { id: "streetwear",     label: "Streetwear",     blurb: "Graphic tees, hoodies, sneakers, urban silhouette." },
  { id: "preppy",         label: "Preppy",         blurb: "Collegiate; polos, loafers, gingham, blazers." },
  { id: "bohemian",       label: "Bohemian",       blurb: "Flowing, eclectic, prints, layered jewellery." },
  { id: "edgy",           label: "Edgy",           blurb: "Sharp, dark, leather, statement pieces." },
  { id: "athleisure",     label: "Athleisure",     blurb: "Performance fabrics worn off the gym; clean trainers." },
  { id: "vintage",        label: "Vintage",        blurb: "Pieces with history; thrifted, retro silhouettes." },
  { id: "workwear",       label: "Workwear",       blurb: "Heritage utility; canvas, chambray, sturdy boots." },
  { id: "dark-academia",  label: "Dark academia",  blurb: "Tweed, knitwear, oxford brogues, scholarly." },
  { id: "cottagecore",    label: "Cottagecore",    blurb: "Pastoral, soft, linen, florals, hand-knits." },
  { id: "gorpcore",       label: "Gorpcore",       blurb: "Technical outdoor; fleece, nylon, hiking shoes." },
  { id: "romantic",       label: "Romantic",       blurb: "Lace, ruffles, soft tailoring, feminine drape." },
  { id: "avant-garde",    label: "Avant-garde",    blurb: "Experimental cuts, architectural shapes, asymmetry." },
  { id: "y2k",            label: "Y2K",            blurb: "Early 2000s nostalgia; low-rise, juicy palette." },
];


export default function ProfileScreen() {
  const navigate = useNavigate();
  const { getToken, logout } = useAuth();

  const [user, setUser] = useState(null);
  const [garmentsCount, setGarmentsCount] = useState(0);
  const [briefsCount, setBriefsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const [gender, setGender] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [stylePref, setStylePref] = useState("");
  const [hoveredStyle, setHoveredStyle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      try {
        const [u, g, o] = await Promise.all([
          api.get("/api/auth/me", token),
          api.get("/api/wardrobe/", token),
          api.get("/api/outfits/", token),
        ]);
        if (cancelled) return;
        setUser(u);
        if (u.gender) setGender(u.gender);
        if (u.body_type) setBodyType(u.body_type);
        if (u.style_pref) setStylePref(u.style_pref);
        setGarmentsCount(Array.isArray(g) ? g.length : 0);
        setBriefsCount(Array.isArray(o) ? o.length : 0);
        setSavedCount(Array.isArray(o) ? o.filter((x) => x.is_saved).length : 0);
      } catch (e) {
        console.error("Failed to load profile:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateField = async (field, value) => {
    if (field === "gender") setGender(value);
    else if (field === "body_type") setBodyType(value);
    else if (field === "style_pref") setStylePref(value);
    try {
      await api.put("/api/auth/me", { [field]: value || null }, getToken());
    } catch (e) {
      console.error("Failed to update profile:", e);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  const heading = user?.display_name || user?.email || "Loading…";
  const styleBlurb = useMemo(() => {
    const slug = hoveredStyle ?? stylePref;
    const found = STYLES.find((s) => s.id === slug);
    return found?.blurb || "";
  }, [hoveredStyle, stylePref]);

  return (
    <SketchbookPage accent="var(--sb-plum)">
      <Masthead
        title="PROFILE"
        right={<Link to="/">← Home</Link>}
      />

      <main className="sb-detail">
        <header className="sb-detail__head">
          <h1 className="sb-display sb-display-xl">{heading}</h1>
          <p className="sb-body" style={{
            color: "var(--sb-charcoal-soft)", margin: "12px 0 0",
          }}>
            {garmentsCount} {garmentsCount === 1 ? "piece" : "pieces"} catalogued.
          </p>
        </header>

        <hr style={{
          border: 0, borderTop: "1px dashed var(--sb-sepia)",
          margin: "28px 0",
        }} />

        <section style={{ marginBottom: 36 }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <StatRow label="Briefs composed" value={briefsCount} />
            <StatRow label="Looks saved" value={savedCount} />
          </ul>
        </section>

        <section>
          <p className="sb-eyebrow" style={{ marginBottom: 18 }}>PREFERENCES</p>

          <FieldGroup label="I identify as">
            <ChipRow
              options={GENDERS}
              selected={gender}
              onSelect={(id) => { if (id !== gender) updateField("gender", id); }}
            />
          </FieldGroup>

          <FieldGroup label="Body type">
            <ChipRow
              options={BODY_TYPES}
              selected={bodyType}
              onSelect={(id) => { if (id !== bodyType) updateField("body_type", id); }}
            />
          </FieldGroup>

          <FieldGroup label="Style preference">
            <ChipRow
              options={STYLES}
              selected={stylePref}
              onSelect={(id) => { if (id !== stylePref) updateField("style_pref", id); }}
              onHover={setHoveredStyle}
            />
            <p style={{
              fontFamily: "var(--sb-font-hand)", fontSize: 18,
              color: "var(--sb-sepia)", margin: "14px 0 0",
              minHeight: 26, lineHeight: 1.4,
            }}>{styleBlurb}</p>
          </FieldGroup>
        </section>

        <hr style={{
          border: 0, borderTop: "1px dashed var(--sb-sepia)",
          margin: "36px 0 22px",
        }} />

        <section style={{ textAlign: "center", paddingBottom: 12 }}>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              background: "none", border: 0, padding: 0,
              fontFamily: "var(--sb-font-hand)", fontSize: 19,
              color: "var(--sb-sepia)",
              textDecoration: "underline wavy",
              textUnderlineOffset: 4,
              cursor: "pointer",
            }}
          >Sign out</button>
        </section>
      </main>
    </SketchbookPage>
  );
}


function StatRow({ label, value }) {
  return (
    <li style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "baseline",
      padding: "14px 0",
      borderBottom: "1px dashed rgba(139, 111, 71, 0.32)",
    }}>
      <span style={{
        fontFamily: "var(--sb-font-body)", fontSize: 11,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--sb-sepia)",
      }}>{label}</span>
      <span style={{
        fontFamily: "var(--sb-font-display)", fontSize: 20,
        color: "var(--sb-charcoal)",
      }}>{value}</span>
    </li>
  );
}


function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <p style={{
        fontFamily: "var(--sb-font-hand)", fontSize: 18,
        color: "var(--sb-sepia)", lineHeight: 1, margin: "0 0 12px",
      }}>{label}</p>
      {children}
    </div>
  );
}


function ChipRow({ options, selected, onSelect, onHover }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => (
        <Chip
          key={opt.id}
          label={opt.label}
          active={opt.id === selected}
          onClick={() => onSelect(opt.id)}
          onMouseEnter={() => onHover && onHover(opt.id)}
          onMouseLeave={() => onHover && onHover(null)}
        />
      ))}
    </div>
  );
}


function Chip({ label, active, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: "10px 18px",
        border: "1.4px solid var(--sb-charcoal)",
        background: active ? "var(--sb-charcoal)" : "transparent",
        color: active ? "var(--sb-paper)" : "var(--sb-charcoal)",
        fontFamily: "var(--sb-font-display)", fontSize: 14,
        letterSpacing: "0.02em",
        cursor: "pointer", borderRadius: 0,
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >{label}</button>
  );
}
