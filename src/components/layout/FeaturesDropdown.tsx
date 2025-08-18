import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
      { name: "Smart Import AI", path: "/features/smart-import-ai", icon: "📄", badge: "NEW" },
      { name: "AI Financial Assistant", path: "/features/ai-assistant", icon: "🧠" },
      { name: "AI Financial Therapist", path: "/features/ai-therapist", icon: "💚" },
      { name: "AI Goal Concierge", path: "/features/goal-concierge", icon: "🎯" },
      { name: "Spending Predictions", path: "/features/spending-predictions", icon: "🔮" },
      { name: "Personal Podcast Generator", path: "/features/podcast-generator", icon: "🎙️" }
    ],
    automation: [
      { name: "Smart Automation", path: "/features/smart-automation", icon: "⚡" },
      { name: "Business Intelligence", path: "/features/business-expense-intelligence", icon: "💼" },
      { name: "Freelancer Tax Assistant", path: "/features/freelancer-tax", icon: "📊" },
      { name: "Content Optimization", path: "/features/content-optimization", icon: "✍️" }
    ],
    entertainment: [
      { name: "Spotify Integration", path: "/features/spotify-integration", icon: "🎵" },
      { name: "Financial Wellness Studio", path: "/features/wellness-studio", icon: "🎧" },
      { name: "Gamified Achievement System", path: "/features/gamification", icon: "🏆" },
      { name: "Financial Podcasts", path: "/features/financial-podcasts", icon: "🎙️" }
    ],
    business: [
      { name: "Enterprise Solutions", path: "/features/enterprise", icon: "🏢" },
      { name: "White Label Software", path: "/features/white-label", icon: "🏷️" },
      { name: "Agency Tools", path: "/features/agency-tools", icon: "🎯" },
      { name: "Team Collaboration", path: "/features/team-collaboration", icon: "👥" }
    ]
  };

  return (
    <div className="features-dropdown">
      {/* Left CTA Panel */}
      <div className="dropdown-cta-panel">
        <div className="cta-content">
          <h3>End Manual Expense Work Forever</h3>
          <p>Join thousands of professionals who've automated their financial management with AI that actually understands your business.</p>
          
          <div className="cta-features">
            <span>Process 50+ documents in 30 seconds</span>
            <span>AI learns your business patterns</span>
            <span>99.7% accuracy rate</span>
            <span>Save 15+ hours per month</span>
          </div>
          
          <Link 
            to="/pricing" 
            className="cta-button"
            onClick={handleLinkClick}
          >
            Start Free Trial
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Right Features Panel - SearchAtlas Style */}
      <div className="dropdown-features-panel">
        {/* Featured Tools */}
        <div className="feature-category">
          <h4 className="category-header">FEATURED TOOLS</h4>
          <ul className="feature-list">
            {features.featuredTools.map(item => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  className="feature-item"
                  onClick={handleLinkClick}
                >
                  <span className="feature-icon">{item.icon}</span>
                  <span className="feature-name">{item.name}</span>
                  {item.badge && <span className="new-badge">{item.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Automation */}
        <div className="feature-category">
          <h4 className="category-header">AUTOMATION</h4>
          <ul className="feature-list">
            {features.automation.map(item => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  className="feature-item"
                  onClick={handleLinkClick}
                >
                  <span className="feature-icon">{item.icon}</span>
                  <span className="feature-name">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Entertainment */}
        <div className="feature-category">
          <h4 className="category-header">ENTERTAINMENT</h4>
          <ul className="feature-list">
            {features.entertainment.map(item => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  className="feature-item"
                  onClick={handleLinkClick}
                >
                  <span className="feature-icon">{item.icon}</span>
                  <span className="feature-name">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Business */}
        <div className="feature-category">
          <h4 className="category-header">BUSINESS</h4>
          <ul className="feature-list">
            {features.business.map(item => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  className="feature-item"
                  onClick={handleLinkClick}
                >
                  <span className="feature-icon">{item.icon}</span>
                  <span className="feature-name">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FeaturesDropdown; 


