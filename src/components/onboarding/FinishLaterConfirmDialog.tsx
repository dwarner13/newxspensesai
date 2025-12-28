/**
 * Finish Later Confirm Dialog
 * 
 * Confirmation dialog for exiting onboarding early.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FinishLaterConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FinishLaterConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: FinishLaterConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10003]"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.2, 0.9, 0.2, 1] }}
            className="fixed inset-0 z-[10004] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-purple-500/20 rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white mb-2">
                Finish later?
              </h3>
              <p className="text-slate-300 mb-6">
                You can resume anytime in Settings.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-purple-500/30"
                >
                  Finish later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}








