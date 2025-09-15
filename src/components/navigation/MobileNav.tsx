// src/components/navigation/MobileNav.tsx
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Crown } from "lucide-react";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import NAV_ITEMS from "@/navigation/nav-registry"; // your single source of truth

type MobileNavProps = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  // Optional user info (for the footer card)
  user?: { name: string; tier?: string };
};

export default function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const location = useLocation();
  const isOpen = open ?? internalOpen;

  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    if (typeof v === 'function') {
      const newValue = v(isOpen);
      onOpenChange ? onOpenChange(newValue) : setInternalOpen(newValue);
    } else {
      onOpenChange ? onOpenChange(v) : setInternalOpen(v);
    }
  };

  // Global toggle fallback (if you use a bus, you can remove this)
  React.useEffect(() => {
    const onToggle = () => {
      console.log("[MobileNav] Received global toggle event, toggling state");
      setOpen((prev: boolean) => !prev);
    };
    window.addEventListener("__mobile_nav_toggle__", onToggle);
    return () => window.removeEventListener("__mobile_nav_toggle__", onToggle);
  }, []); // Remove isOpen dependency to prevent re-registration

  // Close drawer when route changes
  React.useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Group items by section label
  const grouped = NAV_ITEMS.reduce<Record<string, typeof NAV_ITEMS>>((acc: Record<string, typeof NAV_ITEMS>, item: any) => {
    const g = item.group ?? "OTHER";
    (acc[g] = acc[g] || []).push(item);
    return acc;
  }, {});

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="
          w-[85%] max-w-sm
          bg-gradient-to-b from-violet-700 via-fuchsia-700 to-indigo-800
          text-white
          border-none
          shadow-2xl
        "
        data-testid="mobile-sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-white" />
            <span className="text-lg font-semibold text-white">XspensesAI</span>
          </div>
          <SheetClose className="rounded-lg p-2 hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white" />
          </SheetClose>
        </div>

        {/* Scrollable nav content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-5">
              <div className="px-2 pb-2 text-xs uppercase tracking-wider text-white/40">
                {group}
              </div>
              <div className="space-y-2">
                {(items as any[]).map((item: any) => {
                  const active = location.pathname === item.to ||
                                 location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3",
                        "bg-transparent hover:bg-white/10 transition-colors",
                        active && "bg-white/10 ring-1 ring-white/10"
                      )}
                    >
                      <span className="shrink-0">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        {item.description && (
                          <div className="truncate text-xs text-white/60">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer profile badge */}
        <div className="px-4 pb-6">
          <div className="rounded-2xl px-3 py-3 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 grid place-items-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <div className="text-sm font-semibold">Darrell Warner</div>
                <div className="text-xs/5 opacity-90">Premium Member</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="rounded-xl bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white">
                Level 8 Money Master
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}