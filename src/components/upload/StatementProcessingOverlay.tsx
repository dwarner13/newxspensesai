/**
 * StatementProcessingOverlay.tsx
 *
 * Full-screen cinematic overlay shown during statement upload processing.
 * Phase 1: Spinner + "X statement processing..."
 * Phase 2: Tag summary message + "View Transactions" CTA
 *
 * Usage in UploadPageV2:
 *   <StatementProcessingOverlay
 *     isOpen={isProcessing || showSummary}
 *     statementName="September 2024"
 *     importResult={importResult}   // null while processing, set when done
 *     importId={importId}           // for navigation to correct statement
 *     onClose={() => { setIsProcessing(false); setShowSummary(false); }}
 *   />
 *
 * Set importResult when the pipeline resolves to trigger Phase 2.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface StatementImportResult {
  transactionCount: number;
  totalExpenses?: number;
  totalIncome?: number;
  needsReview?: number;
  topCategory?: string;
  importId?: string;
}

interface Props {
  isOpen: boolean;
  statementName: string;         // e.g. "September 2024" — shown in the overlay
  importResult?: StatementImportResult | null;  // null = still processing
  importId?: string | null;
  onClose: () => void;
}

// ── Tag summary generator ────────────────────────────────────────────────────
function buildTagSummary(result: StatementImportResult, statementName: string): string {
  const { transactionCount, totalExpenses, needsReview, topCategory } = result;

  const txWord = transactionCount === 1 ? 'transaction' : 'transactions';
  const expStr = totalExpenses != null
    ? ` totalling $${totalExpenses.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';

  let summary = `Done! I found ${transactionCount} ${txWord}${expStr} in your ${statementName} statement.`;

  if (topCategory) {
    summary += ` Your biggest spend category was ${topCategory}.`;
  }

  if (needsReview != null && needsReview > 0) {
    summary += ` I've flagged ${needsReview} transaction${needsReview === 1 ? '' : 's'} for your review.`;
  } else {
    summary += ` Everything looks categorized — you're all set.`;
  }

  return summary;
}

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 22): string {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active || !text) { setDisplayed(''); indexRef.current = 0; return; }
    indexRef.current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, active, speed]);

  return displayed;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const StatementProcessingOverlay: React.FC<Props> = ({
  isOpen,
  statementName,
  importResult,
  importId,
  onClose,
}) => {
  const navigate = useNavigate();
  const isComplete = !!importResult;
  const summaryText = importResult ? buildTagSummary(importResult, statementName) : '';
  const displayedSummary = useTypewriter(summaryText, isComplete);

  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFadingOut(false);
      setVisible(true);
    }
  }, [isOpen]);

  const handleViewTransactions = () => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
      const params = importId ? `?import_id=${importId}` : '';
      navigate(`/transactions${params}`);
    }, 400);
  };

  const handleClose = () => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 400);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(160deg, #070e1c 0%, #0b1220 50%, #0d1628 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        height: '400px',
        background: isComplete
          ? 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'background 0.8s ease',
      }} />

      {/* Close button — only after complete */}
      {isComplete && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '8px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}

      <div style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
      }}>

        {/* ── PHASE 1: Processing ── */}
        {!isComplete && (
          <>
            {/* Spinner */}
            <div style={{ position: 'relative', width: '72px', height: '72px' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(167,139,250,0.12)',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: '#a78bfa',
                animation: 'spinOCR 0.9s linear infinite',
              }} />
              <div style={{
                position: 'absolute',
                inset: '10px',
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: 'rgba(167,139,250,0.4)',
                animation: 'spinOCR 1.4s linear infinite reverse',
              }} />
              {/* Inner dot */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#a78bfa',
                  animation: 'pulseOCR 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>

            {/* Statement name */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(167,139,250,0.6)',
                marginBottom: '10px',
              }}>
                Processing
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}>
                {statementName} statement
              </div>
            </div>

            {/* Animated steps */}
            <ProcessingSteps />
          </>
        )}

        {/* ── PHASE 2: Tag Summary ── */}
        {isComplete && (
          <>
            {/* Tag avatar */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(34,211,238,0.05) 100%)',
              border: '1.5px solid rgba(34,211,238,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              animation: 'fadeSlideUp 0.5s ease forwards',
            }}>
              🏷️
            </div>

            {/* Tag label */}
            <div style={{
              textAlign: 'center',
              animation: 'fadeSlideUp 0.5s ease 0.1s both',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#22d3ee',
                marginBottom: '8px',
              }}>
                Tag · Categorization Agent
              </div>
            </div>

            {/* Summary bubble */}
            <div style={{
              width: '100%',
              background: 'rgba(34,211,238,0.04)',
              border: '1px solid rgba(34,211,238,0.15)',
              borderRadius: '16px',
              padding: '20px 24px',
              animation: 'fadeSlideUp 0.5s ease 0.15s both',
            }}>
              <p style={{
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.65',
                color: 'rgba(255,255,255,0.88)',
                fontWeight: 400,
                minHeight: '80px',
              }}>
                {displayedSummary}
                {/* Blinking cursor while typing */}
                {displayedSummary.length < summaryText.length && (
                  <span style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '16px',
                    background: '#22d3ee',
                    marginLeft: '2px',
                    verticalAlign: 'middle',
                    animation: 'blinkCursor 0.7s step-end infinite',
                  }} />
                )}
              </p>
            </div>

            {/* Stats row */}
            {importResult && (
              <div style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
                animation: 'fadeSlideUp 0.5s ease 0.25s both',
              }}>
                <StatPill
                  label="Transactions"
                  value={String(importResult.transactionCount)}
                  color="#22d3ee"
                />
                {importResult.totalExpenses != null && (
                  <StatPill
                    label="Total"
                    value={`$${importResult.totalExpenses.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    color="#a78bfa"
                  />
                )}
                {importResult.needsReview != null && importResult.needsReview > 0 && (
                  <StatPill
                    label="Needs Review"
                    value={String(importResult.needsReview)}
                    color="#fbbf24"
                  />
                )}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleViewTransactions}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                border: 'none',
                color: '#0b1220',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                animation: 'fadeSlideUp 0.5s ease 0.35s both',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(34,211,238,0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              View Transactions →
            </button>
          </>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes spinOCR {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulseOCR {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes stepFade {
          0%   { opacity: 0; transform: translateX(-6px); }
          20%  { opacity: 1; transform: translateX(0); }
          80%  { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

// ── Processing steps animation ────────────────────────────────────────────────
const STEPS = [
  'Reading PDF pages...',
  'Extracting transactions...',
  'Running OCR normalizer...',
  'Matching category rules...',
  'Writing to database...',
];

const ProcessingSteps: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '100%',
    }}>
      {STEPS.map((step, i) => (
        <div
          key={step}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: i === activeStep
              ? 'rgba(167,139,250,0.08)'
              : 'transparent',
            border: i === activeStep
              ? '1px solid rgba(167,139,250,0.15)'
              : '1px solid transparent',
            transition: 'all 0.4s ease',
          }}
        >
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: i < activeStep
              ? '#22d3ee'
              : i === activeStep
                ? '#a78bfa'
                : 'rgba(255,255,255,0.1)',
            transition: 'background 0.4s ease',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '13px',
            color: i < activeStep
              ? 'rgba(34,211,238,0.6)'
              : i === activeStep
                ? 'rgba(255,255,255,0.8)'
                : 'rgba(255,255,255,0.2)',
            transition: 'color 0.4s ease',
            fontWeight: i === activeStep ? 500 : 400,
          }}>
            {step}
          </span>
          {i < activeStep && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: '#22d3ee',
              fontWeight: 600,
            }}>✓</span>
          )}
          {i === activeStep && (
            <span style={{
              marginLeft: 'auto',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '1.5px solid transparent',
              borderTopColor: '#a78bfa',
              display: 'inline-block',
              animation: 'spinOCR 0.8s linear infinite',
            }} />
          )}
        </div>
      ))}
    </div>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid rgba(255,255,255,0.07)`,
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '18px', fontWeight: 700, color, marginBottom: '2px' }}>
      {value}
    </div>
    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </div>
  </div>
);

export default StatementProcessingOverlay;
