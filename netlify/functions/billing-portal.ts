import type { Handler } from '@netlify/functions';
import { StripeService } from '../../src/server/billing/stripe-enhanced';
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
    
    const stripeService = new StripeService();
    
    // Get user's Stripe customer ID
    const { getSupabaseServerClient } = await import('../../src/server/db');
    const client = getSupabaseServerClient();
    
    const { data: profile } = await client
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (!profile?.stripe_customer_id) {
      return { statusCode: 400, body: 'No billing account found' };
    }
    
    // Create billing portal session
    const sessionResult = await stripeService.createBillingPortalSession(
      profile.stripe_customer_id,
      `${process.env.FRONTEND_URL}/settings/billing`
    );
    
    if (!sessionResult.ok) {
      return { statusCode: 500, body: 'Failed to create billing portal session' };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url: sessionResult.value }),
    };
    
  } catch (error) {
    console.error('Billing portal error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
