/**
 * Large File Processor
 * Handles large documents with chunking, compression, and optimized OCR
 */

import { processImageWithSmartOCR, SmartOCRResult } from './smartOCRManager';
import { redactDocument } from './documentRedaction';

export interface LargeFileConfig {
  maxFileSize: number; // in bytes
  chunkSize: number; // in bytes
  compressionQuality: number; // 0-1
  timeoutMs: number; // in milliseconds
  retryAttempts: number;
}

export interface ProcessingProgress {
  stage: 'upload' | 'compression' | 'chunking' | 'ocr' | 'analysis' | 'complete';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
}

export interface LargeFileResult {
  success: boolean;
  data?: {
    text: string;
    parsedData: any;
    redactedText: string;
    redactionSummary: any;
    processingTime: number;
    fileSize: number;
    compressionRatio: number;
  };
  error?: string;
  progress: ProcessingProgress;
}

const DEFAULT_CONFIG: LargeFileConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  compressionQuality: 0.8,
  timeoutMs: 10 * 60 * 1000, // 10 minutes
  retryAttempts: 3
};

/**
 * Compress image file to reduce size
 */
async function compressImage(file: File, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 2000px on longest side)
      const maxSize = 2000;
      let { width, height } = img;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Split large files into chunks for processing
 */
function createFileChunks(file: File, chunkSize: number): File[] {
  const chunks: File[] = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    chunks.push(new File([chunk], `${file.name}.chunk.${chunks.length}`, {
      type: file.type
    }));
    start = end;
  }
  
  return chunks;
}

/**
 * Process large file with progress tracking
 */
export async function processLargeFile(
  file: File,
  config: Partial<LargeFileConfig> = {},
  onProgress?: (progress: ProcessingProgress) => void
): Promise<LargeFileResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  
  try {
    // Stage 1: Upload validation
    onProgress?.({
      stage: 'upload',
      progress: 10,
      message: 'Validating file...'
    });
    
    if (file.size > finalConfig.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${finalConfig.maxFileSize / (1024 * 1024)}MB`);
    }
    
    // Stage 2: Compression (for images)
    onProgress?.({
      stage: 'compression',
      progress: 20,
      message: 'Compressing file for optimal processing...'
    });
    
    let processedFile = file;
    let compressionRatio = 1;
    
    if (file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, finalConfig.compressionQuality);
        compressionRatio = file.size / processedFile.size;
        console.log(`File compressed: ${file.size} -> ${processedFile.size} (${compressionRatio.toFixed(2)}x reduction)`);
      } catch (error) {
        console.warn('Compression failed, using original file:', error);
      }
    }
    
    // Stage 3: Chunking (for very large files)
    onProgress?.({
      stage: 'chunking',
      progress: 30,
      message: 'Preparing file for processing...'
    });
    
    const chunks = processedFile.size > finalConfig.chunkSize 
      ? createFileChunks(processedFile, finalConfig.chunkSize)
      : [processedFile];
    
    // Stage 4: OCR Processing
    onProgress?.({
      stage: 'ocr',
      progress: 40,
      message: `Processing ${chunks.length} chunk(s) with Smart OCR...`
    });
    
    let allText = '';
    let allParsedData: any = {};
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkProgress = 40 + (i / chunks.length) * 40; // 40-80%
      
      onProgress?.({
        stage: 'ocr',
        progress: chunkProgress,
        message: `Processing chunk ${i + 1}/${chunks.length}...`
      });
      
      // Process chunk with retry logic
      let chunkResult: SmartOCRResult | null = null;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < finalConfig.retryAttempts; attempt++) {
        try {
          chunkResult = await Promise.race([
            processImageWithSmartOCR(chunk),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Chunk processing timeout')), finalConfig.timeoutMs / chunks.length)
            )
          ]);
          break;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Chunk ${i + 1} attempt ${attempt + 1} failed:`, error);
          
          if (attempt < finalConfig.retryAttempts - 1) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          }
        }
      }
      
      if (!chunkResult) {
        throw new Error(`Failed to process chunk ${i + 1} after ${finalConfig.retryAttempts} attempts: ${lastError?.message}`);
      }
      
      allText += chunkResult.text + '\n';
      allParsedData = { ...allParsedData, ...chunkResult.parsedData };
    }
    
    // Stage 5: Analysis and Redaction
    onProgress?.({
      stage: 'analysis',
      progress: 85,
      message: 'Analyzing and redacting sensitive information...'
    });
    
    const redactionResult = await redactDocument(allText);
    
    const processingTime = Date.now() - startTime;
    
    // Stage 6: Complete
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Processing complete!'
    });
    
    return {
      success: true,
      data: {
        text: allText,
        parsedData: allParsedData,
        redactedText: redactionResult.redactedText,
        redactionSummary: redactionResult.summary,
        processingTime,
        fileSize: file.size,
        compressionRatio
      },
      progress: {
        stage: 'complete',
        progress: 100,
        message: 'Processing complete!'
      }
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      progress: {
        stage: 'complete',
        progress: 0,
        message: `Processing failed: ${errorMessage}`
      }
    };
  }
}

/**
 * Get file processing recommendations
 */
export function getFileRecommendations(file: File): {
  recommended: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Size checks
  if (file.size > 10 * 1024 * 1024) { // 10MB
    warnings.push('Large file detected - processing may take several minutes');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB
    warnings.push('Very large file - consider compressing or splitting');
    suggestions.push('Try compressing the image or splitting into smaller files');
  }
  
  // Type checks
  if (file.type === 'application/pdf') {
    suggestions.push('PDF files are processed page by page for better accuracy');
  }
  
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    warnings.push('Unsupported file type - results may vary');
    suggestions.push('Try converting to JPG, PNG, or PDF for best results');
  }
  
  return {
    recommended: warnings.length === 0,
    warnings,
    suggestions
  };
}
