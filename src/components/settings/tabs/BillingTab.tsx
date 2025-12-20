/**
 * Billing & Plan Tab Content
 * 
 * Shows current plan status and upgrade options.
 * UX shell only (no real billing integrations yet).
 */

import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CreditCard, Sparkles, Zap, Music, Eye, Users } from 'lucide-react';
import { Button } from '../../ui/button';
import { isDemoMode } from '../../../lib/demoAuth';

export function BillingTab() {
  const { isDemoUser } = useAuth();
  const plan = isDemoUser ? 'Guest' : 'Premium'; // TODO: Get actual plan from profile/subscription

  const upcomingFeatures = [
    {
      icon: <Music className="w-5 h-5" />,
      title: 'Spotify Integration',
      description: 'Sync your music preferences with financial insights',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Podcast Engine',
      description: 'AI-generated financial podcasts personalized for you',
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: 'Advanced OCR',
      description: 'Enhanced receipt and document recognition',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Team Features',
      description: 'Collaborate with your team on financial planning',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Current Plan
        </h3>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
          <div>
            <p className="text-lg font-semibold text-white">{plan}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isDemoUser 
                ? 'Guest Mode - Limited features' 
                : 'Full access to all features'}
            </p>
          </div>
          <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <span className="text-xs font-medium text-purple-300">Active</span>
          </div>
        </div>
      </div>

      {/* Upgrade Section */}
      {!isDemoUser && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Upgrade Options
          </h3>

          <div className="space-y-3">
            <Button
              onClick={() => {
                // TODO: Open upgrade modal
                alert('Upgrade flow coming soon!');
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>

            <Button
              variant="secondary"
              disabled
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Subscription
              <span className="ml-2 text-xs">(Coming soon)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Upcoming Features */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Upcoming Features
        </h3>

        <div className="space-y-3">
          {upcomingFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                <div className="text-purple-300">{feature.icon}</div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{feature.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">Billing Information</h4>
            <p className="text-xs text-blue-400/80">
              {isDemoUser 
                ? 'Create an account to access billing features and manage your subscription.'
                : 'Billing management and subscription features are coming soon. Contact support for assistance.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}






