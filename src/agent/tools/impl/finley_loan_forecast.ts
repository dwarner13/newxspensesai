import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { calculateLoanForecast, type LoanForecastInput } from '../../../../netlify/functions/_shared/loanForecast';

export const id = 'finley_loan_forecast';

export const inputSchema = z.object({
  // Either loanSnapshotId OR manual inputs
  loanSnapshotId: z.string().uuid().optional(),
  // Manual inputs (required if loanSnapshotId not provided)
  principal: z.number().positive('Principal must be greater than 0').optional(),
  annualRatePct: z.number().min(0).max(100, 'Rate must be between 0 and 100').optional(),
  paymentAmount: z.number().positive('Payment amount must be greater than 0').optional(),
  paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  // Extra payment (optional)
  extraPerPeriod: z.number().min(0).optional().default(0),
}).refine(
  (data) => {
    // Must have either loanSnapshotId OR all manual inputs
    if (data.loanSnapshotId) {
      return true; // loanSnapshotId provided, manual inputs not needed
    }
    // If no loanSnapshotId, all manual inputs required
    return (
      data.principal !== undefined &&
      data.annualRatePct !== undefined &&
      data.paymentAmount !== undefined &&
      data.paymentFrequency !== undefined
    );
  },
  {
    message: 'Either loanSnapshotId must be provided, or all of principal, annualRatePct, paymentAmount, and paymentFrequency must be provided',
  }
);

export const outputSchema = z.object({
  principal: z.number(),
  annualRatePct: z.number(),
  paymentAmount: z.number(),
  paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly']),
  extraPerPeriod: z.number(),
  periodsOriginal: z.number(),
  yearsOriginal: z.number(),
  interestOriginal: z.number(),
  periodsWithExtra: z.number(),
  yearsWithExtra: z.number(),
  interestWithExtra: z.number(),
  interestSaved: z.number(),
  yearsSaved: z.number(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Forecast loan/mortgage payoff scenarios with and without extra payments
 * 
 * Calculates payoff timelines and interest savings for loans/mortgages.
 * Can use a loan snapshot from OCR or manual inputs.
 * 
 * Use this when users ask about:
 * - Paying off a loan/mortgage faster
 * - Extra payments per week/month
 * - Interest saved, payoff dates, or "how much sooner"
 * - "What happens if I add $X extra per period?"
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const { loanSnapshotId, extraPerPeriod = 0 } = input;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Finley Loan Forecast] Executing for userId: ${userId}, loanSnapshotId: ${loanSnapshotId || 'none'}, extraPerPeriod: $${extraPerPeriod}`);
    }

    let principal: number;
    let annualRatePct: number;
    let paymentAmount: number;
    let paymentFrequency: 'weekly' | 'biweekly' | 'monthly';

    // If loanSnapshotId provided, look it up
    if (loanSnapshotId) {
      const supabase = getSupabaseServerClient();

      const { data: snapshot, error } = await supabase
        .from('loan_snapshots')
        .select('principal_cents, annual_rate_pct, payment_cents, payment_frequency')
        .eq('id', loanSnapshotId)
        .eq('user_id', userId) // Security: ensure user owns this snapshot
        .maybeSingle();

      if (error) {
        console.error('[Finley Loan Forecast] Database error:', error);
        return Err(new Error(`Failed to load loan snapshot: ${error.message}`));
      }

      if (!snapshot) {
        return Err(new Error('Loan snapshot not found or you do not have access to it'));
      }

      // Convert cents to dollars
      principal = snapshot.principal_cents / 100;
      annualRatePct = Number(snapshot.annual_rate_pct);
      paymentAmount = snapshot.payment_cents / 100;
      paymentFrequency = snapshot.payment_frequency as 'weekly' | 'biweekly' | 'monthly';

      console.log(`[Finley Loan Forecast] Loaded snapshot: principal=$${principal}, rate=${annualRatePct}%, payment=$${paymentAmount} ${paymentFrequency}`);
    } else {
      // Use manual inputs
      if (!input.principal || !input.annualRatePct || !input.paymentAmount || !input.paymentFrequency) {
        return Err(new Error('Missing required inputs: principal, annualRatePct, paymentAmount, and paymentFrequency are required when loanSnapshotId is not provided'));
      }

      principal = input.principal;
      annualRatePct = input.annualRatePct;
      paymentAmount = input.paymentAmount;
      paymentFrequency = input.paymentFrequency;
    }

    // Calculate forecast using shared helper
    const forecastInput: LoanForecastInput = {
      principal,
      annualRatePct,
      paymentAmount,
      paymentFrequency,
      extraPerPeriod,
    };

    const result = calculateLoanForecast(forecastInput);

    // Check if payment is too small (will never pay off)
    if (result.periodsOriginal >= 40 * (paymentFrequency === 'weekly' ? 52 : paymentFrequency === 'biweekly' ? 26 : 12)) {
      return Err(new Error(
        `Your payment of $${paymentAmount.toFixed(2)} per ${paymentFrequency} is too small to ever pay off this loan. ` +
        `The interest alone exceeds your payment. Consider increasing your payment amount.`
      ));
    }

    return Ok(result);

  } catch (error) {
    console.error('[Finley Loan Forecast] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Finley Loan Forecast',
  description: 'Calculate loan/mortgage payoff timelines with and without extra payments. Returns payoff times, total interest, and interest savings. Use when users ask about paying off loans faster, extra payments, interest saved, or payoff dates. Can use a loan snapshot from OCR or manual inputs.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'forecasting',
};



