import { getSupabaseServerClient } from '../db';

export interface RevenueMetrics {
  mrr: number;
  growthRate: number;
  churnRate: number;
  arpu: number;
  subscribers: number;
}

export interface UsageMetrics {
  totalTokens: number;
  tokenCost: number;
  topTools: Array<{ tool_id: string; count: number }>;
  dau: number;
  mau: number;
}

export interface SecurityMetrics {
  failedAuthAttempts: number;
  activeAPIKeys: number;
  securityEvents: Array<{ severity: string; count: number }>;
}

export class AdminAnalytics {
  async getRevenueMetrics(): Promise<RevenueMetrics> {
    const client = getSupabaseServerClient();
    
    // Current MRR
    const { data: currentMRR } = await client
      .rpc('calculate_total_mrr');
    
    // Get last month's MRR for growth calculation
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().substring(0, 7);
    
    const { data: lastMonthMRR } = await client
      .from('rev_snapshots')
      .select('mrr_cents')
      .eq('date', lastMonthStr + '-01')
      .single();
    
    const growthRate = lastMonthMRR && lastMonthMRR.mrr_cents > 0
      ? ((currentMRR - lastMonthMRR.mrr_cents) / lastMonthMRR.mrr_cents) * 100
      : 0;
    
    // Churn rate calculation
    const { data: churned } = await client
      .from('subscriptions')
      .select('count')
      .eq('status', 'canceled')
      .gte('canceled_at', new Date(Date.now() - 30 * 86400000).toISOString());
    
    const { data: total } = await client
      .from('subscriptions')
      .select('count')
      .eq('status', 'active');
    
    const churnRate = total?.count ? (churned?.count / total.count) * 100 : 0;
    
    // ARPU calculation
    const arpu = total?.count ? currentMRR / total.count : 0;
    
    return {
      mrr: currentMRR || 0,
      growthRate,
      churnRate,
      arpu,
      subscribers: total?.count || 0,
    };
  }
  
  async getUsageMetrics(): Promise<UsageMetrics> {
    const client = getSupabaseServerClient();
    
    // Get current month
    const month = new Date().toISOString().substring(0, 7);
    
    // Aggregate token usage for current month
    const { data: tokenUsage } = await client
      .from('usage_records')
      .select('amount')
      .eq('resource_type', 'tokens')
      .gte('period', month)
      .lt('period', this.getNextMonth(month));
    
    const totalTokens = tokenUsage?.reduce((sum, record) => sum + record.amount, 0) || 0;
    const tokenCost = totalTokens * 0.00002; // Rough estimate
    
    // Tool usage from audit logs
    const { data: toolUsage } = await client
      .from('audit_logs')
      .select('tool_id, count')
      .eq('action', 'tool_execution')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('count', { ascending: false })
      .limit(10);
    
    // Active users calculation
    const dau = await this.getActiveUsers(1); // Last 1 day
    const mau = await this.getActiveUsers(30); // Last 30 days
    
    return {
      totalTokens,
      tokenCost,
      topTools: toolUsage || [],
      dau,
      mau,
    };
  }
  
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const client = getSupabaseServerClient();
    
    // Failed auth attempts in last 24 hours
    const { data: failedAuth } = await client
      .from('security_audit_trail')
      .select('count')
      .eq('event_type', 'auth_failed')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());
    
    // Active API keys (used in last 24 hours)
    const { data: apiKeyUsage } = await client
      .from('api_keys')
      .select('count')
      .not('last_used_at', 'is', null)
      .gte('last_used_at', new Date(Date.now() - 86400000).toISOString());
    
    // Security events by severity in last 7 days
    const { data: securityEvents } = await client
      .from('security_audit_trail')
      .select('severity, count')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .group('severity');
    
    return {
      failedAuthAttempts: failedAuth?.count || 0,
      activeAPIKeys: apiKeyUsage?.count || 0,
      securityEvents: securityEvents || [],
    };
  }
  
  async getSystemHealth(): Promise<any> {
    const client = getSupabaseServerClient();
    
    // Database health
    const { data: dbHealth } = await client
      .from('profiles')
      .select('count')
      .limit(1);
    
    // Recent errors
    const { data: recentErrors } = await client
      .from('security_audit_trail')
      .select('count')
      .eq('outcome', 'failure')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    
    // Active sessions
    const { data: activeSessions } = await client
      .from('user_sessions')
      .select('count')
      .is('revoked_at', null)
      .gte('expires_at', new Date().toISOString());
    
    return {
      database: {
        connected: !!dbHealth,
        responseTime: '< 100ms', // Would be measured in production
      },
      errors: {
        lastHour: recentErrors?.count || 0,
        status: recentErrors?.count > 10 ? 'warning' : 'healthy',
      },
      sessions: {
        active: activeSessions?.count || 0,
        status: 'healthy',
      },
    };
  }
  
  async getCostBreakdown(): Promise<any> {
    const client = getSupabaseServerClient();
    
    // Current month costs
    const month = new Date().toISOString().substring(0, 7);
    
    // Token costs
    const { data: tokenUsage } = await client
      .from('usage_records')
      .select('amount')
      .eq('resource_type', 'tokens')
      .gte('period', month)
      .lt('period', this.getNextMonth(month));
    
    const tokenCost = (tokenUsage?.reduce((sum, r) => sum + r.amount, 0) || 0) * 0.00002;
    
    // Storage costs (estimate)
    const { data: storageUsage } = await client
      .from('usage_records')
      .select('amount')
      .eq('resource_type', 'storage_mb')
      .gte('period', month)
      .lt('period', this.getNextMonth(month));
    
    const storageCost = (storageUsage?.reduce((sum, r) => sum + r.amount, 0) || 0) * 0.023; // $0.023 per GB
    
    // API costs (estimate)
    const { data: apiUsage } = await client
      .from('usage_records')
      .select('amount')
      .eq('resource_type', 'api_calls')
      .gte('period', month)
      .lt('period', this.getNextMonth(month));
    
    const apiCost = (apiUsage?.reduce((sum, r) => sum + r.amount, 0) || 0) * 0.001; // $0.001 per call
    
    return {
      tokens: {
        cost: tokenCost,
        percentage: 0, // Will be calculated
      },
      storage: {
        cost: storageCost,
        percentage: 0, // Will be calculated
      },
      api: {
        cost: apiCost,
        percentage: 0, // Will be calculated
      },
      total: tokenCost + storageCost + apiCost,
    };
  }
  
  async getUserGrowth(): Promise<any> {
    const client = getSupabaseServerClient();
    
    // New users in last 30 days
    const { data: newUsers } = await client
      .from('profiles')
      .select('count')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    
    // Total users
    const { data: totalUsers } = await client
      .from('profiles')
      .select('count');
    
    // Users by plan
    const { data: usersByPlan } = await client
      .from('profiles')
      .select('plan_id, count')
      .group('plan_id');
    
    return {
      newUsers: newUsers?.count || 0,
      totalUsers: totalUsers?.count || 0,
      growthRate: totalUsers?.count ? (newUsers?.count / totalUsers.count) * 100 : 0,
      usersByPlan: usersByPlan || [],
    };
  }
  
  private async getActiveUsers(days: number): Promise<number> {
    const client = getSupabaseServerClient();
    
    const { data } = await client
      .from('user_sessions')
      .select('user_id')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .limit(100000);
    
    if (!data) return 0;
    
    const uniqueUsers = new Set(data.map(session => session.user_id));
    return uniqueUsers.size;
  }
  
  private getNextMonth(month: string): string {
    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().substring(0, 7);
  }
  
  async generateReport(type: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const [revenue, usage, security, health, costs, growth] = await Promise.all([
      this.getRevenueMetrics(),
      this.getUsageMetrics(),
      this.getSecurityMetrics(),
      this.getSystemHealth(),
      this.getCostBreakdown(),
      this.getUserGrowth(),
    ]);
    
    return {
      type,
      generatedAt: new Date().toISOString(),
      revenue,
      usage,
      security,
      health,
      costs,
      growth,
    };
  }
}
