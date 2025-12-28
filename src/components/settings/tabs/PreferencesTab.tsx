/**
 * Preferences Tab Content
 * 
 * Real toggles for user preferences (stored locally for guest, in profiles for auth).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getGuestPreferences, 
  saveGuestPreferences 
} from '../../../lib/userIdentity';
import { getSupabase } from '../../../lib/supabase';
import { Moon, Sun, Bell, Sparkles, Users } from 'lucide-react';
import { Button } from '../../ui/button';

interface Preferences {
  darkMode: boolean;
  aiProactiveInsights: boolean;
  enableNotifications: boolean;
  defaultEmployee: string;
}

const EMPLOYEES = [
  { id: 'prime-boss', label: 'Prime', emoji: '👑' },
  { id: 'custodian', label: 'Custodian', emoji: '🔧' },
  { id: 'byte', label: 'Byte', emoji: '📄' },
];

export function PreferencesTab() {
  const { userId, isDemoUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>({
    darkMode: false,
    aiProactiveInsights: true,
    enableNotifications: true,
    defaultEmployee: 'prime-boss',
  });

  useEffect(() => {
    loadPreferences();
  }, [userId, isDemoUser]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      if (isDemoUser) {
        // Load from localStorage
        const guestPrefs = getGuestPreferences();
        setPrefs({
          darkMode: guestPrefs.darkMode ?? false,
          aiProactiveInsights: guestPrefs.aiProactiveInsights ?? true,
          enableNotifications: guestPrefs.enableNotifications ?? true,
          defaultEmployee: guestPrefs.defaultEmployee || 'prime-boss',
        });
      } else {
        // Load from Supabase profiles.preferences (if column exists)
        const supabase = getSupabase();
        if (supabase && userId) {
          const { data } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', userId)
            .maybeSingle();
          
          if (data?.preferences) {
            setPrefs({
              darkMode: data.preferences.darkMode ?? false,
              aiProactiveInsights: data.preferences.aiProactiveInsights ?? true,
              enableNotifications: data.preferences.enableNotifications ?? true,
              defaultEmployee: data.preferences.defaultEmployee || 'prime-boss',
            });
          }
        }
      }
    } catch (error) {
      console.error('[PreferencesTab] Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof Preferences, value: boolean | string) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    try {
      if (isDemoUser) {
        // Save to localStorage
        saveGuestPreferences({
          darkMode: newPrefs.darkMode,
          aiProactiveInsights: newPrefs.aiProactiveInsights,
          enableNotifications: newPrefs.enableNotifications,
          defaultEmployee: newPrefs.defaultEmployee,
        });
      } else {
        // Save to Supabase (if preferences column exists)
        const supabase = getSupabase();
        if (supabase && userId) {
          await supabase
            .from('profiles')
            .update({ preferences: newPrefs })
            .eq('id', userId);
        }
      }
    } catch (error) {
      console.error('[PreferencesTab] Failed to save preferences:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dark Mode Toggle */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {prefs.darkMode ? (
              <Moon className="w-5 h-5 text-blue-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h4 className="text-sm font-semibold text-white">Dark Mode</h4>
              <p className="text-xs text-slate-400">Toggle dark/light theme</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.darkMode}
              onChange={(e) => handleToggle('darkMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* AI Proactive Insights */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h4 className="text-sm font-semibold text-white">AI Proactive Insights</h4>
              <p className="text-xs text-slate-400">Get AI-powered suggestions and insights</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.aiProactiveInsights}
              onChange={(e) => handleToggle('aiProactiveInsights', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-green-400" />
            <div>
              <h4 className="text-sm font-semibold text-white">Enable Notifications</h4>
              <p className="text-xs text-slate-400">Receive updates and alerts</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enableNotifications}
              onChange={(e) => handleToggle('enableNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* Default Employee */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-sm font-semibold text-white">Default AI Employee</h4>
              <p className="text-xs text-slate-400">Who should handle your requests by default</p>
            </div>
          </div>
          <select
            value={prefs.defaultEmployee}
            onChange={(e) => handleToggle('defaultEmployee', e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EMPLOYEES.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.emoji} {emp.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">Preferences Saved</h4>
            <p className="text-xs text-blue-400/80">
              Your preferences are saved automatically. Changes take effect immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}















