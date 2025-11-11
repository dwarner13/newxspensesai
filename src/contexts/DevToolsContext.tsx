import React, { createContext, useContext, useState, useMemo } from "react";

type DevState = {
  open: boolean;
  setOpen: (v: boolean) => void;
  lastHeaders?: Record<string, string>;
  setLastHeaders: (h: Record<string, string>) => void;
  sse: { chunks: number; lastEvent?: string; lastText?: string };
  setSse: (s: { chunks: number; lastEvent?: string; lastText?: string }) => void;
  guardrails: Array<{
    time: string;
    stage: string;
    action: string;
    severity?: string;
    meta?: any;
  }>;
  pushGuardrail: (e: DevState["guardrails"][number]) => void;
  memory: {
    hit?: string;
    count?: number;
    recalls?: Array<{ score: number; text: string }>;
    lastFacts?: string[];
  };
  setMemory: (m: DevState["memory"]) => void;
};

const DevToolsCtx = createContext<DevState | null>(null);

export const useDevTools = () => {
  const ctx = useContext(DevToolsCtx);
  // Return null if provider not mounted (for optional usage)
  return ctx;
};

export const DevToolsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [lastHeaders, setLastHeaders] = useState<Record<string, string>>({});
  const [sse, setSse] = useState({ chunks: 0 } as DevState["sse"]);
  const [guardrails, setGuardrails] = useState<DevState["guardrails"]>([]);
  const [memory, setMemory] = useState<DevState["memory"]>({});

  const pushGuardrail = (e: DevState["guardrails"][number]) =>
    setGuardrails((g) => [e, ...g].slice(0, 100));

  const value = useMemo(
    () => ({
      open,
      setOpen,
      lastHeaders,
      setLastHeaders,
      sse,
      setSse,
      guardrails,
      pushGuardrail,
      memory,
      setMemory,
    }),
    [open, lastHeaders, sse, guardrails, memory]
  );

  return <DevToolsCtx.Provider value={value}>{children}</DevToolsCtx.Provider>;
};

