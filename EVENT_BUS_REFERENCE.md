# 🚀 EVENT BUS REFERENCE - TinyBus

**File:** `src/lib/bus.ts`  
**Status:** ✅ Production-Ready  
**Date:** October 18, 2025  

---

## 📋 OVERVIEW

**TinyBus** is a lightweight, **fully typed** event bus for Smart Import AI. It coordinates communication between:
- UI components (tiles, buttons, forms)
- Global StatementUpload component
- Netlify functions
- Toast notifications

**Key Features:**
- ✅ Full TypeScript generics support (type-safe payloads)
- ✅ No React dependency (works anywhere)
- ✅ Automatic listener cleanup
- ✅ Safe error handling (catches listener exceptions)
- ✅ Singleton pattern (one global instance)
- ✅ ~80 lines of code

---

## 🏗️ ARCHITECTURE

```typescript
class TinyBus {
  private listeners: Map<EventName, Set<Handler>>
  
  on<K>(event: K, handler: (payload: PayloadFor<K>) => void)
    → Unsubscribe function
  
  off<K>(event: K, handler)
    → Removes listener
  
  emit<K>(event: K, payload: PayloadFor<K>)
    → Calls all listeners (with error safety)
}

export const bus = new TinyBus() // singleton
export const onBus = bus.on.bind(bus)
export const emitBus = bus.emit.bind(bus)
```

---

## 📡 EVENT MAP (All 13 Events)

### 1. **UPLOAD_REQUESTED**
**When:** User clicks an upload tile or nav button  
**Payload:**
```typescript
{
  source: "tile" | "nav" | "prime"    // Where request originated
  accept?: string[]                    // Optional: filter file types
}
```
**Listeners:**
- StatementUpload component (sets file input filters)

**Example:**
```typescript
emitBus("UPLOAD_REQUESTED", { source: "tile", accept: [".pdf"] });
```

---

### 2. **UPLOADER_OPEN**
**When:** Global StatementUpload is about to open file picker  
**Payload:**
```typescript
{
  reason: "tile" | "nav" | "prime"   // Reason for opening
}
```
**Listeners:**
- SmartImportAI (can show progress indicator)

**Example:**
```typescript
onBus("UPLOADER_OPEN", ({ reason }) => {
  console.log(`File picker opening from: ${reason}`);
});
```

---

### 3. **UPLOAD_COMPLETED**
**When:** File successfully uploaded to Supabase Storage  
**Payload:**
```typescript
{
  fileKey: string         // Storage path (e.g., "users/123/statement.pdf")
  mime: string            // MIME type (e.g., "application/pdf")
  bytes: number           // File size in bytes
}
```
**Listeners:**
- SmartImportAI (triggers OCR parse)
- Toast system (success notification)

**Example:**
```typescript
onBus("UPLOAD_COMPLETED", ({ fileKey, mime, bytes }) => {
  console.log(`Uploaded: ${fileKey} (${(bytes / 1024).toFixed(1)} KB)`);
});
```

---

### 4. **PARSE_REQUESTED**
**When:** StatementUpload calls byte-ocr-parse  
**Payload:**
```typescript
{
  fileKey: string         // File to parse
  fast?: boolean          // Fast processing mode
}
```
**Listeners:**
- SmartImportAI (shows loading spinner)

---

### 5. **PARSE_COMPLETED**
**When:** OCR parse completes and returns preview rows  
**Payload:**
```typescript
{
  importId: string        // Import ID from database
  previewCount: number    // Number of preview rows (e.g., 15)
}
```
**Listeners:**
- SmartImportAI (displays preview table)
- Toast (success notification)

**Example:**
```typescript
onBus("PARSE_COMPLETED", ({ importId, previewCount }) => {
  toast.success(`Preview ready — ${previewCount} rows`);
});
```

---

### 6. **IMPORT_COMMIT_REQUESTED**
**When:** User clicks "Approve & Send to Prime & Crystal"  
**Payload:**
```typescript
{
  importId: string        // Which import to commit
}
```
**Listeners:**
- SmartImportAI (shows processing state)

---

### 7. **IMPORT_COMMITTED**
**When:** commit-import Netlify function completes  
**Payload:**
```typescript
{
  importId: string        // Committed import
  transactionCount: number // How many rows were committed (e.g., 42)
}
```
**Listeners:**
- SmartImportAI (proceeds to Prime handoff)
- Toast (success notification)

**Example:**
```typescript
onBus("IMPORT_COMMITTED", ({ importId, transactionCount }) => {
  toast.success(`✅ Committed ${transactionCount} transactions`);
});
```

---

### 8. **PRIME_HANDOFF_REQUESTED**
**When:** SmartImportAI calls prime-handoff function  
**Payload:**
```typescript
{
  importId: string        // Import being handed to Prime
}
```
**Listeners:**
- Toast (show progress)

---

### 9. **PRIME_HANDOFF_SENT**
**When:** prime-handoff function returns successfully  
**Payload:**
```typescript
{
  handoffId: string       // Handoff record ID
  importId: string        // Original import
}
```
**Listeners:**
- SmartImportAI (proceeds to Crystal)
- Toast (progress notification)

---

### 10. **CRYSTAL_ANALYZE_REQUESTED**
**When:** SmartImportAI calls crystal-analyze-import  
**Payload:**
```typescript
{
  importId: string        // (or handoffId for future)
}
```
**Listeners:**
- Toast (show analyzing status)

---

### 11. **CRYSTAL_ADVICE_READY**
**When:** crystal-analyze-import returns advisory  
**Payload:**
```typescript
{
  importId: string        // Original import
  adviceId: string        // Stored advice record ID
}
```
**Listeners:**
- SmartImportAI (displays advisory card)
- Toast (success notification)
- Analytics (logs completion)

---

### 12. **ERROR**
**When:** Any step fails (upload, parse, commit, etc.)  
**Payload:**
```typescript
{
  where: string           // "UPLOAD" | "PARSE" | "COMMIT" | etc.
  message: string         // User-friendly message
  detail?: unknown        // Raw error for debugging
}
```
**Listeners:**
- Toast (error notification)
- Analytics (error tracking)

**Example:**
```typescript
onBus("ERROR", ({ where, message, detail }) => {
  console.error(`[${where}] ${message}`, detail);
  toast.error(message);
});
```

---

### 13. **FAST_MODE_TOGGLED**
**When:** User clicks "Fast Processing" tile  
**Payload:**
```typescript
{
  enabled: boolean        // true = enable, false = disable
}
```
**Listeners:**
- StatementUpload (passes to byte-ocr-parse)
- SmartImportAI (visual indicator on tile)

**Example:**
```typescript
onBus("FAST_MODE_TOGGLED", ({ enabled }) => {
  console.log(enabled ? "⚡ Fast mode ON" : "⚡ Fast mode OFF");
});
```

---

### 14. **WATCH_ME_WORK** (Optional)
**When:** User clicks "Watch Me Work" tile  
**Payload:**
```typescript
{
  enabled: boolean        // true = show AI team panel
}
```
**Listeners:**
- AI Team panel (opens/closes sidebar)

---

## 🎯 USAGE PATTERNS

### Pattern 1: Simple Listener (One-time)

```typescript
import { onBus } from "@/lib/bus";

export function MyComponent() {
  useEffect(() => {
    const unsubscribe = onBus("PARSE_COMPLETED", ({ previewCount }) => {
      console.log(`Parse done: ${previewCount} rows`);
    });
    return unsubscribe; // Auto cleanup on unmount
  }, []);
}
```

### Pattern 2: Emit Event with Typed Payload

```typescript
import { emitBus } from "@/lib/bus";

const handleClick = () => {
  emitBus("UPLOAD_REQUESTED", { 
    source: "tile",
    accept: [".pdf", ".csv"] 
  });
};
```

### Pattern 3: Error Handling (Centralized)

```typescript
export function ErrorBoundary() {
  useEffect(() => {
    onBus("ERROR", ({ where, message, detail }) => {
      logToAnalytics({ where, message });
      toast.error(message);
    });
  }, []);
}
```

### Pattern 4: Multi-step Orchestration

```typescript
export function SmartImportAI() {
  useEffect(() => {
    const off1 = onBus("UPLOAD_COMPLETED", async ({ fileKey }) => {
      emitBus("PARSE_REQUESTED", { fileKey, fast: fastMode });
    });
    
    const off2 = onBus("PARSE_COMPLETED", async ({ importId }) => {
      emitBus("IMPORT_COMMIT_REQUESTED", { importId });
    });
    
    const off3 = onBus("IMPORT_COMMITTED", async ({ importId }) => {
      emitBus("PRIME_HANDOFF_REQUESTED", { importId });
    });
    
    return () => { off1(); off2(); off3(); };
  }, []);
}
```

---

## 🔄 SMART IMPORT E2E FLOW

```
User clicks tile
  ↓
emitBus("UPLOAD_REQUESTED", ...)
  ↓
StatementUpload opens file picker
  ↓
User selects file
  ↓
StatementUpload uploads to Supabase Storage
  ↓
emitBus("UPLOAD_COMPLETED", { fileKey, mime, bytes })
  ↓
SmartImportAI listens
emitBus("PARSE_REQUESTED", { fileKey, fast })
  ↓
Netlify function processes (byte-ocr-parse)
  ↓
emitBus("PARSE_COMPLETED", { importId, previewCount })
  ↓
SmartImportAI displays preview table
  ↓
User clicks "Approve & Send"
  ↓
emitBus("IMPORT_COMMIT_REQUESTED", { importId })
  ↓
commit-import Netlify function
emitBus("IMPORT_COMMITTED", { importId, transactionCount })
  ↓
emitBus("PRIME_HANDOFF_REQUESTED", { importId })
  ↓
prime-handoff Netlify function
emitBus("PRIME_HANDOFF_SENT", { handoffId, importId })
  ↓
emitBus("CRYSTAL_ANALYZE_REQUESTED", { importId })
  ↓
crystal-analyze-import Netlify function
emitBus("CRYSTAL_ADVICE_READY", { importId, adviceId })
  ↓
SmartImportAI displays advisory card
  ↓
✅ COMPLETE
```

---

## 🧪 TESTING

### Test Listener Registration
```typescript
const handler = jest.fn();
onBus("PARSE_COMPLETED", handler);
emitBus("PARSE_COMPLETED", { importId: "test", previewCount: 5 });
expect(handler).toHaveBeenCalledWith({ importId: "test", previewCount: 5 });
```

### Test Auto-cleanup
```typescript
const handler = jest.fn();
const unsubscribe = onBus("ERROR", handler);
emitBus("ERROR", { where: "TEST", message: "test error" });
expect(handler).toHaveBeenCalled();

unsubscribe();
emitBus("ERROR", { where: "TEST", message: "test error 2" });
expect(handler).toHaveBeenCalledTimes(1); // No second call
```

### Test Error Isolation
```typescript
const handler1 = jest.fn(() => { throw new Error("boom"); });
const handler2 = jest.fn(); // Should still be called
onBus("PARSE_COMPLETED", handler1);
onBus("PARSE_COMPLETED", handler2);

emitBus("PARSE_COMPLETED", { importId: "test", previewCount: 1 });
expect(handler1).toHaveBeenCalled();
expect(handler2).toHaveBeenCalled(); // handler1's error didn't block it
```

---

## 🚨 ERROR HANDLING

### Safe Listener Execution
```typescript
emit<K extends keyof BusEventMap>(event: K, payload: BusEventMap[K]) {
  this.listeners.get(event)?.forEach((fn) => {
    try { 
      (fn as Handler<K>)(payload); 
    } catch (e) { 
      console.error("[bus]", event, e); // Logs but doesn't crash
    }
  });
}
```

**Why?** If one listener throws, others still execute.

### Global Error Bus Event
```typescript
// Anywhere in code:
emitBus("ERROR", {
  where: "BYTE_OCR_PARSE",
  message: "Failed to parse PDF",
  detail: error
});

// Central error handler:
onBus("ERROR", ({ where, message, detail }) => {
  logToSentry({ where, message, detail });
  toast.error(message);
});
```

---

## 💡 BEST PRACTICES

### ✅ DO:
- Use full uppercase event names (`PARSE_COMPLETED`)
- Return unsubscribe function from useEffect
- Handle errors in `ERROR` event
- Import `onBus`, `emitBus` directly (not `bus`)
- Test with typed payloads

### ❌ DON'T:
- Emit events with missing fields
- Subscribe without cleanup
- Ignore ERROR events
- Use camelCase for event names
- Throw in listeners (handle locally)

---

## 📊 COMPARISON: Before vs After

### Before (No Event Bus)
```typescript
// SmartImportAI.tsx
const handleUpload = async (file) => {
  const result = await uploadFile(file);
  setPreviewRows(result.rows);
  // Hard to coordinate multi-step flow
  // Tight coupling between components
};

// StatementUpload.tsx
// Callback hell, prop drilling, etc.
```

### After (With Event Bus)
```typescript
// SmartImportAI.tsx
onBus("PARSE_COMPLETED", ({ previewCount }) => {
  setPreviewRows(...);
});

// StatementUpload.tsx
emitBus("UPLOAD_COMPLETED", { fileKey, mime, bytes });

// Decoupled, testable, clear data flow
```

---

## 🔧 INTEGRATION WITH SMARTIMPORTAI

### SmartImportAI.tsx uses these events:

| Event | Action |
|-------|--------|
| `UPLOAD_REQUESTED` | (emits from tiles) |
| `PARSE_COMPLETED` | Sets preview table |
| `IMPORT_COMMITTED` | Shows commitment toast |
| `PRIME_HANDOFF_SENT` | Proceeds to Crystal |
| `CRYSTAL_ADVICE_READY` | Displays advisory |
| `ERROR` | Shows error toast |
| `FAST_MODE_TOGGLED` | Updates UI state |

---

## 📈 FUTURE ENHANCEMENTS

- Add event filtering (e.g., `onBus(["PARSE_*"], handler)`)
- Add middleware support (logging, analytics)
- Add request/response pattern (currently one-way)
- Add persistence (localStorage for state recovery)

---

## 📝 QUICK REFERENCE CARD

```typescript
import { onBus, emitBus } from "@/lib/bus";

// Listen (returns unsubscribe function)
const off = onBus("PARSE_COMPLETED", (p) => console.log(p));

// Emit (no return)
emitBus("UPLOAD_COMPLETED", { fileKey: "...", mime: "...", bytes: 123 });

// Cleanup
off(); // Stop listening

// Centralized error handling
onBus("ERROR", ({ where, message, detail }) => {
  toast.error(message);
});
```

---

**Status:** ✅ Ready for production  
**File:** `src/lib/bus.ts` (52 lines)  
**Type Safety:** Full (0 `any` types)  
**No Dependencies:** ✅ (React-independent)






