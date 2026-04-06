import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!data.session) throw new Error('No session created.');

      // Verify admin role
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('is_active, role')
        .eq('user_id', data.session.user.id)
        .single();

      if (!adminRecord?.is_active) {
        await supabase.auth.signOut();
        throw new Error('Access denied. This account is not authorized for admin access.');
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_admin_login: new Date().toISOString() })
        .eq('user_id', data.session.user.id);

      navigate('/xai-admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your admin email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email.');
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.dotGrid} aria-hidden="true" />
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.crown}>{'\u2655'}</span>
          <div style={styles.brand}>XspensesAI</div>
          <div style={styles.adminLabel}>ADMIN CONSOLE</div>
        </div>

        <div style={styles.divider} />

        {forgotMode ? (
          forgotSent ? (
            <div style={styles.sentWrap}>
              <div style={styles.sentIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={styles.sentTitle}>Check Your Email</p>
              <p style={styles.sentDesc}>If that address is registered as an admin, you'll receive a password reset link shortly.</p>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }} style={styles.backLink}>
                {'\u2190'} Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} style={styles.form}>
              <p style={styles.forgotTitle}>Reset Password</p>
              <p style={styles.forgotDesc}>Enter your admin email and we'll send a secure reset link.</p>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>ADMIN EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  disabled={forgotLoading}
                  style={styles.input}
                  onFocus={e => (e.target.style.borderColor = '#c8a64e')}
                  onBlur={e => (e.target.style.borderColor = '#1e2d4a')}
                />
              </div>

              {error && <div style={styles.errorBox}><span>{error}</span></div>}

              <button type="submit" disabled={forgotLoading} style={{ ...styles.submitBtn, opacity: forgotLoading ? 0.7 : 1 }}>
                {forgotLoading ? 'Sending\u2026' : 'Send Reset Link'}
              </button>

              <button type="button" onClick={() => { setForgotMode(false); setError(''); }} style={styles.backLink}>
                {'\u2190'} Back to login
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@xspensesai.com"
                required
                disabled={loading}
                style={styles.input}
                onFocus={e => (e.target.style.borderColor = '#c8a64e')}
                onBlur={e => (e.target.style.borderColor = '#1e2d4a')}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
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

            <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Authenticating\u2026' : 'Sign In'}
            </button>

            <button type="button" onClick={() => { setForgotMode(true); setError(''); }} style={styles.forgotLink}>
              Forgot password?
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
  forgotLink: { background: 'none', border: 'none', color: '#6b7fa3', fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0, textAlign: 'center' },
  backLink: { background: 'none', border: 'none', color: '#6b7fa3', fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0, textAlign: 'center' },
  forgotTitle: { fontSize: 17, fontWeight: 600, color: '#e8ecf4', margin: '0 0 4px' },
  forgotDesc: { fontSize: 13, color: '#6b7fa3', margin: '0 0 8px', lineHeight: 1.5 },
  sentWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: '12px 0' },
  sentIcon: { width: 56, height: 56, background: '#34d39920', border: '1px solid #34d39944', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sentTitle: { color: '#e8ecf4', fontSize: 17, fontWeight: 600, margin: 0 },
  sentDesc: { color: '#8899bb', fontSize: 13.5, margin: 0, lineHeight: 1.5 },
  footer: { marginTop: 28, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: '#2a3a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerDot: { display: 'inline-block', width: 5, height: 5, background: '#1e2d4a', borderRadius: '50%' },
};
