// Client-side utility for calling Stripe checkout
export const createCheckoutSession = async ({ email, plan, billing = 'monthly' }) => {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        plan,
        billing,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    
    if (url) {
      // Redirect to Stripe Checkout
      window.location.href = url;
    } else {
      throw new Error('No checkout URL received');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

// Usage example:
// import { createCheckoutSession } from '../utils/stripe-client';
// 
// const handleUpgrade = async () => {
//   try {
//     await createCheckoutSession({
//       email: user.email,
//       plan: 'pro',
//       billing: 'monthly'
//     });
//   } catch (error) {
//     alert('Failed to start checkout: ' + error.message);
//   }
// };