import { useState, useRef, useEffect } from "react";

const CATEGORIES = [
  "Income", "Groceries", "Food & Dining", "Transportation", "Shopping",
  "Subscriptions", "Personal Care", "Healthcare", "Bank Fees", "Transfers",
  "Entertainment", "Utilities", "Housing", "Education", "Travel",
  "Business Expense", "Other", "Uncategorized",
];

interface CategoryDropdownProps {
  value: string;
  onChange: (category: string) => void;
  onSave?: (category: string) => void;
  showSaveButton?: boolean;
}

export function CategoryDropdown({ value, onChange, onSave, showSaveButton = true }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = CATEGORIES.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <div ref={ref} style={{ position: "relative", flex: 1 }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{
          width: "100%", padding: "10px 14px", background: "#111a2e", border: "1px solid #1e2d4a",
          borderRadius: 8, color: "#e8ecf4", fontSize: 14, fontFamily: "inherit",
          cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {value || "Select category"}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ba8bc" strokeWidth="2" strokeLinecap="round">
            <path d={isOpen ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"} />
          </svg>
        </button>

        {isOpen && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
            background: "#111a2e", border: "1px solid #1e2d4a", borderRadius: 10,
            padding: 6, zIndex: 200, maxHeight: 280, overflowY: "auto",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}>
            <input type="text" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{
              width: "100%", padding: "8px 12px", background: "#0b1220", border: "1px solid #1e2d4a",
              borderRadius: 6, color: "#e8ecf4", fontSize: 13, fontFamily: "inherit", outline: "none",
              marginBottom: 4, boxSizing: "border-box",
            }} />
            {filtered.map(cat => (
              <button key={cat} onClick={() => { onChange(cat); setIsOpen(false); setSearch(""); }} style={{
                width: "100%", padding: "9px 12px", background: cat === value ? "rgba(200,166,78,0.15)" : "transparent",
                border: "none", borderRadius: 6, color: cat === value ? "#c8a64e" : "#e8ecf4",
                fontSize: 14, fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "block",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (cat !== value) e.currentTarget.style.background = "#1e2d4a"; }}
              onMouseLeave={(e) => { if (cat !== value) e.currentTarget.style.background = "transparent"; }}
              >{cat}</button>
            ))}
            {filtered.length === 0 && <div style={{ padding: 12, color: "#9ba8bc", fontSize: 13, textAlign: "center" }}>No matching category</div>}
          </div>
        )}
      </div>
      {showSaveButton && onSave && (
        <button onClick={() => onSave(value)} style={{
          padding: "10px 20px", background: "#c8a64e", border: "none", borderRadius: 8,
          color: "#0b1220", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
          cursor: "pointer", whiteSpace: "nowrap",
        }}>Save</button>
      )}
    </div>
  );
}
