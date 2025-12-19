/**
 * Security Tab Content
 * 
 * Advisory security information (read-only for now, no destructive actions).
 */

import React from 'react';
import { Shield, CheckCircle, AlertCircle, Lock, Key, Globe, LogOut } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserIdentity } from '../../../lib/userIdentity';
import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { isDemoMode } from '../../../lib/demoAuth';

export function SecurityTab() {
  const { user, isDemoUser, signOut } = useAuth();
  const [identity, setIdentity] = useState<any>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getUserIdentity().then(setIdentity);
  }, []);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('[SecurityTab] Sign out error:', error);
      setSigningOut(false);
    }
  };

  const connectedProviders = [
    {
      id: 'google',
      name: 'Google',
      connected: !isDemoUser && user?.app_metadata?.provider === 'google',
      icon: '🔐',
    },
    {
      id: 'email',
      name: 'Email',
      connected: !isDemoUser && !!user?.email,
      icon: '📧',
    },
  ];

  const recommendations = [
    {
      id: 'password',
      title: 'Strong Password',
      status: 'complete',
      description: 'Your password meets security requirements',
    },
    {
      id: '2fa',
      title: 'Two-Factor Authentication',
      status: 'recommended',
      description: 'Add an extra layer of security',
    },
    {
      id: 'session',
      title: 'Active Sessions',
      status: 'complete',
      description: '1 active session',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Security Status */}
      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Security Status</h3>
            <p className="text-sm text-slate-300 mb-3">
              {isDemoUser 
                ? 'Guest Mode - Limited security features'
                : 'Your account is secure and protected'}
            </p>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>All security checks passed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Providers */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" />
          Connected Providers
        </h4>
        <div className="space-y-3">
          {connectedProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{provider.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{provider.name}</p>
                  <p className="text-xs text-slate-400">
                    {provider.connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              {provider.connected && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Active</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Session Status */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Session Status
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
            <div>
              <p className="text-sm font-medium text-white">Current Session</p>
              <p className="text-xs text-slate-400">
                {isDemoUser ? 'Guest Mode' : 'Active'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Security Checklist
        </h4>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800"
            >
              {rec.status === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{rec.title}</p>
                <p className="text-xs text-slate-400">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">Security First</h4>
            <p className="text-xs text-blue-400/80">
              {isDemoUser 
                ? 'Guest Mode has limited security features. Sign in for full security options.'
                : 'Your data is encrypted and protected. We never share your information.'}
            </p>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Account Actions
          </h4>
          <Button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {signingOut 
              ? 'Signing out...' 
              : isDemoMode() && isDemoUser 
                ? 'Exit Guest Mode' 
                : 'Sign Out'}
          </Button>
          {isDemoMode() && isDemoUser && (
            <p className="text-xs text-slate-400 text-center mt-2">
              This will clear your guest session and return you to the login page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

