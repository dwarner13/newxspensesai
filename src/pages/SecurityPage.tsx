import React from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const SecurityPage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Security - XspensesAI</title>
        <meta name="description" content="Learn how XspensesAI protects your financial data with industry-leading security, encryption, and compliance certifications." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Security at XspensesAI</h1>
          <p className="text-purple-200 mb-2">Last Updated: December 15, 2024</p>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">Your trust is our top priority. We use industry-leading security and compliance to protect your financial data.</p>
        </div>
      </section>
      {/* Security Measures */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Our Security Measures</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="font-semibold mb-1">Bank-Level Encryption</h4>
              <p className="text-gray-600">256-bit TLS encryption for data in transit and AES-256 encryption for data at rest.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <h4 className="font-semibold mb-1">Zero-Knowledge Architecture</h4>
              <p className="text-gray-600">We design systems so that only you can access your sensitive data—never our staff.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🔑</div>
              <h4 className="font-semibold mb-1">Multi-Factor Authentication</h4>
              <p className="text-gray-600">Protect your account with an extra layer of security at login and for sensitive actions.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🧑‍💻</div>
              <h4 className="font-semibold mb-1">Regular Security Audits</h4>
              <p className="text-gray-600">We conduct regular third-party security audits and penetration testing to identify and fix vulnerabilities.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🧪</div>
              <h4 className="font-semibold mb-1">Continuous Monitoring</h4>
              <p className="text-gray-600">Our systems are monitored 24/7 for suspicious activity and potential threats.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="text-3xl mb-2">🗄️</div>
              <h4 className="font-semibold mb-1">Data Minimization</h4>
              <p className="text-gray-600">We only collect and store the minimum data necessary to provide our services.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Certifications & Compliance */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Certifications & Compliance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">✅</div>
              <h4 className="font-semibold mb-1">SOC 2 Type II</h4>
              <p className="text-gray-600">We are SOC 2 Type II compliant, meeting rigorous standards for security, availability, and confidentiality.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🇪🇺</div>
              <h4 className="font-semibold mb-1">GDPR</h4>
              <p className="text-gray-600">We comply with the General Data Protection Regulation (GDPR) for our European users.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🇺🇸</div>
              <h4 className="font-semibold mb-1">CCPA</h4>
              <p className="text-gray-600">We comply with the California Consumer Privacy Act (CCPA) for our US users.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🔍</div>
              <h4 className="font-semibold mb-1">Regular Penetration Testing</h4>
              <p className="text-gray-600">We engage independent security firms to test our systems for vulnerabilities.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">📜</div>
              <h4 className="font-semibold mb-1">Data Processing Agreements</h4>
              <p className="text-gray-600">We offer DPAs to enterprise customers and partners to ensure compliance and transparency.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🛡️</div>
              <h4 className="font-semibold mb-1">Privacy by Design</h4>
              <p className="text-gray-600">Security and privacy are built into every layer of our product and engineering process.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Contact Security Team */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Contact Our Security Team</h2>
          <p className="mb-4 text-gray-700">If you have questions or concerns about security, or wish to report a vulnerability, please contact us:</p>
          <a href="mailto:security@xspensesai.com" className="text-purple-600 underline text-lg font-semibold">security@xspensesai.com</a>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default SecurityPage; 
