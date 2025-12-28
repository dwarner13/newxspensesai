/**
 * Data & Privacy Tab Content
 * 
 * Data management and privacy controls.
 * Includes: Download data, Delete account, Clear guest data.
 */

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Download, Trash2, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { isDemoMode } from '../../../lib/demoAuth';
import { clearGuestSession } from '../../../lib/demoAuth';
import { useNavigate } from 'react-router-dom';

export function DataPrivacyTab() {
  const { isDemoUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const handleClearGuestData = async () => {
    if (!confirm('This will clear all local guest data. Are you sure?')) {
      return;
    }

    try {
      setClearing(true);
      
      // Clear all guest-related localStorage keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('guest') || key.includes('demo') || key.includes('xai_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear guest session
      clearGuestSession();
      
      // Sign out and redirect to login
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('[DataPrivacyTab] Failed to clear guest data:', error);
      alert('Failed to clear guest data. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Data Export
        </h3>

        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Download all your data in a portable format.
          </p>
          <Button
            variant="secondary"
            disabled
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            Download My Data
            <span className="ml-2 text-xs">(Coming soon)</span>
          </Button>
        </div>
      </div>

      {/* Account Deletion */}
      {!isDemoUser && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Account Deletion
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-300 font-medium mb-1">
                  Permanent Action
                </p>
                <p className="text-xs text-red-400/80">
                  Deleting your account will permanently remove all your data. This action cannot be undone.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              disabled
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
              <span className="ml-2 text-xs">(Coming soon)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Guest Data Management */}
      {isDemoMode() && isDemoUser && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Guest Data Management
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Clear all local guest data and return to the login page. This will remove your guest profile, preferences, and session data.
            </p>
            <Button
              onClick={handleClearGuestData}
              disabled={clearing}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${clearing ? 'animate-spin' : ''}`} />
              {clearing ? 'Clearing...' : 'Clear Local Guest Data'}
            </Button>
          </div>
        </div>
      )}

      {/* Privacy Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">Privacy & Security</h4>
            <p className="text-xs text-blue-400/80">
              {isDemoUser 
                ? 'Guest Mode data is stored locally in your browser. Sign in to sync your data securely across devices.'
                : 'Your data is encrypted and protected. We never share your information with third parties.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}















