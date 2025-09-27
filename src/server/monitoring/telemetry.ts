import { getSupabaseServerClient } from '../db';

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  details?: any;
}

export interface TelemetryMetrics {
  requestCount: number;
  errorRate: number;
  responseTime: number;
  tokenUsage: number;
  activeUsers: number;
}

export class TelemetryService {
  private metrics: Map<string, any>;
  private eventQueue: SecurityEvent[];
  
  constructor() {
    this.metrics = new Map();
    this.eventQueue = [];
  }
  
  async trackRequest(req: any, res: any, duration: number): Promise<void> {
    const start = Date.now();
    
    // Track basic metrics
    this.recordMetric('api_requests', {
      method: req.method,
      path: req.url,
      status: res.status,
      duration,
      user_id: req.userId,
      ip_address: req.ip,
    });
    
    // Track response times
    this.recordMetric('response_times', {
      duration,
      endpoint: req.url,
      method: req.method,
    });
    
    // Track status codes
    this.recordMetric('status_codes', {
      status: res.status,
      count: 1,
    });
    
    // Track errors
    if (res.status >= 400) {
      this.recordMetric('api_errors', {
        status: res.status,
        path: req.url,
        method: req.method,
        user_id: req.userId,
      });
    }
  }
  
  trackToolUsage(toolId: string, userId: string, success: boolean, durationMs: number): void {
    this.recordMetric('tool_usage', {
      tool_id: toolId,
      user_id: userId,
      success,
      duration_ms: durationMs,
      timestamp: Date.now(),
    });
    
    // Track tool-specific metrics
    this.recordMetric(`tool_${toolId}_usage`, {
      user_id: userId,
      success,
      duration_ms: durationMs,
    });
    
    if (!success) {
      this.recordMetric('tool_errors', {
        tool_id: toolId,
        user_id: userId,
        duration_ms: durationMs,
      });
    }
  }
  
  trackTokenUsage(userId: string, tokens: number, model: string, cost: number): void {
    this.recordMetric('token_usage', {
      user_id: userId,
      tokens,
      model,
      cost,
      timestamp: Date.now(),
    });
    
    // Track by model
    this.recordMetric(`tokens_${model}`, {
      user_id: userId,
      tokens,
      cost,
    });
    
    // Track daily usage
    const day = new Date().toISOString().split('T')[0];
    this.recordMetric(`daily_tokens_${day}`, {
      user_id: userId,
      tokens,
      cost,
    });
  }
  
  trackSecurityEvent(event: SecurityEvent): void {
    // Add to queue for batch processing
    this.eventQueue.push(event);
    
    // Process critical events immediately
    if (event.severity === 'critical') {
      this.processCriticalEvent(event);
    }
    
    // Process queue if it gets too large
    if (this.eventQueue.length >= 100) {
      this.processEventQueue();
    }
    
    // Record in metrics
    this.recordMetric('security_events', {
      type: event.type,
      severity: event.severity,
      user_id: event.userId,
      outcome: event.outcome,
    });
  }
  
  trackUserActivity(userId: string, activity: string, metadata?: any): void {
    this.recordMetric('user_activity', {
      user_id: userId,
      activity,
      metadata,
      timestamp: Date.now(),
    });
  }
  
  trackPerformanceMetrics(metrics: TelemetryMetrics): void {
    this.recordMetric('performance', {
      request_count: metrics.requestCount,
      error_rate: metrics.errorRate,
      response_time: metrics.responseTime,
      token_usage: metrics.tokenUsage,
      active_users: metrics.activeUsers,
      timestamp: Date.now(),
    });
  }
  
  async getMetrics(timeRange: string = '1h'): Promise<any> {
    const client = getSupabaseServerClient();
    
    // Get metrics from database
    const { data } = await client
      .from('telemetry_metrics')
      .select('*')
      .gte('timestamp', this.getTimeRangeStart(timeRange))
      .order('timestamp', { ascending: false });
    
    return this.aggregateMetrics(data || []);
  }
  
  async getSecurityEvents(severity?: string, limit: number = 100): Promise<SecurityEvent[]> {
    const client = getSupabaseServerClient();
    
    let query = client
      .from('security_audit_trail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    const { data } = await data;
    return data || [];
  }
  
  async getErrorRate(timeRange: string = '1h'): Promise<number> {
    const client = getSupabaseServerClient();
    
    const start = this.getTimeRangeStart(timeRange);
    
    const { data: errors } = await client
      .from('telemetry_metrics')
      .select('count')
      .eq('metric_name', 'api_errors')
      .gte('timestamp', start);
    
    const { data: total } = await client
      .from('telemetry_metrics')
      .select('count')
      .eq('metric_name', 'api_requests')
      .gte('timestamp', start);
    
    const errorCount = errors?.reduce((sum, e) => sum + e.count, 0) || 0;
    const totalCount = total?.reduce((sum, t) => sum + t.count, 0) || 0;
    
    return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
  }
  
  async getActiveUsers(timeRange: string = '1h'): Promise<number> {
    const client = getSupabaseServerClient();
    
    const { data } = await client
      .from('telemetry_metrics')
      .select('metadata')
      .eq('metric_name', 'user_activity')
      .gte('timestamp', this.getTimeRangeStart(timeRange));
    
    if (!data) return 0;
    
    const uniqueUsers = new Set(
      data.map(d => d.metadata?.user_id).filter(Boolean)
    );
    
    return uniqueUsers.size;
  }
  
  private recordMetric(name: string, data: any): void {
    // Store in memory cache
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricData = {
      name,
      timestamp: Date.now(),
      data,
    };
    
    this.metrics.get(name)!.push(metricData);
    
    // Keep only last 1000 entries per metric
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      this.metrics.set(name, metrics.slice(-1000));
    }
  }
  
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const client = getSupabaseServerClient();
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    // Batch insert security events
    await client.from('security_audit_trail').insert(events);
  }
  
  private async processCriticalEvent(event: SecurityEvent): Promise<void> {
    // Send immediate alert for critical events
    console.error('CRITICAL SECURITY EVENT:', event);
    
    // In production, this would send to PagerDuty, Slack, etc.
    if (process.env.PAGERDUTY_KEY) {
      await this.sendPagerDutyAlert(event);
    }
    
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(event);
    }
  }
  
  private async sendPagerDutyAlert(event: SecurityEvent): Promise<void> {
    // Implementation for PagerDuty integration
    console.log('Sending PagerDuty alert:', event);
  }
  
  private async sendSlackAlert(event: SecurityEvent): Promise<void> {
    // Implementation for Slack integration
    console.log('Sending Slack alert:', event);
  }
  
  private getTimeRangeStart(timeRange: string): string {
    const now = Date.now();
    let start: number;
    
    switch (timeRange) {
      case '1h':
        start = now - 60 * 60 * 1000;
        break;
      case '24h':
        start = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        start = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        start = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        start = now - 60 * 60 * 1000; // 1 hour default
    }
    
    return new Date(start).toISOString();
  }
  
  private aggregateMetrics(metrics: any[]): any {
    const aggregated: any = {};
    
    for (const metric of metrics) {
      if (!aggregated[metric.metric_name]) {
        aggregated[metric.metric_name] = {
          count: 0,
          sum: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity,
        };
      }
      
      const agg = aggregated[metric.metric_name];
      agg.count += metric.count || 1;
      agg.sum += metric.value || 0;
      agg.min = Math.min(agg.min, metric.value || 0);
      agg.max = Math.max(agg.max, metric.value || 0);
    }
    
    // Calculate averages
    for (const [name, agg] of Object.entries(aggregated)) {
      (agg as any).avg = (agg as any).count > 0 ? (agg as any).sum / (agg as any).count : 0;
    }
    
    return aggregated;
  }
  
  // Cleanup old metrics
  async cleanupOldMetrics(daysToKeep: number = 30): Promise<void> {
    const client = getSupabaseServerClient();
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    await client
      .from('telemetry_metrics')
      .delete()
      .lt('timestamp', cutoff.toISOString());
  }
  
  // Get cache statistics
  getCacheStats(): { size: number; metrics: string[] } {
    return {
      size: this.metrics.size,
      metrics: Array.from(this.metrics.keys()),
    };
  }
}
