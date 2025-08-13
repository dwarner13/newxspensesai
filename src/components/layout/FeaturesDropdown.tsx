import React from 'react';
import { Link } from 'react-router-dom';

interface FeaturesDropdownProps {
  open: boolean;
  onLinkClick?: () => void;
}

const FeaturesDropdown: React.FC<FeaturesDropdownProps> = ({ open, onLinkClick }) => {
  if (!open) return null;
  
  const handleLinkClick = (e: React.MouseEvent) => {
    // Prevent the default link behavior temporarily
    e.preventDefault();
    
    // Get the href from the link
    const href = e.currentTarget.getAttribute('href');
    
    // Close the dropdown first
    if (onLinkClick) {
      onLinkClick();
    }
    
    // Navigate after a small delay to ensure the dropdown closes smoothly
    setTimeout(() => {
      if (href) {
        window.location.href = href;
      }
    }, 100);
  };

  const completeMenuStructure = {
    personalFinanceAI: [
      {
        name: "Smart Import AI",
        path: "/features/smart-import-ai",
        description: "Upload any bank statement - AI reads everything",
        badge: "NEW",
        icon: "📄",
        iconClass: "icon-import"
      },
      {
        name: "AI Financial Assistant",
        path: "/features/ai-assistant",
        description: "Smart expense tracking & insights",
        icon: "🧠",
        iconClass: "icon-assistant"
      },
      {
        name: "AI Financial Therapist",
        path: "/features/ai-therapist",
        description: "Heal your relationship with money",
        icon: "💚",
        iconClass: "icon-therapist"
      },
      {
        name: "AI Goal Concierge",
        path: "/features/goal-concierge",
        description: "Personalized financial goal planning",
        icon: "🎯",
        iconClass: "icon-goals"
      },
      {
        name: "Spending Predictions",
        path: "/features/spending-predictions",
        description: "Forecast future expenses",
        icon: "🔮",
        iconClass: "icon-predictions"
      }
    ],
    audioEntertainment: [
      {
        name: "Personal Podcast Generator",
        path: "/features/podcast-generator",
        description: "AI creates episodes about YOUR financial story",
        icon: "🎙️",
        iconClass: "icon-podcast"
      },
      {
        name: "Spotify Integration",
        path: "/features/spotify-integration",
        description: "Music while you budget & invest",
        icon: "🎵",
        iconClass: "icon-spotify"
      },
      {
        name: "Financial Wellness Studio",
        path: "/features/wellness-studio",
        description: "Audio-first financial education",
        icon: "🎧",
        iconClass: "icon-wellness"
      }
    ],
    businessTax: [
      {
        name: "Freelancer Tax Assistant",
        path: "/features/freelancer-tax",
        description: "Automated tax optimization",
        icon: "📊",
        iconClass: "icon-freelancer"
      },
      {
        name: "Business Intelligence Assistant",
        path: "/features/business-expense-intelligence",
        description: "AI-powered business expense intelligence",
        icon: "💼",
        iconClass: "icon-business"
      },
      {
        name: "Smart Automation",
        path: "/features/smart-automation",
        description: "Automate your business finances",
        icon: "⚡",
        iconClass: "icon-automation"
      }
    ]
  };
  return (
    <div className="dropdown-menu fixed left-1/2 top-16 transform -translate-x-1/2 w-[90vw] max-w-[800px] bg-white shadow-2xl border border-gray-200 rounded-2xl z-[9999] p-3 animate-dropdownFadeIn">
      {/* Desktop: 3 columns side-by-side */}
      <div className="hidden lg:grid grid-cols-3 gap-4 w-full">
        {/* Personal Finance AI */}
        <div className="menu-section">
          <h3 className="section-header personal text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">PERSONAL FINANCE AI</h3>
          <div className="menu-items flex flex-col gap-1">
            {completeMenuStructure.personalFinanceAI.map(item => (
              <Link to={item.path} className="menu-item flex items-start space-x-2 p-1 rounded-md hover:bg-gray-50 transition-colors" key={item.name} onClick={handleLinkClick}>
                <div className={`menu-item-icon text-xs flex-shrink-0 ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content flex-1">
                  <div className="menu-item-title text-xs font-medium text-gray-900 flex items-center">
                    {item.name} {item.badge && <span className="new-badge ml-1 text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded-full">{item.badge}</span>}
                  </div>
                  <div className="menu-item-description text-xs text-gray-600">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {/* Audio Entertainment */}
        <div className="menu-section">
          <h3 className="section-header audio text-xs font-semibold text-pink-600 uppercase tracking-wide mb-2">AUDIO ENTERTAINMENT</h3>
          <div className="menu-items flex flex-col gap-1">
            {completeMenuStructure.audioEntertainment.map(item => (
              <Link to={item.path} className="menu-item flex items-start space-x-2 p-1 rounded-md hover:bg-gray-50 transition-colors" key={item.name} onClick={handleLinkClick}>
                <div className={`menu-item-icon text-xs flex-shrink-0 ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content flex-1">
                  <div className="menu-item-title text-xs font-medium text-gray-900">{item.name}</div>
                  <div className="menu-item-description text-xs text-gray-600">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {/* Business & Tax */}
        <div className="menu-section">
          <h3 className="section-header business text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">BUSINESS & TAX</h3>
          <div className="menu-items flex flex-col gap-1">
            {completeMenuStructure.businessTax.map(item => (
              <Link to={item.path} className="menu-item flex items-start space-x-2 p-1 rounded-md hover:bg-gray-50 transition-colors" key={item.name} onClick={handleLinkClick}>
                <div className={`menu-item-icon text-xs flex-shrink-0 ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content flex-1">
                  <div className="menu-item-title text-xs font-medium text-gray-900">{item.name}</div>
                  <div className="menu-item-description text-xs text-gray-600">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Stacked columns */}
      <div className="lg:hidden space-y-3">
        {/* Personal Finance AI */}
        <div className="menu-section">
          <h3 className="section-header personal text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">PERSONAL FINANCE AI</h3>
          <div className="menu-items space-y-1">
            {completeMenuStructure.personalFinanceAI.map(item => (
              <Link to={item.path} className="menu-item flex items-center space-x-2 p-1 rounded-md hover:bg-gray-50 transition-colors" key={item.name} onClick={handleLinkClick}>
                <div className={`menu-item-icon text-xs flex-shrink-0 ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content flex-1">
                  <div className="menu-item-title text-xs font-medium text-gray-900 flex items-center">
                    {item.name} {item.badge && <span className="new-badge ml-1 text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded-full">{item.badge}</span>}
                  </div>
                  <div className="menu-item-description text-xs text-gray-600">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {/* Audio Entertainment */}
        <div className="menu-section">
          <h3 className="section-header audio text-xs font-semibold text-pink-600 uppercase tracking-wide mb-1">AUDIO ENTERTAINMENT</h3>
          <div className="menu-items space-y-1">
            {completeMenuStructure.audioEntertainment.map(item => (
              <Link to={item.path} className="menu-item flex items-center space-x-2 p-1 rounded-md hover:bg-gray-50 transition-colors" key={item.name} onClick={handleLinkClick}>
                <div className={`menu-item-icon text-xs flex-shrink-0 ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content flex-1">
                  <div className="menu-item-title text-xs font-medium text-gray-900">{item.name}</div>
                  <div className="menu-item-description text-xs text-gray-600">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {/* Business & Tax */}
        <div className="menu-section">
          <h3 className="section-header business text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">BUSINESS & TAX</h3>
          <div className="menu-items space-y-1">
            {completeMenuStructure.businessTax.map(item => (
              <Link to={item.path} className="menu-item flex items-center space-x-2 p-1 rounded-md hover:bg-gray-50 transition-colors" key={item.name} onClick={handleLinkClick}>
                <div className={`menu-item-icon text-xs flex-shrink-0 ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content flex-1">
                  <div className="menu-item-title text-xs font-medium text-gray-900">{item.name}</div>
                  <div className="menu-item-description text-xs text-gray-600">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA Bar */}
      <div className="dropdown-cta mt-3 pt-2 border-t border-gray-200">
        <div className="cta-content flex flex-col md:flex-row items-center justify-between gap-2">
          <div>
            <h4 className="cta-title text-xs font-semibold text-gray-900 mb-0.5">Ready to revolutionize your finances?</h4>
            <p className="cta-subtitle text-xs text-gray-600">Try all features free - no credit card required</p>
          </div>
          <div className="cta-buttons flex gap-2 mt-2 md:mt-0">
            <Link to="/ai-employees" className="btn-secondary px-2 py-1 rounded-md border border-pink-500 text-pink-600 font-semibold hover:bg-pink-50 transition text-xs" onClick={handleLinkClick}>Meet AI Team</Link>
            <Link to="/pricing" className="btn-primary px-2 py-1 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:from-purple-600 hover:to-pink-600 transition text-xs" onClick={handleLinkClick}>Start Free Trial</Link>
          </div>
        </div>
      </div>
      <style>{`
        .dropdown-menu {
          animation: dropdownFadeIn 0.2s ease-out;
        }
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @media (max-width: 768px) {
          .dropdown-menu {
            width: 100vw;
            max-width: 100vw;
            left: 0;
            transform: none;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FeaturesDropdown; 
