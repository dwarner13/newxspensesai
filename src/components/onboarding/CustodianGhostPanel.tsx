/**
 * Custodian Ghost Panel
 * 
 * Subtle placeholder that appears on the right side during Prime typing.
 * Previews the Custodian panel shape without distracting from Prime text.
 * Morphs into the real Custodian panel on CTA click.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface CustodianGhostPanelProps {
  ctaVisible?: boolean;
  isMobile?: boolean;
}

export function CustodianGhostPanel({ 
  ctaVisible = false,
  isMobile = false,
}: CustodianGhostPanelProps) {
  // TEMP DEBUG: Log render state
  if (import.meta.env.DEV) {
    console.log('[CustodianGhostPanel] Render', { ctaVisible, isMobile });
  }

  // Hide on mobile to avoid crowding
  if (isMobile) {
    return null;
  }

  // Opacity increases slightly when CTA becomes visible
  // While typing: more visible (0.15-0.18)
  // When CTA visible: even more visible (0.20-0.23)
  const baseOpacity = ctaVisible ? 0.22 : 0.16;

  return (
    <>
      {/* CSS keyframes for soft pulse - inject once */}
      <style>{`
        @keyframes softPulse {
          0%, 100% { opacity: ${baseOpacity}; }
          50% { opacity: ${baseOpacity + 0.05}; }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: baseOpacity,
        }}
        exit={{ 
          opacity: 0, 
          filter: 'blur(4px)',
        }}
        transition={{ 
          opacity: { duration: 0.3 },
          filter: { duration: 0.25 },
        }}
        className="w-full max-w-[420px] h-full flex flex-col bg-white/12 backdrop-blur-xl border border-white/40 rounded-2xl overflow-hidden relative"
        style={{
          pointerEvents: 'none',
          zIndex: 20,
          // TEMP DEBUG: Very visible outline
          outline: '2px solid rgba(239, 68, 68, 0.6)',
          outlineOffset: '2px',
          // More visible shadow and glow
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 0 100px rgba(139, 92, 246, 0.15)
          `,
          // Very slow pulse animation (8s cycle) - subtle breathing effect
          animation: 'softPulse 8s ease-in-out infinite',
        }}
        aria-hidden="true"
      >
        {/* Low-opacity glow behind - more visible */}
        <div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/12 via-transparent to-white/6 pointer-events-none"
          style={{ opacity: 0.2 }}
        />
        
        {/* Faint inner highlight line */}
        <div 
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent z-10"
        />
        
        {/* Tiny presence dot (no text) */}
        <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-white/25 z-10" />
        
        {/* TEMP DEBUG LABEL - Remove after verification */}
        {import.meta.env.DEV && (
          <div className="absolute top-5 left-12 text-xs text-white/60 font-medium z-10">
            CUSTODIAN PANEL PLACEHOLDER
          </div>
        )}
      </motion.div>
    </>
  );
}

