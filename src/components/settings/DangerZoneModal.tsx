import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Trash2, Loader2, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DangerZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DangerZoneModal({ isOpen, onClose, onSuccess }: DangerZoneModalProps) {
  const { userId } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Impact Analysis State
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      runImpactAnalysis();
      setConfirmText('');
      setError(null);
    }
  }, [isOpen, userId]);

  const runImpactAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      if (!supabase) throw new Error('Database connection failed');

      // Fetch transaction count
      const { count: tCount, error: tError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (tError) throw tError;

      // Fetch imports count
      const { count: iCount, error: iError } = await supabase
        .from('imports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (iError) throw iError;

      setTransactionCount(tCount || 0);
      setImportCount(iCount || 0);
    } catch (err: any) {
      console.error('[DangerZone] Impact analysis failed:', err);
      setError('Failed to analyze data impact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const executeSurgicalStrike = async () => {
    if (confirmText !== 'DELETE' || !userId) return;

    try {
      setExecuting(true);
      setError(null);
      const supabase = getSupabase();
      if (!supabase) throw new Error('Database connection failed');

      // 1. Delete Imports (this should cascade to transactions and document_metadata if configured)
      const { error: importError } = await supabase
        .from('imports')
        .delete()
        .eq('user_id', userId);

      if (importError) throw importError;

      // 2. Delete Transactions explicitly as a fallback safety measure
      // (in case cascade is not fully configured for all transaction types)
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (txError) throw txError;

      // Success!
      onSuccess();
    } catch (err: any) {
      console.error('[DangerZone] Surgical strike failed:', err);
      
      // Handle potential OS Error 5 (Locks) or general errors
      if (err.message?.includes('Lock') || err.code === '55P03') {
        setError('Database is currently locked. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Failed to delete data. Please try again.');
      }
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  const isConfirmed = confirmText === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="danger-zone-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-red-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 id="danger-zone-title" className="text-lg font-bold text-white">Danger Zone</h2>
              <p className="text-sm text-red-400">Surgical Strike Data Cleanup</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Warning Banner */}
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-200">
                You are about to permanently delete your data.
              </p>
              <p className="text-xs text-red-400/90 leading-relaxed">
                This action will wipe all your imports and transactions. It cannot be undone.
              </p>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-white">Impact Analysis</h3>
            </div>
            
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                  <span className="ml-3 text-sm text-slate-400">Calculating impact...</span>
                </div>
              ) : error ? (
                <p className="text-sm text-red-400 text-center py-2">{error}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Transactions to be removed:</span>
                    <span className="text-lg font-mono font-bold text-white">{transactionCount}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                    <span className="text-sm text-slate-400">Imports to be removed:</span>
                    <span className="text-lg font-mono font-bold text-white">{importCount}</span>
                  </div>
                  
                  {transactionCount === 0 && importCount === 0 && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-300">Your account is already clean. No data will be deleted.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Safety Interlock */}
          <div className="space-y-3 pt-2">
            <label htmlFor="interlock-input" className="block text-sm font-medium text-slate-300">
              Safety Interlock
            </label>
            <p className="text-xs text-slate-400">
              Type <strong className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">DELETE</strong> to confirm this action.
            </p>
            <input
              id="interlock-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono"
              autoComplete="off"
              disabled={loading || executing || (transactionCount === 0 && importCount === 0)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={executing}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={executeSurgicalStrike}
              disabled={!isConfirmed || executing || loading || (transactionCount === 0 && importCount === 0)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-800 disabled:text-slate-500 disabled:border overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-red-500 blur-md opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative flex items-center justify-center gap-2">
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Nuke Data</span>
                  </>
                )}
              </div>
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
