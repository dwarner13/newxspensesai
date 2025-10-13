/**
 * Smart Import React Hook
 * 
 * Handles file uploads with automatic guardrails and routing:
 * - Images/PDFs → OCR with PII redaction
 * - CSV/OFX/QIF → Statement parser with PII redaction
 * 
 * All files run through STRICT guardrails before processing
 */

import { useState } from 'react';

export type UploadSource = 'upload' | 'chat';

export type UploadResult = {
  docId: string;
  queued: boolean;
  via: 'ocr' | 'statement-parse' | 'unsupported';
  rejected?: boolean;
  reason?: string;
  pii_redacted?: boolean;
  pii_types?: string[];
};

export function useSmartImport() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a file and process it through the smart import pipeline
   * 
   * @param userId User ID
   * @param file File object from input[type=file]
   * @param source 'upload' or 'chat'
   * @returns Upload result with processing status
   */
  const uploadFile = async (
    userId: string,
    file: File,
    source: UploadSource = 'upload'
  ): Promise<UploadResult> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Step 1: Initialize upload (get signed URL)
      setProgress(10);
      const initRes = await fetch('/.netlify/functions/smart-import-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          filename: file.name,
          mime: file.type,
          source
        })
      });

      if (!initRes.ok) {
        const err = await initRes.text();
        throw new Error(`Init failed: ${err}`);
      }

      const init = await initRes.json();
      
      // Step 2: Upload file to signed URL
      setProgress(40);
      const uploadRes = await fetch(init.url, {
        method: 'PUT',
        headers: {
          'x-upsert': 'true',
          'authorization': `Bearer ${init.token}`,
          'content-type': file.type
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      // Step 3: Finalize (triggers guardrails + processing)
      setProgress(70);
      const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          docId: init.docId
        })
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.text();
        throw new Error(`Finalize failed: ${err}`);
      }

      const result = await finalizeRes.json();
      setProgress(100);

      return {
        docId: init.docId,
        ...result
      };

    } catch (err: any) {
      console.error('[useSmartImport] Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Upload multiple files in parallel
   */
  const uploadFiles = async (
    userId: string,
    files: File[],
    source: UploadSource = 'upload'
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    // Upload sequentially to avoid rate limiting
    for (const file of files) {
      const result = await uploadFile(userId, file, source);
      results.push(result);
    }
    
    return results;
  };

  /**
   * Upload file from base64 (for chat attachments)
   */
  const uploadBase64 = async (
    userId: string,
    filename: string,
    mime: string,
    base64: string,
    source: UploadSource = 'chat'
  ): Promise<UploadResult> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Step 1: Initialize
      setProgress(10);
      const initRes = await fetch('/.netlify/functions/smart-import-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, filename, mime, source })
      });

      if (!initRes.ok) throw new Error('Init failed');
      const init = await initRes.json();

      // Step 2: Upload base64 data
      setProgress(40);
      const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      
      const uploadRes = await fetch(init.url, {
        method: 'PUT',
        headers: {
          'x-upsert': 'true',
          'authorization': `Bearer ${init.token}`
        },
        body: buffer
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      // Step 3: Finalize
      setProgress(70);
      const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId: init.docId })
      });

      if (!finalizeRes.ok) throw new Error('Finalize failed');
      const result = await finalizeRes.json();
      
      setProgress(100);
      return { docId: init.docId, ...result };

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploadFiles,
    uploadBase64,
    uploading,
    progress,
    error
  };
}

