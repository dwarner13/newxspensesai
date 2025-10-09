import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { logger, logUtils } from '../logging.js';
import { QueueManager } from '../queue.js';
import { SupabaseDatabase } from '../supabase.js';

// Request schemas
const createJobSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
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
      const body = createJobSchema.parse(request.body);
      
      // Validate that either documentId or fileUrl is provided
      if (!body.documentId && !body.fileUrl) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Either documentId or fileUrl must be provided',
        });
      }
      
      // Add job to queue
      const jobId = await QueueManager.addJob(body as any);
      
      logger.info({
        event: 'job_created',
        jobId,
        userId: body.userId,
        docType: body.docType,
      }, 'Job created successfully');
      
      reply.code(201).send({
        jobId,
        status: 'queued',
        message: 'Job added to processing queue',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      
      logger.error({
        event: 'job_creation_failed',
        error: error instanceof Error ? error.message : String(error),
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
      
      const status = await QueueManager.getJobStatus(jobId);
      
      if (!status) {
        return reply.code(404).send({
          error: 'Job not found',
          message: `Job with ID ${jobId} not found`,
        });
      }
      
      reply.code(200).send(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Invalid job ID',
          details: error.errors,
        });
      }
      
      logger.error({
        event: 'job_status_failed',
        error: error instanceof Error ? error.message : String(error),
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




