import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, plan, billing = 'monthly' } = req.body;

    if (!email || !plan) {
      return res.status(400).json({ error: 'Email and plan are required' });
    }

    // Price mapping - Replace with your actual Stripe Price IDs
    const priceMap = {
      'pro_monthly': 'price_1QQQProMonthly123',
      'pro_yearly': 'price_1QQQProYearly123', 
      'elite_monthly': 'price_1QQQEliteMonthly123',
      'elite_yearly': 'price_1QQQEliteYearly123',
      'lifetime': 'price_1QQQLifetime123',
    };

    // Determine price ID based on plan and billing
    let priceId;
    if (plan === 'lifetime') {
      priceId = priceMap.lifetime;
    } else {
      const planKey = `${plan}_${billing}`;
      priceId = priceMap[planKey];
    }

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or billing cycle selected' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${req.headers.origin || 'https://xspensesai.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://xspensesai.com'}/cancel`,
      metadata: {
        email,
        plan,
        billing,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      // Add tax collection if needed
      automatic_tax: {
        enabled: true,
      },
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}