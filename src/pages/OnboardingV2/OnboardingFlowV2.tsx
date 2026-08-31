import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

const C = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc",
  accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", purple: "#a78bfa", yellow: "#fbbf24",
};

const AGENTS = [
  { name: "Prime", letter: "\u2655", color: C.accent, line: "I'm Prime, your financial assistant. I see the big picture." },
  { name: "Byte", letter: "B", color: C.green, line: "I'm Byte. Drop me a statement \u2014 I'll extract every transaction." },
  { name: "Tag", letter: "T", color: C.cyan, line: "I'm Tag. I categorize everything automatically." },
  { name: "Crystal", letter: "C", color: C.purple, line: "I'm Crystal. I find trends you'd never notice." },
  { name: "Goalie", letter: "G", color: C.yellow, line: "I'm Goalie. I keep your goals on track." },
  { name: "Ledger", letter: "L", color: C.green, line: "I'm Ledger. Tax season? I've got you." },
];

const MODES = [
  { id: "personal", label: "Personal Finance", desc: "Managing my own money" },
  { id: "freelancer", label: "Self-Employed / Freelancer", desc: "Income from clients, need tax help" },
  { id: "business", label: "Small Business Owner", desc: "Running a business, tracking expenses" },
];

const PRIORITIES = ["Track spending", "Tax deductions", "Saving goals", "Pay off debt", "Understand my money", "Business expenses"];

export default function OnboardingFlowV2() {
  const navigate = useNavigate();
  const { userId, user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [visibleAgents, setVisibleAgents] = useState(0);
  const [showStartBtn, setShowStartBtn] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState("");

  // Pre-fill name from signup so user doesn't have to retype it
  useEffect(() => {
    if (!user) return;
    const savedName =
      (user as any).user_metadata?.display_name ||
      (user as any).user_metadata?.full_name ||
      (user as any).user_metadata?.name || "";
    if (savedName) setDisplayName(savedName);
  }, [user]);
  // Step 2
  const [mode, setMode] = useState("personal");
  const [currency, setCurrency] = useState("CAD");
  // Step 3
  const [priorities, setPriorities] = useState<string[]>([]);

  // Animate agents in step 0
  useEffect(() => {
    if (step !== 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    AGENTS.forEach((_, i) => { timers.push(setTimeout(() => setVisibleAgents(i + 1), 600 + i * 700)); });
    timers.push(setTimeout(() => setShowStartBtn(true), 600 + AGENTS.length * 700 + 500));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const skipIntro = () => { setVisibleAgents(AGENTS.length); setShowStartBtn(true); };

  const handleComplete = useCallback(async () => {
    if (!userId) { navigate("/dashboard"); return; }
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("profiles").update({
          display_name: displayName || undefined,
          metadata: {
            primary_mode: mode,
            currency,
            priorities,
            onboarding_completed: true,
            custodian_ready: true,
          },
        }).eq("id", userId);
      }
      await refreshProfile?.();
    } catch { /* proceed anyway */ }
    navigate("/dashboard/upload");
  }, [userId, displayName, mode, currency, priorities, navigate, refreshProfile]);

  const progressPct = step === 0 ? 0 : Math.round((step / 3) * 100);

  return (
    <div style={{
      minHeight: "100dvh", width: "100vw", background: C.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: C.text,
      padding: "40px 24px", overflowY: "auto",
    }}>
      {/* Progress bar (steps 1-3) */}
      {step > 0 && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: C.border, zIndex: 10 }}>
          <div style={{ height: "100%", background: C.accent, width: `${progressPct}%`, transition: "width 0.5s ease", borderRadius: "0 2px 2px 0" }} />
        </div>
      )}

      {/* ═══ STEP 0: Meet Your Team ═══ */}
      {step === 0 && (
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 24px",
            background: `linear-gradient(135deg, ${C.accent}25, ${C.accent}08)`,
            border: `2px solid ${C.accent}33`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: `0 0 40px ${C.accent}15`,
          }}>{"\uD83D\uDC51"}</div>

          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Welcome to XspensesAI</h1>
          <p style={{ fontSize: 14, color: C.dim, marginBottom: 32 }}>Meet your AI team</p>

          <div style={{ textAlign: "left", marginBottom: 32 }}>
            {AGENTS.map((a, i) => (
              <div key={a.name} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", marginBottom: 6,
                background: visibleAgents > i ? `${a.color}06` : "transparent",
                border: `1px solid ${visibleAgents > i ? a.color + "15" : "transparent"}`,
                borderRadius: 12, opacity: visibleAgents > i ? 1 : 0,
                transform: visibleAgents > i ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: `${a.color}20`, border: `1.5px solid ${a.color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: a.color,
                }}>{a.letter}</div>
                <div style={{ fontSize: 13, color: C.muted }}><span style={{ fontWeight: 700, color: a.color }}>{a.name}:</span> {a.line}</div>
              </div>
            ))}
          </div>

          {showStartBtn && (
            <button onClick={() => setStep(1)} style={{
              padding: "14px 40px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
              border: "none", color: "#0b1220", cursor: "pointer",
              boxShadow: `0 4px 24px ${C.accent}44`, transition: "all 0.2s",
              opacity: 1, transform: "translateY(0)",
              animation: "fadeUp 0.5s ease",
            }}>Let's Get Started {"\u2192"}</button>
          )}

          {!showStartBtn && (
            <button onClick={skipIntro} style={{ fontSize: 12, color: C.dim, background: "none", border: "none", cursor: "pointer", marginTop: 16 }}>Skip intro</button>
          )}
        </div>
      )}

      {/* ═══ STEP 1: Profile ═══ */}
      {step === 1 && (
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>Step 1 of 3</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Confirm Your Name</h2>
          <p style={{ fontSize: 13, color: C.dim, marginBottom: 28 }}>Your agents will use this to address you</p>

          <input
            type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Your first name"
            autoFocus
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 12, marginBottom: 24,
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 16, fontFamily: "inherit", outline: "none",
              textAlign: "center",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
          />

          <button onClick={() => setStep(2)} style={{
            padding: "14px 40px", borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
            border: "none", color: "#0b1220", cursor: "pointer",
            boxShadow: `0 4px 20px ${C.accent}44`, opacity: displayName.trim() ? 1 : 0.5,
          }}>Next {"\u2192"}</button>
        </div>
      )}

      {/* ═══ STEP 2: Situation ═══ */}
      {step === 2 && (
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>Step 2 of 3</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>What Best Describes You?</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, textAlign: "left" }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: "16px 20px", borderRadius: 14, cursor: "pointer",
                background: mode === m.id ? `${C.accent}08` : C.surface,
                border: `${mode === m.id ? 2 : 1}px solid ${mode === m.id ? C.accent + "55" : C.border}`,
                textAlign: "left", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: mode === m.id ? C.accent : C.text }}>{m.label}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.dim, marginBottom: 8 }}>Currency</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {["CAD", "USD", "GBP", "EUR"].map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: currency === c ? `${C.accent}12` : C.surface,
                  border: `1px solid ${currency === c ? C.accent + "44" : C.border}`,
                  color: currency === c ? C.accent : C.dim,
                }}>{c}</button>
              ))}
            </div>
          </div>

          <button onClick={() => setStep(3)} style={{
            padding: "14px 40px", borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
            border: "none", color: "#0b1220", cursor: "pointer",
            boxShadow: `0 4px 20px ${C.accent}44`,
          }}>Next {"\u2192"}</button>
        </div>
      )}

      {/* ═══ STEP 3: Priorities ═══ */}
      {step === 3 && (
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.accent, fontWeight: 700, marginBottom: 12 }}>Step 3 of 3</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>What Matters Most to You?</h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32 }}>
            {PRIORITIES.map(p => {
              const sel = priorities.includes(p);
              return (
                <button key={p} onClick={() => setPriorities(prev => sel ? prev.filter(x => x !== p) : [...prev, p])} style={{
                  padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: sel ? `${C.accent}12` : C.surface,
                  border: `1.5px solid ${sel ? C.accent + "55" : C.border}`,
                  color: sel ? C.accent : C.muted, transition: "all 0.15s",
                }}>{p}</button>
              );
            })}
          </div>

          <button onClick={handleComplete} style={{
            padding: "14px 40px", borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
            border: "none", color: "#0b1220", cursor: "pointer",
            boxShadow: `0 4px 20px ${C.accent}44`,
          }}>Complete Setup {"\u2192"}</button>
        </div>
      )}

      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
