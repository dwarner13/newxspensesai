import { useEffect, useState } from "react";

/**
 * UX-P2d — the visible viewport, which shrinks when the on-screen keyboard opens.
 *
 * iOS Safari / the installed PWA keep `100%` / `innerHeight` at the full screen height
 * while the keyboard is up, so a fixed full-height chat panel hides its composer behind
 * the keyboard. Sizing the panel to `visualViewport.height` (and offsetting by
 * `visualViewport.offsetTop`) keeps the composer just above the keyboard.
 */
import { readVisibleViewport, type VisibleViewport } from "@/lib/visibleViewport";

export { readVisibleViewport, type VisibleViewport };

export function useVisualViewport(enabled: boolean = true): VisibleViewport | null {
  const [vp, setVp] = useState<VisibleViewport | null>(() =>
    enabled && typeof window !== "undefined" ? readVisibleViewport(window) : null,
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") { setVp(null); return; }
    const update = () => setVp(readVisibleViewport(window));
    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return enabled ? vp : null;
}
