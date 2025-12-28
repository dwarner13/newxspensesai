/**
 * Security Self-Check Page (Dev Only)
 * 
 * Lightweight dev tool to verify security configuration.
 * Only accessible in development mode.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { runSecuritySelfCheck, logSecurityCheck, type SecurityCheckResult } from '../../lib/securitySelfCheck';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function SecurityCheckPage() {
  const { userId, ready } = useAuth();
  const [result, setResult] = useState<SecurityCheckResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Only show in dev mode
  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Not Available</h1>
          <p className="text-slate-400">Security self-check is only available in development mode.</p>
        </div>
      </div>
    );
  }

  const handleRunCheck = async () => {
    setIsRunning(true);
    const checkResult = await runSecuritySelfCheck(userId || null);
    setResult(checkResult);
    logSecurityCheck(checkResult);
    setIsRunning(false);
  };

  useEffect(() => {
    if (ready && userId) {
      handleRunCheck();
    }
  }, [ready, userId]);

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Security Self-Check</h1>
          </div>
          <p className="text-slate-400">Dev-only tool to verify security configuration</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Check Status</h2>
            <button
              onClick={handleRunCheck}
              disabled={isRunning || !ready}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isRunning ? 'Running...' : 'Run Check'}
            </button>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">User ID</div>
                  <div className="text-white font-mono text-sm break-all">
                    {result.userId || 'null'}
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Session Token</div>
                  <div className="flex items-center gap-2">
                    {result.hasSessionToken ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-500">Present</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-500">Missing</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Profile Select</div>
                  <div className="flex items-center gap-2">
                    {result.profileSelectWorks ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-500">Works</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-500">Failed</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Profile Row Count</div>
                  <div className={`text-white font-semibold ${
                    result.profileRowCount === 1 ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    {result.profileRowCount}
                    {result.profileRowCount === 1 ? ' ✅' : ' ⚠️'}
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h3 className="text-red-500 font-semibold">Errors</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-red-300 text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length === 0 && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-semibold">All checks passed</span>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500 mt-4">
                Last checked: {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">What This Checks</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Current user ID is available</li>
            <li>• Session access token exists</li>
            <li>• Profiles table SELECT query works</li>
            <li>• Exactly 1 profile row exists for current user</li>
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            Note: This tool does not expose secrets or sensitive data.
          </p>
        </div>
      </div>
    </div>
  );
}









