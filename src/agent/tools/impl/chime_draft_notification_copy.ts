import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'chime_draft_notification_copy';

export const inputSchema = z.object({
  type: z.enum(['upcoming_payment', 'credit_card_due', 'progress_milestone', 'payment_missed']),
  merchant_name: z.string(),
  amount: z.number().optional(),
  due_date: z.string().optional(), // ISO date string
  next_payment_date: z.string().optional(), // ISO date string
  impact_summary: z.string().optional(), // e.g. "extra $25 saves 7 months / $480 interest"
  days_until: z.number().optional(),
});

export const outputSchema = z.object({
  title: z.string(),
  body_in_app: z.string(),
  body_email: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Draft notification copy (title and body) for different channels
 * 
 * Generates friendly, hopeful notification text that respects guardrails:
 * - No full card or account numbers
 * - Friendly, non-shaming tone
 * - Short and clear
 * - No guarantees beyond what context provides
 * 
 * Use this when Chime needs to create or refine notification text for users.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { type, merchant_name, amount, due_date, next_payment_date, impact_summary, days_until } = input;

    // Sanitize merchant name (remove any account numbers)
    const safeMerchantName = sanitizeMerchantName(merchant_name);

    // Determine which date to use
    const paymentDate = due_date || next_payment_date;
    const daysUntil = days_until || (paymentDate ? calculateDaysUntil(paymentDate) : null);

    // Generate copy based on type
    let title: string;
    let bodyInApp: string;
    let bodyEmail: string;

    switch (type) {
      case 'upcoming_payment':
        title = generateUpcomingPaymentTitle(safeMerchantName, daysUntil, amount);
        bodyInApp = generateUpcomingPaymentBodyInApp(safeMerchantName, daysUntil, amount, paymentDate, impact_summary);
        bodyEmail = generateUpcomingPaymentBodyEmail(safeMerchantName, daysUntil, amount, paymentDate, impact_summary);
        break;

      case 'credit_card_due':
        title = generateCreditCardDueTitle(safeMerchantName, daysUntil);
        bodyInApp = generateCreditCardDueBodyInApp(safeMerchantName, daysUntil, amount, impact_summary);
        bodyEmail = generateCreditCardDueBodyEmail(safeMerchantName, daysUntil, amount, impact_summary);
        break;

      case 'progress_milestone':
        title = generateProgressMilestoneTitle(safeMerchantName, amount);
        bodyInApp = generateProgressMilestoneBodyInApp(safeMerchantName, amount, impact_summary);
        bodyEmail = generateProgressMilestoneBodyEmail(safeMerchantName, amount, impact_summary);
        break;

      case 'payment_missed':
        title = generatePaymentMissedTitle(safeMerchantName);
        bodyInApp = generatePaymentMissedBodyInApp(safeMerchantName, amount);
        bodyEmail = generatePaymentMissedBodyEmail(safeMerchantName, amount);
        break;

      default:
        title = `Payment Reminder: ${safeMerchantName}`;
        bodyInApp = `Your ${safeMerchantName} payment is coming up soon.`;
        bodyEmail = `Your ${safeMerchantName} payment is coming up soon.`;
    }

    return Ok({
      title: title.trim(),
      body_in_app: bodyInApp.trim(),
      body_email: bodyEmail.trim(),
    });
  } catch (error) {
    console.error('[Chime Draft Notification Copy] Error:', error);
    return Err(error as Error);
  }
}

/**
 * Generate title for upcoming payment notification
 */
function generateUpcomingPaymentTitle(merchantName: string, daysUntil: number | null, amount: number | undefined): string {
  if (daysUntil !== null && daysUntil !== undefined) {
    if (daysUntil === 0) {
      return `${merchantName} Payment Due Today`;
    } else if (daysUntil === 1) {
      return `${merchantName} Payment Due Tomorrow`;
    } else {
      return `${merchantName} Payment in ${daysUntil} Days`;
    }
  }
  return `${merchantName} Payment Coming Up`;
}

/**
 * Generate in-app body for upcoming payment
 */
function generateUpcomingPaymentBodyInApp(
  merchantName: string,
  daysUntil: number | null,
  amount: number | undefined,
  paymentDate: string | undefined,
  impactSummary: string | undefined
): string {
  let body = `Your ${merchantName} payment`;

  if (amount) {
    body += ` of $${amount.toFixed(2)}`;
  }

  if (daysUntil !== null && daysUntil !== undefined) {
    if (daysUntil === 0) {
      body += ' is due today.';
    } else if (daysUntil === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;
    }
  } else if (paymentDate) {
    const date = new Date(paymentDate);
    body += ` is scheduled for ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`;
  } else {
    body += ' is coming up soon.';
  }

  if (impactSummary) {
    body += `\n\n💡 ${impactSummary}`;
  }

  return body;
}

/**
 * Generate email body for upcoming payment
 */
function generateUpcomingPaymentBodyEmail(
  merchantName: string,
  daysUntil: number | null,
  amount: number | undefined,
  paymentDate: string | undefined,
  impactSummary: string | undefined
): string {
  let body = `Hi there,\n\nJust a friendly reminder that your ${merchantName} payment`;

  if (amount) {
    body += ` of $${amount.toFixed(2)}`;
  }

  if (daysUntil !== null && daysUntil !== undefined) {
    if (daysUntil === 0) {
      body += ' is due today.';
    } else if (daysUntil === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;
    }
  } else if (paymentDate) {
    const date = new Date(paymentDate);
    body += ` is scheduled for ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`;
  } else {
    body += ' is coming up soon.';
  }

  if (impactSummary) {
    body += `\n\n💡 Quick tip: ${impactSummary}`;
  }

  body += '\n\nStay on track! 💚';

  return body;
}

/**
 * Generate title for credit card due notification
 */
function generateCreditCardDueTitle(merchantName: string, daysUntil: number | null): string {
  if (daysUntil !== null && daysUntil !== undefined) {
    if (daysUntil === 0) {
      return `Credit Card Payment Due Today`;
    } else if (daysUntil === 1) {
      return `Credit Card Payment Due Tomorrow`;
    } else {
      return `Credit Card Payment in ${daysUntil} Days`;
    }
  }
  return `Credit Card Payment Reminder`;
}

/**
 * Generate in-app body for credit card due
 */
function generateCreditCardDueBodyInApp(
  merchantName: string,
  daysUntil: number | null,
  amount: number | undefined,
  impactSummary: string | undefined
): string {
  let body = `Your ${merchantName} credit card payment`;

  if (amount) {
    body += ` (minimum: $${amount.toFixed(2)})`;
  }

  if (daysUntil !== null && daysUntil !== undefined) {
    if (daysUntil === 0) {
      body += ' is due today.';
    } else if (daysUntil === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;
    }
  } else {
    body += ' is coming up soon.';
  }

  if (impactSummary) {
    body += `\n\n💡 ${impactSummary}`;
  }

  return body;
}

/**
 * Generate email body for credit card due
 */
function generateCreditCardDueBodyEmail(
  merchantName: string,
  daysUntil: number | null,
  amount: number | undefined,
  impactSummary: string | undefined
): string {
  let body = `Hi there,\n\nYour ${merchantName} credit card payment`;

  if (amount) {
    body += ` (minimum payment: $${amount.toFixed(2)})`;
  }

  if (daysUntil !== null && daysUntil !== undefined) {
    if (daysUntil === 0) {
      body += ' is due today.';
    } else if (daysUntil === 1) {
      body += ' is due tomorrow.';
    } else {
      body += ` is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;
    }
  } else {
    body += ' is coming up soon.';
  }

  if (impactSummary) {
    body += `\n\n💡 Did you know? ${impactSummary}`;
  }

  body += '\n\nStay on track! 💚';

  return body;
}

/**
 * Generate title for progress milestone
 */
function generateProgressMilestoneTitle(merchantName: string, amount: number | undefined): string {
  return `Great Progress on ${merchantName}!`;
}

/**
 * Generate in-app body for progress milestone
 */
function generateProgressMilestoneBodyInApp(
  merchantName: string,
  amount: number | undefined,
  impactSummary: string | undefined
): string {
  let body = `You've made great progress on your ${merchantName} payment!`;

  if (amount) {
    body += ` You've already put $${amount.toFixed(2)} toward this.`;
  }

  if (impactSummary) {
    body += `\n\n🎉 ${impactSummary}`;
  }

  return body;
}

/**
 * Generate email body for progress milestone
 */
function generateProgressMilestoneBodyEmail(
  merchantName: string,
  amount: number | undefined,
  impactSummary: string | undefined
): string {
  let body = `Hi there,\n\nGreat news! You've made excellent progress on your ${merchantName} payment.`;

  if (amount) {
    body += ` You've already put $${amount.toFixed(2)} toward this.`;
  }

  if (impactSummary) {
    body += `\n\n🎉 ${impactSummary}`;
  }

  body += '\n\nKeep up the great work! 💚';

  return body;
}

/**
 * Generate title for missed payment
 */
function generatePaymentMissedTitle(merchantName: string): string {
  return `Payment Reminder: ${merchantName}`;
}

/**
 * Generate in-app body for missed payment
 */
function generatePaymentMissedBodyInApp(merchantName: string, amount: number | undefined): string {
  let body = `It looks like your ${merchantName} payment`;

  if (amount) {
    body += ` of $${amount.toFixed(2)}`;
  }

  body += ' may have been missed. Want help getting back on track?';

  return body;
}

/**
 * Generate email body for missed payment
 */
function generatePaymentMissedBodyEmail(merchantName: string, amount: number | undefined): string {
  let body = `Hi there,\n\nIt looks like your ${merchantName} payment`;

  if (amount) {
    body += ` of $${amount.toFixed(2)}`;
  }

  body += ' may have been missed. No worries — we can help you get back on track.\n\nWant to set up a plan?';

  return body;
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
 * Calculate days until a date
 */
function calculateDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const metadata = {
  name: 'Chime Draft Notification Copy',
  description: 'Draft friendly notification text (title, in-app body, email body) for payment reminders and milestones. Ensures guardrail-compliant, non-shaming tone. Use when creating or refining notifications for users.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'notifications',
};



