/**
 * MiniWorkspacePanel Component
 * 
 * Cinematic slideout panel for quick access to AI employee workspaces
 * Opens from the floating action rail buttons
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export type MiniWorkspaceId = 'prime' | 'byte' | 'tag' | 'analytics';

export type MiniWorkspaceConfig = {
  id: MiniWorkspaceId;
  name: string;
  role: string;
  slug: string; // employeeSlug for chat routing
  pagePath: string; // route to full workspace page
  gradient: string; // Tailwind gradient classes
  accent: string; // gradient for glow / border
  icon: React.ReactNode;
  description: string;
};

type MiniWorkspacePanelProps = {
  config: MiniWorkspaceConfig;
  isOpen: boolean;
  onClose: () => void;
};

export function MiniWorkspacePanel({
  config,
  isOpen,
  onClose,
}: MiniWorkspacePanelProps) {
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="
              fixed inset-y-4 right-4 z-[60]
              flex w-full max-w-md flex-col
              overflow-hidden rounded-3xl
              border border-slate-800/80 bg-slate-950/95
              shadow-[0_0_0_1px_rgba(15,23,42,0.9),0_28px_80px_rgba(15,23,42,0.95)]
              backdrop-blur-xl
              max-lg:right-4 max-lg:max-w-sm
              md:right-28
            "
          >
            {/* Header */}
            <div className="relative border-b border-slate-800/70 px-5 pt-4 pb-3">
              <div
                className={`
                  absolute inset-x-0 top-0 h-20
                  bg-gradient-to-br ${config.gradient}
                  opacity-20
                `}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/90 ring-2 ring-slate-900">
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Mini workspace
                    </p>
                    <p className="text-sm font-semibold text-slate-50">
                      {config.name}
                    </p>
                    <p className="text-[11px] text-slate-400">{config.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-800/80 hover:text-slate-100 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3 space-y-4">
              {/* Short description */}
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {config.description}
              </p>

              {/* Stats row (hook into real data later) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2">
                  <p className="text-[10px] text-slate-400">Status</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-400">
                    Online
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2">
                  <p className="text-[10px] text-slate-400">Today</p>
                  <p className="mt-1 text-xs font-semibold text-slate-50">
                    0 tasks
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2">
                  <p className="text-[10px] text-slate-400">Success</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-400">
                    99.0%
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Quick actions
                </p>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openChat({
                        initialEmployeeSlug: config.slug,
                        context: {
                          source: 'mini-workspace',
                          entry: `${config.id}-chat`,
                        },
                      });
                      onClose();
                    }}
                    className="
                      flex items-center justify-between rounded-2xl
                      bg-slate-900/90 px-3 py-2.5 text-xs
                      border border-slate-800/80
                      hover:border-emerald-400/70 hover:bg-slate-900
                      transition-all duration-200
                    "
                  >
                    <span className="text-slate-50">
                      Chat with {config.name.split('—')[0].trim()}
                    </span>
                    <span className="text-[11px] text-emerald-400">Open chat ▸</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate(config.pagePath);
                      onClose();
                    }}
                    className="
                      flex items-center justify-between rounded-2xl
                      bg-slate-900/80 px-3 py-2.5 text-xs
                      border border-slate-800/80
                      hover:border-sky-400/70 hover:bg-slate-900
                      transition-all duration-200
                    "
                  >
                    <span className="text-slate-50">Open full workspace</span>
                    <span className="text-[11px] text-sky-400">Go to page ▸</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

