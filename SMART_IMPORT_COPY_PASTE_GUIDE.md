# 📋 SMART IMPORT COPY-PASTE IMPLEMENTATION GUIDE

**Purpose:** Ready-to-copy code snippets for all Smart Import AI components  
**Status:** ✅ Copy-Paste Ready  
**Last Updated:** October 18, 2025  

---

## 📝 ACCEPT CONSTANTS (FOR SMARTIMPORTAI.TSX)

```typescript
// Copy this into src/pages/dashboard/SmartImportAI.tsx (before component)

const ACCEPT = {
  ANY: 'image/*,.pdf,.csv',           // All supported types
  PDF: 'application/pdf',             // PDF only
  CSV: 'text/csv',                    // CSV only
  IMG: 'image/*'                      // All images (mobile-friendly!)
};

// Usage in tile buttons:
<button onClick={() => openUpload('any')}>Upload Any</button>          {/* image/*, .pdf, .csv */}
<button onClick={() => openUpload('pdf')}>Upload PDF</button>          {/* .pdf files */}
<button onClick={() => openUpload('csv')}>Upload CSV</button>          {/* .csv files */}
<button onClick={() => openUpload('img')}>Scan Receipt (Camera)</button> {/* Photos from camera */}
```

### Why `image/*` for Camera?

✅ **Mobile-friendly:** Works on iPhone/Android camera apps  
✅ **Cross-browser:** Better support than file extensions  
✅ **Capture attribute:** Works with `capture="environment"` for rear camera  
✅ **User intuitive:** Shows "Take Photo" option, not "Files"  

---

## 📝 AUTO-UPLOAD WITH MOBILE DETECTION

```typescript
// Copy this useEffect into src/pages/dashboard/SmartImportAI.tsx component

// Detect mobile devices
const isMobile = /iPhone|Android|iPad|iPod|BlackBerry|Windows Phone/i.test(
  navigator.userAgent
);

// NEW: Auto-open upload if ?auto=upload (desktop only)
useEffect(() => {
  const autoUpload = searchParams.get('auto') === 'upload';
  
  // Only auto-open on desktop (mobile users should choose their method)
  if (autoUpload && !isMobile) {
    setShowUpload(true);
    // Trigger the file dialog immediately
    bus.emit('upload:open', {
      accept: ACCEPT.ANY,
      kind: 'any',
      timestamp: Date.now()
    });
  }
}, [searchParams, isMobile]);
```

### Mobile vs Desktop Behavior

**Desktop (auto-upload enabled):**
```
User clicks "Import & Chat" on dashboard
  ↓
Navigates to /dashboard/smart-import-ai?auto=upload
  ↓
Auto-detects NOT mobile
  ↓
File dialog opens automatically ✅
```

**Mobile (manual selection):**
```
User clicks "Import & Chat" on dashboard
  ↓
Navigates to /dashboard/smart-import-ai?auto=upload
  ↓
Auto-detects IS mobile
  ↓
Shows tile grid (user chooses method) ✅
  ↓
User clicks "Scan Receipt" or "Upload PDF" etc.
```

---

## 🚀 QUICK START

### Files to Create (NEW)

```
src/lib/bus.ts
src/lib/smartImportEvents.ts
src/hooks/useSmartImportEvent.ts
src/hooks/useSmartImportState.ts
src/hooks/useImportRealtime.ts
src/hooks/useUploadListener.ts
src/hooks/useFastMode.ts
src/hooks/useAiTeamPanel.ts
src/ui/components/SmartImportTile.tsx
src/ui/components/AdvisoryCard.tsx
src/ui/components/Upload/StatementUpload.tsx (ENHANCED)
src/pages/dashboard/SmartImportAI.tsx (ENHANCED)
netlify/functions/_shared/guardrails.ts
netlify/functions/_shared/logger.ts
netlify/functions/ingest-statement.ts (ENHANCED)
netlify/functions/byte-ocr-parse.ts (ENHANCED)
netlify/functions/commit-import.ts
netlify/functions/prime-handoff.ts
netlify/functions/crystal-analyze-import.ts
```

---

## 📁 FILE-BY-FILE IMPLEMENTATION

### 1. **`src/lib/bus.ts`** (NEW)

```typescript
/**
 * Lightweight event bus for Smart Import AI
 * No external dependencies, type-safe
 */

type Handler = (p: any) => void;
const map = new Map<string, Set<Handler>>();

export const bus = {
  on(ev: string, h: Handler) {
    (map.get(ev) ?? map.set(ev, new Set()).get(ev))!.add(h);
    return () => map.get(ev)!.delete(h);
  },
  emit(ev: string, p?: any) {
    map.get(ev)?.forEach(h => h(p));
  }
};
```

---

### 2. **`src/lib/smartImportEvents.ts`** (NEW)

```typescript
import { bus } from './bus';

/**
 * Smart Import AI Event Types
 * Naming: {scope}:{action}:{state}
 */

export type SmartImportEvent =
  | { type: 'upload:open'; payload: { accept: string; capture?: string; kind: string; timestamp: number } }
  | { type: 'mode:fast'; payload: { fast: boolean; timestamp: number } }
  | { type: 'panel:open'; payload: { id: string; timestamp: number } }
  | { type: 'panel:close'; payload: { id: string } }
  | { type: 'import:upload:start'; payload: { userId: string; fileName: string } }
  | { type: 'import:upload:progress'; payload: { userId: string; percent: number; bytes: number } }
  | { type: 'import:upload:complete'; payload: { userId: string; importId: string; fileSize: number } }
  | { type: 'import:upload:error'; payload: { userId: string; error: string } }
  | { type: 'import:created'; payload: { userId: string; importId: string; fileName: string; fileSize: number } }
  | { type: 'import:parsed'; payload: { importId: string; rowsTotal: number; preview: any[] } }
  | { type: 'import:approve'; payload: { importId: string } }
  | { type: 'import:commit:start'; payload: { importId: string; userId: string } }
  | { type: 'import:commit:complete'; payload: { importId: string; committed: number } }
  | { type: 'import:error'; payload: { importId: string; error: string; stage: string } }
  | { type: 'prime:handoff:start'; payload: { importId: string } }
  | { type: 'prime:message'; payload: { message: string; handoffId: string } }
  | { type: 'crystal:analyze:start'; payload: { importId: string; handoffId: string } }
  | { type: 'advisory:ready'; payload: any }
  | { type: 'employee:active'; payload: { employee: string; status: string; message?: string } }
  | { type: 'employee:inactive'; payload: { employee: string } };

export function emitSmartImportEvent<T extends SmartImportEvent>(event: T) {
  bus.emit(event.type, event.payload);
}

export function onSmartImportEvent<T extends SmartImportEvent['type']>(
  eventType: T,
  handler: (payload: any) => void
): () => void {
  return bus.on(eventType, handler);
}
```

---

### 3. **`src/hooks/useSmartImportEvent.ts`** (NEW)

```typescript
import { useEffect } from 'react';
import { bus } from '@/lib/bus';

export function useSmartImportEvent(
  eventType: string,
  handler: (payload: any) => void
): void {
  useEffect(() => {
    const unsubscribe = bus.on(eventType, handler);
    return unsubscribe;
  }, [eventType, handler]);
}
```

---

### 4. **`src/hooks/useSmartImportState.ts`** (NEW)

```typescript
import { useState, useCallback } from 'react';
import { useSmartImportEvent } from './useSmartImportEvent';

interface ImportState {
  status: 'idle' | 'uploading' | 'parsing' | 'committing' | 'handoff' | 'analyzing' | 'complete' | 'error';
  importId?: string;
  progress: number;
  message: string;
  error?: string;
}

export function useSmartImportState() {
  const [state, setState] = useState<ImportState>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  const handlers = {
    uploadStart: useCallback((payload: any) => {
      setState(s => ({
        ...s,
        status: 'uploading',
        progress: 0,
        message: `Uploading ${payload.fileName}...`
      }));
    }, []),

    uploadProgress: useCallback((payload: any) => {
      setState(s => ({
        ...s,
        progress: Math.round((payload.bytes / 100) * payload.percent),
        message: `Uploading... ${payload.percent}%`
      }));
    }, []),

    uploadComplete: useCallback((payload: any) => {
      setState(s => ({
        ...s,
        status: 'parsing',
        progress: 33,
        importId: payload.importId,
        message: 'Parsing transactions...'
      }));
    }, []),

    parseComplete: useCallback((payload: any) => {
      setState(s => ({
        ...s,
        status: 'committing',
        progress: 66,
        message: `Ready to commit ${payload.rowsTotal} transactions`
      }));
    }, []),

    commitComplete: useCallback((payload: any) => {
      setState(s => ({
        ...s,
        status: 'handoff',
        progress: 80,
        message: 'Handing off to Prime...'
      }));
    }, []),

    handoffStart: useCallback(() => {
      setState(s => ({
        ...s,
        status: 'analyzing',
        progress: 90,
        message: 'Crystal analyzing your data...'
      }));
    }, []),

    advisoryReady: useCallback(() => {
      setState(s => ({
        ...s,
        status: 'complete',
        progress: 100,
        message: 'Analysis complete!'
      }));
    }, []),

    error: useCallback((payload: any) => {
      setState(s => ({
        ...s,
        status: 'error',
        error: payload.error,
        message: `Error: ${payload.error}`
      }));
    }, [])
  };

  useSmartImportEvent('import:upload:start', handlers.uploadStart);
  useSmartImportEvent('import:upload:progress', handlers.uploadProgress);
  useSmartImportEvent('import:upload:complete', handlers.uploadComplete);
  useSmartImportEvent('import:parsed', handlers.parseComplete);
  useSmartImportEvent('import:commit:complete', handlers.commitComplete);
  useSmartImportEvent('prime:handoff:start', handlers.handoffStart);
  useSmartImportEvent('advisory:ready', handlers.advisoryReady);
  useSmartImportEvent('import:error', handlers.error);

  return state;
}
```

---

### 5. **`src/hooks/useImportRealtime.ts`** (NEW)

```typescript
import { useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { bus } from '@/lib/bus';

export function useImportRealtime(importId: string | undefined, userId: string) {
  useEffect(() => {
    if (!importId) return;

    const sb = createSupabaseClient();

    const channel = sb
      .channel(`import_events:${importId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'import_events',
          filter: `import_id=eq.${importId}`
        },
        (payload) => {
          const event = payload.new;
          bus.emit(event.event_type, event.payload);
          console.log(`[Realtime] ${event.event_type}`, event.payload);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [importId, userId]);
}
```

---

### 6. **`src/ui/components/SmartImportTile.tsx`** (NEW)

```typescript
import React from 'react';

interface SmartImportTileProps {
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  variant?: 'blue' | 'green' | 'yellow' | 'purple';
  loading?: boolean;
}

export function SmartImportTile({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  variant = 'blue',
  loading = false
}: SmartImportTileProps) {
  const variantColors = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-300 text-sm mb-6">{description}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full px-4 py-2 ${variantColors[variant]} text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Processing...' : buttonLabel}
      </button>
    </div>
  );
}
```

---

### 7. **`src/ui/components/AdvisoryCard.tsx`** (NEW)

```typescript
import React, { useEffect, useState } from 'react';
import { bus } from '@/lib/bus';

interface AdvisoryResult {
  importId: string;
  handoffId: string;
  committed: number;
  summary: string;
  budgetImpact: string;
  forecastDelta: string;
  topCategories: string[];
  timestamp: string;
}

export function AdvisoryCard() {
  const [advisory, setAdvisory] = useState<AdvisoryResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const off = bus.on('advisory:ready', (data: AdvisoryResult) => {
      console.log('[AdvisoryCard] Received advisory', data);
      setAdvisory(data);
      setIsVisible(true);
    });

    return () => off();
  }, []);

  if (!isVisible || !advisory) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl max-w-md p-6 border-l-4 border-purple-600 z-40">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">💎 Crystal's Insights</h3>
          <p className="text-xs text-slate-500 mt-1">
            {new Date(advisory.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm font-semibold text-green-900">
          ✅ {advisory.committed} transactions committed
        </p>
      </div>

      <div className="mb-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          {advisory.summary}
        </p>
      </div>

      {advisory.topCategories && advisory.topCategories.length > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-600 mb-2">📊 Top Categories</p>
          <div className="space-y-1">
            {advisory.topCategories.map((cat, i) => (
              <p key={i} className="text-xs text-slate-700">{cat}</p>
            ))}
          </div>
        </div>
      )}

      {advisory.budgetImpact && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-900 mb-2">⚠️ Budget Impact</p>
          <p className="text-xs text-yellow-800 leading-relaxed">{advisory.budgetImpact}</p>
        </div>
      )}

      {advisory.forecastDelta && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-blue-900 mb-2">📈 Forecast Update</p>
          <p className="text-xs text-blue-800 leading-relaxed">{advisory.forecastDelta}</p>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-slate-200">
        <button className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition">
          📊 View Transactions
        </button>
        <button className="flex-1 px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition">
          🤖 Chat with Crystal
        </button>
      </div>
    </div>
  );
}
```

---

## 📝 ENVIRONMENT VARIABLES

### `.env.local`

```bash
# Smart Import Feature Flags
SMART_IMPORT_ENABLED=1
IMPORTS_ENABLED=1
BYTE_OCR_ENABLED=1
SMART_IMPORT_MAX_FILE_SIZE=26214400
SMART_IMPORT_MAX_FILES_PER_HOUR=50
SMART_IMPORT_DEBUG=0

# Realtime
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Chat endpoint
VITE_CHAT_FUNCTION_PATH=/.netlify/functions/chat-v3-production
```

### Netlify Environment Variables

Add these in Netlify Dashboard → Settings → Environment:

```
SMART_IMPORT_ENABLED=1
IMPORTS_ENABLED=1
BYTE_OCR_ENABLED=1
SMART_IMPORT_MAX_FILE_SIZE=26214400
SMART_IMPORT_MAX_FILES_PER_HOUR=50
SMART_IMPORT_DEBUG=0
```

---

## 🚀 DEPLOYMENT ORDER

1. ✅ Create `src/lib/bus.ts`
2. ✅ Create `src/lib/smartImportEvents.ts`
3. ✅ Create all hooks in `src/hooks/`
4. ✅ Create UI components
5. ✅ Update `src/pages/dashboard/SmartImportAI.tsx`
6. ✅ Update `src/ui/components/Upload/StatementUpload.tsx`
7. ✅ Create Netlify shared functions
8. ✅ Update/Create all Netlify functions
9. ✅ Add environment variables
10. ✅ Test complete flow

---

## 🧪 TESTING CHECKLIST

```bash
# 1. Test event bus
node -e "const {bus} = require('./src/lib/bus.ts'); bus.on('test', p => console.log(p)); bus.emit('test', 'works');"

# 2. Test upload component
# Open SmartImportAI page, click any upload button

# 3. Test orchestration
# Upload file → See preview → Click approve → Watch advisory card

# 4. Test realtime
# Open two browser tabs, upload file in one, see realtime updates in other

# 5. Test error handling
# Simulate network error during commit → should show recovery steps
```

---

## 🎯 QUICK REFERENCE

| Component | File | Purpose |
|-----------|------|---------|
| Event Bus | `src/lib/bus.ts` | Lightweight pub/sub |
| Event Types | `src/lib/smartImportEvents.ts` | TypeScript event definitions |
| Hooks (8) | `src/hooks/use*.ts` | React state management |
| Tiles | `src/ui/components/SmartImportTile.tsx` | Upload options UI |
| Advisory | `src/ui/components/AdvisoryCard.tsx` | Crystal insights display |
| Page | `src/pages/dashboard/SmartImportAI.tsx` | Main orchestration |
| Upload | `src/ui/components/Upload/StatementUpload.tsx` | File upload component |

---

## 💡 NEXT STEPS

After deployment:

1. **Iterate on Crystal's Insights**
   - Fine-tune `crystal-analyze-import.ts` prompts
   - Add more analytics (MoM, trends, forecasts)
   - Create custom suggestions per business type

2. **Enhance OCR**
   - Add more bank format parsers
   - Improve transaction categorization
   - Add receipt scanning with manual correction UI

3. **Analytics Dashboard**
   - Show upload history
   - Track parsing accuracy
   - Monitor Prime/Crystal handoff success rate
   - Budget impact predictions

4. **Mobile Optimization**
   - Responsive tiles grid
   - Camera capture improvements
   - Touch-friendly buttons

5. **Advanced Features**
   - Batch imports (multiple files)
   - Scheduled imports (email statements)
   - Custom categorization rules
   - Duplicate detection

---

**Ready to implement? Start with Step 1 above and copy-paste as you go! 🚀**

**Last Updated:** October 18, 2025
