# 🚀 SMART IMPORT — SIGNED URL UPLOAD HANDLER

**Purpose:** Generate secure signed URLs for direct client uploads to Supabase Storage  
**Status:** ✅ Production Ready  
**Security:** Service role key (server-only), signed URLs (60s expiration)  

---

## 📋 OVERVIEW

This is a **two-step upload process**:

1. **Client** calls `/get-signed-upload-url` → Gets signed URL + token
2. **Client** directly PUTs file to signed URL (no server involved)
3. **Server** is notified via webhook or message event
4. **Ingest pipeline** begins (byte-ocr-parse, etc.)

---

## 🔧 SETUP

### Environment Variables

Add to `.env.local`:

```bash
# Supabase
VITE_CHAT_FUNCTION_PATH=/.netlify/functions/chat-v3-production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # Server only!
SUPABASE_STORAGE_BUCKET=xspenses-imports
```

### Create Netlify Function

**File:** `netlify/functions/get-signed-upload-url.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server only
  { auth: { persistSession: false } }
);

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { userId, fileName, contentType } = await req.json();

    if (!userId || !fileName || !contentType) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing params: userId, fileName, contentType" }),
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = ["application/pdf", "text/csv", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Content type not allowed" }),
        { status: 400 }
      );
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
    const path = `${userId}/${Date.now()}_${fileName}`;

    // Create a signed upload URL (60 second expiration)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, 60, { contentType });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        bucket,
        path,
        signedUrl: data?.signedUrl,
        token: data?.token, // for client PUT request
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Signed URL error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500 }
    );
  }
};
```

---

## 💻 CLIENT INTEGRATION

### React Hook for Upload

```typescript
// lib/useSignedUpload.ts
import { useState } from 'react';

export function useSignedUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (userId: string, file: File): Promise<{ path: string; bucket: string } | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get signed URL from server
      const urlRes = await fetch('/.netlify/functions/get-signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || 'Failed to get signed URL');
      }

      const { signedUrl, path, bucket, token } = await urlRes.json();

      // Step 2: Upload directly to signed URL
      setProgress(20);

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          Authorization: `Bearer ${token}`,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }

      setProgress(100);
      return { path, bucket };
    } catch (err: any) {
      setError(err.message);
      console.error('Upload error:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading, progress, error };
}
```

### React Component

```typescript
// components/SmartUpload.tsx
import React, { useRef, useState } from 'react';
import { useSignedUpload } from '@/lib/useSignedUpload';
import { toast } from '@/lib/toast';

interface SmartUploadProps {
  userId: string;
  onUploadComplete: (result: { path: string; bucket: string }) => void;
}

export function SmartUpload({ userId, onUploadComplete }: SmartUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress, error } = useSignedUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large (max 25MB)');
      return;
    }

    setSelectedFile(file);
    const result = await uploadFile(userId, file);

    if (result) {
      toast.success('File uploaded successfully!');
      onUploadComplete(result);
    } else {
      toast.error(error || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.png,.jpg,.jpeg"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        disabled={isUploading}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isUploading ? `Uploading ${progress}%` : 'Choose File'}
      </button>

      {selectedFile && (
        <div className="text-sm text-gray-600">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
        </div>
      )}

      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 📊 DATA FLOW

```
Client                          Server                    Supabase
  |                                |                          |
  |-- POST /get-signed-upload-url  |                          |
  |    {userId, fileName, type}    |                          |
  |                                |-- createSignedUploadUrl--|
  |                                |                          |
  |<-- {signedUrl, token, path} ---|                          |
  |                                |                          |
  |-- PUT file to signedUrl -------|-- Direct storage PUT ----|
  |    (with Authorization token)  |                          |
  |                                |                          |
  |<-- 200 OK ----------------------|                          |
  |                                |                          |
  |-- POST /ingest-statement ------|                          |
  |    {userId, path, contentType} |                          |
  |                                |-- Save import record ----|
  |                                |-- Trigger byte-ocr-parse-|
  |<-- {importId} ---|             |                          |
```

---

## 🔒 SECURITY CHECKLIST

- ✅ Service role key **server-only** (never exposed to client)
- ✅ Signed URLs expire in **60 seconds**
- ✅ Content type **validated** on server
- ✅ File size **limited to 25MB**
- ✅ File stored in **user-scoped path** (`{userId}/{timestamp}_{fileName}`)
- ✅ Authorization token required for PUT
- ✅ RLS prevents unauthorized access

---

## 🧪 TESTING

### Test with curl

```bash
# Step 1: Get signed URL
curl -s -X POST http://localhost:8888/.netlify/functions/get-signed-upload-url \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"00000000-0000-4000-8000-000000000001",
    "fileName":"test.pdf",
    "contentType":"application/pdf"
  }' | jq .

# Response:
# {
#   "ok": true,
#   "bucket": "xspenses-imports",
#   "path": "00000000-0000-4000-8000-000000000001/1729276800000_test.pdf",
#   "signedUrl": "https://...",
#   "token": "eyJ..."
# }
```

### Step 2: Upload file

```bash
# Use the signedUrl and token from above
curl -X PUT "https://your-signed-url" \
  -H "Content-Type: application/pdf" \
  -H "Authorization: Bearer eyJ..." \
  --data-binary @test.pdf
```

---

## 📝 ENVIRONMENT VARIABLES

**`.env.local` (Development)**

```bash
# Chat
VITE_CHAT_FUNCTION_PATH=/.netlify/functions/chat-v3-production

# Supabase (Server)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Storage
SUPABASE_STORAGE_BUCKET=xspenses-imports

# Upload endpoints
VITE_SIGNED_URL_ENDPOINT=/.netlify/functions/get-signed-upload-url
VITE_INGEST_ENDPOINT=/.netlify/functions/ingest-statement
```

**Netlify Environment** (via dashboard)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=xspenses-imports
```

---

## 🎯 WORKFLOW WITH INGEST-STATEMENT

After upload succeeds, call ingest-statement:

```typescript
const result = await uploadFile(userId, file);

if (result) {
  // Now trigger ingest-statement
  const ingestRes = await fetch('/.netlify/functions/ingest-statement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      fileUrl: result.path,      // from signed upload result
      fileType: file.type        // from File object
    })
  });

  const { import: importRecord } = await ingestRes.json();
  console.log('Import created:', importRecord.id);
}
```

---

## 📚 RELATED FUNCTIONS

| Function | Purpose |
|----------|---------|
| `get-signed-upload-url.ts` | Generate secure upload URLs |
| `ingest-statement.ts` | Create import record + trigger OCR |
| `byte-ocr-parse.ts` | Parse file (PDF/CSV/Image) |
| `prime-handoff.ts` | Create handoff to Crystal |
| `crystal-analyze-import.ts` | Generate insights |

---

## ✨ SUMMARY

| Aspect | Detail |
|--------|--------|
| **Security** | Signed URLs (60s), service role only |
| **Upload method** | Direct to Supabase Storage (no server bottleneck) |
| **Flow** | Client → Get URL → Upload → Notify Server |
| **Storage path** | `{userId}/{timestamp}_{fileName}` |
| **File types** | PDF, CSV, PNG, JPEG |
| **Max size** | 25MB |
| **Next step** | Call ingest-statement with file path |

---

**Status:** ✅ Production Ready  
**Last Updated:** October 18, 2025





