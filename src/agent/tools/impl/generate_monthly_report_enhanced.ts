import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'generate_monthly_report_enhanced';

export const inputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  format: z.enum(['pdf', 'excel', 'csv', 'json']).default('pdf'),
  includeCharts: z.boolean().default(true),
  includeTrends: z.boolean().default(true),
  compareLastMonth: z.boolean().default(true),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  reportUrl: z.string(),
  format: z.string(),
  summary: z.object({
    totalSpent: z.number(),
    transactionCount: z.number(),
    topCategory: z.string(),
    avgTransaction: z.number(),
    monthOverMonth: z.number(),
  }),
  insights: z.array(z.string()),
  categories: z.record(z.any()),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { month, format, includeCharts, includeTrends, compareLastMonth } = input;
    
    // Use analytics cache for performance
    const client = getSupabaseServerClient();
    
    const { data: currentMonth } = await client
      .from('analytics_cache')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('period', month);
    
    let previousMonth: any[] = [];
    if (compareLastMonth) {
      const prevMonthStr = getPreviousMonth(month);
      const { data } = await client
        .from('analytics_cache')
        .select('*')
        .eq('user_id', ctx.userId)
        .eq('period', prevMonthStr);
      previousMonth = data || [];
    }
    
    // Calculate totals and trends
    const analysis = analyzeSpending(currentMonth || [], previousMonth);
    
    // Get detailed transactions for report
    const { data: transactions } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', ctx.userId)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`)
      .order('date', { ascending: false});
    
    let reportUrl: string;
    
    switch (format) {
      case 'pdf':
        reportUrl = await generatePDFReport({
          month,
          transactions: transactions || [],
          analysis,
          includeCharts,
        });
        break;
        
      case 'excel':
        reportUrl = await generateExcelReport({
          month,
          transactions: transactions || [],
          analysis,
        });
        break;
        
      case 'csv':
        reportUrl = await generateCSVReport(transactions || []);
        break;
        
      case 'json':
        reportUrl = await saveJSON({ analysis, transactions});
        break;
    }
    
    // Generate insights
    const insights = generateInsights(analysis);
    
    return Ok({
      ok: true,
      reportUrl,
      format,
      summary: {
        totalSpent: analysis.total,
        transactionCount: transactions?.length || 0,
        topCategory: analysis.topCategory || 'Unknown',
        avgTransaction: analysis.avgTransaction,
        monthOverMonth: analysis.changePercent,
      },
      insights,
      categories: analysis.byCategory,
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function analyzeSpending(current: any[], previous: any[]): any {
  const byCategory: Record<string, any> = {};
  let total = 0;
  
  for (const item of current) {
    byCategory[item.category] = {
      amount: item.total_amount,
      count: item.transaction_count,
      avg: item.total_amount / item.transaction_count,
    };
    total += item.total_amount;
  }
  
  // Add trends
  for (const item of previous) {
    if (byCategory[item.category]) {
      byCategory[item.category].previousAmount = item.total_amount;
      byCategory[item.category].change = 
        ((byCategory[item.category].amount - item.total_amount) / item.total_amount) * 100;
    }
  }
  
  // Find top category
  const topCategory = Object.entries(byCategory)
    .sort(([, a]: any, [, b]: any) => b.amount - a.amount)[0]?.[0];
  
  const prevTotal = previous.reduce((sum, item) => sum + item.total_amount, 0);
  const totalTransactions = current.reduce((sum, item) => sum + item.transaction_count, 0);
  
  return {
    total,
    byCategory,
    topCategory,
    avgTransaction: totalTransactions > 0 ? total / totalTransactions : 0,
    changePercent: prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0,
  };
}

async function generatePDFReport(data: any): Promise<string> {
  // Mock implementation - in production, use PDF generation library
  const filename = `report_${data.month}_${Date.now()}.pdf`;
  const path = `reports/${data.userId}/${filename}`;
  
  const client = getSupabaseServerClient();
  
  // Create mock PDF content
  const pdfContent = `Monthly Financial Report - ${data.month}
  
Total Spent: $${data.analysis.total.toFixed(2)}
Transactions: ${data.transactions.length}

Spending by Category:
${Object.entries(data.analysis.byCategory).map(([cat, info]: any) => 
  `${cat}: $${info.amount.toFixed(2)} (${info.count} transactions)`
).join('\n')}`;
  
  const { error: uploadError } = await client
    .storage
    .from('reports')
    .upload(path, pdfContent, {
      contentType: 'application/pdf',
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }
  
  // Generate signed URL
  const { data: urlData, error: urlError } = await client
    .storage
    .from('reports')
    .createSignedUrl(path, 86400); // 24 hours
  
  if (urlError || !urlData) {
    throw new Error('Failed to generate download URL');
  }
  
  return urlData.signedUrl;
}

async function generateExcelReport(data: any): Promise<string> {
  // Mock implementation - in production, use Excel generation library
  const filename = `report_${data.month}_${Date.now()}.xlsx`;
  const path = `reports/${data.userId}/${filename}`;
  
  const client = getSupabaseServerClient();
  
  // Create mock Excel content
  const excelContent = `Date,Vendor,Amount,Category
${data.transactions.map((tx: any) => 
  `${tx.date},${tx.vendor},${tx.amount},${tx.category}`
).join('\n')}`;
  
  const { error: uploadError } = await client
    .storage
    .from('reports')
    .upload(path, excelContent, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload Excel: ${uploadError.message}`);
  }
  
  // Generate signed URL
  const { data: urlData, error: urlError } = await client
    .storage
    .from('reports')
    .createSignedUrl(path, 86400);
  
  if (urlError || !urlData) {
    throw new Error('Failed to generate download URL');
  }
  
  return urlData.signedUrl;
}

async function generateCSVReport(transactions: any[]): Promise<string> {
  const filename = `report_${Date.now()}.csv`;
  const path = `reports/${Date.now()}/${filename}`;
  
  const client = getSupabaseServerClient();
  
  const csvContent = `Date,Vendor,Amount,Category
${transactions.map(tx => 
  `${tx.date},${tx.vendor},${tx.amount},${tx.category}`
).join('\n')}`;
  
  const { error: uploadError } = await client
    .storage
    .from('reports')
    .upload(path, csvContent, {
      contentType: 'text/csv',
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload CSV: ${uploadError.message}`);
  }
  
  // Generate signed URL
  const { data: urlData, error: urlError } = await client
    .storage
    .from('reports')
    .createSignedUrl(path, 86400);
  
  if (urlError || !urlData) {
    throw new Error('Failed to generate download URL');
  }
  
  return urlData.signedUrl;
}

async function saveJSON(data: any): Promise<string> {
  const filename = `report_${Date.now()}.json`;
  const path = `reports/${Date.now()}/${filename}`;
  
  const client = getSupabaseServerClient();
  
  const { error: uploadError } = await client
    .storage
    .from('reports')
    .upload(path, JSON.stringify(data, null, 2), {
      contentType: 'application/json',
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload JSON: ${uploadError.message}`);
  }
  
  // Generate signed URL
  const { data: urlData, error: urlError } = await client
    .storage
    .from('reports')
    .createSignedUrl(path, 86400);
  
  if (urlError || !urlData) {
    throw new Error('Failed to generate download URL');
  }
  
  return urlData.signedUrl;
}

function generateInsights(analysis: any): string[] {
  const insights: string[] = [];
  
  // Spending change insight
  if (analysis.changePercent > 10) {
    insights.push(`⚠️ Spending increased by ${analysis.changePercent.toFixed(1)}% compared to last month`);
  } else if (analysis.changePercent < -10) {
    insights.push(`✅ Great job! Spending decreased by ${Math.abs(analysis.changePercent).toFixed(1)}%`);
  }
  
  // Top category insight
  if (analysis.topCategory) {
    const topAmount = analysis.byCategory[analysis.topCategory].amount;
    const topPercent = (topAmount / analysis.total) * 100;
    insights.push(`📊 ${analysis.topCategory} was your biggest expense (${topPercent.toFixed(1)}% of total)`);
  }
  
  // Anomaly detection
  for (const [category, info] of Object.entries(analysis.byCategory)) {
    if (info.change && info.change > 50) {
      insights.push(`📈 Unusual increase in ${category} spending (+${info.change.toFixed(1)}%)`);
    }
  }
  
  // Budget insights
  if (analysis.total > 5000) {
    insights.push(`💰 High spending month - consider reviewing discretionary expenses`);
  }
  
  return insights;
}

export const metadata = {
  name: 'Enhanced Monthly Report',
  description: 'Generate comprehensive monthly financial reports with insights and trends',
  requiresConfirmation: false,
  dangerous: false,
  category: 'reporting',
};
