import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { amortize } from '../../../../netlify/functions/_shared/loanForecast';

export const id = 'analytics_forecast';

export const inputSchema = z.object({
  currentBalance: z.number().optional(),
  monthlyPayment: z.number().optional(),
  annualRate: z.number().optional(), // Annual interest rate as percentage (e.g., 18.99)
  timeframe: z.enum(['3months', '1year', '5years']).default('1year'),
  monthlySpending: z.number().optional(), // Average monthly spending (customer-provided)
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
    /** Which inputs the estimate rests on (replaces an invented 0–100 "confidence" score). */
    basedOn: z.array(z.string()),
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

const money = (n: number) => Math.round(n * 100) / 100;
const MAX_MONTHS = 600;

/**
 * Forecast scenarios from the figures given (forecast verification 2026-11-27):
 *  - payoff time and interest come from the shared amortization routine (the previous
 *    balance ÷ (payment − first-month interest) shortcut held interest at its first-month level, which
 *    overstated months and interest — e.g. $5,000 at 18% paying $200: 40 months vs the true 32);
 *  - "no payments" growth compounds MONTHLY, consistent with the payoff maths (was annual);
 *  - the required payment uses the standard annuity formula (0% handled);
 *  - no invented confidence score; `basedOn` lists the inputs used.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  void ctx; // pure calculation from the given figures; no customer data is read
  try {
    const { currentBalance, monthlyPayment, annualRate, timeframe, monthlySpending, structuredData } = input;

    const insights: string[] = [];
    const basedOn: string[] = [];
    let projectedBalance: number | undefined;
    let payoffTimeMonths: number | undefined;
    let totalInterest: number | undefined;
    let monthlyPaymentNeeded: number | undefined;
    let spendingProjection: { projectedMonthly: number; projectedYearly: number } | undefined;

    const balance = currentBalance ?? structuredData?.balances?.current ?? structuredData?.balances?.new ?? 0;
    const rate = annualRate ?? structuredData?.interestRates?.annual ?? structuredData?.interestRates?.current ?? 0;
    const payment = monthlyPayment ?? 0;
    const avgSpending = monthlySpending ?? 0;
    if (balance > 0) basedOn.push(`balance $${balance.toFixed(2)}`);
    if (rate > 0) basedOn.push(`rate ${rate}% a year`);
    if (payment > 0) basedOn.push(`payment $${payment.toFixed(2)} a month`);
    if (avgSpending > 0) basedOn.push(`spending $${avgSpending.toFixed(2)} a month (as given)`);

    const years = timeframe === '3months' ? 0.25 : timeframe === '1year' ? 1 : 5;
    const months = Math.round(years * 12);
    const monthlyRate = rate / 12 / 100;

    // 1. Payoff time and interest (exact, period by period)
    if (balance > 0 && payment > 0) {
      const a = amortize({ principal: balance, rPeriod: monthlyRate, payment, maxPeriods: MAX_MONTHS });
      if (a.payable) {
        payoffTimeMonths = a.periods;
        totalInterest = money(a.totalInterest);
        insights.push(`At $${payment.toFixed(2)} a month, it would take about ${a.periods} months to pay off, with about $${totalInterest.toFixed(2)} in interest (if the rate and payment stay the same).`);
      } else if (payment <= balance * monthlyRate) {
        insights.push(`⚠️ A payment of $${payment.toFixed(2)} doesn't cover the monthly interest (about $${(balance * monthlyRate).toFixed(2)}), so the balance would not go down.`);
      } else {
        insights.push(`At $${payment.toFixed(2)} a month, payoff would take more than ${MAX_MONTHS / 12} years.`);
      }
    }

    // 2. Balance with no payments (monthly compounding)
    if (balance > 0 && rate > 0) {
      projectedBalance = money(balance * Math.pow(1 + monthlyRate, months));
      insights.push(`With no payments, the balance would grow to about $${projectedBalance.toFixed(2)} in ${months} months ($${(projectedBalance - balance).toFixed(2)} in interest), if the rate stays the same.`);
    }

    // 3. Payment needed to pay off within the timeframe (annuity formula; 0% = straight division)
    if (balance > 0 && months > 0) {
      monthlyPaymentNeeded = money(monthlyRate > 0 ? (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)) : balance / months);
      insights.push(`To pay it off in ${months} months, the payment would be about $${monthlyPaymentNeeded.toFixed(2)} a month (if the rate stays the same).`);
    }

    // 4. Spending projection (customer-provided average, not an engine figure)
    if (avgSpending > 0) {
      spendingProjection = { projectedMonthly: avgSpending, projectedYearly: money(avgSpending * 12) };
      insights.push(`If spending stays at the $${avgSpending.toFixed(2)} a month you mentioned, that is about $${spendingProjection.projectedYearly.toFixed(2)} a year.`);
    }

    const formulas = {
      payoffTime: payoffTimeMonths ? `month-by-month: interest = balance × ${rate}%/12; balance = balance + interest − payment, until paid off = ${payoffTimeMonths} months` : undefined,
      futureBalance: projectedBalance ? `future_balance = ${balance} × (1 + ${rate}%/12)^${months} = ${projectedBalance.toFixed(2)}` : undefined,
      monthlyPayment: monthlyPaymentNeeded
        ? (monthlyRate > 0
          ? `payment = ${balance} × r / (1 − (1 + r)^−${months}), r = ${rate}%/12 → ${monthlyPaymentNeeded.toFixed(2)}`
          : `payment = ${balance} / ${months} = ${monthlyPaymentNeeded.toFixed(2)}`)
        : undefined,
    };

    const assumptions: string[] = [];
    assumptions.push(rate > 0 ? `Interest rate assumed constant at ${rate}% a year, charged monthly (rate ÷ 12)` : 'No interest rate given — 0% assumed');
    if (payment > 0) assumptions.push(`Payment assumed constant at $${payment.toFixed(2)} every month`);
    assumptions.push('Assumed: no new charges, fees or missed payments');
    if (avgSpending > 0) assumptions.push('Spending assumed to stay at the average given');
    assumptions.push('Estimates only — actual results depend on these assumptions holding');

    return Ok({
      ok: true,
      forecast: { timeframe, projectedBalance, payoffTimeMonths, totalInterest, monthlyPaymentNeeded, spendingProjection, insights, basedOn, assumptions },
      formulas,
    });
  } catch (error) {
    console.error('[Analytics Forecast] Error:', error);
    return Err(new Error(`Forecast calculation failed: ${(error as Error)?.message}`));
  }
}
