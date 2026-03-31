import type { ReactNode } from "react";
import { THEME } from "./categoryConfig";

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  icon: ReactNode;
}

export function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div style={{
      background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
      padding: "18px 20px", flex: 1, minWidth: 0,
      boxShadow: `0 4px 20px ${color}10`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, color: "#94a3b8", fontWeight: 700 }}>{label}</span>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: `${color}15`,
          display: "flex", alignItems: "center", justifyContent: "center", color,
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
