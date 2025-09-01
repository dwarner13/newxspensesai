import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Crown, Zap, Brain, Play, RefreshCw, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  superpower: string;
  demoQuote: string;
}

interface FeaturePreview {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  link: string;
  aiEmployee: string;
}

interface UserTestimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  savings: string;
  testimonial: string;
  aiEmployee: string;
}

const HomePage = () => {
  const [showAIDemo, setShowAIDemo] = useState(false);
  const [isAIDemoRunning, setIsAIDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);

  const [showPersonalityQuiz, setShowPersonalityQuiz] = useState(false);
  const [userSavings, setUserSavings] = useState(0);
  const [isCalculatingROI, setIsCalculatingROI] = useState(false);

  // AI Dream Team
  const aiDreamTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Boss & Director',
      avatar: '👑',
      specialty: 'Strategic Financial Orchestration',
      color: 'from-purple-500 to-pink-500',
      superpower: 'Orchestrates your complete financial empire with superhuman intelligence',
      demoQuote: 'I\'ve analyzed your financial patterns and orchestrated a strategy that will save you $4,700 this year.'
    },
    {
      name: 'Byte',
      role: 'AI Process Optimizer',
      avatar: '⚙️',
      specialty: 'Superhuman Document Processing',
      color: 'from-blue-500 to-cyan-500',
      superpower: 'Processes any financial document in 2.3 seconds with 99.7% accuracy',
      demoQuote: 'Just processed 47 bank statements. Found 12 uncategorized business meals worth $340!'
    },
    {
      name: 'Tag',
      role: 'AI Rule Engine',
      avatar: '🏷️',
      specialty: 'Intelligent Categorization',
      color: 'from-green-500 to-emerald-500',
      superpower: 'Creates and manages intelligent automation rules that never fail',
      demoQuote: 'I\'ve created smart rules that automatically categorize your expenses with perfect accuracy.'
    },
    {
      name: 'Crystal',
      role: 'AI Prediction Engine',
      avatar: '🔮',
      specialty: 'Future Financial Predictions',
      color: 'from-indigo-500 to-purple-500',
      superpower: 'Predicts your financial future with 99.7% accuracy',
      demoQuote: 'You\'ll overspend on dining next week. Should I adjust your budget automatically?'
    }
  ];

  // Revolutionary Features
  const revolutionaryFeatures: FeaturePreview[] = [
    {
      id: 'smart-automation',
      title: 'AI Smart Automation',
      description: 'Complete autonomous financial control with 200+ daily AI decisions',
      icon: '🤖',
      color: 'from-purple-500 to-pink-500',
      link: '/features/smart-automation',
      aiEmployee: 'Prime'
    },
    {
      id: 'tax-assistant',
      title: 'AI Tax Assistant',
      description: 'Revolutionary AI that finds deductions and optimizes your taxes',
      icon: '📊',
      color: 'from-blue-500 to-cyan-500',
      link: '/features/tax-assistant',
      aiEmployee: 'Tag'
    },
    {
      id: 'business-intelligence',
      title: 'AI Business Intelligence',
      description: 'AI-powered business insights and strategy recommendations',
      icon: '📈',
      color: 'from-green-500 to-emerald-500',
      link: '/features/business-intelligence',
      aiEmployee: 'Crystal'
    },
    {
      id: 'wellness-studio',
      title: 'AI Wellness Studio',
      description: 'Complete financial wellness and emotional support system',
      icon: '🧘',
      color: 'from-indigo-500 to-purple-500',
      link: '/features/wellness-studio',
      aiEmployee: 'Prime'
    },
    {
      id: 'personal-podcast',
      title: 'AI Personal Podcast',
      description: 'Your AI employees create personalized financial podcasts about YOUR money story',
      icon: '🎙️',
      color: 'from-orange-500 to-red-500',
      link: '/features/personal-podcast',
      aiEmployee: 'Prime, Goalie, Crystal, Blitz'
    },
    {
      id: 'spotify-integration',
      title: 'AI Spotify Integration',
      description: 'AI-powered music that makes financial tasks enjoyable',
      icon: '🎵',
      color: 'from-pink-500 to-purple-500',
      link: '/features/spotify-integration',
      aiEmployee: 'Byte'
    }
  ];

  // Live User Testimonials
  const liveTestimonials: UserTestimonial[] = [
    {
      id: '1',
      name: 'Sarah M.',
      role: 'Small Business Owner',
      avatar: 'SM',
      savings: '$4,700',
      testimonial: 'Prime orchestrated my entire financial strategy. I saved $4,700 in the first year!',
      aiEmployee: 'Prime'
    },
    {
      id: '2',
      name: 'Mike R.',
      role: 'Freelance Developer',
      avatar: 'MR',
      savings: '$2,300',
      testimonial: 'Byte processes my receipts in seconds. I get hours of my life back every week!',
      aiEmployee: 'Byte'
    },
    {
      id: '3',
      name: 'Jennifer L.',
      role: 'Marketing Consultant',
      avatar: 'JL',
      savings: '$3,200',
      testimonial: 'Tag\'s smart categorization found $3,200 in missed tax deductions!',
      aiEmployee: 'Tag'
    },
    {
      id: '4',
      name: 'David K.',
      role: 'Product Manager',
      avatar: 'DK',
      savings: '$1,800',
      testimonial: 'Crystal predicted my spending patterns and helped me save $1,800 this quarter!',
      aiEmployee: 'Crystal'
    },
    {
      id: '5',
      name: 'Emma T.',
      role: 'Financial Analyst',
      avatar: 'ET',
      savings: '$5,200',
      testimonial: 'The personal podcasts are incredible! I listen while commuting and feel so much more connected to my finances.',
      aiEmployee: 'Prime, Goalie, Crystal, Blitz'
    },
    {
      id: '6',
      name: 'Alex R.',
      role: 'Entrepreneur',
      avatar: 'AR',
      savings: '$3,800',
      testimonial: 'Goalie\'s motivational episodes keep me on track with my goals. It\'s like having a personal financial coach!',
      aiEmployee: 'Goalie'
    }
  ];

  // Demo Functions
  const startAIDemo = () => {
    setIsAIDemoRunning(true);
    setDemoProgress(0);
    
    const interval = setInterval(() => {
      setDemoProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAIDemoRunning(false);
          return 100;
        }
        return prev + 20;
      });
    }, 500);
  };

  const calculateROI = () => {
    setIsCalculatingROI(true);
    setTimeout(() => {
      setUserSavings(Math.floor(Math.random() * 5000) + 2000);
      setIsCalculatingROI(false);
    }, 2000);
  };

  return (
    <>
      <Helmet>
        <title>XspensesAI - Revolutionary AI Financial Management | Prime's AI Empire</title>
        <meta name="description" content="Experience the future of financial management with Prime's AI Empire. Revolutionary AI automation, 99.7% accuracy, and complete financial control. Join 50,000+ users who've transformed their financial lives." />
        <meta name="keywords" content="AI financial management, Prime AI, Byte AI, Tag AI, Crystal AI, smart automation, AI expense tracking, revolutionary AI, financial AI team" />
        <meta property="og:title" content="XspensesAI - Revolutionary AI Financial Management | Prime's AI Empire" />
        <meta property="og:description" content="Experience the future of financial management with Prime's AI Empire." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="XspensesAI - Revolutionary AI Financial Management | Prime's AI Empire" />
        <meta name="twitter:description" content="Experience the future of financial management with Prime's AI Empire." />
      </Helmet>

      {/* Hero Section - Prime's AI Empire */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
                         <div className="text-center mb-12">
               <motion.div 
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6 }}
                 className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3"
               >
                 <Crown size={20} className="text-yellow-400" />
                 <span className="text-white font-semibold">Smart-Categorizing AI</span>
               </motion.div>
             </div>
                
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              XspensesAI: The World's First<br />
              <span className="text-purple-400">
                Fintech Entertainment Platform
              </span><br />
              That Works While You Play
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Meet <span className="text-purple-400 font-semibold">Prime</span> (AI Boss), <span className="text-blue-400 font-semibold">Byte</span> (Process Optimizer), <span className="text-green-400 font-semibold">Tag</span> (Smart Categorizer), and <span className="text-indigo-400 font-semibold">Crystal</span> (Prediction Engine) - your dedicated AI employees who work 24/7 to categorize expenses, predict spending, and entertain you while managing your finances with 99.7% accuracy.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
            >
              <button 
                onClick={() => setShowAIDemo(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Play size={24} />
                Enter AI Empire
              </button>
              <button 
                onClick={startAIDemo}
                className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Zap size={24} />
                Watch AI Demo
              </button>
            </motion.div>

            {/* Live Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {[
                { number: '99.7%', label: 'AI Accuracy', icon: '🎯' },
                { number: '2.3s', label: 'Processing Speed', icon: '⚡' },
                { number: '200+', label: 'Daily AI Decisions', icon: '🤖' },
                { number: '$4.7M', label: 'User Savings', icon: '💰' }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold text-cyan-400 mb-1">{stat.number}</div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
          </div>
              ))}
            </motion.div>
            </div>
          </div>
        </div>
        
      {/* AI Dream Team Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Meet Your AI Dream Team</h2>
          <p className="text-white/80 text-lg max-w-3xl mx-auto">Four revolutionary AI employees, each with unique superpowers, working together to transform your financial life</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {aiDreamTeam.map((member, index) => (
            <motion.div 
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 cursor-pointer"

            >
              <div className="text-center">
                <div className="text-6xl mb-4">{member.avatar}</div>
                <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                <p className="text-cyan-400 font-semibold mb-3">{member.role}</p>
                <p className="text-white/70 text-sm mb-4">{member.specialty}</p>
                <div className={`w-full h-1 bg-gradient-to-r ${member.color} rounded-full mb-4`}></div>
                <p className="text-white/60 text-xs">{member.superpower}</p>
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/80 text-xs italic">"{member.demoQuote}"</p>
      </div>
              </div>
            </motion.div>
          ))}
          </div>
        </div>
        
      {/* Live AI Demo */}
      {isAIDemoRunning && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Live AI Empire Demo</h2>
              <p className="text-white/80">Watch Prime orchestrate your AI team in real-time</p>
      </div>
      
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Empire Activation</h3>
                <span className="text-cyan-400 font-bold">{demoProgress}%</span>
    </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${demoProgress}%` }}
                ></div>
      </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {demoProgress < 25 && "Prime is analyzing your financial patterns..."}
                  {demoProgress >= 25 && demoProgress < 50 && "Byte is optimizing your document processing..."}
                  {demoProgress >= 50 && demoProgress < 75 && "Tag is creating intelligent automation rules..."}
                  {demoProgress >= 75 && demoProgress < 100 && "Crystal is predicting your financial future..."}
                  {demoProgress >= 100 && "Your AI Empire is now live and ready to serve!"}
                </p>
            </div>
          </div>
          </motion.div>
            </div>
      )}

      {/* Revolutionary Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Revolutionary AI Features</h2>
          <p className="text-white/80 text-lg max-w-3xl mx-auto">Experience the future of financial management with our revolutionary AI-powered features</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {revolutionaryFeatures.map((feature, index) => (
            <motion.div 
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70 text-sm mb-4">{feature.description}</p>
                <div className={`w-full h-1 bg-gradient-to-r ${feature.color} rounded-full mb-4`}></div>
                <p className="text-white/60 text-xs mb-4">Powered by {feature.aiEmployee}</p>
                <Link 
                  to={feature.link}
                  className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Experience Now
                </Link>
            </div>
            </motion.div>
          ))}
          </div>
        </div>

      {/* Live User Testimonials */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Live User Success Stories</h2>
            <p className="text-white/80">Real users, real savings, real AI transformations</p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveTestimonials.map((testimonial, index) => (
              <motion.div 
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
            </div>
                  <div>
                    <h4 className="font-semibold text-white">{testimonial.name}</h4>
                    <p className="text-white/70 text-sm">{testimonial.role}</p>
                    <div className="text-green-400 font-bold text-lg">{testimonial.savings} saved</div>
          </div>
            </div>
                <p className="text-white/80 text-sm mb-3">"{testimonial.testimonial}"</p>
                <div className="text-cyan-400 text-xs">Powered by {testimonial.aiEmployee}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        </div>

      {/* ROI Calculator */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Calculate Your AI Savings</h2>
          <p className="text-white/80 mb-8">See how much Prime's AI Empire can save you</p>
          
          <button 
            onClick={calculateROI}
            disabled={isCalculatingROI}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 mx-auto"
          >
            {isCalculatingROI ? (
              <>
                <RefreshCw size={24} className="animate-spin" />
                AI is Calculating...
              </>
            ) : (
              <>
                <Calculator size={24} />
                Calculate My Savings
              </>
            )}
          </button>

          {userSavings > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-8 bg-white/10 rounded-xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-2">Your AI Savings Potential</h3>
              <div className="text-4xl font-bold text-green-400 mb-2">${userSavings.toLocaleString()}</div>
              <p className="text-white/80">Annual savings with Prime's AI Empire</p>
            </motion.div>
          )}
        </motion.div>
              </div>

      {/* AI Capability Tester */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Test Your AI Knowledge</h2>
            <p className="text-white/80">Challenge yourself with AI financial questions</p>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { question: "How fast can AI process 100 receipts?", answer: "2.3 seconds", difficulty: "Easy" },
              { question: "What's the AI accuracy rate?", answer: "99.7%", difficulty: "Medium" },
              { question: "How many AI decisions per day?", answer: "200+", difficulty: "Hard" }
            ].map((quiz, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10"
              >
          <div className="text-center">
                  <div className="text-2xl mb-4">🧠</div>
                  <h3 className="font-semibold text-white mb-2">{quiz.question}</h3>
                  <p className="text-cyan-400 font-bold text-lg mb-2">{quiz.answer}</p>
                  <span className="text-white/60 text-sm">{quiz.difficulty}</span>
              </div>
              </motion.div>
            ))}
              </div>
        </motion.div>
            </div>
          
      {/* Live AI Performance Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Live AI Performance Dashboard</h2>
          <p className="text-white/80 text-lg max-w-3xl mx-auto">Real-time metrics from Prime's AI Empire</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { metric: 'Documents Processed', value: '47,892', icon: '📄', color: 'text-blue-400' },
            { metric: 'AI Decisions Made', value: '12,847', icon: '🤖', color: 'text-purple-400' },
            { metric: 'Money Saved', value: '$2.3M', icon: '💰', color: 'text-green-400' },
            { metric: 'Users Served', value: '50,000+', icon: '👥', color: 'text-orange-400' }
          ].map((stat, index) => (
            <motion.div 
              key={stat.metric}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center"
            >
              <div className="text-4xl mb-4">{stat.icon}</div>
              <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
              <div className="text-white/70 text-sm">{stat.metric}</div>
            </motion.div>
          ))}
          </div>
            </div>
          
      {/* AI Goal Tracker */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">AI Goal Tracker</h2>
            <p className="text-white/80">Set financial goals and let AI help you achieve them</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { goal: 'Save $10,000', progress: 75, aiTip: 'Prime suggests: Cut dining out by 30%' },
              { goal: 'Pay off $5,000 debt', progress: 60, aiTip: 'Crystal predicts: Achievable in 8 months' },
              { goal: 'Invest $2,000', progress: 90, aiTip: 'Tag found: $500 in tax deductions' }
            ].map((goal, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10"
              >
                <h3 className="font-semibold text-white mb-3">{goal.goal}</h3>
                <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
          </div>
                <p className="text-white/70 text-sm">{goal.progress}% Complete</p>
                <p className="text-cyan-400 text-xs mt-2 italic">"{goal.aiTip}"</p>
              </motion.div>
            ))}
        </div>
        </motion.div>
              </div>
          
      {/* Future Financial Predictor */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">🔮 Future Financial Predictor</h2>
            <p className="text-white/80">See your financial future with AI-powered predictions</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-2">With AI Empire</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">$47,000</div>
              <p className="text-white/70">Projected savings in 5 years</p>
            </div>
          <div className="text-center">
              <div className="text-6xl mb-4">📉</div>
              <h3 className="text-xl font-bold text-white mb-2">Without AI</h3>
              <div className="text-3xl font-bold text-red-400 mb-4">$12,000</div>
              <p className="text-white/70">Projected savings in 5 years</p>
          </div>
              </div>
        </motion.div>
            </div>

      {/* AI Achievement System */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">🏆 AI Achievement System</h2>
          <p className="text-white/80 text-lg max-w-3xl mx-auto">Unlock achievements as you master your finances with AI</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { achievement: 'First AI Decision', icon: '🤖', unlocked: true },
            { achievement: 'Savings Master', icon: '💰', unlocked: true },
            { achievement: 'Tax Optimizer', icon: '📊', unlocked: false },
            { achievement: 'AI Empire Ruler', icon: '👑', unlocked: false }
          ].map((achievement, index) => (
            <motion.div 
              key={achievement.achievement}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center ${achievement.unlocked ? 'opacity-100' : 'opacity-50'}`}
            >
              <div className="text-4xl mb-4">{achievement.icon}</div>
              <h3 className="font-semibold text-white mb-2">{achievement.achievement}</h3>
              <div className={`text-sm ${achievement.unlocked ? 'text-green-400' : 'text-white/50'}`}>
                {achievement.unlocked ? 'Unlocked' : 'Locked'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Join Prime's AI Empire?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Experience the future of financial management with revolutionary AI automation, 99.7% accuracy, and complete autonomous control. Join 50,000+ users who've transformed their financial lives.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/pricing"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Crown size={24} />
              Start Free Forever
            </Link>
            <button 
              onClick={() => setShowPersonalityQuiz(true)}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Brain size={24} />
              Find My AI Match
          </button>
          </div>
        </motion.div>
        </div>
        
      {/* AI Voice Commands Demo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">🎤 AI Voice Commands</h2>
            <p className="text-white/80">Control your finances with voice commands</p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { command: "Hey Prime, analyze my spending", response: "Analyzing your patterns..." },
              { command: "Byte, categorize my receipts", response: "Processing 47 documents..." },
              { command: "Crystal, predict my budget", response: "Forecasting next month..." }
            ].map((voice, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10"
              >
                <div className="text-center">
                  <div className="text-3xl mb-4">🎤</div>
                  <h3 className="font-semibold text-white mb-2">"{voice.command}"</h3>
                  <p className="text-cyan-400 text-sm italic">"{voice.response}"</p>
            </div>
              </motion.div>
            ))}
            </div>
        </motion.div>
            </div>

      {/* Global AI Network */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">🌍 Global AI Network</h2>
          <p className="text-white/80 text-lg max-w-3xl mx-auto">Prime's AI Empire spans the globe</p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { country: 'United States', users: '25,000+', savings: '$1.2M', icon: '🇺🇸' },
            { country: 'Canada', users: '8,500+', savings: '$450K', icon: '🇨🇦' },
            { country: 'United Kingdom', users: '12,300+', savings: '$680K', icon: '🇬🇧' },
            { country: 'Australia', users: '4,200+', savings: '$220K', icon: '🇦🇺' }
          ].map((region, index) => (
            <motion.div 
              key={region.country}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center"
            >
              <div className="text-4xl mb-4">{region.icon}</div>
              <h3 className="font-semibold text-white mb-2">{region.country}</h3>
              <div className="text-cyan-400 font-bold text-lg mb-1">{region.users}</div>
              <div className="text-green-400 font-bold text-lg mb-2">{region.savings}</div>
              <div className="text-white/70 text-sm">Total Savings</div>
            </motion.div>
          ))}
          </div>
        </div>
        
      {/* AI Entertainment Theater */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">🎪 AI Entertainment Theater</h2>
            <p className="text-white/80">Interactive AI games and financial entertainment</p>
        </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                game: 'AI Financial Trivia', 
                description: 'Test your financial knowledge with AI-generated questions',
                icon: '🎯', 
                players: '2,847',
                difficulty: 'Easy',
                rewards: '500 pts',
                aiHost: 'Prime'
              },
              { 
                game: 'AI Budget Challenge', 
                description: 'Beat AI in real-time budget optimization challenges',
                icon: '🏆', 
                players: '1,234',
                difficulty: 'Medium',
                rewards: '1000 pts',
                aiHost: 'Tag'
              },
              { 
                game: 'AI Savings Race', 
                description: 'Race against time to save money with AI assistance',
                icon: '🏃', 
                players: '3,456',
                difficulty: 'Hard',
                rewards: '1500 pts',
                aiHost: 'Crystal'
              },
              { 
                game: 'AI Investment Simulator', 
                description: 'Practice investing with AI market predictions',
                icon: '📈', 
                players: '892',
                difficulty: 'Expert',
                rewards: '2000 pts',
                aiHost: 'Crystal'
              },
              { 
                game: 'AI Tax Detective', 
                description: 'Find hidden tax deductions with AI clues',
                icon: '🔍', 
                players: '1,567',
                difficulty: 'Medium',
                rewards: '1200 pts',
                aiHost: 'Tag'
              },
              { 
                game: 'AI Financial Quiz Show', 
                description: 'Compete in live AI-hosted financial quiz shows',
      icon: '🎤',
                players: '4,123',
                difficulty: 'Mixed',
                rewards: '800 pts',
                aiHost: 'Prime'
              }
            ].map((game, index) => (
            <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10 text-center cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{game.icon}</div>
                <h3 className="font-semibold text-white mb-2">{game.game}</h3>
                <p className="text-white/70 text-sm mb-3">{game.description}</p>
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-cyan-400 font-bold">{game.players} players</span>
                  <span className="text-green-400">{game.rewards}</span>
              </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    game.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300' :
                    game.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    game.difficulty === 'Hard' ? 'bg-red-500/20 text-red-300' :
                    'bg-purple-500/20 text-purple-300'
                  }`}>
                    {game.difficulty}
                  </span>
                  <span className="text-purple-300 text-xs">Host: {game.aiHost}</span>
                </div>
            </motion.div>
          ))}
        </div>

          <div className="text-center mt-8">
            <button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-500 hover:to-pink-500 transition-all duration-300">
              Play AI Games Now
            </button>
              </div>
        </motion.div>
        </div>

      {/* AI Market Predictor */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">📊 AI Market Predictor</h2>
            <p className="text-white/80">Crystal's market insights and predictions</p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-2">Market Prediction</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">+12.7%</div>
              <p className="text-white/70">S&P 500 next quarter</p>
              <p className="text-cyan-400 text-sm mt-2">Crystal's confidence: 94.2%</p>
          </div>
            <div className="text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-white mb-2">Investment Tip</h3>
              <div className="text-2xl font-bold text-blue-400 mb-4">Tech Sector</div>
              <p className="text-white/70">Best performing sector</p>
              <p className="text-cyan-400 text-sm mt-2">AI recommendation</p>
        </div>
      </div>
        </motion.div>
        </div>

      {/* AI Health Score */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">❤️ AI Financial Health Score</h2>
            <p className="text-white/80">Get your personalized financial health rating</p>
              </div>
              
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { metric: 'Savings Rate', score: '85', color: 'text-green-400', icon: '💰' },
              { metric: 'Debt Ratio', score: '12', color: 'text-blue-400', icon: '📊' },
              { metric: 'Investment', score: '78', color: 'text-purple-400', icon: '📈' },
              { metric: 'Emergency Fund', score: '92', color: 'text-emerald-400', icon: '🛡️' }
            ].map((health, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10 text-center"
              >
                <div className="text-3xl mb-3">{health.icon}</div>
                <h3 className="font-semibold text-white mb-2">{health.metric}</h3>
                <div className={`text-2xl font-bold ${health.color} mb-2`}>{health.score}/100</div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${health.color.replace('text-', '')} h-2 rounded-full`}
                    style={{ width: `${health.score}%` }}
                  ></div>
                </div>
              </motion.div>
            ))}
                </div>
        </motion.div>
              </div>

      {/* AI Speed Comparison */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">⚡ AI vs Human Speed</h2>
            <p className="text-white/80">See how AI outperforms human processing</p>
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-white mb-2">AI Processing</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">2.3 seconds</div>
              <p className="text-white/70">100 receipts processed</p>
              <p className="text-white/70">99.7% accuracy</p>
              <p className="text-white/70">24/7 operation</p>
                  </div>
                <div className="text-center">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-bold text-white mb-2">Human Processing</h3>
              <div className="text-3xl font-bold text-red-400 mb-4">2.5 hours</div>
              <p className="text-white/70">100 receipts processed</p>
              <p className="text-white/70">85% accuracy</p>
              <p className="text-white/70">8 hours/day</p>
                  </div>
                </div>
        </motion.div>
            </div>

      {/* AI Video Content Hub */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">🎬 AI Video Content Hub</h2>
            <p className="text-white/80">AI-generated videos about YOUR financial journey</p>
              </div>
              
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: 'AI Financial Analysis Video', 
                description: 'Personalized video breakdown of your spending patterns',
                duration: '3:45',
                views: '2.1K',
                thumbnail: '📊',
                aiGenerated: true,
                category: 'Analysis'
              },
              { 
                title: 'AI Budget Tutorial Video', 
                description: 'AI creates custom budget tutorial just for you',
                duration: '5:12',
                views: '1.8K',
                thumbnail: '💰',
                aiGenerated: true,
                category: 'Tutorial'
              },
              { 
                title: 'AI Investment Strategy Video', 
                description: 'Crystal explains your personalized investment strategy',
                duration: '4:23',
                views: '3.4K',
                thumbnail: '📈',
                aiGenerated: true,
                category: 'Strategy'
              },
              { 
                title: 'AI Tax Optimization Video', 
                description: 'Tag shows you how to optimize your taxes',
                duration: '6:18',
                views: '2.7K',
                thumbnail: '📋',
                aiGenerated: true,
                category: 'Tax'
              },
              { 
                title: 'AI Financial Goals Video', 
                description: 'Prime creates motivational video about your goals',
                duration: '2:56',
                views: '4.2K',
                thumbnail: '🎯',
                aiGenerated: true,
                category: 'Motivation'
              },
              { 
                title: 'AI Market Update Video', 
                description: 'Weekly AI-generated market analysis and predictions',
                duration: '7:34',
                views: '5.1K',
                thumbnail: '🌍',
                aiGenerated: true,
                category: 'Market'
              }
            ].map((video, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10 text-center cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{video.thumbnail}</div>
                <h3 className="font-semibold text-white mb-2">{video.title}</h3>
                <p className="text-white/70 text-sm mb-3">{video.description}</p>
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-cyan-400">{video.duration}</span>
                  <span className="text-white/60">{video.views} views</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full">
                    {video.category}
                  </span>
                  <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">
                    AI Generated
                  </span>
                </div>
              </motion.div>
            ))}
                </div>

          <div className="text-center mt-8">
            <button className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-500 hover:to-red-500 transition-all duration-300">
              Generate My AI Video
            </button>
                </div>
        </motion.div>
              </div>

      {/* AI Chat Integration */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">💬 AI Chat Integration</h2>
            <p className="text-white/80">Chat with Prime's AI team in real-time</p>
              </div>

          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                👑
              </div>
            <div>
                <h3 className="font-semibold text-white">Prime</h3>
                <p className="text-white/70 text-sm">AI Boss & Director</p>
              </div>
                </div>
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-white/80 text-sm">"Hello! I'm Prime, your AI financial director. I can help you with budgeting, investment strategies, and financial planning. What would you like to discuss today?"</p>
                </div>
            <div className="flex gap-2">
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:from-pink-500 hover:to-purple-500 transition-all duration-300">
                Ask about Budgeting
              </button>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:from-pink-500 hover:to-purple-500 transition-all duration-300">
                Investment Advice
              </button>
                </div>
                </div>
        </motion.div>
              </div>

      {/* AI Leaderboard & Rewards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">🏆 AI Leaderboard & Rewards</h2>
            <p className="text-white/80">Compete with other users and earn AI rewards</p>
            </div>

          <div className="space-y-4 mb-8">
            {[
              { rank: 1, name: 'Sarah M.', points: '12,847', reward: '🏆 AI Empire Master', savings: '$4,700' },
              { rank: 2, name: 'Mike R.', points: '10,234', reward: '🥈 AI Strategist', savings: '$2,300' },
              { rank: 3, name: 'Jennifer L.', points: '8,921', reward: '🥉 AI Optimizer', savings: '$3,200' },
              { rank: 4, name: 'David K.', points: '7,456', reward: '💎 AI Enthusiast', savings: '$1,800' }
            ].map((leader, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex items-center justify-between bg-white/10 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {leader.rank}
                    </div>
                  <div>
                    <h3 className="font-semibold text-white">{leader.name}</h3>
                    <p className="text-white/70 text-sm">{leader.reward}</p>
                  </div>
                    </div>
                <div className="text-right">
                  <div className="text-cyan-400 font-bold">{leader.points} pts</div>
                  <div className="text-green-400 text-sm">{leader.savings} saved</div>
                    </div>
              </motion.div>
            ))}
        </div>

                <div className="text-center">
            <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all duration-300">
              Join the Competition
            </button>
                    </div>
        </motion.div>
            </div>

      {/* AI Demo Modal */}
      <AnimatePresence>
        {showAIDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAIDemo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to Prime's AI Empire</h2>
                <p className="text-white/80">Experience the future of financial management</p>
              </div>
              
              <div className="space-y-4 mb-8">
                {aiDreamTeam.map((member) => (
                  <div key={member.name} className="flex items-center gap-4 p-4 bg-white/10 rounded-lg">
                    <div className="text-3xl">{member.avatar}</div>
                    <div>
                      <h3 className="font-semibold text-white">{member.name}</h3>
                      <p className="text-white/70 text-sm">{member.role}</p>
                </div>
                </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowAIDemo(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                <Link 
                  to="/pricing"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Start My AI Empire
                </Link>
                  </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Personality Quiz Modal */}
      <AnimatePresence>
        {showPersonalityQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPersonalityQuiz(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Find Your Perfect AI Match</h2>
                <p className="text-white/80">Discover which AI employee matches your financial style</p>
      </div>

              <div className="space-y-4 mb-8">
                {aiDreamTeam.map((member) => (
            <button
                    key={member.name}
                    onClick={() => setShowPersonalityQuiz(false)}
                    className="w-full flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <div className="text-3xl">{member.avatar}</div>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{member.name}</h3>
                      <p className="text-white/70 text-sm">{member.role}</p>
                    </div>
            </button>
          ))}
        </div>

              <div className="flex gap-4 justify-center">
              <button
                  onClick={() => setShowPersonalityQuiz(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                  Close
              </button>
                <Link 
                  to="/ai-employees"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Meet All AI Employees
                </Link>
              </div>
            </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
    </>
  );
};

export default HomePage;
