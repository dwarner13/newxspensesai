import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import NAV_ITEMS from '../../navigation/nav-registry';
import type { NavItem } from '../../navigation/nav-registry';
import { isActivePath } from '../../navigation/is-active';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Upload } from 'lucide-react';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
// AccountCenterPanel removed — using Settings V2 page instead
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartCategoriesStats } from '../../hooks/useSmartCategoriesStats';
import { useSetAtom } from 'jotai';
import { isUploadModalOpenAtom } from '../../lib/uiStore';
import { CompactScoreRing } from '../../pages/XspenseScore/ScoreRing';
import { useXspenseScore } from '../../pages/XspenseScore/useXspenseScore';

interface DesktopSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const AGENT_DOTS = [
  { letter: 'P', bg: 'bg-amber-500/25', border: 'border-amber-500/40', text: 'text-amber-400' },
  { letter: 'T', bg: 'bg-cyan-500/25', border: 'border-cyan-500/40', text: 'text-cyan-400' },
  { letter: 'C', bg: 'bg-purple-500/25', border: 'border-purple-500/40', text: 'text-purple-400' },
  { letter: 'B', bg: 'bg-emerald-500/25', border: 'border-emerald-500/40', text: 'text-emerald-400' },
];

export default function DesktopSidebar({ collapsed = false, onToggleCollapse }: DesktopSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const profile = useProfile();
  const tagStats = useSmartCategoriesStats();
  const setUploadOpen = useSetAtom(isUploadModalOpenAtom);
  const scoreData = useXspenseScore();
  const [inboxBadge, setInboxBadge] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase');
        const sb = getSupabase();
        if (!sb) return;
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;
        const res = await fetch('/.netlify/functions/tag-inbox', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { const d = await res.json(); setInboxBadge(d.badge_count ?? 0); }
      } catch { /* silent */ }
    })();
  }, []);

  const isCollapsed = onToggleCollapse ? collapsed : internalCollapsed;
  const setCollapsed = onToggleCollapse ? onToggleCollapse : setInternalCollapsed;

  useEffect(() => {
    const saved = localStorage.getItem('sidebar:collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, [setCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  if (!location.pathname.startsWith('/dashboard')) return null;

  const primaryItems = NAV_ITEMS.filter(i => i.group === 'PRIMARY');
  const moreItems = NAV_ITEMS.filter(i => i.group === 'MORE');

  const triggerUpload = () => navigate('/dashboard/upload');

  const renderItem = (item: NavItem, dimmed = false) => {
    const active = item.to === '/dashboard'
      ? location.pathname === '/dashboard' || location.pathname === '/dashboard/'
      : isActivePath(location.pathname, item.to);
    const uncatBadge = item.to === '/dashboard/categories' ? (tagStats.uncategorizedCount || 0) : 0;

    const inner = (
      <>
        <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
        {!isCollapsed && <span className={`truncate ${active ? 'text-[14px] font-bold' : dimmed ? 'text-[13px] font-semibold' : 'text-[14px] font-semibold'}`}>{item.label}</span>}
        {!isCollapsed && item.badge === 'new' && (
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(200,166,78,0.15)', color: '#c8a64e', border: '1px solid rgba(200,166,78,0.3)' }}>New</span>
        )}
        {!isCollapsed && item.badge === 'soon' && (
          <span className="ml-auto rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">Soon</span>
        )}
        {!isCollapsed && !!uncatBadge && item.to === '/dashboard/categories' && (
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>{uncatBadge}</span>
        )}
        {!isCollapsed && inboxBadge > 0 && item.to === '/dashboard/inbox' && (
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>{inboxBadge}</span>
        )}
      </>
    );

    const cls = [
      'flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all rounded-lg mx-1.5 w-[calc(100%-12px)]',
      active
        ? 'border-l-[3px] rounded-l-none'
        : 'border-l-[3px] border-transparent',
    ].join(' ');

    const activeStyle = active
      ? { borderLeftColor: '#c8a64e', background: 'rgba(200,166,78,0.08)', color: '#c8a64e', boxShadow: 'inset 3px 0 12px rgba(200,166,78,0.15)' }
      : { color: dimmed ? '#9ba8bc' : '#c8d0e0' };

    const navLink = (
      <NavLink
        key={item.to}
        to={item.to}
        className={cls}
        style={activeStyle}
        end={item.to === '/dashboard'}
        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#e8ecf4'; } }}
        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dimmed ? '#9ba8bc' : '#c8d0e0'; } }}
      >
        {inner}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.to}>
          <Tooltip delayDuration={120}>
            <TooltipTrigger asChild>{navLink}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return navLink;
  };

  return (
    <>
    <style>{`@keyframes glowPulse { 0%,100% { box-shadow: 0 0 8px rgba(200,166,78,0.1); } 50% { box-shadow: 0 0 16px rgba(200,166,78,0.25); } }`}</style>
    <aside
      data-testid="desktop-sidebar"
      className="hidden md:flex flex-col h-screen relative z-[100] transition-all duration-300"
      style={{
        width: isCollapsed ? 72 : 240,
        background: '#0b1220',
        borderRight: '1px solid #1e2d4a',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
    >
      {/* LOGO */}
      <div className="flex items-center justify-between px-3 h-16" style={{ borderBottom: '1px solid #1e2d4a' }}>
        {isCollapsed ? (
          <div className="flex items-center justify-center flex-1">
            <PrimeLogoBadge size={28} showGlow />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-2 flex-1">
            <PrimeLogoBadge size={28} showGlow />
            <div>
              <div className="text-[17px] font-extrabold tracking-wide" style={{ color: '#e8ecf4' }}>XspensesAI</div>
              <div className="text-[11px]" style={{ color: '#9ba8bc' }}>AI Finance</div>
            </div>
          </div>
        )}
      </div>

      {/* NAV */}
      <div className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {/* Primary */}
        <div className="space-y-0.5">
          {primaryItems.map(item => renderItem(item))}
        </div>

        {/* Upload CTA */}
        {!isCollapsed && (
          <div className="px-3 mt-4">
            <button
              type="button"
              onClick={triggerUpload}
              className="w-full rounded-xl p-3 text-left transition-all"
              style={{
                border: '1.5px dashed rgba(200,166,78,0.35)',
                background: 'rgba(200,166,78,0.04)',
                animation: 'glowPulse 3s ease-in-out infinite',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(200,166,78,0.6)'; e.currentTarget.style.background = 'rgba(200,166,78,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(200,166,78,0.35)'; e.currentTarget.style.background = 'rgba(200,166,78,0.04)'; }}
            >
              <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: '#c8a64e' }}>
                <Upload className="w-4 h-4" />
                Upload Statement
              </div>
              <div className="mt-1 text-[11px]" style={{ color: '#9ba8bc' }}>Byte processes instantly</div>
            </button>
          </div>
        )}
        {/* More toggle */}
        <button
          type="button"
          onClick={() => setMoreOpen(v => !v)}
          className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all rounded-lg mx-1.5 mt-2 w-[calc(100%-12px)]"
          style={{ color: '#9ba8bc', borderLeft: '2px solid transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#c8d0e0'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9ba8bc'; e.currentTarget.style.background = 'transparent'; }}
        >
          <MoreHorizontal className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="text-[13px] font-semibold">More</span>
              <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* More items */}
        {!isCollapsed && (
          <div className={`overflow-hidden transition-all duration-300 ${moreOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-0.5 pt-1">
              {moreItems.map(item => renderItem(item, true))}
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="px-2 mt-3">
            <TooltipProvider>
              <Tooltip delayDuration={120}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={triggerUpload}
                    className="w-full flex items-center justify-center rounded-lg py-2"
                    style={{ color: '#c8a64e' }}
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Upload Statement</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* SCORE + AI STATUS */}
      {!isCollapsed && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid #1e2d4a' }}>
          <div className="flex items-center gap-2">
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
            <span className="text-[12px] font-semibold" style={{ color: '#9ba8bc' }}>4 AI Agents Active</span>
            <div className="flex ml-auto -space-x-1.5">
              {AGENT_DOTS.map(a => (
                <div key={a.letter} className={`w-6 h-6 rounded-full text-[9px] font-bold border flex items-center justify-center ${a.bg} ${a.border} ${a.text}`} style={{ zIndex: 1 }}>
                  {a.letter}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE */}
      <div className="px-3 py-3 relative" style={{ borderTop: '1px solid #1e2d4a' }}>
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip delayDuration={120}>
              <TooltipTrigger asChild>
                <button onClick={() => navigate('/dashboard/settings')} className="flex justify-center w-full">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(200,166,78,0.2)', border: '1px solid rgba(200,166,78,0.35)', color: '#c8a64e' }}>
                    {profile.avatarInitials}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{profile.fullName}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/dashboard/settings')} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'linear-gradient(135deg, rgba(200,166,78,0.3), rgba(160,128,48,0.2))', border: '1px solid rgba(200,166,78,0.4)', color: '#c8a64e' }}>
              {profile.avatarInitials}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate" style={{ color: '#e8ecf4' }}>{profile.fullName}</div>
              <div className="text-[11px] truncate" style={{ color: '#9ba8bc' }}>{profile.plan}</div>
            </div>
            <button type="button" onClick={() => setUserMenuOpen(v => !v)} className="shrink-0" style={{ color: '#9ba8bc' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#9ba8c4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9ba8bc'; }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* User dropdown menu */}
        {userMenuOpen && !isCollapsed && (
          <div style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 8, background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: 6, zIndex: 200, fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
            <button onClick={() => { setUserMenuOpen(false); navigate('/dashboard/settings'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#e8ecf4', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#162035'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >{"\u2699\uFE0F"} Settings</button>
            <button onClick={() => { setUserMenuOpen(false); navigate('/dashboard/settings'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#e8ecf4', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#162035'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >{"\uD83D\uDC64"} Profile</button>
            <div style={{ height: 1, background: '#1e2d4a', margin: '4px 8px' }} />
            <button onClick={() => { setUserMenuOpen(false); void signOut(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >{"\uD83D\uDEAA"} Sign Out</button>
          </div>
        )}
      </div>

      {/* COLLAPSE TOGGLE */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center rounded-lg py-1.5 transition-colors"
          style={{ color: '#9ba8bc' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#c8d0e0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ba8bc'; }}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
    </>
  );
}
