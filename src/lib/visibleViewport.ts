/**
 * UX-P2d — pure helper for the visible viewport (no React). See hooks/useVisualViewport.ts.
 */
export interface VisibleViewport {
  height: number;
  offsetTop: number;
}

export function readVisibleViewport(win: {
  innerHeight: number;
  visualViewport?: { height: number; offsetTop: number } | null;
}): VisibleViewport {
  const vv = win.visualViewport;
  if (vv && vv.height > 0) return { height: Math.round(vv.height), offsetTop: Math.max(0, Math.round(vv.offsetTop)) };
  return { height: win.innerHeight, offsetTop: 0 };
}
