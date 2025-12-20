import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Save, ArrowLeft, CheckCircle, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ProfileFormData {
  display_name: string;
  business_name: string;
  account_mode: 'personal' | 'business' | 'both';
  currency: string;
}

export default function OnboardingSetupPage() {
  const navigate = useNavigate();
  const { user, userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    business_name: '',
    account_mode: 'both',
    currency: 'CAD',
  });

  // Prefill from auth metadata on mount
  useEffect(() => {
    if (user) {
      const displayName = 
        user.user_metadata?.full_name || 
        user.user_metadata?.name || 
        user.email?.split('@')[0] || 
        '';
      
      setFormData(prev => ({
        ...prev,
        display_name: displayName,
      }));
    }
  }, [user]);

  const handleSave = async () => {
    if (!userId || !user) {
      toast.error('Please sign in to continue');
      return;
    }

    if (!formData.display_name.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    try {
      setSaving(true);
      const supabase = getSupabase();
      if (!supabase) {
        toast.error('Database connection unavailable');
        return;
      }

      // Upsert profile with all fields and mark as completed
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user.email || null,
          display_name: formData.display_name.trim() || null,
          business_name: formData.business_name.trim() || null,
          account_mode: formData.account_mode,
          currency: formData.currency,
          profile_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Failed to save profile:', error);
        toast.error('Failed to save profile. Please try again.');
        return;
      }

      toast.success('Profile saved successfully!');
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding/welcome')}
            className="text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Profile Setup</h1>
          </div>
          <p className="text-sm text-slate-400">
            Custodian will help you set up your profile. Please review and confirm your information.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Your Information</h2>
            
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your display name"
                  required
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business Name <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your business name"
                />
              </div>

              {/* Account Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Goal
                </label>
                <select
                  value={formData.account_mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_mode: e.target.value as 'personal' | 'business' | 'both' }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            </div>
          </div>

          {/* Profile Preview & Custodian Tips */}
          <div className="space-y-6">
            {/* Profile Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Profile Preview
              </h2>
              
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-xs text-slate-400">Display Name</p>
                  <p className="text-sm text-white mt-1">{formData.display_name || 'Not set'}</p>
                </div>
                
                {formData.business_name && (
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-xs text-slate-400">Business Name</p>
                    <p className="text-sm text-white mt-1">{formData.business_name}</p>
                  </div>
                )}
                
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-xs text-slate-400">Goal</p>
                  <p className="text-sm text-white mt-1 capitalize">{formData.account_mode}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-xs text-slate-400">Currency</p>
                  <p className="text-sm text-white mt-1">{formData.currency}</p>
                </div>
                
                {user?.email && (
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm text-white mt-1">{user.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Custodian Tips */}
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400" />
                Custodian Tips
              </h3>
              
              <div className="space-y-2 text-xs text-slate-300">
                <p><strong className="text-purple-300">Display Name:</strong> This is how you'll appear throughout XspensesAI.</p>
                <p><strong className="text-purple-300">Business Name:</strong> Optional. Add if you're using this for business expenses.</p>
                <p><strong className="text-purple-300">Goal:</strong> Choose how you'll use XspensesAI - personal, business, or both.</p>
                <p><strong className="text-purple-300">Currency:</strong> Your default currency for transactions and reports.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !formData.display_name.trim()}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-8 py-3 text-base disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}






