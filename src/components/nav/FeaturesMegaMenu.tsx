import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

type Item = { label: string; to: string; tag?: "NEW" | "BETA" };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "FEATURED TOOLS",
    items: [
      { label: "Smart Import AI", to: "/features/smart-import-ai", tag: "NEW" },
      { label: "AI Financial Assistant", to: "/features/ai-assistant" },
      { label: "AI Financial Therapist", to: "/features/ai-therapist" },
      { label: "AI Goal Concierge", to: "/features/goal-concierge" },
      { label: "Spending Predictions", to: "/features/spending-predictions" },
    ],
  },
  {
    title: "ENTERTAINMENT",
    items: [
      { label: "Personal Podcast", to: "/features/personal-podcast" },
      { label: "Financial Wellness Studio", to: "/features/wellness-studio" },
      { label: "Spotify Integration", to: "/features/spotify-integration", tag: "NEW" },
      { label: "Dashboard Player", to: "/dashboard/spotify-integration-new", tag: "BETA" },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { label: "Business Intelligence", to: "/features/business-expense-intelligence" },
      { label: "Freelancer Assistant", to: "/features/freelancer-tax" },
      { label: "Tax Optimization", to: "/features/tax-optimization" },
      { label: "Compliance & Audit", to: "/features/compliance-audit" },
    ],
  },
  {
    title: "TECHNICAL",
    items: [
      { label: "Receipt Scanner", to: "/features/receipt-scanner" },
      { label: "Document Upload", to: "/features/document-upload" },
      { label: "API & Webhooks", to: "/features/api-webhooks", tag: "BETA" },
      { label: "Security & Privacy", to: "/features/security-privacy" },
    ],
  },
];

export default function FeaturesMegaMenu() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);

  // close if clicked outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!panelRef.current || !btnRef.current) return;
      if (
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openWithDelay = () => {
    if (hoverTimeout) window.clearTimeout(hoverTimeout);
    const id = window.setTimeout(() => setOpen(true), 90);
    setHoverTimeout(id);
  };
  const closeWithDelay = () => {
    if (hoverTimeout) window.clearTimeout(hoverTimeout);
    const id = window.setTimeout(() => setOpen(false), 130);
    setHoverTimeout(id);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={openWithDelay}
        onMouseLeave={closeWithDelay}
        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-slate-200 hover:text-white focus:outline-none font-medium"
      >
        Features <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {/* PANEL */}
      <div
        ref={panelRef}
        onMouseEnter={openWithDelay}
        onMouseLeave={closeWithDelay}
        className={`pointer-events-auto absolute left-1/2 z-50 mt-3 w-[850px] -translate-x-1/2 rounded-3xl border border-white/10 shadow-2xl transition-all
        ${open ? "opacity-100 visible" : "opacity-0 invisible"}
        bg-gradient-to-br from-[#2a1946] via-[#1a2142] to-[#111827]`}
      >
        {/* top border glow */}
        <div className="h-1 w-full rounded-t-3xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-400 opacity-80" />
        <div className="grid grid-cols-4 gap-6 p-6">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="text-xs font-semibold tracking-widest text-slate-300">
                {sec.title}
              </div>
              <ul className="mt-1 space-y-0.5">
                {sec.items.map((it) => (
                  <li key={it.label}>
                    <Link
                      to={it.to}
                      className="group flex items-center justify-between rounded-xl px-3 py-2 text-[0.94rem] text-slate-200 hover:bg-white/5 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      <span>{it.label}</span>
                      {it.tag && (
                        <span
                          className={`ml-3 inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold
                          ${it.tag === "NEW"
                              ? "bg-cyan-400/90 text-slate-900"
                              : "bg-fuchsia-500/90 text-white"}`}
                        >
                          {it.tag}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom footer strip with CTA */}
        <div className="flex items-center justify-between rounded-b-3xl border-t border-white/10 bg-white/5 px-6 py-2">
          <div className="text-sm text-slate-300">
            Transform your finances with AI — <span className="text-white font-semibold">start today</span>.
          </div>
          <Link
            to="/signup"
            className="rounded-xl bg-[#06b6d4]/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#06b6d4]"
            onClick={() => setOpen(false)}
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
