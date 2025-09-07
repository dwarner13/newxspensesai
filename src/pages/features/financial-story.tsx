import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const FinancialStoryPage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Financial Story - XspensesAI</title>
        <meta name="description" content="Transform boring bank statements into Netflix-worthy financial narratives. Our AI podcasters turn your spending into engaging stories that actually make you want to check your finances." />
        <meta name="keywords" content="financial storytelling, AI podcast, money stories, financial entertainment, personal finance podcast, AI storyteller" />
      </Helmet>
      
      <div className="min-h-screen bg-[#0a0e27] text-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-[#0a0e27]/95 backdrop-blur-md border-b border-white/10 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-3 text-2xl font-bold">
                  👑 XspensesAI
                </div>
                <div className="hidden md:flex gap-8">
                  <a href="#" className="text-white/80 hover:text-[#667eea] transition-colors">Home</a>
                  <a href="#" className="text-white/80 hover:text-[#667eea] transition-colors">Features</a>
                  <a href="#" className="text-white/80 hover:text-[#667eea] transition-colors">Pricing</a>
                  <a href="#" className="text-white/80 hover:text-[#667eea] transition-colors">AI Employees</a>
                  <a href="#" className="text-white/80 hover:text-[#667eea] transition-colors">Reviews</a>
                  <a href="#" className="text-white/80 hover:text-[#667eea] transition-colors">Contact</a>
                </div>
              </div>
              <a 
                href="#" 
                className="bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-[#0a0e27] px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                Get Started
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col justify-center items-center px-5 pt-20 pb-20 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(102,126,234,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_50%,rgba(118,75,162,0.1)_0%,transparent_50%)]"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-6xl mx-auto relative z-10"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#667eea]/10 border border-[#667eea]/30 px-5 py-2.5 rounded-full mb-10 text-sm">
              🎭 Prime's Story Division
            </div>
            
            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              Your Money Has A<br />
              <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
                Story To Tell
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/70 max-w-4xl mx-auto mb-12 leading-relaxed">
              Transform boring bank statements into Netflix-worthy financial narratives. 
              Our AI podcasters turn your spending into engaging stories that actually 
              make you want to check your finances.
            </p>
            
            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-wrap gap-12 justify-center mb-12"
            >
              <div className="text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
                  🎙️ 12
                </div>
                <div className="text-white/60 text-sm">AI Storytellers</div>
              </div>
              <div className="text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
                  📖 Weekly
                </div>
                <div className="text-white/60 text-sm">Episode Releases</div>
              </div>
              <div className="text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
                  🎧 15 min
                </div>
                <div className="text-white/60 text-sm">Average Episode</div>
              </div>
            </motion.div>
            
            {/* CTA Button */}
            <motion.button 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-9 py-4 rounded-xl font-semibold text-lg hover:scale-105 transition-all shadow-[0_10px_30px_rgba(102,126,234,0.3)] hover:shadow-[0_15px_40px_rgba(102,126,234,0.4)]"
            >
              📖 Create My First Story
              <span className="bg-[#00ff88] text-[#0a0e27] px-2 py-1 rounded text-xs font-bold">
                FREE
              </span>
            </motion.button>
            
            {/* Security Badges */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap gap-6 justify-center mt-8 text-white/50 text-sm"
            >
              <span>🔒 Bank-level security</span>
              <span>📊 Your data stays private</span>
              <span>⚡ Setup in 2 minutes</span>
            </motion.div>
          </motion.div>
        </section>

        {/* Sample Episodes Section */}
        <section className="py-20 px-5 bg-[#0a0e27]">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Sample <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">Episodes</span>
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                Listen to how we transform financial data into compelling stories
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Episode 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#667eea]/20 text-[#667eea] px-2 py-1 rounded text-xs font-semibold">
                    EP. 03
                  </span>
                  <span className="text-white/50 text-sm">12 min</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#667eea] transition-colors">
                  The Mystery of the Missing Savings
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Spark and Wisdom investigate where your money went this month, uncovering surprising patterns in your late-night spending.
                </p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    ⚡
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🧠
                  </div>
                </div>
              </motion.div>

              {/* Episode 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#667eea]/20 text-[#667eea] px-2 py-1 rounded text-xs font-semibold">
                    EP. 02
                  </span>
                  <span className="text-white/50 text-sm">18 min</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#667eea] transition-colors">
                  The Great Coffee Shop Conspiracy
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Roast Master exposes your $247 monthly coffee addiction while Fortune finds the silver lining in your loyalty rewards.
                </p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🔥
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    💰
                  </div>
                </div>
              </motion.div>

              {/* Episode 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#667eea]/20 text-[#667eea] px-2 py-1 rounded text-xs font-semibold">
                    EP. 01
                  </span>
                  <span className="text-white/50 text-sm">15 min</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#667eea] transition-colors">
                  New Beginnings & Old Habits
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Your first financial story! Nova and Serenity explore your spending personality and create your money mission statement.
                </p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🌱
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🌙
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </WebsiteLayout>
  );
};

export default FinancialStoryPage;

