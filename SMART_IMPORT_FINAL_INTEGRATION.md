# 🎯 SMART IMPORT FINAL INTEGRATION GUIDE

**Purpose:** Complete integration of all Smart Import AI components  
**Status:** ✅ Ready for Production  
**Last Updated:** October 18, 2025  

---

## 📋 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│ DASHBOARDLAYOUT (Layout-level)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  StatementUpload (hidden)                              │
│    └─ Listens to: bus.emit('upload:open', {...})      │
│    └─ Emits when done: bus.emit('import:created', {}) │
│    └─ Triggers: navigate() + toast()                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         ↑
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   MobileNavBar    SmartImportCard   SmartImportAI
   "Import" btn    "Import & Chat"   Page Init
   emit upload:    emit upload:      listen import:
   open            open              created
   
   Then nav        Then nav          Then parse
   to page         to page           & show preview
```

---

## 🔧 COMPLETE FILE IMPLEMENTATIONS

### 1. **`src/layouts/DashboardLayout.tsx`** (ROOT UPLOADER)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { StatementUpload } from '@/ui/components/Upload/StatementUpload';
import { bus } from '@/lib/bus';
import { toast } from '@/lib/toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useAuthContext();
  const navigate = useNavigate();

  const handleUploadComplete = (importData: any) => {
    try {
      console.log('[GlobalUploader] Upload complete', { importId: importData.id });

      // 1. Emit event (SmartImportAI page will hear it)
      bus.emit('import:created', {
        userId,
        importId: importData.id,
        fileName: importData.fileName || 'Unknown',
        fileSize: importData.fileSize || 0
      });

      // 2. Show feedback
      toast.info('Parsing your file…');

      // 3. Navigate to processing page
      navigate('/dashboard/smart-import-ai');
    } catch (err: any) {
      console.error('[GlobalUploader] Error handling upload:', err);
      toast.error('Failed to process upload');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER + SIDEBAR + MAIN */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* GLOBAL HIDDEN UPLOADER */}
      {/* Always mounted but invisible. Triggered by any "Import" button via event bus */}
      <div className="hidden">
        <StatementUpload
          userId={userId}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
}
```

---

### 2. **`src/ui/nav/MobileNavBar.tsx`** (MOBILE IMPORT)

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { bus } from '@/lib/bus';

export function MobileNavBar() {
  const navigate = useNavigate();

  const goDashboard = () => navigate('/dashboard');
  const goPrime = () => navigate('/dashboard/prime');
  const goAlerts = () => navigate('/dashboard'); // TODO: implement alerts
  
  const openImport = () => {
    // Open file picker (desktop) or camera (mobile with image/*)
    // Use mixed accept: PDFs + CSVs + images
    bus.emit('upload:open', {
      accept: '.pdf,.csv,image/*',
      capture: undefined  // Let StatementUpload handle capture logic
    });
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-slate-900/95 border-t border-slate-800">
      <div className="grid grid-cols-5 text-center text-slate-200 text-xs pb-safe">
        <button onClick={goDashboard} className="py-3 focus:outline-none hover:bg-slate-800">
          📊 Dashboard
        </button>
        <button onClick={openImport} className="py-3 focus:outline-none hover:bg-slate-800 font-semibold">
          📤 Import
        </button>
        <button className="py-3 opacity-50 cursor-not-allowed">
          🎙️ Podcast
        </button>
        <button onClick={goPrime} className="py-3 focus:outline-none hover:bg-slate-800">
          👑 Prime
        </button>
        <button onClick={goAlerts} className="py-3 focus:outline-none hover:bg-slate-800">
          🔔 Alerts
        </button>
      </div>
    </nav>
  );
}
```

---

### 3. **`src/pages/dashboard/SmartImportAI.tsx`** (LISTENER PAGE)

```typescript
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bus } from '@/lib/bus';
import { useSmartImportState, useImportRealtime } from '@/hooks';
import { StatementUpload } from '@/ui/components/Upload/StatementUpload';
import { SmartImportTile } from '@/ui/components/SmartImportTile';
import { AdvisoryCard } from '@/ui/components/AdvisoryCard';
import { useAuthContext } from '@/contexts/AuthContext';

const ACCEPT = {
  ANY: '.pdf,.csv,.png,.jpg,.jpeg',
  PDF: '.pdf',
  CSV: '.csv',
  IMG: 'image/*'
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

export default function SmartImportAI() {
  const { userId } = useAuthContext();
  const [searchParams] = useSearchParams();

  const [importId, setImportId] = useState<string | undefined>();
  const [showUpload, setShowUpload] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const state = useSmartImportState();
  useImportRealtime(importId, userId);

  // ============================================================
  // LISTEN FOR GLOBAL UPLOADER COMPLETION
  // ============================================================
  // When StatementUpload in DashboardLayout finishes,
  // it emits import:created. We catch it here and start parse.
  useEffect(() => {
    const off = bus.on('import:created', async ({ importId: newImportId, userId: createdBy }: any) => {
      // Validate ownership
      if (createdBy !== userId) {
        console.warn('[SmartImportAI] Ignoring import from different user');
        return;
      }

      console.log('[SmartImportAI] Received import:created event', { importId: newImportId });
      setImportId(newImportId);
      setIsPolling(true);

      try {
        // Fetch preview from OCR parse function
        const res = await fetch('/.netlify/functions/byte-ocr-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            importId: newImportId,
            preview: true  // Request preview only
          })
        }).then(r => r.json()).catch(() => ({}));

        // Emit event for global state (if you have a global event listener)
        bus.emit('import:parsed', {
          importId: newImportId,
          rowsTotal: res.rowsParsed || 0,
          preview: res.preview || []
        });

        setParsedPreview(res.preview || []);
      } catch (err: any) {
        console.error('[SmartImportAI] Parse error:', err);
        bus.emit('import:parse:error', {
          importId: newImportId,
          error: err.message
        });
      } finally {
        setIsPolling(false);
      }
    });

    return () => off();
  }, [userId]);

  // ============================================================
  // AUTO-OPEN UPLOAD ON DESKTOP (IF ?auto=upload)
  // ============================================================
  useEffect(() => {
    const isMobile = /iPhone|Android|iPad/i.test(navigator.userAgent);
    const autoUpload = searchParams.get('auto') === 'upload';

    // Only auto-open on desktop (mobile users should use tiles)
    if (autoUpload && !isMobile) {
      setShowUpload(true);
      bus.emit('upload:open', {
        accept: ACCEPT.ANY,
        kind: 'any',
        timestamp: Date.now()
      });
    }
  }, [searchParams]);

  const handleUploadComplete = (importData: any) => {
    setImportId(importData.id);
    setShowUpload(false);
  };

  const handleApproveCommit = async () => {
    if (!importId) return;

    bus.emit('import:approve', { importId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8 pb-24">
      {/* HEADER */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Smart Import AI</h1>
        <p className="text-slate-300">
          Upload receipts, statements, or transactions. Prime & Crystal will analyze.
        </p>
      </div>

      {/* STATUS PROGRESS */}
      {state.status !== 'idle' && (
        <div className="mb-8">
          <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur border border-white border-opacity-20">
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

      {/* ERROR STATE */}
      {state.error && (
        <div className="mb-8 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-6 text-red-200">
          <p className="font-semibold mb-2">❌ Import Failed</p>
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {/* TILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <SmartImportTile
          icon="📁"
          title="Any Document"
          description="Upload PDF, CSV, or images"
          buttonLabel="Upload"
          onClick={() => openUpload('any')}
          variant="blue"
        />
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
        <SmartImportTile
          icon="📊"
          title="CSV Import"
          description="Bulk import transactions"
          buttonLabel="Upload CSV"
          onClick={() => openUpload('csv')}
          variant="blue"
        />
        <SmartImportTile
          icon="⚡"
          title="Fast Mode"
          description="Prioritize speed"
          buttonLabel="Enable"
          onClick={() => bus.emit('mode:fast', { fast: true, timestamp: Date.now() })}
          variant="yellow"
          loading={isPolling}
        />
        <SmartImportTile
          icon="👥"
          title="AI Team"
          description="Watch Prime & Crystal"
          buttonLabel="View Team"
          onClick={() => bus.emit('panel:open', { id: 'ai-team', timestamp: Date.now() })}
          variant="purple"
        />
      </div>

      {/* PREVIEW TABLE */}
      {state.status === 'committing' && parsedPreview.length > 0 && (
        <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Preview: {parsedPreview.length} Transactions
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-semibold text-slate-700">Date</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Merchant</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Category</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedPreview.slice(0, 10).map((tx, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-slate-600">{tx.posted_at}</td>
                    <td className="p-3 text-slate-900 font-medium">{tx.merchant}</td>
                    <td className="p-3 text-slate-600">{tx.category || '—'}</td>
                    <td className="p-3 text-right text-slate-900">${tx.amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleApproveCommit}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            ✅ Approve & Commit ({parsedPreview.length} transactions)
          </button>
        </div>
      )}

      {/* UPLOAD MODAL (DESKTOP FALLBACK) */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
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

      {/* ADVISORY CARD (FLOATS BOTTOM-RIGHT) */}
      <AdvisoryCard />
    </div>
  );
}
```

---

### 4. **`src/components/dashboard/SmartImportOverviewCard.tsx`** (DASHBOARD CARD)

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { bus } from '@/lib/bus';

export function SmartImportOverviewCard() {
  const navigate = useNavigate();

  const handleImportClick = () => {
    // Navigate first (ensures page is ready)
    navigate('/dashboard/smart-import-ai');

    // Small delay to let React render the page
    setTimeout(() => {
      // Then trigger the global uploader
      bus.emit('upload:open', {
        accept: '.pdf,.csv,image/*',
        capture: undefined,
        kind: 'any',
        timestamp: Date.now()
      });
    }, 80);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            📊 Smart Import AI
          </h3>
          <p className="text-sm text-slate-600">
            Upload statements, receipts, and transactions
          </p>
        </div>
        <span className="text-2xl">✨</span>
      </div>

      <div className="mb-4 p-3 bg-white rounded-lg">
        <div className="text-sm text-slate-700 space-y-1">
          <p>✅ Byte OCR: Instant parsing</p>
          <p>✅ Prime: Smart acknowledgment</p>
          <p>✅ Crystal: Deep financial insights</p>
        </div>
      </div>

      <button
        onClick={handleImportClick}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
      >
        📁 Import & Chat
      </button>
    </div>
  );
}
```

---

## 🔄 COMPLETE EVENT FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS "IMPORT" BUTTON                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Option 1: MobileNavBar "Import"                            │
│   → bus.emit('upload:open', { accept: '...' })            │
│                                                             │
│ Option 2: SmartImportOverviewCard "Import & Chat"          │
│   → navigate('/dashboard/smart-import-ai')                 │
│   → setTimeout(() => bus.emit('upload:open', {...}))      │
│                                                             │
│ Option 3: SmartImportAI Tile "Upload PDF"                  │
│   → openUpload('pdf')                                      │
│   → bus.emit('upload:open', { accept: '.pdf' })           │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STATEMENTUPLOAD (in DashboardLayout) HEARS EVENT            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ useEffect listener catches 'upload:open'                   │
│ setAccept(accept)                                          │
│ setCapture(capture)                                        │
│ fileInputRef.current?.click()  ← Opens file picker         │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ USER SELECTS FILE                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ File picker opens (desktop) or camera (mobile + image/*)   │
│ User selects file or takes photo                           │
│ handleFile() executes                                      │
│ File uploads to ingest-statement                           │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ UPLOAD COMPLETE - CALLBACK FIRES                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ onUploadComplete(importData) in DashboardLayout             │
│                                                             │
│ 1. bus.emit('import:created', {importId, userId})         │
│ 2. toast.info('Parsing your file…')                        │
│ 3. navigate('/dashboard/smart-import-ai')                  │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ SMARTIMPORTAI PAGE RECEIVES EVENT                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ useEffect listener catches 'import:created'                │
│ setImportId(importId)                                      │
│ Calls byte-ocr-parse with preview:true                     │
│ setParsedPreview(res.preview)                              │
│                                                             │
│ Shows parsed preview table                                 │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS "APPROVE & COMMIT"                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ bus.emit('import:approve', {importId})                     │
│                                                             │
│ Orchestration chain:                                        │
│   1. commit-import → commits rows to DB                    │
│   2. prime-handoff → creates handoff record                │
│   3. crystal-analyze → generates insights                  │
│   4. advisory:ready → shows results card                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        ↓
     COMPLETE! ✅
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] DashboardLayout has StatementUpload in hidden div
- [ ] MobileNavBar has "Import" button that emits upload:open
- [ ] SmartImportOverviewCard has "Import & Chat" button
- [ ] SmartImportAI page has import:created listener
- [ ] SmartImportAI page has auto-open logic for desktop
- [ ] SmartImportAI page has tile buttons that work
- [ ] Test from sidebar → should open file picker
- [ ] Test from mobile nav → should work on mobile
- [ ] Test from dashboard card → should navigate then upload
- [ ] Test from tiles → should filter file type correctly
- [ ] Test desktop PDF upload → should show preview
- [ ] Test mobile camera → should open camera app
- [ ] Test complete flow → orchestration runs
- [ ] Test advisory card → shows results

---

## 🎯 SUMMARY

✅ **Global Uploader:** Mounted in DashboardLayout, available everywhere  
✅ **Event-Driven:** Components coordinate via event bus  
✅ **Mobile-Ready:** MobileNavBar with Import button  
✅ **Desktop-Ready:** SmartImportOverviewCard for quick access  
✅ **Auto-Navigation:** Smart routing from card to page  
✅ **Seamless UX:** File picker → navigate → parse → preview → commit  

**Key Files:**
- `src/layouts/DashboardLayout.tsx` — Root uploader
- `src/ui/nav/MobileNavBar.tsx` — Mobile navigation
- `src/pages/dashboard/SmartImportAI.tsx` — Processing hub
- `src/components/dashboard/SmartImportOverviewCard.tsx` — Dashboard card

---

**Last Updated:** October 18, 2025





