import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'finley_savings_forecast';

export const inputSchema = z.object({
  startingBalance: z.number().min(0).optional().default(0),
  monthlyContribution: z.number().min(0, 'Monthly contribution must be 0 or greater'),
  months: z.number().int().positive('Months must be a positive integer'),
  annualInterestRate: z.number().min(0).max(1).optional(), // e.g. 0.04 for 4%; default flagged below
});

/** Used only when no rate is given — always flagged in `assumptions` and `rateAssumed`. */
export const DEFAULT_SAVINGS_APR = 0.04;

export const outputSchema = z.object({
  endingBalance: z.number(),
  totalContributions: z.number(),
  totalGrowth: z.number(),
  timeline: z.array(z.object({
    monthIndex: z.number(),
    balance: z.number(),
  })),
  /** True when no rate was given and DEFAULT_SAVINGS_APR was assumed. */
  rateAssumed: z.boolean(),
  assumptions: z.array(z.string()),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Forecast savings growth over time
 * 
 * Calculates how much savings will grow given starting balance, monthly contributions, and interest rate.
 * Returns a month-by-month projection showing balance growth over time.
 * 
 * Use this when users ask questions like:
 * - "If I save $300/month starting now, how much will I have by December?"
 * - "How much will I have saved in 2 years?"
 * - "What will my savings be worth in X months?"
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { startingBalance, monthlyContribution, months } = input;
    const rateAssumed = input.annualInterestRate === undefined;
    const annualInterestRate = rateAssumed ? DEFAULT_SAVINGS_APR : (input.annualInterestRate as number);
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Finley Savings Forecast] Executing for userId: ${userId}, startingBalance: $${startingBalance}, monthlyContribution: $${monthlyContribution}, months: ${months}, interestRate: ${(annualInterestRate * 100).toFixed(1)}%`);
    }

    // Convert annual interest rate to monthly
    const monthlyInterestRate = annualInterestRate / 12;

    // Simulate month-by-month growth
    let currentBalance = startingBalance;
    let totalContributions = startingBalance; // Include starting balance as initial contribution
    const timeline: { monthIndex: number; balance: number }[] = [];

    // Record starting point
    timeline.push({
      monthIndex: 0,
      balance: Math.round(currentBalance * 100) / 100,
    });

    for (let month = 1; month <= months; month++) {
      // Add monthly contribution at the start of the month
      currentBalance += monthlyContribution;
      totalContributions += monthlyContribution;

      // Apply interest at the end of the month (on the full balance including contribution)
      const interest = currentBalance * monthlyInterestRate;
      currentBalance += interest;

      // Record timeline (every month for first year, then quarterly, plus final month)
      if (month <= 12 || month % 3 === 0 || month === months) {
        timeline.push({
          monthIndex: month,
          balance: Math.round(currentBalance * 100) / 100,
        });
      }
    }

    const totalGrowth = currentBalance - totalContributions;

    return Ok({
      endingBalance: Math.round(currentBalance * 100) / 100,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalGrowth: Math.round(totalGrowth * 100) / 100,
      timeline,
      rateAssumed,
      assumptions: [
        rateAssumed
          ? `No interest rate was given, so ${(annualInterestRate * 100).toFixed(1)}% a year was assumed — give your account's actual rate for a better estimate`
          : `Interest rate assumed constant at ${(annualInterestRate * 100).toFixed(2)}% a year, compounded monthly (rate ÷ 12)`,
        `Each monthly contribution of $${monthlyContribution.toFixed(2)} is added at the start of the month and earns that month's interest`,
        'Interest is before tax (unless the account is tax-sheltered, e.g. a TFSA)',
        'No withdrawals during the projection period',
        'Estimate only — actual results depend on these assumptions holding',
      ],
    });

  } catch (error) {
    console.error('[Finley Savings Forecast] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Finley Savings Forecast',
  description: 'Estimate how savings may grow over time given starting balance, monthly contributions, and assumed interest rate. Returns month-by-month projection with stated assumptions. Results are estimates that depend on inputs remaining unchanged.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'forecasting',
};





