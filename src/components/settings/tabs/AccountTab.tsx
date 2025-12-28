/**
 * Account Tab Content
 * 
 * View/edit core account info (profile basics).
 * Guest Mode: Limited view + "Sign in to save" messaging.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserIdentity, getGuestProfile, saveGuestProfile } from '../../../lib/userIdentity';
import { getSupabase } from '../../../lib/supabase';
import { User, Save, Upload, AlertCircle, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { Button } from '../../ui/button';
import { isDemoMode } from '../../../lib/demoAuth';
import { useProfile } from '../../../hooks/useProfile';
import { SignOutConfirmationModal } from '../../auth/SignOutConfirmationModal';

export function AccountTab() {
  const { user, userId, isDemoUser, signOut } = useAuth();
  const profile = useProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [guestModeExpanded, setGuestModeExpanded] = useState(false);
  const [profileDebugExpanded, setProfileDebugExpanded] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    loadAccountInfo();
  }, [userId, isDemoUser]);

  const loadAccountInfo = async () => {
    try {
      setLoading(true);
      const identity = await getUserIdentity();
      
      if (isDemoUser) {
        const guestProfile = getGuestProfile();
        setDisplayName(guestProfile?.displayName || identity.displayName || 'Guest');
        setEmail('Guest Mode');
      } else {
        setDisplayName(identity.displayName || user?.email?.split('@')[0] || 'User');
        setEmail(user?.email || identity.email || '');
        
        // Try to load from profiles table
        const supabase = getSupabase();
        if (supabase && userId) {
          const { data } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .maybeSingle();
          
          if (data?.display_name) {
            setDisplayName(data.display_name);
          }
        }
      }
    } catch (error) {
      console.error('[AccountTab] Failed to load account info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges || saving) return;

    try {
      setSaving(true);

      if (isDemoUser) {
        // Save to localStorage
        const existingProfile = getGuestProfile() || {};
        saveGuestProfile({
          ...existingProfile,
          displayName: displayName.trim() || 'Guest',
        });
        setHasChanges(false);
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
            display_name: displayName.trim(),
          });

        setHasChanges(false);
      }
    } catch (error) {
      console.error('[AccountTab] Failed to save:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading account info...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      {/* Account Info Card - Compact Layout */}
      <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 flex-1 flex flex-col min-h-0">
        {/* Compact Header Row: Avatar + Name + Email */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {displayName || 'Guest'}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {email || 'Guest Mode'}
            </p>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {/* Display Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setHasChanges(true);
              }}
              disabled={isDemoUser}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your display name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-1.5 bg-slate-800/50 border border-slate-700/40 rounded-lg text-slate-400 text-sm cursor-not-allowed"
            />
            {isDemoUser && (
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in to change your email
              </p>
            )}
          </div>
        </div>

        {/* Save Button / Guest Mode Accordion */}
        <div className="mt-3">
          {isDemoUser ? (
            <div className="bg-blue-500/10 border border-blue-500/15 rounded-lg overflow-hidden">
              <button
                onClick={() => setGuestModeExpanded(!guestModeExpanded)}
                className="w-full flex items-center justify-between p-2.5 text-left hover:bg-blue-500/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-xs text-blue-300 font-medium">
                    Guest Mode
                  </span>
                </div>
                {guestModeExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                )}
              </button>
              {guestModeExpanded && (
                <div className="px-2.5 pb-2.5 pt-1">
                  <p className="text-xs text-blue-400/80">
                    Try everything freely. Sign in when you're ready to save your progress.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-1.5 h-auto"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-sm">{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Profile Debug Panel (Dev Only) - Collapsible, collapsed by default */}
      {import.meta.env.DEV && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setProfileDebugExpanded(!profileDebugExpanded)}
            className="w-full flex items-center justify-between p-2.5 text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-white">
                Profile Debug (Dev Only)
              </span>
            </div>
            {profileDebugExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            )}
          </button>
          {profileDebugExpanded && (
            <div className="px-2.5 pb-2.5 pt-1 space-y-1 text-[10px] font-mono">
              <div className="flex gap-2">
                <span className="text-slate-400">ID:</span>
                <span className="text-slate-200">{profile.rawProfile?.id || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">first_name:</span>
                <span className="text-slate-200">{profile.rawProfile?.first_name || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">display_name:</span>
                <span className="text-slate-200">{profile.rawProfile?.display_name || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">Name:</span>
                <span className="text-slate-200">{profile.displayName || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-200">{profile.email || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">currency:</span>
                <span className="text-slate-200">{profile.rawProfile?.currency || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">time_zone:</span>
                <span className="text-slate-200">{profile.rawProfile?.time_zone || profile.rawProfile?.metadata?.timezone || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">account_type:</span>
                <span className="text-slate-200">{profile.rawProfile?.account_type || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">onboarding_status:</span>
                <span className="text-slate-200">{profile.rawProfile?.onboarding_status || 'null'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400">Plan:</span>
                <span className="text-slate-200">{profile.plan || 'null'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sign Out Section (only for authenticated users) */}
      {!isDemoUser && (
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-white">Sign out</p>
                <p className="text-xs text-slate-400">Custodian will securely sign you out of this device.</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSignOutConfirm(true)}
              variant="secondary"
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            >
              Sign out
            </Button>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmationModal
        isOpen={showSignOutConfirm}
        onConfirm={async () => {
          setShowSignOutConfirm(false);
          await signOut();
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
}

