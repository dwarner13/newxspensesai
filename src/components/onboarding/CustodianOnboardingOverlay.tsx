/**
 * Custodian Onboarding Overlay
 * 
 * @deprecated DO NOT USE - This component is legacy and has been replaced.
 * Use PrimeCustodianOnboardingModal via UnifiedOnboardingFlow instead.
 * 
 * This component is kept for reference only and should never be rendered.
 * UnifiedOnboardingFlow is the ONLY canonical authority for onboarding UI.
 * 
 * Premium in-app onboarding overlay that appears on dashboard
 * - Glass + glow styling matching dashboard chat cards
 * - Centered overlay with dark blurred backdrop
 * - Stepper showing progress
 * - No navbar/footer - pure overlay experience
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import { ONBOARDING_MODE } from '../../config/onboardingConfig';

interface CustodianOnboardingOverlayProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function CustodianOnboardingOverlay({ 
  isOpen, 
  onComplete 
}: CustodianOnboardingOverlayProps) {
  // Hard-block: Prevent mounting if legacy onboarding is disabled
  if (!ONBOARDING_MODE.legacyEnabled) {
    return null;
  }
  const { user, userId, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    display_name: '',
    account_type: 'both' as 'personal' | 'business' | 'both',
    currency: 'CAD',
  });

  // Prefill from profile or user metadata
  React.useEffect(() => {
    if (user && profile) {
      const displayName = 
        profile?.display_name?.trim() ||
        profile?.full_name?.trim() ||
        user.user_metadata?.full_name || 
        user.user_metadata?.name || 
        user.email?.split('@')[0] || 
        '';
      
      setFormData(prev => ({
        ...prev,
        display_name: displayName,
        account_type: (profile?.account_type as 'personal' | 'business' | 'both') || 'both',
        currency: profile?.currency || 'CAD',
      }));
    }
  }, [user, profile]);

  const handleSave = async () => {
    if (!userId || !user) {
      return;
    }

    if (!formData.display_name.trim()) {
      return;
    }

    try {
      setSaving(true);
      const supabase = getSupabase();
      if (!supabase) {
        return;
      }

      // CRITICAL: Use updateProfileMetadata helper to ensure merge (never replace)
      const { updateProfileMetadata } = await import('../../lib/profileMetadataHelpers');
      const existingMetadata = profile?.metadata && typeof profile.metadata === 'object' 
        ? profile.metadata as Record<string, any> 
        : {};
      await updateProfileMetadata(userId, {
        onboarding: {
          completed: true,
          version: 1,
          completed_at: new Date().toISOString(),
        },
      }, existingMetadata);

      // Build payload (metadata updated separately via helper)
      const payload = {
        id: userId,
        email: user.email || null,
        display_name: formData.display_name.trim() || null,
        account_type: formData.account_type,
        currency: formData.currency,
        // NOTE: metadata is updated separately via updateProfileMetadata helper above
      };

      // Upsert profile
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, {
          onConflict: 'id'
        })
        .select();

      if (error) {
        console.error('[CustodianOnboardingOverlay] Failed to save:', error);
        return;
      }

      // Refresh profile in AuthContext
      await refreshProfile();

      // Complete onboarding
      onComplete();
    } catch (error: any) {
      console.error('[CustodianOnboardingOverlay] Error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred backdrop with vignette */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl"
          >
            {/* Vignette effect */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
          </motion.div>

          {/* Centered overlay */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
              className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border border-slate-700/60 shadow-[0_18px_60px_rgba(15,23,42,0.85)] pointer-events-auto flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              {/* Subtle radial glow */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
              
              {/* Header */}
              <div className="relative flex-shrink-0 p-6 border-b border-slate-800/80">
                <div className="flex items-center gap-4">
                  {/* Custodian Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-pink-500/40 blur-xl" />
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white mb-1">
                      Welcome to XspensesAI
                    </h2>
                    <p className="text-sm text-slate-400">
                      Let's set up your profile • Question 1 of 3
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-sm"
                    placeholder="Your display name"
                    autoFocus
                  />
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Goal
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value as 'personal' | 'business' | 'both' }))}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-sm"
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-sm"
                  >
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-6 border-t border-slate-800/80 flex justify-end gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.display_name.trim()}
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-8 py-2.5 text-sm disabled:opacity-50 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200"
                >
                  {saving ? 'Saving...' : 'Complete Setup'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

