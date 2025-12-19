import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { Button } from '../../components/ui/button';

export default function SecurityPage() {
  const navigate = useNavigate();

  return (
    <DashboardPageShell
      left={
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-3 flex-shrink-0">
            <span className="text-3xl">🛡️</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">SECURITY</h3>
              <p className="text-xs text-slate-500">Account management</p>
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
              Security
            </h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">
              Manage your security settings, two-factor authentication, and session management
            </p>
            
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-12 h-12 text-slate-400" />
              </div>
              <div className="inline-flex items-center rounded-full bg-purple-500/10 px-4 py-2 text-sm text-purple-300 border border-purple-500/20">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      }
      right={<ActivityFeedSidebar scope="security" />}
    />
  );
}

