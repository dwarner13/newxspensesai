import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, Sparkles, Globe, DollarSign, Calendar, Shield, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';

interface ProfileData {
  id: string;
  email: string | null;
  display_name: string | null;
  account_name: string | null;
  avatar_url: string | null;
  time_zone: string | null;
  currency: string | null;
  date_locale: string | null;
  account_mode: 'personal' | 'business' | 'both';
  business_name: string | null;
  role: 'free' | 'premium' | 'admin';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
}

interface CustodianSuggestion {
  id: string;
  field: keyof ProfileData;
  label: string;
  value: string;
  reason: string;
}

export default function ProfilePage() {
  const { user, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [suggestions, setSuggestions] = useState<CustodianSuggestion[]>([]);

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId || userId === '00000000-0000-4000-8000-000000000001') {
      // Demo user - skip
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        toast.error('Database connection unavailable');
        setLoading(false);
        return;
      }

      // Try to load existing profile
      const { data: profileData, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          display_name: profileData.display_name || '',
          account_name: profileData.account_name || '',
          avatar_url: profileData.avatar_url || '',
          time_zone: profileData.time_zone || '',
          currency: profileData.currency || 'USD',
          date_locale: profileData.date_locale || 'en-US',
          account_mode: profileData.account_mode || 'both',
          business_name: profileData.business_name || '',
        });
      } else {
        // Create profile if missing
        const userEmail = user?.email || '';
        const displayName = user?.user_metadata?.full_name 
          || user?.user_metadata?.name 
          || userEmail.split('@')[0] 
          || 'New User';

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            display_name: displayName,
            account_name: displayName,
            role: 'free',
            plan: 'free',
            currency: 'USD',
            date_locale: 'en-US',
            account_mode: 'both',
            business_name: null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          toast.error('Failed to create profile');
        } else {
          setProfile(newProfile);
          setFormData({
            display_name: newProfile.display_name || '',
            account_name: newProfile.account_name || '',
            avatar_url: newProfile.avatar_url || '',
            time_zone: newProfile.time_zone || '',
            currency: newProfile.currency || 'USD',
            date_locale: newProfile.date_locale || 'en-US',
            account_mode: newProfile.account_mode || 'both',
            business_name: newProfile.business_name || '',
          });
        }
      }

      // Generate Custodian suggestions
      generateSuggestions(profileData || null);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = (currentProfile: ProfileData | null) => {
    const newSuggestions: CustodianSuggestion[] = [];

    // Suggestion 1: Currency based on timezone
    if (!currentProfile?.currency && currentProfile?.time_zone) {
      const tz = currentProfile.time_zone.toLowerCase();
      if (tz.includes('canada') || tz.includes('toronto') || tz.includes('vancouver')) {
        newSuggestions.push({
          id: 'currency-cad',
          field: 'currency',
          label: 'Currency',
          value: 'CAD',
          reason: 'Detected Canadian timezone',
        });
      }
    }

    // Suggestion 2: Display name from email
    if (!currentProfile?.display_name && user?.email) {
      const nameFromEmail = user.email.split('@')[0];
      newSuggestions.push({
        id: 'display-name-email',
        field: 'display_name',
        label: 'Display Name',
        value: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
        reason: 'Derived from email address',
      });
    }

    // Suggestion 3: Timezone from browser
    if (!currentProfile?.time_zone) {
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        newSuggestions.push({
          id: 'timezone-browser',
          field: 'time_zone',
          label: 'Timezone',
          value: browserTz,
          reason: 'Detected from browser settings',
        });
      } catch (e) {
        // Ignore
      }
    }

    // Suggestion 4: Date locale from browser
    if (!currentProfile?.date_locale) {
      try {
        const browserLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        newSuggestions.push({
          id: 'date-locale-browser',
          field: 'date_locale',
          label: 'Date Locale',
          value: browserLocale,
          reason: 'Detected from browser settings',
        });
      } catch (e) {
        // Ignore
      }
    }

    setSuggestions(newSuggestions);
  };

  const applySuggestion = (suggestion: CustodianSuggestion) => {
    setFormData(prev => ({
      ...prev,
      [suggestion.field]: suggestion.value,
    }));
    
    // Remove suggestion after applying
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    toast.success(`Applied suggestion: ${suggestion.label}`);
  };

  const handleSave = async () => {
    if (!userId || !profile) return;

    try {
      setSaving(true);
      const supabase = getSupabase();
      if (!supabase) {
        toast.error('Database connection unavailable');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name || null,
          account_name: formData.account_name || null,
          avatar_url: formData.avatar_url || null,
          time_zone: formData.time_zone || null,
          currency: formData.currency || 'USD',
          date_locale: formData.date_locale || 'en-US',
          account_mode: formData.account_mode || 'both',
          business_name: (formData.account_mode === 'business' || formData.account_mode === 'both') 
            ? (formData.business_name || null) 
            : null,
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update profile:', error);
        toast.error('Failed to save profile');
      } else {
        toast.success('Profile saved successfully');
        // Reload profile to get updated data
        await loadProfile();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

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

  if (!profile) {
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
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Profile</h3>
              <p className="text-xs text-slate-400">Manage your account</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm text-white mt-1">{profile.email || 'Not set'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400">Role</p>
              <p className="text-sm text-white mt-1 capitalize">{profile.role}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400">Plan</p>
              <p className="text-sm text-white mt-1 capitalize">{profile.plan}</p>
            </div>
          </div>
        </div>
      }
      center={
        <div className="space-y-6">
          {/* Profile Basics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Basics
            </h2>
            
            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.account_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Account name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={formData.avatar_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Timezone
                </label>
                <input
                  type="text"
                  value={formData.time_zone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, time_zone: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="America/New_York"
                />
                <p className="text-xs text-slate-500 mt-1">Example: America/New_York, Europe/London</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Currency
                </label>
                <select
                  value={formData.currency || 'USD'}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Locale
                </label>
                <select
                  value={formData.date_locale || 'en-US'}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_locale: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="en-US">en-US - English (US)</option>
                  <option value="en-GB">en-GB - English (UK)</option>
                  <option value="fr-FR">fr-FR - French</option>
                  <option value="de-DE">de-DE - German</option>
                  <option value="es-ES">es-ES - Spanish</option>
                  <option value="ja-JP">ja-JP - Japanese</option>
                </select>
              </div>

              {/* Account Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Account Mode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, account_mode: 'personal' }))}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.account_mode === 'personal'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, account_mode: 'business' }))}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.account_mode === 'business'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, account_mode: 'both' }))}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.account_mode === 'both'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    Both
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Choose how you'll use XspensesAI</p>
              </div>

              {/* Business Name - shown when account_mode is business or both */}
              {(formData.account_mode === 'business' || formData.account_mode === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.business_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your business name"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Custodian Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Smart Profile (Custodian Suggestions)
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                We've detected some smart defaults for your profile. Click "Apply" to use them.
              </p>
              
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 bg-slate-800/50 border border-purple-700/30 rounded-lg flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{suggestion.label}</span>
                        <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
                          {suggestion.value}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{suggestion.reason}</p>
                    </div>
                    <button
                      onClick={() => applySuggestion(suggestion)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Role
                </label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Role is managed by system</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Plan
                </label>
                <input
                  type="text"
                  value={profile.plan}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Plan is managed by system</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      }
      right={<ActivityFeedSidebar scope="profile" />}
    />
  );
}

