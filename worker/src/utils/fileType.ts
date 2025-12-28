/**
 * File Type Detection Utilities
 * Detects file type from filename, extension, MIME type, or buffer header
 */

export type FileType = 'pdf' | 'image' | 'unknown';

export interface FileTypeInfo {
  type: FileType;
  mimeType: string;
  extension: string;
}

/**
 * Detect file type from filename and optional MIME type
 */
export function detectFileType(
  filename: string,
  mimeType?: string
): FileTypeInfo {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  // Check by extension first
  if (ext === 'pdf') {
    return {
      type: 'pdf',
      mimeType: mimeType || 'application/pdf',
      extension: 'pdf',
    };
  }
  
  if (['png', 'jpg', 'jpeg'].includes(ext)) {
    return {
      type: 'image',
      mimeType: mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg'),
      extension: ext,
    };
  }
  
  // Check by MIME type if extension doesn't match
  if (mimeType) {
    if (mimeType === 'application/pdf') {
      return {
        type: 'pdf',
        mimeType,
        extension: 'pdf',
      };
    }
    
    if (mimeType.startsWith('image/')) {
      return {
        type: 'image',
        mimeType,
        extension: ext || 'unknown',
      };
    }
  }
  
  return {
    type: 'unknown',
    mimeType: mimeType || 'application/octet-stream',
    extension: ext,
  };
}

/**
 * Detect file type from buffer header (magic bytes)
 */
export function detectFileTypeFromBuffer(buffer: Buffer): FileType {
  if (buffer.length < 4) {
    return 'unknown';
  }
  
  // PDF magic bytes: %PDF (25 50 44 46 in hex, or 37 50 44 46)
  const header = buffer.slice(0, 4).toString('ascii');
  if (header === '%PDF') {
    return 'pdf';
  }
  
  // PNG magic bytes: 89 50 4E 47 (0x89 0x50 0x4E 0x47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image';
  }
  
  // JPEG magic bytes: FF D8 FF (0xFF 0xD8 0xFF)
  // Also check for JPEG variants: FF D8 FF E0 (JFIF), FF D8 FF E1 (EXIF), FF D8 FF DB (no marker)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'image';
  }
  
  return 'unknown';
}

