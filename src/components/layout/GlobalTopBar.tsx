/**
 * GlobalTopBar Component
 * 
 * Global utility bar that appears at the top of all dashboard pages:
 * - Left: XspensesAI logo + app name
 * - Center: Search input
 * - Right: Spotify button, Notifications button, Profile button
 * 
 * This bar is sticky and appears above page-specific headers.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Search, Crown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useJobsSystemStore } from '../../state/jobsSystemStore';
import { NotificationsPanel } from '../system/NotificationsPanel';

export function GlobalTopBar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  // Get real notification count from jobs system store
  const { unreadAllCount } = useJobsSystemStore();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
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
            onChange={(e) => {
              // TODO: Wire global search functionality - connect to search API/endpoint
              setSearchQuery(e.target.value);
            }}
            className="bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500 flex-1"
          />
        </div>
      </div>

      {/* Right: Icons */}
      <div className="flex items-center gap-3">
        {/* Spotify Icon */}
        <button 
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/50 bg-slate-900/80 text-slate-100 hover:bg-blue-500/20 hover:border-blue-500 transition group"
          aria-label="Spotify Integration"
          onClick={() => navigate('/dashboard/spotify-integration')}
        >
          <svg 
            className="w-4 h-4 text-slate-300 group-hover:text-green-400 transition-colors duration-200" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-9.54-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 3.6-1.08 7.56-.6 10.68 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.24 12.6c.361.181.54.78.301 1.44zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </button>
        
        {/* Notifications Bell */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/50 bg-slate-900/80 text-slate-100 hover:bg-blue-500/20 hover:border-blue-500 transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-300" />
            {unreadAllCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium border-2 border-[#030816]">
                {unreadAllCount > 99 ? '99+' : unreadAllCount}
              </span>
            )}
          </button>
            
          {/* Notifications Panel */}
          <NotificationsPanel 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)} 
          />
        </div>

        {/* Profile Icon with Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/50 bg-slate-900/80 text-slate-100 hover:bg-blue-500/20 hover:border-blue-500 transition group"
            aria-label="Profile menu"
          >
            <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
              <div className="p-2">
                <div className="px-3 py-2 border-b border-purple-500/20 mb-2">
                  <div className="text-sm font-medium text-white">John Doe</div>
                  <div className="text-xs text-slate-400">Premium Plan</div>
                </div>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Account Settings</span>
                </button>
                <div className="border-t border-purple-500/20 my-1"></div>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200">
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













