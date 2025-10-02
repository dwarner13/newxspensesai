/**
 * Isolated Sheet test route to verify Radix UI + Portal + z-index functionality
 * Access at /debug/sheet
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "../../components/ui/sheet";
import { Portal } from "@radix-ui/react-portal";

export default function SheetCheck() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">SheetCheck</h1>
        <p className="text-zinc-300">
          Open should toggle true/false and a left drawer should appear above everything.
        </p>

        <Sheet open={open} onOpenChange={(v) => {
          console.log("[SheetCheck] onOpenChange", v);
          setOpen(v);
        }}>
          <SheetTrigger asChild>
            <button
              data-testid="sheetcheck-trigger"
              onClick={() => console.log("[SheetCheck] trigger click")}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700 transition-colors"
            >
              Toggle Drawer
            </button>
          </SheetTrigger>

          {/* Force portal + max z-index + no animation fallback */}
          <Portal>
            <SheetContent
              side="left"
              className={[
                "fixed left-0 top-0 h-screen w-80 max-w-[88vw] bg-zinc-950",
                "border-r border-zinc-800 p-0 shadow-2xl",
                "z-[9999] !translate-x-0 !opacity-100", // kill animation issues
                "pointer-events-auto"
              ].join(" ")}
            >
              <SheetHeader className="px-4 py-3 text-white border-b border-zinc-800">
                SheetCheck Drawer
              </SheetHeader>
              <div className="p-4 text-zinc-300 space-y-2">
                <p>If you can see this, radix + portal + z-index are healthy.</p>
                <button 
                  onClick={() => setOpen(false)} 
                  className="rounded bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </SheetContent>
          </Portal>
        </Sheet>

        <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <p className="text-sm text-zinc-400">Open state: {open ? 'true' : 'false'}</p>
          <p className="text-sm text-zinc-400">Check console for click logs</p>
        </div>
      </div>
    </div>
  );
}

















