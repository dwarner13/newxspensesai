import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Youtube, Mail, ArrowRight } from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSubscribed(true);
      setLoading(false);
    }, 1200);
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* Column 1: Subscribe & Trust */}
          <div className="flex-1">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">💰</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">XspensesAI</h3>
                <p className="text-xs text-gray-400">Financial Intelligence Platform</p>
              </div>
            </div>
            
            {/* Newsletter Signup */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white mb-3">Stay Updated</h4>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={subscribed}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-md text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                  disabled={subscribed || loading}
                >
                  {subscribed ? (
                    <>
                      <Mail size={14} />
                      Subscribed!
                    </>
                  ) : loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Subscribing...
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
              <p className="text-gray-400 text-xs mt-2">Join 10,000+ getting weekly AI financial tips</p>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Bank-level security</span>
              </div>
              <div className="text-gray-300">10,000+ users</div>
            </div>
          </div>

          {/* Column 2: Product Links */}
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/ai-employees" className="text-gray-300 hover:text-white transition-colors duration-200">
                  AI Employees
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-gray-300 hover:text-white transition-colors duration-200">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/api" className="text-gray-300 hover:text-white transition-colors duration-200">
                  API
                </Link>
              </li>
              <li>
                <Link to="/integrations" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company & Social */}
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm mb-6">
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors duration-200">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/press" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Press
                </Link>
              </li>
            </ul>
            
            {/* Social Links */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-3">Connect</h4>
              <div className="flex space-x-2">
                <a 
                  href="#" 
                  className="w-8 h-8 bg-gray-800 rounded-md flex items-center justify-center hover:bg-purple-600 transition-colors duration-200" 
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="w-8 h-8 bg-gray-800 rounded-md flex items-center justify-center hover:bg-purple-600 transition-colors duration-200" 
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="w-8 h-8 bg-gray-800 rounded-md flex items-center justify-center hover:bg-purple-600 transition-colors duration-200" 
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-gray-400 text-sm">
              © 2025 XspensesAI. All rights reserved.
            </div>
            
            {/* Legal Links */}
            <div className="flex items-center space-x-4 text-sm">
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-200">
                Terms
              </Link>
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200">
                Privacy
              </Link>
              <Link to="/cookies" className="text-gray-400 hover:text-white transition-colors duration-200">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
