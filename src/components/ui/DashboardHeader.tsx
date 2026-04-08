/**
 * DashboardHeader Component - Slim V2
 * 48px navbar: search (left) + bell + profile dropdown (right)
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompactScoreRing } from '../../pages/XspenseScore/ScoreRing';
import { useXspenseScore } from '../../pages/XspenseScore/useXspenseScore';
import { Bell, User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { CommandPalette } from './CommandPalette';
import { useControlCenterDrawer } from '../settings/ControlCenterDrawer';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';

interface DashboardHeaderProps {
  customTitle?: string;
  customSubtitle?: string;
}

export default function DashboardHeader(_props: DashboardHeaderProps) {
  const navigate = useNavigate();
  // ControlCenterDrawer removed - Settings V2 page handles profile
  const { user, signOut } = useAuth();
  const { profile, avatarUrl } = useProfileContext();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const scoreData = useXspenseScore();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [unreadCount] = useState(4);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const computedDisplayName = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.first_name) return profile.first_name;
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Account';
  }, [profile, user]);

  const userEmail = user?.email || '';

  const avatarInitials = useMemo(() => {
    if (avatarUrl) return null;
    const name = computedDisplayName || 'A';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }, [avatarUrl, computedDisplayName]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setIsNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Escape closes dropdowns
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsNotificationsOpen(false); setIsProfileOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); setIsCommandPaletteOpen(true); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsProfileOpen(false);
    await signOut();
  }, [signOut]);

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-[10px] text-left transition-colors"
      style={{ padding: '10px 16px', color: danger ? '#f87171' : '#e8ecf4', fontSize: 13 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.08)' : '#162035'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: danger ? '#f87171' : '#9ba8bc', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <header
      id="dashboard-header"
      className="shrink-0 w-full sticky top-0 z-30"
      style={{ height: 48, background: '#0b1220', borderBottom: '1px solid #1e2d4a', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* LEFT: Search */}
        <div className="relative w-[240px]">
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-[34px] pl-9 pr-3 rounded-[10px] text-[13px] outline-none transition-all"
            style={{ background: '#111a2e', border: '1px solid transparent', color: '#e8ecf4' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1e2d4a';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,166,78,0.22), 0 4px 16px rgba(200,166,78,0.11)';
              setIsCommandPaletteOpen(true);
              e.currentTarget.blur();
            }}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="#9ba8bc" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* RIGHT: Bell + Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {/* Score badge */}
          {!scoreData.loading && (
            <button onClick={() => navigate('/dashboard/xspense-score')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#162035'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <CompactScoreRing score={scoreData.overallScore} size={24} />
              <span className="text-[11px] font-bold" style={{ color: '#e8ecf4' }}>{scoreData.overallScore}</span>
            </button>
          )}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }}
              className="relative flex items-center justify-center w-[34px] h-[34px] rounded-[10px] transition-colors"
              style={{ background: 'transparent', color: '#c8d0e0' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#162035'; e.currentTarget.style.color = '#e8ecf4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c8d0e0'; }}
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] leading-4 font-bold text-white flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl z-50" style={{ background: '#111a2e', border: '1px solid #1e2d4a', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-bold" style={{ color: '#e8ecf4' }}>Notifications</h3>
                    <span className="text-[11px]" style={{ color: '#9ba8bc' }}>{unreadCount} unread</span>
                  </div>
                  <div className="text-[12px]" style={{ color: '#c8d0e0' }}>Your AI team activity appears on the Dashboard home.</div>
                </div>
              </div>
            )}
          </div>

          {/* Profile avatar + dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); }}
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full overflow-hidden transition-all"
              style={{ border: '1px solid rgba(200,166,78,0.35)' }}
              aria-label={`Profile - ${computedDisplayName}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={computedDisplayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'linear-gradient(135deg, rgba(200,166,78,0.3), rgba(160,128,48,0.2))', color: '#c8a64e' }}>
                  {avatarInitials}
                </div>
              )}
            </button>

            {/* Profile dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-[240px] rounded-[14px] z-50" style={{ background: '#111a2e', border: '1px solid #1e2d4a', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: 8 }}>
                {/* User info */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2d4a', marginBottom: 4 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: 'linear-gradient(135deg, rgba(200,166,78,0.3), rgba(160,128,48,0.2))', color: '#c8a64e', boxShadow: '0 0 16px rgba(200,166,78,0.2)' }}>
                      {avatarInitials || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold truncate" style={{ color: '#e8ecf4' }}>{computedDisplayName}</div>
                      <div className="text-[11px] truncate" style={{ color: '#9ba8bc' }}>{userEmail}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(200,166,78,0.12)', color: '#c8a64e' }}>Free Plan</span>
                  </div>
                </div>

                {/* Menu items */}
                {menuItem(<User className="w-4 h-4" />, 'My Profile', () => { setIsProfileOpen(false); navigate('/dashboard/settings'); })}
                {menuItem(<Settings className="w-4 h-4" />, 'Settings', () => { setIsProfileOpen(false); navigate('/dashboard/settings'); })}
                {menuItem(<HelpCircle className="w-4 h-4" />, 'Help & Support', () => { setIsProfileOpen(false); })}

                {/* Divider */}
                <div style={{ height: 1, background: '#1e2d4a', margin: '4px 8px' }} />

                {/* Logout */}
                {menuItem(<LogOut className="w-4 h-4" />, 'Log Out', handleLogout, true)}
              </div>
            )}
          </div>
        </div>
      </div>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </header>
  );
}
