import { useState } from "react";
import { THEME, GOALIE_COLOR, type LessonData } from "./goalsConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface MoneyLessonsProps {
  lessons: LessonData[];
}

export function MoneyLessons({ lessons }: MoneyLessonsProps) {
  return (
    <div>
      <Reveal delay={100}>
        <div style={{
          display: "flex", gap: 12, padding: "16px 20px", borderRadius: 14,
          background: `${GOALIE_COLOR}06`, border: `1px solid ${GOALIE_COLOR}15`,
          marginBottom: 20, alignItems: "center",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `${GOALIE_COLOR}25`, border: `1.5px solid ${GOALIE_COLOR}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: GOALIE_COLOR,
          }}>G</div>
          <div style={{ flex: 1, fontSize: 12.5, color: THEME.textMuted }}>
            <span style={{ fontWeight: 700, color: GOALIE_COLOR }}>Goalie:</span> Based on your spending patterns, I'd recommend starting with "Debt Snowball vs Avalanche" \u2014 it\'s directly relevant to your debt situation.
          </div>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {lessons.map((l, i) => (
          <LessonCard key={l.title} lesson={l} index={i} />
        ))}
      </div>
    </div>
  );
}

function LessonCard({ lesson: l, index }: { lesson: LessonData; index: number }) {
  const [h, setH] = useState(false);
  return (
    <Reveal delay={200 + index * 80}>
      <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
        background: h ? `${l.color}0a` : THEME.surface,
        border: `1px solid ${h ? l.color + "33" : THEME.border}`,
        borderRadius: 16, padding: "22px", cursor: "pointer",
        transition: "all 0.25s", transform: h ? "translateY(-2px)" : "translateY(0)",
        boxShadow: h ? `0 8px 32px ${l.color}0d` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${l.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{l.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>{l.title}</div>
            <div style={{ fontSize: 11, color: THEME.textDim }}>By {l.agent} \u2022 {l.duration} read</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 14 }}>{l.desc}</div>
        <button style={{
          padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: `${l.color}12`, border: `1px solid ${l.color}28`, color: l.color, cursor: "pointer",
        }}>Start Lesson {"\u2192"}</button>
      </div>
    </Reveal>
  );
}
