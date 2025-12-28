# 🎨 SMART IMPORT TILES - FINAL CONFIGURATION

**Purpose:** Quick reference for all tile button configurations  
**Status:** ✅ Final & Verified  
**Last Updated:** October 18, 2025  

---

## 📋 TILE CONFIGURATIONS

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
  capture: undefined,
  kind: 'any',
  timestamp: Date.now()
});

// Result: Desktop file picker shows all types
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
  capture: undefined,
  kind: 'pdf',
  timestamp: Date.now()
});

// Result: Desktop file picker filtered to PDFs only
```

---

### Tile 3: Scan Receipt (CAMERA)
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
  accept: 'image/*',           // ✅ MIME type (not extensions!)
  capture: 'environment',      // ✅ Rear camera on mobile
  kind: 'img',
  timestamp: Date.now()
});

// Result:
// - iOS Safari: Shows "Take Photo" + Photo Library options
// - Android Chrome: Opens camera app directly
// - Desktop: Shows image file picker
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
  capture: undefined,
  kind: 'csv',
  timestamp: Date.now()
});

// Result: Desktop file picker filtered to CSV files only
```

---

### Tile 5: Fast Mode
```typescript
<SmartImportTile
  icon="⚡"
  title="Fast Mode"
  description="Prioritize speed for large batches"
  buttonLabel="Enable"
  onClick={() => bus.emit('mode:fast', { fast: true, timestamp: Date.now() })}
  variant="yellow"
  loading={isPolling}
/>

// Emits:
bus.emit('mode:fast', {
  fast: true,
  timestamp: Date.now()
});

// Result: StatementUpload will include fastMode in formData
```

---

### Tile 6: AI Team
```typescript
<SmartImportTile
  icon="👥"
  title="AI Team"
  description="Watch Prime, Crystal, and Byte work"
  buttonLabel="View Team"
  onClick={() => bus.emit('panel:open', { id: 'ai-team', timestamp: Date.now() })}
  variant="purple"
/>

// Emits:
bus.emit('panel:open', {
  id: 'ai-team',
  timestamp: Date.now()
});

// Result: AI Team sidebar opens (future implementation)
```

---

## 🔑 ACCEPT VALUES MAPPING

```typescript
const ACCEPT = {
  ANY: '.pdf,.csv,.png,.jpg,.jpeg',    // File extensions (desktop)
  PDF: '.pdf',                         // PDF only (file ext)
  CSV: '.csv',                         // CSV only (file ext)
  IMG: 'image/*'                       // ALL images (MIME type!)
};
```

### Key Difference

| Accept Value | Type | Use Case | Desktop | Mobile |
|--------------|------|----------|---------|--------|
| `.pdf` | File extension | Bank PDFs | ✅ Works | ✅ Works |
| `.csv` | File extension | CSV imports | ✅ Works | ✅ Works |
| `image/*` | MIME type | Camera receipts | ✅ Works | ✅ **Best** |
| `.png,.jpg` | Extensions | Images | ✅ Works | ⚠️ No camera |

---

## 📱 MOBILE BEHAVIOR

### iOS Safari with `accept="image/*" capture="environment"`
```
User clicks "Scan Receipt"
  ↓
File picker opens with THREE options:
  1. Take Photo (rear camera) ✅
  2. Photo Library
  3. Recent Photos
```

### Android Chrome with `accept="image/*" capture="environment"`
```
User clicks "Scan Receipt"
  ↓
Camera app opens DIRECTLY ✅
(most seamless experience)
```

### Desktop Chrome/Firefox (any accept value)
```
User clicks "Scan Receipt"
  ↓
Standard file picker opens
(capture attribute is ignored)
```

---

## 🎯 COMPLETE TILESET IN JSX

```typescript
// src/pages/dashboard/SmartImportAI.tsx

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

export default function SmartImportAI() {
  // ... component state ...

  return (
    <div className="...">
      {/* Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Tile 1: Any Document */}
        <SmartImportTile
          icon="📁"
          title="Any Document"
          description="Upload PDF, CSV, or images"
          buttonLabel="Upload"
          onClick={() => openUpload('any')}
          variant="blue"
        />

        {/* Tile 2: Bank Statement */}
        <SmartImportTile
          icon="🏦"
          title="Bank Statement"
          description="Import PDF or CSV bank exports"
          buttonLabel="Upload PDF"
          onClick={() => openUpload('pdf')}
          variant="blue"
        />

        {/* Tile 3: Scan Receipt (CAMERA) */}
        <SmartImportTile
          icon="📸"
          title="Scan Receipt"
          description="Take a photo of receipts using your camera"
          buttonLabel="📷 Camera"
          onClick={() => openUpload('img')}  {/* Uses 'img' which maps to 'image/*' + capture */}
          variant="green"
        />

        {/* Tile 4: CSV Import */}
        <SmartImportTile
          icon="📊"
          title="CSV Import"
          description="Bulk import transactions from CSV"
          buttonLabel="Upload CSV"
          onClick={() => openUpload('csv')}
          variant="blue"
        />

        {/* Tile 5: Fast Mode */}
        <SmartImportTile
          icon="⚡"
          title="Fast Mode"
          description="Prioritize speed for large batches"
          buttonLabel="Enable"
          onClick={() => bus.emit('mode:fast', { fast: true, timestamp: Date.now() })}
          variant="yellow"
          loading={isPolling}
        />

        {/* Tile 6: AI Team */}
        <SmartImportTile
          icon="👥"
          title="AI Team"
          description="Watch Prime, Crystal, and Byte work"
          buttonLabel="View Team"
          onClick={() => bus.emit('panel:open', { id: 'ai-team', timestamp: Date.now() })}
          variant="purple"
        />
      </div>
    </div>
  );
}
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Tile 1 (Any): `accept: '.pdf,.csv,.png,.jpg,.jpeg'` ✅
- [ ] Tile 2 (Bank): `accept: '.pdf'` ✅
- [ ] Tile 3 (Receipt): `accept: 'image/*'` + `capture: 'environment'` ✅
- [ ] Tile 4 (CSV): `accept: '.csv'` ✅
- [ ] Tile 5 (Fast): Emits `mode:fast` ✅
- [ ] Tile 6 (Team): Emits `panel:open` ✅
- [ ] Test Tile 3 on iOS → Shows camera option ✅
- [ ] Test Tile 3 on Android → Opens camera directly ✅
- [ ] Test Tile 3 on Desktop → Shows file picker ✅

---

## 🚀 DEPLOYMENT

Copy the `ACCEPT` and `openUpload` constants into `src/pages/dashboard/SmartImportAI.tsx`, then use the tile configurations above in the JSX return statement.

---

**Last Updated:** October 18, 2025






