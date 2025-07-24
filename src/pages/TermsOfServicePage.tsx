import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const TermsOfServicePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Terms of Service - XspensesAI</title>
        <meta name="description" content="XspensesAI Terms of Service. Review the legal terms and conditions for using our financial management platform." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Terms of Service</h1>
          <p className="text-purple-200 mb-2">Last Updated: December 15, 2024</p>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">Please read these terms carefully before using XspensesAI. By accessing or using our services, you agree to these terms.</p>
        </div>
      </section>
      {/* Terms Content */}
      <section className="py-20 bg-white">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold mb-2">1. Acceptance of Terms</h3>
              <p>By accessing or using XspensesAI, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use our services.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">2. Eligibility</h3>
              <p>You must be at least 18 years old and capable of entering into a binding agreement to use XspensesAI.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">3. Account Registration</h3>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">4. Use of Services</h3>
              <ul className="list-disc list-inside text-gray-600">
                <li>You may use XspensesAI only for lawful purposes and in accordance with these terms.</li>
                <li>You agree not to misuse, disrupt, or attempt to gain unauthorized access to our services or systems.</li>
                <li>We reserve the right to suspend or terminate your account for violations of these terms.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">5. Subscription & Billing</h3>
              <ul className="list-disc list-inside text-gray-600">
                <li>Some features require a paid subscription. You agree to pay all applicable fees and taxes.</li>
                <li>Subscriptions automatically renew unless cancelled before the end of the billing period.</li>
                <li>All payments are non-refundable except as required by law.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">6. Intellectual Property</h3>
              <p>All content, trademarks, and technology on XspensesAI are the property of XspensesAI Inc. or its licensors. You may not copy, modify, or distribute any part of our services without permission.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">7. Disclaimers</h3>
              <ul className="list-disc list-inside text-gray-600">
                <li>XspensesAI is provided "as is" without warranties of any kind.</li>
                <li>We do not guarantee the accuracy, completeness, or reliability of any information or advice provided.</li>
                <li>Financial decisions are your responsibility. Consult a professional for personalized advice.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">8. Limitation of Liability</h3>
              <p>To the fullest extent permitted by law, XspensesAI and its affiliates are not liable for any indirect, incidental, or consequential damages arising from your use of our services.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">9. Changes to Terms</h3>
              <p>We may update these terms from time to time. Continued use of XspensesAI after changes means you accept the new terms.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">10. Contact</h3>
              <p>If you have questions about these Terms of Service, contact us at <a href="mailto:legal@xspensesai.com" className="text-purple-600 underline">legal@xspensesai.com</a></p>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default TermsOfServicePage;
