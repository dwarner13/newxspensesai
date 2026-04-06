import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AdminResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase puts the access token in the URL hash after reset link click
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setTimeout(() => navigate('/xai-admin'), 3000);
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.dotGrid} aria-hidden="true" />
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.crown}>{'\u2655'}</span>
          <div style={styles.brand}>XspensesAI</div>
          <div style={styles.adminLabel}>RESET ADMIN PASSWORD</div>
        </div>

        <div style={styles.divider} />

        {success ? (
          <div style={styles.successWrap}>
            <div style={styles.successIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={styles.successTitle}>Password Updated</p>
            <p style={styles.successDesc}>Redirecting to admin login{'\u2026'}</p>
          </div>
        ) : !sessionReady ? (
          <div style={styles.waitingWrap}>
            <div style={styles.spinner} />
            <p style={styles.waitingText}>Validating reset link{'\u2026'}</p>
          </div>
        ) : (
          <form onSubmit={handleReset} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>NEW PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                disabled={loading}
                style={styles.input}
                onFocus={e => (e.target.style.borderColor = '#c8a64e')}
                onBlur={e => (e.target.style.borderColor = '#1e2d4a')}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>CONFIRM PASSWORD</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                required
                disabled={loading}
                style={styles.input}
                onFocus={e => (e.target.style.borderColor = '#c8a64e')}
                onBlur={e => (e.target.style.borderColor = '#1e2d4a')}
              />
            </div>

            {error && (
              <div style={styles.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Updating Password\u2026' : 'Set New Password'}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <span style={styles.footerDot} /> SECURED ADMIN CHANNEL {'\u00b7'} XspensesAI {'\u00a9'} {new Date().getFullYear()}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes crownPulse { 0%,100%{text-shadow:0 0 10px #c8a64e55} 50%{text-shadow:0 0 22px #c8a64eaa} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'relative', overflow: 'hidden', padding: 24 },
  dotGrid: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #1e2d4a 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.5, pointerEvents: 'none' },
  card: { position: 'relative', background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 6, width: '100%', maxWidth: 420, padding: '40px 36px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'fadeIn 0.4s ease both' },
  header: { textAlign: 'center', marginBottom: 24 },
  crown: { fontSize: 36, color: '#c8a64e', animation: 'crownPulse 3s ease-in-out infinite', display: 'block', lineHeight: 1, marginBottom: 12 },
  brand: { fontSize: 22, fontWeight: 700, color: '#e8ecf4', letterSpacing: '-0.3px', marginBottom: 4 },
  adminLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: '#c8a64e', opacity: 0.85 },
  divider: { height: 1, background: 'linear-gradient(to right, transparent, #1e2d4a, transparent)', marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.15em', color: '#6b7fa3', fontWeight: 500 },
  input: { background: '#0b1220', border: '1px solid #1e2d4a', borderRadius: 4, color: '#e8ecf4', fontSize: 14, padding: '10px 14px', outline: 'none', transition: 'border-color 0.15s', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%', boxSizing: 'border-box' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#f8717122', border: '1px solid #f8717144', borderRadius: 4, padding: '9px 12px', color: '#f87171', fontSize: 13 },
  submitBtn: { background: 'linear-gradient(135deg, #c8a64e, #a8872e)', border: 'none', borderRadius: 4, color: '#0b1220', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, padding: 12, cursor: 'pointer', transition: 'opacity 0.15s' },
  successWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: '12px 0' },
  successIcon: { width: 56, height: 56, background: '#34d39920', border: '1px solid #34d39944', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#e8ecf4', fontSize: 17, fontWeight: 600, margin: 0 },
  successDesc: { color: '#8899bb', fontSize: 13.5, margin: 0 },
  waitingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' },
  spinner: { width: 28, height: 28, border: '3px solid #1e2d4a', borderTopColor: '#c8a64e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  waitingText: { color: '#6b7fa3', fontSize: 13, margin: 0 },
  footer: { marginTop: 28, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: '#2a3a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerDot: { display: 'inline-block', width: 5, height: 5, background: '#1e2d4a', borderRadius: '50%' },
};
