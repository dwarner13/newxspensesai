/**
 * PrimeWelcomeModal
 *
 * Fires once, post-onboarding, when the user first lands on /dashboard/upload?welcome=1.
 * Prime introduces the team and invites the user to upload their first statement.
 *
 * Read:   location.search contains welcome=1
 * Write:  clears the flag from URL on dismiss, writes metadata.prime_welcome_seen
 *         so it never fires again even if user hits /dashboard/upload?welcome=1 manually.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';

const T = {
  bg: '#0b1220',
  surface: '#111a2e',
  border: '#1e2d4a',
  text: '#e8ecf4',
  muted: '#c8d0e0',
  dim: '#9ba8bc',
  accent: '#c8a64e',
  green: '#34d399',
  cyan: '#22d3ee',
  purple: '#a78bfa',
  yellow: '#fbbf24',
};

const TEAM = [
  { name: 'Byte',    color: T.green,  letter: 'B', role: 'reads every statement, extracts every transaction — even messy ones' },
  { name: 'Tag',     color: T.cyan,   letter: 'T', role: 'categorizes transactions and learns your rules as you teach him' },
  { name: 'Crystal', color: T.purple, letter: 'C', role: 'spots trends when your spending shifts' },
  { name: 'Goalie',  color: T.yellow, letter: 'G', role: 'keeps your goals moving — debt, savings, tax-advantaged accounts' },
  { name: 'Ledger',  color: T.green,  letter: 'L', role: 'builds your tax summary when you\u2019re ready for your accountant' },
];

export function PrimeWelcomeModal({ userName }: { userName?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [visibleAgents, setVisibleAgents] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  // Only open if ?welcome=1 AND user hasn't seen it before
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsWelcome = params.get('welcome') === '1';
    if (!wantsWelcome) return;

    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (!sb) { setOpen(true); return; } // fail open — better to show than hide
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const { data: profile } = await sb.from('profiles')
        .select('metadata')
        .eq('id', session.user.id)
        .maybeSingle();
      const alreadySeen = (profile?.metadata as any)?.prime_welcome_seen === true;
      if (!cancelled && !alreadySeen) setOpen(true);
    })();

    return () => { cancelled = true; };
  }, [location.search]);

  // Animate agents in one at a time
  useEffect(() => {
    if (!open) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    TEAM.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleAgents(i + 1), 400 + i * 350));
    });
    return () => timers.forEach(clearTimeout);
  }, [open]);

  const dismiss = async () => {
    if (dismissing) return;
    setDismissing(true);

    // Write prime_welcome_seen so it never fires again
    try {
      const sb = getSupabase();
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          const { data: profile } = await sb.from('profiles')
            .select('metadata')
            .eq('id', session.user.id)
            .maybeSingle();
          const currentMeta = (profile?.metadata && typeof profile.metadata === 'object')
            ? profile.metadata as any : {};
          await sb.from('profiles').upsert({
            id: session.user.id,
            metadata: { ...currentMeta, prime_welcome_seen: true },
          });
        }
      }
    } catch (e) {
      console.error('[PrimeWelcomeModal] Failed to persist seen flag:', e);
    }

    // Strip ?welcome=1 from URL
    navigate(location.pathname, { replace: true });
    setOpen(false);
  };

  if (!open) return null;

  const firstName = userName || 'there';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(11, 18, 32, 0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      animation: 'pwm-fade 0.3s ease-out',
    }}>
      <style>{`
        @keyframes pwm-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pwm-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        maxWidth: 560, width: '100%', maxHeight: '92vh', overflowY: 'auto',
        background: `linear-gradient(180deg, ${T.surface} 0%, ${T.bg} 100%)`,
        border: `1px solid ${T.border}`, borderRadius: 20,
        padding: '36px 32px',
        boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${T.accent}11 inset`,
        animation: 'pwm-up 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Prime badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent}30, ${T.accent}10)`,
            border: `1.5px solid ${T.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: `0 0 24px ${T.accent}33`,
          }}>{'\uD83D\uDC51'}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Prime</div>
            <div style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>AI Finance Team Lead</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: T.text,
          lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 16,
        }}>
          Hey {firstName} — <span style={{ color: T.accent }}>I'm Prime.</span>
        </h1>

        <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
          I lead your AI team. Here's how this works: you upload your bank and credit card statements — monthly, quarterly, whatever you've got. My team goes to work.
        </p>

        {/* Team list — animates in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {TEAM.map((a, i) => (
            <div key={a.name} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px', borderRadius: 12,
              background: visibleAgents > i ? `${a.color}08` : 'transparent',
              border: `1px solid ${visibleAgents > i ? a.color + '22' : 'transparent'}`,
              opacity: visibleAgents > i ? 1 : 0,
              transform: visibleAgents > i ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `${a.color}20`, border: `1.5px solid ${a.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: a.color, marginTop: 2,
              }}>{a.letter}</div>
              <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 700, color: a.color }}>{a.name}</span> {a.role}.
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 14, color: T.dim, lineHeight: 1.6, marginBottom: 28, fontStyle: 'italic' }}>
          Me? I keep the team coordinated and brief you on what matters. Your job is easy: upload a statement. We'll do the rest.
        </p>

        {/* CTA */}
        <button
          onClick={dismiss}
          disabled={dismissing}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent}, #a08030)`,
            border: 'none', color: '#0b1220',
            fontSize: 15, fontWeight: 800,
            cursor: dismissing ? 'wait' : 'pointer',
            boxShadow: `0 8px 28px ${T.accent}55`,
            fontFamily: 'inherit',
            opacity: dismissing ? 0.7 : 1,
            transition: 'all 0.15s',
          }}
        >
          {dismissing ? 'Loading...' : `Let's upload your first statement \u2192`}
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 18,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, boxShadow: `0 0 6px ${T.green}66` }} />
          <span style={{ fontSize: 10, color: T.dim, letterSpacing: 0.3 }}>
            Secured {'\u2022'} Guardrails + PII protection active
          </span>
        </div>
      </div>
    </div>
  );
}

export default PrimeWelcomeModal;
