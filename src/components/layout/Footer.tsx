import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Youtube } from 'lucide-react';

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
    <footer className="footer bg-gradient-to-br from-gray-900 to-gray-950 text-white pt-12 pb-0">
      <div className="footer-content max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 px-4">
        {/* Brand & Newsletter */}
        <div className="footer-brand flex flex-col items-start md:items-start">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
            <span className="text-2xl font-bold">XspensesAI</span>
          </div>
          <p className="text-gray-300 mb-8 text-lg">The future of financial management powered by AI + Audio</p>
          <div className="newsletter-signup w-full max-w-xs">
            <h3 className="text-lg font-semibold mb-3">Stay Updated</h3>
            <form className="flex gap-2 mb-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={subscribed}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-60"
                disabled={subscribed || loading}
              >
                {subscribed ? 'Subscribed!' : loading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            <p className="text-gray-400 text-sm">Join 10,000+ getting weekly AI financial tips</p>
          </div>
          <div className="flex items-center space-x-6 mt-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Bank-level security</span>
            </div>
            <div className="text-gray-300 text-sm">10,000+ users</div>
          </div>
        </div>
        {/* Navigation */}
        <div className="footer-links flex flex-col items-start md:items-start">
          <div className="space-y-8 w-full">
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <div className="space-y-3">
                <Link to="/pricing" className="block text-gray-300 hover:text-white transition-colors">Pricing</Link>
                <Link to="/ai-demo" className="block text-gray-300 hover:text-white transition-colors">AI Demo</Link>
                <Link to="/features" className="block text-gray-300 hover:text-white transition-colors">Features</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <div className="space-y-3">
                <Link to="/about" className="block text-gray-300 hover:text-white transition-colors">About</Link>
                <Link to="/contact" className="block text-gray-300 hover:text-white transition-colors">Contact</Link>
                <Link to="/careers" className="block text-gray-300 hover:text-white transition-colors">Careers</Link>
              </div>
            </div>
          </div>
        </div>
        {/* Connect & Social */}
        <div className="footer-connect flex flex-col items-start md:items-start w-full">
          <h4 className="font-semibold text-white mb-6">Connect</h4>
          <div className="flex space-x-4 mb-8">
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors" aria-label="LinkedIn">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors" aria-label="YouTube">
              <Youtube className="w-5 h-5" />
            </a>
          </div>
          <div className="space-y-3 w-full">
            <Link to="/pricing" className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-center py-2 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-colors">Start Free Trial</Link>
            <Link to="/ai-demo" className="block w-full border border-gray-600 text-center py-2 px-4 rounded-lg font-medium hover:border-purple-500 hover:text-purple-400 transition-colors">Try Demo</Link>
          </div>
        </div>
      </div>
      {/* Bottom Bar */}
      <div className="footer-bottom border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
        <p className="text-gray-400 text-sm">© 2025 XspensesAI. All rights reserved.</p>
        <div className="flex space-x-6">
          <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy</Link>
          <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">Terms</Link>
        </div>
      </div>
      <style>{`
        .footer {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          padding: 48px 24px 24px;
          color: white;
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .footer-content {
            grid-template-columns: 1fr;
            gap: 32px;
            text-align: center;
          }
          .footer-brand, .footer-links, .footer-connect {
            align-items: center !important;
          }
          .newsletter-signup {
            max-width: 100%;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
