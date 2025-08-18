import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const NewHomepageHero = () => (
  <section className="homepage-hero bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-24">
    <div className="container max-w-7xl mx-auto px-4 text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-sm mb-8 font-semibold shadow border border-white/10">
        <span className="mr-2 text-lg">🤖</span>
        <span>AI Automation That Ends Manual Work Forever</span>
      </div>
      
      {/* Hero Headline */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight max-w-5xl mx-auto">
        <span className="gradient-text-hero block mb-3">End Manual Expense Work Forever</span>
        <span className="gradient-text block text-2xl md:text-3xl lg:text-4xl">Smart AI Does Everything Automatically</span>
      </h1>
      
      {/* Hero Subtitle */}
      <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-4xl mx-auto leading-relaxed">
        Revolutionary AI reads ANY bank statement, receipt, or financial document in 2.3 seconds with 99.7% accuracy. Never manually categorize expenses again. PLUS: The only platform that turns finance into addictive entertainment.
      </p>
      
      {/* Unique Features Preview */}
      <div className="unique-features-preview grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-lg text-gray-200 justify-center md:justify-start">
          <span className="text-2xl">🤖</span> 
          <span>99.7% AI accuracy (better than humans)</span>
        </div>
        <div className="flex items-center gap-3 text-lg text-gray-200 justify-center md:justify-start">
          <span className="text-2xl">⚡</span> 
          <span>2.3s processing speed (instant results)</span>
        </div>
        <div className="flex items-center gap-3 text-lg text-gray-200 justify-center md:justify-start">
          <span className="text-2xl">🌍</span> 
          <span>Works with 500+ banks worldwide</span>
        </div>
        <div className="flex items-center gap-3 text-lg text-gray-200 justify-center md:justify-start">
          <span className="text-2xl">🧠</span> 
          <span>AI learns and never asks twice</span>
        </div>
        <div className="flex items-center gap-3 text-lg text-gray-200 justify-center md:justify-start">
          <span className="text-2xl">🎧</span> 
          <span>Personal podcasts about YOUR money</span>
        </div>
        <div className="flex items-center gap-3 text-lg text-gray-200 justify-center md:justify-start">
          <span className="text-2xl">🔒</span> 
          <span>Zero data storage (ultimate privacy)</span>
        </div>
      </div>
      
      {/* Hero CTAs */}
      <div className="hero-cta flex flex-col sm:flex-row gap-4 mb-12 justify-center">
        <button className="btn-primary-large bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-xl shadow-lg hover:scale-105 transition-all duration-300 hover:shadow-cyan-500/25">
          End Manual Work Forever
          <span className="block text-xs font-normal mt-1">✓ No credit card required • ✓ Process 10 documents free • ✓ See results in 2.3 seconds</span>
          </button>
        <button className="btn-secondary flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all duration-300">
            <span className="play-icon text-2xl">▶️</span>
          Watch AI Process 50 Receipts in 30 Seconds
          </button>
        </div>
      
      {/* Trust Indicators */}
      <div className="trust-indicators flex flex-wrap gap-6 text-sm text-gray-300 font-medium mb-12 justify-center">
        <span className="flex items-center gap-2">💳 Bank-level security</span>
        <span className="flex items-center gap-2">⭐ 4.9/5 rating</span>
        <span className="flex items-center gap-2">👥 50,000+ automated users</span>
        <span className="flex items-center gap-2">🔒 SOC 2 compliant</span>
      </div>
      
      {/* Time Savings Calculator */}
      <div className="time-savings-calculator bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 max-w-4xl mx-auto">
        <h3 className="text-xl font-bold text-white mb-6">Your Time Savings Calculator</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-white/10 rounded-lg p-4 border border-white/5">
            <div className="text-3xl font-bold text-red-400">8 hours</div>
            <div className="text-sm text-gray-300">Manual work/month</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 border border-white/5">
            <div className="text-3xl font-bold text-green-400">5 minutes</div>
            <div className="text-sm text-gray-300">Smart Import AI/month</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 border border-white/5">
            <div className="text-3xl font-bold text-yellow-400">94 hours</div>
            <div className="text-sm text-gray-300">Annual time saved</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 border border-white/5">
            <div className="text-3xl font-bold text-cyan-400">$4,700</div>
            <div className="text-sm text-gray-300">Value at $50/hour</div>
          </div>
        </div>
      </div>
      
      {/* Professional Smart Import AI Showcase */}
      <div className="mt-16 flex justify-center">
        <div className="w-full max-w-6xl">
          {/* Main Showcase Card */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-8 border-b border-white/10">
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* Modern Abstract Icon */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-100"></div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-white mb-2">Smart Import AI</h3>
                  <p className="text-lg text-cyan-300 font-medium">Revolutionary Financial Automation</p>
                </div>
              </div>
              
              {/* Key Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">99.7%</div>
                  <div className="text-sm text-gray-300">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">2.3s</div>
                  <div className="text-sm text-gray-300">Processing Speed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">500+</div>
                  <div className="text-sm text-gray-300">Banks Supported</div>
                </div>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left: Value Proposition */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-3">End Manual Expense Work Forever</h4>
                    <p className="text-gray-300 leading-relaxed">
                      Revolutionary AI that reads ANY financial document with superhuman accuracy. 
                      No more manual categorization, no more missed deductions, no more tax season stress.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>Process 50+ documents simultaneously</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>Learn your business patterns automatically</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>Find thousands in missed deductions</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-cyan-500/25 transform hover:scale-105">
                      See AI in Action
                    </button>
                  </div>
                </div>
                
                {/* Right: Social Proof & Stats */}
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-cyan-400 mb-1">50,000+</div>
                      <div className="text-sm text-gray-300">Enterprise Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">2.8M+</div>
                      <div className="text-sm text-gray-300">Documents Processed</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-cyan-300">Live Processing</span>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white mb-1">847 transactions</div>
                      <div className="text-sm text-gray-300">processed in 12 seconds</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SmartImportAIDemo = () => (
  <section className="smart-import-demo py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="gradient-text text-3xl md:text-4xl font-extrabold mb-2">Smart Import AI in Action</h2>
        <p className="section-subtitle text-lg text-gray-300">Watch revolutionary AI read ANY financial document in seconds</p>
      </div>
      
      {/* 3-Step Process */}
      <div className="demo-process grid md:grid-cols-3 gap-8 mb-16">
        <div className="step-card bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <div className="step-number bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
          <h3 className="text-xl font-bold mb-3 text-white">Upload Any Document</h3>
          <p className="text-gray-300 mb-4">PDFs, CSVs, receipts, emails, bank statements - AI reads it all</p>
          <div className="document-examples flex flex-wrap gap-2 justify-center">
            <span className="bg-cyan-100/20 text-cyan-300 px-3 py-1 rounded-full text-sm border border-cyan-200/20">Chase Statement</span>
            <span className="bg-purple-100/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-200/20">Receipt Photo</span>
            <span className="bg-blue-100/20 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-200/20">CSV Export</span>
          </div>
        </div>
        
        <div className="step-card bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <div className="step-number bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
          <h3 className="text-xl font-bold mb-3 text-white">AI Processing Magic</h3>
          <p className="text-gray-300 mb-4">Superhuman accuracy with 99.7% categorization precision</p>
          <div className="processing-stats text-center">
            <div className="stat-highlight bg-green-100/20 text-green-300 px-4 py-2 rounded-lg border border-green-200/20">
              <span className="font-bold">847 transactions</span> in <span className="font-bold">12 seconds</span>
            </div>
          </div>
        </div>
        
        <div className="step-card bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <div className="step-number bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
          <h3 className="text-xl font-bold mb-3 text-white">Perfect Results</h3>
          <p className="text-gray-300 mb-4">Tax-ready categories with audit-proof documentation</p>
                  <div className="result-highlight bg-gradient-to-r from-cyan-100/20 to-blue-100/20 px-4 py-2 rounded-lg border border-cyan-200/20">
          <span className="font-bold text-cyan-300">$3,400</span> in missed deductions found
          </div>
        </div>
      </div>
      
      {/* AI Conversation Example */}
      <div className="ai-conversation bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 max-w-4xl mx-auto border border-white/10">
        <h3 className="text-xl font-bold mb-6 text-center text-white">AI Learning in Real-Time</h3>
        <div className="conversation-flow space-y-4">
          <div className="ai-message bg-cyan-100/20 rounded-lg p-4 border border-cyan-200/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="ai-avatar text-xl">🤖</span>
              <span className="font-semibold text-cyan-300">AI Assistant</span>
            </div>
            <p className="text-gray-200">"I noticed you categorize Starbucks as 'Business Meals' but this location is near your home. Should I update this pattern?"</p>
          </div>
          <div className="user-message bg-purple-100/20 rounded-lg p-4 ml-8 border border-purple-200/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="user-avatar text-xl">👤</span>
              <span className="font-semibold text-purple-300">You</span>
            </div>
            <p className="text-gray-200">"Yes, that's for client meetings. Keep it as business."</p>
          </div>
          <div className="ai-message bg-cyan-100/20 rounded-lg p-4 border border-cyan-200/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="ai-avatar text-xl">🤖</span>
              <span className="font-semibold text-cyan-300">AI Assistant</span>
            </div>
            <p className="text-gray-200">"Perfect! I'll remember that pattern. I've also found 3 similar transactions from last month that should be reclassified. Want me to update them?"</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const TaxSeasonTransformation = () => (
  <section className="tax-season-hero py-24 bg-gradient-to-br from-gray-800 via-gray-900 to-black">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="gradient-text text-3xl md:text-4xl font-extrabold mb-2">Transform Tax Season from Hell to Heaven</h2>
        <p className="section-subtitle text-lg text-gray-300">From hours of manual work to effortless AI organization</p>
      </div>
      
      <div className="transformation-showcase grid md:grid-cols-2 gap-12 items-center">
        {/* Before XspensesAI */}
        <div className="before-scenario bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/10">
          <h3 className="text-2xl font-bold mb-6 text-red-400">❌ Before XspensesAI</h3>
          <div className="pain-points space-y-4">
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-400 text-xl">😰</span>
              <div>
                <h4 className="font-semibold text-white">Hours of Manual Sorting</h4>
                <p className="text-gray-300">Spending 8+ hours organizing receipts and statements</p>
              </div>
            </div>
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-400 text-xl">😤</span>
              <div>
                <h4 className="font-semibold text-white">Categorization Chaos</h4>
                <p className="text-gray-300">Forgetting rules and making inconsistent decisions</p>
              </div>
            </div>
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-400 text-xl">😱</span>
              <div>
                <h4 className="font-semibold text-white">Missing Deductions</h4>
                <p className="text-gray-300">Overlooking legitimate business expenses</p>
              </div>
            </div>
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-400 text-xl">😵</span>
              <div>
                <h4 className="font-semibold text-white">Tax Season Stress</h4>
                <p className="text-gray-300">Panic attacks and sleepless nights</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* After XspensesAI */}
        <div className="after-scenario bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/10">
          <h3 className="text-2xl font-bold mb-6 text-green-400">✅ After XspensesAI</h3>
          <div className="success-points space-y-4">
            <div className="success-point flex items-start gap-3">
              <span className="text-green-400 text-xl">⚡</span>
              <div>
                <h4 className="font-semibold text-white">Bulk Upload Magic</h4>
                <p className="text-gray-300">47 bank statements organized in 3 minutes</p>
              </div>
            </div>
            <div className="success-point flex items-start gap-3">
              <span className="text-green-400 text-xl">🧠</span>
              <div>
                <h4 className="font-semibold text-white">AI Organization</h4>
                <p className="text-gray-300">Perfect categorization with 99.7% accuracy</p>
              </div>
            </div>
            <div className="success-point flex items-start gap-3">
              <span className="text-green-400 text-xl">💰</span>
              <div>
                <h4 className="font-semibold text-white">Found Deductions</h4>
                <p className="text-gray-300">$3,400 in missed business expenses discovered</p>
              </div>
            </div>
            <div className="success-point flex items-start gap-3">
              <span className="text-green-400 text-xl">😌</span>
              <div>
                <h4 className="font-semibold text-white">Effortless Tax Season</h4>
                <p className="text-gray-300">Tax-ready reports with audit-proof documentation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Success Story Section */}
      <div className="success-story-section mt-16">
        <div className="text-center mb-8">
          <h3 className="gradient-text text-3xl font-bold mb-2">Real Success Stories</h3>
          <p className="text-gray-300">See how XspensesAI transforms real users' financial lives</p>
        </div>
        
        <div className="success-stories-grid grid md:grid-cols-3 gap-6">
          {/* Success Story 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="success-card bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-cyan-500/25 group"
          >
            <div className="user-avatar mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                SM
              </div>
            </div>
            <div className="quote text-gray-200 mb-4 italic">
              "My shoebox of 1,200 receipts became a perfect spreadsheet in under 5 minutes. AI found $3,400 in deductions I missed!"
            </div>
            <div className="user-info text-center mb-4">
              <div className="font-semibold text-white">Sarah Mitchell</div>
              <div className="text-sm text-cyan-300">Freelance Consultant</div>
            </div>
            <div className="metrics grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-lg font-bold text-cyan-400">5 min</div>
                <div className="text-xs text-gray-300">vs 8 hours</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-lg font-bold text-green-400">$3,400</div>
                <div className="text-xs text-gray-300">found</div>
              </div>
            </div>
          </motion.div>

          {/* Success Story 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="success-card bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 hover:shadow-emerald-500/25 group"
          >
            <div className="user-avatar mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                MJ
              </div>
            </div>
            <div className="quote text-gray-200 mb-4 italic">
              "AI processed 47 bank statements in 3 minutes. Found $2,800 in missed business expenses. Tax season went from nightmare to entertainment!"
            </div>
            <div className="user-info text-center mb-4">
              <div className="font-semibold text-white">Mike Johnson</div>
              <div className="text-sm text-emerald-300">Small Business Owner</div>
            </div>
            <div className="metrics grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-lg font-bold text-emerald-400">3 min</div>
                <div className="text-xs text-gray-300">47 statements</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-lg font-bold text-green-400">$2,800</div>
                <div className="text-xs text-gray-300">found</div>
              </div>
            </div>
          </motion.div>

          {/* Success Story 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="success-card bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:shadow-purple-500/25 group"
          >
            <div className="user-avatar mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                JL
              </div>
            </div>
            <div className="quote text-gray-200 mb-4 italic">
              "The AI therapist helped me overcome 20 years of money anxiety. I went from financial panic attacks to financial confidence in 30 days."
            </div>
            <div className="user-info text-center mb-4">
              <div className="font-semibold text-white">Jennifer Lee</div>
              <div className="text-sm text-purple-300">Marketing Director</div>
            </div>
            <div className="metrics grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-lg font-bold text-purple-400">30 days</div>
                <div className="text-xs text-gray-300">to confidence</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-lg font-bold text-green-400">87%</div>
                <div className="text-xs text-gray-300">anxiety reduction</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Success Metrics Summary */}
        <div className="success-metrics-summary mt-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="metric-item">
              <div className="text-3xl font-bold text-cyan-400 mb-1">$12M+</div>
              <div className="text-sm text-gray-300">Total User Savings</div>
            </div>
            <div className="metric-item">
              <div className="text-3xl font-bold text-emerald-400 mb-1">2.8M+</div>
              <div className="text-sm text-gray-300">Documents Processed</div>
            </div>
            <div className="metric-item">
              <div className="text-3xl font-bold text-purple-400 mb-1">50,000+</div>
              <div className="text-sm text-gray-300">Active Users</div>
            </div>
            <div className="metric-item">
              <div className="text-3xl font-bold text-pink-400 mb-1">99.7%</div>
              <div className="text-sm text-gray-300">User Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const RevolutionaryFeatures = () => (
  <section className="revolutionary-features py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="gradient-text text-4xl md:text-5xl font-extrabold mb-4">The Entertainment Revolution That Makes Finance Addictive</h2>
        <p className="section-subtitle text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
          The first and only financial platform that people actually want to use every day. Here's how we turned the most boring task into genuine entertainment.
        </p>
        <div className="revolutionary-statement mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20 max-w-3xl mx-auto">
          <p className="text-lg text-white font-semibold">
            "Every other financial app makes you avoid money management. XspensesAI makes you excited about it. Our entertainment features create genuine addiction to financial wellness."
          </p>
        </div>
      </div>

      {/* Three-Column Feature Cards */}
      <div className="features-grid grid md:grid-cols-3 gap-8 mb-16">
        {/* Card 1: Personal Podcasts */}
        <div className="feature-card bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:shadow-cyan-500/25 group">
          <div className="feature-icon mb-6 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-3 text-center">Your Money Story, Beautifully Told</h3>
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            AI creates personalized podcast episodes about YOUR financial journey. Like having a financial documentary about your spending patterns, goals, and achievements.
          </p>
          
          <div className="sample-episodes mb-6 space-y-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-sm text-cyan-300 font-semibold">Sample Episode:</div>
              <div className="text-xs text-gray-300">"Sarah's Coffee Shop Conquest: How $200 Monthly Became a Business Strategy"</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-sm text-cyan-300 font-semibold">Sample Episode:</div>
              <div className="text-xs text-gray-300">"The Great Credit Card Payoff of 2024: Mike's 8-Month Victory Story"</div>
            </div>
          </div>
          
          <div className="benefit-highlight bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-6 text-center">
            <div className="text-2xl font-bold text-cyan-400 mb-1">87%</div>
            <div className="text-sm text-gray-300">of users check their finances daily after getting their first podcast</div>
            <div className="text-xs text-cyan-300 mt-2">Users share these episodes on social media!</div>
          </div>
          
          <div className="text-center">
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-cyan-500/25 transform hover:scale-105">
              Hear Sample Episode
            </button>
          </div>
        </div>
        
        {/* Card 2: AI Financial Therapist */}
        <div className="feature-card bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:shadow-cyan-500/25 group">
          <div className="feature-icon mb-6 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-3 text-center">Heal Your Relationship with Money</h3>
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            24/7 emotional support that understands financial psychology. Address money anxiety without judgment or shame.
          </p>
          
          <div className="therapy-session-preview mb-6 bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-sm text-emerald-300 font-semibold mb-2">Therapy Session Preview:</div>
            <div className="text-xs text-gray-300 space-y-2">
              <div><strong>User:</strong> "I feel guilty buying anything for myself"</div>
              <div><strong>AI Therapist:</strong> "That guilt is protecting you from past financial fear. You've built healthy habits now - a $20 self-care purchase is an investment in your wellbeing, not a failure."</div>
            </div>
          </div>
          
          <div className="benefit-highlight bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 text-center">
            <div className="text-2xl font-bold text-emerald-400 mb-1">76%</div>
            <div className="text-sm text-gray-300">reduction in financial anxiety within 30 days</div>
            <div className="text-xs text-emerald-300 mt-2">Developed with financial psychology experts</div>
          </div>
          
          <div className="text-center">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-emerald-500/25 transform hover:scale-105">
              Try Therapy Session
            </button>
          </div>
        </div>
        
        {/* Card 3: Gamified Progress */}
        <div className="feature-card bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:shadow-cyan-500/25 group">
          <div className="feature-icon mb-6 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
                </div>
              </div>
          
                    <h3 className="text-2xl font-bold text-white mb-3 text-center">Turn Goals Into Addictive Challenges</h3>
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            Achievement system that makes financial progress genuinely exciting. Celebrate wins, track streaks, compete with yourself.
          </p>
          
          <div className="achievement-examples mb-6 space-y-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-sm text-purple-300 font-semibold">🏆 Coffee Conqueror</div>
              <div className="text-xs text-gray-300">Optimized coffee spending for 30 days</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-sm text-purple-300 font-semibold">🎯 Emergency Fund Hero</div>
              <div className="text-xs text-gray-300">Built 6-month emergency fund</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-sm text-purple-300 font-semibold">💎 Debt Destroyer</div>
              <div className="text-xs text-gray-300">Eliminated credit card debt</div>
            </div>
          </div>
          
          <div className="benefit-highlight bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">3x</div>
            <div className="text-sm text-gray-300">more likely to reach financial goals</div>
            <div className="text-xs text-purple-300 mt-2">Users 3x more likely to reach financial goals</div>
          </div>
          
          <div className="text-center">
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-purple-500/25 transform hover:scale-105">
              See Goal Tracker
            </button>
          </div>
              </div>
            </div>

      {/* Enhanced Social Proof Section */}
      <div className="social-proof bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 mb-12">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="stat-item">
            <div className="text-4xl font-bold text-cyan-400 mb-2">150,000+</div>
            <div className="text-gray-300">Personal Podcasts Generated</div>
          </div>
          <div className="stat-item">
            <div className="text-4xl font-bold text-emerald-400 mb-2">94%</div>
            <div className="text-gray-300">Say 'More Engaging Than Netflix'</div>
          </div>
          <div className="stat-item">
            <div className="text-4xl font-bold text-purple-400 mb-2">#1</div>
            <div className="text-gray-300">Platform People Actually Want to Use Daily</div>
          </div>
        </div>
      </div>

      {/* The Entertainment Difference */}
      <div className="entertainment-difference bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-3xl p-8 border border-cyan-500/20 mb-12">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">The Entertainment Difference</h3>
        <div className="comparison-grid grid md:grid-cols-2 gap-8">
          <div className="before-section">
            <h4 className="text-xl font-bold text-red-400 mb-4 text-center">❌ Before XspensesAI</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-red-400">•</span>
                <span>Avoid checking finances</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-red-400">•</span>
                <span>Dread expense categorization</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-red-400">•</span>
                <span>Financial stress and anxiety</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-red-400">•</span>
                <span>Boring, clinical money management</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-red-400">•</span>
                <span>Use apps once and forget</span>
              </div>
            </div>
          </div>
          <div className="after-section">
            <h4 className="text-xl font-bold text-green-400 mb-4 text-center">✅ After XspensesAI</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400">•</span>
                <span>Excited to see new podcast episodes</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400">•</span>
                <span>Look forward to AI conversations</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400">•</span>
                <span>Financial goals feel like game achievements</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400">•</span>
                <span>Money management becomes entertainment</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400">•</span>
                <span>Daily engagement with financial wellness</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revolutionary Statistics */}
      <div className="revolutionary-stats bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 mb-12">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">Revolutionary Statistics</h3>
        <div className="stats-grid grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">5x</div>
            <div className="text-sm text-gray-300">Users check finances more often than other apps</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-emerald-400 mb-2">94%</div>
            <div className="text-sm text-gray-300">Report finance is now 'genuinely enjoyable'</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">47 min</div>
            <div className="text-sm text-gray-300">Average session time (vs 3 min industry)</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-pink-400 mb-2">96%</div>
            <div className="text-sm text-gray-300">Still active after 6 months (vs 12% industry)</div>
          </div>
        </div>
      </div>

      {/* Enhanced Bottom CTA Section */}
      <div className="cta-section text-center">
        <h3 className="text-3xl font-bold text-white mb-4">Ready to Fall in Love with Your Finances?</h3>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          This isn't financial software with entertainment bolted on. This is entertainment that happens to make you financially successful. XspensesAI is the Netflix of financial wellness - addictive, personalized, and genuinely enjoyable.
        </p>
        
        <div className="cta-buttons flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-cyan-500/25 transform hover:scale-105">
            Start My Entertainment Journey
          </button>
          <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200">
            Listen to Sample Podcast
          </button>
          <button className="border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200">
            Try AI Therapist Session
          </button>
        </div>
        
        <div className="trust-indicators text-sm text-gray-400 mb-6">
          ✓ No credit card required • ✓ 2.3M+ episodes created • ✓ Join 50,000+ addicted users
        </div>

        <div className="social-proof-explosion bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20">
          <h4 className="text-lg font-bold text-white mb-4">What Users Are Saying:</h4>
          <div className="testimonials-grid grid md:grid-cols-3 gap-4 text-sm">
            <div className="testimonial bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-gray-200 italic">"I actually look forward to Monday mornings because that's when my financial podcast drops. My money story feels like a Netflix series I'm starring in."</p>
              <div className="text-cyan-300 font-semibold mt-2">- Sarah M.</div>
            </div>
            <div className="testimonial bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-gray-200 italic">"The AI therapist helped me overcome 20 years of money anxiety. I went from financial panic attacks to financial confidence in 30 days."</p>
              <div className="text-emerald-300 font-semibold mt-2">- Jennifer K.</div>
            </div>
            <div className="testimonial bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-gray-200 italic">"My friends think I'm crazy for being excited about budgeting. XspensesAI turned the most boring task into my favorite hobby."</p>
              <div className="text-purple-300 font-semibold mt-2">- Mike R.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const AILearningEvolution = () => (
  <section className="ai-learning-evolution py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="gradient-text text-3xl md:text-4xl font-extrabold mb-2">AI Learning & Evolution Timeline</h2>
        <p className="section-subtitle text-lg text-gray-300">Watch your AI transform from basic tool to financial genius</p>
        <div className="ai-evolution-preview mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20 max-w-3xl mx-auto">
          <p className="text-lg text-white font-semibold">
            "Your AI doesn't just categorize expenses - it becomes your personal financial advisor, learning your patterns, predicting your needs, and evolving into the perfect financial companion."
          </p>
        </div>
      </div>
      
      <div className="learning-timeline grid md:grid-cols-4 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="timeline-stage bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:shadow-cyan-500/25 group"
        >
          <div className="stage-number bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">1</div>
          <h3 className="text-xl font-bold mb-3 text-white">Week 1</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-cyan-300">78%</div>
            <div className="text-sm text-gray-300">Accuracy</div>
          </div>
          <p className="text-gray-300 mb-4">Learning your basic spending patterns and categorization preferences</p>
          <div className="learning-example bg-white/10 rounded-lg p-3 text-sm border border-white/10 text-gray-300">
            <strong>Example:</strong> "Starbucks = Coffee" (basic categorization)
          </div>
          <div className="ai-learning-indicator mt-4">
            <div className="text-xs text-cyan-400 font-semibold">AI Status: Pattern Recognition</div>
          </div>
        </motion.div>
        
        <div className="timeline-stage bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <div className="stage-number bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
          <h3 className="text-xl font-bold mb-3">Month 1</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-cyan-300">87%</div>
            <div className="text-sm text-gray-300">Accuracy</div>
          </div>
          <p className="text-gray-300 mb-4">Understanding context and business vs personal patterns</p>
          <div className="learning-example bg-white/10 rounded-lg p-3 text-sm border border-white/10 text-gray-300">
            <strong>Example:</strong> "Starbucks near office = Business Meals"
          </div>
        </div>
        
        <div className="timeline-stage bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <div className="stage-number bg-gradient-to-r from-purple-500 to-pink-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
          <h3 className="text-xl font-bold mb-3">Month 3</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-purple-300">94%</div>
            <div className="text-sm text-gray-300">Accuracy</div>
          </div>
          <p className="text-gray-300 mb-4">Predicting categories before you think about them</p>
          <div className="learning-example bg-white/10 rounded-lg p-3 text-sm border border-white/10 text-gray-300">
            <strong>Example:</strong> "This looks like a client lunch - categorizing as Business Meals"
          </div>
        </div>
        
        <div className="timeline-stage bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <div className="stage-number bg-gradient-to-r from-red-500 to-orange-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
          <h3 className="text-xl font-bold mb-3">Month 6</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-red-300">99.7%</div>
            <div className="text-sm text-gray-300">Accuracy</div>
          </div>
          <p className="text-gray-300 mb-4">Financial telepathy - knows your patterns better than you do</p>
          <div className="learning-example bg-white/10 rounded-lg p-3 text-sm border border-white/10 text-gray-300">
            <strong>Example:</strong> "Found 3 similar transactions that should be reclassified"
          </div>
        </div>
      </div>
      
      <div className="ai-memory-features bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 mt-12 border border-white/10">
        <h3 className="text-2xl font-bold mb-6 text-center text-white">AI Memory Palace Features</h3>
        <div className="memory-grid grid md:grid-cols-3 gap-6">
          <div className="memory-feature text-center">
            <div className="memory-icon text-3xl mb-3">🧠</div>
            <h4 className="font-semibold mb-2">Never Categorize Twice</h4>
            <p className="text-sm text-gray-300">AI remembers every decision and applies it consistently</p>
          </div>
          <div className="memory-feature text-center">
            <div className="memory-icon text-3xl mb-3">🔮</div>
            <h4 className="font-semibold mb-2">Pattern Prediction</h4>
            <p className="text-sm text-gray-300">Anticipates your categorization before you make it</p>
          </div>
          <div className="memory-feature text-center">
            <div className="memory-icon text-3xl mb-3">💡</div>
            <h4 className="font-semibold mb-2">Motivation Mastery</h4>
            <p className="text-sm text-gray-300">Learns what motivates you and tailors suggestions accordingly</p>
          </div>
        </div>
      </div>

      <div className="text-center mt-10">
        <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:shadow-cyan-500/25">
          Watch AI Learn Live
        </button>
      </div>
    </div>
  </section>
);

const SmartImportAISection = () => (
  <section className="smart-import-ai py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="gradient-text text-3xl md:text-4xl font-extrabold mb-2">Smart Import AI Superpowers</h2>
        <p className="section-subtitle text-lg text-gray-300">Revolutionary AI that reads ANY financial document instantly</p>
      </div>
      <div className="ai-superpowers grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="ai-power bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/10">
          <div className="power-icon text-4xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-3">Universal Compatibility</h3>
          <p className="text-gray-300 mb-4">Reads statements from 12,000+ banks worldwide. PDFs, CSVs, images, emails, handwritten receipts - AI reads it all.</p>
          <div className="power-example bg-white/10 rounded-lg p-3 border border-white/10">
            <div className="text-sm text-gray-300">
              <strong>Example:</strong> Upload Chase, Wells Fargo, or any international bank statement
            </div>
          </div>
        </div>
        
        <div className="ai-power bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/10">
          <div className="power-icon text-4xl mb-4">🧠</div>
          <h3 className="text-xl font-bold mb-3">Memory Palace</h3>
          <p className="text-gray-300 mb-4">Never ask you to categorize "Starbucks" as coffee again. AI remembers every preference and learns your financial DNA.</p>
          <div className="power-example bg-white/10 rounded-lg p-3 border border-white/10">
            <div className="text-sm text-gray-300">
              <strong>Example:</strong> AI learned: "Starbucks" = "Business Meals" for you
            </div>
          </div>
        </div>
        
        <div className="ai-power bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/10">
          <div className="power-icon text-4xl mb-4">⚡</div>
          <h3 className="text-xl font-bold mb-3">Tax Season Magic</h3>
          <p className="text-gray-300 mb-4">Organizes entire year of expenses in under 5 minutes. Creates audit-proof categorization for tax season.</p>
          <div className="power-example bg-white/10 rounded-lg p-3 border border-white/10">
            <div className="text-sm text-gray-300">
              <strong>Example:</strong> 47 bank statements → Tax-ready in 3 minutes
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-12">
        <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:shadow-cyan-500/25">
          Try Smart Import Free
        </button>
      </div>
    </div>
  </section>
);

const SocialProofResults = () => (
  <section className="social-proof-results py-24 bg-white">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="results-grid grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 text-center">
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-blue-600 block mb-3">$12M+</span>
          <span className="stat-label text-gray-700 font-medium">SAVED BY USERS</span>
        </div>
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-blue-600 block mb-3">2.8M+</span>
          <span className="stat-label text-gray-700 font-medium">DOCUMENTS READ BY AI</span>
        </div>
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-blue-600 block mb-3">94%</span>
          <span className="stat-label text-gray-700 font-medium">ACHIEVE FINANCIAL GOALS</span>
          <span className="stat-subtitle text-sm text-gray-500 block mt-1">(vs 23% industry)</span>
        </div>
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-blue-600 block mb-3">150K+</span>
          <span className="stat-label text-gray-700 font-medium">PERSONAL PODCASTS GENERATED</span>
        </div>
      </div>
      <div className="testimonials-preview text-center">
        <h3 className="text-2xl font-bold mb-8">Real Tax Season Transformations</h3>
        <div className="testimonials-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="testimonial-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col items-center">
            <div className="testimonial-content text-gray-800 mb-4">
              <p>"Uploaded 47 bank statements → AI organized everything for taxes in 3 minutes. Found $3,400 in missed deductions! Tax season is now effortless."</p>
            </div>
            <div className="testimonial-author flex items-center gap-3">
              <img src="/api/placeholder/50/50" alt="Sarah M." className="rounded-full w-12 h-12 object-cover" />
              <div className="text-left">
                <span className="author-name font-semibold text-gray-900 block">Sarah M.</span>
                <div className="author-rating text-yellow-400">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col items-center">
            <div className="testimonial-content text-gray-800 mb-4">
              <p>"AI reads ANY financial document. My shoebox of receipts became tax-ready categories in under 5 minutes. Never categorize 'Starbucks' as coffee again!"</p>
            </div>
            <div className="testimonial-author flex items-center gap-3">
              <img src="/api/placeholder/50/50" alt="Mike R." className="rounded-full w-12 h-12 object-cover" />
              <div className="text-left">
                <span className="author-name font-semibold text-gray-900 block">Mike R.</span>
                <div className="author-rating text-yellow-400">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col items-center">
            <div className="testimonial-content text-gray-800 mb-4">
              <p>"The AI remembers every categorization preference. From tax season chaos to entertainment platform - managing money is now actually fun!"</p>
            </div>
            <div className="testimonial-author flex items-center gap-3">
              <img src="/api/placeholder/50/50" alt="Jennifer L." className="rounded-full w-12 h-12 object-cover" />
              <div className="text-left">
                <span className="author-name font-semibold text-gray-900 block">Jennifer L.</span>
                <div className="author-rating text-yellow-400">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const CompetitiveDifferentiation = () => (
  <section className="competitive-section py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
    <div className="container max-w-5xl mx-auto px-4">
      <h2 className="gradient-text text-3xl md:text-4xl font-extrabold text-center mb-12">Why XspensesAI vs. Other Expense Apps</h2>
              <div className="comparison-grid grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="comparison-item bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-white/10">
          <h4 className="text-xl font-bold mb-4 text-gray-200">Other Apps</h4>
          <ul className="comparison-list negative text-left space-y-3 text-gray-300">
            <li>❌ Manual expense categorization</li>
            <li>❌ Limited to specific bank formats</li>
            <li>❌ Forget your categorization rules</li>
            <li>❌ Tax season chaos and stress</li>
            <li>❌ No entertainment or engagement value</li>
          </ul>
        </div>
        <div className="comparison-item highlight bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border-2 border-cyan-500">
          <h4 className="text-xl font-bold mb-4 text-cyan-400">XspensesAI</h4>
          <ul className="comparison-list positive text-left space-y-3 text-gray-200 font-semibold">
            <li>✅ AI reads ANY financial document instantly</li>
            <li>✅ Universal compatibility - 12,000+ banks worldwide</li>
            <li>✅ AI remembers every preference forever</li>
            <li>✅ AI organizes entire year in under 5 minutes</li>
            <li>✅ Entertainment platform that makes finance enjoyable</li>
          </ul>
        </div>
      </div>
      <div className="text-center mt-12">
        <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:shadow-cyan-500/25">
          See the Difference
        </button>
      </div>
    </div>
  </section>
);

const FinalCTA = () => (
  <section className="final-cta py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
    <div className="container max-w-3xl mx-auto px-4 text-center">
      <div className="cta-content">
        <h2 className="gradient-text text-3xl md:text-4xl font-extrabold mb-4">Ready to End Manual Expense Work Forever?</h2>
        <p className="text-xl text-blue-100 mb-8">Join 50,000+ users who've eliminated manual expense work with AI automation that reads ANY document in 2.3 seconds</p>
        <div className="cta-buttons flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button className="btn-primary-xl bg-cyan-500 hover:bg-cyan-600 text-white px-10 py-5 rounded-xl font-semibold text-xl shadow-lg hover:scale-105 transition-all duration-300 hover:shadow-cyan-500/25">
            End Manual Work Forever
            <span className="block text-xs font-normal mt-1">✓ No credit card required • ✓ Process 10 documents free • ✓ Join 50,000+ automated users</span>
          </button>
          <button className="btn-secondary-large flex items-center gap-2 px-10 py-5 rounded-xl font-semibold text-lg border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white transition-all duration-300">
            Watch AI Process 50 Receipts in 30 Seconds
          </button>
          <button className="btn-secondary-large flex items-center gap-2 px-10 py-5 rounded-xl font-semibold text-lg border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white transition-all duration-300">
            See AI in Action
          </button>
          </div>
        <div className="cta-guarantees flex flex-wrap gap-4 text-sm text-blue-200 font-medium justify-center">
          <span className="flex items-center gap-1">💳 No credit card required</span>
          <span className="flex items-center gap-1">🔒 Bank-level security</span>
          <span className="flex items-center gap-1">📞 24/7 support</span>
          <span className="flex items-center gap-1">↩️ Cancel anytime</span>
        </div>
      </div>
    </div>
  </section>
);

const NewHomePage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>XspensesAI - World's First FinTech Entertainment Platform | AI Reads Any Statement</title>
      <meta name="description" content="Revolutionary AI reads any bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration. End expense categorization hell forever." />
      <meta name="keywords" content="AI expense tracker, smart expense management, AI financial assistant, automated expense categorization, financial entertainment platform, AI statement reader, AI reads bank statements automatically, upload any financial document AI organizes, entertainment financial management platform, AI that learns your spending patterns, smart expense import any format, financial podcast creator personal" />
      <meta property="og:title" content="XspensesAI - World's First FinTech Entertainment Platform | AI Reads Any Statement" />
      <meta property="og:description" content="Revolutionary AI reads any bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration. End expense categorization hell forever." />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="XspensesAI - World's First FinTech Entertainment Platform | AI Reads Any Statement" />
      <meta name="twitter:description" content="Revolutionary AI reads any bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration." />
    </Helmet>
    <NewHomepageHero />
    <SmartImportAIDemo />
    <TaxSeasonTransformation />
    <RevolutionaryFeatures />
    <AILearningEvolution />
    <SmartImportAISection />
    <AIEmployeesSection />
    <EntertainmentFeaturesSection />
    <SocialProofResults />
    <FAQSection />
    <CompetitiveDifferentiation />
    <FinalCTA />
    {/* Add more sections here for features, testimonials, etc. */}
  </WebsiteLayout>
);

// AI Employees Section
const AIEmployeesSection: React.FC = () => {
  const [selectedAI, setSelectedAI] = useState<string | null>(null);

  const aiEmployees = [
    {
      id: 'finley',
      name: 'Finley',
      role: 'Personal Finance AI',
      icon: '📊',
      personality: 'Your always-on financial sidekick',
      specialty: 'Instant answers to any money question',
      highlight: 'Knows your entire financial picture 24/7',
      demoQuote: 'Your coffee spending suggests stress - want me to create a self-care budget?',
      category: 'Core Financial'
    },
    {
      id: 'byte',
      name: 'Byte',
      role: 'Smart Import AI',
      icon: '⚡',
      personality: 'The efficiency wizard',
      specialty: 'Superhuman document processing',
      highlight: '99.7% accuracy in 2.3 seconds',
      demoQuote: 'Just processed 47 bank statements. Found 12 uncategorized business meals!',
      category: 'Core Financial'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      role: 'Spending Predictions',
      icon: '🔮',
      personality: 'Your financial fortune teller',
      specialty: '94% accurate expense forecasting',
      highlight: 'Prevents financial surprises before they happen',
      demoQuote: 'You\'ll overspend on dining next week. Should I adjust your budget?',
      category: 'Core Financial'
    },
    {
      id: 'ledger',
      name: 'Ledger',
      role: 'Tax Assistant',
      icon: '📋',
      personality: 'Your personal tax genius',
      specialty: 'Finds deductions others miss',
      highlight: 'IRS/CRA expert knowledge',
      demoQuote: 'Found $3,400 in missed deductions. Your tax refund just got bigger!',
      category: 'Core Financial'
    },
    {
      id: 'luna',
      name: 'Luna',
      role: 'AI Financial Therapist',
      icon: '💝',
      personality: 'Your emotional support system',
      specialty: 'Money anxiety and financial stress relief',
      highlight: '87% reduction in financial anxiety',
      demoQuote: 'That overspending guilt is normal. Let\'s work through it together.',
      category: 'Entertainment & Wellness'
    },
    {
      id: 'sage',
      name: 'Sage',
      role: 'Podcast Host',
      icon: '🎤',
      personality: 'Your financial storyteller',
      specialty: 'Personal podcasts about YOUR money',
      highlight: '150,000+ episodes created',
      demoQuote: 'Your Q4 financial journey deserves an epic episode. Ready to record?',
      category: 'Entertainment & Wellness'
    },
    {
      id: 'wave',
      name: 'Wave',
      role: 'Spotify Integration',
      icon: '🎵',
      personality: 'Your financial DJ',
      specialty: 'Perfect soundtracks for money tasks',
      highlight: 'Music that makes finance fun',
      demoQuote: 'Tax prep playlist loading... time to make filing taxes enjoyable!',
      category: 'Entertainment & Wellness'
    },
    {
      id: 'harmony',
      name: 'Harmony',
      role: 'Wellness Studio',
      icon: '🧘',
      personality: 'Your financial wellness guide',
      specialty: 'Holistic financial health',
      highlight: 'Mind + money wellness programs',
      demoQuote: 'Your spending anxiety is spiking. Want a 5-minute financial meditation?',
      category: 'Entertainment & Wellness'
    }
  ];

  return (
    <section className="ai-employees py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="gradient-text text-4xl md:text-5xl font-extrabold mb-6">Meet Your Personal AI Financial Dream Team</h2>
          <p className="gradient-text text-xl md:text-2xl font-semibold mb-6">16 specialized AI experts with unique personalities, skills, and expertise. The only financial platform with AI emotional intelligence.</p>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto">While other apps give you boring calculators, XspensesAI gives you an entire team of AI specialists who learn your personality, remember your preferences, and evolve with your financial journey. This is the future of financial management.</p>
        </div>

        {/* AI Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {aiEmployees.map((ai) => (
            <motion.div
              key={ai.id}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="ai-card bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => setSelectedAI(selectedAI === ai.id ? null : ai.id)}
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">{ai.icon}</div>
                <h3 className="text-xl font-bold text-white mb-1">{ai.name}</h3>
                <p className="text-sm text-cyan-400 font-medium">{ai.role}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Personality</p>
                  <p className="text-sm text-white font-medium">{ai.personality}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Specialty</p>
                  <p className="text-sm text-white font-medium">{ai.specialty}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Highlight</p>
                  <p className="text-sm text-white font-medium">{ai.highlight}</p>
                </div>
              </div>

              {/* Demo Quote - Hidden by default, shown on hover/click */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ 
                  opacity: selectedAI === ai.id ? 1 : 0,
                  height: selectedAI === ai.id ? 'auto' : 0
                }}
                className="mt-4 p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-lg"
              >
                <p className="text-sm text-cyan-300 italic">"{ai.demoQuote}"</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Revolutionary Differentiation */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Why XspensesAI's AI Team is Revolutionary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <p className="text-gray-300">16 specialized personalities vs. generic chatbots elsewhere</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <p className="text-gray-300">Each AI remembers your preferences and learns your communication style</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <p className="text-gray-300">Emotional intelligence combined with financial expertise</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <p className="text-gray-300">Available 24/7 with instant, personalized responses</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <p className="text-gray-300">The only financial platform with true AI personalities</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                <p className="text-gray-300">Learns and evolves with your financial journey</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400 mb-2">2.8M+</div>
              <div className="text-gray-300">conversations with AI employees</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400 mb-2">94%</div>
              <div className="text-gray-300">say 'More helpful than human advisors'</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400 mb-2">47 min</div>
              <div className="text-gray-300">daily average with AI team</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Link to="/ai-employees" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-cyan-500/25 transform hover:scale-105">Meet Your AI Dream Team</Link>
            <Link to="/ai-assistant" className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300">Take AI Personality Quiz</Link>
          </div>
          <p className="text-gray-300">Chat with 16 specialists - each with unique expertise</p>
        </div>
      </div>
    </section>
  );
};

// Entertainment Features Section
const EntertainmentFeaturesSection: React.FC = () => {
  return (
    <section className="entertainment-features py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="gradient-text text-4xl md:text-5xl font-extrabold mb-6">The Entertainment Revolution That Makes Finance Addictive</h2>
          <p className="gradient-text text-xl md:text-2xl font-semibold mb-6">The first and only financial platform that people actually want to use every day. Here's how we turned the most boring task into genuine entertainment.</p>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto">Every other financial app makes you avoid money management. XspensesAI makes you excited about it. Our entertainment features create genuine addiction to financial wellness.</p>
        </div>

        {/* Feature 1: Personal Financial Podcasts */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-8 mb-6">
                <div className="text-4xl mb-4">🎤</div>
                <h3 className="text-2xl font-bold text-white mb-4">Your Money Story, Beautifully Told</h3>
                <p className="text-lg text-gray-300 mb-6">AI creates personalized podcast episodes about YOUR financial journey</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <p className="text-gray-300">Monthly episodes celebrating your wins and analyzing your patterns</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <p className="text-gray-300">Documentary-style narration that makes your finances feel important</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <p className="text-gray-300">Shareable content that friends actually want to hear</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <p className="text-gray-300">150,000+ episodes created and climbing</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-3">Sample Episode Titles:</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• "Sarah's Coffee Shop Conquest: How $200 Monthly Became a Business Strategy"</p>
                  <p>• "The Great Credit Card Payoff of 2024: Mike's 8-Month Victory Story"</p>
                  <p>• "Jennifer's Side Hustle Success: From Broke to $5K Monthly in 6 Episodes"</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                <p className="text-cyan-300 italic">"I share my financial podcast episodes on Instagram. My friends are asking how to get their own AI financial documentarian!"</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="text-center">
                <div className="text-6xl mb-4">🎧</div>
                <h4 className="text-xl font-bold text-white mb-4">Podcast Player Interface</h4>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Episode 12: "The Budget Breakthrough"</div>
                    <div className="text-xs text-gray-500">23 min • Released 2 days ago</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Episode 11: "Coffee Shop Strategy"</div>
                    <div className="text-xs text-gray-500">18 min • Released 1 week ago</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Episode 10: "Emergency Fund Victory"</div>
                    <div className="text-xs text-gray-500">21 min • Released 2 weeks ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: AI Financial Therapist */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div className="text-center">
                  <div className="text-6xl mb-4">💝</div>
                  <h4 className="text-xl font-bold text-white mb-4">Therapy Session Interface</h4>
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4">
                    <div className="text-sm text-gray-300 mb-2">AI Therapist: "How are you feeling about your finances today?"</div>
                    <div className="text-sm text-gray-400 italic">User: "I feel guilty buying anything for myself"</div>
                    <div className="text-sm text-cyan-300 mt-2">AI Therapist: "That guilt is protecting you from past financial fear. You've built healthy habits now - a $20 self-care purchase is an investment in your wellbeing, not a failure."</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 mb-6">
                <div className="text-4xl mb-4">💝</div>
                <h3 className="text-2xl font-bold text-white mb-4">Heal Your Relationship with Money</h3>
                <p className="text-lg text-gray-300 mb-6">24/7 emotional support that understands financial psychology</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <p className="text-gray-300">Address money anxiety without judgment or shame</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <p className="text-gray-300">Work through spending guilt and financial trauma</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <p className="text-gray-300">Build healthy money mindset through AI guidance</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <p className="text-gray-300">87% reduction in financial stress within 30 days</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <p className="text-purple-300 italic">"The AI therapist helped me overcome 20 years of money anxiety. I went from financial panic attacks to financial confidence in 30 days." - Jennifer K.</p>
              </div>

              <div className="mt-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                <p className="text-sm text-purple-300">Developed with financial psychology experts and licensed therapists</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Gamified Financial Achievement System */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-8 mb-6">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold text-white mb-4">Turn Goals Into Addictive Challenges</h3>
                <p className="text-lg text-gray-300 mb-6">Achievement system that makes financial progress genuinely exciting</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <p className="text-gray-300">Milestone celebrations with personalized rewards</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <p className="text-gray-300">Achievement streaks that build momentum</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <p className="text-gray-300">Progress visualization that feels like leveling up</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <p className="text-gray-300">Social sharing of financial wins (without revealing amounts)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-sm font-semibold text-white">Coffee Conqueror</div>
                  <div className="text-xs text-gray-400">Optimized coffee spending for 30 days</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm font-semibold text-white">Emergency Fund Hero</div>
                  <div className="text-xs text-gray-400">Built 6-month emergency fund</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="text-sm font-semibold text-white">Business Expense Master</div>
                  <div className="text-xs text-gray-400">Perfect categorization for 90 days</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-2xl mb-2">💎</div>
                  <div className="text-sm font-semibold text-white">Debt Destroyer</div>
                  <div className="text-xs text-gray-400">Eliminated credit card debt</div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h4 className="text-xl font-bold text-white mb-4">Achievement Dashboard</h4>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4">
                    <div className="text-lg font-bold text-white mb-2">Level 7: Financial Master</div>
                    <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                    <div className="text-sm text-gray-300">75% to Level 8</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl">🏆</div>
                      <div className="text-xs text-gray-300">Achievements: 12/20</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl">🔥</div>
                      <div className="text-xs text-gray-300">Streak: 47 days</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 4: Spotify for Finance */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎵</div>
                  <h4 className="text-xl font-bold text-white mb-4">Music Player Integration</h4>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4">
                      <div className="text-sm text-gray-300 mb-2">Now Playing: "Focus Flow"</div>
                      <div className="text-xs text-gray-400">Perfect for budget planning sessions</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-sm text-gray-300 mb-2">Next: "Victory Anthem"</div>
                      <div className="text-xs text-gray-400">Celebration music for goal achievements</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-sm text-gray-300 mb-2">Queue: "Stress Relief"</div>
                      <div className="text-xs text-gray-400">Calming sounds for financial anxiety</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-8 mb-6">
                <div className="text-4xl mb-4">🎵</div>
                <h3 className="text-2xl font-bold text-white mb-4">The Perfect Soundtrack for Every Money Task</h3>
                <p className="text-lg text-gray-300 mb-6">Context-aware music that makes financial work enjoyable</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-gray-300">Focus playlists for budget planning sessions</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-gray-300">Victory anthems when you hit financial goals</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-gray-300">Calming sounds for financial stress relief</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-gray-300">Productivity beats for expense categorization</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-2">Smart Integration:</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>• AI detects your task and plays perfect background music</p>
                    <p>• Celebration songs trigger automatically when goals are met</p>
                    <p>• Stress-relief audio activates during tax season</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Entertainment Difference */}
        <div className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">The Entertainment Difference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-red-400 mb-4">Before XspensesAI:</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-red-400 text-xl">❌</div>
                    <p className="text-gray-300">Avoid checking finances</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-400 text-xl">❌</div>
                    <p className="text-gray-300">Dread expense categorization</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-400 text-xl">❌</div>
                    <p className="text-gray-300">Financial stress and anxiety</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-400 text-xl">❌</div>
                    <p className="text-gray-300">Boring, clinical money management</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-400 text-xl">❌</div>
                    <p className="text-gray-300">Use apps once and forget</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-green-400 mb-4">After XspensesAI:</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-green-400 text-xl">✅</div>
                    <p className="text-gray-300">Excited to see new podcast episodes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-400 text-xl">✅</div>
                    <p className="text-gray-300">Look forward to AI conversations</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-400 text-xl">✅</div>
                    <p className="text-gray-300">Financial goals feel like game achievements</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-400 text-xl">✅</div>
                    <p className="text-gray-300">Money management becomes entertainment</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-400 text-xl">✅</div>
                    <p className="text-gray-300">Daily engagement with financial wellness</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revolutionary Statistics */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Revolutionary Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">5x</div>
              <div className="text-gray-300">More frequent finance checks</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">94%</div>
              <div className="text-gray-300">Report finance is 'genuinely enjoyable'</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">47 min</div>
              <div className="text-gray-300">Average session time</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-blue-400 mb-2">96%</div>
              <div className="text-gray-300">Still active after 6 months</div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">What Users Are Saying</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <p className="text-gray-300 italic mb-4">"I actually look forward to Monday mornings because that's when my financial podcast drops. My money story feels like a Netflix series I'm starring in."</p>
              <p className="text-cyan-400 font-semibold">- Sarah M.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <p className="text-gray-300 italic mb-4">"The AI therapist helped me overcome 20 years of money anxiety. I went from financial panic attacks to financial confidence in 30 days."</p>
              <p className="text-purple-400 font-semibold">- Jennifer K.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <p className="text-gray-300 italic mb-4">"My friends think I'm crazy for being excited about budgeting. XspensesAI turned the most boring task into my favorite hobby."</p>
              <p className="text-green-400 font-semibold">- Mike R.</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Fall in Love with Your Finances?</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link to="/signup" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-cyan-500/25 transform hover:scale-105">Start My Entertainment Journey</Link>
            <Link to="/ai-assistant" className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300">Listen to Sample Podcast</Link>
            <Link to="/ai-assistant" className="border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300">Try AI Therapist Session</Link>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            <p>Join 50,000+ users addicted to financial wellness</p>
            <p>150,000+ personal podcast episodes created</p>
            <p>87% reduction in money anxiety guaranteed</p>
            <p>The only platform that makes finance genuinely fun</p>
          </div>
        </div>

        {/* Revolutionary Positioning Statement */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-8 border border-cyan-400/30">
            <p className="text-xl text-white font-semibold">"This isn't financial software with entertainment bolted on. This is entertainment that happens to make you financially successful. XspensesAI is the Netflix of financial wellness - addictive, personalized, and genuinely enjoyable."</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection: React.FC = () => {
  const categories = [
    { key: 'smart', label: 'Smart Import AI' },
    { key: 'entertainment', label: 'Entertainment Features' },
    { key: 'pricing', label: 'Pricing & Plans' },
    { key: 'security', label: 'Security & Privacy' }
  ] as const;

  const [activeCategory, setActiveCategory] = useState<typeof categories[number]['key']>('smart');

  const faqs: Record<string, { q: string; a: string }[]> = {
    smart: [
      {
        q: 'What exactly is Smart Import AI?',
        a: "Smart Import AI is revolutionary technology that reads ANY financial document in 2.3 seconds with 99.7% accuracy. Upload bank statements, receipts, CSV exports, or photos - our AI instantly categorizes every transaction. It learns your patterns and never asks you to categorize 'Starbucks' as coffee again."
      },
      {
        q: 'Which banks and formats does it support?',
        a: 'Smart Import AI works with 500+ banks worldwide including Chase, Wells Fargo, Bank of America, and international institutions. Supports PDFs, CSV files, images, scanned documents, and even crumpled receipts. If it has financial data, our AI reads it perfectly.'
      },
      {
        q: 'How accurate is the AI categorization?',
        a: '99.7% accuracy that exceeds human accountants. Our AI learns from millions of transactions and gets smarter with every document processed. Users report eliminating 8+ hours of monthly manual work while achieving perfect categorization.'
      }
    ],
    entertainment: [
      {
        q: 'What are personal financial podcasts?',
        a: 'AI creates personalized podcast episodes about YOUR money journey. Like having a financial documentary about your spending patterns, goals, and achievements. Users share these episodes on social media and report checking their finances daily.'
      },
      {
        q: 'How does AI Financial Therapy work?',
        a: '24/7 emotional support for money anxiety and financial stress. Our AI understands the psychology behind spending and provides judgment-free therapy. 87% of users report reduced financial anxiety within 30 days.'
      }
    ],
    pricing: [
      {
        q: 'Is there a free version?',
        a: 'Yes! Process 10 documents monthly with full Smart Import AI accuracy. Experience the automation magic with 3 personal podcasts and 1 AI personality. No credit card required.'
      },
      {
        q: "What's the ROI of paid plans?",
        a: "Business plan users save $3,200+ annually in found tax deductions while paying $600/year. Personal plan users save 94 hours annually (worth $4,700) while paying $180/year. The platform literally pays for itself."
      }
    ],
    security: [
      {
        q: 'Is my financial data secure?',
        a: 'Ultimate privacy with zero data storage. We process your documents, extract insights, then delete everything. Bank-level encryption, SOC 2 compliance, and your data never leaves our secure processing environment.'
      },
      {
        q: 'How is this different from other expense apps?',
        a: "Other apps store your data and require manual work. XspensesAI processes everything automatically with zero storage. Plus, we're the only platform that makes financial management genuinely entertaining and engaging."
      }
    ]
  };

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="faq-section py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="gradient-text text-4xl md:text-5xl font-extrabold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">Everything you need to know about XspensesAI's revolutionary automation platform and how it ends manual expense work forever.</p>
        </div>

        {/* Category Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setOpenIndex(0); }}
              className={`px-4 py-2 rounded-full border transition-all duration-200 ${
                activeCategory === key
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-md'
                  : 'bg-black/20 text-gray-200 border-white/20 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqs[activeCategory].map((item, index) => (
            <div key={item.q} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <span className="font-semibold text-white">{item.q}</span>
                <span className="text-cyan-400 ml-4">{openIndex === index ? '−' : '+'}</span>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-5 pb-5 text-gray-300 leading-relaxed border-t border-white/10"
                  >
                    {item.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-300 mb-6">Still have questions? Chat with our AI team or start your free trial.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/ai-assistant" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-cyan-500/25">Chat with AI Assistant</Link>
            <Link to="/signup" className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300">Start Free Trial</Link>
          </div>
          <div className="text-sm text-gray-400 mt-4">Join 50,000+ users who've automated their finances</div>
        </div>
      </div>
    </section>
  );
};

export default NewHomePage;
