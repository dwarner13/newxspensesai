import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { X, Home, Receipt, Tags, Brain, FileText, Star, Target, Mic, Briefcase, Settings, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MobileSidebarProps { open: boolean; onClose: () => void; }

const C = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc", accent: "#c8a64e" };

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: Home, group: "primary" },
  { label: "Transactions", to: "/dashboard/transactions", icon: Receipt, group: "primary" },
  { label: "Categories", to: "/dashboard/categories", icon: Tags, group: "primary" },
  { label: "My Story", to: "/dashboard/my-story", icon: Brain, group: "primary", badge: "New" },
  { label: "Reports", to: "/dashboard/reports", icon: FileText, group: "primary" },
  { label: "Xspense Score", to: "/dashboard/xspense-score", icon: Star, group: "primary" },
  { label: "Goals & Debt", to: "/dashboard/goal-concierge", icon: Target, group: "more" },
  { label: "Monthly Recap", to: "/dashboard/monthly-recap", icon: Mic, group: "more" },
  { label: "Tax & Business", to: "/dashboard/tax-business", icon: Briefcase, group: "more" },
  { label: "Settings", to: "/dashboard/settings", icon: Settings, group: "more" },
];

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { firstName, signOut } = useAuth();

  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 998 }} onClick={onClose} />
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: "85%", maxWidth: 360, zIndex: 999,
        background: C.bg, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
        animation: "slideInLeft 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{"\uD83D\uDC51"}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>XspensesAI</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {NAV.map(item => {
            const isActive = item.to === "/dashboard"
              ? location.pathname === "/dashboard" || location.pathname === "/dashboard/"
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"} onClick={onClose} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10, marginBottom: 2,
                background: isActive ? `${C.accent}12` : "transparent",
                borderLeft: isActive ? `3px solid ${C.accent}` : "3px solid transparent",
                color: isActive ? C.accent : C.text,
                textDecoration: "none", fontSize: 16, fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s",
              }}>
                <Icon size={18} />
                {item.label}
                {item.badge && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${C.accent}15`, color: C.accent }}>{item.badge}</span>}
              </NavLink>
            );
          })}

          {/* Upload CTA */}
          <button onClick={() => { onClose(); navigate("/dashboard/upload"); }} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "14px 16px", borderRadius: 12, marginTop: 12,
            background: `${C.accent}08`, border: `1.5px dashed ${C.accent}33`,
            color: C.accent, fontSize: 16, fontWeight: 700, cursor: "pointer",
            textAlign: "left",
          }}>
            <Upload size={18} />
            Upload Statement
          </button>
        </div>

        {/* User section */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.accent}20`, border: `1px solid ${C.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.accent }}>
            {(firstName || "D").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{firstName || "User"}</div>
            <div style={{ fontSize: 12, color: C.dim }}>Free Plan</div>
          </div>
          <button onClick={() => { onClose(); void signOut(); }} style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
      <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}


