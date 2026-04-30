import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";
import { SketchbookPage, Masthead, Polaroid } from "./sketchbook";
import {
  CATEGORIES, SEASONS, FORMALITIES,
  TextField, SelectField,
} from "./EditableField.jsx";


export default function ScanScreen() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const fileRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanning(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const garment = await api.upload("/api/wardrobe/scan", formData, token);
      setResult(garment);
    } catch (err) {
      setError(err.message || "Failed to scan. Try a JPG or PNG image.");
    } finally {
      setScanning(false);
    }
  };

  const updateField = async (field, value) => {
    if (!result) return;
    const token = getToken();
    const next = { ...result, [field]: value };
    setResult(next);
    try {
      const updated = await api.put(`/api/wardrobe/${result.id}`, { [field]: value }, token);
      setResult(updated);
    } catch (err) {
      console.error("Failed to update field:", err);
    }
  };

  const discard = async () => {
    if (!result) return;
    const token = getToken();
    try {
      await api.delete(`/api/wardrobe/${result.id}`, token);
    } catch (err) {
      console.error("Failed to discard:", err);
    } finally {
      setResult(null);
      setError("");
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  };

  return (
    <SketchbookPage>
      <Masthead
        title="CATALOGUE"
        eyebrow="Add a piece"
        right={<Link to="/wardrobe">← Wardrobe</Link>}
      />

      <main className="sb-detail">
        <header className="sb-detail__head">
          <div className="sb-eyebrow">PHOTOGRAPH WHAT YOU OWN</div>
          <h1 className="sb-display sb-display-md">A new entry.</h1>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleScan}
          style={{ display: "none" }}
        />

        {!result && !scanning && !error && (
          <Dropzone onClick={() => fileRef.current?.click()} />
        )}

        {scanning && <ScanningCard />}

        {error && (
          <ErrorCard
            message={error}
            onRetry={() => { setError(""); fileRef.current?.click(); }}
          />
        )}

        {result && (
          <ResultPanel
            result={result}
            onUpdateField={updateField}
            onSaveNext={reset}
            onDiscard={discard}
            onDoneToWardrobe={() => navigate("/wardrobe")}
          />
        )}
      </main>
    </SketchbookPage>
  );
}


function Dropzone({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block", width: "100%",
        marginTop: 28, padding: 60,
        background: "var(--sb-paper-card)",
        border: "1.4px dashed var(--sb-charcoal)",
        cursor: "pointer", borderRadius: 0,
        textAlign: "center",
        fontFamily: "inherit",
      }}
    >
      <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 18 }}>📸</div>
      <p style={{
        fontFamily: "var(--sb-font-hand)", fontSize: 24,
        color: "var(--sb-sepia)", margin: 0, lineHeight: 1.2,
      }}>stick photo here</p>
      <p style={{
        fontFamily: "var(--sb-font-body)", fontSize: 12,
        color: "var(--sb-charcoal-soft)", margin: "10px 0 0",
        letterSpacing: "0.04em",
      }}>JPG, PNG, or HEIC · one piece per photo</p>
    </button>
  );
}


function ScanningCard() {
  return (
    <section style={{
      marginTop: 28, padding: 48,
      background: "var(--sb-paper-card)",
      border: "1px dashed var(--sb-sepia-soft)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 38, marginBottom: 14 }}>🔍</div>
      <p className="sb-display sb-display-md" style={{ fontStyle: "italic", margin: 0 }}>
        Reading the photo…
      </p>
      <p className="sb-body" style={{ color: "var(--sb-charcoal-soft)", marginTop: 8 }}>
        Identifying colour, cut, fabric, formality.
      </p>
    </section>
  );
}


function ErrorCard({ message, onRetry }) {
  return (
    <section style={{
      marginTop: 28, padding: "24px 28px",
      background: "var(--sb-paper-card)",
      border: "1.4px dashed #b3361f",
      textAlign: "center",
    }}>
      <p className="sb-body" style={{ color: "#b3361f", margin: 0 }}>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginTop: 14, background: "none", border: 0, padding: 0,
          fontFamily: "var(--sb-font-hand)", fontSize: 17,
          color: "#b3361f",
          textDecoration: "underline wavy",
          textUnderlineOffset: 4,
          cursor: "pointer",
        }}
      >Try another photo</button>
    </section>
  );
}


function ResultPanel({ result, onUpdateField, onSaveNext, onDiscard, onDoneToWardrobe }) {
  return (
    <>
      <section style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 240px) 1fr",
        gap: 36,
        margin: "32px 0 0",
        alignItems: "start",
      }} className="sb-scan__panel">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Polaroid tilt={-2.6} caption={undefined} pin>
            <img src={result.image_url} alt="" />
          </Polaroid>
        </div>

        <div>
          <p className="sb-eyebrow" style={{ marginBottom: 14 }}>Identified</p>
          {result.ai_description && (
            <p className="sb-body" style={{
              margin: "0 0 22px", fontStyle: "italic",
              color: "var(--sb-charcoal-soft)", lineHeight: 1.55,
            }}>{result.ai_description}</p>
          )}

          <SelectField
            label="category"
            value={result.category || ""}
            options={CATEGORIES}
            onSave={(v) => onUpdateField("category", v)}
          />
          <TextField
            label="subcategory"
            value={result.subcategory || ""}
            onSave={(v) => onUpdateField("subcategory", v)}
          />
          <TextField
            label="colour"
            value={result.colour || ""}
            onSave={(v) => onUpdateField("colour", v)}
          />
          <TextField
            label="material"
            value={result.material || ""}
            onSave={(v) => onUpdateField("material", v)}
          />
          <TextField
            label="pattern"
            value={result.pattern || ""}
            onSave={(v) => onUpdateField("pattern", v)}
          />
          <SelectField
            label="season"
            value={result.season || ""}
            options={SEASONS}
            onSave={(v) => onUpdateField("season", v || null)}
          />
          <SelectField
            label="formality"
            value={result.formality != null ? String(result.formality) : ""}
            options={FORMALITIES}
            onSave={(v) => onUpdateField("formality", v === "" ? null : Number(v))}
          />
        </div>
      </section>

      <section style={{
        marginTop: 36, display: "flex", flexWrap: "wrap", gap: 18,
        alignItems: "center",
      }}>
        <button
          type="button"
          onClick={onSaveNext}
          style={{
            background: "var(--sb-charcoal)", color: "var(--sb-paper)",
            padding: "14px 28px", border: 0, borderRadius: 0,
            fontFamily: "var(--sb-font-display)", fontSize: 15,
            letterSpacing: "0.04em", cursor: "pointer",
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
        >Save · Next item →</button>

        <button
          type="button"
          onClick={onDiscard}
          style={{
            background: "none", border: 0, padding: 0,
            fontFamily: "var(--sb-font-hand)", fontSize: 17,
            color: "var(--sb-sepia)",
            textDecoration: "underline wavy",
            textUnderlineOffset: 4,
            cursor: "pointer",
          }}
        >Discard</button>

        <button
          type="button"
          onClick={onDoneToWardrobe}
          style={{
            background: "none", border: 0, padding: 0,
            fontFamily: "var(--sb-font-hand)", fontSize: 17,
            color: "var(--sb-sepia)",
            textDecoration: "underline wavy",
            textUnderlineOffset: 4,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >Back to wardrobe →</button>
      </section>
    </>
  );
}


