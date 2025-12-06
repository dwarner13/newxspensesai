/**
 * WorkspaceTabs Component
 * 
 * MultipurposeThemes-style pill tabs for navigating between main workspace pages
 * Desktop and tablet only - hidden on mobile
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

const WORKSPACE_TABS = [
  { id: 'overview', label: 'Overview', path: '/dashboard' },
  { id: 'prime-chat', label: 'Prime Chat', path: '/dashboard/prime-chat' },
  { id: 'smart-import', label: 'Smart Import AI', path: '/dashboard/smart-import-ai' },
  { id: 'ai-chat', label: 'AI Chat Assistant', path: '/dashboard/ai-chat-assistant' },
] as const;

export default function WorkspaceTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-2 py-1 shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur">
      {WORKSPACE_TABS.map((tab) => {
        // Check if this tab is active
        // Exact match OR path starts with tab path + '/'
        const isActive = 
          location.pathname === tab.path || 
          (tab.path !== '/dashboard' && location.pathname.startsWith(tab.path + '/'));

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.path)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200',
              isActive
                ? 'bg-sky-500/90 text-white shadow-[0_0_25px_rgba(56,189,248,0.65)] border border-sky-300/80'
                : 'border border-transparent text-slate-300 hover:text-white hover:bg-slate-800/80'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}











