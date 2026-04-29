import { useState, useEffect, useRef } from "react";
import { THEME } from "./agentConfig";
import { useTypewriter } from "./useTypewriter";

interface PrimeThoughtsProps {
  text: string;
  enabled: boolean;
  onDone?: () => void;
  instant?: boolean;
}

export function PrimeThoughts({ text, enabled, onDone, instant = false }: PrimeThoughtsProps) {
  const [typed, done] = useTypewriter(text, 25, 400, enabled, instant);
  const firedRef = useRef(false);

  useEffect(() => {
    if (done && onDone && !firedRef.current) {
      firedRef.current = true;
      onDone();
    }
  }, [done, onDone]);

  if (!enabled) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 18, height: 2, borderRadius: 1, background: THEME.accent }} />
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 1.8,
            fontWeight: 700,
            color: THEME.accent,
          }}
        >
          Prime&apos;s Take
        </span>
        <div style={{ flex: 1, height: 1, background: THEME.border }} />
      </div>

      <div
        style={{
          fontSize: 13,
          color: THEME.textMuted,
          lineHeight: 1.65,
          padding: "14px 16px",
          borderRadius: 14,
          background: `linear-gradient(135deg, ${THEME.accent}08, transparent)`,
          border: `1px solid ${THEME.accent}15`,
        }}
      >
        {typed}
        <span
          style={{
            opacity: !done ? 1 : 0,
            transition: "opacity 0.3s",
            color: THEME.accent,
          }}
        >
          &#9612;
        </span>
      </div>
    </div>
  );
}
