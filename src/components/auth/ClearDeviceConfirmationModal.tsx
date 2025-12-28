/**
 * Clear Device Confirmation Modal
 * 
 * Premium confirmation modal for clearing device data.
 * Custodian-owned action with security tone.
 */

import React from 'react';
import { X, Shield, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ClearDeviceConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearDeviceConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
}: ClearDeviceConfirmationModalProps) {
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Clear this device?
              </h2>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <p className="text-slate-300 text-base leading-relaxed">
                This signs you out and removes local data from this browser. Your account data stays securely stored.
              </p>
              <p className="text-slate-400 text-sm">
                Custodian will securely clear this device and sign you out.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* Primary: Clear device (danger style) */}
              <button
                onClick={onConfirm}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear device
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




