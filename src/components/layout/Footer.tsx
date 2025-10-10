import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">👑</span>
              <span className="text-xl font-bold text-white">XspensesAI</span>
            </div>
            <p className="text-sm text-gray-400">
              AI-powered financial management with 30+ specialized employees
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/" className="text-sm hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/prime-lab" className="text-sm hover:text-white transition-colors">
                  Prime AI
                </Link>
              </li>
            </ul>
          </div>

          {/* AI Employees */}
          <div>
            <h3 className="text-white font-semibold mb-4">AI Team</h3>
            <ul className="space-y-2">
              <li className="text-sm">👑 Prime - CEO</li>
              <li className="text-sm">📄 Byte - Documents</li>
              <li className="text-sm">🏷️ Tag - Categories</li>
              <li className="text-sm">💎 Crystal - Analytics</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-sm hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} XspensesAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
