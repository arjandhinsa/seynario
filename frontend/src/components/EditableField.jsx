/**
 * Editable garment fields used by ScanScreen (post-AI-identification)
 * and WardrobeScreen (in-place attribute correction). Hand-drawn underline
 * styling, charcoal text, sepia Caveat label.
 *
 * Both screens drive these by passing `value` + `onSave(newValue)`. The
 * caller decides what to do on save (PUT to backend, optimistic update,
 * etc.) — this module is pure UI.
 */

import { useEffect, useState } from "react";


export const CATEGORIES = ["top", "bottom", "outerwear", "footwear", "accessory"];
export const SEASONS = ["", "spring", "summer", "autumn", "winter", "all-season"];
export const FORMALITIES = ["", "1", "2", "3", "4", "5"];


export function TextField({ label, value, onSave }) {
  const [draft, setDraft] = useState(value || "");
  // Re-sync when external value changes (e.g. after a server refresh).
  useEffect(() => { setDraft(value || ""); }, [value]);

  const handleBlur = () => {
    const next = draft.trim();
    if (next !== (value || "")) onSave(next);
  };

  return (
    <FieldRow label={label}>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={inputStyle}
      />
    </FieldRow>
  );
}


export function SelectField({ label, value, options, onSave }) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);

  return (
    <FieldRow label={label}>
      <select
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next !== (value || "")) onSave(next);
        }}
        style={{ ...inputStyle, appearance: "auto" }}
      >
        {options.map((opt) => (
          <option key={opt || "_blank"} value={opt}>
            {opt || "—"}
          </option>
        ))}
      </select>
    </FieldRow>
  );
}


export function FieldRow({ label, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "110px 1fr",
      alignItems: "baseline",
      padding: "10px 0",
      gap: 14,
    }}>
      <label style={{
        fontFamily: "var(--sb-font-hand)", fontSize: 17,
        color: "var(--sb-sepia)", lineHeight: 1,
      }}>{label}</label>
      {children}
    </div>
  );
}


const inputStyle = {
  background: "transparent",
  border: 0,
  borderBottom: "1.4px solid var(--sb-charcoal)",
  padding: "6px 2px",
  fontFamily: "var(--sb-font-body)",
  fontSize: 15,
  color: "var(--sb-charcoal)",
  outline: "none",
  width: "100%",
};
