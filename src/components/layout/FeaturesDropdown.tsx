import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Zap, Brain, Headphones, TrendingUp } from 'lucide-react';

interface FeaturesDropdownProps {
  open: boolean;
  onLinkClick?: () => void;
}

const FeaturesDropdown: React.FC<FeaturesDropdownProps> = ({ open, onLinkClick }) => {
  if (!open) return null;
  
  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    
    if (onLinkClick) {
      onLinkClick();
    }
    
    setTimeout(() => {
      if (href) {
        window.location.href = href;
      }
    }, 100);
  };

  const features = {
    personalFinanceAI: [
      { name: "Smart Import AI", path: "/features/smart-import-ai", icon: "📄", badge: "NEW" },
      { name: "AI Financial Assistant", path: "/features/ai-assistant", icon: "🧠" },
      { name: "AI Financial Therapist", path: "/features/ai-therapist", icon: "💚" },
      { name: "AI Goal Concierge", path: "/features/goal-concierge", icon: "🎯" },
      { name: "Spending Predictions", path: "/features/spending-predictions", icon: "🔮" }
    ],
    audioEntertainment: [
      { name: "Personal Podcast Generator", path: "/features/podcast-generator", icon: "🎙️" },
      { name: "Spotify Integration", path: "/features/spotify-integration", icon: "🎵" },
      { name: "Financial Wellness Studio", path: "/features/wellness-studio", icon: "🎧" }
    ],
    businessTax: [
      { name: "Freelancer Tax Assistant", path: "/features/freelancer-tax", icon: "📊" },
      { name: "Business Intelligence", path: "/features/business-expense-intelligence", icon: "💼" },
      { name: "Smart Automation", path: "/features/smart-automation", icon: "⚡" }
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

      {/* Right Features Panel */}
      <div className="dropdown-features-panel">
        {/* Personal Finance AI */}
        <div className="feature-category">
          <h4 className="category-header">Personal Finance AI</h4>
          <ul className="feature-list">
            {features.personalFinanceAI.map(item => (
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

        {/* Audio Entertainment */}
        <div className="feature-category">
          <h4 className="category-header">Audio Entertainment</h4>
          <ul className="feature-list">
            {features.audioEntertainment.map(item => (
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

        {/* Business & Tax */}
        <div className="feature-category">
          <h4 className="category-header">Business & Tax</h4>
          <ul className="feature-list">
            {features.businessTax.map(item => (
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


