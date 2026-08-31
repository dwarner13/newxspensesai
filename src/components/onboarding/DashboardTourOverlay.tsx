import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

interface Props {
  firstName?: string;
  onComplete: () => void;
}

const STEPS = [
  { title: 'Welcome to XspensesAI, {name}! \u265B', body: "Your AI finance team is ready. Let me show you around \u2014 this takes about 60 seconds.", center: true },
  { title: '\uD83D\uDCC4 Start here: Upload a Statement', body: 'Drag and drop any bank statement PDF or photo. Byte will extract every transaction in seconds \u2014 BMO, RBC, Capital One, Canadian Tire, all major Canadian banks.' },
  { title: '\uD83D\uDCB3 Your Transactions', body: "Every imported transaction lives here. Tap any row to see Tag's analysis \u2014 why it was categorized, confidence score, and tax implications. You can recategorize with one tap or ask Tag in chat." },
  { title: '\uD83C\uDFF7\uFE0F Categories', body: 'See your spending broken down by category. Tag learns your habits \u2014 the more you correct, the smarter it gets. Budget targets coming soon.' },
  { title: '\u265B Prime \u2014 Your Financial Assistant', body: 'The gold bubble is Prime. Tap it anytime to get a briefing on your finances, ask financial questions, or upload a statement directly in chat. He coordinates the whole team.' },
  { title: 'T Tag \u2014 Categorization Expert', body: "The cyan T bubble opens Tag's chat on any page. Ask Tag to find transactions, fix categories, or explain why something was categorized a certain way." },
  { title: '\uD83D\uDCEC Inbox', body: 'Your AI team sends you updates here when they finish working \u2014 Tag when categories are clean, Byte when imports complete, Prime when your books are ready to review.' },
  { title: '\u2B50 Xspense Score', body: 'Your financial health in one number (0\u2013100). It improves as you categorize transactions, reduce debt, and hit your savings goals. Start uploading to see yours.' },
  { title: "You're all set! \uD83C\uDF89", body: 'Upload your first statement and watch your AI team go to work. It takes about 30 seconds to process a full month of transactions.', center: true, final: true },
];

export function DashboardTourOverlay({ firstName, onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const total = STEPS.length;

  const next = () => { if (step < total - 1) setStep(s => s + 1); };
  const finish = () => { localStorage.setItem('dashboard_tour_completed', 'true'); onComplete(); };

  const title = current.title.replace('{name}', firstName || 'there');

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      <style>{`@keyframes tourSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div key={step} style={{
        background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 20,
        padding: '28px 32px', maxWidth: 420, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        animation: 'tourSlideIn 0.3s ease forwards',
        position: 'relative',
      }}>
        {/* Skip */}
        <button onClick={finish} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Skip tour</button>

        {/* Step counter */}
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 14, letterSpacing: '0.06em' }}>Step {step + 1} of {total}</div>

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 800, color: '#e8ecf4', marginBottom: 10, lineHeight: 1.3 }}>{title}</div>

        {/* Body */}
        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 }}>{current.body}</div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: (current as any).final ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
          {(current as any).final ? (
            <>
              <button onClick={() => { finish(); navigate('/dashboard/upload'); }} style={{
                padding: '12px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #c8a64e, #a08030)', border: 'none',
                color: '#0b1220', cursor: 'pointer',
              }}>Upload my first statement {'\u2192'}</button>
              <button onClick={finish} style={{
                padding: '12px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'transparent', border: '1px solid #1e2d4a',
                color: '#94a3b8', cursor: 'pointer',
              }}>Explore on my own</button>
            </>
          ) : (
            <button onClick={next} style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, #c8a64e, #a08030)', border: 'none',
              color: '#0b1220', cursor: 'pointer',
            }}>{step === 0 ? "Let's go \u2192" : 'Next \u2192'}</button>
          )}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i === step ? '#c8a64e' : i < step ? 'rgba(200,166,78,0.4)' : '#1e2d4a',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
