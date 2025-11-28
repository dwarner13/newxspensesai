/**
 * Desktop Chat Side Bar Component (Vertical Icon Rail)
 * 
 * MultipurposeThemes-style vertical icon rail on the right edge:
 * - Fixed vertical rail with stacked icon buttons for quick AI employee access
 * - Each chat button opens unified chat with specific employee
 * - Workspace button navigates to full Prime workspace page
 * - Tooltips on hover using CSS group classes
 * - Desktop-only (hidden on mobile)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Upload, Tags, LineChart, LayoutDashboard } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function DesktopChatSideBar() {
  const { isOpen, activeEmployeeSlug, openChat } = useUnifiedChatLauncher();
  const navigate = useNavigate();

  // Chat button configuration
  const chatButtons = [
    {
      id: 'prime',
      label: 'Prime',
      slug: 'prime-boss',
      Icon: Crown,
    },
    {
      id: 'byte',
      label: 'Byte',
      slug: 'byte-docs',
      Icon: Upload,
    },
    {
      id: 'tag',
      label: 'Tag',
      slug: 'tag-ai',
      Icon: Tags,
    },
    {
      id: 'crystal',
      label: 'Crystal',
      slug: 'crystal-analytics',
      Icon: LineChart,
    },
  ] as const;

  // Workspace button configuration
  const workspaceButton = {
    id: 'workspace',
    label: 'Prime Workspace',
    to: '/dashboard/prime-chat',
    Icon: LayoutDashboard,
  } as const;

  // Container classes with conditional positioning
  // Positioned below DashboardHeader (top-40 = 160px, consistent across all pages)
  // Positioned near scrollbar (right-2 = 8px from right edge) to give Activity Feed more room
  const rightPosition = isOpen ? 'right-[440px]' : 'right-2';
  const containerClasses = `hidden md:flex fixed top-40 ${rightPosition} z-[998] transition-all duration-300 ease-out`;

  return (
    <div className={containerClasses}>
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2 flex flex-col gap-2 items-center shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur">
        {/* Chat Buttons */}
        {chatButtons.map(({ id, label, slug, Icon }) => {
          const isActive = isOpen && activeEmployeeSlug === slug;
          return (
            <div key={id} className="group relative">
              <button
                type="button"
                onClick={() =>
                  openChat({
                    initialEmployeeSlug: slug,
                    context: {
                      source: 'desktop-rail',
                      entry: `${id}-icon`,
                    },
                  })
                }
                aria-label={label}
                className={`
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  transition-colors duration-200
                  ${
                    isActive
                      ? 'bg-sky-500/80 text-white shadow-[0_0_25px_rgba(56,189,248,0.8)] border border-sky-400/80'
                      : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 origin-right scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
                <div className="rounded-md bg-slate-900/95 px-2 py-1 text-xs text-slate-100 shadow-lg border border-slate-700/80 whitespace-nowrap">
                  {label}
                </div>
              </div>
            </div>
          );
        })}

        {/* Divider */}
        <div className="h-px w-8 bg-slate-800/80 my-1" />

        {/* Workspace Button */}
        <div className="group relative">
          <button
            type="button"
            onClick={() => navigate(workspaceButton.to)}
            aria-label={workspaceButton.label}
            className={`
              w-10 h-10 rounded-full
              flex items-center justify-center
              transition-colors duration-200
              bg-slate-800/80 text-slate-200
              hover:bg-emerald-500/80 hover:text-white
            `}
          >
            <workspaceButton.Icon className="w-5 h-5" />
          </button>
          {/* Tooltip */}
          <div className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 origin-right scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
            <div className="rounded-md bg-slate-900/95 px-2 py-1 text-xs text-slate-100 shadow-lg border border-slate-700/80 whitespace-nowrap">
              {workspaceButton.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
