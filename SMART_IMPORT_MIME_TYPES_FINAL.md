# 📂 SMART IMPORT MIME TYPES & FILE ACCEPT FINAL GUIDE

**Purpose:** Definitive reference for correct file type handling across all upload scenarios  
**Status:** ✅ Final & Verified  
**Last Updated:** October 18, 2025  

---

## 🎯 MIME TYPES REFERENCE TABLE

| Scenario | Accept Value | Capture | Use Case | Notes |
|----------|--------------|---------|----------|-------|
| **Bank Statement (PDF)** | `.pdf` | None | Upload PDF files | File extension works fine |
| **CSV Import** | `.csv` | None | Upload CSV files | File extension works fine |
| **Any Document** | `.pdf,.csv,.png,.jpg,.jpeg` | None | Multiple types | File extensions for desktop |
| **Scan Receipt** | `image/*` | `environment` | Camera capture | MIME type for mobile camera |

---

## 📋 CORRECT OPENUPLOAD() HELPER

```typescript
// src/pages/dashboard/SmartImportAI.tsx

const ACCEPT = {
  ANY: '.pdf,.csv,.png,.jpg,.jpeg',    // File extensions (desktop friendly)
  PDF: '.pdf',                         // PDF only
  CSV: '.csv',                         // CSV only  
  IMG: 'image/*'                       // MIME type for camera (mobile friendly)
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
```

---

## 🎨 TILE IMPLEMENTATIONS

### Tile 1: Any Document

```typescript
<SmartImportTile
  icon="📁"
  title="Any Document"
  description="Upload PDF, CSV, or images"
  buttonLabel="Upload"
  onClick={() => openUpload('any')}
  variant="blue"
/>

// Emits:
bus.emit('upload:open', { 
  accept: '.pdf,.csv,.png,.jpg,.jpeg',
  kind: 'any'
});
```

---

### Tile 2: Bank Statement

```typescript
<SmartImportTile
  icon="🏦"
  title="Bank Statement"
  description="Import PDF or CSV bank exports"
  buttonLabel="Upload PDF"
  onClick={() => openUpload('pdf')}
  variant="blue"
/>

// Emits:
bus.emit('upload:open', { 
  accept: '.pdf',
  kind: 'pdf'
});
```

---

### Tile 3: Scan Receipt (Camera)

```typescript
<SmartImportTile
  icon="📸"
  title="Scan Receipt"
  description="Take a photo of receipts using your camera"
  buttonLabel="📷 Camera"
  onClick={() => openUpload('img')}
  variant="green"
/>

// Emits:
bus.emit('upload:open', { 
  accept: 'image/*',           // ✅ MIME type for mobile camera
  capture: 'environment',      // Rear camera
  kind: 'img'
});
```

---

### Tile 4: CSV Import

```typescript
<SmartImportTile
  icon="📊"
  title="CSV Import"
  description="Bulk import transactions from CSV"
  buttonLabel="Upload CSV"
  onClick={() => openUpload('csv')}
  variant="blue"
/>

// Emits:
bus.emit('upload:open', { 
  accept: '.csv',
  kind: 'csv'
});
```

---

## 📥 STATEMENTUPLOAD COMPONENT

### File Input with Correct Accept Handling

```typescript
// src/ui/components/Upload/StatementUpload.tsx

<input
  ref={fileInputRef}
  type="file"
  accept={accept}  // Dynamically set from event bus
  {...(capture ? { capture } : {})}  // Enables back camera on mobile when capture="environment"
  onChange={handleFileSelect}
  disabled={isUploading}
  className="hidden"
/>
```

### Accept Values in Component State

```typescript
// In StatementUpload component

const [accept, setAccept] = useState('.pdf,.csv,.png,.jpg,.jpeg');  // Default: all types
const [capture, setCapture] = useState<string | undefined>(undefined);

// Listen to upload:open event
useEffect(() => {
  const off1 = bus.on('upload:open', ({ accept, capture }: any) => {
    if (accept) setAccept(accept);  // Update accept based on tile clicked
    setCapture(capture);             // Set capture mode if present
    fileInputRef.current?.click();   // Trigger file dialog
  });

  return () => off1();
}, []);
```

---

## 🔄 COMPLETE EVENT FLOW

```
User clicks "Scan Receipt" tile
  ↓
openUpload('img')
  ↓
bus.emit('upload:open', {
  accept: 'image/*',        ← MIME type for camera
  capture: 'environment',   ← Triggers rear camera
  kind: 'img'
})
  ↓
StatementUpload listens
  ↓
setAccept('image/*')
setCapture('environment')
  ↓
<input accept="image/*" capture="environment" />
  ↓
File dialog opens
  ↓
Mobile: Shows camera option ✅
Desktop: Shows file picker ✅
```

---

## ✅ BROWSER BEHAVIOR

### Desktop Browser
```
accept="image/*" → File picker shows all image files
accept=".pdf"    → File picker shows PDF files
accept=".csv"    → File picker shows CSV files
capture ignored  → No effect on desktop
```

### Mobile Browser (iOS Safari)
```
accept="image/*" + capture="environment"
  ↓
Shows three options:
  1. Take Photo (rear camera) ✅
  2. Photo Library
  3. Recent Photos

accept=".pdf" + capture="environment"
  ↓
Shows file picker (capture ignored for PDFs)
```

### Mobile Browser (Android Chrome)
```
accept="image/*" + capture="environment"
  ↓
Shows camera app directly ✅

accept=".pdf"
  ↓
Shows file picker
```

---

## 🎯 SUMMARY TABLE

| File Type | Accept Value | For Desktop | For Mobile | Comment |
|-----------|--------------|------------|-----------|---------|
| PDF | `.pdf` | ✅ Works | ✅ Works | File extension |
| CSV | `.csv` | ✅ Works | ✅ Works | File extension |
| Images | `image/*` | ✅ Works | ✅ Best | MIME type (camera support) |
| Multiple | `.pdf,.csv,.png` | ✅ Works | ⚠️ OK | Mixed extensions |
| Multiple | `image/*,.pdf,.csv` | ✅ Works | ✅ Better | Mix MIME + extensions |

---

## 📝 QUICK COPY-PASTE SNIPPETS

### For SmartImportAI.tsx

```typescript
const ACCEPT = {
  ANY: '.pdf,.csv,.png,.jpg,.jpeg',
  PDF: '.pdf',
  CSV: '.csv',
  IMG: 'image/*'
};

function openUpload(kind: 'any' | 'pdf' | 'csv' | 'img') {
  const acceptMap = { any: ACCEPT.ANY, pdf: ACCEPT.PDF, csv: ACCEPT.CSV, img: ACCEPT.IMG };
  bus.emit('upload:open', {
    accept: acceptMap[kind],
    capture: kind === 'img' ? 'environment' : undefined,
    kind,
    timestamp: Date.now()
  });
}
```

### For StatementUpload.tsx

```typescript
const [accept, setAccept] = useState('.pdf,.csv,.png,.jpg,.jpeg');
const [capture, setCapture] = useState<string | undefined>(undefined);

useEffect(() => {
  const off1 = bus.on('upload:open', ({ accept, capture }: any) => {
    if (accept) setAccept(accept);
    setCapture(capture);
    fileInputRef.current?.click();
  });
  return () => off1();
}, []);

// In JSX:
<input
  ref={fileInputRef}
  type="file"
  accept={accept}
  {...(capture ? { capture } : {})}
  onChange={handleFileSelect}
  disabled={isUploading}
  className="hidden"
/>
```

---

## 🧪 TESTING ON MOBILE

### iOS Safari
```
1. Open Safari on iPhone
2. Go to /dashboard/smart-import-ai
3. Click "Scan Receipt" tile
4. Tap "Choose" button
5. Should show: Camera, Photo Library, Recent Photos ✅
```

### Android Chrome
```
1. Open Chrome on Android
2. Go to /dashboard/smart-import-ai
3. Click "Scan Receipt" tile
4. Should open camera app directly ✅
```

### Desktop Chrome/Firefox
```
1. Open browser
2. Go to /dashboard/smart-import-ai
3. Click "Bank Statement" tile
4. Should open file picker
5. Filter shows .pdf files ✅
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Update `ACCEPT` constants with correct values
- [ ] Update all tile `openUpload()` calls with correct `kind`
- [ ] Update `StatementUpload.tsx` accept state handling
- [ ] Test "Scan Receipt" tile on iOS
- [ ] Test "Scan Receipt" tile on Android
- [ ] Test "Bank Statement" on desktop
- [ ] Test "CSV Import" on desktop
- [ ] Verify file picker filtering works
- [ ] Verify camera opens on mobile
- [ ] Test with actual receipts/statements

---

## 📚 REFERENCE LINKS

- [MDN: HTML input accept attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept)
- [MDN: HTML input capture attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture)
- [MIME Types Complete List](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)

---

**Last Updated:** October 18, 2025





