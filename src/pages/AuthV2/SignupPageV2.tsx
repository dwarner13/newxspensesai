import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_THEME as C, AGENT_SHOWCASE } from "./authConfig";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPageV2() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
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

  const handleGoogleSignup = async () => {
    try { await signInWithGoogle(); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Google sign up failed"); }
  };
  const handleAppleSignup = async () => {
    try {
      const supabase = getSupabase(); if (!supabase) throw new Error("Auth not available");
      await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Apple sign up failed"); }
  };

  if (success) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u2709\uFE0F'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Check your email</h2>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
            We sent a confirmation link to <strong style={{ color: C.text }}>{email}</strong>.
            Click it to activate your account and meet your AI team.
          </p>
          <button onClick={() => navigate('/login')} style={{ padding: "12px 32px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer" }}>Back to Sign In</button>
        </div>
      </div>
    );
  }

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

        <button onClick={handleGoogleSignup} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, marginBottom: 8, background: C.surfaceLight, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.15s" }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentGlow; }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surfaceLight; }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <button onClick={handleAppleSignup} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, marginBottom: 20, background: C.surfaceLight, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.15s" }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentGlow; }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surfaceLight; }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={C.text}><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Continue with Apple
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.textDim }}>OR</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
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
