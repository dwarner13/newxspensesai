import pino from 'pino';
import { config } from './config.js';
import { maskPII } from '../../../netlify/functions/_shared/pii.js';

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
 */
export function redactPII(text: string): string {
  // Use canonical maskPII() with full strategy (no sensitive data in logs)
  const result = maskPII(text, 'full');
  return result.masked;
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






