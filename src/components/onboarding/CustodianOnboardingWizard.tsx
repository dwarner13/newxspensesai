import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useTypewriter } from '../../pages/PrimeChatV2/useTypewriter';

const T = { bg: '#0b1220', surface: '#111a2e', border: '#1e2d4a', text: '#e8ecf4', muted: '#7b8ba5', dim: '#4a5a75', accent: '#c8a64e', green: '#34d399', purple: '#7c3aed' };

const COMMON_COUNTRIES = ['Canada', 'United States', 'United Kingdom', 'Australia', 'New Zealand', 'Ireland', 'South Africa', 'India', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Portugal', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium', 'Singapore', 'Hong Kong', 'Japan', 'South Korea', 'Brazil', 'Mexico', 'UAE', 'Saudi Arabia'];
const ALL_COUNTRIES = [...COMMON_COUNTRIES, 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia', 'Botswana', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Cambodia', 'Cameroon', 'Chile', 'China', 'Colombia', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Ethiopia', 'Fiji', 'Georgia', 'Ghana', 'Greece', 'Guatemala', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Jamaica', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Laos', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritius', 'Moldova', 'Monaco', 'Mongolia', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal', 'Nicaragua', 'Nigeria', 'North Macedonia', 'Oman', 'Pakistan', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Serbia', 'Sierra Leone', 'Slovakia', 'Slovenia', 'Somalia', 'Sri Lanka', 'Sudan', 'Suriname', 'Taiwan', 'Tanzania', 'Thailand', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'].filter((c, i, a) => a.indexOf(c) === i).sort();

interface Props { onComplete: () => void }

export function CustodianOnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ name: '', employment: '', goal: '', country: '', income: '', business: '' });
  const [saving, setSaving] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect country from timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('America/Toronto') || tz.includes('America/Vancouver') || tz.includes('America/Edmonton') || tz.includes('America/Winnipeg') || tz.includes('America/Halifax')) setAnswers(a => ({ ...a, country: 'Canada' }));
      else if (tz.includes('America/New_York') || tz.includes('America/Chicago') || tz.includes('America/Los_Angeles') || tz.includes('America/Denver')) setAnswers(a => ({ ...a, country: 'United States' }));
      else if (tz.includes('Europe/London')) setAnswers(a => ({ ...a, country: 'United Kingdom' }));
      else if (tz.includes('Australia/')) setAnswers(a => ({ ...a, country: 'Australia' }));
    } catch { /* silent */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setCountryDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isSelfEmployed = answers.employment === 'Self-Employed' || answers.employment === 'Both';
  const totalSteps = isSelfEmployed ? 7 : 6; // 5 questions + optional business + completion

  const STEPS = [
    { msg: "Hi! I'm Custodian, your setup guide. I'm going to ask you a few quick questions so your AI team knows exactly how to help you. What should I call you?" },
    { msg: `Nice to meet you, ${answers.name || 'there'}! How do you earn your income? This helps your team organize your expenses correctly.` },
    { msg: `What brings you to XspensesAI, ${answers.name || 'there'}? What's your main reason for being here?` },
    { msg: "Which country are you based in? This helps with currency and regional context." },
    { msg: `Roughly what's your monthly take-home income? This helps Goalie set realistic savings targets. You can skip this if you prefer.` },
    ...(isSelfEmployed ? [{ msg: `Do you have a business name? Your team will use this to identify your business income on statements.` }] : []),
    { msg: `You're all set, ${answers.name || 'there'}! Your AI team is ready. Here's what happens next:` },
  ];

  const currentMsg = STEPS[step]?.msg || '';
  const [typed, typeDone] = useTypewriter(currentMsg, 14, 300);
  const isComplete = step === STEPS.length - 1;

  const saveProgress = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const uid = session.user.id;
      const { data: profile } = await sb.from('profiles').select('metadata').eq('id', uid).maybeSingle();
      const currentMeta = (profile?.metadata && typeof profile.metadata === 'object') ? profile.metadata as any : {};
      const currentOnboarding = currentMeta.onboarding || {};
      const newMeta = { ...currentMeta, onboarding: { ...currentOnboarding, ...updates.onboarding }, ...(updates.country ? { country: updates.country } : {}), ...(updates.business_name ? { business_name: updates.business_name } : {}) };
      const profileUpdate: any = { id: uid, metadata: newMeta };
      if (updates.display_name) { profileUpdate.display_name = updates.display_name; profileUpdate.full_name = updates.display_name; }
      await sb.from('profiles').upsert(profileUpdate);
    } catch (e) { console.error('[CustodianOnboardingWizard] Save error:', e); }
    finally { setSaving(false); }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const uid = session.user.id;
      const { data: profile } = await sb.from('profiles').select('metadata').eq('id', uid).maybeSingle();
      const currentMeta = (profile?.metadata && typeof profile.metadata === 'object') ? profile.metadata as any : {};
      await sb.from('profiles').upsert({ id: uid, metadata: { ...currentMeta, custodian_ready: true, onboarding: { ...(currentMeta.onboarding || {}), completed: true, completed_at: new Date().toISOString() } } });
      await sb.auth.updateUser({ data: { display_name: answers.name, onboarding_complete: true } });
    } catch (e) { console.error('[CustodianOnboardingWizard] Complete error:', e); }
    finally { setSaving(false); onComplete(); }
  };

  const advance = async () => {
    if (step === 0) await saveProgress({ display_name: answers.name, onboarding: { first_name: answers.name } });
    else if (step === 1) await saveProgress({ onboarding: { employment_type: answers.employment } });
    else if (step === 2) await saveProgress({ onboarding: { primary_goal: answers.goal } });
    else if (step === 3) await saveProgress({ onboarding: { country: answers.country }, country: answers.country });
    else if (step === 4) await saveProgress({ onboarding: { monthly_income_range: answers.income } });
    else if (isSelfEmployed && step === 5) await saveProgress({ onboarding: { business_name: answers.business }, business_name: answers.business });
    setStep(s => s + 1);
  };

  const canAdvance = () => {
    if (step === 0) return answers.name.trim().length > 0;
    if (step === 1) return !!answers.employment;
    if (step === 2) return !!answers.goal;
    if (step === 3) return !!answers.country;
    if (step === 4) return true; // optional
    if (isSelfEmployed && step === 5) return true; // optional
    return true;
  };

  const filteredCountries = countrySearch ? ALL_COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())) : ALL_COUNTRIES;

  const Pill = ({ label, value, selected, onSelect }: { label: string; value: string; selected: boolean; onSelect: () => void }) => (
    <button onClick={onSelect} style={{ padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: selected ? `${T.accent}15` : T.bg, border: `1px solid ${selected ? T.accent : T.border}`, color: selected ? T.accent : T.muted, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' as const, fontFamily: 'inherit' }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      {/* Progress */}
      <div style={{ width: '100%', maxWidth: 480, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Setup {Math.min(step + 1, totalSteps)} of {totalSteps}</span>
          <span style={{ fontSize: 11, color: T.muted }}>{Math.round((Math.min(step + 1, totalSteps) / totalSteps) * 100)}% complete</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: T.border }}>
          <div style={{ height: '100%', borderRadius: 2, background: T.accent, width: `${(Math.min(step + 1, totalSteps) / totalSteps) * 100}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 480, width: '100%', background: T.surface, borderRadius: 20, border: `1px solid ${T.border}`, padding: '28px 32px' }}>
        {/* Custodian header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${T.purple}20`, border: `1px solid ${T.purple}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{'\uD83D\uDEE1\uFE0F'}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Custodian</div>
            <div style={{ fontSize: 11, color: T.dim }}>Setup Guide</div>
          </div>
        </div>

        {/* Typewriter message */}
        <div style={{ fontSize: 16, color: T.muted, lineHeight: 1.7, marginBottom: 24, minHeight: 48 }}>
          {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: T.accent }}>{'\u2588'}</span>
        </div>

        {/* Answer area */}
        {step === 0 && (
          <input value={answers.name} onChange={e => setAnswers(a => ({ ...a, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && canAdvance()) void advance(); }} placeholder="Your first name" autoFocus style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['\uD83E\uDDD1\u200D\uD83D\uDCBC Self-Employed', '\uD83D\uDC54 Employed', '\uD83D\uDD04 Both', '\uD83D\uDCCB Other'].map(opt => {
              const val = opt.split(' ').slice(1).join(' ');
              return <Pill key={val} label={opt} value={val} selected={answers.employment === val} onSelect={() => setAnswers(a => ({ ...a, employment: val }))} />;
            })}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['\uD83D\uDCCB Prepare expenses for my accountant', '\uD83D\uDCB3 Track and reduce my spending', '\uD83D\uDCB0 Get out of debt', '\uD83C\uDFE6 Build my savings', '\uD83D\uDCCA Understand my finances better'].map(opt => {
              const val = opt.split(' ').slice(1).join(' ');
              return <Pill key={val} label={opt} value={val} selected={answers.goal === val} onSelect={() => setAnswers(a => ({ ...a, goal: val }))} />;
            })}
          </div>
        )}

        {step === 3 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <input value={countryDropdownOpen ? countrySearch : answers.country} onChange={e => { setCountrySearch(e.target.value); setCountryDropdownOpen(true); }} onFocus={() => { setCountryDropdownOpen(true); setCountrySearch(''); }} placeholder="Search country..." style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            {countryDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, marginTop: 4, zIndex: 10 }}>
                {filteredCountries.map(c => (
                  <div key={c} onClick={() => { setAnswers(a => ({ ...a, country: c })); setCountryDropdownOpen(false); setCountrySearch(''); }} style={{ padding: '10px 16px', fontSize: 14, color: answers.country === c ? T.accent : T.muted, cursor: 'pointer', background: answers.country === c ? `${T.accent}08` : 'transparent' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = `${T.accent}08`; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = answers.country === c ? `${T.accent}08` : 'transparent'; }}
                  >{c}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Under $2,000', '$2,000 – $4,000', '$4,000 – $7,000', '$7,000 – $12,000', 'Over $12,000', 'Prefer not to say'].map(opt => (
              <Pill key={opt} label={opt} value={opt} selected={answers.income === opt} onSelect={() => setAnswers(a => ({ ...a, income: opt }))} />
            ))}
          </div>
        )}

        {isSelfEmployed && step === 5 && (
          <input value={answers.business} onChange={e => setAnswers(a => ({ ...a, business: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void advance(); }} placeholder="Your business name (optional)" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        )}

        {isComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '\uD83D\uDCC4', text: 'Upload your first statement — Byte will read it in seconds' },
              { icon: '\uD83C\uDFF7\uFE0F', text: 'Tag will categorize every transaction automatically' },
              { icon: '\u265B', text: 'Prime will brief you on your financial picture' },
            ].map(c => (
              <div key={c.icon} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: T.bg, border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <span style={{ fontSize: 14, color: T.muted, lineHeight: 1.5 }}>{c.text}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: T.dim, fontStyle: 'italic', textAlign: 'center', marginTop: 12, lineHeight: 1.5, maxWidth: 380, margin: '12px auto 0' }}>
              XspensesAI organizes your financial data to help you work with your accountant more efficiently. We are not accountants, financial advisors, or tax professionals. Nothing in this app constitutes financial, tax, or legal advice.
            </div>
          </div>
        )}

        {/* Continue / Complete button */}
        {!isComplete ? (
          <>
            <button onClick={() => void advance()} disabled={!canAdvance() || saving} style={{ width: '100%', padding: '14px', borderRadius: 12, marginTop: 20, background: canAdvance() && !saving ? `linear-gradient(135deg, ${T.accent}, #a08030)` : T.border, border: 'none', color: canAdvance() && !saving ? '#0b1220' : T.dim, fontSize: 15, fontWeight: 700, cursor: canAdvance() && !saving ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {saving ? 'Saving...' : step === 0 ? 'Nice to meet you \u2192' : 'Continue \u2192'}
            </button>
            {(step === 4 || (isSelfEmployed && step === 5)) && (
              <button onClick={() => void advance()} style={{ display: 'block', margin: '10px auto 0', fontSize: 13, color: T.dim, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Skip for now {'\u2192'}</button>
            )}
          </>
        ) : (
          <button onClick={() => void completeOnboarding()} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, marginTop: 20, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: 'none', color: '#0b1220', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Setting up...' : 'Meet My Team \u2192'}
          </button>
        )}
      </div>
    </div>
  );
}
