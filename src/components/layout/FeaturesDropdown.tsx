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
      { name: "AI Crystal Ball Theater", path: "/features/predictions", icon: <TrendingUp size={20} /> },
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
    <>
      {open && (
        <div 
          data-features-dropdown 
          className="features-dropdown open"
        >
          {/* Main content grid */}
          <div className="features-dropdown-content">
            {/* Featured Tools */}
            <div className="feature-section">
              <h3>Featured Tools</h3>
              <ul className="space-y-1">
                {features.featuredTools.map(item => (
                  <li key={item.name}>
                    <Link 
                      to={item.path} 
                      className="feature-item"
                      onClick={handleLinkClick}
                    >
                      <span className="feature-icon">{item.icon}</span>
                      <div className="feature-text">
                        <span className="feature-name">{item.name}</span>
                        {item.badge && <span className="feature-badge">{item.badge}</span>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Automation */}
            <div className="feature-section">
              <h3>Automation</h3>
              <ul className="space-y-1">
                {features.automation.map(item => (
                  <li key={item.name}>
                    <Link 
                      to={item.path} 
                      className="feature-item"
                      onClick={handleLinkClick}
                    >
                      <span className="feature-icon">{item.icon}</span>
                      <div className="feature-text">
                        <span className="feature-name">{item.name}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Entertainment */}
            <div className="feature-section">
              <h3>Entertainment</h3>
              <ul className="space-y-1">
                {features.entertainment.map(item => (
                  <li key={item.name}>
                    <Link 
                      to={item.path} 
                      className="feature-item"
                      onClick={handleLinkClick}
                    >
                      <span className="feature-icon">{item.icon}</span>
                      <div className="feature-text">
                        <span className="feature-name">{item.name}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Business */}
            <div className="feature-section">
              <h3>Business</h3>
              <ul className="space-y-1">
                {features.business.map(item => (
                  <li key={item.name}>
                    <Link 
                      to={item.path} 
                      className="feature-item"
                      onClick={handleLinkClick}
                    >
                      <span className="feature-icon">{item.icon}</span>
                      <div className="feature-text">
                        <span className="feature-name">{item.name}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeaturesDropdown; 


