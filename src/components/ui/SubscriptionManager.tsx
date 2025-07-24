import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, ExternalLink, CreditCard, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerPortalUrl, formatPlanName } from '../../utils/stripe';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface SubscriptionData {
  role: string;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

const SubscriptionManager = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role, subscription_status, current_period_end, stripe_customer_id')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await getCustomerPortalUrl();
    } catch (error) {
      // Error is already handled in getCustomerPortalUrl
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'text-success-600 bg-success-100';
      case 'past_due':
      case 'unpaid':
        return 'text-warning-600 bg-warning-100';
      case 'canceled':
      case 'incomplete_expired':
        return 'text-error-600 bg-error-100';
      case 'lifetime':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'active':
      case 'trialing':
      case 'lifetime':
        return <CheckCircle size={16} />;
      case 'past_due':
      case 'unpaid':
        return <AlertTriangle size={16} />;
      default:
        return <CreditCard size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="card">
        <p className="text-gray-500">No subscription data available</p>
      </div>
    );
  }

  const isFreePlan = subscription.role === 'free' || !subscription.subscription_status;
  const hasActiveSubscription = ['active', 'trialing', 'lifetime'].includes(subscription.subscription_status || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Crown size={24} className="text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
        </div>
        
        {!isFreePlan && subscription.stripe_customer_id && (
          <button
            onClick={handleManageSubscription}
            className="btn-outline text-sm flex items-center"
          >
            <ExternalLink size={14} className="mr-2" />
            Manage
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">
              Current Plan: {formatPlanName(subscription.role)}
            </div>
            {subscription.subscription_status && (
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(subscription.subscription_status)}`}>
                {getStatusIcon(subscription.subscription_status)}
                <span className="capitalize">
                  {subscription.subscription_status.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          
          {hasActiveSubscription && (
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {subscription.subscription_status === 'lifetime' ? 'Lifetime Access' : 'Next Billing'}
              </div>
              {subscription.current_period_end && subscription.subscription_status !== 'lifetime' && (
                <div className="text-sm font-medium text-gray-900">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Plan Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Current Benefits</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {subscription.role === 'free' ? (
                <>
                  <div>• 10 receipts per month</div>
                  <div>• Basic categorization</div>
                  <div>• Manual entry only</div>
                </>
              ) : (
                <>
                  <div>• Unlimited receipts</div>
                  <div>• AI-powered categorization</div>
                  <div>• Advanced analytics</div>
                  <div>• Priority support</div>
                  {subscription.role === 'premium' && (
                    <div>• Ask-AI assistant</div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Account Status</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar size={14} />
                <span>
                  Member since {new Date(user?.created_at || '').toLocaleDateString()}
                </span>
              </div>
              {subscription.stripe_customer_id && (
                <div className="flex items-center space-x-2">
                  <CreditCard size={14} />
                  <span>Payment method on file</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          {isFreePlan ? (
            <Link
              to="/pricing"
              className="btn-primary flex items-center justify-center"
            >
              <Crown size={16} className="mr-2" />
              Upgrade to Premium
            </Link>
          ) : (
            <>
              {subscription.stripe_customer_id && (
                <button
                  onClick={handleManageSubscription}
                  className="btn-primary flex items-center justify-center"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Manage Subscription
                </button>
              )}
              <Link
                to="/pricing"
                className="btn-outline flex items-center justify-center"
              >
                View All Plans
              </Link>
            </>
          )}
        </div>

        {/* Warning Messages */}
        {subscription.subscription_status === 'past_due' && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-warning-800">
              <AlertTriangle size={16} />
              <span className="font-medium">Payment Past Due</span>
            </div>
            <p className="text-sm text-warning-700 mt-1">
              Please update your payment method to continue using premium features.
            </p>
          </div>
        )}

        {subscription.subscription_status === 'canceled' && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-error-800">
              <AlertTriangle size={16} />
              <span className="font-medium">Subscription Canceled</span>
            </div>
            <p className="text-sm text-error-700 mt-1">
              Your subscription has been canceled. You can reactivate anytime.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SubscriptionManager;
