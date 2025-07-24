# Stripe Integration Setup for XspensesAI

This guide explains how to set up and configure Stripe for payment processing in XspensesAI.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com) if you don't have one)
2. Your Supabase project with the XspensesAI database schema
3. Access to your deployment environment for setting environment variables

## Step 1: Create Products and Prices in Stripe

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to Products > Add Product
3. Create the following products:

### Pro Plan
- **Name**: XspensesAI Pro
- **Description**: Full access for freelancers and power users
- **Prices**:
  - Monthly: $14.99/month (recurring)
  - Yearly: $149/year (recurring)

### Elite Plan
- **Name**: XspensesAI Elite
- **Description**: Max features for pros who want it all
- **Prices**:
  - Monthly: $29.99/month (recurring)
  - Yearly: $299/year (recurring)

### Lifetime Plan
- **Name**: XspensesAI Lifetime
- **Description**: One-time payment for lifetime access
- **Price**: $249 (one-time)

4. Save the Price IDs for each plan (they start with `price_`)

## Step 2: Configure Environment Variables

Add the following environment variables to your project:

```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Price IDs
VITE_PRO_MONTHLY_PRICE_ID=price_1...pro_monthly
VITE_PRO_YEARLY_PRICE_ID=price_1...pro_yearly
VITE_ELITE_MONTHLY_PRICE_ID=price_1...elite_monthly
VITE_ELITE_YEARLY_PRICE_ID=price_1...elite_yearly
VITE_LIFETIME_PRICE_ID=price_1...lifetime
```

## Step 3: Set Up Webhook Endpoint

1. In your Stripe Dashboard, go to Developers > Webhooks
2. Click "Add Endpoint"
3. Enter your webhook URL: `https://your-supabase-project.functions.supabase.co/stripe-webhook`
4. Select the following events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add Endpoint"
6. Copy the Signing Secret and add it as `STRIPE_WEBHOOK_SECRET` in your environment variables

## Step 4: Deploy Edge Functions

Make sure your Supabase Edge Functions are deployed:

1. `create-checkout-session` - Creates a Stripe checkout session
2. `create-portal-session` - Creates a Stripe customer portal session
3. `stripe-webhook` - Handles Stripe webhook events
4. `verify-session` - Verifies a checkout session

## Step 5: Test the Integration

1. Go to your XspensesAI application
2. Navigate to the Pricing page
3. Select a plan and click the upgrade button
4. Complete the checkout process with Stripe's test card:
   - Card number: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

## Troubleshooting

### Webhook Issues
- Check the Stripe Dashboard > Developers > Webhooks to see if events are being delivered
- Verify your webhook endpoint is publicly accessible
- Ensure the webhook secret is correctly set in your environment variables

### Checkout Issues
- Check browser console for errors
- Verify price IDs are correctly set in environment variables
- Ensure the user is authenticated before attempting checkout

### Subscription Management Issues
- Verify the Stripe customer ID is being saved to the user's profile
- Check that the subscription status is being updated correctly
- Ensure the customer portal URL is being generated correctly

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)