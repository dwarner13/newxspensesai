import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Upload, Brain, Heart, Target, TrendingUp, 
  Mic, Zap, Briefcase, Calculator, PenTool, Music, 
  Headphones, Trophy, Podcast, Building, Tag, Crosshair, Users
} from 'lucide-react';

interface FeaturesDropdownProps {
  open: boolean;
  onLinkClick?: () => void;
}

const FeaturesDropdown: React.FC<FeaturesDropdownProps> = ({ open, onLinkClick }) => {
  const handleLinkClick = (e: React.MouseEvent) => {
    // Don't prevent default - let React Router handle navigation
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const features = {
    featuredTools: [
      { name: "Smart Import AI", path: "/features/smart-import-ai", icon: <Upload size={20} />, badge: "NEW" },
      { name: "AI Financial Assistant", path: "/features/ai-assistant", icon: <Brain size={20} /> },
      { name: "AI Financial Therapist", path: "/features/ai-therapist", icon: <Heart size={20} /> },
      { name: "AI Goal Concierge", path: "/features/goal-concierge", icon: <Target size={20} /> },
      { name: "Spending Predictions", path: "/features/spending-predictions", icon: <TrendingUp size={20} /> },
      { name: "Personal Podcast Generator", path: "/features/podcast-generator", icon: <Mic size={20} /> }
    ],
    automation: [
      { name: "Smart Automation", path: "/features/smart-automation", icon: <Zap size={20} /> },
      { name: "Business Intelligence", path: "/features/business-expense-intelligence", icon: <Briefcase size={20} /> },
      { name: "Freelancer Tax Assistant", path: "/features/freelancer-tax", icon: <Calculator size={20} /> },
      { name: "Content Optimization", path: "/features/content-optimization", icon: <PenTool size={20} /> }
    ],
    entertainment: [
      { name: "Spotify Integration", path: "/features/spotify-integration", icon: <Music size={20} /> },
      { name: "Financial Wellness Studio", path: "/features/wellness-studio", icon: <Headphones size={20} /> },
      { name: "Gamified Achievement System", path: "/features/gamification", icon: <Trophy size={20} /> },
      { name: "Financial Podcasts", path: "/features/financial-podcasts", icon: <Podcast size={20} /> }
    ],
    business: [
      { name: "Enterprise Solutions", path: "/features/enterprise", icon: <Building size={20} /> },
      { name: "White Label Software", path: "/features/white-label", icon: <Tag size={20} /> },
      { name: "Agency Tools", path: "/features/agency-tools", icon: <Crosshair size={20} /> },
      { name: "Team Collaboration", path: "/features/team-collaboration", icon: <Users size={20} /> }
    ]
  };

  return (
    <div 
      data-features-dropdown 
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-[850px] max-w-[90vw] bg-gradient-to-br from-[#2a1946] via-[#1a2142] to-[#111827] border border-white/10 rounded-3xl shadow-2xl transition-all duration-300 ${open ? 'block' : 'hidden'}`}
      style={{ display: open ? 'block' : 'none' }}
    >
      {/* Top border glow */}
      <div className="h-1 w-full rounded-t-3xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-400 opacity-80"></div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-5 gap-0">
        {/* Left CTA Panel */}
        <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-6 rounded-l-3xl">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">End Manual Expense Work Forever</h3>
            <p className="text-slate-300 text-sm leading-relaxed">Join thousands of professionals who've automated their financial management with AI that actually understands your business.</p>
            
            <div className="space-y-2">
              <span className="block text-slate-400 text-sm">Process 50+ documents in 30 seconds</span>
              <span className="block text-slate-400 text-sm">AI learns your business patterns</span>
              <span className="block text-slate-400 text-sm">99.7% accuracy rate</span>
              <span className="block text-slate-400 text-sm">Save 15+ hours per month</span>
            </div>
            
            <Link 
              to="/pricing" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
              onClick={handleLinkClick}
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Right Features Panel */}
        <div className="col-span-4 grid grid-cols-4 gap-6 p-6">
          {/* Featured Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-slate-300 uppercase">Featured Tools</h4>
            <ul className="space-y-1">
              {features.featuredTools.map(item => (
                <li key={item.name}>
                  <Link 
                    to={item.path} 
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                    onClick={handleLinkClick}
                  >
                    <span className="text-cyan-400 flex-shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                    {item.badge && <span className="ml-auto bg-cyan-400/90 text-slate-900 text-xs font-semibold px-2 py-1 rounded-lg">{item.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Automation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-slate-300 uppercase">Automation</h4>
            <ul className="space-y-1">
              {features.automation.map(item => (
                <li key={item.name}>
                  <Link 
                    to={item.path} 
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                    onClick={handleLinkClick}
                  >
                    <span className="text-cyan-400 flex-shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entertainment */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-slate-300 uppercase">Entertainment</h4>
            <ul className="space-y-1">
              {features.entertainment.map(item => (
                <li key={item.name}>
                  <Link 
                    to={item.path} 
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                    onClick={handleLinkClick}
                  >
                    <span className="text-cyan-400 flex-shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Business */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-slate-300 uppercase">Business</h4>
            <ul className="space-y-1">
              {features.business.map(item => (
                <li key={item.name}>
                  <Link 
                    to={item.path} 
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                    onClick={handleLinkClick}
                  >
                    <span className="text-cyan-400 flex-shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Footer with CTA */}
      <div className="flex items-center justify-between rounded-b-3xl border-t border-white/10 bg-white/5 px-6 py-3">
        <div className="text-sm text-slate-300">
          Transform your finances with AI — <span className="text-white font-semibold">start today</span>.
        </div>
        <Link
          to="/signup"
          className="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-500 transition-colors"
          onClick={handleLinkClick}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default FeaturesDropdown; 


