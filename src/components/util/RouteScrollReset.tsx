import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function resetById(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  // Prefer scrollTo when available, fall back to scrollTop
  // Use 'auto' to avoid animation while navigating
  try {
    // @ts-ignore - scrollBehavior types on HTMLElement vary
    el.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  } catch {
    (el as HTMLElement).scrollTop = 0;
    (el as HTMLElement).scrollLeft = 0;
  }
}

export default function RouteScrollReset() {
  const location = useLocation();

  useEffect(() => {
    // Reset window (in case a page accidentally scrolls the body)
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // Reset our app's scroll containers
    resetById("main-scroll");
    resetById("sidebar-scroll");
  }, [location.pathname]);

  return null;
}




