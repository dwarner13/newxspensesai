import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'analytics_extract_patterns';

export const inputSchema = z.object({
  structuredData: z.object({
    balances: z.record(z.number()).optional(),
    transactions: z.array(z.object({
      date: z.string(),
      amount: z.number(),
      description: z.string().optional(),
      merchant: z.string().optional(),
      category: z.string().optional(),
    })).optional(),
    interestRates: z.record(z.number()).optional(),
    limits: z.record(z.number()).optional(),
  }),
  analysisType: z.enum(['spending', 'recurring', 'anomalies', 'trends', 'all']).default('all'),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  patterns: z.object({
    spending: z.object({
      totalSpending: z.number(),
      averageMonthly: z.number(),
      topCategories: z.array(z.object({
        category: z.string(),
        amount: z.number(),
        count: z.number(),
      })),
      topMerchants: z.array(z.object({
        merchant: z.string(),
        amount: z.number(),
        count: z.number(),
      })),
    }).optional(),
    recurring: z.array(z.object({
      description: z.string(),
      amount: z.number(),
      frequency: z.string(),
      nextExpectedDate: z.string().optional(),
    })).optional(),
    anomalies: z.array(z.object({
      type: z.string(),
      description: z.string(),
      amount: z.number(),
      date: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })).optional(),
    trends: z.object({
      spendingTrend: z.enum(['increasing', 'decreasing', 'stable']),
      averageChange: z.number(),
      projectedNextMonth: z.number().optional(),
    }).optional(),
    risks: z.array(z.object({
      type: z.string(),
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      recommendation: z.string(),
    })).optional(),
  }),
  summary: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Extract patterns from structured financial data (from Prime/Byte OCR/Vision results)
 * 
 * Identifies spending patterns, recurring transactions, anomalies, trends, and risks.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { structuredData, analysisType } = input;
    const { transactions = [], balances = {}, interestRates = {}, limits = {} } = structuredData;

    const patterns: any = {};
    const insights: string[] = [];

    // Spending Analysis
    if (analysisType === 'spending' || analysisType === 'all') {
      const totalSpending = transactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      const categoryMap = new Map<string, { amount: number; count: number }>();
      const merchantMap = new Map<string, { amount: number; count: number }>();

      transactions.forEach(tx => {
        if (tx.amount < 0) {
          const absAmount = Math.abs(tx.amount);
          const category = tx.category || 'Uncategorized';
          const merchant = tx.merchant || tx.description || 'Unknown';

          categoryMap.set(category, {
            amount: (categoryMap.get(category)?.amount || 0) + absAmount,
            count: (categoryMap.get(category)?.count || 0) + 1,
          });

          merchantMap.set(merchant, {
            amount: (merchantMap.get(merchant)?.amount || 0) + absAmount,
            count: (merchantMap.get(merchant)?.count || 0) + 1,
          });
        }
      });

      const topCategories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const topMerchants = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({ merchant, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const months = new Set(transactions.map(tx => tx.date.substring(0, 7))).size || 1;
      const averageMonthly = totalSpending / months;

      patterns.spending = {
        totalSpending,
        averageMonthly,
        topCategories,
        topMerchants,
      };

      insights.push(`Total spending: $${totalSpending.toFixed(2)} (avg $${averageMonthly.toFixed(2)}/month)`);
      if (topCategories.length > 0) {
        insights.push(`Top category: ${topCategories[0].category} ($${topCategories[0].amount.toFixed(2)})`);
      }
    }

    // Recurring Transactions
    if (analysisType === 'recurring' || analysisType === 'all') {
      const recurringMap = new Map<string, { amounts: number[]; dates: string[] }>();

      transactions.forEach(tx => {
        const key = tx.merchant || tx.description || '';
        if (key) {
          if (!recurringMap.has(key)) {
            recurringMap.set(key, { amounts: [], dates: [] });
          }
          const entry = recurringMap.get(key)!;
          entry.amounts.push(Math.abs(tx.amount));
          entry.dates.push(tx.date);
        }
      });

      const recurring: any[] = [];
      recurringMap.forEach((data, key) => {
        if (data.amounts.length >= 2) {
          const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
          const dates = data.dates.sort();
          const lastDate = new Date(dates[dates.length - 1]);
          const nextExpected = new Date(lastDate);
          nextExpected.setMonth(nextExpected.getMonth() + 1);

          recurring.push({
            description: key,
            amount: avgAmount,
            frequency: 'monthly',
            nextExpectedDate: nextExpected.toISOString().split('T')[0],
          });
        }
      });

      patterns.recurring = recurring;
      if (recurring.length > 0) {
        insights.push(`Found ${recurring.length} recurring transactions (subscriptions/bills)`);
      }
    }

    // Anomalies Detection
    if (analysisType === 'anomalies' || analysisType === 'all') {
      const amounts = transactions.map(tx => Math.abs(tx.amount));
      if (amounts.length > 0) {
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        const anomalies: any[] = [];
        transactions.forEach(tx => {
          const absAmount = Math.abs(tx.amount);
          if (stdDev > 0) {
            const zScore = (absAmount - avgAmount) / stdDev;
            
            if (zScore > 2) {
              anomalies.push({
                type: 'spending_spike',
                description: tx.description || tx.merchant || 'Transaction',
                amount: tx.amount,
                date: tx.date,
                severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
              });
            }
          }
        });

        patterns.anomalies = anomalies;
        if (anomalies.length > 0) {
          insights.push(`Detected ${anomalies.length} spending anomalies`);
        }
      }
    }

    // Trends Analysis
    if (analysisType === 'trends' || analysisType === 'all') {
      const monthlyTotals = new Map<string, number>();
      transactions.forEach(tx => {
        if (tx.amount < 0) {
          const month = tx.date.substring(0, 7);
          monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + Math.abs(tx.amount));
        }
      });

      const sortedMonths = Array.from(monthlyTotals.entries()).sort();
      if (sortedMonths.length >= 2) {
        const recent = sortedMonths.slice(-2);
        const change = recent[1][1] - recent[0][1];
        const percentChange = (change / recent[0][1]) * 100;

        patterns.trends = {
          spendingTrend: percentChange > 5 ? 'increasing' : percentChange < -5 ? 'decreasing' : 'stable',
          averageChange: percentChange,
          projectedNextMonth: recent[1][1] * (1 + percentChange / 100),
        };

        insights.push(`Spending trend: ${patterns.trends.spendingTrend} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`);
      }
    }

    // Risk Assessment
    if (analysisType === 'all') {
      const risks: any[] = [];
      const currentBalance = balances.current || balances.new || 0;
      const creditLimit = limits.credit || limits.max || 0;
      const interestRate = interestRates.annual || interestRates.current || 0;

      if (creditLimit > 0 && currentBalance > 0) {
        const utilization = (currentBalance / creditLimit) * 100;
        if (utilization > 80) {
          risks.push({
            type: 'high_utilization',
            description: `Credit utilization is ${utilization.toFixed(1)}% (above 80% threshold)`,
            severity: 'high',
            recommendation: 'Consider paying down balance to improve credit score',
          });
        } else if (utilization > 50) {
          risks.push({
            type: 'moderate_utilization',
            description: `Credit utilization is ${utilization.toFixed(1)}%`,
            severity: 'medium',
            recommendation: 'Aim to keep utilization below 30% for optimal credit health',
          });
        }
      }

      if (interestRate > 20) {
        risks.push({
          type: 'high_interest',
          description: `High interest rate: ${interestRate.toFixed(2)}%`,
          severity: 'high',
          recommendation: 'Consider balance transfer or refinancing options',
        });
      }

      patterns.risks = risks;
      if (risks.length > 0) {
        insights.push(`Identified ${risks.length} financial risk${risks.length !== 1 ? 's' : ''}`);
      }
    }

    const summary = insights.length > 0 
      ? insights.join(' | ')
      : 'No significant patterns detected in the provided data.';

    return Ok({
      ok: true,
      patterns,
      summary,
    });
  } catch (error: any) {
    console.error('[Analytics Extract Patterns] Error:', error);
    return Err(new Error(`Pattern extraction failed: ${error.message}`));
  }
}






