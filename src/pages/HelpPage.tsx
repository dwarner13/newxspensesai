import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const HelpPage = () => {
  const [activeTab, setActiveTab] = useState('faq');

  const faqs = [
    {
      question: 'How does the AI Financial Assistant work?',
      answer: 'Our AI analyzes your spending patterns and provides personalized insights and recommendations through natural conversation. It learns from your behavior to give you increasingly accurate financial advice over time.'
    },
    {
      question: 'Can I connect my bank account?',
      answer: 'Yes! We support connections to over 10,000 banks and credit unions through secure, encrypted connections. Your banking credentials are never stored on our servers.'
    },
    {
      question: 'How are personal podcasts generated?',
      answer: 'Our AI creates custom podcast episodes about your financial journey using your spending data and goals. Each episode is unique to your financial situation and includes music recommendations.'
    },
    {
      question: 'Is my financial data secure?',
      answer: 'Absolutely. We use bank-level encryption and security protocols. Your data is protected with enterprise-grade security, and we never share your information with third parties.'
    },
    {
      question: 'What if I need to cancel my subscription?',
      answer: 'You can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees. Your data will be available for 30 days after cancellation.'
    },
    {
      question: 'How accurate is the AI categorization?',
      answer: 'Our AI achieves 95%+ accuracy in expense categorization. It learns from your corrections to improve over time, and you can always manually adjust categories if needed.'
    }
  ];

  const guides = [
    {
      title: 'Getting Started',
      description: 'Learn how to set up your account and connect your first bank',
      duration: '5 min read',
      category: 'Basics'
    },
    {
      title: 'Using the AI Assistant',
      description: 'Discover how to chat with AI and get personalized financial advice',
      duration: '8 min read',
      category: 'AI Features'
    },
    {
      title: 'Audio Features Setup',
      description: 'Set up Spotify integration and enjoy your personal podcasts',
      duration: '6 min read',
      category: 'Entertainment'
    },
    {
      title: 'Goal Setting & Tracking',
      description: 'Create and monitor your financial goals with AI guidance',
      duration: '7 min read',
      category: 'Goals'
    },
    {
      title: 'Data Export & Backup',
      description: 'Export your financial data and create backups',
      duration: '4 min read',
      category: 'Data'
    },
    {
      title: 'Troubleshooting',
      description: 'Common issues and how to resolve them',
      duration: '10 min read',
      category: 'Support'
    }
  ];

  const supportOptions = [
    {
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      action: 'Start Chat',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Email Support',
      description: 'Send us a detailed message',
      action: 'Send Email',
      color: 'from-blue-500 to-purple-500'
    },
    {
      title: 'Video Call',
      description: 'Schedule a one-on-one session',
      action: 'Schedule Call',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <WebsiteLayout>
      <Helmet>
        <title>Help Center - XspensesAI</title>
        <meta name="description" content="Get help, tutorials, and support for XspensesAI. Browse FAQs, user guides, and contact our support team." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Help Center</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">Find answers, tutorials, and support for XspensesAI. We're here to help you succeed on your financial journey.</p>
        </div>
      </section>
      {/* Tabs */}
      <section className="py-12 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'faq' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab('guides')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'guides' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
            >
              Tutorials & Guides
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'support' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
            >
              Contact Support
            </button>
          </div>
          {/* Tab Content */}
          {activeTab === 'faq' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-100">
                    <button
                      onClick={() => setActiveTab(`faq${idx}`)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
                    >
                      <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                      <span className="text-purple-500">{activeTab === `faq${idx}` ? '-' : '+'}</span>
                    </button>
                    {activeTab === `faq${idx}` && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'guides' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center">User Guides & Tutorials</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {guides.map((guide, idx) => (
                  <div key={guide.title} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white">
                        <span className="text-lg font-bold">{guide.category[0]}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                          {guide.category}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{guide.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{guide.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{guide.duration}</span>
                      <button className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
                        Read Guide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'support' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center">Contact Support</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {supportOptions.map((option, idx) => (
                  <div key={option.title} className={`bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center`}>
                    <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4 text-2xl`}>💬</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{option.title}</h3>
                    <p className="text-gray-600 mb-4">{option.description}</p>
                    <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300">
                      {option.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default HelpPage; 
