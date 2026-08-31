import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'analytics_forecast';

export const inputSchema = z.object({
  currentBalance: z.number().optional(),
  monthlyPayment: z.number().optional(),
  annualRate: z.number().optional(), // Annual interest rate as percentage (e.g., 18.99)
  timeframe: z.enum(['3months', '1year', '5years']).default('1year'),
  monthlySpending: z.number().optional(), // Average monthly spending
  monthlyIncome: z.number().optional(),
  structuredData: z.object({
    balances: z.record(z.number()).optional(),
    transactions: z.array(z.object({
      date: z.string(),
      amount: z.number(),
      description: z.string().optional(),
    })).optional(),
    interestRates: z.record(z.number()).optional(),
    limits: z.record(z.number()).optional(),
  }).optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  forecast: z.object({
    timeframe: z.string(),
    projectedBalance: z.number().optional(),
    payoffTimeMonths: z.number().optional(),
    totalInterest: z.number().optional(),
    monthlyPaymentNeeded: z.number().optional(),
    spendingProjection: z.object({
      projectedMonthly: z.number(),
      projectedYearly: z.number(),
    }).optional(),
    insights: z.array(z.string()),
    confidence: z.number().min(0).max(100),
    assumptions: z.array(z.string()),
  }),
  formulas: z.object({
    payoffTime: z.string().optional(),
    futureBalance: z.string().optional(),
    monthlyPayment: z.string().optional(),
  }).optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Forecast financial scenarios using structured data from Prime/Byte or user-provided parameters
 * 
 * Calculates payoff timelines, future balances, and spending projections.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { 
      currentBalance, 
      monthlyPayment, 
      annualRate, 
      timeframe,
      monthlySpending,
      monthlyIncome,
      structuredData 
    } = input;

    const insights: string[] = [];
    let projectedBalance: number | undefined;
    let payoffTimeMonths: number | undefined;
    let totalInterest: number | undefined;
    let monthlyPaymentNeeded: number | undefined;
    let spendingProjection: { projectedMonthly: number; projectedYearly: number } | undefined;

    // Extract data from structured input if provided
    const balance = currentBalance || structuredData?.balances?.current || structuredData?.balances?.new || 0;
    const rate = annualRate || structuredData?.interestRates?.annual || structuredData?.interestRates?.current || 0;
    const payment = monthlyPayment || 0;
    const avgSpending = monthlySpending || 0;

    // Calculate timeframe in years
    const years = timeframe === '3months' ? 0.25 : timeframe === '1year' ? 1 : 5;
    const months = years * 12;

    // Calculate monthly interest rate
    const monthlyRate = rate / 12 / 100;

    // Formula 1: Payoff Time Calculation
    if (balance > 0 && payment > 0 && rate > 0) {
      const monthlyInterest = balance * monthlyRate;
      if (payment > monthlyInterest) {
        // Only calculate if payment exceeds interest
        payoffTimeMonths = balance / (payment - monthlyInterest);
        totalInterest = (payoffTimeMonths * payment) - balance;
        
        insights.push(`With a monthly payment of $${payment.toFixed(2)}, the estimated payoff period is approximately ${Math.ceil(payoffTimeMonths)} months (assuming rate and payment remain unchanged).`);
        insights.push(`Total interest paid: $${totalInterest.toFixed(2)}`);
      } else {
        insights.push(`⚠️ Your monthly payment ($${payment.toFixed(2)}) is less than the monthly interest ($${monthlyInterest.toFixed(2)}). You'll need to increase payments to pay off the balance.`);
      }
    }

    // Formula 2: Future Balance Projection
    if (balance > 0 && rate > 0) {
      projectedBalance = balance * Math.pow(1 + rate / 100, years);
      const growth = projectedBalance - balance;
      insights.push(`If no payments are made, the estimated balance would grow to approximately $${projectedBalance.toFixed(2)} in ${years} year${years !== 1 ? 's' : ''} ($${growth.toFixed(2)} in interest), assuming the rate remains unchanged.`);
    }

    // Formula 3: Monthly Payment Needed (for payoff in specified timeframe)
    if (balance > 0 && rate > 0 && months > 0) {
      const monthlyRateDecimal = monthlyRate;
      if (monthlyRateDecimal > 0) {
        const denominator = 1 - Math.pow(1 + monthlyRateDecimal, -months);
        if (denominator > 0) {
          monthlyPaymentNeeded = balance * monthlyRateDecimal / denominator;
          insights.push(`To pay off in ${months} months, the estimated required payment is approximately $${monthlyPaymentNeeded.toFixed(2)}/month (assuming rate remains unchanged).`);
        }
      }
    }

    // Spending Projection
    if (avgSpending > 0) {
      spendingProjection = {
        projectedMonthly: avgSpending,
        projectedYearly: avgSpending * 12,
      };
      insights.push(`Based on current patterns, projected annual spending: $${spendingProjection.projectedYearly.toFixed(2)}`);
    }

    // Calculate confidence based on data completeness
    let confidence = 50;
    if (balance > 0) confidence += 20;
    if (rate > 0) confidence += 15;
    if (payment > 0 || monthlyPaymentNeeded) confidence += 10;
    if (avgSpending > 0) confidence += 5;

    const formulas = {
      payoffTime: payoffTimeMonths ? `payoff_time = ${balance} / (${payment} - ${balance * monthlyRate}) = ${payoffTimeMonths.toFixed(2)} months` : undefined,
      futureBalance: projectedBalance ? `future_balance = ${balance} * (1 + ${rate}/100)^${years} = ${projectedBalance.toFixed(2)}` : undefined,
      monthlyPayment: monthlyPaymentNeeded ? `monthly_payment = ${balance} * (${rate/12}/100) / (1 - (1 + ${rate/12}/100)^-${months}) = ${monthlyPaymentNeeded.toFixed(2)}` : undefined,
    };

    const assumptions: string[] = [];
    if (rate > 0) assumptions.push(`Interest rate assumed constant at ${rate}%`);
    if (payment > 0) assumptions.push(`Payment assumed constant at $${payment.toFixed(2)}/month`);
    if (avgSpending > 0) assumptions.push('Spending assumed constant based on current average');
    assumptions.push('Estimates only — actual results depend on these assumptions holding');

    return Ok({
      ok: true,
      forecast: {
        timeframe,
        projectedBalance,
        payoffTimeMonths: payoffTimeMonths ? Math.ceil(payoffTimeMonths) : undefined,
        totalInterest,
        monthlyPaymentNeeded,
        spendingProjection,
        insights,
        confidence: Math.min(confidence, 100),
        assumptions,
      },
      formulas,
    });
  } catch (error: any) {
    console.error('[Analytics Forecast] Error:', error);
    return Err(new Error(`Forecast calculation failed: ${error.message}`));
  }
}






