/**
 * Worker Backend Service
 * Connects frontend to the Node.js worker backend for document processing
 */

import { WORKER_CONFIG } from '../config/worker';
import type { SmartDocType } from '../types/smartImport';

export interface WorkerJobRequest {
  userId: string;
  documentId?: string;
  fileUrl?: string;
  docType: SmartDocType | 'receipt' | 'bank_statement'; // Support both old and new types
  redact: boolean;
}

export interface WorkerJobResponse {
  jobId: string;
  state?: string;
  status: string;
  message: string;
}

export interface WorkerJobStatus {
  id?: string;
  jobId?: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'accepted_no_queue' | 'not_found' | 'queued';
  status?: string;
  progress?: number; // 0-100
  data?: WorkerJobRequest;
  result?: WorkerJobResult;
  error?: string;
  createdAt?: string;
  processedAt?: string;
  finishedAt?: string;
  message?: string;
}

export interface WorkerJobResult {
  documentId: string;
  transactionCount: number;
  transactions?: any[]; // Array of parsed transactions
  processingTime: number;
  redactedUrl?: string;
  redactedText?: string; // Full OCR text after redaction
  error?: string;
  // Duplicate detection
  isDuplicate?: boolean;
  existingDocumentId?: string;
  // Smart Import Phase 2: importId for commit-import
  importId?: string;
  analysis?: {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    byCategory: Array<{
      category: string;
      count: number;
      totalAmount: number;
    }>;
    topVendors: Array<{
      vendor: string;
      count: number;
      totalAmount: number;
    }>;
    period?: {
      startDate: string | null;
      endDate: string | null;
    };
  };
  summary?: string; // Natural-language summary for chat
}

export interface ProcessingProgress {
  stage: 'upload' | 'processing' | 'ocr' | 'redaction' | 'parsing' | 'categorization' | 'complete';
  progress: number; // 0-100
  message: string;
  details?: any;
  timestamp: string;
}

class WorkerService {
  private baseUrl: string;
  private pollingInterval: number = WORKER_CONFIG.POLLING_INTERVAL;

  constructor() {
    // Use configuration
    this.baseUrl = WORKER_CONFIG.BASE_URL;
  }

  /**
   * Upload file to Supabase Storage and create worker job
   */
  async uploadDocument(
    file: File, 
    userId: string, 
    docType: SmartDocType | 'receipt' | 'bank_statement' = 'bank_statement',
    redact: boolean = true
  ): Promise<{ jobId: string; fileUrl: string; documentId?: string }> {
    try {
      // Step 1: Upload file to Supabase Storage
      const fileUrl = await this.uploadToSupabase(file, userId);
      
      // Step 2: Create worker job
      const jobResponse = await this.createJob({
        userId,
        fileUrl,
        docType,
        redact
      });

      return {
        jobId: jobResponse.jobId,
        fileUrl
      };
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new processing job
   */
  async createJob(jobData: WorkerJobRequest): Promise<WorkerJobResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create job:', error);
      throw error;
    }
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string): Promise<WorkerJobStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Job not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Normalize jobId/id field
      if (data.jobId && !data.id) {
        data.id = data.jobId;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * Poll job status with progress callback
   */
  async pollJobProgress(
    jobId: string, 
    onProgress: (progress: ProcessingProgress) => void,
    onComplete: (result: WorkerJobResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const poll = async (): Promise<void> => {
      try {
        const status = await this.getJobStatus(jobId);
        
        // Handle "no queue" mode - this should no longer happen, but keep for backward compatibility
        if (status.state === 'completed' && status.status === 'accepted_no_queue') {
          console.log('[WorkerService] Queue disabled in local dev, treating job as completed immediately', status);
          
          // Call progress callback with completion
          const progress: ProcessingProgress = {
            stage: 'complete',
            progress: 100,
            message: status.message || 'Job accepted (queue disabled in local dev)',
            details: status,
            timestamp: new Date().toISOString()
          };
          onProgress(progress);
          
          // Complete with a mock result since no actual processing happened
          onComplete({
            documentId: status.data?.documentId || jobId,
            transactionCount: 0,
            processingTime: 0,
          });
          return;
        }
        
        // Handle "not found" state
        if (status.state === 'not_found') {
          onError(status.message || 'Job not found');
          return;
        }
        
        // Ensure state exists
        if (!status.state) {
          console.warn('[WorkerService] Job status missing state field:', status);
          onError('Invalid job status response: missing state field');
          return;
        }
        
        // Convert worker status to our progress format
        const progress: ProcessingProgress = {
          stage: this.mapWorkerStateToStage(status.state),
          progress: status.progress || 0,
          message: this.getProgressMessage(status),
          details: status,
          timestamp: new Date().toISOString()
        };

        // Call progress callback
        onProgress(progress);

        // Check if job is complete
        if (status.state === 'completed' && status.result) {
          onComplete(status.result);
          return;
        }

        // Check if job failed
        if (status.state === 'failed') {
          onError(status.error || 'Job failed');
          return;
        }

        // Continue polling if job is still active
        const activeStates: WorkerJobStatus['state'][] = ['waiting', 'active', 'delayed', 'queued'];
        if (activeStates.includes(status.state)) {
          setTimeout(poll, this.pollingInterval);
        } else {
          // If we reach here and state is not one we've already handled, it's unexpected
          // (accepted_no_queue and not_found are handled earlier, completed/failed are handled above)
          const handledStates: WorkerJobStatus['state'][] = ['completed', 'failed', 'accepted_no_queue', 'not_found'];
          if (!handledStates.includes(status.state)) {
            onError(`Unexpected job state: ${status.state}`);
          }
        }

      } catch (error) {
        console.error('Polling error:', error);
        onError(error instanceof Error ? error.message : 'Polling failed');
      }
    };

    // Start polling
    await poll();
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/queue/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Check worker health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadToSupabase(file: File, userId: string): Promise<string> {
    try {
      // Import Supabase client
      const { supabase } = await import('../lib/supabase');
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${timestamp}-${file.name}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('original_docs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('original_docs')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  }

  /**
   * Map worker state to processing stage
   */
  private mapWorkerStateToStage(state: string): ProcessingProgress['stage'] {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'upload';
      case 'active':
        return 'processing';
      case 'completed':
        return 'complete';
      case 'failed':
        return 'complete';
      default:
        return 'processing';
    }
  }

  /**
   * Get user-friendly progress message
   */
  private getProgressMessage(status: WorkerJobStatus): string {
    switch (status.state) {
      case 'waiting':
      case 'delayed':
        return 'Document queued for processing...';
      case 'active':
        const progress = status.progress || 0;
        if (progress < 20) {
          return 'Downloading document...';
        } else if (progress < 40) {
          return 'Processing document structure...';
        } else if (progress < 60) {
          return 'Performing OCR on scanned content...';
        } else if (progress < 80) {
          return 'Redacting sensitive information...';
        } else if (progress < 100) {
          return 'Parsing and categorizing transactions...';
        }
        return 'Finalizing processing...';
      case 'completed':
        return 'Processing complete!';
      case 'failed':
        return `Processing failed: ${status.error || 'Unknown error'}`;
      default:
        return 'Processing document...';
    }
  }
}

// Export singleton instance
export const workerService = new WorkerService();
export default workerService;
