import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '../../src/server/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  
  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing signature' };
  }
  
  let stripeEvent: Stripe.Event;
  
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return { statusCode: 400, body: 'Invalid signature' };
  }
  
  const client = getSupabaseServerClient();
  
  // Check for duplicate processing (idempotency)
  const { data: existing } = await client
    .from('billing_events')
    .select('id, processed')
    .eq('stripe_event_id', stripeEvent.id)
    .single();
  
  if (existing?.processed) {
    console.log(`Event ${stripeEvent.id} already processed`);
    return { statusCode: 200, body: 'Already processed' };
  }
  
  // Store event
  if (!existing) {
    await client
      .from('billing_events')
      .insert({
        stripe_event_id: stripeEvent.id,
        event_type: stripeEvent.type,
        payload: stripeEvent.data,
        user_id: await getUserIdFromEvent(stripeEvent),
      });
  }
  
  try {
    // Process based on event type
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(stripeEvent.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(stripeEvent.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialEnding(stripeEvent.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.upcoming':
        await handleUpcomingInvoice(stripeEvent.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(stripeEvent.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(stripeEvent.data.object as Stripe.Subscription);
        break;
    }
    
    // Mark as processed
    await client
      .from('billing_events')
      .update({ processed: true })
      .eq('stripe_event_id', stripeEvent.id);
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Store error
    await client
      .from('billing_events')
      .update({ 
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('stripe_event_id', stripeEvent.id);
    
    // Return 500 to trigger retry
    return { statusCode: 500, body: 'Processing failed' };
  }
  
  return { statusCode: 200, body: 'Success' };
};

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const client = getSupabaseServerClient();
  const customerId = session.customer as string;
  
  // Get user ID from customer
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (!profile) {
    throw new Error(`No user found for customer ${customerId}`);
  }
  
  // Expand subscription
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ['items.data.price.product'] }
  );
  
  for (const item of subscription.items.data) {
    const product = item.price.product as Stripe.Product;
    const metadata = product.metadata;
    
    if (metadata.type === 'plan') {
      // Update plan
      await client
        .from('profiles')
        .update({
          plan_id: metadata.plan_id,
          subscription_status: 'active',
          trial_ends_at: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        })
        .eq('id', profile.id);
      
    } else if (metadata.type === 'addon') {
      // Add addon
      await client
        .from('user_addons')
        .upsert({
          user_id: profile.id,
          addon_id: metadata.addon_id,
          status: 'active',
        }, {
          onConflict: 'user_id,addon_id',
        });
    }
    
    // Store subscription record
    await client
      .from('subscriptions')
      .upsert({
        user_id: profile.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: item.price.id,
        product_type: metadata.type || 'plan',
        product_id: metadata.plan_id || metadata.addon_id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      }, {
        onConflict: 'stripe_subscription_id',
      });
  }
  
  // Update MRR
  const mrr = await calculateUserMRR(profile.id);
  await client
    .from('profiles')
    .update({ mrr_cents: mrr })
    .eq('id', profile.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const client = getSupabaseServerClient();
  const customerId = invoice.customer as string;
  
  // Get user
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (!profile) return;
  
  // Set grace period (7 days)
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
  
  await client
    .from('profiles')
    .update({
      payment_failed_at: new Date().toISOString(),
      grace_period_ends_at: gracePeriodEnd.toISOString(),
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);
  
  // Send notification
  await client
    .from('notifications')
    .insert({
      user_id: profile.id,
      type: 'payment_failed',
      payload: {
        amount: invoice.amount_due / 100,
        attempt: invoice.attempt_count,
        next_attempt: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null,
      },
    });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const client = getSupabaseServerClient();
  const customerId = invoice.customer as string;
  
  // Get user
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (!profile) return;
  
  // Clear payment failure flags
  await client
    .from('profiles')
    .update({
      payment_failed_at: null,
      grace_period_ends_at: null,
      subscription_status: 'active',
    })
    .eq('id', profile.id);
  
  // Send success notification
  await client
    .from('notifications')
    .insert({
      user_id: profile.id,
      type: 'payment_succeeded',
      payload: {
        amount: invoice.amount_paid / 100,
        invoice_id: invoice.id,
      },
    });
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  const client = getSupabaseServerClient();
  
  // Send notification 3 days before trial ends
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();
  
  if (!profile) return;
  
  await client
    .from('notifications')
    .insert({
      user_id: profile.id,
      type: 'trial_ending',
      payload: {
        trial_end: new Date(subscription.trial_end! * 1000).toISOString(),
        days_remaining: 3,
      },
    });
}

async function handleUpcomingInvoice(invoice: Stripe.Invoice) {
  const client = getSupabaseServerClient();
  const customerId = invoice.customer as string;
  
  // Get user
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (!profile) return;
  
  // Send upcoming invoice notification
  await client
    .from('notifications')
    .insert({
      user_id: profile.id,
      type: 'upcoming_invoice',
      payload: {
        amount: invoice.amount_due / 100,
        due_date: new Date(invoice.due_date! * 1000).toISOString(),
        invoice_id: invoice.id,
      },
    });
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const client = getSupabaseServerClient();
  
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();
  
  if (!profile) return;
  
  await client
    .from('profiles')
    .update({
      subscription_status: 'paused',
    })
    .eq('id', profile.id);
}

async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  const client = getSupabaseServerClient();
  
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();
  
  if (!profile) return;
  
  await client
    .from('profiles')
    .update({
      subscription_status: 'active',
    })
    .eq('id', profile.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const client = getSupabaseServerClient();
  
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();
  
  if (!profile) return;
  
  // Downgrade to free plan
  await client
    .from('profiles')
    .update({
      plan_id: 'free',
      subscription_status: 'canceled',
    })
    .eq('id', profile.id);
  
  // Update subscription record
  await client
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const client = getSupabaseServerClient();
  
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();
  
  if (!profile) return;
  
  // Update subscription record
  await client
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id);
  
  // Update profile status
  await client
    .from('profiles')
    .update({
      subscription_status: subscription.status,
    })
    .eq('id', profile.id);
}

// Helper functions
async function getUserIdFromEvent(event: Stripe.Event): Promise<string | null> {
  const client = getSupabaseServerClient();
  let customerId: string | null = null;
  
  // Extract customer ID based on event type
  const obj = event.data.object as any;
  if (obj.customer) {
    customerId = obj.customer;
  } else if (obj.id?.startsWith('cus_')) {
    customerId = obj.id;
  }
  
  if (!customerId) return null;
  
  const { data } = await client
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  return data?.id || null;
}

async function calculateUserMRR(userId: string): Promise<number> {
  const client = getSupabaseServerClient();
  const { data } = await client
    .rpc('calculate_user_mrr', { p_user_id: userId });
  return data || 0;
}
