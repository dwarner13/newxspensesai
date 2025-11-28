/**
 * Chime Notification Helper
 * 
 * Simple helper function to generate and queue Chime notifications from recurring obligations.
 * This is the "golden path" for creating notifications: takes obligation data + context from
 * Liberty/Finley/Crystal, generates safe notification text, and queues it for delivery.
 * 
 * GUARDRAILS COMPLIANCE:
 * - All text produced by chime_generate_notification tool is considered user-visible output
 * - Must be passed through the same PII masking + moderation pipeline as regular chat responses
 * - The tool itself applies PII masking, but all outbound notification text will also pass
 *   through the central guardrails pipeline when being rendered/sent
 * 
 * Usage:
 *   import { createChimeNotificationFromObligation } from './chimeNotificationHelper';
 *   
 *   await createChimeNotificationFromObligation({
 *     userId: 'user-123',
 *     obligation: { id: 'ob-123', merchant_name: 'Capital One', ... },
 *     scenario: 'credit_card_due',
 *     daysUntilDue: 3,
 *     extraPaymentOption: 25,
 *     interestSavingsEstimate: 'You could save about $480 in interest'
 *   });
 */

import { getSupabaseServerClient } from '../../../src/server/db';
import { executeTool } from '../../../src/agent/tools';
import { pickTools } from '../../../src/agent/tools';
import { Result, Ok, Err } from '../../../src/types/result';

export interface CreateNotificationParams {
  userId: string;
  obligation: {
    id: string;
    merchant_name: string;
    obligation_type: string;
    amount_estimate: number;
    currency?: string;
    next_expected_date?: string; // ISO date string
  };
  scenario: 'credit_card_due' | 'upcoming_mortgage_payment' | 'upcoming_car_payment' | 'debt_progress_update';
  daysUntilDue?: number;
  extraPaymentOption?: number;
  progressSummary?: string;
  payoffEstimate?: string;
  interestSavingsEstimate?: string;
}

export interface NotificationResult {
  notificationId: string;
  title: string;
  body: string;
  scheduledFor: string;
}

/**
 * Generate and queue a Chime notification from a recurring obligation
 * 
 * This function:
 * 1. Calls chime_generate_notification tool to get safe title + body
 * 2. Inserts a row into notifications_queue with status='pending'
 * 3. Returns the notification ID and generated text
 * 
 * All notification text is guardrail-compliant and will pass through
 * PII masking + moderation when being rendered/sent.
 */
export async function createChimeNotificationFromObligation(
  params: CreateNotificationParams
): Promise<Result<NotificationResult>> {
  try {
    const {
      userId,
      obligation,
      scenario,
      daysUntilDue,
      extraPaymentOption,
      progressSummary,
      payoffEstimate,
      interestSavingsEstimate,
    } = params;

    const supabase = getSupabaseServerClient();

    // Step 1: Call chime_generate_notification tool
    const toolModules = pickTools(['chime_generate_notification']);
    const toolModule = toolModules['chime_generate_notification'];

    if (!toolModule) {
      return Err(new Error('chime_generate_notification tool not found'));
    }

    // Calculate days until due if not provided but we have next_expected_date
    let calculatedDaysUntilDue = daysUntilDue;
    if (calculatedDaysUntilDue === undefined && obligation.next_expected_date) {
      const dueDate = new Date(obligation.next_expected_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      calculatedDaysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Prepare tool input
    const toolInput = {
      scenario,
      merchant_name: obligation.merchant_name,
      obligation_type: obligation.obligation_type,
      currency: obligation.currency || 'CAD',
      amount: obligation.amount_estimate,
      days_until_due: calculatedDaysUntilDue,
      extra_payment_option: extraPaymentOption,
      progress_summary: progressSummary,
      payoff_estimate: payoffEstimate,
      interest_savings_estimate: interestSavingsEstimate,
    };

    // Execute tool (this applies PII masking internally)
    const toolResult = await executeTool(toolModule, toolInput, {
      userId,
      conversationId: `chime-notification-${obligation.id}`,
      sessionId: undefined,
      abortSignal: undefined,
    });

    // Handle tool execution result
    if (!toolResult || typeof toolResult !== 'object' || 'error' in toolResult) {
      const errorMsg = (toolResult as any)?.error || 'Tool execution failed';
      console.error('[Chime Notification Helper] Tool execution error:', errorMsg);
      return Err(new Error(`Failed to generate notification text: ${errorMsg}`));
    }

    // Extract title and body from tool result
    const { title, body } = toolResult as { title: string; body: string };

    if (!title || !body) {
      return Err(new Error('Tool returned invalid output: missing title or body'));
    }

    // Step 2: Calculate scheduled_for date
    // Default: 3 days before next_expected_date, or now if no date provided
    let scheduledFor: Date;
    if (obligation.next_expected_date) {
      scheduledFor = new Date(obligation.next_expected_date);
      scheduledFor.setDate(scheduledFor.getDate() - 3); // 3 days before due
      scheduledFor.setHours(9, 0, 0, 0); // 9 AM
    } else {
      scheduledFor = new Date(); // Schedule for now if no date
    }

    // Step 3: Insert into notifications_queue
    const { data: notification, error: insertError } = await supabase
      .from('notifications_queue')
      .insert({
        user_id: userId,
        obligation_id: obligation.id,
        notification_type: scenario,
        channel: 'in_app', // Default to in-app for now
        title,
        body,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
        metadata: {
          days_before_due: calculatedDaysUntilDue,
          amount: obligation.amount_estimate,
          extra_payment_option: extraPaymentOption,
          source: 'chime',
          generated_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[Chime Notification Helper] Database insert error:', insertError);
      return Err(new Error(`Failed to queue notification: ${insertError.message}`));
    }

    if (!notification || !notification.id) {
      return Err(new Error('Failed to create notification: no ID returned'));
    }

    console.log('[Chime Notification Helper] Successfully created notification', {
      notificationId: notification.id,
      userId: userId.substring(0, 8) + '...',
      scenario,
      scheduledFor: scheduledFor.toISOString(),
    });

    return Ok({
      notificationId: notification.id,
      title,
      body,
      scheduledFor: scheduledFor.toISOString(),
    });
  } catch (error) {
    console.error('[Chime Notification Helper] Unexpected error:', error);
    return Err(error as Error);
  }
}



