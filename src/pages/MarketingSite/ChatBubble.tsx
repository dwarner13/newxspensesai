import { useState, useEffect, useRef } from "react";
import { MKTG_THEME as C, type AgentShowcase } from "./marketingConfig";

interface ChatBubbleProps {
  agent: AgentShowcase;
  delay?: number;
}

export function ChatBubble({ agent, delay = 0 }: ChatBubbleProps) {
  const [show, setShow] = useState(false);
  const [typed, setTyped] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShow(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!show) return;
    let i = 0;
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        if (i <= agent.quote.length) { setTyped(agent.quote.slice(0, i)); i++; }
        else clearInterval(iv);
      }, 25);
    }, delay);
    return () => clearTimeout(t);
  }, [show, agent.quote, delay]);

  return (
    <div ref={ref} style={{
      display: "flex", gap: 14, padding: "20px 24px",
      opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(16px)",
      transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${agent.color}30, ${agent.color}10)`,
        border: `1.5px solid ${agent.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: agent.name === "Prime" ? 20 : 16, fontWeight: 700, color: agent.color,
        boxShadow: `0 0 20px ${agent.color}22`,
      }}>{agent.letter}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: agent.color }}>{agent.name}</span>
          <span style={{ fontSize: 10, color: C.textDim }}>{agent.role}</span>
        </div>
        <div style={{
          padding: "14px 18px", borderRadius: 16, borderTopLeftRadius: 4,
          background: `${agent.color}08`, border: `1px solid ${agent.color}15`,
          fontSize: 14, color: C.textMuted, lineHeight: 1.5, minHeight: 24,
        }}>
          {typed}
          {typed.length > 0 && typed.length < agent.quote.length && (
            <span style={{ color: agent.color }}>{"\u2588"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
