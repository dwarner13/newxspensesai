import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronDown } from 'lucide-react';
import FeaturesMegaMenu from '../nav/FeaturesMegaMenu';
import Logo from '../common/Logo';

export default function SimpleNavigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsFeaturesExpanded(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
        setIsFeaturesExpanded(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const navigationItems = [
    { name: 'Home', path: '/', hasDropdown: false },
    { name: 'Features', path: '/features', hasDropdown: true },
    { name: 'Pricing', path: '/pricing', hasDropdown: false },
    { name: 'AI Employees', path: '/ai-employees', hasDropdown: false },
    { name: 'Reviews', path: '/reviews', hasDropdown: false },
    { name: 'Contact', path: '/contact', hasDropdown: false }
  ];

  // Features mega menu sections for mobile
  const featuresSections = [
    {
      title: "FEATURED TOOLS",
      items: [
        { label: "Smart Import AI", to: "/features/smart-import-ai", tag: "NEW" },
        { label: "AI Financial Assistant", to: "/features/ai-assistant" },
        { label: "AI Financial Therapist", to: "/features/ai-therapist" },
        { label: "AI Goal Concierge", to: "/features/goal-concierge" },
        { label: "AI Crystal Ball Theater", to: "/features/spending-predictions" },
      ],
    },
    {
      title: "ENTERTAINMENT",
      items: [
        { label: "Personal Podcast", to: "/features/personal-podcast" },
        { label: "Financial Story", to: "/features/financial-story", tag: "NEW" },
        { label: "Financial Wellness Studio", to: "/features/wellness-studio" },
        { label: "Spotify Integration", to: "/features/spotify-integration", tag: "NEW" },
        { label: "Dashboard Player", to: "/dashboard/spotify-integration-new", tag: "BETA" },
      ],
    },
    {
      title: "BUSINESS",
      items: [
        { label: "Business Intelligence", to: "/features/business-expense-intelligence" },
        { label: "Freelancer Assistant", to: "/features/freelancer-tax" },
        { label: "Tax Optimization", to: "/features/tax-optimization" },
        { label: "Compliance & Audit", to: "/features/compliance-audit" },
      ],
    },
    {
      title: "TECHNICAL",
      items: [
        { label: "Receipt Scanner", to: "/features/receipt-scanner" },
        { label: "Document Upload", to: "/features/document-upload" },
        { label: "API & Webhooks", to: "/features/api-webhooks", tag: "BETA" },
        { label: "Security & Privacy", to: "/features/security-privacy" },
      ],
    },
  ];

  return (
    <header className="marketing-nav bg-black/80 backdrop-blur-md fixed top-0 left-0 right-0 z-[60] border-b border-white/10" style={{right: 'var(--scrollbar-width, 0px)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left Side */}
          <div className="flex items-center">
            <Logo size="md" linkTo="/" />
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center desktop-navigation">
            <div className="flex items-center space-x-8">
              {navigationItems.map((item) => (
                item.name === 'Features' ? (
                  <FeaturesMegaMenu key={item.name} />
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="text-gray-200 hover:text-cyan-400 py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-white/5 font-['Montserrat']"
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          </nav>

          {/* Right side - CTA Buttons and Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 desktop-cta-buttons">
              <Link
                to="/dashboard"
                className="text-gray-200 hover:text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-white/20 hover:border-white/30 hover:bg-white/5 font-['Montserrat']"
              >
                Dashboard
              </Link>
              
              <Link
                to="/signup"
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-cyan-500/25 transform hover:scale-105 font-['Montserrat']"
              >
                Get Started
              </Link>
            </div>
            
            {/* Mobile Hamburger Menu Button */}
            <button 
              className="md:hidden text-gray-300 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors border border-white/20 bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="md:hidden absolute left-0 right-0 top-20 bg-[#0b0f2a] border-b border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                item.name === 'Features' ? (
                  <div key={item.name} className="space-y-2">
                    <button
                      onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                      className="flex items-center justify-between w-full text-white/80 hover:text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-bold leading-tight tracking-tight"
                    >
                      <span>{item.name}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isFeaturesExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isFeaturesExpanded && (
                      <div className="ml-4 space-y-4 border-l border-white/10 pl-4">
                        {featuresSections.map((section) => (
                          <div key={section.title} className="space-y-2">
                            <h3 className="text-xs font-bold tracking-tight text-white drop-shadow-sm">
                              {section.title}
                            </h3>
                            <div className="space-y-1">
                              {section.items.map((feature) => (
                                <Link
                                  key={feature.label}
                                  to={feature.to}
                                  className="flex items-center justify-between block text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors font-bold leading-tight tracking-tight text-sm"
                                  onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setIsFeaturesExpanded(false);
                                  }}
                                >
                                  <span>{feature.label}</span>
                                  {feature.tag && (
                                    <span
                                      className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold
                                      ${feature.tag === "NEW"
                                          ? "bg-cyan-400/90 text-slate-900"
                                          : "bg-fuchsia-500/90 text-white"}`}
                                    >
                                      {feature.tag}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="block text-white/80 hover:text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-bold leading-tight tracking-tight"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </div>
            <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
              <Link
                to="/dashboard"
                className="block text-center text-white/80 hover:text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-bold leading-tight tracking-tight"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/signup"
                className="block text-center bg-cyan-500 hover:bg-cyan-600 text-white py-3 px-4 rounded-lg font-bold leading-tight tracking-tight transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
