import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger, logUtils } from './logging.js';
import { processDocument } from './workflow/processDocument.js';

// Redis connection
const redis = new Redis(config.redis.url);

// Job data interface
export interface DocumentJobData {
  userId: string;
  documentId?: string;
  fileUrl?: string;
  docType: 'receipt' | 'bank_statement';
  redact: boolean;
}

// Job result interface
export interface DocumentJobResult {
  documentId: string;
  transactionCount: number;
  processingTime: number;
  redactedUrl?: string;
  error?: string;
}

// Create document processing queue
export const documentQueue = new Queue<DocumentJobData, DocumentJobResult>('document-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Create worker
export const documentWorker = new Worker<DocumentJobData, DocumentJobResult>(
  'document-processing',
  async (job: Job<DocumentJobData, DocumentJobResult>) => {
    const { userId, documentId, fileUrl, docType, redact } = job.data;
    const startTime = Date.now();
    
    try {
      logUtils.logJobStart(job.id!, job.data);
      
      // Update job progress
      await job.updateProgress(10);
      
      // Process document
      const result = await processDocument({
        userId,
        documentId,
        fileUrl,
        docType,
        redact,
        onProgress: (progress: number, message: string) => {
          job.updateProgress(progress);
          logUtils.logJobProgress(job.id!, progress, message);
        },
      });
      
      const duration = Date.now() - startTime;
      logUtils.logJobComplete(job.id!, duration, result);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      logUtils.logJobFailure(job.id!, err, duration);
      
      // Re-throw to trigger retry logic
      throw err;
    }
  },
  {
    connection: redis,
    concurrency: config.worker.concurrency,
  }
);

// Worker event handlers
documentWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    event: 'worker_completed',
    result,
  }, 'Worker completed job');
});

documentWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job.id,
    event: 'worker_failed',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  }, 'Worker failed job');
});

documentWorker.on('stalled', (jobId) => {
  logger.warn({
    jobId,
    event: 'worker_stalled',
  }, 'Worker stalled job');
});

// Queue management functions
export class QueueManager {
  // Add job to queue
  static async addJob(jobData: DocumentJobData): Promise<string> {
    try {
      const job = await documentQueue.add('process-document', jobData, {
        priority: jobData.docType === 'bank_statement' ? 1 : 0, // Higher priority for bank statements
      });
      
      logger.info({
        jobId: job.id,
        event: 'job_added',
        data: jobData,
      }, 'Job added to queue');
      
      return job.id!;
    } catch (error) {
      logger.error({
        event: 'job_add_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to add job to queue');
      throw error;
    }
  }
  
  // Get job status
  static async getJobStatus(jobId: string) {
    try {
      const job = await documentQueue.getJob(jobId);
      
      if (!job) {
        return null;
      }
      
      const state = await job.getState();
      const progress = job.progress;
      
      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      };
    } catch (error) {
      logger.error({
        jobId,
        event: 'job_status_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to get job status');
      throw error;
    }
  }
  
  // Get queue statistics
  static async getQueueStats() {
    try {
      const waiting = await documentQueue.getWaiting();
      const active = await documentQueue.getActive();
      const completed = await documentQueue.getCompleted();
      const failed = await documentQueue.getFailed();
      
      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      logger.error({
        event: 'queue_stats_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to get queue statistics');
      throw error;
    }
  }
  
  // Clean old jobs
  static async cleanOldJobs() {
    try {
      await documentQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24 hours
      await documentQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // 7 days
      
      logger.info({
        event: 'queue_cleaned',
      }, 'Queue cleaned of old jobs');
    } catch (error) {
      logger.error({
        event: 'queue_clean_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to clean queue');
    }
  }
  
  // Pause queue
  static async pauseQueue() {
    try {
      await documentQueue.pause();
      logger.info({
        event: 'queue_paused',
      }, 'Queue paused');
    } catch (error) {
      logger.error({
        event: 'queue_pause_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to pause queue');
    }
  }
  
  // Resume queue
  static async resumeQueue() {
    try {
      await documentQueue.resume();
      logger.info({
        event: 'queue_resumed',
      }, 'Queue resumed');
    } catch (error) {
      logger.error({
        event: 'queue_resume_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to resume queue');
    }
  }
}

// Graceful shutdown
export async function shutdownQueue() {
  try {
    logger.info('Shutting down queue system...');
    
    // Close worker
    await documentWorker.close();
    
    // Close queue
    await documentQueue.close();
    
    // Close Redis connection
    await redis.quit();
    
    logger.info('Queue system shutdown complete');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
    }, 'Error during queue shutdown');
  }
}


