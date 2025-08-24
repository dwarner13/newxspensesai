import React from 'react';
import { Link } from 'react-router-dom';
import { X, Upload, Brain, Heart, Target, TrendingUp, Mic, Music, Headphones, Calculator, Briefcase, Zap, Rocket } from 'lucide-react';

interface MobileFeaturesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileFeaturesDropdown: React.FC<MobileFeaturesDropdownProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleLinkClick = () => {
    onClose();
  };

  const featuresData = {
    personalFinanceAI: {
      title: 'PERSONAL FINANCE AI',
      items: [
        { name: 'Smart Import AI', path: '/features/smart-import-ai', icon: <Upload size={20} />, badge: 'NEW' },
        { name: 'AI Financial Assistant', path: '/features/ai-assistant', icon: <Brain size={20} /> },
        { name: 'AI Financial Therapist', path: '/features/ai-therapist', icon: <Heart size={20} /> },
        { name: 'AI Goal Concierge', path: '/features/goal-concierge', icon: <Target size={20} /> },
        { name: 'Spending Predictions', path: '/features/spending-predictions', icon: <TrendingUp size={20} /> }
      ]
    },
    audioEntertainment: {
      title: 'AUDIO ENTERTAINMENT',
      items: [
        { name: 'Personal Podcast Generator', path: '/features/podcast-generator', icon: <Mic size={20} /> },
        { name: 'Spotify Integration', path: '/features/spotify-integration', icon: <Music size={20} /> },
        { name: 'Financial Wellness Studio', path: '/features/wellness-studio', icon: <Headphones size={20} /> }
      ]
    },
    businessTax: {
      title: 'BUSINESS & TAX',
      items: [
        { name: 'Freelancer Tax Assistant', path: '/features/freelancer-tax', icon: <Calculator size={20} /> },
        { name: 'Business Intelligence', path: '/features/business-expense-intelligence', icon: <Briefcase size={20} /> },
        { name: 'Smart Automation', path: '/features/smart-automation', icon: <Zap size={20} /> }
      ]
    }
  };

  return (
    <div className="mobile-dropdown open">
      <div className="mobile-dropdown-header">
        <h2>Features</h2>
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      
      <div className="mobile-dropdown-content">
        {Object.entries(featuresData).map(([key, section]) => (
          <div key={key} className="category-section">
            <h3 className="category-header">{section.title}</h3>
            <ul className="feature-list">
              {section.items.map((item) => (
                <li key={item.name} className="feature-item">
                  <Link to={item.path} onClick={handleLinkClick} className="flex items-center gap-3 w-full">
                    <span className="feature-icon">{item.icon}</span>
                    <span className="feature-name">{item.name}</span>
                    {item.badge && <span className="new-badge">{item.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        {/* View All Features Link */}
        <div className="category-section">
          <h3 className="category-header">EXPLORE MORE</h3>
          <ul className="feature-list">
            <li className="feature-item">
              <Link to="/features" onClick={handleLinkClick} className="flex items-center gap-3 w-full">
                <span className="feature-icon"><Rocket size={20} /></span>
                <span className="feature-name">View All Features</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobileFeaturesDropdown;
