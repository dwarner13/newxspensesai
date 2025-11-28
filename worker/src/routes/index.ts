import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { logger, logUtils } from '../logging.js';
import { QueueManager } from '../queue.js';
import { SupabaseDatabase } from '../supabase.js';
import { processDocument, DocumentProcessingOptions, DocumentProcessingResult } from '../workflow/processDocument.js';

// Request schemas
const createJobSchema = z.object({
  userId: z.string().min(1, 'User ID is required'), // Accept any string, not just UUID
  documentId: z.string().uuid('Invalid document ID').optional(),
  fileUrl: z.string().url('Invalid file URL').optional(),
  docType: z.enum(['receipt', 'bank_statement'], {
    errorMap: () => ({ message: 'docType must be either "receipt" or "bank_statement"' }),
  }),
  redact: z.boolean().default(true),
});

const jobStatusSchema = z.object({
  jobId: z.string(),
});

// In-memory store for synchronous job results (when queue is disabled)
interface SynchronousJobResult {
  jobId: string;
  state: 'completed' | 'failed';
  status: string;
  progress: number;
  data: any;
  result?: DocumentProcessingResult;
  error?: string;
  createdAt: Date;
  processedAt: Date;
  finishedAt: Date;
}

const synchronousJobResults = new Map<string, SynchronousJobResult>();

// Health check endpoint
export async function healthRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/healthz', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const startTime = Date.now();
      
      // Check Redis connection
      const queueStats = await QueueManager.getQueueStats();
      const redisAvailable = queueStats.available !== false;
      
      // Check Supabase connection (optional test)
      let supabaseHealthy = true;
      try {
        await SupabaseDatabase.getCategorizationRules('00000000-0000-0000-0000-000000000000');
      } catch (err) {
        supabaseHealthy = false;
        logger.warn('Supabase health check failed', err);
      }
      
      const responseTime = Date.now() - startTime;
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        responseTime,
        services: {
          redis: redisAvailable ? 'connected' : 'unavailable',
          supabase: supabaseHealthy ? 'connected' : 'error',
          queue: redisAvailable ? 'enabled' : 'disabled',
        },
        queue: queueStats,
        note: !redisAvailable ? 'Queue disabled - Redis not connected. Add Redis database in Railway to enable.' : undefined,
      };
      
      logUtils.logHealthCheck('healthy', health);
      
      reply.code(200).send(health);
    } catch (error) {
      const health = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        services: {
          redis: 'unknown',
          supabase: 'unknown',
          queue: 'unknown',
        },
      };
      
      logUtils.logHealthCheck('unhealthy', health);
      
      reply.code(503).send(health);
    }
  });
  
  // Metrics endpoint
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queueStats = await QueueManager.getQueueStats();
      
      const metrics = {
        timestamp: new Date().toISOString(),
        queue: queueStats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
      };
      
      logUtils.logMetrics(metrics as any);
      
      reply.code(200).send(metrics);
    } catch (error) {
      logger.error({
        event: 'metrics_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to get metrics');
      
      reply.code(500).send({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

// Job management endpoints
export async function jobRoutes(fastify: FastifyInstance) {
  // Create new job
  fastify.post('/jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Log incoming request for debugging
      logger.info({
        event: 'job_creation_request',
        body: request.body,
        headers: request.headers,
      }, 'Received job creation request');

      const body = createJobSchema.parse(request.body);
      
      // Validate that either documentId or fileUrl is provided
      if (!body.documentId && !body.fileUrl) {
        logger.warn({
          event: 'job_validation_failed',
          body: request.body,
          reason: 'Missing documentId and fileUrl',
        }, 'Job validation failed: either documentId or fileUrl must be provided');
        
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Either documentId or fileUrl must be provided',
        });
      }
      
      // Check if queue is available before attempting to add job
      const queueStats = await QueueManager.getQueueStats();
      const queueAvailable = queueStats.available === true;
      
      let jobId: string;
      let status: string;
      let message: string;
      
      if (queueAvailable) {
        try {
          // Try to add job to queue
          jobId = await QueueManager.addJob(body as any);
          status = 'queued';
          message = 'Job added to processing queue';
          
          logger.info({
            event: 'job_created',
            jobId,
            userId: body.userId,
            docType: body.docType,
          }, 'Job created successfully');
        } catch (queueError) {
          // Queue operation failed (e.g., "Connection is closed")
          const errorMessage = queueError instanceof Error ? queueError.message : String(queueError);
          const isConnectionError = 
            errorMessage.includes('Connection is closed') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('ENOTFOUND') ||
            errorMessage.includes('Queue not available');
          
          if (isConnectionError) {
            // Queue connection failed - run synchronously instead
            jobId = randomUUID();
            
            logger.info({
              event: 'queue_connection_failed_sync_processing',
              jobId,
              userId: body.userId,
              docType: body.docType,
              fileUrl: body.fileUrl,
              queueError: errorMessage,
            }, 'Queue connection failed – running OCR/parse synchronously');
            
            // Run synchronous processing
            try {
          const processingOptions: DocumentProcessingOptions = {
            userId: body.userId,
            documentId: body.documentId,
            fileUrl: body.fileUrl,
            fileName: body.fileUrl ? body.fileUrl.split('/').pop()?.split('?')[0] : undefined, // Extract filename from URL
            docType: body.docType,
            redact: body.redact,
            onProgress: (progress, message) => {
              logger.debug({
                jobId,
                progress,
                message,
              }, 'Synchronous processing progress');
            },
          };
              
              const startTime = Date.now();
              const result = await processDocument(processingOptions);
              const processingTime = Date.now() - startTime;
              
              logger.info({
                event: 'sync_processing_complete',
                jobId,
                transactionCount: result.transactionCount,
                processingTime: result.processingTime,
              }, 'Synchronous OCR/parse produced transactions');
              
              // Store result in memory for status polling
              const jobResult: SynchronousJobResult = {
                jobId,
                state: 'completed',
                status: 'completed',
                progress: 100,
                data: body,
                result: {
                  ...result,
                  processingTime: result.processingTime || processingTime,
                },
                createdAt: new Date(),
                processedAt: new Date(),
                finishedAt: new Date(),
              };
              
              synchronousJobResults.set(jobId, jobResult);
              
              status = 'completed';
              message = `Job processed synchronously. Found ${result.transactionCount} transactions.`;
              
            } catch (processingError) {
              const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
              
              logger.error({
                event: 'sync_processing_failed',
                jobId,
                error: errorMessage,
              }, 'Synchronous processing failed');
              
              // Store failed result
              const jobResult: SynchronousJobResult = {
                jobId,
                state: 'failed',
                status: 'failed',
                progress: 0,
                data: body,
                error: errorMessage,
                createdAt: new Date(),
                processedAt: new Date(),
                finishedAt: new Date(),
              };
              
              synchronousJobResults.set(jobId, jobResult);
              
              status = 'failed';
              message = `Synchronous processing failed: ${errorMessage}`;
            }
          } else {
            // Re-throw non-connection errors
            throw queueError;
          }
        }
      } else {
        // Queue is not available (Redis not configured or disabled)
        // Run OCR + parsing synchronously
        jobId = randomUUID();
        
        logger.info({
          event: 'queue_disabled_sync_processing',
          jobId,
          userId: body.userId,
          docType: body.docType,
          fileUrl: body.fileUrl,
        }, 'Queue disabled – running OCR/parse synchronously');
        
        // Run synchronous processing
        try {
          const processingOptions: DocumentProcessingOptions = {
            userId: body.userId,
            documentId: body.documentId,
            fileUrl: body.fileUrl,
            fileName: body.fileUrl ? body.fileUrl.split('/').pop()?.split('?')[0] : undefined, // Extract filename from URL
            docType: body.docType,
            redact: body.redact,
            onProgress: (progress, message) => {
              // Log progress but don't update status (we'll return completed result)
              logger.debug({
                jobId,
                progress,
                message,
              }, 'Synchronous processing progress');
            },
          };
          
          const startTime = Date.now();
          const result = await processDocument(processingOptions);
          const processingTime = Date.now() - startTime;
          
          logger.info({
            event: 'sync_processing_complete',
            jobId,
            transactionCount: result.transactionCount,
            processingTime: result.processingTime,
          }, 'Synchronous OCR/parse produced transactions');
          
          // Store result in memory for status polling
          const jobResult: SynchronousJobResult = {
            jobId,
            state: 'completed',
            status: 'completed',
            progress: 100,
            data: body,
            result: {
              ...result,
              processingTime: result.processingTime || processingTime,
            },
            createdAt: new Date(),
            processedAt: new Date(),
            finishedAt: new Date(),
          };
          
          synchronousJobResults.set(jobId, jobResult);
          
          status = 'completed';
          message = `Job processed synchronously. Found ${result.transactionCount} transactions.`;
          
        } catch (processingError) {
          const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
          
          logger.error({
            event: 'sync_processing_failed',
            jobId,
            error: errorMessage,
          }, 'Synchronous processing failed');
          
          // Store failed result
          const jobResult: SynchronousJobResult = {
            jobId,
            state: 'failed',
            status: 'failed',
            progress: 0,
            data: body,
            error: errorMessage,
            createdAt: new Date(),
            processedAt: new Date(),
            finishedAt: new Date(),
          };
          
          synchronousJobResults.set(jobId, jobResult);
          
          status = 'failed';
          message = `Synchronous processing failed: ${errorMessage}`;
        }
      }
      
      // Determine state based on status
      const state = status === 'queued' ? 'queued' : (status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'accepted_no_queue');
      
      reply.code(201).send({
        jobId,
        state,
        status,
        message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Enhanced error logging for development
        logger.error({
          event: 'job_validation_error',
          rawBody: request.body,
          validationErrors: error.errors,
          errorDetails: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        }, 'Job validation failed');
        
        // Return detailed error in development, safe error in production
        const isDevelopment = process.env.NODE_ENV === 'development' || config.worker.logLevel === 'debug';
        
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Invalid request data',
          details: isDevelopment ? error.errors : undefined,
        });
      }
      
      logger.error({
        event: 'job_creation_failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        body: request.body,
      }, 'Failed to create job');
      
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get job status
  fastify.get('/status/:jobId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { jobId } = jobStatusSchema.parse(request.params);
      
      // Log status request
      logger.info({
        event: 'job_status_request',
        jobId,
      }, 'Received job status request');
      
      // Check if queue is available before attempting to get job status
      const queueStats = await QueueManager.getQueueStats();
      const queueAvailable = queueStats.available === true;
      
      if (!queueAvailable) {
        // Queue is not available - check if we have a synchronous result
        const synchronousResult = synchronousJobResults.get(jobId);
        
        if (synchronousResult) {
          logger.info({
            event: 'job_status_sync_result',
            jobId,
            state: synchronousResult.state,
            transactionCount: synchronousResult.result?.transactionCount || 0,
          }, 'Returning synchronous job result');
          
          return reply.code(200).send({
            jobId,
            state: synchronousResult.state,
            status: synchronousResult.status,
            progress: synchronousResult.progress,
            data: synchronousResult.data,
            result: synchronousResult.result,
            error: synchronousResult.error,
            createdAt: synchronousResult.createdAt,
            processedAt: synchronousResult.processedAt,
            finishedAt: synchronousResult.finishedAt,
            message: synchronousResult.state === 'completed' 
              ? `Processing complete. Found ${synchronousResult.result?.transactionCount || 0} transactions.`
              : `Processing failed: ${synchronousResult.error || 'Unknown error'}`,
          });
        }
        
        // No synchronous result found - job doesn't exist
        logger.warn({
          event: 'job_status_not_found',
          jobId,
          reason: 'Queue not available and no synchronous result found',
        }, 'Job status requested but job not found');
        
        return reply.code(404).send({
          jobId,
          state: 'not_found',
          status: 'error',
          message: 'Job not found',
        });
      }
      
      // Queue is available, try to get job status
      try {
        const status = await QueueManager.getJobStatus(jobId);
        
        if (!status) {
          logger.info({
            event: 'job_status_not_found',
            jobId,
          }, 'Job not found in queue');
          
          return reply.code(404).send({
            jobId,
            state: 'not_found',
            status: 'error',
            message: 'Job not found',
          });
        }
        
        logger.info({
          event: 'job_status_fetched',
          jobId,
          queueStatus: status.state,
          progress: status.progress,
        }, 'Job status fetched successfully');
        
        return reply.code(200).send({
          jobId,
          state: status.state,
          status: status.state,
          progress: status.progress,
          data: status.data,
          result: status.result,
          error: status.error,
          createdAt: status.createdAt,
          processedAt: status.processedAt,
          finishedAt: status.finishedAt,
          message: 'Job status fetched successfully',
        });
      } catch (queueError) {
        // Queue operation failed (e.g., "Connection is closed")
        const errorMessage = queueError instanceof Error ? queueError.message : String(queueError);
        const isConnectionError = 
          errorMessage.includes('Connection is closed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('Queue not available');
        
        if (isConnectionError) {
          // Queue connection failed - check if we have a synchronous result
          const synchronousResult = synchronousJobResults.get(jobId);
          
          if (synchronousResult) {
            logger.info({
              event: 'job_status_sync_result',
              jobId,
              state: synchronousResult.state,
              transactionCount: synchronousResult.result?.transactionCount || 0,
            }, 'Returning synchronous job result');
            
            return reply.code(200).send({
              jobId,
              state: synchronousResult.state,
              status: synchronousResult.status,
              progress: synchronousResult.progress,
              data: synchronousResult.data,
              result: synchronousResult.result,
              error: synchronousResult.error,
              createdAt: synchronousResult.createdAt,
              processedAt: synchronousResult.processedAt,
              finishedAt: synchronousResult.finishedAt,
              message: synchronousResult.state === 'completed' 
                ? `Processing complete. Found ${synchronousResult.result?.transactionCount || 0} transactions.`
                : `Processing failed: ${synchronousResult.error || 'Unknown error'}`,
            });
          }
          
          // No synchronous result found
          logger.warn({
            event: 'job_status_not_found',
            jobId,
            queueError: errorMessage,
          }, 'Job status requested but queue connection failed and no synchronous result found');
          
          return reply.code(404).send({
            jobId,
            state: 'not_found',
            status: 'error',
            message: 'Job not found',
          });
        } else {
          // Re-throw non-connection errors
          throw queueError;
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error({
          event: 'job_status_validation_error',
          validationErrors: error.errors,
        }, 'Job status validation failed');
        
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Invalid job ID',
          details: error.errors,
        });
      }
      
      // Log unexpected errors
      logger.error({
        event: 'job_status_failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Failed to get job status');
      
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get queue statistics
  fastify.get('/queue/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await QueueManager.getQueueStats();
      
      reply.code(200).send(stats);
    } catch (error) {
      logger.error({
        event: 'queue_stats_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to get queue statistics');
      
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Pause queue
  fastify.post('/queue/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await QueueManager.pauseQueue();
      
      reply.code(200).send({
        message: 'Queue paused successfully',
      });
    } catch (error) {
      logger.error({
        event: 'queue_pause_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to pause queue');
      
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Resume queue
  fastify.post('/queue/resume', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await QueueManager.resumeQueue();
      
      reply.code(200).send({
        message: 'Queue resumed successfully',
      });
    } catch (error) {
      logger.error({
        event: 'queue_resume_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to resume queue');
      
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Clean old jobs
  fastify.post('/queue/clean', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await QueueManager.cleanOldJobs();
      
      reply.code(200).send({
        message: 'Queue cleaned successfully',
      });
    } catch (error) {
      logger.error({
        event: 'queue_clean_failed',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to clean queue');
      
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}




