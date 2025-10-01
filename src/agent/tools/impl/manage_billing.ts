import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { StripeService } from '../../../server/billing/stripe-enhanced';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'manage_billing';

export const inputSchema = z.object({
  action: z.enum(['upgrade', 'downgrade', 'cancel', 'retry_payment', 'update_card']),
  planId: z.string().optional(),
  immediate: z.boolean().default(false),
  invoiceId: z.string().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  action: z.string(),
  url: z.string().optional(),
  message: z.string(),
  success: z.boolean(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { action, planId, immediate, invoiceId } = input;
    
    const client = getSupabaseServerClient();
    const stripeService = new StripeService();
    
    // Get user profile
    const { data: profile } = await client
      .from('profiles')
      .select('stripe_customer_id, plan_id, billing_email')
      .eq('id', ctx.userId)
      .single();
    
    if (!profile?.stripe_customer_id) {
      return Err(new Error('No billing account found'));
    }
    
    switch (action) {
      case 'upgrade':
        if (!planId) {
          return Err(new Error('Plan ID required for upgrade'));
        }
        
        const upgradeResult = await stripeService.handlePlanChange({
          userId: ctx.userId,
          fromPlan: profile.plan_id,
          toPlan: planId,
          immediate,
        });
        
        if (!upgradeResult.ok) {
          return Err(upgradeResult.error);
        }
        
        return Ok({
          ok: true,
          action: 'upgrade',
          message: `Successfully upgraded to ${planId} plan`,
          success: true,
        });
        
      case 'downgrade':
        if (!planId) {
          return Err(new Error('Plan ID required for downgrade'));
        }
        
        const downgradeResult = await stripeService.handlePlanChange({
          userId: ctx.userId,
          fromPlan: profile.plan_id,
          toPlan: planId,
          immediate: false, // Always schedule downgrades});
        
        if (!downgradeResult.ok) {
          return Err(downgradeResult.error);
        }
        
        return Ok({
          ok: true,
          action: 'downgrade',
          message: `Scheduled downgrade to ${planId} plan at end of billing period`,
          success: true,
        });
        
      case 'cancel':
        // Get subscription
        const { data: subscription } = await client
          .from('subscriptions')
          .select('stripe_subscription_id')
          .eq('user_id', ctx.userId)
          .eq('product_type', 'plan')
          .eq('status', 'active')
          .single();
        
        if (!subscription) {
          return Err(new Error('No active subscription found'));
        }
        
        const cancelResult = await stripeService.cancelSubscription(
          subscription.stripe_subscription_id,
          immediate
        );
        
        if (!cancelResult.ok) {
          return Err(cancelResult.error);
        }
        
        return Ok({
          ok: true,
          action: 'cancel',
          message: immediate ? 'Subscription canceled immediately' : 'Subscription will cancel at end of period',
          success: true,
        });
        
      case 'retry_payment':
        if (!invoiceId) {
          return Err(new Error('Invoice ID required for payment retry'));
        }
        
        const retryResult = await stripeService.retryPayment(invoiceId);
        
        if (!retryResult.ok) {
          return Err(retryResult.error);
        }
        
        return Ok({
          ok: true,
          action: 'retry_payment',
          message: 'Payment retry initiated',
          success: true,
        });
        
      case 'update_card':
        const portalResult = await stripeService.createBillingPortalSession(
          profile.stripe_customer_id,
          `${process.env.FRONTEND_URL}/settings/billing`
        );
        
        if (!portalResult.ok) {
          return Err(portalResult.error);
        }
        
        return Ok({
          ok: true,
          action: 'update_card',
          url: portalResult.value,
          message: 'Redirecting to billing portal',
          success: true,
        });
        
      default:
        return Err(new Error('Invalid action'));
    }
    
  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Manage Billing',
  description: 'Handle billing operations like upgrades, downgrades, cancellations, and payment retries',
  requiresConfirmation: true,
  mutates: true,
  dangerous: true,
  category: 'billing',
};
