import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  email: string;
  role: string;
  last_admin_login: string | null;
}

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalImports: number;
  activeAdmins: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/xai-admin'); return; }

      // Verify admin role
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('email, role, last_admin_login, is_active')
        .eq('user_id', session.user.id)
        .single();

      if (!adminRecord?.is_active) { navigate('/xai-admin'); return; }
      setAdminUser(adminRecord);

      // Fetch basic platform stats
      const [usersRes, txRes, importsRes, adminsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        supabase.from('imports').select('id', { count: 'exact', head: true }),
        supabase.from('admin_users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalTransactions: txRes.count ?? 0,
        totalImports: importsRes.count ?? 0,
        activeAdmins: adminsRes.count ?? 0,
      });

      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/xai-admin');
  };

  if (loading) {
    return (
      <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  const statCards = [
    { label: 'TOTAL USERS', value: stats?.totalUsers ?? '\u2014', icon: '\uD83D\uDC64', color: '#c8a64e' },
    { label: 'TRANSACTIONS', value: stats?.totalTransactions ?? '\u2014', icon: '\uD83D\uDCCA', color: '#22d3ee' },
    { label: 'IMPORTS', value: stats?.totalImports ?? '\u2014', icon: '\uD83D\uDCC1', color: '#34d399' },
    { label: 'ACTIVE ADMINS', value: stats?.activeAdmins ?? '\u2014', icon: '\uD83D\uDEE1', color: '#a78bfa' },
  ];

  return (
    <div style={styles.root}>
      {/* Top nav */}
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.navCrown}>{'\u2655'}</span>
          <span style={styles.navBrand}>XspensesAI</span>
          <span style={styles.navSep}>/</span>
          <span style={styles.navLabel}>Admin Console</span>
        </div>
        <div style={styles.navRight}>
          <div style={styles.roleBadge}>
            <span style={styles.roleDot} />
            {adminUser?.role?.replace('_', ' ').toUpperCase()}
          </div>
          <span style={styles.navEmail}>{adminUser?.email}</span>
          <button onClick={handleSignOut} style={styles.signOutBtn}>Sign Out</button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Page header */}
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Platform Overview</h1>
          <p style={styles.pageSubtitle}>
            Last admin login: {adminUser?.last_admin_login
              ? new Date(adminUser.last_admin_login).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
              : 'First login'}
          </p>
        </div>

        {/* Stat cards */}
        <div style={styles.statsGrid}>
          {statCards.map(card => (
            <div key={card.label} style={styles.statCard}>
              <div style={styles.statTop}>
                <span style={styles.statLabel}>{card.label}</span>
                <span style={styles.statIcon}>{card.icon}</span>
              </div>
              <div style={{ ...styles.statValue, color: card.color }}>
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </div>
              <div style={{ ...styles.statBar, background: card.color + '33' }}>
                <div style={{ ...styles.statBarFill, background: card.color, width: '100%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon sections */}
        <div style={styles.sectionGrid}>
          {['User Management', 'Import Logs', 'Agent Activity', 'System Health'].map(section => (
            <div key={section} style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>{section}</span>
                <span style={styles.comingSoon}>Coming Soon</span>
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.placeholder} />
                <div style={{ ...styles.placeholder, width: '70%' }} />
                <div style={{ ...styles.placeholder, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0b1220', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' },
  loadingSpinner: { width: 32, height: 32, border: '3px solid #1e2d4a', borderTopColor: '#c8a64e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  navbar: { background: '#111a2e', borderBottom: '1px solid #1e2d4a', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  navLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  navCrown: { fontSize: 18, color: '#c8a64e', lineHeight: 1 },
  navBrand: { fontSize: 15, fontWeight: 700, color: '#e8ecf4' },
  navSep: { color: '#2a3a5a', fontSize: 16 },
  navLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6b7fa3', letterSpacing: '0.08em' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  roleBadge: { display: 'flex', alignItems: 'center', gap: 6, background: '#c8a64e15', border: '1px solid #c8a64e33', borderRadius: 4, padding: '3px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: '#c8a64e', letterSpacing: '0.1em' },
  roleDot: { display: 'inline-block', width: 6, height: 6, background: '#c8a64e', borderRadius: '50%' },
  navEmail: { fontSize: 12, color: '#6b7fa3' },
  signOutBtn: { background: 'none', border: '1px solid #1e2d4a', borderRadius: 4, color: '#8899bb', fontSize: 12, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  main: { flex: 1, padding: '32px 24px', maxWidth: 1100, width: '100%', margin: '0 auto' },
  pageHeader: { marginBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#e8ecf4', margin: '0 0 6px' },
  pageSubtitle: { fontSize: 13, color: '#6b7fa3', margin: 0, fontFamily: "'IBM Plex Mono', monospace" },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: { background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 6, padding: '20px 20px 16px' },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.15em', color: '#6b7fa3' },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 32, fontWeight: 700, letterSpacing: '-1px', marginBottom: 12, lineHeight: 1 },
  statBar: { height: 3, borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2, opacity: 0.7 },
  sectionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  sectionCard: { background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 6, padding: 20 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#e8ecf4' },
  comingSoon: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.12em', color: '#2a3a5a', background: '#1e2d4a', borderRadius: 3, padding: '3px 7px' },
  sectionBody: { display: 'flex', flexDirection: 'column', gap: 10 },
  placeholder: { height: 10, background: '#1e2d4a', borderRadius: 3, width: '90%', animation: 'shimmer 2s ease infinite' },
};
