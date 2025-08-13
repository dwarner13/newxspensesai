import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, Bot, Crown, Heart, Target, TrendingDown, Brain, 
  Headphones, Music, BookOpen, Calculator, PieChart, Zap,
  BarChart3, FileText, Settings, User, DollarSign
} from 'lucide-react';

const MobileMenu: React.FC = () => {
  const navigationItems = [
    { icon: <Home size={20} />, label: 'Dashboard', to: '/' },
    { icon: <Bot size={20} />, label: 'AI Assistant', to: '/ai-assistant' },
    { icon: <Crown size={20} />, label: 'AI Concierge', to: '/ai-concierge' },
    { icon: <Heart size={20} />, label: 'Financial Wellness', to: '/financial-wellness' },
    { icon: <Zap size={20} />, label: 'Smart Automation', to: '/smart-automation' },
    { icon: <PieChart size={20} />, label: 'Business Intelligence', to: '/business-intelligence' },
    { icon: <Calculator size={20} />, label: 'Tax Assistant', to: '/freelancer-tax' },
    { icon: <BarChart3 size={20} />, label: 'Analytics', to: '/analytics' },
            { icon: <FileText size={20} />, label: 'Reports', to: '/dashboard/reports' },
  ];

  const entertainmentItems = [
    { icon: <Headphones size={20} />, label: 'Personal Podcasts', to: '/dashboard/personal-podcast' },
    { icon: <Music size={20} />, label: 'Spotify Integration', to: '/dashboard/spotify-integration' },
    { icon: <BookOpen size={20} />, label: 'Financial Education', to: '/dashboard/wellness-studio' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Main Navigation Section */}
            <div className="flex-1 overflow-y-auto py-6">
              <nav className="px-6 space-y-2">
          <h3 className="text-white/80 font-semibold text-sm uppercase tracking-wider mb-4 px-3">
            Main Navigation
          </h3>
          {navigationItems.map((item) => (
            <Link
                    key={item.to}
                      to={item.to}
                      className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200 group"
                    >
              <span className="text-white group-hover:scale-110 transition-transform duration-200">
                        {item.icon}
                      </span>
              <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
              </nav>

        {/* Entertainment Section */}
              <div className="px-6 mt-8">
          <h3 className="text-white/80 font-semibold text-sm uppercase tracking-wider mb-4 px-3">
            Entertainment
                </h3>
          <div className="space-y-2">
            {entertainmentItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200 group"
              >
                <span className="text-white group-hover:scale-110 transition-transform duration-200">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
                  ))}
                </div>
              </div>
            </div>

      {/* Bottom Section with User Info and Settings */}
      <div className="border-t border-white/20 p-6 space-y-4">
        {/* User Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold">Darrell Warner</div>
              <div className="text-white/70 text-xs">Premium Member</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-xl px-3 py-2 text-white font-semibold text-sm">
            <Crown size={16} />
            Level 8 Money Master
          </div>
        </div>

        {/* Settings Button */}
                <Link
          to="/settings"
          className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200 group w-full"
        >
          <span className="text-white group-hover:scale-110 transition-transform duration-200">
            <Settings size={20} />
          </span>
          <span className="font-medium">Settings</span>
                </Link>
      </div>
            </div>
  );
};

export default MobileMenu;
