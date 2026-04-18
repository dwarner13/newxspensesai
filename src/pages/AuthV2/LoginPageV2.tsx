import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AUTH_THEME as C } from "./authConfig";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

// ---------- Slideshow content ----------
type Slide = {
  key: string;
  eyebrow: string;
  headline: string;
  accent?: string;
  body: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    key: "tax",
    eyebrow: "Tax Season, Handled",
    headline: "Hand your accountant a complete tax summary in one click.",
    body: null, // rendered below via TaxSummaryCard
  },
  {
    key: "trust",
    eyebrow: "Built in Canada",
    headline: "Built for self-employed Canadians.",
    body: null, // rendered below via TrustCard
  },
  {
    key: "guarantee",
    eyebrow: "Zero risk",
    headline: "14-day free trial. Cancel anytime.",
    body: null, // rendered below via GuaranteeCard
  },
];

export default function LoginPageV2() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  // Defensive: clear any stale message on mount (fixes persistent reset-link banner)
  useEffect(() => {
    setError("");
    setLoaded(true);
  }, []);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Slideshow auto-advance (pauses on hover)
  useEffect(() => {
    if (paused || isMobile) return;
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [paused, isMobile]);

  const handleEmailLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Auth not available");
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      // Auth state change in AuthContext will trigger redirect
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
    }
  };

  const handleAppleLogin = async () => {
    setError("");
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Auth not available");
      await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Apple sign in failed");
    }
  };

  const handleForgotPassword = useCallback(async () => {
    setError("");
    const supabase = getSupabase();
    if (!supabase) {
      setError("Auth not available");
      return;
    }
    if (!email) {
      setError("Enter your email first");
      return;
    }
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      toast.success("Check your email for a password reset link.", { duration: 5000 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    }
  }, [email]);

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background effects */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accent}08 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.purple}06 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />

      {/* LEFT - Slideshow (hidden on mobile) */}
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          flex: 1,
          padding: "60px 80px 140px",
          display: isMobile ? "none" : "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateX(0)" : "translateX(-20px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Centered content stack - fixed spacing regardless of viewport height */}
        <div style={{ maxWidth: 600, width: "100%" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 80 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)`,
              border: `1.5px solid ${C.accent}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: `0 0 24px ${C.accent}22`,
            }}
          >
            {"\uD83D\uDC51"}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>XspensesAI</div>
            <div
              style={{
                fontSize: 11,
                color: C.textDim,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: 600,
              }}
            >
              AI Finance
            </div>
          </div>
        </div>

        {/* Slides */}
        <div style={{ position: "relative", minHeight: 440, maxWidth: 600, marginBottom: 40 }}>
          {SLIDES.map((s, i) => (
            <div
              key={s.key}
              aria-hidden={slide !== i}
              style={{
                position: "absolute",
                inset: 0,
                opacity: slide === i ? 1 : 0,
                transform: slide === i ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
                pointerEvents: slide === i ? "auto" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.accent,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                {s.eyebrow}
              </div>
              <h1
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: -1,
                  marginBottom: 32,
                  color: C.text,
                }}
              >
                {s.key === "tax" && (
                  <>
                    Hand your accountant a{" "}
                    <span style={{ color: C.accent }}>complete tax summary</span> in one click.
                  </>
                )}
                {s.key === "trust" && (
                  <>
                    Built for <span style={{ color: C.accent }}>self-employed Canadians</span>.
                  </>
                )}
                {s.key === "guarantee" && (
                  <>
                    14-day free trial. <span style={{ color: C.accent }}>Zero risk.</span>
                  </>
                )}
              </h1>

              {s.key === "tax" && <TaxSummaryCard C={C} />}
              {s.key === "trust" && <TrustCard C={C} />}
              {s.key === "guarantee" && <GuaranteeCard C={C} />}
            </div>
          ))}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: slide === i ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: slide === i ? C.accent : `${C.textDim}55`,
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: slide === i ? `0 0 10px ${C.accent}66` : "none",
              }}
            />
          ))}
        </div>
        </div>

        {/* Security footer - pinned to bottom-left regardless of viewport height */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 80,
            right: 80,
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {["Bank-level Security", "PII Protection", "Encrypted Data"].map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.green,
                  boxShadow: `0 0 6px ${C.green}66`,
                }}
              />
              <span style={{ fontSize: 11, color: C.textDim }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT - Form */}
      <div
        style={{
          width: isMobile ? "100%" : 440,
          padding: isMobile ? "32px 24px" : "40px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
          background: isMobile ? C.bg : `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
          position: "relative",
          zIndex: 1,
          flex: isMobile ? 1 : undefined,
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateX(0)" : "translateX(20px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s",
        }}
      >
        {isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              marginBottom: 24,
              background: `linear-gradient(135deg, ${C.accent}18 0%, ${C.surface} 70%)`,
              border: `1px solid ${C.accent}44`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.25), 0 0 20px ${C.accent}10`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: `0 4px 14px ${C.accent}55`,
              }}
            >
              {"\uD83D\uDEE1\uFE0F"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  color: C.accent,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                14-day free trial
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, lineHeight: 1.35 }}>
                No credit card. Cancel anytime.
              </div>
            </div>
          </div>
        )}

        <h2
          style={{
            fontSize: isMobile ? 32 : 24,
            fontWeight: 800,
            marginBottom: isMobile ? 6 : 4,
          }}
        >
          Welcome back
        </h2>
        <p
          style={{
            fontSize: isMobile ? 15 : 13,
            color: C.textMuted,
            marginBottom: isMobile ? 28 : 20,
          }}
        >
          Sign in to continue to XspensesAI
        </p>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: `${C.red}12`,
              border: `1px solid ${C.red}22`,
              color: C.red,
              fontSize: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              aria-label="Dismiss error"
              style={{
                background: "none",
                border: "none",
                color: C.red,
                fontSize: 16,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            padding: isMobile ? "14px" : "10px 16px",
            borderRadius: isMobile ? 12 : 10,
            marginBottom: 8,
            background: C.surfaceLight,
            border: `1px solid ${C.border}`,
            color: C.text,
            fontSize: isMobile ? 16 : 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.borderColor = C.accent;
            e.currentTarget.style.background = C.accentGlow;
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.background = C.surfaceLight;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <button
          onClick={handleAppleLogin}
          style={{
            width: "100%",
            padding: isMobile ? "14px" : "10px 16px",
            borderRadius: isMobile ? 12 : 10,
            marginBottom: 14,
            background: C.surfaceLight,
            border: `1px solid ${C.border}`,
            color: C.text,
            fontSize: isMobile ? 16 : 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.borderColor = C.accent;
            e.currentTarget.style.background = C.accentGlow;
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.background = C.surfaceLight;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={C.text}>
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.textDim }}>OR</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            display: "block",
          }}
        >
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleEmailLogin();
          }}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          placeholder="you@example.com"
          style={{
            width: "100%",
            padding: isMobile ? "14px 16px" : "10px 14px",
            borderRadius: isMobile ? 12 : 10,
            marginBottom: 12,
            background: C.surfaceLight,
            border: `1px solid ${focusedField === "email" ? C.accent : C.border}`,
            color: C.text,
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            boxShadow:
              focusedField === "email"
                ? `0 0 0 2px ${C.accent}22, 0 4px 16px ${C.accent}08`
                : "none",
            transition: "all 0.2s",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>Password</label>
          <button
            onClick={handleForgotPassword}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Forgot password?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleEmailLogin();
          }}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          placeholder={"\u2022".repeat(10)}
          style={{
            width: "100%",
            padding: isMobile ? "14px 16px" : "10px 14px",
            borderRadius: isMobile ? 12 : 10,
            marginBottom: isMobile ? 20 : 14,
            background: C.surfaceLight,
            border: `1px solid ${focusedField === "password" ? C.accent : C.border}`,
            color: C.text,
            fontSize: isMobile ? 16 : 14,
            fontFamily: "inherit",
            outline: "none",
            boxShadow:
              focusedField === "password"
                ? `0 0 0 2px ${C.accent}22, 0 4px 16px ${C.accent}08`
                : "none",
            transition: "all 0.2s",
          }}
        />

        <button
          onClick={handleEmailLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: isMobile ? "16px" : "12px",
            borderRadius: isMobile ? 12 : 10,
            background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
            border: "none",
            color: "#0b1220",
            fontSize: isMobile ? 18 : 14,
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: `0 4px 20px ${C.accent}44`,
            opacity: loading ? 0.7 : 1,
            transition: "all 0.15s",
          }}
        >
          {loading ? (
            "Signing in..."
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" fill="#0b1220" />
                <path
                  d="M8 10V7a4 4 0 018 0v3"
                  stroke="#0b1220"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="12" cy="15.5" r="1.5" fill={C.accent} />
              </svg>
              Sign in
              <span style={{ fontSize: 18 }}>{"\u2192"}</span>
            </>
          )}
        </button>

        <p
          style={{
            fontSize: isMobile ? 14 : 12,
            color: C.textMuted,
            textAlign: "center",
            marginTop: isMobile ? 20 : 14,
          }}
        >
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/signup")}
            style={{
              color: C.accent,
              fontWeight: 700,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: isMobile ? 14 : 12,
            }}
          >
            Create one
          </button>
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: isMobile ? 20 : 16,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: C.green,
              boxShadow: `0 0 6px ${C.green}66`,
            }}
          />
          <span style={{ fontSize: 10, color: C.textDim }}>
            Secured {"\u2022"} Guardrails + PII protection active
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- Slide body components ----------

function TaxSummaryCard({ C }: { C: typeof import("./authConfig").AUTH_THEME }) {
  return (
    <div
      style={{
        maxWidth: 460,
        borderRadius: 16,
        background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        padding: 24,
        boxShadow: `0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px ${C.accent}11 inset`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
            Tax Summary
          </div>
          <div style={{ fontSize: 16, color: C.text, fontWeight: 700 }}>2025 Tax Year</div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: `${C.green}18`,
            border: `1px solid ${C.green}33`,
            color: C.green,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Ready
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <SummaryRow label="Total income" value="$134,000" valueColor={C.accent} C={C} />
        <SummaryRow label="Total expenses" value="$80,000" valueColor={C.text} C={C} />
        <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
        <SummaryRow label="Net income" value="$54,000" valueColor={C.green} bold C={C} />
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}06)`,
          border: `1px solid ${C.accent}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
        }}
      >
        <span style={{ color: C.text, fontWeight: 600 }}>
          {"\u2192"} Export for your accountant
        </span>
        <span style={{ color: C.accent, fontWeight: 700, fontSize: 11 }}>PDF · XLSX · CSV</span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
  bold,
  C,
}: {
  label: string;
  value: string;
  valueColor: string;
  bold?: boolean;
  C: typeof import("./authConfig").AUTH_THEME;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
      <span style={{ fontSize: bold ? 20 : 16, fontWeight: bold ? 800 : 700, color: valueColor }}>
        {value}
      </span>
    </div>
  );
}

function TrustCard({ C }: { C: typeof import("./authConfig").AUTH_THEME }) {
  const items = [
    { icon: "\uD83D\uDCB3", label: "No credit card required" },
    { icon: "\u26A1", label: "Cancel anytime" },
    { icon: "\uD83D\uDD12", label: "Bank-level encryption" },
  ];
  return (
    <div
      style={{
        maxWidth: 460,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 12,
            background: C.surface,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${C.accent}18`,
              border: `1px solid ${C.accent}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {it.icon}
          </div>
          <div style={{ fontSize: 15, color: C.text, fontWeight: 600 }}>{it.label}</div>
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          color: C.textMuted,
          lineHeight: 1.6,
        }}
      >
        Built in Alberta for freelancers, side-hustlers, and solo operators across Canada and the U.S.
      </div>
    </div>
  );
}

function GuaranteeCard({ C }: { C: typeof import("./authConfig").AUTH_THEME }) {
  return (
    <div
      style={{
        maxWidth: 460,
        borderRadius: 16,
        padding: 28,
        background: `linear-gradient(135deg, ${C.accent}16 0%, ${C.surface} 60%)`,
        border: `1px solid ${C.accent}44`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.35), 0 0 40px ${C.accent}14`,
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          flexShrink: 0,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30,
          boxShadow: `0 10px 30px ${C.accent}55`,
        }}
      >
        {"\uD83D\uDEE1\uFE0F"}
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: C.accent,
            textTransform: "uppercase",
            letterSpacing: 2,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Our Guarantee
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          Try free for 14 days.
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>
          Upload statements, run the AI team, export your tax summary. If it doesn't save you
          hours, cancel — no questions, no charge.
        </div>
      </div>
    </div>
  );
}
