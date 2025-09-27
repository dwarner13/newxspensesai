import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { recordUsage, resolveEntitlements } from '../../entitlements/resolver-enhanced';
import { StripeService } from '../../../server/billing/stripe-enhanced';

export const id = 'record_usage';

export const inputSchema = z.object({
  resourceType: z.enum(['ocr', 'api_call', 'storage_gb']),
  quantity: z.number().min(1),
  metadata: z.record(z.any()).optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  recorded: z.number(),
  totalUsage: z.number(),
  limit: z.number().nullable(),
  percentUsed: z.number(),
  overLimit: z.boolean(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { resourceType, quantity, metadata } = input;
    
    // Record the usage
    await recordUsage(ctx.userId, resourceType, quantity);
    
    // Get updated entitlements
    const entitlements = await resolveEntitlements(ctx.userId);
    
    // Get current usage
    const totalUsage = entitlements.usage[resourceType === 'ocr' ? 'ocrPages' : 
                                        resourceType === 'api_call' ? 'apiCalls' : 'storageGb'];
    
    // Get limit
    const limit = entitlements.limits[resourceType === 'ocr' ? 'ocrPages' : 
                                     resourceType === 'api_call' ? 'apiCalls' : 'storageGb'];
    
    // Calculate percentage
    const percentUsed = limit ? (totalUsage / limit) * 100 : 0;
    
    // Check if over limit
    const overLimit = limit ? totalUsage > limit : false;
    
    // If over limit, report to Stripe for metered billing
    if (overLimit && entitlements.subscriptionStatus === 'active') {
      const stripeService = new StripeService();
      await stripeService.reportUsage({
        userId: ctx.userId,
        resourceType,
        quantity,
      });
    }
    
    return Ok({
      ok: true,
      recorded: quantity,
      totalUsage,
      limit,
      percentUsed,
      overLimit,
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Record Usage',
  description: 'Record resource usage for billing and limit tracking',
  requiresConfirmation: false,
  dangerous: false,
  category: 'billing',
};
