import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MKTG_THEME as C } from "./marketingConfig";

export function MarketingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "16px 48px", display: "flex", alignItems: "center",
      background: scrolled ? `${C.bg}ee` : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      transition: "all 0.3s",
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}>
      <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto", textDecoration: "none", color: C.text }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)`,
          border: `1.5px solid ${C.accent}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>{"\uD83D\uDC51"}</div>
        <span style={{ fontSize: 18, fontWeight: 800 }}>XspensesAI</span>
      </a>
      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        {[
          { label: "How It Works", id: "how-it-works" },
          { label: "The Team", id: "the-team" },
          { label: "Score", id: "xspense-score" },
          { label: "Pricing", id: "pricing" },
        ].map(item => (
          <button key={item.label} onClick={() => scrollTo(item.id)} style={{
            fontSize: 13, fontWeight: 600, color: C.textMuted,
            textDecoration: "none", transition: "color 0.15s",
            background: "none", border: "none", cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
          >{item.label}</button>
        ))}
        <button onClick={() => navigate("/login")} style={{ fontSize: 13, fontWeight: 600, color: C.text, background: "none", border: "none", cursor: "pointer" }}>Sign In</button>
        <button onClick={() => navigate("/login")} style={{
          padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
          color: "#0b1220", border: "none", cursor: "pointer",
          boxShadow: `0 2px 12px ${C.accent}44`,
        }}>Try Free</button>
      </div>
    </nav>
  );
}
