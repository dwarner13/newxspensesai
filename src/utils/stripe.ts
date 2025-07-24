import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Get Price IDs from environment variables
const STRIPE_PRICES = {
  pro_monthly: import.meta.env.VITE_PRO_MONTHLY_PRICE_ID || 'price_1QQQProMonthly123',
  pro_yearly: import.meta.env.VITE_PRO_YEARLY_PRICE_ID || 'price_1QQQProYearly123',
  elite_monthly: import.meta.env.VITE_ELITE_MONTHLY_PRICE_ID || 'price_1QQQEliteMonthly123',
  elite_yearly: import.meta.env.VITE_ELITE_YEARLY_PRICE_ID || 'price_1QQQEliteYearly123',
  lifetime: import.meta.env.VITE_LIFETIME_PRICE_ID || 'price_1QQQLifetime123',
};

export interface CheckoutOptions {
  planName: 'pro' | 'elite' | 'lifetime';
  billing: 'monthly' | 'yearly' | 'lifetime';
  successUrl?: string;
  cancelUrl?: string;
}

export const createCheckoutSession = async (options: CheckoutOptions) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to upgrade your plan');
      throw new Error('You must be logged in to upgrade');
    }

    // Show loading toast
    const loadingToast = toast.loading('Creating checkout session...');

    // Determine the price ID based on plan and billing
    let priceId: string;
    
    if (options.planName === 'lifetime') {
      priceId = STRIPE_PRICES.lifetime;
    } else if (options.planName === 'pro') {
      priceId = options.billing === 'yearly' ? STRIPE_PRICES.pro_yearly : STRIPE_PRICES.pro_monthly;
    } else if (options.planName === 'elite') {
      priceId = options.billing === 'yearly' ? STRIPE_PRICES.elite_yearly : STRIPE_PRICES.elite_monthly;
    } else {
      toast.dismiss(loadingToast);
      throw new Error('Invalid plan selected');
    }

    // Create checkout session via edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({
        priceId,
        planName: options.planName,
        successUrl: options.successUrl || `${window.location.origin}/success`,
        cancelUrl: options.cancelUrl || `${window.location.origin}/cancel`,
      }),
    });

    toast.dismiss(loadingToast);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    
    if (!url) {
      throw new Error('No checkout URL received');
    }

    // Show success message before redirect
    toast.success('Redirecting to secure checkout...');
    
    // Small delay to show the success message
    setTimeout(() => {
      window.location.href = url;
    }, 1000);
    
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout';
    toast.error(errorMessage);
    throw error;
  }
};

export const getCustomerPortalUrl = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to manage your subscription');
      throw new Error('You must be logged in');
    }

    const loadingToast = toast.loading('Opening customer portal...');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({
        returnUrl: window.location.origin + '/settings/profile',
      }),
    });

    toast.dismiss(loadingToast);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create portal session');
    }

    const { url } = await response.json();
    
    if (!url) {
      throw new Error('No portal URL received');
    }

    toast.success('Redirecting to customer portal...');
    
    // Small delay to show the success message
    setTimeout(() => {
      window.location.href = url;
    }, 1000);
    
  } catch (error) {
    console.error('Portal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to open customer portal';
    toast.error(errorMessage);
    throw error;
  }
};

// Helper function to format plan names for display
export const formatPlanName = (planName: string): string => {
  switch (planName) {
    case 'pro':
      return 'Pro';
    case 'elite':
      return 'Elite';
    case 'lifetime':
      return 'Lifetime Pro';
    default:
      return 'Free';
  }
};

// Helper function to get plan features
export const getPlanFeatures = (planName: string): string[] => {
  switch (planName) {
    case 'pro':
      return [
        'Unlimited receipts',
        'AI categorization + OCR',
        'PDF/CSV export',
        'Gamification + reports',
        'Email support',
        'Advanced analytics'
      ];
    case 'elite':
      return [
        'Everything in Pro',
        'Ask-AI assistant',
        'Custom rules + automation',
        'Priority support',
        'Early feature access',
        'White-label options'
      ];
    case 'lifetime':
      return [
        'Everything in Pro',
        'Future upgrades included',
        'Lifetime support',
        'Early access to new features',
        'One-time payment'
      ];
    default:
      return [
        '10 receipts/month',
        'Manual entry only',
        'Basic categorization',
        'In-app support'
      ];
  }
};