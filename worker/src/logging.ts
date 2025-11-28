import pino from 'pino';
import { config } from './config.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';

// Get current file directory for ESM-compatible path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path to shared PII module relative to project root
// worker/src/logging.ts -> worker/src/ -> worker/ -> project-root/ -> netlify/functions/_shared/pii.ts
const projectRoot = resolve(__dirname, '../..');
const piiModulePath = join(projectRoot, 'netlify', 'functions', '_shared', 'pii.js');
const piiModulePathTs = join(projectRoot, 'netlify', 'functions', '_shared', 'pii.ts');

// Lazy-loaded PII masker with fallback
let maskPIIModule: { maskPII: (text: string, strategy?: 'last4' | 'full' | 'domain') => { masked: string; found: any[] } } | null = null;
let piiModuleLoaded = false;
let piiLoadPromise: Promise<void> | null = null;

/**
 * Lazy-load PII masking module with fallback
 */
async function loadPIIModule(): Promise<void> {
  if (piiLoadPromise) return piiLoadPromise;

  piiLoadPromise = (async () => {
    try {
      let modulePath: string | null = null;

      // Check if .js file exists first (compiled output)
      if (existsSync(piiModulePath)) {
        modulePath = piiModulePath;
      } 
      // Try .ts extension as fallback (source file)
      else if (existsSync(piiModulePathTs)) {
        modulePath = piiModulePathTs;
      } else {
        throw new Error(`PII module not found at ${piiModulePath} or ${piiModulePathTs}`);
      }

      // Convert to file:// URL for ESM dynamic import
      const moduleUrl = pathToFileURL(modulePath).href;
      maskPIIModule = await import(moduleUrl);
      piiModuleLoaded = true;
    } catch (error) {
      // Fallback to no-op implementation
      console.warn(`⚠️  Could not load PII masking module from ${piiModulePath}: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('⚠️  PII masking will be disabled in logs. Logs may contain sensitive data.');
      piiModuleLoaded = false;
    }
  })();

  return piiLoadPromise;
}

// Create logger instance
export const logger = pino({
  level: config.worker.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

/**
 * Redact PII from strings using canonical maskPII() from pii.ts
 * Uses canonical PII masking from netlify/functions/_shared/pii.ts (30+ detector types)
 * For logging, we use full masking for security
 * Falls back to no-op if PII module cannot be loaded
 */
export function redactPII(text: string): string {
  // Trigger lazy load if not already attempted
  if (!piiLoadPromise) {
    loadPIIModule().catch(err => {
      console.error('Failed to load PII module:', err);
    });
  }

  // Use PII masker if loaded, otherwise return text as-is (fallback)
  if (piiModuleLoaded && maskPIIModule) {
    const result = maskPIIModule.maskPII(text, 'full');
    return result.masked;
  }

  // Fallback: return text unchanged (no masking)
  return text;
}

// Redact PII from objects recursively
export function redactPIIFromObject(obj: any): any {
  if (typeof obj === 'string') {
    return redactPII(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactPIIFromObject);
  }
  
  if (obj && typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      redacted[key] = redactPIIFromObject(value);
    }
    return redacted;
  }
  
  return obj;
}

// Logging utilities
export const logUtils = {
  // Log job start
  logJobStart: (jobId: string, jobData: any) => {
    logger.info({
      jobId,
      event: 'job_start',
      data: redactPIIFromObject(jobData),
    }, 'Job started');
  },
  
  // Log job progress
  logJobProgress: (jobId: string, progress: number, message: string) => {
    logger.info({
      jobId,
      event: 'job_progress',
      progress,
      message,
    }, 'Job progress update');
  },
  
  // Log job completion
  logJobComplete: (jobId: string, duration: number, result: any) => {
    logger.info({
      jobId,
      event: 'job_complete',
      duration,
      result: redactPIIFromObject(result),
    }, 'Job completed successfully');
  },
  
  // Log job failure
  logJobFailure: (jobId: string, error: Error, duration?: number) => {
    logger.error({
      jobId,
      event: 'job_failure',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      duration,
    }, 'Job failed');
  },
  
  // Log OCR request
  logOCRRequest: (engine: string, fileSize: number, filename: string) => {
    logger.info({
      event: 'ocr_request',
      engine,
      fileSize,
      filename: redactPII(filename),
    }, 'OCR request initiated');
  },
  
  // Log OCR response
  logOCRResponse: (engine: string, success: boolean, textLength?: number, error?: string) => {
    logger.info({
      event: 'ocr_response',
      engine,
      success,
      textLength,
      error,
    }, 'OCR request completed');
  },
  
  // Log redaction results
  logRedactionResults: (matches: number, patterns: string[]) => {
    logger.info({
      event: 'redaction_complete',
      matches,
      patterns,
    }, 'PII redaction completed');
  },
  
  // Log parsing results
  logParsingResults: (transactionCount: number, confidence: number) => {
    logger.info({
      event: 'parsing_complete',
      transactionCount,
      confidence,
    }, 'Transaction parsing completed');
  },
  
  // Log categorization results
  logCategorizationResults: (categorized: number, rulesUsed: number, llmUsed: boolean) => {
    logger.info({
      event: 'categorization_complete',
      categorized,
      rulesUsed,
      llmUsed,
    }, 'Transaction categorization completed');
  },
  
  // Log storage operations
  logStorageOperation: (operation: string, bucket: string, filename: string, success: boolean) => {
    logger.info({
      event: 'storage_operation',
      operation,
      bucket,
      filename: redactPII(filename),
      success,
    }, 'Storage operation completed');
  },
  
  // Log database operations
  logDatabaseOperation: (operation: string, table: string, recordCount: number, success: boolean) => {
    logger.info({
      event: 'database_operation',
      operation,
      table,
      recordCount,
      success,
    }, 'Database operation completed');
  },
  
  // Log health check
  logHealthCheck: (status: 'healthy' | 'unhealthy', details?: any) => {
    logger.info({
      event: 'health_check',
      status,
      details,
    }, 'Health check performed');
  },
  
  // Log metrics
  logMetrics: (metrics: Record<string, number>) => {
    logger.info({
      event: 'metrics',
      metrics,
    }, 'Metrics recorded');
  },
};






