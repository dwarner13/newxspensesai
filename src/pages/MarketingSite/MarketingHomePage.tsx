import { useState, useEffect } from "react";
import { MKTG_THEME as C, AGENTS } from "./marketingConfig";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";
import { ChatBubble } from "./ChatBubble";
import { MarketingReveal } from "./MarketingReveal";

// TODO: import { Link } from "react-router-dom";

export default function MarketingHomePage() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(true), []);

  const FEATURES = [
    { icon: "\uD83C\uDFAC", title: '"Previously On" Recaps', desc: "Every login starts with a cinematic recap. Your agents report what they did while you were away. Like a show, not a spreadsheet.", color: C.accent },
    { icon: "\uD83C\uDFAF", title: "Xspense Score", desc: "Your financial health in one number. 28 factors across 6 pillars. Watch it climb as you improve.", color: C.yellow },
    { icon: "\uD83E\uDD16", title: "AI Copilots Everywhere", desc: "Every page has an AI assistant. Tag helps categorize. Crystal explains trends. Goalie coaches goals.", color: C.cyan },
    { icon: "\uD83D\uDCDA", title: "Money Lessons", desc: "Short, practical financial education. Snowball vs avalanche? 50/30/20 rule? Learn while you manage.", color: C.purple },
    { icon: "\uD83D\uDCC8", title: "Proactive Alerts", desc: "Crystal doesn't wait. She tells you when dining is up 39% or when a subscription doubled.", color: C.pink },
    { icon: "\uD83D\uDCE7", title: "One-Click Reports", desc: "Branded PDFs and accountant packages. You look organized. Your accountant is impressed.", color: C.green },
  ];

  const STEPS = [
    { step: "1", title: "Drop a statement", desc: 'PDF, CSV, even a photo. Byte reads it in seconds. "Got it \u2014 24 transactions extracted."', color: C.green, icon: "B" },
    { step: "2", title: "Tag sorts everything", desc: 'Every transaction categorized. "3 look off \u2014 takes 2 min to fix."', color: C.cyan, icon: "T" },
    { step: "3", title: "Crystal spots patterns", desc: 'Trends you\'d never see. "Dining up 39% in 3 months. Want details?"', color: C.purple, icon: "C" },
    { step: "4", title: "Prime briefs you", desc: 'Your advisor pulls it together. "Here\'s what matters and what to do."', color: C.accent, icon: "\u2655" },
  ];

  const SCORE_PILLARS = [
    { name: "Spending", score: 65, color: C.yellow },
    { name: "Tax Ready", score: 82, color: C.green },
    { name: "Organization", score: 90, color: C.cyan },
    { name: "Cash Flow", score: 55, color: C.orange },
    { name: "Debt", score: 68, color: C.blue },
    { name: "Engagement", score: 85, color: C.purple },
  ];

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
      background: C.bg, color: C.text, overflowX: "hidden",
    }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "140px 48px 80px", position: "relative" }}>
        <div style={{ position: "absolute", top: "20%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
        <div style={{ maxWidth: 800, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 20, marginBottom: 32, background: C.accentGlow, border: `1px solid ${C.accent}22`, opacity: loaded ? 1 : 0, transition: "opacity 0.6s 0.2s" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}66` }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>6 AI agents {"\u2022"} Always on</span>
          </div>

          <h1 style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, marginBottom: 24, opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s" }}>
            The finance app that<br /><span style={{ color: C.accent }}>actually talks back.</span>
          </h1>

          <p style={{ fontSize: 18, color: C.textMuted, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px", opacity: loaded ? 1 : 0, transition: "opacity 0.6s 0.5s" }}>
            Upload a bank statement. 6 AI agents categorize, analyze, and coach you {"\u2014"} then tell you what they found. In their own words.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", opacity: loaded ? 1 : 0, transition: "opacity 0.6s 0.7s" }}>
            <a href="/login" style={{ padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a08030)`, color: "#0b1220", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 24px ${C.accent}44`, textDecoration: "none" }}>Meet Your AI Team {"\u2192"}</a>
            <a href="#conversation" style={{ padding: "16px 32px", borderRadius: 14, fontSize: 16, fontWeight: 600, background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>See Them Talk</a>
          </div>
        </div>
      </section>

      {/* AGENT CONVERSATION */}
      <section id="conversation" style={{ padding: "60px 48px 100px", maxWidth: 700, margin: "0 auto" }}>
        <MarketingReveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>This is what it feels like</div>
            <h2 style={{ fontSize: 36, fontWeight: 800 }}>Your agents. Talking to you.</h2>
            <p style={{ fontSize: 14, color: C.textDim, marginTop: 8 }}>This happens every time you open the app.</p>
          </div>
        </MarketingReveal>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "12px 0", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ padding: "12px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}66` }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Live Preview</span>
          </div>
          {AGENTS.slice(0, 4).map((a, i) => <ChatBubble key={a.name} agent={a} delay={i * 800} />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "100px 48px", background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 50%, ${C.bg} 100%)` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <MarketingReveal><div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>You upload. They handle the rest.</h2>
          </div></MarketingReveal>
          <div style={{ display: "flex", gap: 20 }}>
            {STEPS.map((s, i) => (
              <MarketingReveal key={s.step} delay={i * 150} style={{ flex: 1 }}>
                <div style={{ textAlign: "center", padding: "32px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px", background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`, border: `1.5px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: s.color, boxShadow: `0 0 16px ${s.color}22` }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Step {s.step}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: C.text }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </MarketingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* NOT BORING */}
      <section style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <MarketingReveal><div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>Not Your Typical Finance App</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, color: C.text }}>Finance doesn't have to be boring.</h2>
          <p style={{ fontSize: 16, color: C.textMuted, marginTop: 12 }}>We made it conversational, visual, and a little addictive.</p>
        </div></MarketingReveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <MarketingReveal key={f.title} delay={i * 100}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 28px", transition: "all 0.25s" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 20, boxShadow: `0 0 16px ${f.color}15` }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: C.text }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </MarketingReveal>
          ))}
        </div>
      </section>

      {/* THE TEAM */}
      <section id="the-team" style={{ padding: "100px 48px", background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 50%, ${C.bg} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <MarketingReveal><div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>The Team</div>
            <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, color: C.text }}>6 agents. Zero attitude. All results.</h2>
          </div></MarketingReveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {AGENTS.map((a, i) => (
              <MarketingReveal key={a.name} delay={i * 80}>
                <div style={{ display: "flex", gap: 20, padding: "28px 32px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${a.color}30, ${a.color}10)`, border: `1.5px solid ${a.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: a.name === "Prime" ? 24 : 20, fontWeight: 700, color: a.color, boxShadow: `0 0 20px ${a.color}22` }}>{a.letter}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{a.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: a.color, padding: "2px 10px", borderRadius: 6, background: `${a.color}12`, border: `1px solid ${a.color}22` }}>{a.role}</span>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: 12, borderTopLeftRadius: 4, background: `${a.color}06`, border: `1px solid ${a.color}10`, fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>"{a.quote}"</div>
                  </div>
                </div>
              </MarketingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* XSPENSE SCORE */}
      <section id="xspense-score" style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 64, alignItems: "center" }}>
          <MarketingReveal style={{ flex: "0 0 340px" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", width: 180, height: 180, marginBottom: 20 }}>
                <svg width={180} height={180} style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={90} cy={90} r={80} fill="none" stroke={C.border} strokeWidth={8} />
                  <circle cx={90} cy={90} r={80} fill="none" stroke={C.accent} strokeWidth={8} strokeDasharray={502} strokeDashoffset={502 - (72/100) * 502} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${C.accent}66)` }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 48, fontWeight: 800, color: C.text }}>72</span>
                  <span style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase" }}>Good</span>
                </div>
              </div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {SCORE_PILLARS.map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.textMuted, width: 80 }}>{p.name}</span>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.bg, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: p.color, width: `${p.score}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.color, width: 28, textAlign: "right" }}>{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </MarketingReveal>

          <MarketingReveal delay={200}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>Xspense Score</div>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 16, color: C.text }}>Finally. A number that<br />actually means something.</h2>
              <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.7, marginBottom: 28 }}>
                Not a credit score. Not a net worth. Your Xspense Score measures how well you're managing your money across 28 factors. Watch it climb as your habits improve.
              </p>
              <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a08030)`, color: "#0b1220", boxShadow: `0 4px 20px ${C.accent}44`, textDecoration: "none" }}>Get Your Score {"\u2192"}</a>
            </div>
          </MarketingReveal>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "120px 48px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 600, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}05 0%, transparent 70%)`, transform: "translate(-50%, -50%)", filter: "blur(60px)" }} />
        <MarketingReveal>
          <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.1 }}>Your money has a lot to say.<br /><span style={{ color: C.accent }}>Start listening.</span></h2>
            <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.6, marginBottom: 40 }}>Free to start. No credit card. Upload your first statement and meet your AI team in 60 seconds.</p>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "18px 48px", borderRadius: 14, fontSize: 17, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a08030)`, color: "#0b1220", boxShadow: `0 6px 32px ${C.accent}44`, textDecoration: "none" }}>Meet Your Team {"\u2192"}</a>
          </div>
        </MarketingReveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
