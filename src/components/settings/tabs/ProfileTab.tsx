/**
 * Profile Tab Content
 * 
 * Shows profile information and Custodian-guided setup flow.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getUserIdentity, 
  getGuestProfile, 
  saveGuestProfile,
  isProfileComplete,
  setGuestProfileCompleted
} from '../../../lib/userIdentity';
import { getSupabase } from '../../../lib/supabase';
import { User, Save, CheckCircle, ArrowRight, Sparkles, LogOut, UserPlus } from 'lucide-react';
import { Button } from '../../ui/button';
import { CustodianSetupFlow } from './CustodianSetupFlow';
import { CustodianSetupChat } from './CustodianSetupChat';
import { isDemoMode } from '../../../lib/demoAuth';
import { useNavigate } from 'react-router-dom';
import { GuestModeBanner } from '../../ui/GuestModeBanner';
import { PrimeCustodianOnboardingModal } from '../../onboarding/PrimeCustodianOnboardingModal';

interface ProfileData {
  displayName: string;
  email: string;
  businessName?: string;
  currency: string;
  goal: string;
  timezone?: string;
  primaryMode?: 'personal' | 'business' | 'both' | 'exploring';
  guidanceStyle?: 'explain_everything' | 'show_results_only' | 'mix';
  consentConfirmed?: boolean;
}

export function ProfileTab() {
  const { user, userId, isDemoUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('[ProfileTab] Sign out error:', error);
      setSigningOut(false);
    }
  };

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, [userId, isDemoUser]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const identity = await getUserIdentity();
      const complete = await isProfileComplete();
      setProfileComplete(complete);

      if (complete) {
        if (isDemoUser) {
          // Load from localStorage
          const guestProfile = getGuestProfile();
          setProfile({
            displayName: guestProfile?.displayName || identity.displayName,
            email: identity.email,
            businessName: guestProfile?.businessType,
            currency: guestProfile?.preferences?.currency || 'CAD',
            goal: guestProfile?.goals?.[0] || 'Personal',
            timezone: guestProfile?.timezone,
            primaryMode: guestProfile?.preferences?.primaryMode || 'exploring',
            guidanceStyle: guestProfile?.preferences?.guidanceStyle || 'mix',
            consentConfirmed: guestProfile?.consentConfirmed,
          });
        } else {
          // Load from Supabase
          const supabase = getSupabase();
          if (supabase && userId) {
            const { data } = await supabase
              .from('profiles')
              .select('display_name, email, business_name, currency, account_mode, metadata')
              .eq('id', userId)
              .maybeSingle();
            
            if (data) {
              const metadata = data.metadata as Record<string, any> || {};
              setProfile({
                displayName: data.display_name || identity.displayName,
                email: data.email || identity.email,
                businessName: data.business_name || undefined,
                currency: data.currency || 'CAD',
                goal: data.account_mode || 'personal',
                primaryMode: (data.account_mode as any) || 'exploring',
                guidanceStyle: metadata.guidance_style || 'mix',
                consentConfirmed: metadata.consent_confirmed || false,
              });
            }
          }
        }
      } else {
        // Profile incomplete - show setup
        setShowSetup(true);
      }
    } catch (error) {
      console.error('[ProfileTab] Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (profileData: Partial<ProfileData>) => {
    try {
      setSaving(true);
      
      if (isDemoUser) {
        // Save to localStorage
        saveGuestProfile({
          displayName: profileData.displayName,
          businessType: profileData.businessName,
          preferences: {
            currency: profileData.currency,
          },
          goals: profileData.goal ? [profileData.goal] : undefined,
          timezone: profileData.timezone,
        });
        
        // Mark guest profile as completed
        setGuestProfileCompleted(true);
        
        setProfileComplete(true);
        setShowSetup(false);
        await loadProfile();
        
        // Dispatch guest completion event
        window.dispatchEvent(new CustomEvent('guestProfileSetupComplete'));
      } else {
        // Save to Supabase
        const supabase = getSupabase();
        if (!supabase || !userId) {
          throw new Error('Supabase not available');
        }

        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            display_name: profileData.displayName,
            business_name: profileData.businessName || null,
            currency: profileData.currency || 'CAD',
            account_mode: profileData.goal || 'personal',
            profile_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          });

        setProfileComplete(true);
        setShowSetup(false);
        await loadProfile();
        
        // Dispatch completion event
        window.dispatchEvent(new CustomEvent('profileSetupComplete'));
      }
    } catch (error) {
      console.error('[ProfileTab] Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading profile...</div>
      </div>
    );
  }

  // Show Custodian conversational setup if profile incomplete
  if (showSetup || !profileComplete) {
    return (
      <div className="space-y-6">
        {/* Guest Mode Banner */}
        {isDemoMode() && isDemoUser && <GuestModeBanner />}
        
        <div className="h-[600px] -mx-6 -my-6">
          <CustodianSetupChat
            onComplete={async (answers) => {
              // Map conversational answers to profile data
              const profileData: Partial<ProfileData> = {
                displayName: answers.displayName || '',
                goal: answers.focus || 'personal',
                currency: 'CAD', // Default
              };
              
              await handleSave(profileData);
            }}
          />
        </div>
        
        {/* Sign Out Section - Always visible */}
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

  // Show profile summary
  return (
    <div className="space-y-6">
      {/* Guest Mode Banner */}
      {isDemoMode() && isDemoUser && <GuestModeBanner />}

      {/* Create Account CTA for Guest Users */}
      {isDemoMode() && isDemoUser && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-2">
                Create account to save permanently
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Your profile is currently stored locally. Create an account to sync across devices and never lose your data.
              </p>
              <Button
                onClick={() => navigate('/signup')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Summary Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              {profile?.displayName || 'User'}
            </h3>
            <p className="text-sm text-slate-400">{profile?.email}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Profile Complete</span>
          </div>
        </div>

        {/* Profile Details - Read-Only */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-sm text-slate-400">Display Name</span>
            <span className="text-sm text-white">{profile?.displayName || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-sm text-slate-400">Primary Mode</span>
            <span className="text-sm text-white capitalize">
              {profile?.primaryMode === 'personal' ? 'Personal finances' :
               profile?.primaryMode === 'business' ? 'Business finances' :
               profile?.primaryMode === 'both' ? 'Both' :
               profile?.primaryMode === 'exploring' ? 'Just exploring' :
               'Not set'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-sm text-slate-400">Guidance Style</span>
            <span className="text-sm text-white capitalize">
              {profile?.guidanceStyle === 'explain_everything' ? 'Explain everything' :
               profile?.guidanceStyle === 'show_results_only' ? 'Show results only' :
               profile?.guidanceStyle === 'mix' ? 'A mix of both' :
               'Not set'}
            </span>
          </div>
          {profile?.businessName && (
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-sm text-slate-400">Business Name</span>
              <span className="text-sm text-white">{profile.businessName}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-sm text-slate-400">Currency</span>
            <span className="text-sm text-white">{profile?.currency || 'CAD'}</span>
          </div>
          {profile?.timezone && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400">Timezone</span>
              <span className="text-sm text-white">{profile.timezone}</span>
            </div>
          )}
        </div>

        <Button
          onClick={() => setShowEditModal(true)}
          className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Ask Custodian to update profile
        </Button>

        {/* Edit Modal */}
        <PrimeCustodianOnboardingModal
          isOpen={showEditModal}
          onComplete={() => {
            setShowEditModal(false);
            loadProfile(); // Reload profile after edit
          }}
        />
      </div>

      {/* Custodian Tips */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">Custodian Tips</h4>
            <p className="text-xs text-blue-400/80">
              Your profile helps Custodian personalize your experience. You can update it anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Sign Out Section */}
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

