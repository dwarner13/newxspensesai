import { useState } from "react";
import { MKTG_THEME as C, AGENTS } from "./marketingConfig";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingReveal } from "./MarketingReveal";

const PLANS = [
  {
    name: "Free", price: "$0", period: "/forever", desc: "Get started with your AI team",
    color: C.textMuted, highlight: false,
    features: ["1 statement per month", "Basic categorization by Tag", "Xspense Score", "Prime chat (5 messages/day)", "Monthly recap"],
    cta: "Get Started",
  },
  {
    name: "Pro", price: "$12", period: "/month", desc: "Full AI team, unlimited power",
    color: C.accent, highlight: true,
    features: ["Unlimited statements", "Full AI categorization + learning", "Complete Xspense Score with all 28 factors", "Unlimited Prime chat + all copilots", "Tax deduction organizer (Ledger)", "Goals & debt coaching (Goalie)", "Branded PDF reports + accountant packages", "Audio recaps", "Priority processing"],
    cta: "Start Pro Free Trial",
  },
  {
    name: "Business", price: "$29", period: "/month", desc: "For freelancers & small business",
    color: C.purple, highlight: false,
    features: ["Everything in Pro", "Multi-business support", "Invoice tracking", "Quarterly tax reports", "Dedicated Ledger assistant", "Team access (up to 3)", "API access", "Priority support"],
    cta: "Contact Us",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <MarketingNav />

      <section style={{ padding: "140px 48px 100px", textAlign: "center" }}>
        <MarketingReveal>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>Pricing</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 12 }}>Simple pricing.<br /><span style={{ color: C.accent }}>Serious AI.</span></h1>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 500, margin: "0 auto 32px" }}>Start free. Upgrade when your AI team needs more room to work.</p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "6px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
            <button onClick={() => setAnnual(false)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: !annual ? C.accentGlow : "transparent", border: !annual ? `1px solid ${C.accent}44` : "1px solid transparent", color: !annual ? C.accent : C.textMuted, cursor: "pointer" }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: annual ? C.accentGlow : "transparent", border: annual ? `1px solid ${C.accent}44` : "1px solid transparent", color: annual ? C.accent : C.textMuted, cursor: "pointer" }}>Annual <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>Save 20%</span></button>
          </div>
        </MarketingReveal>

        <div style={{ display: "flex", gap: 20, maxWidth: 1100, margin: "48px auto 0", alignItems: "stretch" }}>
          {PLANS.map((plan, i) => {
            const displayPrice = annual && plan.price !== "$0"
              ? `$${Math.round(parseInt(plan.price.replace("$", "")) * 0.8)}`
              : plan.price;

            return (
              <MarketingReveal key={plan.name} delay={i * 100} style={{ flex: 1 }}>
                <div style={{
                  background: plan.highlight ? `linear-gradient(180deg, ${C.surface} 0%, ${plan.color}08 100%)` : C.surface,
                  border: `${plan.highlight ? 2 : 1}px solid ${plan.highlight ? plan.color + "44" : C.border}`,
                  borderRadius: 24, padding: "36px 32px", textAlign: "left",
                  position: "relative", display: "flex", flexDirection: "column", height: "100%",
                  boxShadow: plan.highlight ? `0 8px 40px ${plan.color}10` : "none",
                }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "4px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #a08030)`, color: "#0b1220", fontSize: 11, fontWeight: 700 }}>Most Popular</div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, color: C.text }}>{displayPrice}</span>
                    <span style={{ fontSize: 14, color: C.textDim }}>{plan.period}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>{plan.desc}</div>

                  <div style={{ flex: 1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${plan.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: plan.color, flexShrink: 0 }}>{"\u2713"}</div>
                        <span style={{ fontSize: 13, color: C.textMuted }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <a href="/login" style={{
                    display: "block", textAlign: "center", padding: "14px", borderRadius: 12, marginTop: 24,
                    fontSize: 14, fontWeight: 700, textDecoration: "none",
                    background: plan.highlight ? `linear-gradient(135deg, ${C.accent}, #a08030)` : "transparent",
                    border: plan.highlight ? "none" : `1px solid ${C.border}`,
                    color: plan.highlight ? "#0b1220" : C.textMuted,
                    boxShadow: plan.highlight ? `0 4px 20px ${C.accent}44` : "none",
                  }}>{plan.cta}</a>
                </div>
              </MarketingReveal>
            );
          })}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
