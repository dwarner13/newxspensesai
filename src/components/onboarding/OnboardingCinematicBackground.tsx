/**
 * Onboarding Cinematic Background
 * 
 * Apple-like premium background with:
 * - Deep black base with radial gradients
 * - Soft aurora blobs
 * - Glass highlight sweep
 * - Subtle film grain
 * 
 * No new libraries - pure CSS/React.
 */

import React from 'react';

export function OnboardingCinematicBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Layer 1: Base (black depth with radial gradients) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.06), transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(120, 120, 255, 0.06), transparent 55%),
            #06060a
          `,
        }}
      />

      {/* Layer 2: Aurora Blobs (soft color, very subtle) */}
      {/* Blob 1: Bluish top-right */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[80px] opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, rgba(100, 150, 255, 0.35), transparent 70%)',
          transform: 'translateZ(0)',
          mixBlendMode: 'screen',
          animation: 'drift1 18s ease-in-out infinite',
        }}
      />

      {/* Blob 2: Purple/indigo lower-left */}
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[80px] opacity-[0.08]"
        style={{
          background: 'radial-gradient(circle, rgba(150, 100, 255, 0.35), transparent 70%)',
          transform: 'translateZ(0)',
          mixBlendMode: 'screen',
          animation: 'drift2 20s ease-in-out infinite',
        }}
      />

      {/* Blob 3: Faint neutral highlight near center */}
      <div
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[60px] opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12), transparent 70%)',
          transform: 'translate(-50%, -50%) translateZ(0)',
          mixBlendMode: 'normal',
          animation: 'drift3 16s ease-in-out infinite',
        }}
      />

      {/* Layer 3: Glass highlight sweep (barely visible) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-[0.10]"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 70%)',
        }}
      />

      {/* Layer 4: Film grain (CSS-only noise pattern - very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.02) 0px,
              transparent 0.5px,
              transparent 1.5px,
              rgba(255, 255, 255, 0.02) 2px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.02) 0px,
              transparent 0.5px,
              transparent 1.5px,
              rgba(255, 255, 255, 0.02) 2px
            ),
            repeating-linear-gradient(
              45deg,
              rgba(255, 255, 255, 0.015) 0px,
              transparent 0.8px,
              transparent 1.2px,
              rgba(255, 255, 255, 0.015) 2px
            )
          `,
          backgroundSize: '300% 300%, 300% 300%, 200% 200%',
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }}
      />

      {/* CSS Keyframes for subtle drift animations */}
      <style>{`
        @keyframes drift1 {
          0%, 100% {
            transform: translate(0, 0) translateZ(0);
          }
          50% {
            transform: translate(15px, -12px) translateZ(0);
          }
        }
        @keyframes drift2 {
          0%, 100% {
            transform: translate(0, 0) translateZ(0);
          }
          50% {
            transform: translate(-10px, 15px) translateZ(0);
          }
        }
        @keyframes drift3 {
          0%, 100% {
            transform: translate(-50%, -50%) translateZ(0);
          }
          50% {
            transform: translate(calc(-50% + 8px), calc(-50% - 8px)) translateZ(0);
          }
        }
      `}</style>
    </div>
  );
}

