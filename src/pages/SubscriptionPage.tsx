import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  X, 
  Building, 
  User, 
  Home, 
  Users, 
  Zap, 
  Shield, 
  FileText, 
  CreditCard,
  ArrowRight,
  Star,
  Crown,
  Sparkles
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface Plan {
  name: string;
  type: 'free' | 'personal' | 'business';
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeature[];
  popular?: boolean;
  gradient: string;
  icon: React.ReactNode;
}

const SubscriptionPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [userCount, setUserCount] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'personal' | 'business'>('free');

  const plans: Plan[] = [
    {
      name: 'Free',
      type: 'free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      gradient: 'from-blue-600 to-purple-700',
      icon: <User size={24} className="text-white" />,
      features: [
        { text: '15 smart AI scans per month', included: true },
        { text: 'Invite an accountant to collaborate', included: true },
        { text: 'Connect your QuickBooks account', included: true },
        { text: 'Basic receipt categorization', included: true },
        { text: 'Export to CSV', included: true },
        { text: 'Email support', included: true },
        { text: 'Unlimited smart AI scans', included: false },
        { text: 'Invite other members to collaborate', included: false },
        { text: 'Advanced analytics & reporting', included: false },
        { text: 'Priority support', included: false },
        { text: 'Custom categories & rules', included: false },
        { text: 'API access', included: false },
        { text: 'Team management', included: false },
        { text: 'Advanced integrations', included: false },
        { text: 'Dedicated account manager', included: false },
      ]
    },
    {
      name: 'Personal Pro',
      type: 'personal',
      monthlyPrice: 9.99,
      yearlyPrice: 99,
      gradient: 'from-gray-800 to-gray-900',
      icon: <Crown size={24} className="text-white" />,
      popular: true,
      features: [
        { text: 'Everything in Free', included: true, highlight: true },
        { text: 'Unlimited smart AI scans', included: true },
        { text: 'Invite other members to collaborate', included: true },
        { text: 'Advanced analytics & reporting', included: true },
        { text: 'Priority support', included: true },
        { text: 'Custom categories & rules', included: true },
        { text: 'API access', included: true },
        { text: 'Team management', included: false },
        { text: 'Advanced integrations', included: false },
        { text: 'Dedicated account manager', included: false },
        { text: 'White-label options', included: false },
        { text: 'Custom branding', included: false },
        { text: 'Advanced security features', included: false },
        { text: 'Compliance reporting', included: false },
        { text: 'Enterprise integrations', included: false },
      ]
    },
    {
      name: 'Business',
      type: 'business',
      monthlyPrice: 29.99,
      yearlyPrice: 299,
      gradient: 'from-indigo-600 to-purple-800',
      icon: <Building size={24} className="text-white" />,
      features: [
        { text: 'Everything in Personal Pro', included: true, highlight: true },
        { text: 'Team management', included: true },
        { text: 'Advanced integrations', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'White-label options', included: true },
        { text: 'Custom branding', included: true },
        { text: 'Advanced security features', included: true },
        { text: 'Compliance reporting', included: true },
        { text: 'Enterprise integrations', included: true },
        { text: 'Custom onboarding', included: true },
        { text: 'SLA guarantees', included: true },
        { text: 'Advanced analytics dashboard', included: true },
        { text: 'Multi-currency support', included: true },
        { text: 'Advanced workflow automation', included: true },
        { text: '24/7 phone support', included: true },
      ]
    }
  ];

  const currentPlan = plans.find(plan => plan.type === selectedPlan);
  const yearlyDiscount = billingCycle === 'yearly' ? 0.17 : 0; // 17% discount for yearly

  const calculatePrice = (plan: Plan) => {
    const basePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const discountedPrice = basePrice * (1 - yearlyDiscount);
    return billingCycle === 'yearly' ? discountedPrice : basePrice;
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '$0.00';
    return `$${price.toFixed(2)}`;
  };

  const getMonthlyEquivalent = (plan: Plan) => {
    if (plan.type === 'free') return '$0.00';
    const yearlyPrice = calculatePrice(plan);
    return formatPrice(yearlyPrice / 12);
  };

  return (
    <div className="space-y-6">
      <PageHeader />
      
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage your subscription</h1>
        <p className="text-gray-600">Choose the perfect plan for your needs</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white text-orange-600 rounded-md shadow-sm font-medium">
            <Home size={16} />
            <span>Manage subscription plan</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
            <FileText size={16} />
            <span>Current plan details</span>
          </button>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>
            Monthly pricing
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-gray-500'}`}>
            Annual pricing
          </span>
          {billingCycle === 'yearly' && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Save 17%
            </span>
          )}
        </div>
      </div>

      {/* User Count Section */}
      <div className="max-w-md mx-auto mb-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">How many users do you need?</h3>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setUserCount(Math.max(1, userCount - 1))}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              -
            </button>
            <div className="w-20 h-10 border border-gray-300 rounded-lg flex items-center justify-center text-lg font-semibold text-gray-900">
              {userCount}
            </div>
            <button
              onClick={() => setUserCount(userCount + 1)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            You can invite more users to collaborate in your account. Each user that submits documents uses 1 seat. Your accountant does not count towards your seat limit.
          </p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-2xl overflow-hidden shadow-xl ${
              plan.popular ? 'ring-2 ring-orange-500 ring-offset-2' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              </div>
            )}
            
            <div className={`bg-gradient-to-br ${plan.gradient} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {plan.icon}
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm opacity-90">
                      {billingCycle === 'yearly' ? 'yearly' : 'monthly'}
                    </p>
                  </div>
                </div>
                {plan.type === 'business' && <Sparkles size={20} className="text-yellow-300" />}
              </div>
              
              <div className="mb-6">
                <div className="text-3xl font-bold">
                  {formatPrice(calculatePrice(plan))}
                  <span className="text-lg font-normal opacity-90">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                {billingCycle === 'yearly' && plan.type !== 'free' && (
                  <div className="text-sm opacity-90">
                    {getMonthlyEquivalent(plan)} / month
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white p-6">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      feature.included 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {feature.included ? (
                        <Check size={12} />
                      ) : (
                        <X size={12} />
                      )}
                    </div>
                    <span className={`text-sm ${
                      feature.included 
                        ? feature.highlight 
                          ? 'text-green-600 font-medium' 
                          : 'text-gray-700'
                        : 'text-gray-400'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => setSelectedPlan(plan.type)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedPlan === plan.type
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : plan.type === 'free'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {plan.type === 'free' ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current Plan Summary */}
      {currentPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto mt-8 p-6 bg-gray-50 rounded-xl"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Current Plan</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentPlan.gradient} flex items-center justify-center`}>
                {currentPlan.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{currentPlan.name}</h4>
                <p className="text-sm text-gray-600">
                  {formatPrice(calculatePrice(currentPlan))} / {billingCycle === 'yearly' ? 'year' : 'month'}
                </p>
              </div>
            </div>
            <button className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium">
              <span>Manage Plan</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-12">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h4>
            <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-2">What happens to my data if I downgrade?</h4>
            <p className="text-gray-600 text-sm">Your data is always safe. You'll retain access to all your existing documents and transactions.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h4>
            <p className="text-gray-600 text-sm">We offer a 30-day money-back guarantee for all paid plans. No questions asked.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h4>
            <p className="text-gray-600 text-sm">No setup fees. You only pay the advertised price for your chosen plan.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage; 
