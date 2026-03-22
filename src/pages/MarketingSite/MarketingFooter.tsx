import { MKTG_THEME as C, AGENTS } from "./marketingConfig";

export function MarketingFooter() {
  return (
    <footer style={{ padding: "60px 48px 40px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 64 }}>
        <div style={{ flex: "0 0 280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{"\uD83D\uDC51"}</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>XspensesAI</span>
          </div>
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>
            The finance app that talks back. 6 AI agents working 24/7 to help you understand and improve your money.
          </p>
        </div>
        {[
          { title: "Product", links: ["How It Works", "Xspense Score", "AI Team", "Pricing"] },
          { title: "Learn", links: ["Money Lessons", "Blog", "Debt Guide", "Budget Tips"] },
          { title: "Company", links: ["About", "Contact", "Privacy", "Terms"] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>{col.title}</div>
            {col.links.map(link => (
              <a key={link} href="#" style={{
                display: "block", fontSize: 13, color: C.textMuted,
                textDecoration: "none", marginBottom: 10, transition: "color 0.15s",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = C.text}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = C.textMuted}
              >{link}</a>
            ))}
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1200, margin: "40px auto 0", paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.textDim }}>{"\u00A9"} 2026 XspensesAI. All rights reserved.</span>
        <div style={{ display: "flex", gap: 6 }}>
          {AGENTS.map((a, i) => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: "50%",
              background: `${a.color}20`, border: `1px solid ${a.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 7, fontWeight: 800, color: a.color,
            }}>{a.letter}</div>
          ))}
        </div>
      </div>
    </footer>
  );
}
