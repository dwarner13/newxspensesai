import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, RotateCcw, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { Button } from '../../components/ui/button';

interface ProfileData {
  id: string;
  email: string | null;
  display_name: string | null;
  business_name: string | null;
  currency: string | null;
  account_mode: 'personal' | 'business' | 'both' | null;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ProfilePage() {
  const { user, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [originalData, setOriginalData] = useState<Partial<ProfileData>>({});

  // Load profile data
  useEffect(() => {
    if (userId && userId !== '00000000-0000-4000-8000-000000000001') {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        console.error('Database connection unavailable');
        setLoading(false);
        return;
      }

      // Get current user from auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      // Try to load existing profile
      const { data: profileData, error: selectError } = await supabase
        .from('profiles')
        .select('id, email, display_name, business_name, currency, account_mode')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        const initialData = {
          display_name: profileData.display_name || '',
          business_name: profileData.business_name || '',
          currency: profileData.currency || 'CAD',
          account_mode: profileData.account_mode || 'both',
        };
        setFormData(initialData);
        setOriginalData(initialData);
      } else {
        // Create profile if missing
        const displayName = authUser.user_metadata?.full_name 
          || authUser.user_metadata?.name 
          || authUser.email?.split('@')[0] 
          || 'New User';

        const newProfileData = {
          id: userId,
          email: authUser.email || null,
          display_name: displayName,
          business_name: null,
          currency: 'CAD',
          account_mode: 'both' as const,
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select('id, email, display_name, business_name, currency, account_mode')
          .single();

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          setLoading(false);
          return;
        }

        setProfile(newProfile);
        const initialData = {
          display_name: newProfile.display_name || '',
          business_name: newProfile.business_name || '',
          currency: newProfile.currency || 'CAD',
          account_mode: newProfile.account_mode || 'both',
        };
        setFormData(initialData);
        setOriginalData(initialData);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !profile) return;

    try {
      setSaveStatus('saving');
      const supabase = getSupabase();
      if (!supabase) {
        setSaveStatus('error');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name || null,
          business_name: formData.business_name || null,
          currency: formData.currency || 'CAD',
          account_mode: formData.account_mode || 'both',
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update profile:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('saved');
        setOriginalData({ ...formData });
        setTimeout(() => setSaveStatus('idle'), 2000);
        // Reload profile to get updated data
        await loadProfile();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    setFormData({ ...originalData });
    setSaveStatus('idle');
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (loading) {
    return (
      <DashboardPageShell
        left={<div className="p-6 text-white">Loading...</div>}
        center={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        }
        right={<ActivityFeedSidebar scope="profile" />}
      />
    );
  }

  if (!profile || !user) {
    return (
      <DashboardPageShell
        left={<div className="p-6 text-white">No profile found</div>}
        center={<div className="p-6 text-white">Please sign in to view your profile</div>}
        right={<ActivityFeedSidebar scope="profile" />}
      />
    );
  }

  return (
    <DashboardPageShell
      left={
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-3 flex-shrink-0">
            <span className="text-3xl">👤</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">PROFILE</h3>
              <p className="text-xs text-slate-500">Account management</p>
            </div>
          </div>
          <div className="space-y-2 flex-shrink-0">
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm text-white mt-1">{profile.email || user.email || 'Not set'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400">User ID</p>
              <p className="text-sm text-white mt-1 font-mono text-xs">{profile.id}</p>
            </div>
          </div>
        </div>
      }
      center={
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/settings')}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Settings
              </Button>
            </div>

            <h2 className="text-lg font-bold text-white mb-3">
              Profile Settings
            </h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">
              Manage your account information and preferences
            </p>
            
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your display name"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business Name <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.business_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your business name"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency || 'CAD'}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>

              {/* Role/Goal */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role / Goal
                </label>
                <select
                  value={formData.account_mode || 'both'}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_mode: e.target.value as 'personal' | 'business' | 'both' }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Email <span className="text-slate-500 text-xs">(read-only)</span>
                </label>
                <input
                  type="text"
                  value={profile.email || user.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* User ID (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  User ID <span className="text-slate-500 text-xs">(read-only)</span>
                </label>
                <input
                  type="text"
                  value={profile.id}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed font-mono text-xs"
                />
              </div>
            </div>

            {/* Status Indicator */}
            <div className="mt-6 flex items-center gap-2">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-blue-400">Saving…</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">Error</span>
                </>
              )}
              {saveStatus === 'idle' && hasChanges && (
                <span className="text-sm text-slate-400">You have unsaved changes</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={handleReset}
                disabled={!hasChanges || saveStatus === 'saving'}
                variant="secondary"
                size="default"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500/30 text-white text-xs sm:text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveStatus === 'saving'}
                variant="secondary"
                size="default"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500/30 text-white text-xs sm:text-sm"
              >
                <Save className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      }
      right={<ActivityFeedSidebar scope="profile" />}
    />
  );
}
