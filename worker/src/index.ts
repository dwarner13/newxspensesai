import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { logger } from './logging.js';
import { healthRoutes, jobRoutes } from './routes/index.js';
import { shutdownQueue } from './queue.js';

// Create Fastify instance
const fastify = Fastify({
  logger: false, // We use our own logger
  trustProxy: true,
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });
  
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
  });
  
  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      error: 'Rate limit exceeded',
      message: `Rate limit exceeded, retry in ${Math.round(Number(context.after) / 1000)} seconds`,
      statusCode: 429,
    }),
  });
}

// Register routes
async function registerRoutes() {
  // Health and metrics routes
  await fastify.register(healthRoutes);
  
  // Job management routes
  await fastify.register(jobRoutes);
  
  // Root endpoint
  fastify.get('/', async (request, reply) => {
    return {
      service: 'XspensesAI Worker',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/healthz',
        metrics: '/metrics',
        jobs: '/jobs',
        status: '/status/:jobId',
        queue: '/queue/stats',
      },
    };
  });
  
  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });
  
  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error({
      event: 'request_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    }, 'Request error');
    
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
}

// Start server
async function startServer() {
  try {
    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();
    
    // Start server
    const address = await fastify.listen({
      port: config.worker.port,
      host: '0.0.0.0',
    });
    
    logger.info({
      event: 'server_started',
      address,
      port: config.worker.port,
    }, 'Worker server started');
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({
        event: 'shutdown_signal',
        signal,
      }, 'Received shutdown signal');
      
      try {
        // Close Fastify server
        await fastify.close();
        
        // Shutdown queue system
        await shutdownQueue();
        
        logger.info({
          event: 'shutdown_complete',
        }, 'Graceful shutdown complete');
        
        process.exit(0);
      } catch (error) {
        logger.error({
          event: 'shutdown_error',
          error: error instanceof Error ? error.message : String(error),
        }, 'Error during shutdown');
        
        process.exit(1);
      }
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error({
        event: 'uncaught_exception',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }, 'Uncaught exception');
      
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        event: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: promise.toString(),
      }, 'Unhandled promise rejection');
      
      process.exit(1);
    });
    
  } catch (error) {
    logger.error({
      event: 'server_start_failed',
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to start server');
    
    process.exit(1);
  }
}

// Start the server
startServer();




