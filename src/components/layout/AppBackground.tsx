/**
 * AppBackground Component
 * ======================
 * Shared background component matching dashboard styling
 * Deep navy base with subtle radial glows (top-left cool blue, bottom-right teal)
 */

import React from 'react';

interface AppBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function AppBackground({ children, className = '' }: AppBackgroundProps) {
  return (
    <div className={`min-h-screen bg-slate-950 relative ${className}`}>
      {/* Base deep navy background */}
      
      {/* Subtle radial glow layers - matching dashboard aesthetic */}
      {/* Top-left: Cool blue glow */}
      <div 
        className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.08),transparent_50%)] pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Bottom-right: Teal glow */}
      <div 
        className="fixed inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(20,184,166,0.06),transparent_50%)] pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Optional subtle grid texture (matching dashboard) */}
      <div 
        className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}




