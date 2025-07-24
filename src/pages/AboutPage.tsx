import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const AboutPage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>About XspensesAI - The Future of Financial Management</title>
        <meta name="description" content="Learn about XspensesAI's mission to revolutionize personal finance through AI and audio entertainment. Meet our team and discover our story." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Revolutionizing Financial Management</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">We're building the world's first FinTech Entertainment Platform that makes managing money enjoyable, intelligent, and deeply personal.</p>
        </div>
      </section>
      {/* Company Story */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">Our Story</h2>
            <p className="mb-4">XspensesAI was born from a simple frustration: why does managing money have to be so boring and stressful? Traditional expense apps feel like work, not progress.</p>
            <p className="mb-4">We envisioned a different future - one where artificial intelligence doesn't just categorize your expenses, but truly understands your financial journey and provides emotional support along the way.</p>
            <p>By combining cutting-edge AI with personalized audio entertainment, we've created something entirely new: a financial management platform that users actually love using.</p>
          </div>
          <div className="flex-1 flex justify-center">
            <img src="/api/placeholder/500/400" alt="XspensesAI Team" className="rounded-2xl shadow-xl w-full max-w-md object-cover" />
          </div>
        </div>
      </section>
      {/* Mission & Values */}
      <section className="py-20 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Mission & Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-2">Human-Centered AI</h3>
              <p>Technology should serve people, not the other way around. Our AI provides emotional support, not just data analysis.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🎵</div>
              <h3 className="font-semibold mb-2">Make Finance Fun</h3>
              <p>Financial management doesn't have to be a chore. We believe in making money management an enjoyable part of your day.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="font-semibold mb-2">Privacy First</h3>
              <p>Your financial data is deeply personal. We use bank-level security and never sell your information.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 text-center shadow">
              <div className="text-3xl mb-2">🌟</div>
              <h3 className="font-semibold mb-2">Continuous Innovation</h3>
              <p>We're constantly pushing the boundaries of what's possible in financial technology.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Team Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-center">Meet Our Team</h2>
          <p className="text-purple-700 text-center mb-10">Passionate experts in AI, finance, and user experience</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <img src="/api/placeholder/200/200" alt="Sarah Johnson" className="rounded-full w-24 h-24 mb-4 object-cover" />
              <h4 className="font-semibold text-lg">Sarah Johnson</h4>
              <p className="text-purple-500 text-sm mb-1">CEO & Co-Founder</p>
              <p className="text-gray-600 text-sm mb-2 text-center">Former fintech executive with 15 years experience building consumer financial products at Scale AI and Robinhood.</p>
              <div className="flex gap-2">
                <a href="#" aria-label="LinkedIn">💼</a>
                <a href="#" aria-label="Twitter">🐦</a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <img src="/api/placeholder/200/200" alt="Mike Chen" className="rounded-full w-24 h-24 mb-4 object-cover" />
              <h4 className="font-semibold text-lg">Mike Chen</h4>
              <p className="text-purple-500 text-sm mb-1">CTO & Co-Founder</p>
              <p className="text-gray-600 text-sm mb-2 text-center">AI researcher and former Google Brain engineer. PhD in Machine Learning from Stanford University.</p>
              <div className="flex gap-2">
                <a href="#" aria-label="LinkedIn">💼</a>
                <a href="#" aria-label="GitHub">💻</a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <img src="/api/placeholder/200/200" alt="Emily Rodriguez" className="rounded-full w-24 h-24 mb-4 object-cover" />
              <h4 className="font-semibold text-lg">Emily Rodriguez</h4>
              <p className="text-purple-500 text-sm mb-1">Head of AI & Personalization</p>
              <p className="text-gray-600 text-sm mb-2 text-center">Former Spotify algorithm engineer who built the recommendation systems for 400M+ users.</p>
              <div className="flex gap-2">
                <a href="#" aria-label="LinkedIn">💼</a>
                <a href="#" aria-label="Twitter">🐦</a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <img src="/api/placeholder/200/200" alt="David Kim" className="rounded-full w-24 h-24 mb-4 object-cover" />
              <h4 className="font-semibold text-lg">David Kim</h4>
              <p className="text-purple-500 text-sm mb-1">Head of Product</p>
              <p className="text-gray-600 text-sm mb-2 text-center">Product design veteran from Apple and Airbnb. Expert in creating delightful user experiences.</p>
              <div className="flex gap-2">
                <a href="#" aria-label="LinkedIn">💼</a>
                <a href="#" aria-label="Dribbble">🎨</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Company Stats */}
      <section className="py-20 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <span className="text-3xl font-bold text-purple-700">50,000+</span>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <span className="text-3xl font-bold text-purple-700">$12M+</span>
              <div className="text-gray-600">Money Saved by Users</div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <span className="text-3xl font-bold text-purple-700">150,000+</span>
              <div className="text-gray-600">Personal Podcasts Generated</div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6">
              <span className="text-3xl font-bold text-purple-700">4.9/5</span>
              <div className="text-gray-600">App Store Rating</div>
            </div>
          </div>
        </div>
      </section>
      {/* Investors & Awards */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Backed by Leading Investors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center mb-8">
            <div className="flex justify-center"><img src="/api/placeholder/150/80" alt="Andreessen Horowitz" className="rounded-lg" /></div>
            <div className="flex justify-center"><img src="/api/placeholder/150/80" alt="Sequoia Capital" className="rounded-lg" /></div>
            <div className="flex justify-center"><img src="/api/placeholder/150/80" alt="Y Combinator" className="rounded-lg" /></div>
            <div className="flex justify-center"><img src="/api/placeholder/150/80" alt="Kleiner Perkins" className="rounded-lg" /></div>
          </div>
          <h3 className="text-2xl font-semibold text-center mb-4">Recognition & Awards</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white rounded-xl px-6 py-3 shadow text-lg">🏆 TechCrunch Disrupt Winner 2024</div>
            <div className="bg-white rounded-xl px-6 py-3 shadow text-lg">⭐ Apple App Store App of the Year Finalist</div>
            <div className="bg-white rounded-xl px-6 py-3 shadow text-lg">🚀 Fast Company Most Innovative Companies</div>
            <div className="bg-white rounded-xl px-6 py-3 shadow text-lg">💡 Product Hunt #1 Product of the Day</div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default AboutPage; 