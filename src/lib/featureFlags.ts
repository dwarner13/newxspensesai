// src/lib/featureFlags.ts
// Purpose: Quiet Mode toggle for post-import triggers during OCR debugging

export function isPostImportTriggersDisabled(): boolean {
    return import.meta.env.VITE_DISABLE_POST_IMPORT_TRIGGERS === 'true';
  }
  
  

