import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'detect_anomalies';

export const inputSchema = z.object({
  timeframe: z.enum(['week', 'month', 'quarter']).default('month'),
  threshold: z.number().min(0.1).max(5.0).default(2.0), // Standard deviations
  categories: z.array(z.string()).optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  anomalies: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    amount: z.number(),
    date: z.string(),
    vendor: z.string().optional(),
    category: z.string().optional(),
    expectedRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
  })),
  summary: z.object({
    totalAnomalies: z.number(),
    highSeverity: z.number(),
    totalImpact: z.number(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { timeframe, threshold, categories } = input;
    
    const client = getSupabaseServerClient();
    
    // Get historical data for baseline
    const historicalData = await getHistoricalData(client, ctx.userId, timeframe, categories);
    
    // Calculate baseline statistics
    const baseline = calculateBaseline(historicalData);
    
    // Get recent transactions
    const recentData = await getRecentTransactions(client, ctx.userId, timeframe, categories);
    
    // Detect anomalies
    const anomalies = detectAnomalies(recentData, baseline, threshold);
    
    // Calculate summary
    const summary = {
      totalAnomalies: anomalies.length,
      highSeverity: anomalies.filter(a => a.severity === 'high').length,
      totalImpact: anomalies.reduce((sum, a) => sum + Math.abs(a.amount), 0),
    };
    
    return Ok({
      ok: true,
      anomalies,
      summary,
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

async function getHistoricalData(
  client: any,
  userId: string,
  timeframe: string,
  categories?: string[]
): Promise<any[]> {
  const endDate = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case 'week':
      startDate = new Date(endDate.getTime() - 8 * 7 * 24 * 60 * 60 * 1000); // 8 weeks
      break;
    case 'month':
      startDate = new Date(endDate.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // 6 months
      break;
    case 'quarter':
      startDate = new Date(endDate.getTime() - 4 * 90 * 24 * 60 * 60 * 1000); // 4 quarters
      break;
  }
  
  let query = client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lt('date', endDate.toISOString().split('T')[0]);
  
  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return data || [];
}

async function getRecentTransactions(
  client: any,
  userId: string,
  timeframe: string,
  categories?: string[]
): Promise<any[]> {
  const endDate = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case 'week':
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
  }
  
  let query = client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lt('date', endDate.toISOString().split('T')[0]);
  
  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return data || [];
}

function calculateBaseline(historicalData: any[]): any {
  const amounts = historicalData.map(tx => tx.amount);
  
  if (amounts.length === 0) {
    return { mean: 0, stdDev: 0, median: 0 };
  }
  
  // Calculate mean
  const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  
  // Calculate standard deviation
  const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate median
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const median = sortedAmounts.length % 2 === 0
    ? (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
    : sortedAmounts[Math.floor(sortedAmounts.length / 2)];
  
  return { mean, stdDev, median };
}

function detectAnomalies(recentData: any[], baseline: any, threshold: number): any[] {
  const anomalies: any[] = [];
  
  for (const tx of recentData) {
    const zScore = Math.abs(tx.amount - baseline.mean) / baseline.stdDev;
    
    if (zScore > threshold) {
      const severity = zScore > threshold * 2 ? 'high' : zScore > threshold * 1.5 ? 'medium' : 'low';
      
      anomalies.push({
        type: tx.amount > baseline.mean ? 'high_amount' : 'low_amount',
        description: `${tx.amount > baseline.mean ? 'Unusually high' : 'Unusually low'} transaction amount`,
        severity,
        amount: tx.amount,
        date: tx.date,
        vendor: tx.vendor,
        category: tx.category,
        expectedRange: {
          min: baseline.mean - baseline.stdDev * threshold,
          max: baseline.mean + baseline.stdDev * threshold,
        },
      });
    }
  }
  
  // Detect frequency anomalies
  const vendorCounts = new Map<string, number>();
  for (const tx of recentData) {
    if (tx.vendor) {
      vendorCounts.set(tx.vendor, (vendorCounts.get(tx.vendor) || 0) + 1);
    }
  }
  
  for (const [vendor, count] of vendorCounts) {
    if (count > 10) { // Arbitrary threshold for frequency
      anomalies.push({
        type: 'high_frequency',
        description: `Unusually frequent transactions at ${vendor}`,
        severity: 'medium',
        amount: 0,
        date: recentData[0].date,
        vendor,
        expectedRange: { min: 0, max: 5 },
      });
    }
  }
  
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

export const metadata = {
  name: 'Anomaly Detection',
  description: 'Detect unusual spending patterns and transaction anomalies',
  requiresConfirmation: false,
  dangerous: false,
  category: 'analytics',
};
