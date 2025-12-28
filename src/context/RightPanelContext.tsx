import React, { createContext, useContext, useState, useCallback } from 'react';

type RightPanelState = {
  isAnyPanelOpen: boolean;
  registerPanel: (id: string, isOpen: boolean) => void;
};

const RightPanelContext = createContext<RightPanelState | undefined>(undefined);

export function RightPanelProvider({ children }: { children: React.ReactNode }) {
  const [panels, setPanels] = useState<Record<string, boolean>>({});

  // Stable registerPanel function - only updates state if value actually changed
  const registerPanel = useCallback((id: string, isOpen: boolean) => {
    setPanels(prev => {
      // Idempotent: only update if value actually changed
      if (prev[id] === isOpen) {
        return prev; // No change, return same reference
      }
      const updated = { ...prev, [id]: isOpen };
      return updated;
    });
  }, []);

  const isAnyPanelOpen = Object.values(panels).some(open => open);

  return (
    <RightPanelContext.Provider value={{ isAnyPanelOpen, registerPanel }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const ctx = useContext(RightPanelContext);
  if (!ctx) {
    // Return safe defaults if not in provider
    return { isAnyPanelOpen: false, registerPanel: () => {} };
  }
  return ctx;
}


