import { useState, useEffect } from "react";
import { THEME } from "./agentConfig";
import type { CategoryBreakdownVisual } from "@/shared/prime-financial-visual";
import { BREAKDOWN_COLORS, breakdownTitle, breakdownShare, formatBreakdownAmount } from "@/lib/spendingBreakdownView";

/**
 * P-UI-3 (owner GO) — Prime's category breakdown card, rendered only from the server's
 * verified payload (meta.financialVisual, validated by validateFinancialVisual). The
 * frontend never computes or accepts model-written totals: labels, amounts, counts, total
 * and period all come from the payload; only colours and bar widths are presentation.
 */

const TEXT = { muted: "#c8d0e0", dim: "#9ba8bc" } as const;

function prefersReducedMotion(): boolean {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function MiniBar({ label, amount, count, share, color, currency }: { label: string; amount: number; count: number; share: number; color: string; currency: string }) {
  const [wide, setWide] = useState(() => (prefersReducedMotion() ? share : 0));
  useEffect(() => {
    if (prefersReducedMotion()) { setWide(share); return; }
    const t = setTimeout(() => setWide(share), 200);
    return () => clearTimeout(t);
  }, [share]);

  return (
    <li style={{ listStyle: "none", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 5 }}>
        <span style={{ fontSize: 14, color: TEXT.muted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label} <span style={{ fontSize: 12, color: TEXT.dim }}>· {count} txn{count === 1 ? "" : "s"}</span>
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: THEME.text, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {formatBreakdownAmount(amount, currency)}
        </span>
      </div>
      <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: THEME.bg, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${wide}%`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
    </li>
  );
}

export function SpendingBreakdown({ visual }: { visual: CategoryBreakdownVisual }) {
  const title = breakdownTitle(visual);
  return (
    <section
      aria-label={title}
      style={{ marginTop: 12, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "16px 18px" }}
    >
      <h4 style={{ margin: "0 0 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: TEXT.dim, fontWeight: 700 }}>
        {title}
      </h4>
      <ul style={{ margin: 0, padding: 0 }}>
        {visual.rows.map((row, i) => (
          <MiniBar
            key={`${row.label}-${i}`}
            label={row.label}
            amount={row.amount}
            count={row.count}
            share={breakdownShare(row.amount, visual.total)}
            color={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]}
            currency={visual.currency}
          />
        ))}
      </ul>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${THEME.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT.muted }}>
          Total · {visual.transactionCount} transaction{visual.transactionCount === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: THEME.text, fontVariantNumeric: "tabular-nums" }}>
          {formatBreakdownAmount(visual.total, visual.currency)}
        </span>
      </div>
    </section>
  );
}
