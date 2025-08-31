import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, FileText, Camera, Bot, Shield, Zap, Brain, MessageCircle, 
  ArrowRight, CheckCircle, Users, Award, Clock, Star, TrendingUp, Lock, 
  Sparkles, Target, BarChart3, PieChart, CreditCard, Receipt, 
  FileSpreadsheet, Download, Share2, Eye, Search, Filter, Calendar, 
  DollarSign, Percent, ArrowUpRight, CheckCircle2, XCircle, AlertCircle, 
  Info, Play, Pause, RotateCcw, Settings, Bell, User, ChevronRight, 
  ChevronLeft, Plus, Minus, Maximize2, Minimize2, Volume2, VolumeX, 
  SkipBack, SkipForward, Repeat, Shuffle, Heart, ThumbsUp, ThumbsDown, 
  MessageSquare, Phone, Mail, MapPin, Globe, Crown, Flame, Rocket
} from 'lucide-react';

const SmartImportAIFeaturePage = () => {
  const [activeDemo, setActiveDemo] = useState('processing');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Simulate processing progress for demo
  React.useEffect(() => {
    if (activeDemo === 'processing') {
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [activeDemo]);

  // AI Team Members for this feature
  const aiTeam = [
    {
      name: 'Byte',
      avatar: '📄',
      role: 'Data Wizard',
      specialty: 'Ultra-efficient data organization',
      superpower: '99.7% Accuracy in 2.3 Seconds',
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: 'Tag',
      avatar: '🏷️',
      role: 'Categorization Master',
      specialty: 'AI-powered transaction sorting',
      superpower: 'Self-Learning Categorization',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      name: 'Crystal',
      avatar: '🔮',
      role: 'Pattern Seer',
      specialty: 'Spending trend predictions',
      superpower: '94% Prediction Accuracy',
      color: 'from-indigo-500 to-blue-600'
    }
  ];

  // Processing stages for the demo
  const processingStages = [
    { stage: 'Upload', icon: '📤', status: 'complete' },
    { stage: 'OCR Processing', icon: '👁️', status: 'complete' },
    { stage: 'AI Analysis', icon: '🧠', status: 'active' },
    { stage: 'Categorization', icon: '🏷️', status: 'pending' },
    { stage: 'Learning', icon: '📚', status: 'pending' },
    { stage: 'Complete', icon: '✅', status: 'pending' }
  ];

  // Before/After data examples
  const dataTransformation = {
    before: [
      { text: 'AMZN Mktp US*1234567890', amount: '$45.67', category: 'Unknown' },
      { text: 'UBER *TRIP 1234567890', amount: '$23.45', category: 'Unknown' },
      { text: 'STARBUCKS STORE 123456', amount: '$5.99', category: 'Unknown' },
      { text: 'WALMART.COM 1234567890', amount: '$89.99', category: 'Unknown' }
    ],
    after: [
      { text: 'AMZN Mktp US*1234567890', amount: '$45.67', category: 'Shopping' },
      { text: 'UBER *TRIP 1234567890', amount: '$23.45', category: 'Transportation' },
      { text: 'STARBUCKS STORE 123456', amount: '$5.99', category: 'Food & Dining' },
      { text: 'WALMART.COM 1234567890', amount: '$89.99', category: 'Shopping' }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Helmet>
        <title>Smart Import AI - Revolutionary AI-Powered Document Processing | XspensesAI</title>
        <meta name="description" content="Experience the future of financial document processing. Watch Prime's AI team transform messy data into crystal-clear insights with 99.7% accuracy in 2.3 seconds. Join the AI Processing Theater!" />
      </Helmet>

      {/* Hero Section - AI Processing Theater */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            {/* Prime's Crown Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full text-lg mb-6 font-semibold border border-purple-500/30">
                <Crown size={20} className="mr-3" />
                Prime's AI Processing Theater
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-8"
            >
              Watch <span className="text-pink-400 font-extrabold drop-shadow-lg">AI Magic</span> Transform Your Data
            </motion.h1>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-2xl md:text-3xl font-bold text-white/90 mb-6"
            >
              Powered by <span className="text-yellow-400 font-extrabold drop-shadow-lg">Prime</span> & His AI Dream Team
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Step into the AI Processing Theater where <span className="text-yellow-300 font-bold">Prime</span> orchestrates a team of AI specialists to transform 
              messy bank statements, receipts, and documents into crystal-clear financial insights. 
              Watch the magic happen in real-time with <span className="text-yellow-300 font-bold">99.7% accuracy</span> and 
              <span className="text-cyan-300 font-bold"> 2.3-second processing</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
            >
              <Link 
                to="/dashboard/smart-import-ai"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                Experience AI Magic
              </Link>
              <button 
                onClick={() => setActiveDemo('processing')}
                className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play size={24} />
                Watch Live Demo
              </button>
            </motion.div>

            {/* Performance Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">99.7%</div>
                <div className="text-white/70 text-sm">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400">2.3s</div>
                <div className="text-white/70 text-sm">Processing Speed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">500+</div>
                <div className="text-white/70 text-sm">Banks Supported</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">24/7</div>
                <div className="text-white/70 text-sm">AI Processing</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Prime's Leadership Spotlight */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full flex items-center justify-center mr-4 shadow-2xl">
              <span className="text-4xl">👑</span>
            </div>
            <div className="text-left">
                             <h2 className="text-3xl md:text-4xl font-bold text-white">
                 Meet <span className="text-yellow-400 font-extrabold drop-shadow-lg">Prime</span>
               </h2>
              <p className="text-lg text-white/80">Your AI Strategic Commander</p>
            </div>
          </div>
          <p className="text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
            Prime doesn't just process documents - he orchestrates an entire AI symphony. 
            With strategic intelligence and flawless coordination, he ensures every transaction 
            is perfectly categorized, every pattern is discovered, and every insight is crystal clear.
          </p>
        </motion.div>
      </div>

      {/* AI Team Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🎭 Meet Your AI Processing Team
          </h2>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            Prime coordinates these AI specialists to deliver flawless document processing. 
            Each team member has unique superpowers designed for maximum efficiency.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {aiTeam.map((member, index) => (
            <motion.div 
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:scale-105 transition-all duration-300 group"
            >
              <div className="text-center mb-6">
                <div className={`w-24 h-24 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-4xl">{member.avatar}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                <p className="text-blue-400 text-lg font-medium">{member.role}</p>
                <p className="text-white/70 text-sm mt-2">{member.specialty}</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
                <p className="text-white font-semibold text-sm">⚡ {member.superpower}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live AI Processing Demo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-3xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🎬 Live AI Processing Theater
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              Watch Prime's AI team transform messy data into crystal-clear insights in real-time
            </p>
          </div>

          {/* Processing Stages */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {processingStages.map((stage, index) => (
              <div key={stage.stage} className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  stage.status === 'complete' ? 'bg-green-500/20 border border-green-500/50' :
                  stage.status === 'active' ? 'bg-blue-500/20 border border-blue-500/50 animate-pulse' :
                  'bg-white/10 border border-white/20'
                }`}>
                  <span className="text-2xl">{stage.icon}</span>
                </div>
                <p className={`text-sm font-medium ${
                  stage.status === 'complete' ? 'text-green-400' :
                  stage.status === 'active' ? 'text-blue-400' :
                  'text-white/50'
                }`}>
                  {stage.stage}
                </p>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-3 mb-8">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${processingProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Data Transformation Demo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Before */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <XCircle className="text-red-400" size={24} />
                Before AI Processing
              </h3>
              <div className="space-y-3">
                {dataTransformation.before.map((item, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/80 text-sm font-medium">{item.text}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-white font-semibold">{item.amount}</span>
                      <span className="text-red-400 text-xs bg-red-400/20 px-2 py-1 rounded">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-400" size={24} />
                After AI Processing
              </h3>
              <div className="space-y-3">
                {dataTransformation.after.map((item, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/80 text-sm font-medium">{item.text}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-white font-semibold">{item.amount}</span>
                      <span className="text-green-400 text-xs bg-green-400/20 px-2 py-1 rounded">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Supported Formats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            📁 Upload Anything, Get Everything
          </h2>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            From messy CSV exports to scanned receipts, our AI handles any format and instantly 
            organizes your financial data with surgical precision.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <FileText size={32} />,
              title: 'Bank Statements',
              description: 'PDF, CSV, Excel from 500+ banks',
              color: 'from-blue-500 to-indigo-600'
            },
            {
              icon: <Receipt size={32} />,
              title: 'Receipts & Invoices',
              description: 'Scanned, photographed, or digital',
              color: 'from-green-500 to-emerald-600'
            },
            {
              icon: <CreditCard size={32} />,
              title: 'Credit Card Statements',
              description: 'Any format, any bank, any year',
              color: 'from-purple-500 to-pink-600'
            },
            {
              icon: <FileSpreadsheet size={32} />,
              title: 'Business Documents',
              description: 'Expense reports, invoices, receipts',
              color: 'from-orange-500 to-red-600'
            }
          ].map((format, index) => (
            <motion.div 
              key={format.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 text-center"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${format.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <div className="text-white">
                  {format.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{format.title}</h3>
              <p className="text-white/70 text-sm">{format.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🎯 How Prime's AI Team Works
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              A sophisticated orchestration of AI specialists working in perfect harmony
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">1. Intelligent Upload</h3>
              <p className="text-white/80 text-sm">
                Byte analyzes your document format and prepares it for AI processing
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">2. AI Analysis</h3>
              <p className="text-white/80 text-sm">
                Tag and Crystal work together to categorize and predict patterns
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Rocket size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">3. Instant Results</h3>
              <p className="text-white/80 text-sm">
                Get perfectly organized data with insights in under 3 seconds
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Call to Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Experience AI Magic?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands who've transformed their financial data processing with Prime's AI team. 
            From chaos to clarity in seconds - that's the power of AI orchestration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard/smart-import-ai"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles size={24} />
              Start AI Processing
            </Link>
            <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
              <Users size={24} />
              Meet Your AI Team
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SmartImportAIFeaturePage;
