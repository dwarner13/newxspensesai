import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const PrivacyPage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Privacy Policy - XspensesAI</title>
        <meta name="description" content="XspensesAI Privacy Policy. Learn how we protect your financial data with bank-level security and never sell your personal information." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Privacy Policy</h1>
          <p className="text-purple-200 mb-2">Last Updated: December 15, 2024</p>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">Your privacy is fundamental to our mission. We use bank-level security and never sell your data.</p>
        </div>
      </section>
      {/* Privacy at a Glance */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Privacy at a Glance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="font-semibold mb-1">Bank-Level Security</h4>
              <p className="text-gray-600">256-bit encryption and SOC 2 compliance</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🚫</div>
              <h4 className="font-semibold mb-1">Never Sold</h4>
              <p className="text-gray-600">We never sell your data to third parties</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">👤</div>
              <h4 className="font-semibold mb-1">You Control Your Data</h4>
              <p className="text-gray-600">Delete or export your data anytime</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold mb-1">Minimal Collection</h4>
              <p className="text-gray-600">We only collect what's needed for our service</p>
            </div>
          </div>
        </div>
      </section>
      {/* Legal Content */}
      <section className="py-20 bg-white">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold mb-2">Information We Collect</h3>
              <p className="mb-2">We collect information you provide directly to us, such as when you create an account, connect financial accounts, or contact us for support.</p>
              <h4 className="font-semibold mb-1">Account Information</h4>
              <ul className="list-disc list-inside text-gray-600 mb-2">
                <li>Name and email address</li>
                <li>Phone number (optional)</li>
                <li>Profile information you choose to provide</li>
              </ul>
              <h4 className="font-semibold mb-1">Financial Information</h4>
              <ul className="list-disc list-inside text-gray-600 mb-2">
                <li>Bank account and credit card transactions</li>
                <li>Account balances and history</li>
                <li>Financial goals and budgets you set</li>
              </ul>
              <h4 className="font-semibold mb-1">Usage Information</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>How you interact with our app and services</li>
                <li>AI conversation history</li>
                <li>Audio preferences and listening history</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">How We Use Your Information</h3>
              <p className="mb-2">We use your information to provide, maintain, and improve our services, including:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li>Categorizing and analyzing your expenses</li>
                <li>Providing personalized financial insights and recommendations</li>
                <li>Generating your personal financial podcasts</li>
                <li>Curating music and audio content</li>
                <li>Communicating with you about our services</li>
                <li>Protecting against fraud and abuse</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Information Sharing</h3>
              <p className="mb-2"><strong>We never sell your personal information.</strong> We may share your information only in these limited circumstances:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li><strong>Service Providers:</strong> With trusted third parties who help us operate our service (like cloud hosting providers)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly consent to sharing</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Data Security</h3>
              <p className="mb-2">We implement industry-leading security measures to protect your information:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li>256-bit TLS encryption for data in transit</li>
                <li>AES-256 encryption for data at rest</li>
                <li>SOC 2 Type II compliance</li>
                <li>Regular security audits and penetration testing</li>
                <li>Multi-factor authentication</li>
                <li>Zero-knowledge architecture where possible</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Your Rights and Choices</h3>
              <p className="mb-2">You have several rights regarding your personal information:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at <a href="mailto:privacy@xspensesai.com" className="text-purple-600 underline">privacy@xspensesai.com</a></p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Contact Us</h3>
              <p className="mb-2">If you have questions about this Privacy Policy, please contact us:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li>Email: <a href="mailto:privacy@xspensesai.com" className="text-purple-600 underline">privacy@xspensesai.com</a></li>
                <li>Mail: XspensesAI Inc., 123 Innovation Drive, San Francisco, CA 94107</li>
                <li>Phone: 1-800-XPENSES</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default PrivacyPage; 