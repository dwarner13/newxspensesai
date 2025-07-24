import React from 'react';
import { Link } from 'react-router-dom';

interface FeaturesDropdownProps {
  open: boolean;
  onLinkClick?: () => void;
}

const FeaturesDropdown: React.FC<FeaturesDropdownProps> = ({ open, onLinkClick }) => {
  if (!open) return null;
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
    <div className="dropdown-menu fixed left-1/2 top-16 transform -translate-x-1/2 w-[95vw] max-w-[900px] bg-white shadow-2xl border border-gray-200 rounded-2xl z-50 p-6 animate-dropdownFadeIn">
      <div className="dropdown-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[800px] mx-auto">
        {/* Personal Finance AI */}
        <div className="menu-section">
          <h3 className="section-header personal">PERSONAL FINANCE AI</h3>
          <div className="menu-items flex flex-col gap-1">
            {completeMenuStructure.personalFinanceAI.map(item => (
              <Link to={item.path} className="menu-item" key={item.name} onClick={onLinkClick}>
                <div className={`menu-item-icon ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content">
                  <div className="menu-item-title">
                    {item.name} {item.badge && <span className="new-badge">{item.badge}</span>}
                  </div>
                  <div className="menu-item-description">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {/* Audio Entertainment */}
        <div className="menu-section">
          <h3 className="section-header audio">AUDIO ENTERTAINMENT</h3>
          <div className="menu-items flex flex-col gap-1">
            {completeMenuStructure.audioEntertainment.map(item => (
              <Link to={item.path} className="menu-item" key={item.name} onClick={onLinkClick}>
                <div className={`menu-item-icon ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content">
                  <div className="menu-item-title">{item.name}</div>
                  <div className="menu-item-description">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {/* Business & Tax */}
        <div className="menu-section">
          <h3 className="section-header business">BUSINESS & TAX</h3>
          <div className="menu-items flex flex-col gap-1">
            {completeMenuStructure.businessTax.map(item => (
              <Link to={item.path} className="menu-item" key={item.name} onClick={onLinkClick}>
                <div className={`menu-item-icon ${item.iconClass}`}>{item.icon}</div>
                <div className="menu-item-content">
                  <div className="menu-item-title">{item.name}</div>
                  <div className="menu-item-description">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      {/* Bottom CTA Bar */}
      <div className="dropdown-cta mt-5 pt-4 border-t border-gray-200">
        <div className="cta-content flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="cta-title text-[14px] font-semibold text-gray-900 mb-1">Ready to revolutionize your finances?</h4>
            <p className="cta-subtitle text-[12px] text-gray-600">Try all features free - no credit card required</p>
          </div>
          <div className="cta-buttons flex gap-2 mt-3 md:mt-0">
            <Link to="/ai-demo" className="btn-secondary px-3 py-1.5 rounded-md border border-pink-500 text-pink-600 font-semibold hover:bg-pink-50 transition text-[12px]" onClick={onLinkClick}>Try Demo</Link>
            <Link to="/pricing" className="btn-primary px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:from-purple-600 hover:to-pink-600 transition text-[12px]" onClick={onLinkClick}>Start Free Trial</Link>
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
        .dropdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        @media (max-width: 1024px) {
          .dropdown-grid {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
        }
        @media (max-width: 768px) {
          .dropdown-menu {
            width: 100vw;
            max-width: 100vw;
            left: 0;
            transform: none;
            border-radius: 0;
            padding: 16px;
          }
          .dropdown-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .cta-content {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }
        .section-header {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid;
        }
        .section-header.personal {
          color: #8B5CF6;
          border-color: #8B5CF6;
        }
        .section-header.audio {
          color: #EC4899;
          border-color: #EC4899;
        }
        .section-header.business {
          color: #3B82F6;
          border-color: #3B82F6;
        }
        .menu-item {
          display: flex;
          align-items: flex-start;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.15s ease;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }
        .menu-item:hover {
          background-color: #f9fafb;
          transform: translateY(-1px);
        }
        .menu-item-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          margin-right: 10px;
          font-size: 16px;
          flex-shrink: 0;
        }
        .icon-import { background: linear-gradient(135deg, #ddd6fe, #e879f9); }
        .icon-assistant { background: linear-gradient(135deg, #fed7d7, #fbb6ce); }
        .icon-therapist { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
        .icon-goals { background: linear-gradient(135deg, #fef3c7, #fde68a); }
        .icon-predictions { background: linear-gradient(135deg, #dbeafe, #93c5fd); }
        .icon-podcast { background: linear-gradient(135deg, #f3e8ff, #a5b4fc); }
        .icon-spotify { background: linear-gradient(135deg, #f0fdf4, #bbf7d0); }
        .icon-wellness { background: linear-gradient(135deg, #fef9c3, #fde68a); }
        .icon-freelancer { background: linear-gradient(135deg, #f1f5f9, #cbd5e1); }
        .icon-business { background: linear-gradient(135deg, #e0e7ff, #a5b4fc); }
        .icon-automation { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); }
        .menu-item-content { flex: 1; min-width: 0; }
        .menu-item-title {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .menu-item-description {
          font-size: 11px;
          color: #6b7280;
          line-height: 1.3;
        }
        .new-badge {
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .dropdown-cta {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .cta-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .cta-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        .cta-subtitle {
          font-size: 12px;
          color: #6b7280;
        }
        .cta-buttons {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .btn-primary, .btn-secondary {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
        }
      `}</style>
    </div>
  );
};

export default FeaturesDropdown; 