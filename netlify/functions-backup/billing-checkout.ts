import type { Handler } from '@netlify/functions';
import { StripeService } from '../../src/server/billing/stripe-enhanced';
import { getSupabaseServerClient } from '../../src/server/db';
import { validateToken } from '../../src/server/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  
  try {
    const userId = await validateToken(event);
    if (!userId) {
      return { statusCode: 401, body: 'Unauthorized' };
    }
    
    const { plan_id, success_url, cancel_url, annual } = JSON.parse(event.body || '{}');
    
    if (!plan_id || !success_url || !cancel_url) {
      return { statusCode: 400, body: 'Missing required parameters' };
    }
    
    const stripeService = new StripeService();
    const client = getSupabaseServerClient();
    
    // Get user profile
    const { data: profile } = await client
      .from('profiles')
      .select('billing_email, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (!profile?.billing_email) {
      return { statusCode: 400, body: 'No billing email found' };
    }
    
    // Ensure Stripe customer exists
    const customerResult = await stripeService.ensureCustomer(userId, profile.billing_email);
    if (!customerResult.ok) {
      return { statusCode: 500, body: 'Failed to create customer' };
    }
    
    // Get price ID
    const priceId = getPriceId(plan_id, annual);
    if (!priceId) {
      return { statusCode: 400, body: 'Invalid plan' };
    }
    
    // Create checkout session
    const sessionResult = await stripeService.createCheckoutSession({
      customerId: customerResult.value,
      priceId,
      mode: 'subscription',
      successUrl: success_url,
      cancelUrl: cancel_url,
      trialDays: plan_id === 'personal' ? 14 : undefined,
      metadata: {
        plan_id,
        user_id: userId,
        annual: annual ? 'true' : 'false',
      },
    });
    
    if (!sessionResult.ok) {
      return { statusCode: 500, body: 'Failed to create checkout session' };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url: sessionResult.value }),
    };
    
  } catch (error) {
    console.error('Checkout error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

function getPriceId(planId: string, annual: boolean): string | null {
  const prices: Record<string, Record<string, string>> = {
    personal: {
      monthly: process.env.STRIPE_PRICE_PLAN_PERSONAL_MONTHLY || '',
      annual: process.env.STRIPE_PRICE_PLAN_PERSONAL_ANNUAL || '',
    },
    business: {
      monthly: process.env.STRIPE_PRICE_PLAN_BUSINESS_MONTHLY || '',
      annual: process.env.STRIPE_PRICE_PLAN_BUSINESS_ANNUAL || '',
    },
    enterprise: {
      monthly: process.env.STRIPE_PRICE_PLAN_ENTERPRISE_MONTHLY || '',
      annual: process.env.STRIPE_PRICE_PLAN_ENTERPRISE_ANNUAL || '',
    },
  };
  
  return prices[planId]?.[annual ? 'annual' : 'monthly'] || null;
}
