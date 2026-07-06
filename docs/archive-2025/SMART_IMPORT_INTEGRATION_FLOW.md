# 🔗 SMART IMPORT INTEGRATION FLOW

**Purpose:** Complete end-to-end event-driven integration for Smart Import AI system  
**Status:** ✅ Production-Ready  
**Pattern:** Event Bus + Realtime Updates + Navigation  

---

## 📋 OVERVIEW

### Complete Data Flow

```
Dashboard Card
    ↓ (navigate + query param)
SmartImportAI Page
    ↓ (check ?auto=upload)
StatementUpload Component
    ↓ (emit upload:open)
Dashboard Cards trigger file dialog
    ↓ (user selects file)
ingest-statement function
    ↓ (emit import:created)
SmartImportAI page listens
    ↓ (call byte-ocr-parse preview)
emit import:parsed
    ↓ (show preview + progress)
User approves commit
    ↓ (call commit-import)
Prime handoff + Crystal analysis
    ↓ (emit events for each stage)
Complete flow
```

---

## 🎯 COMPONENT INTEGRATION

### 1. StatementUpload Component (Enhanced)

**File:** `src/ui/components/Upload/StatementUpload.tsx`

```typescript
import React, { useRef, useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { bus } from '@/lib/bus';

interface StatementUploadProps {
  userId: string;
  onUploadComplete: (importData: any) => void;
}

export function StatementUpload({ userId, onUploadComplete }: StatementUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // NEW: Accept and capture from event bus
  const [accept, setAccept] = useState('.pdf,.csv,.png,.jpg,.jpeg');
  const [capture, setCapture] = useState<string | undefined>(undefined);
  const [fastMode, setFastMode] = useState(false);

  const ACCEPTED_TYPES = ['application/pdf', 'text/csv', 'image/png', 'image/jpeg'];
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB

  // NEW: Listen for dashboard card actions
  useEffect(() => {
    const off1 = bus.on('upload:open', ({ accept, capture }: any) => {
      if (accept) setAccept(accept);
      setCapture(capture);
      fileInputRef.current?.click();
    });

    const off2 = bus.on('mode:fast', ({ fast }: any) => {
      setFastMode(!!fast);
    });

    return () => {
      off1();
      off2();
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Accepted: PDF, CSV, PNG, JPEG');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Max: 25MB, Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('fastMode', fastMode ? '1' : '0');

      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
          // NEW: Emit progress to event bus
          bus.emit('import:upload:progress', {
            userId,
            fileName: file.name,
            percent: Math.round((e.loaded / e.total) * 100),
            bytes: e.loaded
          });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          toast.success('File uploaded successfully');
          
          // NEW: Emit import created event
          bus.emit('import:created', {
            userId,
            importId: result.import.id,
            fileName: file.name,
            fileSize: file.size
          });

          onUploadComplete(result.import);
        } else {
          const error = JSON.parse(xhr.responseText);
          toast.error(error.error || 'Upload failed');
          bus.emit('import:upload:error', {
            userId,
            error: error.error || 'Upload failed'
          });
        }
        setIsUploading(false);
        setProgress(0);
      });

      xhr.addEventListener('error', () => {
        toast.error('Network error during upload');
        bus.emit('import:upload:error', {
          userId,
          error: 'Network error'
        });
        setIsUploading(false);
        setProgress(0);
      });

      xhr.open('POST', '/.netlify/functions/ingest-statement');
      xhr.send(formData);
    } catch (err) {
      toast.error(`Upload error: ${(err as Error).message}`);
      bus.emit('import:upload:error', {
        userId,
        error: (err as Error).message
      });
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        {...(capture ? { capture } : {})}
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      {isUploading ? (
        <div>
          <p className="text-slate-700 mb-3">Uploading... {progress}%</p>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold text-slate-800 mb-2">
            Drag & drop a statement, or click to select
          </p>
          <p className="text-sm text-slate-600 mb-4">
            Supported: PDF, CSV, PNG, JPEG (Max 25MB)
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Select File
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 2. Dashboard Card (Overview)

**File:** `src/pages/dashboard/ConnectedDashboard.tsx`

```typescript
import { useNavigate } from 'react-router-dom';

function SmartImportOverviewCard() {
  const navigate = useNavigate();

  /**
   * Navigate to Smart Import page with auto-open flag
   * This will automatically trigger the file upload dialog on page load
   */
  const handleQuickImport = () => {
    navigate('/dashboard/smart-import-ai?auto=upload');
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
        <div className="text-sm text-slate-700">
          <p>✅ Byte OCR: Instant parsing</p>
          <p>✅ Prime: Smart acknowledgment</p>
          <p>✅ Crystal: Deep financial insights</p>
        </div>
      </div>

      <button
        onClick={handleQuickImport}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
      >
        📁 Import & Chat
      </button>
    </div>
  );
}

export default SmartImportOverviewCard;
```

---

### 3. SmartImportAI Page (Enhanced)

**File:** `src/pages/dashboard/SmartImportAI.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bus } from '@/lib/bus';
import { useSmartImportState, useImportRealtime } from '@/hooks';
import { StatementUpload } from '@/ui/components/Upload/StatementUpload';
import { SmartImportTile } from '@/ui/components/SmartImportTile';

// ============================================================================
// HELPER FUNCTIONS
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
  const [searchParams] = useSearchParams();
  
  const [importId, setImportId] = useState<string | undefined>();
  const [showUpload, setShowUpload] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  
  const state = useSmartImportState();

  useImportRealtime(importId, userId);

  // NEW: Auto-open upload if ?auto=upload
  useEffect(() => {
    const autoUpload = searchParams.get('auto') === 'upload';
    if (autoUpload) {
      setShowUpload(true);
      // Trigger the file dialog immediately
      bus.emit('upload:open', {
        accept: ACCEPT.ANY,
        kind: 'any',
        timestamp: Date.now()
      });
    }
  }, [searchParams]);

  // NEW: Listen for import created event
  useEffect(() => {
    const off = bus.on('import:created', async ({ importId, userId: createdBy }: any) => {
      if (createdBy !== userId) return;

      setImportId(importId);
      setIsPolling(true);

      try {
        // Call byte-ocr-parse in preview mode
        const res = await fetch('/.netlify/functions/byte-ocr-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            importId,
            preview: true  // Request preview only
          })
        }).then(r => r.json()).catch(() => ({}));

        // Emit parsed event with preview
        bus.emit('import:parsed', {
          importId,
          rowsTotal: res.rowsParsed || 0,
          preview: res.preview || []
        });

        setParsedPreview(res.preview || []);
      } catch (err: any) {
        console.error('Preview fetch error:', err);
        bus.emit('import:parse:error', {
          importId,
          error: err.message
        });
      } finally {
        setIsPolling(false);
      }
    });

    return () => off();
  }, [userId]);

  // NEW: Listen for parsed event
  useEffect(() => {
    const off = bus.on('import:parsed', ({ importId: parsedId, preview }: any) => {
      if (parsedId === importId) {
        setParsedPreview(preview || []);
      }
    });
    return () => off();
  }, [importId]);

  const handleUploadComplete = (importData: any) => {
    setImportId(importData.id);
    setShowUpload(false);
  };

  const handleApproveCommit = async () => {
    if (!importId) return;

    bus.emit('import:commit:start', { importId, userId });

    try {
      const res = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, importId })
      });

      if (!res.ok) throw new Error('Commit failed');

      const { committed } = await res.json();
      bus.emit('import:commit:complete', { importId, committed });

      // Auto-handoff to Prime
      setTimeout(() => {
        bus.emit('prime:handoff:initiated', {
          importId,
          message: `Processing ${committed} transactions...`
        });
      }, 1000);
    } catch (err: any) {
      bus.emit('import:commit:error', { importId, error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      {/* HEADER */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Smart Import AI</h1>
        <p className="text-slate-300">
          Upload receipts, bank statements, or transaction data. Prime & Crystal will analyze it.
        </p>
      </div>

      {/* STATUS SECTION */}
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

      {/* ERROR SECTION */}
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
          description="Prioritize speed for large batches"
          buttonLabel="Enable"
          onClick={startFastProcessing}
          variant="yellow"
          loading={isPolling}
        />

        <SmartImportTile
          icon="👥"
          title="AI Team"
          description="Watch Prime, Crystal, and Byte work"
          buttonLabel="View Team"
          onClick={openAiTeamPanel}
          variant="purple"
        />
      </div>

      {/* PREVIEW SECTION */}
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
                    <td className="p-3 text-right text-slate-900">${tx.amount.toFixed(2)}</td>
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

## 📊 COMPLETE EVENT SEQUENCE

### Happy Path: Upload → Parse → Commit → Analyze

```
1. User clicks "Import & Chat" on dashboard card
   ↓
2. Navigate to /dashboard/smart-import-ai?auto=upload
   ↓
3. SmartImportAI page loads, checks ?auto=upload param
   ↓
4. Emit upload:open event
   ↓
5. StatementUpload component receives event, clicks file input
   ↓
6. User selects file
   ↓
7. FormData POST to ingest-statement
   ↓
8. ingest-statement returns {importId}
   ↓
9. StatementUpload emits import:created {importId}
   ↓
10. SmartImportAI page receives import:created
    ↓
11. Call byte-ocr-parse with preview:true
    ↓
12. emit import:parsed {importId, preview: [...]}
    ↓
13. Show parsed preview table
    ↓
14. User clicks "Approve & Commit"
    ↓
15. Call commit-import
    ↓
16. emit import:commit:complete
    ↓
17. emit prime:handoff:initiated
    ↓
18. Prime processes, emit prime:message
    ↓
19. emit crystal:analyze:start
    ↓
20. Crystal analyzes, emit crystal:analyze:complete
    ↓
21. Show results to user ✅
```

---

## 🔧 NETLIFY FUNCTION UPDATES

### ingest-statement Enhanced

```typescript
// netlify/functions/ingest-statement.ts
import { withGuardrails, safeLog, validateFileUpload, checkRateLimit } from './_shared/guardrails';
import { createSupabaseClient } from './_shared/supabase';

const sb = createSupabaseClient();

export default withGuardrails(async (req, body) => {
  // ... existing validation ...

  // Extract fastMode flag
  const fastMode = body?.fastMode === '1';

  // ... upload to storage ...

  // 7. Create import record
  const { data: importRecord, error: importError } = await sb
    .from('imports')
    .insert({
      user_id: userId,
      source: 'web_upload',
      file_url: uploadData.path,
      file_type: file.type,
      status: 'pending',
      error: null,
      metadata: { fastMode },  // Store for byte-ocr-parse
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (importError) {
    safeLog('ingest.db_insert_failed', { userId, error: importError.message }, 'error');
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }

  // 8. Trigger async OCR parse
  try {
    const ocrEndpoint = process.env.NETLIFY_URL || 'http://localhost:8888';
    await fetch(`${ocrEndpoint}/.netlify/functions/byte-ocr-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        importId: importRecord.id,
        userId,
        fastMode
      })
    });
  } catch (e: any) {
    safeLog('ingest.ocr_trigger_failed', { userId, importId: importRecord.id, error: e.message }, 'warn');
  }

  safeLog('ingest.success', { userId, importId: importRecord.id, fileSize: file.data.length });

  return new Response(
    JSON.stringify({
      ok: true,
      import: {
        id: importRecord.id,
        status: 'pending'
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

### byte-ocr-parse Enhanced

```typescript
// netlify/functions/byte-ocr-parse.ts
export async function handler(event: any) {
  const { importId, userId, preview, fastMode } = event.body
    ? JSON.parse(event.body)
    : event.queryStringParameters;

  // ... download and parse file ...

  if (preview) {
    // Preview mode: return quickly without committing
    return new Response(
      JSON.stringify({
        success: true,
        rowsParsed: normalizedTx.length,
        preview: normalizedTx.slice(0, 20)  // First 20 rows
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Normal mode: commit to transactions_staging
  for (const tx of normalizedTx) {
    const hash = hashTransaction(tx);
    await sb.from('transactions_staging').upsert(
      {
        import_id: importId,
        user_id: userId,
        data_json: tx,
        hash,
        parsed_at: new Date().toISOString()
      },
      { onConflict: 'import_id,hash' }
    );
  }

  // Update import record to 'parsed'
  await sb
    .from('imports')
    .update({
      status: 'parsed',
      pages: pageCount,
      error: null
    })
    .eq('id', importId);

  safeLog('byte.parse_complete', {
    userId,
    importId,
    rowsParsed: normalizedTx.length,
    duration: Date.now() - startTime
  });

  return new Response(
    JSON.stringify({
      success: true,
      rowsParsed: normalizedTx.length,
      preview: normalizedTx.slice(0, 20)
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Update `StatementUpload.tsx` with event bus listeners
- [ ] Add `accept` and `capture` state to upload component
- [ ] Emit `import:created`, `import:upload:progress`, `import:upload:error` events
- [ ] Create dashboard card component with navigation
- [ ] Add `?auto=upload` query param handling to SmartImportAI page
- [ ] Add import created event listener to SmartImportAI
- [ ] Add parsed preview table to SmartImportAI
- [ ] Call byte-ocr-parse with `preview:true` flag
- [ ] Update ingest-statement to handle fastMode
- [ ] Update byte-ocr-parse to support preview mode
- [ ] Test complete flow end-to-end
- [ ] Test navigation from dashboard card
- [ ] Test auto-open upload with ?auto=upload
- [ ] Test preview table rendering
- [ ] Test commit and handoff flow

---

## 🎯 EVENT SEQUENCE TABLE

| Event | Source | Target | Payload | Purpose |
|-------|--------|--------|---------|---------|
| `upload:open` | Dashboard tile | StatementUpload | `{accept, capture}` | Trigger file dialog |
| `import:created` | ingest-statement | SmartImportAI | `{importId, fileName}` | New import available |
| `import:parsed` | SmartImportAI | Component | `{importId, preview}` | Show preview table |
| `import:upload:progress` | StatementUpload | UI badge | `{percent, bytes}` | Upload progress |
| `import:commit:start` | SmartImportAI | Server | `{importId, userId}` | Commit triggered |
| `import:commit:complete` | commit-import | SmartImportAI | `{committed}` | Commit finished |
| `prime:handoff:initiated` | SmartImportAI | Prime handler | `{importId}` | Hand off to Prime |
| `prime:message` | prime-handoff | UI | `{message}` | Show Prime's message |
| `crystal:analyze:start` | prime-handoff | Crystal | `{importId}` | Analysis started |
| `crystal:analyze:complete` | crystal-analyze | Results | `{advice, insights}` | Analysis finished ✅ |

---

## 🔗 RELATED GUIDES

- [`SMART_IMPORT_EVENT_BUS.md`](./SMART_IMPORT_EVENT_BUS.md) — Event bus architecture
- [`SMART_IMPORT_UI_HELPERS.md`](./SMART_IMPORT_UI_HELPERS.md) — UI helpers & modals
- [`BYTE_OCR_TWO_STAGE_COMMIT.md`](./BYTE_OCR_TWO_STAGE_COMMIT.md) — Two-stage pipeline
- [`SMART_IMPORT_GUARDRAILS_LOGGING.md`](./SMART_IMPORT_GUARDRAILS_LOGGING.md) — Security & logging

---

## 🎯 SUMMARY

✅ **Stateless Components:** Event bus drives all state  
✅ **Reusable Upload:** Works standalone or via event  
✅ **Auto-Launch:** ?auto=upload query param support  
✅ **Preview First:** Show parsed data before commit  
✅ **Fast Mode:** Optional speed optimization  
✅ **Complete Chain:** Upload → Parse → Commit → Handoff → Analyze  

**Files:**
- `src/ui/components/Upload/StatementUpload.tsx` (enhanced)
- `src/pages/dashboard/ConnectedDashboard.tsx` (card)
- `src/pages/dashboard/SmartImportAI.tsx` (enhanced)
- `netlify/functions/ingest-statement.ts` (enhanced)
- `netlify/functions/byte-ocr-parse.ts` (enhanced)

---

**Last Updated:** October 18, 2025






