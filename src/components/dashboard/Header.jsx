import React from 'react';
import { Bell as BellIcon, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Header component for top navigation bar
 * Displays dashboard title, welcome message, and action buttons
 */
const Header = () => {
  const { profile, firstName, user } = useAuth();
  
  // Use display_name from profile, fallback to firstName, then email prefix
  const displayName = profile?.display_name?.trim() || 
    profile?.full_name?.trim() || 
    firstName || 
    (user?.email ? user.email.split('@')[0] : null) || 
    'there';
  
  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-white/60">Welcome back, {displayName}!</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <BellIcon size={20} />
        </button>
        <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <SettingsIcon size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header; 