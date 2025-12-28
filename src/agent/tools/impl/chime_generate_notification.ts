import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { maskPII } from '../../../../netlify/functions/_shared/pii';

export const id = 'chime_generate_notification';

export const inputSchema = z.object({
  scenario: z.enum(['credit_card_due', 'upcoming_mortgage_payment', 'upcoming_car_payment', 'debt_progress_update']),
  merchant_name: z.string(),
  obligation_type: z.string().optional(), // 'mortgage', 'car_loan', etc.
  currency: z.string().optional().default('CAD'),
  amount: z.number(), // typical payment or due amount
  days_until_due: z.number().optional(), // for upcoming payment scenarios
  extra_payment_option: z.number().optional(), // e.g. 25 for "if you pay $25 more…"
  progress_summary: z.string().optional(), // optional human readable summary from Liberty/Finley/Crystal
  payoff_estimate: z.string().optional(), // e.g. "You're on track to be debt-free in 3.6 years"
  interest_savings_estimate: z.string().optional(), // e.g. "You could save about $480 in interest"
});

export const outputSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Generate safe notification text (title + body) for recurring debt/obligation scenarios
 * 
 * This tool takes structured scenario data and generates friendly, guardrail-compliant
 * notification text. It ensures:
 * - No full account numbers or card numbers
 * - Short, encouraging tone
 * - No shame or fear
 * - Max 1-2 short paragraphs, uses bullets when listing options
 * 
 * GUARDRAILS:
 * - All output text is passed through PII masking before return
 * - Merchant names are sanitized (no account numbers)
 * - Assumes all outbound notification text will pass through central guardrails pipeline
 * 
 * Use this when Chime needs to generate notification text from structured obligation data.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const {
      scenario,
      merchant_name,
      obligation_type,
      currency = 'CAD',
      amount,
      days_until_due,
      extra_payment_option,
      progress_summary,
      payoff_estimate,
      interest_savings_estimate,
    } = input;

    // Sanitize merchant name to remove any account numbers
    const safeMerchantName = sanitizeMerchantName(merchant_name);

    // Format currency symbol
    const currencySymbol = currency === 'CAD' ? '$' : currency === 'USD' ? '$' : currency;

    // Generate notification based on scenario
    let title: string;
    let body: string;

    switch (scenario) {
      case 'credit_card_due':
        title = generateCreditCardDueTitle(safeMerchantName, days_until_due);
        body = generateCreditCardDueBody(
          safeMerchantName,
          amount,
          days_until_due,
          extra_payment_option,
          interest_savings_estimate
        );
        break;

      case 'upcoming_mortgage_payment':
        title = generateUpcomingMortgageTitle(safeMerchantName, days_until_due);
        body = generateUpcomingMortgageBody(
          safeMerchantName,
          amount,
          days_until_due,
          extra_payment_option,
          progress_summary
        );
        break;

      case 'upcoming_car_payment':
        title = generateUpcomingCarPaymentTitle(safeMerchantName, days_until_due);
        body = generateUpcomingCarPaymentBody(
          safeMerchantName,
          amount,
          days_until_due,
          extra_payment_option,
          progress_summary
        );
        break;

      case 'debt_progress_update':
        title = generateDebtProgressTitle(safeMerchantName);
        body = generateDebtProgressBody(
          safeMerchantName,
          progress_summary,
          payoff_estimate,
          interest_savings_estimate
        );
        break;

      default:
        return Err(new Error(`Unknown scenario: ${scenario}`));
    }

    // Apply PII masking to both title and body
    // Note: This is a safety layer; the main outbound notification system will also
    // pass all text through the central guardrails pipeline
    const maskedTitle = maskPII(title, 'last4').masked;
    const maskedBody = maskPII(body, 'last4').masked;

    return Ok({
      title: maskedTitle.trim(),
      body: maskedBody.trim(),
    });
  } catch (error) {
    console.error('[Chime Generate Notification] Error:', error);
    return Err(error as Error);
  }
}

/**
 * Sanitize merchant name to remove account numbers
 */
function sanitizeMerchantName(merchantName: string): string {
  // Remove long sequences of digits (likely account numbers)
  return merchantName
    .replace(/\d{12,}/g, (match) => {
      // Keep last 4 digits for reference
      return `****${match.slice(-4)}`;
    })
    .trim();
}

/**
 * Generate title for credit card due notification
 */
function generateCreditCardDueTitle(merchantName: string, daysUntilDue: number | undefined): string {
  if (daysUntilDue !== undefined && daysUntilDue !== null) {
    if (daysUntilDue === 0) {
      return 'Credit card payment due today';
    } else if (daysUntilDue === 1) {
      return 'Credit card payment due tomorrow';
    } else {
      return `Credit card payment due in ${daysUntilDue} days`;
    }
  }
  return 'Credit card payment due soon';
}

/**
 * Generate body for credit card due notification
 */
function generateCreditCardDueBody(
  merchantName: string,
  amount: number,
  daysUntilDue: number | undefined,
  extraPaymentOption: number | undefined,
  interestSavingsEstimate: string | undefined
): string {
  const currencySymbol = '$';
  let body = `Your ${merchantName} payment of about ${currencySymbol}${amount.toFixed(2)}`;

  if (daysUntilDue !== undefined && daysUntilDue !== null) {
    if (daysUntilDue === 0) {
      body += ' is due today.';
    } else if (daysUntilDue === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is due in ${daysUntilDue} days.`;
    }
  } else {
    body += ' is coming up soon.';
  }

  // Add extra payment option if provided
  if (extraPaymentOption && interestSavingsEstimate) {
    body += `\n\n💡 If you can add ${currencySymbol}${extraPaymentOption.toFixed(2)} more this month, ${interestSavingsEstimate.toLowerCase()}.`;
  } else if (extraPaymentOption) {
    body += `\n\n💡 Adding an extra ${currencySymbol}${extraPaymentOption.toFixed(2)} this month could help you pay off faster.`;
  } else if (interestSavingsEstimate) {
    body += `\n\n💡 ${interestSavingsEstimate}`;
  }

  body += '\n\nOpen XspensesAI to see your exact payoff path.';

  return body;
}

/**
 * Generate title for upcoming mortgage payment notification
 */
function generateUpcomingMortgageTitle(merchantName: string, daysUntilDue: number | undefined): string {
  if (daysUntilDue !== undefined && daysUntilDue !== null) {
    if (daysUntilDue <= 3) {
      return 'Mortgage payment coming up';
    } else {
      return `Mortgage payment in ${daysUntilDue} days`;
    }
  }
  return 'Mortgage payment reminder';
}

/**
 * Generate body for upcoming mortgage payment notification
 */
function generateUpcomingMortgageBody(
  merchantName: string,
  amount: number,
  daysUntilDue: number | undefined,
  extraPaymentOption: number | undefined,
  progressSummary: string | undefined
): string {
  const currencySymbol = '$';
  let body = `Your usual ${merchantName} mortgage payment (${currencySymbol}${amount.toFixed(2)})`;

  if (daysUntilDue !== undefined && daysUntilDue !== null) {
    if (daysUntilDue === 0) {
      body += ' is due today.';
    } else if (daysUntilDue === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is coming out in ${daysUntilDue} days.`;
    }
  } else {
    body += ' is coming up soon.';
  }

  if (progressSummary) {
    body += `\n\n🎉 ${progressSummary}`;
  }

  if (extraPaymentOption) {
    body += `\n\n💡 Want to see what an extra ${currencySymbol}${extraPaymentOption.toFixed(2)} would do? Open XspensesAI to explore.`;
  }

  return body;
}

/**
 * Generate title for upcoming car payment notification
 */
function generateUpcomingCarPaymentTitle(merchantName: string, daysUntilDue: number | undefined): string {
  if (daysUntilDue !== undefined && daysUntilDue !== null) {
    if (daysUntilDue <= 3) {
      return 'Car payment coming up';
    } else {
      return `Car payment in ${daysUntilDue} days`;
    }
  }
  return 'Car payment reminder';
}

/**
 * Generate body for upcoming car payment notification
 */
function generateUpcomingCarPaymentBody(
  merchantName: string,
  amount: number,
  daysUntilDue: number | undefined,
  extraPaymentOption: number | undefined,
  progressSummary: string | undefined
): string {
  const currencySymbol = '$';
  let body = `Your usual ${merchantName} payment (~${currencySymbol}${amount.toFixed(2)})`;

  if (daysUntilDue !== undefined && daysUntilDue !== null) {
    if (daysUntilDue === 0) {
      body += ' is due today.';
    } else if (daysUntilDue === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is coming out in ${daysUntilDue} days.`;
    }
  } else {
    body += ' is coming up soon.';
  }

  if (progressSummary) {
    body += `\n\n🎉 ${progressSummary}`;
  }

  if (extraPaymentOption) {
    body += `\n\n💡 Want to see what an extra ${currencySymbol}${extraPaymentOption.toFixed(2)} would do?`;
  }

  body += '\n\nKeeping your payments going puts you ahead of schedule.';

  return body;
}

/**
 * Generate title for debt progress update notification
 */
function generateDebtProgressTitle(merchantName: string): string {
  return `You're making real debt progress`;
}

/**
 * Generate body for debt progress update notification
 */
function generateDebtProgressBody(
  merchantName: string,
  progressSummary: string | undefined,
  payoffEstimate: string | undefined,
  interestSavingsEstimate: string | undefined
): string {
  let body = `Since starting your plan, you've made great progress on your ${merchantName} debt.`;

  if (progressSummary) {
    body += `\n\n🎉 ${progressSummary}`;
  }

  if (payoffEstimate) {
    body += `\n\n📅 ${payoffEstimate}`;
  }

  if (interestSavingsEstimate) {
    body += `\n\n💰 ${interestSavingsEstimate}`;
  }

  body += '\n\nSmall, consistent payments are working—nice job!';

  return body;
}

export const metadata = {
  name: 'Chime Generate Notification',
  description: 'Generate safe notification text (title + body) for recurring debt/obligation scenarios. Takes structured scenario data and returns guardrail-compliant, friendly notification copy. Use when Chime needs to generate notification text from structured obligation data.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'notifications',
};

