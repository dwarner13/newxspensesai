import type { ReactNode } from "react";
import { MarketingNav } from "../MarketingSite/MarketingNav";
import { MarketingFooter } from "../MarketingSite/MarketingFooter";

const C = { bg: "#0b1220", text: "#e8ecf4", muted: "#a0aec4", dim: "#6b7a99", accent: "#c8a64e", border: "#1e2d4a" };

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <MarketingNav />
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "140px 24px 80px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 40 }}>Last updated: {updated}</p>
        <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.8 }}>{children}</div>
      </article>
      <MarketingFooter />
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 22, fontWeight: 700, color: "#e8ecf4", marginTop: 40, marginBottom: 12 }}>{children}</h2>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 style={{ fontSize: 17, fontWeight: 700, color: "#e8ecf4", marginTop: 24, marginBottom: 8 }}>{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ marginBottom: 16 }}>{children}</p>;
}
