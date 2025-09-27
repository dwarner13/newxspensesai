import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    ocrPages: number | null;
    apiCalls: number | null;
    storageGb: number | null;
  };
}

interface Usage {
  ocrPages: number;
  apiCalls: number;
  storageGb: number;
}

export function PlansAddonsEnhanced() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const navigate = useNavigate();
  
  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['10 OCR pages/month', '100 API calls', '0.5GB storage'],
      limits: { ocrPages: 10, apiCalls: 100, storageGb: 0.5 },
    },
    {
      id: 'personal',
      name: 'Personal',
      price: showAnnual ? 10 : 12,
      features: ['100 OCR pages/month', '1,000 API calls', '5GB storage', 'Rules & automation'],
      limits: { ocrPages: 100, apiCalls: 1000, storageGb: 5 },
    },
    {
      id: 'business',
      name: 'Business',
      price: showAnnual ? 42 : 49,
      features: ['1,000 OCR pages/month', '10,000 API calls', '50GB storage', 'Team seats', 'Priority support'],
      limits: { ocrPages: 1000, apiCalls: 10000, storageGb: 50 },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      features: ['Unlimited everything', 'Custom integrations', 'SLA', 'Dedicated support'],
      limits: { ocrPages: null, apiCalls: null, storageGb: null },
    },
  ];
  
  useEffect(() => {
    loadEntitlements();
  }, []);
  
  async function loadEntitlements() {
    try {
      const response = await fetch('/.netlify/functions/me-features', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });
      
      const data = await response.json();
      setCurrentPlan(data.plan_id);
      setUsage(data.usage);
    } catch (error) {
      console.error('Failed to load entitlements:', error);
    }
  }
  
  async function handleUpgrade(planId: string) {
    if (planId === currentPlan) return;
    
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/billing-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          success_url: `${window.location.origin}/settings/plans?success=true`,
          cancel_url: `${window.location.origin}/settings/plans`,
          annual: showAnnual,
        }),
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleManageBilling() {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/billing-portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  }
  
  function renderUsageBar(current: number, limit: number | null, label: string) {
    if (limit === null) return null;
    
    const percent = Math.min((current / limit) * 100, 100);
    const isNearLimit = percent > 80;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span className={isNearLimit ? 'text-orange-600' : 'text-gray-600'}>
            {current} / {limit}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {isNearLimit && (
          <p className="text-xs text-orange-600 mt-1">
            Approaching limit - consider upgrading
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plans & Billing</h1>
        <p className="text-gray-600">Choose the right plan for your needs</p>
      </div>
      
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            className={`px-4 py-2 rounded ${!showAnnual ? 'bg-white shadow' : ''}`}
            onClick={() => setShowAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded ${showAnnual ? 'bg-white shadow' : ''}`}
            onClick={() => setShowAnnual(true)}
          >
            Annual
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Save 20%
            </span>
          </button>
        </div>
      </div>
      
      {/* Usage overview */}
      {usage && (
        <div className="bg-white border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Current Usage</h2>
          {renderUsageBar(usage.ocrPages, plans.find(p => p.id === currentPlan)?.limits.ocrPages, 'OCR Pages')}
          {renderUsageBar(usage.apiCalls, plans.find(p => p.id === currentPlan)?.limits.apiCalls, 'API Calls')}
          {renderUsageBar(usage.storageGb, plans.find(p => p.id === currentPlan)?.limits.storageGb, 'Storage (GB)')}
        </div>
      )}
      
      {/* Plans grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className={`border rounded-lg p-6 ${
              plan.id === currentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            {plan.id === currentPlan && (
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded inline-block mb-4">
                Current Plan
              </div>
            )}
            
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            
            {plan.price !== null ? (
              <div className="mb-4">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-600">/{showAnnual ? 'mo' : 'month'}</span>
                {showAnnual && plan.price > 0 && (
                  <div className="text-sm text-green-600 mt-1">
                    ${plan.price * 12}/year
                  </div>
                )}
              </div>
            ) : (
              <div className="text-2xl font-bold mb-4">Custom</div>
            )}
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            {plan.id !== currentPlan && (
              <button
                onClick={() => plan.price !== null ? handleUpgrade(plan.id) : navigate('/contact')}
                disabled={loading}
                className={`w-full py-2 px-4 rounded font-medium transition ${
                  plan.id === 'enterprise' 
                    ? 'bg-gray-800 text-white hover:bg-gray-900'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* Manage billing */}
      {currentPlan !== 'free' && (
        <div className="text-center">
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage billing & invoices →
          </button>
        </div>
      )}
    </div>
  );
}
