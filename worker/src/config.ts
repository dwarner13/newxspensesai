import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  // Supabase Configuration
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),
  SUPABASE_PUBLIC_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  
  // Storage Buckets
  SUPABASE_BUCKET_ORIGINALS: z.string().default('original_docs'),
  SUPABASE_BUCKET_REDACTED: z.string().default('redacted_docs'),
  
  // Redis Configuration
  REDIS_URL: z.string().url('Invalid Redis URL').default('redis://localhost:6379').optional(),
  
  // OCR Configuration
  OCR_ENGINE: z.enum(['ocrspace', 'tesseract', 'vision']).default('ocrspace'),
  OCRSPACE_API_KEY: z.string().min(1, 'OCR.space API key required'),
  
  // Optional: Google Vision
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_CREDENTIALS_JSON: z.string().optional(),
  
  // AI Configuration
  USE_LLM_FALLBACK: z.string().transform(val => val === 'true').default('false'),
  OPENAI_API_KEY: z.string().optional(),
  
  // Worker Configuration
  PORT: z.string().transform(Number).default('8080'),
  WORKER_CONCURRENCY: z.string().transform(Number).default('5'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Security
  DELETE_ORIGINAL_ON_SUCCESS: z.string().transform(val => val === 'true').default('true'),
  
  // Health Check
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),
});

// Validate environment variables
const env = envSchema.parse(process.env);

// Export validated configuration
export const config = {
  // Supabase
  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: env.SUPABASE_PUBLIC_ANON_KEY,
    buckets: {
      originals: env.SUPABASE_BUCKET_ORIGINALS,
      redacted: env.SUPABASE_BUCKET_REDACTED,
    },
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
  },
  
  // OCR
  ocr: {
    engine: env.OCR_ENGINE,
    ocrspace: {
      apiKey: env.OCRSPACE_API_KEY,
    },
    google: {
      projectId: env.GOOGLE_PROJECT_ID,
      credentialsJson: env.GOOGLE_CREDENTIALS_JSON,
    },
  },
  
  // AI
  ai: {
    useLlmFallback: env.USE_LLM_FALLBACK,
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
  },
  
  // Worker
  worker: {
    port: env.PORT,
    concurrency: env.WORKER_CONCURRENCY,
    logLevel: env.LOG_LEVEL,
    healthCheckInterval: env.HEALTH_CHECK_INTERVAL,
  },
  
  // Security
  security: {
    deleteOriginalOnSuccess: env.DELETE_ORIGINAL_ON_SUCCESS,
  },
} as const;

// Type exports
export type Config = typeof config;
export type OCREngine = 'ocrspace' | 'tesseract' | 'vision';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';


