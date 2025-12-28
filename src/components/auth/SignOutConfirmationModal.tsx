/**
 * Sign Out Confirmation Modal
 * 
 * Premium confirmation modal for signing out.
 * Custodian-owned action with security tone.
 */

import React from 'react';
import { X, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SignOutConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SignOutConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
}: SignOutConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={cn(
            "relative w-full max-w-md bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
            "backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl",
            "p-8 pointer-events-auto",
            "transition-all duration-300",
            "scale-100 translate-y-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="space-y-6">
            {/* Icon & Title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Sign out?
              </h2>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <p className="text-slate-300 text-base leading-relaxed">
                You'll be signed out on this device. Your data stays securely stored in your account.
              </p>
              <p className="text-slate-400 text-sm">
                Custodian will securely sign you out of this device.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* Primary: Sign out */}
              <button
                onClick={onConfirm}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                Sign out
              </button>

              {/* Secondary: Cancel */}
              <button
                onClick={onCancel}
                className="flex-1 bg-slate-800/80 hover:bg-slate-700/80 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}




