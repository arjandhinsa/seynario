import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";
import { SketchbookPage, Masthead, Polaroid } from "./sketchbook";
import {
  CATEGORIES, SEASONS, FORMALITIES,
  TextField, SelectField,
} from "./EditableField.jsx";


const TILTS = [-3, 2.4, -1.6, 1.8, -2.2, 2.6];
const WASHIS = ["coral", "mustard", null, "blue", null, "coral"];
const tiltFor = (i) => TILTS[i % TILTS.length];
const decorationFor = (i) => {
  const w = WASHIS[i % WASHIS.length];
  return w ? { washi: w, pin: false } : { washi: null, pin: true };
};


const FILTERS = [
  { key: null,         label: "all" },
  { key: "top",        label: "tops" },
  { key: "bottom",     label: "bottoms" },
  { key: "outerwear",  label: "outer" },
  { key: "footwear",   label: "shoes" },
  { key: "accessory",  label: "acc" },
];


function captionFor(g) {
  const sub = g.subcategory || g.category;
  if (g.colour && sub) return `${g.colour} ${sub}`.toLowerCase();
  if (sub) return sub.toLowerCase();
  if (g.colour) return g.colour.toLowerCase();
  return undefined;
}


export default function WardrobeScreen() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [garments, setGarments] = useState([]);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      try {
        const data = await api.get("/api/wardrobe/", token);
        if (!cancelled) setGarments(data);
      } catch (e) {
        console.error("Failed to load wardrobe:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id) => {
    const token = getToken();
    try {
      await api.delete(`/api/wardrobe/${id}`, token);
      setGarments((prev) => prev.filter((g) => g.id !== id));
      setSelected(null);
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const updateGarment = async (id, field, value) => {
    const token = getToken();
    // Optimistic local update so the filter chip view reflects immediately.
    setSelected((cur) => (cur && cur.id === id ? { ...cur, [field]: value } : cur));
    setGarments((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    );
    try {
      const updated = await api.put(`/api/wardrobe/${id}`, { [field]: value }, token);
      setSelected((cur) => (cur && cur.id === id ? updated : cur));
      setGarments((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (e) {
      console.error("Failed to update garment:", e);
    }
  };

  const filtered = filter
    ? garments.filter((g) => g.category === filter)
    : garments;

  return (
    <SketchbookPage>
      <Masthead
        title="THE WARDROBE"
        eyebrow={`${garments.length} ${garments.length === 1 ? "item" : "items"}`}
        right={<Link to="/">← Home</Link>}
      />

      <main className="sb-detail">
        <header className="sb-detail__head">
          <div className="sb-eyebrow">YOUR CATALOGUE</div>
          <h1 className="sb-display sb-display-xl">All pieces.</h1>
        </header>

        <nav style={{
          display: "flex", flexWrap: "wrap", gap: 10,
          margin: "28px 0 8px",
        }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "8px 16px",
                  border: "1.4px solid var(--sb-charcoal)",
                  background: active ? "var(--sb-charcoal)" : "transparent",
                  color: active ? "var(--sb-paper)" : "var(--sb-charcoal)",
                  fontFamily: "var(--sb-font-display)", fontSize: 14,
                  letterSpacing: "0.02em",
                  cursor: "pointer", borderRadius: 0,
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = "rgba(42,42,42,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {f.label}
              </button>
            );
          })}
        </nav>

        {loading ? (
          <p className="sb-body" style={{ padding: 60, textAlign: "center" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} onScan={() => navigate("/scan")} />
        ) : (
          <section className="sb-flatlay" style={{ paddingTop: 36 }}>
            {filtered.map((g, i) => (
              <div key={g.id} className="sb-flatlay__slot">
                <button
                  type="button"
                  onClick={() => setSelected(g)}
                  style={{
                    background: "none", border: 0, padding: 0,
                    width: "100%", maxWidth: 200, cursor: "pointer",
                    fontFamily: "inherit", color: "inherit",
                  }}
                  aria-label={`Open ${g.subcategory || g.category}`}
                >
                  <Polaroid tilt={tiltFor(i)} caption={captionFor(g)} {...decorationFor(i)}>
                    <img src={g.image_url} alt={captionFor(g) || g.category || ""} />
                  </Polaroid>
                </button>
              </div>
            ))}
          </section>
        )}
      </main>

      <Link
        to="/scan"
        aria-label="Add a piece"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 30,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--sb-charcoal)", color: "var(--sb-paper)",
          fontFamily: "var(--sb-font-display)", fontSize: 26, lineHeight: 1,
          textDecoration: "none",
          boxShadow: "0 12px 24px -10px rgba(42,42,42,0.45)",
          transition: "transform 0.18s ease, background 0.18s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.background = "var(--sb-ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.background = "var(--sb-charcoal)";
        }}
      >+</Link>

      {selected && (
        <DetailModal
          garment={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected.id)}
          onUpdateField={(field, value) => updateGarment(selected.id, field, value)}
        />
      )}
    </SketchbookPage>
  );
}


function EmptyState({ filter, onScan }) {
  const message = filter
    ? "Nothing in this category yet."
    : "No items yet. Photograph your first piece.";
  return (
    <section style={{
      margin: "32px 0 0", padding: "48px 28px",
      background: "var(--sb-paper-card)",
      border: "1px dashed var(--sb-sepia-soft)",
      textAlign: "center",
    }}>
      <p className="sb-display sb-display-md" style={{ fontStyle: "italic", margin: 0 }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onScan}
        style={{
          marginTop: 22,
          background: "var(--sb-charcoal)", color: "var(--sb-paper)",
          padding: "14px 28px", border: 0, borderRadius: 0,
          fontFamily: "var(--sb-font-display)", fontSize: 15,
          letterSpacing: "0.04em", cursor: "pointer",
        }}
      >
        Photograph a piece →
      </button>
    </section>
  );
}


function DetailModal({ garment, onClose, onDelete, onUpdateField }) {
  const heading = captionFor(garment) || "Piece";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 40,
        background: "rgba(31, 30, 26, 0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420,
          maxHeight: "90vh", overflowY: "auto",
          background: "var(--sb-paper)",
          border: "1px solid var(--sb-paper-edge)",
          boxShadow: "0 18px 40px -16px rgba(0,0,0,0.45)",
          padding: "26px 26px 22px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Polaroid tilt={-2.2} caption={captionFor(garment)} pin>
            <img src={garment.image_url} alt={heading} />
          </Polaroid>
        </div>

        <h2 className="sb-display sb-display-md" style={{
          marginTop: 22, textAlign: "center", fontStyle: "normal",
        }}>{heading}</h2>

        {garment.ai_description && (
          <p className="sb-body" style={{
            margin: "10px 0 0", color: "var(--sb-charcoal-soft)",
            textAlign: "center", lineHeight: 1.55, fontStyle: "italic",
          }}>{garment.ai_description}</p>
        )}

        <p className="sb-eyebrow" style={{ marginTop: 24, marginBottom: 6 }}>
          Tag this piece
        </p>

        <SelectField
          label="category"
          value={garment.category || ""}
          options={CATEGORIES}
          onSave={(v) => onUpdateField("category", v)}
        />
        <TextField
          label="subcategory"
          value={garment.subcategory || ""}
          onSave={(v) => onUpdateField("subcategory", v)}
        />
        <TextField
          label="colour"
          value={garment.colour || ""}
          onSave={(v) => onUpdateField("colour", v)}
        />
        <TextField
          label="material"
          value={garment.material || ""}
          onSave={(v) => onUpdateField("material", v)}
        />
        <TextField
          label="pattern"
          value={garment.pattern || ""}
          onSave={(v) => onUpdateField("pattern", v)}
        />
        <SelectField
          label="season"
          value={garment.season || ""}
          options={SEASONS}
          onSave={(v) => onUpdateField("season", v || null)}
        />
        <SelectField
          label="formality"
          value={garment.formality != null ? String(garment.formality) : ""}
          options={FORMALITIES}
          onSave={(v) => onUpdateField("formality", v === "" ? null : Number(v))}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "12px 0",
              background: "transparent",
              border: "1.4px solid var(--sb-charcoal)",
              fontFamily: "var(--sb-font-display)", fontSize: 14,
              letterSpacing: "0.02em",
              color: "var(--sb-charcoal)",
              cursor: "pointer", borderRadius: 0,
            }}
          >Close</button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              flex: 1, padding: "12px 0",
              background: "transparent",
              border: "1.4px dashed #b3361f",
              fontFamily: "var(--sb-font-hand)", fontSize: 17,
              color: "#b3361f",
              cursor: "pointer", borderRadius: 0,
            }}
          >Remove</button>
        </div>
      </div>
    </div>
  );
}
