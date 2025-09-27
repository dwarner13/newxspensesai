export const securityConfig = {
  // Session config
  session: {
    cookieName: 'xpai_session',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  
  // CORS config
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  },
  
  // CSP config
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://api.stripe.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ['https://js.stripe.com'],
    },
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  },
  
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationDays: 90,
    backupRetentionDays: 365,
  },
  
  // Rate limiting
  rateLimits: {
    api: { windowMs: 60000, max: 100 },
    auth: { windowMs: 900000, max: 5 },
    expensive: { windowMs: 86400000, max: 10 },
    voice: { windowMs: 3600000, max: 50 },
    anomaly_detection: { windowMs: 86400000, max: 5 },
  },
  
  // Token limits by plan
  tokenLimits: {
    free: 50000,
    personal: 500000,
    business: 2000000,
    enterprise: 10000000,
  },
  
  // API key configuration
  apiKeys: {
    keyLength: 32,
    prefixLength: 8,
    defaultExpirationDays: 365,
    maxKeysPerUser: 10,
    maxKeysPerOrg: 50,
  },
  
  // Monitoring
  monitoring: {
    errorThreshold: 5, // 5% error rate threshold
    responseTimeThreshold: 5000, // 5 seconds
    tokenUsageThreshold: 0.9, // 90% of limit
    securityEventThreshold: 10, // 10 failed attempts
  },
  
  // Backup configuration
  backup: {
    retentionDays: 30,
    frequency: 'daily',
    encryption: true,
    crossRegion: true,
  },
  
  // Compliance
  compliance: {
    gdpr: {
      dataRetentionDays: 2555, // 7 years for financial data
      consentRequired: true,
      rightToErasure: true,
      dataPortability: true,
    },
    soc2: {
      auditLogging: true,
      accessControls: true,
      dataEncryption: true,
      incidentResponse: true,
    },
    pci: {
      cardDataEncryption: true,
      secureTransmission: true,
      accessRestrictions: true,
    },
  },
  
  // Alerting
  alerts: {
    channels: {
      email: process.env.ALERT_EMAIL,
      slack: process.env.SLACK_WEBHOOK_URL,
      pagerduty: process.env.PAGERDUTY_KEY,
    },
    thresholds: {
      critical: 0,
      high: 1,
      medium: 5,
      low: 10,
    },
  },
};

export const operationalConfig = {
  // Maintenance windows
  maintenance: {
    defaultWindow: 'Sunday 2-4 AM UTC',
    notificationHours: 72,
    maxDuration: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // Scaling thresholds
  scaling: {
    cpuThreshold: 80,
    memoryThreshold: 85,
    connectionThreshold: 90,
    responseTimeThreshold: 2000,
  },
  
  // Health checks
  healthChecks: {
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    retries: 3,
    endpoints: [
      '/health',
      '/health/database',
      '/health/external-apis',
    ],
  },
  
  // Deployment
  deployment: {
    strategy: 'blue-green',
    rollbackThreshold: 5, // 5% error rate
    canaryPercentage: 10,
    maxConcurrentDeployments: 1,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    retention: '30d',
    sampling: 0.1, // 10% sampling in production
  },
};

export const featureFlags = {
  // Security features
  security: {
    mfaRequired: process.env.MFA_REQUIRED === 'true',
    apiKeyAuth: process.env.API_KEY_AUTH === 'true',
    fieldEncryption: process.env.FIELD_ENCRYPTION === 'true',
    auditLogging: process.env.AUDIT_LOGGING === 'true',
  },
  
  // Operational features
  operational: {
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    rateLimiting: process.env.RATE_LIMITING === 'true',
    costTracking: process.env.COST_TRACKING === 'true',
    performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
  },
  
  // Feature toggles
  features: {
    voiceInterface: process.env.VOICE_INTERFACE === 'true',
    teamCollaboration: process.env.TEAM_COLLABORATION === 'true',
    anomalyDetection: process.env.ANOMALY_DETECTION === 'true',
    knowledgePacks: process.env.KNOWLEDGE_PACKS === 'true',
  },
};

export const environmentConfig = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  
  // Service URLs
  services: {
    database: process.env.SUPABASE_URL,
    storage: process.env.SUPABASE_STORAGE_URL,
    redis: process.env.REDIS_URL,
    openai: 'https://api.openai.com',
    stripe: 'https://api.stripe.com',
  },
  
  // External integrations
  integrations: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY,
      site: process.env.DATADOG_SITE || 'datadoghq.com',
    },
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
    },
  },
  
  // Performance tuning
  performance: {
    connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    cacheTTL: parseInt(process.env.CACHE_TTL || '3600'),
    batchSize: parseInt(process.env.BATCH_SIZE || '100'),
  },
};

// Validation function
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required environment variables
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'STRIPE_SECRET_KEY',
    'ENCRYPTION_MASTER_KEY',
  ];
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // Validate security configuration
  if (securityConfig.encryption.keyRotationDays < 30) {
    errors.push('Key rotation period too short (minimum 30 days)');
  }
  
  if (securityConfig.session.maxAge > 30 * 24 * 60 * 60 * 1000) {
    errors.push('Session max age too long (maximum 30 days)');
  }
  
  // Validate rate limits
  for (const [name, config] of Object.entries(securityConfig.rateLimits)) {
    if (config.max <= 0) {
      errors.push(`Invalid rate limit for ${name}: max must be positive`);
    }
    if (config.windowMs <= 0) {
      errors.push(`Invalid rate limit for ${name}: windowMs must be positive`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
