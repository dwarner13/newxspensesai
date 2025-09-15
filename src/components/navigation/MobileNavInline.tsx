import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Crown, Menu } from "lucide-react";
import NAV_ITEMS from "@/navigation/nav-registry";
import clsx from "clsx";

export default function MobileNavInline() {
  const [open, setOpen] = React.useState(false);
  const loc = useLocation();

  // Debug
  React.useEffect(() => console.info("[MobileNavInline] open:", open), [open]);

  // Optional: listen for global toggle if we keep it elsewhere
  React.useEffect(() => {
    const onToggle = () => setOpen(v => !v);
    window.addEventListener("__mobile_nav_toggle__", onToggle);
    return () => window.removeEventListener("__mobile_nav_toggle__", onToggle);
  }, []);

  // Group items
  const grouped = NAV_ITEMS.reduce((acc: Record<string, typeof NAV_ITEMS>, it) => {
    const g = it.group ?? "GENERAL";
    (acc[g] ||= []).push(it);
    return acc;
  }, {});

  const isActive = (to: string) => loc.pathname === to || loc.pathname.startsWith(to + "/");

  return (
    <div className="md:hidden" data-testid="mobile-nav">
      <Sheet open={open} onOpenChange={setOpen}>
        {/* SINGLE, CANONICAL HAMBURGER */}
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-all duration-200"
            data-testid="mobile-hamburger"
          >
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>

        {/* Drawer */}
        <SheetContent
          side="left"
          className="
            w-[85%] max-w-sm
            bg-zinc-950/40 backdrop-blur
            text-zinc-300 border-r border-zinc-800 shadow-2xl
            flex flex-col z-[9998] p-0
          "
          data-testid="mobile-sidebar"
        >
          {/* Header */}
          <div className="flex items-center px-4 pt-4 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">XspensesAI</span>
            </div>
          </div>

          {/* Navigation list area */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-5">
                <div className="px-1 pb-2 text-xs uppercase tracking-wider text-zinc-500 font-semibold">{group}</div>
                <div className="space-y-1">
                  {items.map((item: any) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                        "hover:bg-zinc-900/60 hover:text-white",
                        isActive(item.to) 
                          ? "bg-zinc-900 text-white" 
                          : "text-zinc-300"
                      )}
                    >
                      <span className="shrink-0 w-5 h-5">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.label}</div>
                        {item.description && <div className="truncate text-xs text-zinc-400">{item.description}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer badge with tighter padding */}
          <div className="px-4 pb-5 border-t border-zinc-800 pt-4">
            <div className="rounded-xl px-3 py-3 bg-gradient-to-br from-purple-600 to-cyan-500 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">U</span>
                </div>
                <div className="text-white">
                  <div className="text-sm font-semibold">Darrell Warner</div>
                  <div className="text-xs text-white/80">Premium Member</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="bg-white/20 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                  Level 8 Money Master
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
