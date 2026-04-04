import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_THEME as C, AGENT_SHOWCASE } from "./authConfig";
import { getSupabase } from "@/lib/supabase";

export default function SignupPageV2() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => setLoaded(true), []);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Auth not available");
      const { error: authErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authErr) throw authErr;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    width: "100%", padding: "14px 16px", borderRadius: 12, marginBottom: 18,
    background: C.surfaceLight, border: `1px solid ${focusedField === field ? C.accent : C.border}`,
    color: C.text, fontSize: 14, fontFamily: "inherit" as const, outline: "none",
    boxShadow: focusedField === field ? `0 0 0 2px ${C.accent}22, 0 4px 16px ${C.accent}08` : "none",
    transition: "all 0.2s",
  });

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
      background: C.bg, color: C.text, minHeight: "100vh",
      display: "flex", flexDirection: isMobile ? "column" : "row",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}08 0%, transparent 70%)`, filter: "blur(80px)" }} />

      {/* LEFT — Brand (hidden on mobile) */}
      <div style={{
        flex: 1, padding: isMobile ? "40px 24px 20px" : "60px 80px",
        display: isMobile ? "none" : "flex", flexDirection: "column",
        justifyContent: "center", position: "relative", zIndex: 1,
        opacity: loaded ? 1 : 0, transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 60 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)`,
            border: `1.5px solid ${C.accent}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: `0 0 24px ${C.accent}22`,
          }}>{"\uD83D\uDC51"}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>XspensesAI</div>
            <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>AI Finance</div>
          </div>
        </div>

        <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1, marginBottom: 20, maxWidth: 500 }}>
          Meet your{" "}
          <span style={{ color: C.accent }}>AI finance team.</span>
        </h1>
        <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.6, maxWidth: 440, marginBottom: 40 }}>
          Upload your first statement and watch 6 AI agents categorize, analyze, and optimize your finances in seconds.
        </p>

        {/* What you get */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "\uD83D\uDCCA", text: "Xspense Score \u2014 your financial health in one number" },
            { icon: "\uD83E\uDDFE", text: "AI tax deduction finder for self-employed" },
            { icon: "\uD83C\uDFAF", text: "Smart goals & debt coaching with AI" },
            { icon: "\u2655", text: "Prime \u2014 your personal financial advisor" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={{ fontSize: 14, color: C.textMuted }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Form */}
      <div style={{
        width: isMobile ? "100%" : 480, padding: isMobile ? "40px 24px" : "60px 50px",
        display: "flex", flexDirection: "column",
        justifyContent: "center",
        borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
        background: isMobile ? C.bg : `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
        position: "relative", zIndex: 1, flex: isMobile ? 1 : undefined,
        opacity: loaded ? 1 : 0, transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s",
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Get started free</h2>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 36 }}>Create your account and meet your AI team</p>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: `${C.red}12`, border: `1px solid ${C.red}22`, color: C.red, fontSize: 12, marginBottom: 16 }}>{error}</div>
        )}

        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: "block" }}>Full name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { document.querySelector<HTMLInputElement>('input[type="email"]')?.focus(); } }}
          onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)}
          placeholder="Your name" style={inputStyle("name")} />

        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: "block" }}>Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { document.querySelector<HTMLInputElement>('input[type="password"]')?.focus(); } }}
          onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
          placeholder="you@example.com" style={inputStyle("email")} />

        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: "block" }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void handleSignup(); }}
          onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
          placeholder="Min 8 characters" style={inputStyle("password")} />

        <button onClick={handleSignup} disabled={loading} style={{
          width: "100%", padding: "16px", borderRadius: 12,
          background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
          border: "none", color: "#0b1220", fontSize: 15, fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: `0 4px 20px ${C.accent}44`, opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Creating account..." : <>Create Account <span style={{ fontSize: 18 }}>{"\u2192"}</span></>}
        </button>

        <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 24 }}>
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} style={{ color: C.accent, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
