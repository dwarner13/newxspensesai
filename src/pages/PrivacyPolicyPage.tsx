import { Shield, ArrowLeft, Lock, Eye, Database, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl  px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="mb-8"
        >
          <Link 
            to="/"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center space-x-3 mb-4">
            <Lock size={32} className="text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          
          <div className="text-sm text-gray-500 space-x-4">
            <span><strong>Effective Date:</strong> June 10, 2025</span>
            <span><strong>Last Updated:</strong> June 10, 2025</span>
          </div>
        </div>

        {/* Content */}
        <div
          className="bg-white rounded-xl shadow-sm p-8 space-y-8"
        >
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed">
              XspensesAI ("we", "our", or "us") respects your privacy and is committed to protecting it through this policy. This policy describes the types of information we may collect and how we use it.
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database size={24} className="mr-3 text-primary-600" />
                1. Information We Collect
              </h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Email address and login credentials
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Uploaded documents (e.g. CSVs, PDFs)
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Financial transaction data for categorization
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Analytics and usage information
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Eye size={24} className="mr-3 text-primary-600" />
                2. How We Use Your Data
              </h2>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed mb-3">
                  We use your data to:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Provide and improve the service</li>
                  <li>• Generate AI-powered reports</li>
                  <li>• Communicate updates and support</li>
                  <li>• Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield size={24} className="mr-3 text-primary-600" />
                3. Data Security
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We use Supabase for secure storage and Stripe for secure payment processing. Your data is encrypted in transit and at rest.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed">
                We do not sell your personal data. We may share data with service providers (e.g. Stripe, Supabase) only as needed to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain data as long as your account is active. You may delete your account or request full data deletion at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">
                  You can access, correct, or delete your personal data by emailing{' '}
                  <a href="mailto:support@xspensesai.com" className="text-primary-600 hover:text-primary-700 underline font-medium">
                    support@xspensesai.com
                  </a>.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Updates</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this policy from time to time. Updates will be posted here with a new effective date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail size={24} className="mr-3 text-primary-600" />
                8. Contact Us
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Mail size={16} className="mr-2 text-gray-500" />
                    <a href="mailto:support@xspensesai.com" className="text-primary-600 hover:text-primary-700 underline">
                      support@xspensesai.com
                    </a>
                  </div>
                  <div className="flex items-center">
                    <Shield size={16} className="mr-2 text-gray-500" />
                    <span className="text-gray-600">XspensesAI Privacy Team</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <Link to="/terms" className="hover:text-gray-700 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <a href="mailto:support@xspensesai.com" className="hover:text-gray-700 transition-colors">
              Contact Support
            </a>
            <span>•</span>
            <Link to="/" className="hover:text-gray-700 transition-colors">
              Back to App
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
