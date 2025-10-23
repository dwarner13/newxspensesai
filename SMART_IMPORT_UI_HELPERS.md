# 🎛️ SMART IMPORT AI UI HELPERS & MODAL CONTROLS

**Purpose:** Event-driven UI helpers for Smart Import AI page interactions  
**Status:** ✅ Production-Ready  
**Pattern:** Command Pattern + Event Bus  

---

## 📋 OVERVIEW

### Helper Functions Architecture

```typescript
// src/pages/dashboard/SmartImportAI.tsx

import { bus } from '@/lib/bus';
import { useNavigate, useSearchParams } from 'react-router-dom';

// 1. FILE TYPE CONSTANTS
const ACCEPT = {
  ANY: '.pdf,.csv,.png,.jpg,.jpeg',
  PDF: '.pdf',
  CSV: '.csv',
  IMG: '.png,.jpg,.jpeg'
};

// 2. COMMAND FUNCTIONS (emit events)
function openUpload(kind: 'any' | 'pdf' | 'csv' | 'img') { ... }
function startFastProcessing() { ... }
function openAiTeamPanel() { ... }

// 3. COMPONENT (use helpers)
export default function SmartImportAI() { ... }
```

**Key Benefits:**
- ✅ Centralized event emitters
- ✅ Type-safe upload kinds
- ✅ Mobile-friendly (camera capture)
- ✅ Server-side mode flags
- ✅ Modal/panel management
- ✅ Clear separation of concerns

---

## 🎯 HELPER FUNCTIONS

### 1. `openUpload(kind)`

Opens the file upload dialog with specific MIME types and capture modes.

```typescript
/**
 * Open file upload dialog with specific file type filter
 * 
 * @param kind - 'any' | 'pdf' | 'csv' | 'img'
 * 
 * Usage:
 *   openUpload('pdf')      // Only .pdf files
 *   openUpload('csv')      // Only .csv files
 *   openUpload('img')      // Only images, with camera option on mobile
 *   openUpload('any')      // All supported types
 */
function openUpload(kind: 'any' | 'pdf' | 'csv' | 'img') {
  const acceptMap = {
    any: ACCEPT.ANY,
    pdf: ACCEPT.PDF,
    csv: ACCEPT.CSV,
    img: ACCEPT.IMG
  };

  const capture = kind === 'img' ? 'environment' : undefined;

  bus.emit('upload:open', {
    accept: acceptMap[kind],
    capture,
    kind,
    timestamp: Date.now()
  });
}
```

**Events Emitted:**
```typescript
bus.emit('upload:open', {
  accept: string;           // MIME types or file extensions
  capture?: string;         // 'environment' for rear camera (mobile)
  kind: string;             // 'pdf' | 'csv' | 'img' | 'any'
  timestamp: number;        // When the dialog was opened
});
```

**Usage Examples:**
```typescript
// Button in UI
<button onClick={() => openUpload('pdf')}>
  Upload Bank Statement
</button>

<button onClick={() => openUpload('img')}>
  Scan Receipt (Camera)
</button>

<button onClick={() => openUpload('csv')}>
  Import CSV
</button>

<button onClick={() => openUpload('any')}>
  Any File Type
</button>
```

---

### 2. `startFastProcessing()`

Toggles fast processing mode for server-side optimization.

```typescript
/**
 * Start fast processing mode
 * 
 * This tells the server to prioritize speed over accuracy:
 * - Skip expensive OCR fallbacks
 * - Use cached models
 * - Reduce verification steps
 * - Focus on common bank formats
 * 
 * Usage:
 *   startFastProcessing();
 */
function startFastProcessing() {
  bus.emit('mode:fast', {
    fast: true,
    timestamp: Date.now()
  });
}
```

**Events Emitted:**
```typescript
bus.emit('mode:fast', {
  fast: boolean;            // true = fast mode enabled
  timestamp: number;        // When mode was activated
});
```

**Server-Side Handling:**
```typescript
// netlify/functions/byte-ocr-parse.ts
const fastMode = context.fastMode === true;

if (fastMode) {
  // Skip expensive operations
  // Use model caching
  // Optimize for speed
  const TIMEOUT_MS = 5000; // Strict timeout
} else {
  // Full accuracy processing
  const TIMEOUT_MS = 30000; // Relaxed timeout
}
```

**Usage Examples:**
```typescript
// For users in a hurry
<button onClick={startFastProcessing} className="button-urgent">
  ⚡ Fast Processing (Quick & Dirty)
</button>

// For high-volume imports
<button onClick={startFastProcessing}>
  Process 100+ Files
</button>
```

---

### 3. `openAiTeamPanel()`

Opens the AI Team sidebar showing active employees and their status.

```typescript
/**
 * Open AI Team panel to show active employees
 * 
 * Displays:
 * - Prime (CEO/Orchestrator) — Always visible
 * - Crystal (Financial Intelligence) — When analyzing
 * - Byte (OCR/Document Processing) — When parsing
 * - Tag (Categorization) — When categorizing
 * - Others (as they become active)
 * 
 * Usage:
 *   openAiTeamPanel();
 */
function openAiTeamPanel() {
  bus.emit('panel:open', {
    id: 'ai-team',
    timestamp: Date.now()
  });
}
```

**Events Emitted:**
```typescript
bus.emit('panel:open', {
  id: 'ai-team';             // Panel identifier
  timestamp: number;         // When panel was opened
});
```

**Related Events (Panel Listeners):**
```typescript
// Panel opens/closes
bus.on('panel:open', (payload) => {
  // Show AI Team panel
});

bus.on('panel:close', (payload) => {
  // Hide AI Team panel
});

// AI employees become active/inactive
bus.on('employee:active', (payload) => {
  // payload = { employee: 'crystal-analytics', status: 'analyzing' }
});

bus.on('employee:inactive', (payload) => {
  // payload = { employee: 'crystal-analytics' }
});
```

**Usage Examples:**
```typescript
// Button in Smart Import hub
<button onClick={openAiTeamPanel} className="button-secondary">
  👥 Watch Me Work
</button>

// On Smart Import completion
function onImportComplete() {
  // Show the team that just worked
  openAiTeamPanel();
}
```

---

## 💻 UI HUB COMPONENT

### SmartImportAI Page Structure

```typescript
// src/pages/dashboard/SmartImportAI.tsx
import React, { useState, useEffect } from 'react';
import { bus } from '@/lib/bus';
import { useSmartImportState, useImportRealtime } from '@/hooks';
import { StatementUpload } from '@/ui/components/Upload/StatementUpload';

// ============================================================================
// HELPER FUNCTIONS (Top-level, before component)
// ============================================================================

const ACCEPT = {
  ANY: '.pdf,.csv,.png,.jpg,.jpeg',
  PDF: '.pdf',
  CSV: '.csv',
  IMG: '.png,.jpg,.jpeg'
};

function openUpload(kind: 'any' | 'pdf' | 'csv' | 'img') {
  const acceptMap = {
    any: ACCEPT.ANY,
    pdf: ACCEPT.PDF,
    csv: ACCEPT.CSV,
    img: ACCEPT.IMG
  };

  bus.emit('upload:open', {
    accept: acceptMap[kind],
    capture: kind === 'img' ? 'environment' : undefined,
    kind,
    timestamp: Date.now()
  });
}

function startFastProcessing() {
  bus.emit('mode:fast', {
    fast: true,
    timestamp: Date.now()
  });
}

function openAiTeamPanel() {
  bus.emit('panel:open', {
    id: 'ai-team',
    timestamp: Date.now()
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SmartImportAI() {
  const { userId } = useAuthContext();
  const [importId, setImportId] = useState<string | undefined>();
  const [showUpload, setShowUpload] = useState(false);
  const state = useSmartImportState();

  useImportRealtime(importId, userId);

  useEffect(() => {
    // Listen for upload dialog trigger
    const unsubscribe = bus.on('upload:open', (payload) => {
      setShowUpload(true);
      // Pass file type hint to upload component
    });
    return unsubscribe;
  }, []);

  const handleUploadComplete = (importData: any) => {
    setImportId(importData.id);
    setShowUpload(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      {/* HEADER */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Smart Import AI</h1>
        <p className="text-slate-300">Upload receipts, bank statements, or transaction data</p>
      </div>

      {/* STATUS SECTION */}
      {state.status !== 'idle' && (
        <div className="mb-8">
          <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white font-semibold">{state.message}</span>
              <span className="text-slate-300 text-sm">{state.progress}%</span>
            </div>
            <progress
              value={state.progress}
              max={100}
              className="w-full h-2 rounded-full accent-blue-500"
            />
          </div>
        </div>
      )}

      {/* ERROR SECTION */}
      {state.error && (
        <div className="mb-8 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-6 text-red-200">
          <p className="font-semibold mb-2">Import Failed</p>
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {/* TILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* TILE: Any File */}
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
          <div className="text-3xl mb-3">📁</div>
          <h3 className="text-white font-semibold mb-2">Any Document</h3>
          <p className="text-slate-300 text-sm mb-4">
            Upload PDF, CSV, or images
          </p>
          <button
            onClick={() => openUpload('any')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Upload
          </button>
        </div>

        {/* TILE: Bank Statement */}
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
          <div className="text-3xl mb-3">🏦</div>
          <h3 className="text-white font-semibold mb-2">Bank Statement</h3>
          <p className="text-slate-300 text-sm mb-4">
            Import PDF or CSV bank exports
          </p>
          <button
            onClick={() => openUpload('pdf')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Upload PDF
          </button>
        </div>

        {/* TILE: Receipt */}
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
          <div className="text-3xl mb-3">📸</div>
          <h3 className="text-white font-semibold mb-2">Scan Receipt</h3>
          <p className="text-slate-300 text-sm mb-4">
            Take a photo of receipts using your camera
          </p>
          <button
            onClick={() => openUpload('img')}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            📷 Camera
          </button>
        </div>

        {/* TILE: CSV Import */}
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="text-white font-semibold mb-2">CSV Import</h3>
          <p className="text-slate-300 text-sm mb-4">
            Bulk import transactions from CSV
          </p>
          <button
            onClick={() => openUpload('csv')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Upload CSV
          </button>
        </div>

        {/* TILE: Fast Processing */}
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="text-white font-semibold mb-2">Fast Mode</h3>
          <p className="text-slate-300 text-sm mb-4">
            Prioritize speed for large batches
          </p>
          <button
            onClick={startFastProcessing}
            className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
          >
            Enable
          </button>
        </div>

        {/* TILE: AI Team */}
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6 hover:bg-opacity-20 transition border border-white border-opacity-20">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="text-white font-semibold mb-2">AI Team</h3>
          <p className="text-slate-300 text-sm mb-4">
            Watch Prime, Crystal, and Byte work
          </p>
          <button
            onClick={openAiTeamPanel}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            View Team
          </button>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Upload File</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <StatementUpload
                userId={userId}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 TILE CARD COMPONENT

### Reusable Tile Component

```typescript
// src/ui/components/SmartImportTile.tsx
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

**Usage:**
```typescript
<SmartImportTile
  icon="🏦"
  title="Bank Statement"
  description="Import PDF or CSV bank exports"
  buttonLabel="Upload PDF"
  onClick={() => openUpload('pdf')}
  variant="blue"
/>

<SmartImportTile
  icon="📸"
  title="Scan Receipt"
  description="Take a photo of receipts"
  buttonLabel="📷 Camera"
  onClick={() => openUpload('img')}
  variant="green"
/>
```

---

## 🔧 UPLOAD LISTENER HOOK

### Hook to Handle Upload Events

```typescript
// src/hooks/useUploadListener.ts
import { useEffect, useState } from 'react';
import { bus } from '@/lib/bus';

interface UploadConfig {
  accept: string;
  capture?: string;
  kind: 'pdf' | 'csv' | 'img' | 'any';
}

/**
 * Hook to listen for upload:open events and handle them
 * 
 * Usage:
 *   const { config, isOpen, close } = useUploadListener();
 *   if (isOpen) return <UploadModal config={config} onClose={close} />;
 */
export function useUploadListener() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<UploadConfig | null>(null);

  useEffect(() => {
    const unsubscribe = bus.on('upload:open', (payload: UploadConfig) => {
      setConfig(payload);
      setIsOpen(true);
    });
    return unsubscribe;
  }, []);

  const close = () => {
    setIsOpen(false);
    setConfig(null);
  };

  return { isOpen, config, close };
}
```

---

## ⚡ FAST MODE HOOK

### Hook to Handle Fast Processing Mode

```typescript
// src/hooks/useFastMode.ts
import { useEffect, useState } from 'react';
import { bus } from '@/lib/bus';

/**
 * Hook to track fast processing mode
 * 
 * Usage:
 *   const fastMode = useFastMode();
 *   if (fastMode) showBadge('Fast Processing');
 */
export function useFastMode() {
  const [fastMode, setFastMode] = useState(false);

  useEffect(() => {
    const unsubscribe = bus.on('mode:fast', (payload) => {
      setFastMode(payload.fast);
      
      // Auto-disable after 5 minutes
      setTimeout(() => {
        setFastMode(false);
      }, 5 * 60 * 1000);
    });

    return unsubscribe;
  }, []);

  return fastMode;
}
```

---

## 👥 AI TEAM PANEL HOOK

### Hook to Handle Panel Opens

```typescript
// src/hooks/useAiTeamPanel.ts
import { useEffect, useState } from 'react';
import { bus } from '@/lib/bus';

interface AiTeamStatus {
  [employee: string]: {
    status: 'idle' | 'active' | 'analyzing';
    lastSeen: Date;
    message?: string;
  };
}

/**
 * Hook to track AI Team panel state and employee status
 * 
 * Usage:
 *   const { isPanelOpen, employees } = useAiTeamPanel();
 *   if (isPanelOpen) return <AiTeamPanel employees={employees} />;
 */
export function useAiTeamPanel() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [employees, setEmployees] = useState<AiTeamStatus>({});

  useEffect(() => {
    // Panel open/close
    const unsubOpen = bus.on('panel:open', (payload) => {
      if (payload.id === 'ai-team') {
        setIsPanelOpen(true);
      }
    });

    const unsubClose = bus.on('panel:close', (payload) => {
      if (payload.id === 'ai-team') {
        setIsPanelOpen(false);
      }
    });

    // Employee status changes
    const unsubActive = bus.on('employee:active', (payload) => {
      setEmployees(prev => ({
        ...prev,
        [payload.employee]: {
          status: payload.status || 'active',
          lastSeen: new Date(),
          message: payload.message
        }
      }));
    });

    const unsubInactive = bus.on('employee:inactive', (payload) => {
      setEmployees(prev => {
        const updated = { ...prev };
        delete updated[payload.employee];
        return updated;
      });
    });

    return () => {
      unsubOpen();
      unsubClose();
      unsubActive();
      unsubInactive();
    };
  }, []);

  const closePanel = () => {
    bus.emit('panel:close', { id: 'ai-team' });
    setIsPanelOpen(false);
  };

  return { isPanelOpen, employees, closePanel };
}
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Create `ACCEPT` constants in `SmartImportAI.tsx`
- [ ] Create `openUpload()` helper function
- [ ] Create `startFastProcessing()` helper function
- [ ] Create `openAiTeamPanel()` helper function
- [ ] Create `SmartImportTile` component
- [ ] Create `useUploadListener` hook
- [ ] Create `useFastMode` hook
- [ ] Create `useAiTeamPanel` hook
- [ ] Add tiles to `SmartImportAI` page
- [ ] Connect upload button to modal
- [ ] Test all file type filters
- [ ] Test camera capture on mobile
- [ ] Test fast mode toggle
- [ ] Test AI Team panel open/close
- [ ] Verify events are emitted correctly
- [ ] Add analytics tracking for button clicks

---

## 🎯 EVENT SUMMARY TABLE

| Event | Purpose | Payload | Listeners |
|-------|---------|---------|-----------|
| `upload:open` | Open file dialog | `{ accept, capture?, kind, timestamp }` | Upload component |
| `mode:fast` | Enable fast processing | `{ fast, timestamp }` | Server-side + UI badge |
| `panel:open` | Open AI Team panel | `{ id: 'ai-team', timestamp }` | Panel component |
| `panel:close` | Close AI Team panel | `{ id: 'ai-team' }` | Panel component |
| `employee:active` | Employee started working | `{ employee, status?, message? }` | AI Team badge |
| `employee:inactive` | Employee stopped working | `{ employee }` | AI Team badge |

---

## 🔗 RELATED GUIDES

- [`SMART_IMPORT_EVENT_BUS.md`](./SMART_IMPORT_EVENT_BUS.md) — Event bus architecture
- [`BYTE_OCR_TWO_STAGE_COMMIT.md`](./BYTE_OCR_TWO_STAGE_COMMIT.md) — Two-stage pipeline
- [`SMART_IMPORT_GUARDRAILS_LOGGING.md`](./SMART_IMPORT_GUARDRAILS_LOGGING.md) — Security & logging

---

## 🎯 SUMMARY

✅ **Helper Functions:** Centralized, type-safe commands  
✅ **Event-Driven:** All interactions via event bus  
✅ **Mobile-Ready:** Camera capture for receipts  
✅ **Performance:** Fast mode for bulk processing  
✅ **Visibility:** AI Team panel shows active employees  
✅ **Reusable:** Tile components and custom hooks  

**Files:**
- `src/pages/dashboard/SmartImportAI.tsx` (main page)
- `src/ui/components/SmartImportTile.tsx` (tile component)
- `src/hooks/useUploadListener.ts` (upload hook)
- `src/hooks/useFastMode.ts` (fast mode hook)
- `src/hooks/useAiTeamPanel.ts` (panel hook)

---

**Last Updated:** October 18, 2025





