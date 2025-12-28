/**
 * Worker Backend Configuration
 */

export const WORKER_CONFIG = {
  // Worker backend URL - can be overridden by environment variables
  // Vite requires VITE_ prefix for env vars exposed to client
  BASE_URL: import.meta.env.VITE_WORKER_URL || 'http://localhost:8080',
  
  // Polling interval for job status (in milliseconds)
  POLLING_INTERVAL: 2000,
  
  // Maximum polling attempts
  MAX_POLLING_ATTEMPTS: 150, // 5 minutes at 2-second intervals
  
  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  
  // Default processing options
  DEFAULT_OPTIONS: {
    redact: true,
    enableOCR: true,
    enableCategorization: true
  }
};

export default WORKER_CONFIG;
