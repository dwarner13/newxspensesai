import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  const { email, plan } = session.metadata;
  
  if (!email || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  try {
    // Determine user role based on plan
    let role = 'premium';
    if (plan === 'starter') {
      role = 'free';
    }

    // Update user profile in Supabase
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        stripe_customer_id: session.customer,
        subscription_status: session.mode === 'subscription' ? 'active' : 'lifetime',
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return;
    }

    // Award upgrade bonus XP
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (user) {
      // Add 100 XP bonus for upgrading
      await supabase.rpc('add_user_xp', {
        user_uuid: user.id,
        xp_amount: 100,
      });

      // Log the upgrade activity
      await supabase
        .from('xp_activities')
        .insert({
          user_id: user.id,
          activity_type: 'subscription_upgrade',
          xp_earned: 100,
          description: `Upgraded to ${plan} plan`,
        });
    }

    console.log(`Successfully processed checkout for ${email}, plan: ${plan}`);
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Error updating subscription:', error);
    }
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Error updating subscription:', error);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  const customerId = subscription.customer;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'free',
        subscription_status: 'canceled',
        subscription_id: null,
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Error handling subscription cancellation:', error);
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  // Add any additional logic for successful payments
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  const customerId = invoice.customer;
  
  try {
    // You might want to send an email notification here
    // or update the user's status to indicate payment issues
    
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due',
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Error updating payment failure status:', error);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}