/**
 * GlobalTopBar Component
 *
 * Global utility bar that appears at the top of all dashboard pages:
 * - Left: XspensesAI logo + app name
 * - Center: Search input
 * - Right: Inbox button, Profile button
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Inbox, Search, Crown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';

export function GlobalTopBar() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch inbox badge count
  useEffect(() => {
    (async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase');
        const sb = getSupabase();
        if (!sb) return;
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;
        const res = await fetch('/.netlify/functions/tag-inbox', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const d = await res.json();
          setInboxCount(d.badge_count ?? 0);
        }
      } catch { /* silent */ }
    })();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-[#030816]/90 backdrop-blur border-b border-blue-500/20">
      {/* Left: Logo / app name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
          <Crown size={20} className="text-white font-bold" />
        </div>
        <span className="text-sm font-black tracking-wide text-slate-100">
          XspensesAI
        </span>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <div className="flex items-center rounded-full bg-slate-900/80 border border-blue-500/50 px-4 h-10 focus-within:border-blue-500 transition-all">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500 flex-1"
          />
        </div>
      </div>

      {/* Right: Icons */}
      <div className="flex items-center gap-3">
        {/* Inbox */}
        <button
          onClick={() => navigate('/dashboard/inbox')}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/50 bg-slate-900/80 text-slate-100 hover:bg-blue-500/20 hover:border-blue-500 transition relative"
          aria-label="Inbox"
        >
          <Inbox className="w-4 h-4 text-slate-300" />
          {inboxCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium border-2 border-[#030816]">
              {inboxCount > 99 ? '99+' : inboxCount}
            </span>
          )}
        </button>

        {/* Profile Icon with Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/50 bg-slate-900/80 text-slate-100 hover:bg-blue-500/20 hover:border-blue-500 transition group"
            aria-label="Profile menu"
          >
            <div className="w-full h-full rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'linear-gradient(135deg, rgba(200,166,78,0.3), rgba(160,128,48,0.2))', color: '#c8a64e' }}>
              {profile.avatarInitials || '?'}
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
              <div className="p-2">
                <div className="px-3 py-2 border-b border-purple-500/20 mb-2">
                  <div className="text-sm font-medium text-white">{profile.fullName || 'My Account'}</div>
                  <div className="text-xs text-slate-400">{profile.plan || 'Free'}</div>
                </div>
                <button onClick={() => { setIsProfileOpen(false); navigate('/dashboard/settings'); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Account Settings</span>
                </button>
                <div className="border-t border-purple-500/20 my-1"></div>
                <button onClick={() => { setIsProfileOpen(false); void signOut(); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200">
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
