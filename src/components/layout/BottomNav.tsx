import React from "react";
import { Home, UploadCloud, Bot, Heart, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";

function Item({
  to,
  label,
  icon,
  onClick,
}: { to?: string; label: string; icon: React.ReactNode; onClick?: () => void }) {
  const base =
    "flex flex-col items-center justify-center py-2 text-xs font-medium";
  return to ? (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${base} ${isActive ? "text-white" : "text-white/70"}`
      }
    >
      {icon}
      <span className="mt-1">{label}</span>
    </NavLink>
  ) : (
    <button onClick={onClick} className={`${base} text-white/90`}>
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}

export default function BottomNav({ onMore }: { onMore: () => void }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-[#0b0f2a]/90 backdrop-blur border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 text-center">
        <Item to="/dashboard" label="Home" icon={<Home className="h-5 w-5" />} />
        <Item to="/dashboard/smart-import-ai" label="Import" icon={<UploadCloud className="h-5 w-5" />} />
        <Item to="/dashboard/ai-financial-assistant" label="Assistant" icon={<Bot className="h-5 w-5" />} />
        <Item to="/dashboard/wellness-studio" label="Wellness" icon={<Heart className="h-5 w-5" />} />
        <Item label="More" icon={<Menu className="h-5 w-5" />} onClick={onMore} />
      </div>
    </nav>
  );
}
