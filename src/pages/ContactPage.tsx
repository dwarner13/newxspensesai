import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission (e.g., send to API or show success message)
    console.log('Contact form submitted:', formData);
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>Contact XspensesAI - Get in Touch</title>
        <meta name="description" content="Contact XspensesAI support team. Get help with your account, request demos, or ask questions about our AI-powered expense management platform." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Get in Touch</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">We're here to help with questions, support, or just to chat about the future of financial management</p>
        </div>
      </section>
      {/* Contact Content */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-12">
            {/* Contact Info */}
            <div className="flex-1 space-y-8">
              <h3 className="text-2xl font-bold mb-4">How Can We Help?</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">💬</div>
                  <div>
                    <h4 className="font-semibold">Live Chat Support</h4>
                    <p>Get instant help from our support team</p>
                    <span className="text-xs text-purple-600">Available 24/7 in the app</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">📧</div>
                  <div>
                    <h4 className="font-semibold">General Support</h4>
                    <p>support@xspensesai.com</p>
                    <span className="text-xs text-purple-600">Response within 2 hours</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🏢</div>
                  <div>
                    <h4 className="font-semibold">Enterprise Sales</h4>
                    <p>enterprise@xspensesai.com</p>
                    <span className="text-xs text-purple-600">Custom solutions for businesses</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">📰</div>
                  <div>
                    <h4 className="font-semibold">Press & Media</h4>
                    <p>press@xspensesai.com</p>
                    <span className="text-xs text-purple-600">Media inquiries and partnerships</span>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <h4 className="font-semibold mb-2">Follow Us</h4>
                <div className="flex gap-4">
                  <a href="#" className="flex items-center gap-1 text-purple-600 hover:underline"><span>🐦</span> Twitter</a>
                  <a href="#" className="flex items-center gap-1 text-purple-600 hover:underline"><span>💼</span> LinkedIn</a>
                  <a href="#" className="flex items-center gap-1 text-purple-600 hover:underline"><span>📘</span> Facebook</a>
                  <a href="#" className="flex items-center gap-1 text-purple-600 hover:underline"><span>📷</span> Instagram</a>
                </div>
              </div>
            </div>
            {/* Contact Form */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <h3 className="text-xl font-bold mb-2">Send us a Message</h3>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Company (Optional)"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                />
                <select
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.inquiryType}
                  onChange={e => setFormData({...formData, inquiryType: e.target.value})}
                >
                  <option value="general">General Question</option>
                  <option value="support">Technical Support</option>
                  <option value="sales">Sales Inquiry</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="press">Press/Media Inquiry</option>
                  <option value="feedback">Product Feedback</option>
                </select>
                <input
                  type="text"
                  placeholder="Subject *"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  required
                />
                <textarea
                  placeholder="How can we help you? *"
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  required
                ></textarea>
                <button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Send Message</button>
                <p className="text-xs text-gray-500">We typically respond within 2 hours during business hours</p>
              </form>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Quick Answers</h2>
          <p className="text-purple-700 text-center mb-10">Common questions we receive</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <h4 className="font-semibold mb-2">How secure is my financial data?</h4>
              <p>We use bank-level 256-bit encryption and are SOC 2 compliant. Your data is never sold to third parties.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <h4 className="font-semibold mb-2">Can I try XspensesAI for free?</h4>
              <p>Yes! We offer a 14-day free trial with no credit card required. Experience all features risk-free.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <h4 className="font-semibold mb-2">Do you support my bank?</h4>
              <p>We support over 10,000 financial institutions. If you don't see yours, contact us and we'll add it.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <h4 className="font-semibold mb-2">How does the AI personal podcast work?</h4>
              <p>Our AI analyzes your spending patterns and creates monthly podcast episodes about your financial journey.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p>Absolutely. Cancel anytime with no fees. Your data remains accessible during your billing period.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <h4 className="font-semibold mb-2">Do you offer business plans?</h4>
              <p>Yes! We have specialized plans for freelancers, small businesses, and enterprises. Contact our sales team.</p>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default ContactPage; 
