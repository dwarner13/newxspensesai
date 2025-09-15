import { Menu } from "lucide-react";

export default function MobileNavTrigger() {
  const handleClick = () => {
    console.log("[MobileNavTrigger] Button clicked, dispatching global event");
    // Dispatch global event for MobileNav to catch
    window.dispatchEvent(new CustomEvent("__mobile_nav_toggle__"));
  };

  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-lg p-2 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 md:hidden"
      data-testid="mobile-hamburger"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
