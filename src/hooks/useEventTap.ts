import { useDevTools } from "@/contexts/DevToolsContext";

export function useEventTap() {
  const devTools = useDevTools();

  // Call this for each SSE data/chunk you receive
  return (evt: { event?: string; data?: string; textChunk?: string }) => {
    if (!devTools) return; // DevToolsProvider not mounted
    
    devTools.setSse((prev) => ({
      chunks: (prev.chunks ?? 0) + (evt.textChunk ? 1 : 0),
      lastEvent: evt.event ?? prev.lastEvent,
      lastText: evt.textChunk ?? prev.lastText,
    }));
  };
}

