import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { recordUsage, checkUsageLimit, resolveEntitlements } from '../../entitlements/resolver-enhanced';
import { StripeService } from '../../../server/billing/stripe-enhanced';

export const id = 'check_usage_limits';

export const inputSchema = z.object({
  resourceType: z.enum(['ocr', 'api_call', 'storage_gb']),
  quantity: z.number().min(1),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  withinLimits: z.boolean(),
  currentUsage: z.number(),
  limit: z.number().nullable(),
  percentUsed: z.number(),
  canProceed: z.boolean(),
  upgradeRequired: z.boolean().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { resourceType, quantity } = input;
    
    // Check if user can use this resource
    const withinLimits = await checkUsageLimit(ctx.userId, resourceType, quantity);
    
    // Get current entitlements
    const entitlements = await resolveEntitlements(ctx.userId);
    
    // Get current usage
    const currentUsage = entitlements.usage[resourceType === 'ocr' ? 'ocrPages' : 
                                           resourceType === 'api_call' ? 'apiCalls' : 'storageGb'];
    
    // Get limit
    const limit = entitlements.limits[resourceType === 'ocr' ? 'ocrPages' : 
                                     resourceType === 'api_call' ? 'apiCalls' : 'storageGb'];
    
    // Calculate percentage
    const percentUsed = limit ? (currentUsage / limit) * 100 : 0;
    
    // Determine if upgrade is required
    const upgradeRequired = !withinLimits && entitlements.planId === 'free';
    
    return Ok({
      ok: true,
      withinLimits,
      currentUsage,
      limit,
      percentUsed,
      canProceed: withinLimits || entitlements.isInGracePeriod,
      upgradeRequired,
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Check Usage Limits',
  description: 'Check if user can perform an action within their plan limits',
  requiresConfirmation: false,
  dangerous: false,
  category: 'billing',
};
