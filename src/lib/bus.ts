// src/lib/bus.ts
// Tiny typed event bus (singleton). No React dependency. Safe for client & server.
// Usage:
//   import { bus, onBus, emitBus } from "@/lib/bus";
//   onBus("UPLOAD_REQUESTED", (p)=>{ ... });
//   emitBus("UPLOAD_COMPLETED", { importId, fileKey });

type BusEventMap = {
  UPLOAD_REQUESTED: { source: "tile" | "nav" | "prime"; accept?: string[] };
  UPLOADER_OPEN: { reason: "tile" | "nav" | "prime" };
  UPLOAD_COMPLETED: { fileKey: string; mime: string; bytes: number };
  PARSE_REQUESTED: { fileKey: string; fast?: boolean };
  PARSE_COMPLETED: { importId: string; previewCount: number };
  IMPORT_COMMIT_REQUESTED: { importId: string };
  IMPORT_COMMITTED: { importId: string; transactionCount: number };
  PRIME_HANDOFF_REQUESTED: { importId: string };
  PRIME_HANDOFF_SENT: { handoffId: string; importId: string };
  CRYSTAL_ANALYZE_REQUESTED: { importId: string };
  CRYSTAL_ADVICE_READY: { importId: string; adviceId: string };
  BYTE_IMPORT_COMPLETED: { importId: string; userId: string; timestamp: string };
  ERROR: { where: string; message: string; detail?: unknown };
  FAST_MODE_TOGGLED: { enabled: boolean };
  WATCH_ME_WORK: { enabled: boolean };
  CHAT_OPEN: { 
    greeting?: string; 
    suggestions?: Array<{ label: string; action?: string; route?: string; event?: { type: string; payload: any } }>;
  };
};

type Handler<K extends keyof BusEventMap> = (payload: BusEventMap[K]) => void;

class TinyBus {
  private listeners = new Map<keyof BusEventMap, Set<Function>>();
  on<K extends keyof BusEventMap>(event: K, handler: Handler<K>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }
  off<K extends keyof BusEventMap>(event: K, handler: Handler<K>) {
    this.listeners.get(event)?.delete(handler);
  }
  emit<K extends keyof BusEventMap>(event: K, payload: BusEventMap[K]) {
    this.listeners.get(event)?.forEach((fn) => {
      try { (fn as Handler<K>)(payload); } catch (e) { console.error("[bus]", event, e); }
    });
  }
}

export const bus = new TinyBus();
export const onBus = bus.on.bind(bus) as TinyBus["on"];
export const emitBus = bus.emit.bind(bus) as TinyBus["emit"];
export type BusEvents = keyof BusEventMap;
export type BusPayload<K extends BusEvents> = BusEventMap[K];
