import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { amortize } from '../../../../netlify/functions/_shared/loanForecast';

export const id = 'finley_debt_payoff_forecast';

/** Used only when the customer gives no rate — always flagged in `assumptions` and `rateAssumed`. */
export const DEFAULT_DEBT_APR = 0.2;
const MAX_MONTHS = 600; // 50 years

export const inputSchema = z.object({
  balance: z.number().positive('Balance must be greater than 0'),
  monthlyPayment: z.number().positive('Monthly payment must be greater than 0'),
  annualInterestRate: z.number().min(0).max(1).optional(), // e.g. 0.1999 for 19.99% APR
});

export const outputSchema = z.object({
  monthsToPayoff: z.number().nullable(),
  totalInterestPaid: z.number().nullable(),
  totalPaid: z.number().nullable(),
  projectionTimeline: z.array(z.object({
    monthIndex: z.number(),
    remainingBalance: z.number(),
  })),
  isPayoffPossible: z.boolean(),
  /** True when no rate was given and DEFAULT_DEBT_APR was assumed. */
  rateAssumed: z.boolean(),
  errorMessage: z.string().optional(),
  assumptions: z.array(z.string()),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Forecast debt payoff timeline (forecast verification 2026-11-27: shared amortization routine;
 * total paid = balance + interest; the final payment is only what is owed; no 10-year cutoff
 * reported as "impossible"; a default rate is always flagged).
 *
 * Use this when users ask questions like:
 * - "How long will it take to pay off my $2,000 credit card if I pay $200/month?"
 * - "How much interest will I pay?"
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { balance, monthlyPayment } = input;
    const rateAssumed = input.annualInterestRate === undefined;
    const annualInterestRate = rateAssumed ? DEFAULT_DEBT_APR : (input.annualInterestRate as number);
    void ctx;

    const assumptions = [
      rateAssumed
        ? `No interest rate was given, so ${(annualInterestRate * 100).toFixed(1)}% APR (a typical credit card rate) was assumed — give your actual rate for a better estimate`
        : `Interest rate assumed constant at ${(annualInterestRate * 100).toFixed(2)}% APR, charged monthly (APR ÷ 12)`,
      'The same payment is made every month on time; no missed payments',
      'No new purchases, fees or charges are added to the balance',
      'Estimate only — actual results depend on these assumptions holding',
    ];

    const monthlyInterest = balance * (annualInterestRate / 12);
    const result = amortize({ principal: balance, rPeriod: annualInterestRate / 12, payment: monthlyPayment, maxPeriods: MAX_MONTHS });

    if (!result.payable) {
      const coversInterest = monthlyPayment > monthlyInterest;
      return Ok({
        monthsToPayoff: null,
        totalInterestPaid: null,
        totalPaid: null,
        projectionTimeline: [],
        isPayoffPossible: false,
        rateAssumed,
        errorMessage: coversInterest
          ? `At $${monthlyPayment.toFixed(2)} a month this balance would take more than ${MAX_MONTHS / 12} years to pay off.`
          : `A payment of $${monthlyPayment.toFixed(2)} doesn't cover the monthly interest of about $${monthlyInterest.toFixed(2)}, so the balance would never go down. At least $${(monthlyInterest + 0.01).toFixed(2)} a month is needed to make progress.`,
        assumptions,
      });
    }

    // months 1–12, then every 3rd month, and the final month (once)
    const timeline = result.balances
      .map((b, i) => ({ monthIndex: i + 1, remainingBalance: Math.max(0, money(b)) }))
      .filter(p => p.monthIndex <= 12 || p.monthIndex % 3 === 0 || p.monthIndex === result.periods);

    return Ok({
      monthsToPayoff: result.periods,
      totalInterestPaid: money(result.totalInterest),
      totalPaid: money(result.totalPaid),
      projectionTimeline: timeline,
      isPayoffPossible: true,
      rateAssumed,
      assumptions,
    });
  } catch (error) {
    console.error('[Finley Debt Payoff] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Finley Debt Payoff Forecast',
  description: 'Estimate how long it may take to pay off a debt given balance, monthly payment, and interest rate. Returns month-by-month projection showing remaining balance over time, with stated assumptions. Results are estimates that depend on inputs remaining unchanged.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'forecasting',
};
