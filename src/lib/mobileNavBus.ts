/**
 * Simple window-based event bus for mobile navigation
 * Bridges MobileRevolution and MobileNav without DOM queries
 */

const OPEN = "mobile-nav:open";
const CLOSE = "mobile-nav:close";
const TOGGLE = "mobile-nav:toggle";

export function openMobileNav() {
  console.log("[MobileNavBus] Dispatching open event");
  window.dispatchEvent(new CustomEvent(OPEN));
}

export function closeMobileNav() {
  console.log("[MobileNavBus] Dispatching close event");
  window.dispatchEvent(new CustomEvent(CLOSE));
}

export function toggleMobileNav() {
  console.log("[MobileNavBus] Dispatching toggle event");
  window.dispatchEvent(new CustomEvent(TOGGLE));
}

// Hook for consumers to subscribe
export function subscribeMobileNav(
  onOpen: () => void,
  onClose: () => void,
  onToggle?: () => void
) {
  const handleOpen = () => {
    console.log("[MobileNavBus] Received open event");
    onOpen();
  };
  
  const handleClose = () => {
    console.log("[MobileNavBus] Received close event");
    onClose();
  };
  
  const handleToggle = () => {
    console.log("[MobileNavBus] Received toggle event");
    if (onToggle) {
      onToggle();
    } else {
      onOpen();
    }
  };

  window.addEventListener(OPEN, handleOpen);
  window.addEventListener(CLOSE, handleClose);
  window.addEventListener(TOGGLE, handleToggle);

  return () => {
    window.removeEventListener(OPEN, handleOpen);
    window.removeEventListener(CLOSE, handleClose);
    window.removeEventListener(TOGGLE, handleToggle);
  };
}

// React hook for easy consumption
export function useMobileNavBus() {
  return {
    open: openMobileNav,
    close: closeMobileNav,
    toggle: toggleMobileNav
  };
}
