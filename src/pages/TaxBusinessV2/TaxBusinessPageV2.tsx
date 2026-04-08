
const T = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#7a8fa6", dim: "#4a5568",
  accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", purple: "#a78bfa",
};

const verticals = [
  { icon: "🍽️", name: "Restaurants & Food Service", desc: "Cost of goods, labour, occupancy, merchant fees - auto-sorted from your statements." },
  { icon: "⚖️", name: "Professional Services", desc: "Law firms, accountants, consultants - track billable expenses and subcontractors." },
  { icon: "🔧", name: "Trades & Contractors", desc: "Vehicle, tools, materials, job-site costs - organized for T2125 filing." },
  { icon: "🏪", name: "Retail & E-Commerce", desc: "Inventory, shipping, platform fees - clean expense reports for your bookkeeper." },
];

const features = [
  { icon: "📂", title: "Business Category Rules", desc: "Tag learns your business - COGS, labour, occupancy, professional fees." },
  { icon: "📊", title: "Accountant-Ready Export", desc: "One-click export your bookkeeper can open directly in their software." },
  { icon: "🧾", title: "HST / GST Tracking", desc: "Flag HST-eligible expenses automatically as transactions come in." },
  { icon: "👥", title: "Multi-User Access", desc: "Invite your bookkeeper or accountant to view and export your data." },
];

export default function TaxBusinessPageV2() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 24px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 20, background: `${T.accent}15`, border: `1px solid ${T.accent}30`, marginBottom: 16 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Coming Soon</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: T.text, marginBottom: 10, letterSpacing: -0.5 }}>
          XspensesAI for Business
        </h1>
        <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.6, maxWidth: 560 }}>
          Everything self-employed Canadians love about XspensesAI - rebuilt for small business owners. Upload your statements, let AI organize your expenses by business category, and hand your accountant a clean report at tax time.
        </p>
      </div>

      {/* Verticals */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Built for your industry</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {verticals.map(v => (
            <div key={v.name} style={{ padding: "16px 18px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{v.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>{v.name}</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>What's included</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {features.map(f => (
            <div key={f.title} style={{ padding: "16px 18px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: "flex", gap: 14 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "28px 32px", borderRadius: 18, background: `${T.accent}08`, border: `1px solid ${T.accent}20`, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>Be first when it launches</div>
        <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>We're building this for restaurants, trades, and professional services first. Join the waitlist and get 3 months free at launch.</p>
        <button
          onClick={() => window.open('mailto:hello@xspensesai.com?subject=Business Waitlist', '_blank')}
          style={{ padding: "12px 32px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer" }}>
          Join the Waitlist
        </button>
      </div>
    </div>
  );
}
