import { getSupabaseServerClient } from '../db';
import { AppError } from '../errors';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  count?: number;
  retryAfter?: number;
}

export interface CostMetrics {
  tokens?: number;
  apiCalls?: number;
  storageMB?: number;
}

export class RateLimiter {
  private readonly configs: Map<string, RateLimitConfig>;
  private cache: Map<string, { count: number; resetAt: number }>;
  
  constructor() {
    this.configs = new Map([
      ['api', { windowMs: 60000, max: 100 }],
      ['auth', { windowMs: 900000, max: 5 }], // 5 attempts per 15 min
      ['tool:expensive', { windowMs: 86400000, max: 10 }], // 10 per day
      ['tool:cheap', { windowMs: 3600000, max: 100 }], // 100 per hour
      ['voice', { windowMs: 3600000, max: 50 }], // 50 voice requests per hour
      ['anomaly_detection', { windowMs: 86400000, max: 5 }], // 5 per day
    ]);
    this.cache = new Map();
  }
  
  async checkLimit(
    key: string,
    configName: string = 'api'
  ): Promise<RateLimitResult> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit config ${configName} not found`);
    }
    
    const now = Date.now();
    const windowKey = `${configName}:${key}`;
    const cached = this.cache.get(windowKey);
    
    // Check if window has expired
    if (!cached || now >= cached.resetAt) {
      // Start new window
      this.cache.set(windowKey, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      
      return {
        allowed: true,
        remaining: config.max - 1,
        resetAt: now + config.windowMs,
        count: 1,
      };
    }
    
    // Increment count in existing window
    cached.count++;
    
    const remaining = Math.max(0, config.max - cached.count);
    
    if (cached.count > config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: cached.resetAt,
        retryAfter: Math.ceil((cached.resetAt - now) / 1000),
      };
    }
    
    return {
      allowed: true,
      remaining,
      resetAt: cached.resetAt,
      count: cached.count,
    };
  }
  
  async trackCost(userId: string, cost: CostMetrics): Promise<void> {
    const client = getSupabaseServerClient();
    
    // Get current date strings
    const day = new Date().toISOString().split('T')[0];
    const month = day.substring(0, 7);
    
    // Track daily costs
    await client
      .from('usage_records')
      .upsert({
        user_id: userId,
        resource_type: 'tokens',
        period: day,
        amount: cost.tokens || 0,
        metadata: {
          api_calls: cost.apiCalls || 0,
          storage_mb: cost.storageMB || 0,
        },
      }, {
        onConflict: 'user_id,resource_type,period',
      });
    
    // Check limits
    const limit = await this.getUserTokenLimit(userId);
    const used = await this.getUserTokenUsage(userId, month);
    
    if (used > limit) {
      throw new AppError(
        'Monthly token limit exceeded',
        'TOKEN_LIMIT_EXCEEDED',
        429,
        { used, limit }
      );
    }
  }
  
  async getUserTokenUsage(userId: string, period: string): Promise<number> {
    const client = getSupabaseServerClient();
    
    const { data } = await client
      .from('usage_records')
      .select('amount')
      .eq('user_id', userId)
      .eq('resource_type', 'tokens')
      .gte('period', period)
      .lt('period', this.getNextPeriod(period));
    
    return data?.reduce((sum, record) => sum + record.amount, 0) || 0;
  }
  
  private async getUserTokenLimit(userId: string): Promise<number> {
    // Get from user's plan
    const client = getSupabaseServerClient();
    const { data } = await client
      .from('profiles')
      .select('plan_id, plans!inner(metadata)')
      .eq('id', userId)
      .single();
    
    const limits: Record<string, number> = {
      free: 50000,
      personal: 500000,
      business: 2000000,
      enterprise: 10000000,
    };
    
    return limits[data?.plan_id || 'free'];
  }
  
  private getNextPeriod(period: string): string {
    const date = new Date(period);
    if (period.length === 7) { // YYYY-MM
      date.setMonth(date.getMonth() + 1);
      return date.toISOString().substring(0, 7);
    } else { // YYYY-MM-DD
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];
    }
  }
  
  async checkToolLimit(
    userId: string,
    toolId: string,
    configName: string = 'tool:expensive'
  ): Promise<RateLimitResult> {
    const key = `${userId}:${toolId}`;
    return this.checkLimit(key, configName);
  }
  
  async checkVoiceLimit(userId: string): Promise<RateLimitResult> {
    const key = `voice:${userId}`;
    return this.checkLimit(key, 'voice');
  }
  
  async checkAnomalyDetectionLimit(userId: string): Promise<RateLimitResult> {
    const key = `anomaly:${userId}`;
    return this.checkLimit(key, 'anomaly_detection');
  }
  
  async getRateLimitHeaders(result: RateLimitResult): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
    };
    
    if (result.count !== undefined) {
      headers['X-RateLimit-Count'] = result.count.toString();
    }
    
    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }
    
    return headers;
  }
  
  // Clean up expired cache entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now >= value.resetAt) {
        this.cache.delete(key);
      }
    }
  }
  
  // Get rate limit configuration for a specific endpoint
  getConfig(configName: string): RateLimitConfig | undefined {
    return this.configs.get(configName);
  }
  
  // Update rate limit configuration
  updateConfig(configName: string, config: RateLimitConfig): void {
    this.configs.set(configName, config);
  }
}
