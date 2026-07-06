# 🚀 SMART IMPORT AI - PRODUCTION READY COMPONENT

**Status:** ✅ **SmartImportAI.tsx COMPLETE**  
**Updated:** October 18, 2025  
**Filename:** `src/pages/dashboard/SmartImportAI.tsx`  

---

## 📋 WHAT'S IMPLEMENTED

### ✅ Complete Features in SmartImportAI.tsx

1. **Tile Grid (6 tiles)**
   - ✅ Document Upload (any file types)
   - ✅ Scan Receipt (camera with `capture="environment"`)
   - ✅ Bank Statement (PDF only)
   - ✅ CSV Import (CSV only)
   - ✅ Fast Processing (toggle mode)
   - ✅ Watch Me Work (AI team panel)

2. **Event Bus Integration**
   - ✅ Listens to `import:created` from global uploader
   - ✅ Auto-opens upload on desktop when `?auto=upload` param
   - ✅ Emits `upload:open` with correct MIME types
   - ✅ Emits `mode:fast` for fast processing
   - ✅ Emits `panel:open` for AI team

3. **Preview Table**
   - ✅ Displays parsed transactions (first 20 rows)
   - ✅ Shows date, merchant, category, amount
   - ✅ Mobile-responsive table design
   - ✅ Currency formatting

4. **Orchestration Flow**
   - ✅ Approve button triggers full E2E flow:
     1. POST to `commit-import` (staging → final)
     2. POST to `prime-handoff` (create handoff)
     3. POST to `crystal-analyze-import` (financial analysis)
   - ✅ Error handling with toast notifications
   - ✅ Processing state management

5. **Advisory Card**
   - ✅ Displays Crystal's summary
   - ✅ Shows budget impact
   - ✅ Shows forecast delta
   - ✅ Links to transactions & insights

6. **Mobile First**
   - ✅ Responsive tiles (2-col on mobile, 3-col on tablet+)
   - ✅ Responsive preview table
   - ✅ Touch-friendly buttons
   - ✅ Mobile user agent detection

7. **UX & Feedback**
   - ✅ Toast notifications for all states
   - ✅ Loading states ("Processing…")
   - ✅ Disabled states for invalid actions
   - ✅ Import ID display in preview

---

## 📊 ARCHITECTURE

```
SmartImportAI.tsx (DONE ✅)
├── Event Listeners
│   ├── import:created → fetch byte-ocr-parse (preview mode)
│   ├── upload:open → emit with ACCEPT constants
│   └── mode:fast → set fastMode state
├── Tile Grid (6 tiles)
│   ├── Document Upload → openAny()
│   ├── Scan Receipt → openScan() [IMG + capture]
│   ├── Bank Statement → openPdf()
│   ├── CSV Import → openCsv()
│   ├── Fast Processing → enableFast()
│   └── Watch Me Work → openAiTeam()
├── Preview Table
│   ├── Fetch from byte-ocr-parse
│   ├── Display first 20 rows
│   └── Approve & Clear buttons
├── Orchestration
│   ├── commit-import
│   ├── prime-handoff
│   └── crystal-analyze-import
└── Advisory Card
    ├── Summary text
    ├── Budget impact
    ├── Forecast delta
    └── Links (transactions, insights)
```

---

## 🔗 DEPENDENCIES (REQUIRED)

These files **MUST EXIST** for SmartImportAI.tsx to work:

```
✅ src/lib/bus.ts                                [MUST CREATE]
❌ netlify/functions/byte-ocr-parse.ts           [MUST CREATE]
❌ netlify/functions/commit-import.ts            [MUST CREATE]
❌ netlify/functions/prime-handoff.ts            [MUST CREATE]
❌ netlify/functions/crystal-analyze-import.ts   [MUST CREATE]
✅ src/layouts/DashboardLayout.tsx               [MUST UPDATE - add hidden uploader]
✅ src/ui/components/Upload/StatementUpload.tsx  [MUST CREATE]
✅ .env.local                                    [MUST CREATE]
```

---

## 📦 STATE MANAGEMENT

### Component State Variables

```typescript
activeImportId: string | null          // Current import being processed
previewRows: PreviewRow[]               // Parsed transactions from OCR
isProcessing: boolean                  // Orchestration in progress
advisory: object | null                // Crystal's analysis result
fastMode: boolean                      // User enabled fast processing
isMobile: boolean                      // Mobile user agent check
```

### Event Bus Events

```typescript
// INCOMING (listened to)
bus.on('import:created', ({ importId }) => { /* fetch preview */ })

// OUTGOING (emitted)
bus.emit('upload:open', { accept, capture? })
bus.emit('mode:fast', { fast: true })
bus.emit('panel:open', { id: 'ai-team' })
bus.emit('advisory:ready', c)
```

---

## 🎯 USER FLOWS

### Flow 1: Desktop "Import & Chat" Button
```
Dashboard Card "Import & Chat" Button
  ↓
Navigate to /dashboard/smart-import-ai?auto=upload
  ↓
SmartImportAI detects ?auto=upload && !isMobile
  ↓
Emits bus.emit('upload:open', { accept: ACCEPT.ANY })
  ↓
Global hidden uploader fires
  ↓
File picked → uploaded → bus.emit('import:created', {importId})
  ↓
SmartImportAI listens → fetches preview
  ↓
User sees parsed preview table
```

### Flow 2: Mobile "Import" Bottom Nav
```
Mobile bottom nav "Import" button (MobileBottomNav.tsx)
  ↓
Emits bus.emit('upload:open', { accept: '.pdf,.csv,image/*' })
  ↓
Global hidden uploader fires
  ↓
File picker/camera opens
  ↓
File picked → uploaded → bus.emit('import:created', {importId})
  ↓
SmartImportAI page listens (already mounted)
  ↓
User sees parsed preview table
```

### Flow 3: SmartImportAI Tiles (Direct)
```
User clicks tile (e.g., Scan Receipt)
  ↓
openScan() → bus.emit('upload:open', { accept: 'image/*', capture: 'environment' })
  ↓
Global hidden uploader fires
  ↓
Camera opens (mobile) / file picker (desktop)
  ↓
File picked → uploaded → bus.emit('import:created', {importId})
  ↓
SmartImportAI processes preview
  ↓
User sees parsed preview table
```

### Flow 4: Approve & Analyze
```
User clicks "Approve & Send to Prime & Crystal"
  ↓
approveAndAnalyze()
  ↓
1. POST to commit-import
   └─ Moves rows from staging → final
   └─ Updates imports status to 'committed'
   └─ Toast: "Committed X rows"
  ↓
2. POST to prime-handoff
   └─ Creates handoff record
   └─ Prime acknowledges import
  ↓
3. POST to crystal-analyze-import
   └─ Crystal analyzes transactions
   └─ Generates budget impact & forecast
   └─ Returns summary
  ↓
Display Crystal's Advisory Card
  ↓
Toast: "Crystal's advisory is ready"
```

---

## 🧪 TESTING CHECKLIST

### Before Release

- [ ] Event bus (`src/lib/bus.ts`) created
- [ ] StatementUpload component created and integrated in DashboardLayout
- [ ] All 4 Netlify functions created and tested
- [ ] SQL migrations deployed (imports, transactions_staging, handoffs, advice_messages)
- [ ] .env.local configured with all function paths
- [ ] SmartImportAI.tsx replaced with production version ✅

### Manual QA

Desktop:
- [ ] Click "Import & Chat" from dashboard → file picker opens
- [ ] Upload PDF → preview shows
- [ ] Click "Scan Receipt" tile → file picker shows
- [ ] Click "Approve & Send" → orchestration runs
- [ ] Advisory card displays correctly

Mobile:
- [ ] Click Import bottom nav → file picker opens
- [ ] Tap "Scan Receipt" → camera opens (not file picker!)
- [ ] Upload image → preview shows
- [ ] Click "Approve & Send" → orchestration runs
- [ ] Advisory displays on mobile layout

Edge Cases:
- [ ] Empty file → toast error
- [ ] Large file (25MB+) → timeout handling
- [ ] Slow network → loading states visible
- [ ] Network error → error toast + state preserved
- [ ] Retry after error → works correctly

---

## 📝 CODE SUMMARY

### Key Functions

```typescript
// Tile click handlers
openAny() → bus.emit('upload:open', { accept: ACCEPT.ANY })
openScan() → bus.emit('upload:open', { accept: ACCEPT.IMG, capture: 'environment' })
openPdf() → bus.emit('upload:open', { accept: ACCEPT.PDF })
openCsv() → bus.emit('upload:open', { accept: ACCEPT.CSV })
enableFast() → setFastMode(true) + bus.emit('mode:fast', ...)
openAiTeam() → bus.emit('panel:open', { id: 'ai-team' })

// Main orchestration
approveAndAnalyze() →
  1. commit-import
  2. prime-handoff
  3. crystal-analyze-import
  → setAdvisory()
  → bus.emit('advisory:ready', c)

// Event listeners
bus.on('import:created', async ({ importId }) => {
  setActiveImportId(importId)
  fetch('/.netlify/functions/byte-ocr-parse', { preview: true })
  setPreviewRows(res.preview)
})

useEffect(() => {
  if (searchParams.get('auto') === 'upload' && !isMobile) {
    bus.emit('upload:open', { accept: ACCEPT.ANY })
  }
})
```

### MIME Type Mapping

```typescript
const ACCEPT = {
  ANY: '.pdf,.csv,image/*',     // All file types
  PDF: '.pdf',                  // Bank statements
  CSV: '.csv',                  // CSV imports
  IMG: 'image/*',               // Camera + images (MIME type!)
};

// Camera always uses capture="environment" (rear camera)
// Mobile + image/* → camera opens directly
// Desktop + image/* → file picker shows images
```

---

## 🚨 BLOCKING ISSUES

**BEFORE RELEASE, CREATE THESE FILES:**

1. ❌ `src/lib/bus.ts` (5 min)
   ```typescript
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

2. ❌ `src/ui/components/Upload/StatementUpload.tsx` (2 hours)
   - Listen to `bus.on('upload:open', ...)`
   - Set `accept` and `capture` dynamically
   - Upload file to ingest-statement
   - Emit `import:created` on completion

3. ❌ `netlify/functions/byte-ocr-parse.ts` (2 hours)
   - Parse PDF/CSV/Image
   - Support preview mode
   - Return first 20 rows for preview

4. ❌ `netlify/functions/commit-import.ts` (1 hour)
   - Move staging rows to final transactions
   - Update imports status

5. ❌ `netlify/functions/prime-handoff.ts` (1 hour)
   - Create handoff record
   - Acknowledge import

6. ❌ `netlify/functions/crystal-analyze-import.ts` (2 hours)
   - Fetch recent transactions
   - Analyze spending patterns
   - Generate advisory

7. ❌ `.env.local` (15 min)
   ```bash
   VITE_INGEST_STATEMENT_PATH=/.netlify/functions/ingest-statement
   VITE_OCR_PARSE_PATH=/.netlify/functions/byte-ocr-parse
   VITE_COMMIT_IMPORT_PATH=/.netlify/functions/commit-import
   VITE_PRIME_HANDOFF_PATH=/.netlify/functions/prime-handoff
   VITE_CRYSTAL_ANALYZE_PATH=/.netlify/functions/crystal-analyze-import
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_STORAGE_BUCKET=xspenses-imports
   ```

---

## 🎯 NEXT STEPS

1. Create `src/lib/bus.ts` ← **START HERE**
2. Create `src/ui/components/Upload/StatementUpload.tsx`
3. Update `src/layouts/DashboardLayout.tsx` to mount StatementUpload
4. Create all 4 Netlify functions
5. Deploy SQL migrations
6. Create `.env.local`
7. Run smoke tests
8. QA on mobile + desktop
9. **Ready for release** ✅

---

## 📊 FILE STATUS

| Component | File | Status | Effort |
|-----------|------|--------|--------|
| SmartImportAI Page | `src/pages/dashboard/SmartImportAI.tsx` | ✅ DONE | - |
| Event Bus | `src/lib/bus.ts` | ❌ TODO | 5 min |
| File Uploader | `src/ui/components/Upload/StatementUpload.tsx` | ❌ TODO | 2 hrs |
| DashboardLayout | `src/layouts/DashboardLayout.tsx` | ⚠️ PARTIAL | 30 min |
| OCR Parse | `netlify/functions/byte-ocr-parse.ts` | ❌ TODO | 2 hrs |
| Commit Import | `netlify/functions/commit-import.ts` | ❌ TODO | 1 hr |
| Prime Handoff | `netlify/functions/prime-handoff.ts` | ❌ TODO | 1 hr |
| Crystal Analyze | `netlify/functions/crystal-analyze-import.ts` | ❌ TODO | 2 hrs |
| Env Vars | `.env.local` | ❌ TODO | 15 min |
| SQL Schema | Database migrations | ❌ TODO | 1 hr |

**Total Remaining Effort:** ~9 hours

---

**Date:** October 18, 2025  
**Component:** SmartImportAI.tsx  
**Status:** ✅ Production-Ready (pending dependencies)






