import type { ConsultationView } from "@/lib/specialistConsultation";

/**
 * L-A — compact, read-only collaboration marker above an assistant reply.
 * Plain text (no button): it records that Prime consulted a specialist, nothing more.
 */
export function SpecialistConsultationMarker({ consultations }: { consultations: ConsultationView[] }) {
  if (consultations.length === 0) return null;
  return (
    <ul aria-label="Specialists consulted" style={{ listStyle: "none", margin: "0 0 8px", padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {consultations.map((c) => (
        <li
          key={c.key}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%",
            minHeight: 28, padding: "3px 10px 3px 4px", borderRadius: 14,
            background: `${c.specialist.color}10`, border: `1px solid ${c.specialist.color}33`,
            color: "#c8d0e0", fontSize: 13, lineHeight: 1.3,
          }}
        >
          <span aria-hidden="true" style={{
            width: 20, height: 20, flexShrink: 0, borderRadius: "50%",
            background: `${c.specialist.color}22`, border: `1.5px solid ${c.specialist.color}66`,
            color: c.specialist.color, fontSize: 11, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>{c.specialist.letter}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}
