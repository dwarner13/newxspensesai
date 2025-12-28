/**
 * useBodyClass Hook
 * 
 * Reusable hook for toggling body classes.
 * Useful for global UI state management (drawers, modals, etc.)
 */

import { useEffect } from "react";

export function useBodyClass(className: string, enabled: boolean) {
  useEffect(() => {
    document.body.classList.toggle(className, enabled);
    return () => {
      document.body.classList.remove(className);
    };
  }, [className, enabled]);
}




