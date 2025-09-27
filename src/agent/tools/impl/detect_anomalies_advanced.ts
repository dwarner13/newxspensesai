import { z } from 'zod';
import { AnomalyDetector } from '../../../server/analytics/anomalyDetector';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'detect_anomalies_advanced';

export const inputSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  include_historical: z.boolean().default(true),
  anomaly_types: z.array(z.string()).optional(),
  min_confidence: z.number().min(0).max(1).default(0.7),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  anomalies: z.array(z.object({
    type: z.string(),
    severity: z.string(),
    confidence: z.number(),
    description: z.string(),
    recommendation: z.string(),
  })),
  statistics: z.object({
    total_transactions: z.number(),
    anomaly_rate: z.number(),
    avg_confidence: z.number(),
  }),
  recommendations: z.array(z.string()),
});

export async function execute(input: any, ctx: any) {
  const detector = new AnomalyDetector();
  const client = getSupabaseServerClient();
  
  // Get transactions for the period
  const { data: transactions } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', ctx.userId)
    .gte('date', input.period_start)
    .lte('date', input.period_end);
  
  if (!transactions || transactions.length === 0) {
    return {
      ok: true,
      anomalies: [],
      statistics: {
        total_transactions: 0,
        anomaly_rate: 0,
        avg_confidence: 0,
      },
      recommendations: ['No transactions found for the specified period'],
    };
  }
  
  // Get historical data if requested
  let historical: any[] = [];
  if (input.include_historical) {
    const historicalStart = new Date(input.period_start);
    historicalStart.setMonth(historicalStart.getMonth() - 6); // 6 months back
    
    const { data: histData } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', ctx.userId)
      .gte('date', historicalStart.toISOString().split('T')[0])
      .lt('date', input.period_start);
    
    historical = histData || [];
  }
  
  // Run anomaly detection
  const result = await detector.detectAnomalies(
    transactions,
    historical,
    ctx.orgId
  );
  
  // Filter by confidence and types if specified
  let filteredAnomalies = result.anomalies.filter(
    a => a.confidence >= input.min_confidence
  );
  
  if (input.anomaly_types && input.anomaly_types.length > 0) {
    filteredAnomalies = filteredAnomalies.filter(
      a => input.anomaly_types.includes(a.type)
    );
  }
  
  return {
    ok: true,
    anomalies: filteredAnomalies.map(a => ({
      type: a.type,
      severity: a.severity,
      confidence: a.confidence,
      description: a.description,
      recommendation: a.recommendation,
    })),
    statistics: result.statistics,
    recommendations: result.recommendations,
  };
}

export const metadata = {
  name: 'Detect Anomalies (Advanced)',
  description: 'Run advanced anomaly detection with ML models',
  category: 'analytics',
  requiresConfirmation: false,
  costly: true,
  timeout: 60000,
};
