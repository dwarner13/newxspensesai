# 🌐 SMART IMPORT GLOBAL UPLOADER PATTERN

**Purpose:** Make StatementUpload available globally so users can import from any dashboard page  
**Status:** ✅ Production-Ready  
**Pattern:** Layout-level component + Event bus coordination  

---

## 📋 OVERVIEW

### Problem Solved

❌ **Before:** Import button only works on the Smart Import AI page  
❌ Users have to navigate to the page first  
❌ Broken UX for "Import from anywhere" workflows  

✅ **After:** Import button works from anywhere  
✅ Auto-navigation to Smart Import AI after file selection  
✅ Seamless end-to-end experience  

---

## 🏗️ ARCHITECTURE

```
DashboardLayout (root)
  ├─ Sidebar/Header
  ├─ {children}
  └─ StatementUpload (hidden, mounted globally)
      ↓ (when file selected)
      ↓ emit import:created
      ↓ navigate to SmartImportAI page
      ↓ toast "Parsing your file..."
```

---

## 📝 COMPLETE IMPLEMENTATION

### File: `src/layouts/DashboardLayout.tsx`

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
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (importData: any) => {
    try {
      console.log('[GlobalUploader] Upload complete', { importId: importData.id });

      // 1. Emit event so SmartImportAI page picks it up
      bus.emit('import:created', {
        userId,
        importId: importData.id,
        fileName: importData.fileName || 'Unknown',
        fileSize: importData.fileSize || 0
      });

      // 2. Show feedback
      toast.info('Parsing your file… Navigating to Smart Import');

      // 3. Navigate to Smart Import page (it will handle the rest)
      navigate('/dashboard/smart-import-ai', {
        state: { importId: importData.id, autoStart: true }
      });

      setIsUploading(false);
    } catch (err: any) {
      console.error('[GlobalUploader] Error handling upload:', err);
      toast.error('Failed to process upload');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200">
        {/* Your existing header */}
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200">
          {/* Your existing sidebar */}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* ============================================================ */}
      {/* GLOBAL HIDDEN UPLOADER                                      */}
      {/* ============================================================ */}
      {/* This component is invisible but always mounted.              */}
      {/* It enables importing from anywhere in the dashboard.        */}
      {/* The uploader clicks its hidden file input when user         */}
      {/* clicks the "Import" button in bottom nav or sidebar.        */}
      {/* ============================================================ */}

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

## 🎛️ TRIGGERING GLOBAL UPLOAD

### Option 1: Bottom Navigation Button

```typescript
// src/components/layout/MobileBottomNav.tsx

import { bus } from '@/lib/bus';

export function MobileBottomNav() {
  const handleImportClick = () => {
    // Trigger the hidden StatementUpload in DashboardLayout
    bus.emit('upload:open', {
      accept: '.pdf,.csv,.png,.jpg,.jpeg',
      kind: 'any',
      timestamp: Date.now()
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <button onClick={handleImportClick} className="...">
        📤 Import
      </button>
    </nav>
  );
}
```

### Option 2: Sidebar "Import" Button

```typescript
// src/components/layout/Sidebar.tsx

import { bus } from '@/lib/bus';

export function Sidebar() {
  const handleImportClick = () => {
    bus.emit('upload:open', {
      accept: '.pdf,.csv,.png,.jpg,.jpeg',
      kind: 'any',
      timestamp: Date.now()
    });
  };

  return (
    <aside className="...">
      <button onClick={handleImportClick} className="...">
        📤 Import Document
      </button>
    </aside>
  );
}
```

### Option 3: Header Quick Action

```typescript
// src/components/layout/Header.tsx

import { bus } from '@/lib/bus';

export function Header() {
  const handleImportClick = () => {
    bus.emit('upload:open', {
      accept: '.pdf,.csv,.png,.jpg,.jpeg',
      kind: 'any',
      timestamp: Date.now()
    });
  };

  return (
    <header className="...">
      <button onClick={handleImportClick} className="...">
        📤 Import
      </button>
    </header>
  );
}
```

---

## 🔄 COMPLETE USER FLOW

```
1. User on any dashboard page
   ↓
2. Clicks "Import" button in sidebar/header/bottom-nav
   ↓
3. Button emits: bus.emit('upload:open', {...})
   ↓
4. StatementUpload (in DashboardLayout) hears event
   ↓
5. StatementUpload clicks hidden file input
   ↓
6. User selects file (PDF/CSV/Image)
   ↓
7. File uploads to ingest-statement function
   ↓
8. onUploadComplete fires in DashboardLayout
   ↓
9. emit import:created event
   ↓
10. navigate to /dashboard/smart-import-ai
    ↓
11. SmartImportAI page receives import:created
    ↓
12. Calls byte-ocr-parse to get preview
    ↓
13. Shows parsed preview table
    ↓
14. User clicks "Approve & Commit"
    ↓
15. Orchestration chain runs (Prime → Crystal)
    ↓
16. Advisory card shows results ✅
```

---

## 🧩 INTEGRATION POINTS

### 1. StatementUpload Listens to Events

```typescript
// src/ui/components/Upload/StatementUpload.tsx

useEffect(() => {
  const off1 = bus.on('upload:open', ({ accept, capture }: any) => {
    if (accept) setAccept(accept);
    setCapture(capture);
    fileInputRef.current?.click();  // ← Triggers hidden file input
  });

  return () => off1();
}, []);
```

### 2. SmartImportAI Listens to Import Events

```typescript
// src/pages/dashboard/SmartImportAI.tsx

useEffect(() => {
  const off = bus.on('import:created', async ({ importId, userId: createdBy }: any) => {
    if (createdBy !== userId) return;

    setImportId(importId);
    setIsPolling(true);

    try {
      const res = await fetch('/.netlify/functions/byte-ocr-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, importId, preview: true })
      }).then(r => r.json());

      bus.emit('import:parsed', {
        importId,
        rowsTotal: res.rowsParsed || 0,
        preview: res.preview || []
      });

      setParsedPreview(res.preview || []);
    } catch (err: any) {
      bus.emit('import:parse:error', { importId, error: err.message });
    } finally {
      setIsPolling(false);
    }
  });

  return () => off();
}, [userId]);
```

### 3. DashboardLayout Coordinates the Flow

```typescript
// src/layouts/DashboardLayout.tsx

const handleUploadComplete = (importData: any) => {
  // Step 1: Emit event (SmartImportAI will hear it)
  bus.emit('import:created', {
    userId,
    importId: importData.id,
    fileName: importData.fileName,
    fileSize: importData.fileSize
  });

  // Step 2: Show feedback
  toast.info('Parsing your file…');

  // Step 3: Navigate to processing page
  navigate('/dashboard/smart-import-ai');
};
```

---

## 📊 EVENT SEQUENCE DIAGRAM

```
┌─────────────────────────────────┐
│ ANY DASHBOARD PAGE              │
├─────────────────────────────────┤
│                                 │
│ User clicks "Import" button     │
│ emit('upload:open', {...})      │
│                                 │
└────────────────┬────────────────┘
                 │
                 ↓
┌─────────────────────────────────┐
│ DASHBOARDLAYOUT                 │
├─────────────────────────────────┤
│                                 │
│ StatementUpload (hidden)        │
│ hears 'upload:open'             │
│ clicks file input               │
│                                 │
│ User selects file               │
│ file uploads                    │
│                                 │
│ onUploadComplete fires          │
│ emit('import:created')          │
│ navigate to SmartImportAI       │
│                                 │
└────────────────┬────────────────┘
                 │
                 ↓
┌─────────────────────────────────┐
│ SMARTIMPORTAI PAGE              │
├─────────────────────────────────┤
│                                 │
│ hears 'import:created'          │
│ calls byte-ocr-parse            │
│ shows preview table             │
│ user clicks approve             │
│ orchestration runs              │
│ advisory card shows ✅          │
│                                 │
└─────────────────────────────────┘
```

---

## ⚙️ CONFIGURATION

### Default Accept Types

```typescript
// Available in any button that triggers import
const UPLOAD_KINDS = {
  any: '.pdf,.csv,.png,.jpg,.jpeg',    // All types
  pdf: '.pdf',                         // Bank statements
  csv: '.csv',                         // Bulk imports
  img: 'image/*',                      // Camera/receipts
} as const;

// Use like:
bus.emit('upload:open', { accept: UPLOAD_KINDS.pdf, kind: 'pdf' });
```

### Toast Messages

```typescript
// Friendly feedback messages
const TOAST_MESSAGES = {
  uploading: 'Uploading your file…',
  parsing: 'Parsing your file… Navigating to Smart Import',
  committed: (count: number) => `${count} transactions committed!`,
  analyzed: 'Crystal is analyzing your data…',
  complete: 'Analysis complete! 🎉'
} as const;
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Add `StatementUpload` to `DashboardLayout.tsx`
- [ ] Wrap it in `<div className="hidden">`
- [ ] Add `handleUploadComplete` callback
- [ ] Test "Import" button from sidebar
- [ ] Test "Import" button from header
- [ ] Test "Import" button from bottom nav
- [ ] Test file selection dialog opens
- [ ] Test upload completes
- [ ] Test navigation to SmartImportAI
- [ ] Test preview shows parsed data
- [ ] Test approve/commit flow
- [ ] Test on mobile (camera option)
- [ ] Test on desktop (file picker)

---

## 🧪 TESTING SCENARIOS

### Scenario 1: Desktop PDF Upload

```
1. Go to /dashboard/transactions (or any page)
2. Click "Import" button in sidebar
3. File picker opens, filter shows PDFs
4. Select a PDF
5. Upload completes
6. Automatically navigates to /dashboard/smart-import-ai
7. Preview table shows transactions ✅
```

### Scenario 2: Mobile Camera Capture

```
1. Go to /dashboard/analytics (or any page)
2. Click "Import" button in bottom nav
3. On iOS: Shows Camera/Photo Library options
4. On Android: Opens camera directly
5. Snap photo of receipt
6. Upload completes
7. Automatically navigates to /dashboard/smart-import-ai
8. Preview table shows parsed receipt data ✅
```

### Scenario 3: CSV Bulk Import

```
1. Go to /dashboard
2. Click "Import" button in header
3. File picker opens
4. Select CSV file
5. Upload completes
6. Navigates to SmartImportAI
7. Shows all rows in preview
8. User clicks approve
9. All transactions committed ✅
```

---

## 🔐 SECURITY CONSIDERATIONS

```typescript
// DashboardLayout.tsx - Always validate userId

const handleUploadComplete = (importData: any) => {
  // Only emit if user is authenticated
  if (!userId) {
    toast.error('Not authenticated');
    return;
  }

  // Only emit with actual userId (not from importData)
  bus.emit('import:created', {
    userId,  // ← Use from context, not request
    importId: importData.id,
    fileName: importData.fileName,
    fileSize: importData.fileSize
  });

  navigate('/dashboard/smart-import-ai');
};
```

---

## 💡 ADVANCED FEATURES (Future)

```typescript
// Could add in SmartImportAI page:

// 1. Auto-approve after delay for trusted users
if (userTrustLevel === 'high') {
  setTimeout(() => handleApproveCommit(), 3000);
}

// 2. Multiple file uploads
bus.emit('upload:open', { multiple: true });

// 3. Drag & drop to anywhere
// Overlay appears when dragging files onto page

// 4. Quick import from email
// "Import from Gmail" button
```

---

## 🔗 RELATED GUIDES

- [`SMART_IMPORT_COPY_PASTE_GUIDE.md`](./SMART_IMPORT_COPY_PASTE_GUIDE.md) — Implementation basics
- [`SMART_IMPORT_MIME_TYPES_FINAL.md`](./SMART_IMPORT_MIME_TYPES_FINAL.md) — File type handling
- [`SMART_IMPORT_INTEGRATION_FLOW.md`](./SMART_IMPORT_INTEGRATION_FLOW.md) — End-to-end flow
- [`SMART_IMPORT_APPROVAL_ORCHESTRATION.md`](./SMART_IMPORT_APPROVAL_ORCHESTRATION.md) — Commit chain

---

## 🎯 SUMMARY

✅ **Global Availability:** Import from any dashboard page  
✅ **Seamless Navigation:** Auto-route to processing page  
✅ **Event Coordination:** Loose coupling via event bus  
✅ **User Feedback:** Toast + progress indicators  
✅ **Mobile Ready:** Camera capture on iOS/Android  
✅ **Security:** userId from context, not user input  

**Files:**
- `src/layouts/DashboardLayout.tsx` (enhanced)
- `src/components/layout/Sidebar.tsx` (add import button)
- `src/components/layout/Header.tsx` (add import button)
- `src/components/layout/MobileBottomNav.tsx` (add import button)
- `src/pages/dashboard/SmartImportAI.tsx` (enhanced to listen)

---

**Last Updated:** October 18, 2025





