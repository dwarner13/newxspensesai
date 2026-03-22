import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MKTG_THEME as C } from "./marketingConfig";

const NAV_LINKS = [
  { label: "How It Works", id: "how-it-works" },
  { label: "The Team", id: "the-team" },
  { label: "Score", id: "xspense-score" },
  { label: "Pricing", id: "pricing" },
];

export function MarketingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? "12px 20px" : "16px 48px",
        display: "flex", alignItems: "center",
        background: scrolled || menuOpen ? `${C.bg}ee` : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        transition: "all 0.3s",
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto", textDecoration: "none", color: C.text }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)`,
            border: `1.5px solid ${C.accent}33`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>{"\uD83D\uDC51"}</div>
          <span style={{ fontSize: 18, fontWeight: 800 }}>XspensesAI</span>
        </a>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            {NAV_LINKS.map(item => (
              <button key={item.label} onClick={() => scrollTo(item.id)} style={{
                fontSize: 13, fontWeight: 600, color: C.textMuted,
                background: "none", border: "none", cursor: "pointer", transition: "color 0.15s",
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
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 8,
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            {menuOpen ? (
              <span style={{ fontSize: 24, color: C.text, lineHeight: 1 }}>{"\u2715"}</span>
            ) : (
              <>
                <div style={{ width: 22, height: 2, background: C.text, borderRadius: 1 }} />
                <div style={{ width: 22, height: 2, background: C.text, borderRadius: 1 }} />
                <div style={{ width: 22, height: 2, background: C.text, borderRadius: 1 }} />
              </>
            )}
          </button>
        )}
      </nav>

      {/* Mobile menu overlay */}
      {isMobile && menuOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99, paddingTop: 80,
          background: C.bg, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        }}>
          {NAV_LINKS.map(item => (
            <button key={item.label} onClick={() => scrollTo(item.id)} style={{
              fontSize: 20, fontWeight: 600, color: C.text,
              background: "none", border: "none", cursor: "pointer",
              padding: "16px 0", width: "80%", textAlign: "center",
            }}>{item.label}</button>
          ))}
          <button onClick={() => { setMenuOpen(false); navigate("/login"); }} style={{
            fontSize: 18, fontWeight: 600, color: C.textMuted,
            background: "none", border: "none", cursor: "pointer", padding: "16px 0",
          }}>Sign In</button>
          <button onClick={() => { setMenuOpen(false); navigate("/login"); }} style={{
            marginTop: 16, width: "80%", padding: "16px 0", borderRadius: 14,
            fontSize: 16, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
            color: "#0b1220", border: "none", cursor: "pointer",
            boxShadow: `0 4px 20px ${C.accent}44`,
          }}>Try Free</button>
        </div>
      )}
    </>
  );
}
