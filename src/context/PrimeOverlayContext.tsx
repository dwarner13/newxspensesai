import React, { createContext, useContext, useState } from "react";

type PrimeOverlayState = {
  primeToolsOpen: boolean;
  setPrimeToolsOpen: (open: boolean) => void;
};

const PrimeOverlayContext = createContext<PrimeOverlayState | undefined>(
  undefined
);

export function PrimeOverlayProvider({ children }: { children: React.ReactNode }) {
  const [primeToolsOpen, setPrimeToolsOpen] = useState(false);

  return (
    <PrimeOverlayContext.Provider value={{ primeToolsOpen, setPrimeToolsOpen }}>
      {children}
    </PrimeOverlayContext.Provider>
  );
}

export function usePrimeOverlay() {
  const ctx = useContext(PrimeOverlayContext);
  if (!ctx) {
    throw new Error("usePrimeOverlay must be used within PrimeOverlayProvider");
  }
  return ctx;
}

/**
 * Safe version of usePrimeOverlay that returns default values if not in provider
 * Use this in components that may or may not be wrapped in PrimeOverlayProvider
 */
export function usePrimeOverlaySafe() {
  const ctx = useContext(PrimeOverlayContext);
  return {
    primeToolsOpen: ctx?.primeToolsOpen ?? false,
    setPrimeToolsOpen: ctx?.setPrimeToolsOpen ?? (() => {}),
  };
}

