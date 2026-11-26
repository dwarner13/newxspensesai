import { useEffect, useState } from "react";
import { PrimeLogoBadge } from "@/components/branding/PrimeLogoBadge";
import { APP_SPLASH_SLOW_MS, splashStatus, type AppSplashStage } from "@/lib/appSplash";

/**
 * LD-1 (owner GO) — the single XspensesAI startup screen, used for sign-in, workspace
 * preparation and page downloads, so startup no longer shows different spinners at
 * different heights. Full-viewport and fixed, so successive uses never jump.
 * - Brand: the existing PrimeLogoBadge and wordmark, dark navy, gold ring.
 * - Accessible: role="status" with a short, real status line (no percentages).
 * - Reduced motion: the ring holds still; only the text changes.
 * - Recovery: after 15 s it says so and offers Reload; it never spins forever.
 * - inline: in the dashboard content area only (page downloads inside the app).
 * - showRing=false renders the screen without a visible indicator (used for the first
 *   few hundred ms of a page download, so quick loads don't flash anything).
 */
/**
 * SPLASH-1: one continuous startup splash. Startup passes through several loaders (sign-in,
 * route gate, page download, onboarding guard). The page-download loader hides its content
 * for its first 350 ms, which showed as a blank gap between two "Preparing your workspace"
 * screens. Once a full-screen splash has been seen and until the app shell has mounted, every
 * further splash is shown at once, full screen, with the same "preparing" text.
 */
let startupSplashSeen = false;
let appShellMounted = false;
/** Called once by the app shell (DashboardLayout) when its first screen is on display. */
export function markAppShellMounted(): void { appShellMounted = true; }

const NAVY = "#0b1220";
const GOLD = "#c8a64e";
const TRACK = "#1e2d4a";

export function AppSplash({ stage: stageProp = "loading", showRing: showRingProp = true, inline: inlineProp = false }: { stage?: AppSplashStage; showRing?: boolean; inline?: boolean }) {
  const continuing = startupSplashSeen && !appShellMounted;
  const showRing = continuing ? true : showRingProp;
  const inline = continuing ? false : inlineProp;
  const stage: AppSplashStage = continuing && stageProp === "loading" ? "preparing" : stageProp;
  if (showRing && !inline && !appShellMounted) startupSplashSeen = true;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), APP_SPLASH_SLOW_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        // inline: inside the dashboard content area (sidebar stays visible); otherwise full screen.
        ...(inline ? { position: "relative" as const, minHeight: "calc(100vh - 120px)" } : { position: "fixed" as const, inset: 0, zIndex: 50 }),
        background: NAVY,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "max(24px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes xaiSplashSpin { to { transform: rotate(360deg); } }
        .xai-splash-ring { animation: xaiSplashSpin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .xai-splash-ring { animation: none; } }
      `}</style>
      {showRing && (
        <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", maxWidth: 320 }}>
          <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="xai-splash-ring" aria-hidden="true"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${TRACK}`, borderTopColor: GOLD }} />
            <PrimeLogoBadge size={56} />
          </div>
          <div aria-hidden="true" style={{ fontSize: 20, fontWeight: 800, color: "#e8ecf4", letterSpacing: -0.2 }}>XspensesAI</div>
          <div style={{ fontSize: 15, color: "#c8d0e0", minHeight: 22 }}>{splashStatus(stage, slow)}</div>
          {slow && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ minHeight: 44, padding: "0 18px", borderRadius: 10, border: `1px solid ${TRACK}`, background: "transparent", color: GOLD, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Reload
            </button>
          )}
        </div>
      )}
    </div>
  );
}
