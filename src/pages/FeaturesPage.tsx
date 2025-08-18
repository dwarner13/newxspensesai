import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const featureSamples = [
  {
    title: 'Conversational AI',
    icon: <CheckCircle className="w-8 h-8 text-green-500 mb-2" />,
    sample: (
      <div>
        <div className="mb-2 font-semibold">Sample Chat:</div>
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <div className="mb-2"><span className="font-bold text-purple-700">You:</span> How much did I spend on dining this month?</div>
          <div><span className="font-bold text-green-600">AI:</span> You spent $312 on dining in July. Would you like a breakdown by restaurant or tips to save?</div>
        </div>
      </div>
    )
  },
  {
    title: 'Smart Categorization',
    icon: <CheckCircle className="w-8 h-8 text-green-500 mb-2" />,
    sample: (
      <div>
        <div className="mb-2 font-semibold">Sample Correction:</div>
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <div className="mb-2">AI auto-categorized: <span className="font-bold">Starbucks</span> as <span className="text-blue-600">Groceries</span></div>
          <div className="mb-2">You corrected it to <span className="text-pink-600">Dining Out</span>.</div>
          <div className="text-green-700 mt-2">AI: Got it! I’ll remember Starbucks is Dining Out for next time.</div>
        </div>
      </div>
    )
  },
  {
    title: 'Predictive Insights',
    icon: <CheckCircle className="w-8 h-8 text-green-500 mb-2" />,
    sample: (
      <div>
        <div className="mb-2 font-semibold">Sample Insight:</div>
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <div className="mb-2">AI: <span className="text-purple-700">You’re trending 15% over your entertainment budget this month.</span></div>
          <div className="mb-2">Would you like to set a spending alert or see which categories are driving the increase?</div>
        </div>
      </div>
    )
  }
];

const FeaturesPage = () => {
  const [openModal, setOpenModal] = useState<number | null>(null);

  return (
    <WebsiteLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 mb-12 rounded-3xl shadow-xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-8"
          >
            <span className="mr-2">🚀</span>
            <span>World's First FinTech Entertainment Platform</span>
          </motion.div>
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Revolutionary <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">Features</span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Experience the future of expense tracking with AI-powered insights, personalized podcasts, and curated music that makes financial planning enjoyable.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <a
              href="/ai-demo"
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 hover:shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              Try AI Demo
            </a>
            <a
              href="/pricing"
              className="border-2 border-cyan-400 text-cyan-400 px-8 py-4 rounded-lg font-semibold hover:bg-cyan-400 hover:text-white transition-all duration-300"
            >
              Calculate Your Time Savings
            </a>
          </motion.div>
        </section>
        {/* Why Choose Section */}
        <section className="py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">Why Choose XspensesAI?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4">⚡</span>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">10x Faster Processing</h3>
              <p className="text-gray-600">AI processes statements in seconds, not hours.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4">🎯</span>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Personalized Experience</h3>
              <p className="text-gray-600">AI learns your patterns and preferences for tailored insights.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4">🏆</span>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Proven Results</h3>
              <p className="text-gray-600">Users save an average of $1,200 annually with XspensesAI.</p>
            </div>
          </div>
        </section>
        {/* Testimonials Section */}
        <section className="py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">SJ</div>
              <p className="italic text-gray-700 mb-4">"The AI Assistant is incredible! It processes my statements while chatting with me and even suggests music. It's like having a financial advisor in my pocket!"</p>
              <div className="font-semibold text-gray-900">Sarah Johnson</div>
              <div className="text-sm text-gray-500">Small Business Owner</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">MC</div>
              <p className="italic text-gray-700 mb-4">"The personal podcast feature is genius! I get weekly episodes about my spending patterns with music recommendations. It makes financial management fun!"</p>
              <div className="font-semibold text-gray-900">Mike Chen</div>
              <div className="text-sm text-gray-500">Freelance Developer</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">ER</div>
              <p className="italic text-gray-700 mb-4">"The AI insights helped me save $2,400 last quarter. The conversational interface makes it feel like I'm talking to a friend about my finances."</p>
              <div className="font-semibold text-gray-900">Emily Rodriguez</div>
              <div className="text-sm text-gray-500">Marketing Consultant</div>
            </div>
          </div>
        </section>
        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mt-16 text-white text-center max-w-4xl mx-auto shadow-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to End Manual Expense Work Forever?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Experience automation magic that reads ANY financial document in 2.3 seconds with 99.7% accuracy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                End Manual Work Forever
              </a>
              <a
                href="/pricing"
                className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200"
              >
                Calculate Your Time Savings
              </a>
            </div>
            <p className="text-purple-100 text-sm">
              ✓ No credit card required • ✓ Process 10 documents free • ✓ See results in 2.3 seconds
            </p>
          </motion.div>
        </section>
        {/* Expanded Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 space-y-24">
            {/* AI-Powered Intelligence */}
            <div>
              <h2 className="text-3xl font-bold mb-8 text-purple-700 text-center">AI-Powered Intelligence</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {featureSamples.map((feature, idx) => (
                  <button
                    key={feature.title}
                    className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 text-left focus:outline-none focus:ring-2 focus:ring-purple-400"
                    onClick={() => setOpenModal(idx)}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {feature.icon}
                      <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {idx === 0 && 'Chat naturally about your finances and get instant, personalized advice'}
                      {idx === 1 && 'AI automatically categorizes expenses and learns from your corrections'}
                      {idx === 2 && 'Get forecasts about future spending and budget recommendations'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {/* Audio Entertainment */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl py-12 px-4">
              <h2 className="text-3xl font-bold mb-8 text-pink-600 text-center">Audio Entertainment</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🎧</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Personalized Podcasts</h3>
                  <p className="text-gray-600">AI generates monthly podcast episodes about YOUR financial journey, celebrating wins and providing motivation.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🎶</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Spotify Integration</h3>
                  <p className="text-gray-600">Control your music directly in the app while managing expenses. Focus music for budgeting, celebration playlists for goals achieved.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🎼</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Context-Aware Music</h3>
                  <p className="text-gray-600">Smart music curation based on your current financial tasks and emotional state.</p>
                </div>
              </div>
            </div>
            {/* Smart Analytics */}
            <div>
              <h2 className="text-3xl font-bold mb-8 text-blue-700 text-center">Smart Analytics</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">⭐</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">XspensesScore</h3>
                  <p className="text-gray-600">Track your financial health with our proprietary scoring system that gamifies financial improvement.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">📋</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Visual Reports</h3>
                  <p className="text-gray-600">Beautiful charts and graphs that make your financial data come alive and easy to understand.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🎯</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Goal Tracking</h3>
                  <p className="text-gray-600">Set and achieve financial goals with AI-powered guidance and progress celebrations.</p>
                </div>
              </div>
            </div>
            {/* Security & Privacy */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl py-12 px-4">
              <h2 className="text-3xl font-bold mb-8 text-green-700 text-center">Security & Privacy</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🔒</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Bank-Grade Security</h3>
                  <p className="text-gray-600">Your data is protected with bank-level encryption and privacy standards. We never sell your data.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🛡️</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">SOC 2 Compliant</h3>
                  <p className="text-gray-600">XspensesAI is SOC 2 compliant, ensuring your financial information is always safe and secure.</p>
                </div>
              </div>
            </div>
            {/* Integrations */}
            <div>
              <h2 className="text-3xl font-bold mb-8 text-indigo-700 text-center">Integrations</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">🔗</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Bank Connections</h3>
                  <p className="text-gray-600">Connect all your bank accounts and credit cards for seamless, automatic transaction import.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
                  <span className="text-4xl mb-4">⚙️</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">API & Export</h3>
                  <p className="text-gray-600">Export your data or connect with other tools using our robust API and CSV export options.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* How It Works Section */}
        <section className="py-20 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4">📤</span>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">1. Upload or Connect</h3>
              <p className="text-gray-600">Upload your bank statements or connect your accounts securely in seconds.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4">🤖</span>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">2. Let AI Do the Work</h3>
              <p className="text-gray-600">Our AI categorizes, analyzes, and finds insights instantly—no manual work required.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4">🎉</span>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">3. Get Insights & Celebrate</h3>
              <p className="text-gray-600">See your progress, get tips, and celebrate your financial wins with podcasts and music.</p>
            </div>
          </div>
        </section>
        {/* Did You Know Callout */}
        <section className="py-12 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-2xl font-bold mb-2 text-purple-700">Did you know?</h3>
            <p className="text-lg text-purple-900">XspensesAI users save an average of 8 hours per month and $1,200 per year—just by letting AI handle the busywork!</p>
          </div>
        </section>
        {/* Modal Popup */}
        <AnimatePresence>
          {openModal !== null && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <button
                  className="absolute top-4 right-4 text-gray-400 hover:text-purple-600 text-2xl font-bold"
                  onClick={() => setOpenModal(null)}
                  aria-label="Close"
                >
                  ×
                </button>
                <div className="flex flex-col items-center mb-4">
                  {featureSamples[openModal].icon}
                  <h3 className="text-2xl font-bold mb-2 text-gray-900">{featureSamples[openModal].title}</h3>
                </div>
                <div>{featureSamples[openModal].sample}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WebsiteLayout>
  );
};

export default FeaturesPage; 
