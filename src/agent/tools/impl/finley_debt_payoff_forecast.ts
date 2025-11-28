import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'finley_debt_payoff_forecast';

export const inputSchema = z.object({
  balance: z.number().positive('Balance must be greater than 0'),
  monthlyPayment: z.number().positive('Monthly payment must be greater than 0'),
  annualInterestRate: z.number().min(0).max(1).optional().default(0.2), // Default 20% APR
});

export const outputSchema = z.object({
  monthsToPayoff: z.number(),
  totalInterestPaid: z.number(),
  totalPaid: z.number(),
  projectionTimeline: z.array(z.object({
    monthIndex: z.number(),
    remainingBalance: z.number(),
  })),
  isPayoffPossible: z.boolean(),
  errorMessage: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Forecast debt payoff timeline
 * 
 * Calculates how long it will take to pay off a debt given a balance, monthly payment, and interest rate.
 * Returns a month-by-month projection showing remaining balance over time.
 * 
 * Use this when users ask questions like:
 * - "How long will it take to pay off my $2,000 credit card if I pay $200/month?"
 * - "When will my debt be paid off?"
 * - "How much interest will I pay?"
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { balance, monthlyPayment, annualInterestRate } = input;
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Finley Debt Payoff] Executing for userId: ${userId}, balance: $${balance}, monthlyPayment: $${monthlyPayment}, interestRate: ${(annualInterestRate * 100).toFixed(1)}%`);
    }

    // Convert annual interest rate to monthly
    const monthlyInterestRate = annualInterestRate / 12;

    // Check if payment is too small (doesn't cover interest)
    const monthlyInterest = balance * monthlyInterestRate;
    if (monthlyPayment <= monthlyInterest) {
      return Ok({
        monthsToPayoff: Infinity,
        totalInterestPaid: 0,
        totalPaid: 0,
        projectionTimeline: [],
        isPayoffPossible: false,
        errorMessage: `Your monthly payment of $${monthlyPayment.toFixed(2)} is too small. The monthly interest alone is $${monthlyInterest.toFixed(2)}. You need to pay at least $${(monthlyInterest + 0.01).toFixed(2)} per month to make progress.`,
      });
    }

    // Simulate month-by-month payoff
    let currentBalance = balance;
    let totalInterestPaid = 0;
    let totalPaid = 0;
    const timeline: { monthIndex: number; remainingBalance: number }[] = [];
    const maxMonths = 120; // Cap at 10 years for safety

    for (let month = 0; month < maxMonths; month++) {
      // Calculate interest for this month
      const interest = currentBalance * monthlyInterestRate;
      totalInterestPaid += interest;

      // Apply payment (interest first, then principal)
      const principalPayment = Math.min(monthlyPayment - interest, currentBalance);
      currentBalance -= principalPayment;
      totalPaid += monthlyPayment;

      // Record timeline (every month for first year, then quarterly)
      if (month < 12 || month % 3 === 0) {
        timeline.push({
          monthIndex: month + 1,
          remainingBalance: Math.max(0, Math.round(currentBalance * 100) / 100),
        });
      }

      // Check if paid off
      if (currentBalance <= 0.01) {
        timeline.push({
          monthIndex: month + 1,
          remainingBalance: 0,
        });
        return Ok({
          monthsToPayoff: month + 1,
          totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          projectionTimeline: timeline,
          isPayoffPossible: true,
        });
      }
    }

    // If we hit max months, return partial result
    return Ok({
      monthsToPayoff: maxMonths,
      totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      projectionTimeline: timeline,
      isPayoffPossible: false,
      errorMessage: `With your current payment of $${monthlyPayment.toFixed(2)}/month, it will take more than ${maxMonths} months (${(maxMonths / 12).toFixed(1)} years) to pay off this debt. Consider increasing your monthly payment to pay it off faster.`,
    });

  } catch (error) {
    console.error('[Finley Debt Payoff] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Finley Debt Payoff Forecast',
  description: 'Calculate how long it will take to pay off a debt given balance, monthly payment, and interest rate. Returns month-by-month projection showing remaining balance over time. Use this when users ask about debt payoff timelines, interest calculations, or "how long until paid off" questions.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'forecasting',
};





