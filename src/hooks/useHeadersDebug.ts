import { useDevTools } from "@/contexts/DevToolsContext";

export const useHeadersDebug = () => {
  const devTools = useDevTools();

  return (headers: Headers | Record<string, string>) => {
    if (!devTools) return; // DevToolsProvider not mounted

    const obj: Record<string, string> =
      headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : headers;

    devTools.setLastHeaders(obj);

    // Derive memory quick view if present
    const hit = obj["x-memory-hit"] || obj["X-Memory-Hit"];
    const count = obj["x-memory-count"] || obj["X-Memory-Count"];

    if (hit || count) {
      devTools.setMemory((m) => ({
        ...m,
        hit: hit || m.hit,
        count: count ? Number(count) : m.count,
      }));
    }
  };
};

