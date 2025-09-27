import Stripe from 'stripe';
import { Result, Ok, Err } from '../../types/result';
import { getSupabaseServerClient } from '../db';

export class StripeService {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }
  
  async ensureCustomer(userId: string, email: string): Promise<Result<string>> {
    const client = getSupabaseServerClient();
    
    // Check existing customer
    const { data: profile } = await client
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (profile?.stripe_customer_id) {
      // Verify customer still exists in Stripe
      try {
        await this.stripe.customers.retrieve(profile.stripe_customer_id);
        return Ok(profile.stripe_customer_id);
      } catch {
        // Customer deleted in Stripe, create new
      }
    }
    
    // Create new customer
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          user_id: userId,
          source: 'xspenses_ai',
        },
        preferred_locales: ['en'],
        tax_exempt: 'none',
      });
      
      // Save to database
      await client
        .from('profiles')
        .update({ 
          stripe_customer_id: customer.id,
          billing_email: email,
        })
        .eq('id', userId);
      
      return Ok(customer.id);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'payment' | 'subscription';
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    coupon?: string;
    metadata?: Record<string, string>;
  }): Promise<Result<string>> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: params.customerId,
        mode: params.mode,
        line_items: [{
          price: params.priceId,
          quantity: 1,
        }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: { enabled: true },
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        subscription_data: params.mode === 'subscription' ? {
          trial_period_days: params.trialDays,
          metadata: params.metadata,
        } : undefined,
        discounts: params.coupon ? [{
          coupon: params.coupon,
        }] : undefined,
        metadata: {
          ...params.metadata,
          source: 'checkout',
        },
      });
      
      return Ok(session.url!);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  async handlePlanChange(params: {
    userId: string;
    fromPlan: string;
    toPlan: string;
    immediate?: boolean;
  }): Promise<Result<void>> {
    const client = getSupabaseServerClient();
    
    try {
      // Get current subscription
      const { data: sub } = await client
        .from('subscriptions')
        .select('*')
        .eq('user_id', params.userId)
        .eq('product_type', 'plan')
        .eq('status', 'active')
        .single();
      
      if (!sub) {
        return Err(new Error('No active subscription found'));
      }
      
      const subscription = await this.stripe.subscriptions.retrieve(
        sub.stripe_subscription_id
      );
      
      // Get new price ID
      const newPriceId = this.getPriceId(params.toPlan);
      
      if (params.immediate) {
        // Immediate change with proration
        await this.stripe.subscriptions.update(subscription.id, {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'always_invoice',
        });
      } else {
        // Schedule change for end of period
        await this.stripe.subscriptionSchedules.create({
          from_subscription: subscription.id,
          phases: [
            {
              items: [{
                price: subscription.items.data[0].price.id,
                quantity: 1,
              }],
              end_date: subscription.current_period_end,
            },
            {
              items: [{
                price: newPriceId,
                quantity: 1,
              }],
            },
          ],
        });
      }
      
      // Update local database
      await client
        .from('profiles')
        .update({ 
          plan_id: params.toPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.userId);
      
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  async reportUsage(params: {
    userId: string;
    resourceType: 'ocr' | 'api_call' | 'storage_gb';
    quantity: number;
    timestamp?: number;
  }): Promise<Result<void>> {
    const client = getSupabaseServerClient();
    
    try {
      // Get user's subscription
      const { data: profile } = await client
        .from('profiles')
        .select('stripe_customer_id, plan_id')
        .eq('id', params.userId)
        .single();
      
      if (!profile?.stripe_customer_id) {
        return Err(new Error('No Stripe customer found'));
      }
      
      // Check if plan has metered billing
      const { data: limits } = await client
        .from('plan_limits')
        .select('*')
        .eq('plan_id', profile.plan_id)
        .single();
      
      // Store usage record
      const period = new Date();
      await client
        .from('usage_records')
        .insert({
          user_id: params.userId,
          resource_type: params.resourceType,
          quantity: params.quantity,
          unit: this.getUnit(params.resourceType),
          period_start: new Date(period.getFullYear(), period.getMonth(), 1),
          period_end: new Date(period.getFullYear(), period.getMonth() + 1, 0),
        });
      
      // Check if over limit
      if (limits) {
        const { data: usage } = await client
          .from('usage_records')
          .select('quantity')
          .eq('user_id', params.userId)
          .eq('resource_type', params.resourceType)
          .gte('period_start', new Date(period.getFullYear(), period.getMonth(), 1))
          .lte('period_end', new Date(period.getFullYear(), period.getMonth() + 1, 0));
        
        const totalUsage = usage?.reduce((sum, u) => sum + Number(u.quantity), 0) || 0;
        const limit = this.getLimit(limits, params.resourceType);
        
        if (limit && totalUsage > limit) {
          // Report overage to Stripe (if metered billing enabled)
          const meteredPriceId = this.getMeteredPriceId(params.resourceType);
          if (meteredPriceId) {
            // Find subscription item
            const subscriptions = await this.stripe.subscriptions.list({
              customer: profile.stripe_customer_id,
              status: 'active',
            });
            
            const subscription = subscriptions.data[0];
            if (subscription) {
              const item = subscription.items.data.find(
                i => i.price.id === meteredPriceId
              );
              
              if (item) {
                await this.stripe.subscriptionItems.createUsageRecord(
                  item.id,
                  {
                    quantity: Math.ceil(totalUsage - limit),
                    timestamp: params.timestamp || Math.floor(Date.now() / 1000),
                    action: 'set',
                  }
                );
              }
            }
          }
          
          // Send usage alert
          await this.sendUsageAlert(params.userId, params.resourceType, totalUsage, limit);
        }
      }
      
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<Result<string>> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      
      return Ok(session.url);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Result<void>> {
    try {
      if (immediately) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
      
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  async retryPayment(invoiceId: string): Promise<Result<void>> {
    try {
      await this.stripe.invoices.pay(invoiceId);
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  private getUnit(resourceType: string): string {
    const units: Record<string, string> = {
      ocr: 'page',
      api_call: 'call',
      storage_gb: 'gb',
    };
    return units[resourceType] || 'unit';
  }
  
  private getLimit(limits: any, resourceType: string): number | null {
    const limitMap: Record<string, string> = {
      ocr: 'ocr_pages_month',
      api_call: 'api_calls_month',
      storage_gb: 'storage_gb',
    };
    return limits[limitMap[resourceType]] || null;
  }
  
  private getPriceId(planId: string): string {
    const prices: Record<string, string> = {
      free: process.env.STRIPE_PRICE_PLAN_FREE || '',
      personal: process.env.STRIPE_PRICE_PLAN_PERSONAL || '',
      business: process.env.STRIPE_PRICE_PLAN_BUSINESS || '',
      enterprise: process.env.STRIPE_PRICE_PLAN_ENTERPRISE || '',
    };
    return prices[planId] || '';
  }
  
  private getMeteredPriceId(resourceType: string): string | null {
    const prices: Record<string, string> = {
      ocr: process.env.STRIPE_PRICE_OCR_OVERAGE || '',
      api_call: process.env.STRIPE_PRICE_API_OVERAGE || '',
    };
    return prices[resourceType] || null;
  }
  
  private async sendUsageAlert(
    userId: string,
    resourceType: string,
    usage: number,
    limit: number
  ): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'usage_alert',
        payload: {
          resource_type: resourceType,
          usage,
          limit,
          percent: Math.round((usage / limit) * 100),
        },
      });
  }
}
