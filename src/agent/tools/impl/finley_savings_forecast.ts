import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'finley_savings_forecast';

export const inputSchema = z.object({
  startingBalance: z.number().min(0).optional().default(0),
  monthlyContribution: z.number().min(0, 'Monthly contribution must be 0 or greater'),
  months: z.number().int().positive('Months must be a positive integer'),
  annualInterestRate: z.number().min(0).max(1).optional().default(0.04), // Default 4% APR
});

export const outputSchema = z.object({
  endingBalance: z.number(),
  totalContributions: z.number(),
  totalGrowth: z.number(),
  timeline: z.array(z.object({
    monthIndex: z.number(),
    balance: z.number(),
  })),
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
    const { startingBalance, monthlyContribution, months, annualInterestRate } = input;
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
    });

  } catch (error) {
    console.error('[Finley Savings Forecast] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Finley Savings Forecast',
  description: 'Calculate how much savings will grow over time given starting balance, monthly contributions, and interest rate. Returns month-by-month projection showing balance growth. Use this when users ask about savings goals, "how much will I have saved", or future savings projections.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'forecasting',
};





