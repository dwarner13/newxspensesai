import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Headphones, 
  Mic, 
  Play, 
  Users, 
  Clock, 
  Star, 
  Zap,
  Brain,
  Crown,
  Target,
  TrendingUp,
  MessageSquare,
  Volume2,
  Settings,
  BarChart3,
  Heart,
  Share2,
  Download,
  Calendar
} from 'lucide-react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

export default function PersonalPodcastPage() {
  const aiEmployees = [
    {
      name: 'Prime',
      role: 'Strategic Financial Advisor',
      avatar: '👑',
      color: 'from-purple-500 to-pink-500',
      voice: 'Confident and authoritative',
      specialty: 'Financial strategy and big-picture insights',
      quote: '"I\'ve analyzed your financial patterns and orchestrated a strategy that will save you $4,700 this year."'
    },
    {
      name: 'Goalie',
      role: 'Motivational Goal Coach',
      avatar: '🥅',
      color: 'from-green-500 to-emerald-500',
      voice: 'Energetic and encouraging',
      specialty: 'Goal progress and motivation',
      quote: '"You\'re 73% to your emergency fund goal! Let\'s push for that final stretch together."'
    },
    {
      name: 'Crystal',
      role: 'Mysterious Predictor',
      avatar: '🔮',
      color: 'from-indigo-500 to-purple-500',
      voice: 'Mysterious and insightful',
      specialty: 'Future predictions and trends',
      quote: '"I see a pattern in your dining expenses. You\'ll likely overspend next week - should I adjust your budget?"'
    },
    {
      name: 'Blitz',
      role: 'Efficiency Expert',
      avatar: '⚡',
      color: 'from-yellow-500 to-orange-500',
      voice: 'Fast-paced and dynamic',
      specialty: 'Automation wins and efficiency gains',
      quote: '"Your automation rules saved you 3.2 hours this week! That\'s $640 in time value."'
    }
  ];

  const episodeTypes = [
    {
      type: 'Weekly Summary',
      duration: '5-7 minutes',
      icon: <Calendar className="h-6 w-6" />,
      description: 'Your week in review with key insights and actionable takeaways',
      aiEmployees: ['Prime', 'Goalie', 'Crystal', 'Blitz'],
      benefits: ['Quick overview', 'Actionable insights', 'Goal progress update']
    },
    {
      type: 'Monthly Deep Dive',
      duration: '12-15 minutes',
      icon: <BarChart3 className="h-6 w-6" />,
      description: 'Comprehensive monthly analysis with trends and predictions',
      aiEmployees: ['Prime', 'Crystal', 'Goalie', 'Blitz'],
      benefits: ['Detailed analysis', 'Trend identification', 'Strategic planning']
    },
    {
      type: 'Goal Progress',
      duration: '8-10 minutes',
      icon: <Target className="h-6 w-6" />,
      description: 'Focused episode on your financial goals and achievements',
      aiEmployees: ['Goalie', 'Prime', 'Crystal'],
      benefits: ['Goal tracking', 'Motivation boost', 'Milestone celebration']
    },
    {
      type: 'Automation Success',
      duration: '6-8 minutes',
      icon: <Zap className="h-6 w-6" />,
      description: 'Celebrating your automation wins and efficiency gains',
      aiEmployees: ['Blitz', 'Prime', 'Goalie'],
      benefits: ['Efficiency insights', 'Time savings', 'Automation tips']
    }
  ];

  const features = [
    {
      icon: <Mic className="h-8 w-8 text-purple-600" />,
      title: 'AI Employee Voices',
      description: 'Each AI employee has a unique voice personality and speaking style',
      details: ['Prime: Confident and authoritative', 'Goalie: Energetic and encouraging', 'Crystal: Mysterious and insightful', 'Blitz: Fast-paced and dynamic']
    },
    {
      icon: <Brain className="h-8 w-8 text-blue-600" />,
      title: 'Personalized Content',
      description: 'Episodes tailored to your financial data, goals, and preferences',
      details: ['Your actual spending data', 'Personal financial goals', 'Custom voice preferences', 'Content focus areas']
    },
    {
      icon: <Volume2 className="h-8 w-8 text-green-600" />,
      title: 'Professional Audio',
      description: 'High-quality audio production with multiple AI voices',
      details: ['Studio-quality audio', 'Multiple voice actors', 'Background music', 'Professional editing']
    },
    {
      icon: <Settings className="h-8 w-8 text-orange-600" />,
      title: 'Customizable Experience',
      description: 'Control every aspect of your podcast experience',
      details: ['Episode length preferences', 'Voice style selection', 'Content focus areas', 'Generation frequency']
    }
  ];

  const benefits = [
    {
      icon: <Clock className="h-6 w-6 text-green-600" />,
      title: 'Save Time',
      description: 'Get financial insights while commuting, exercising, or multitasking',
      stat: 'Save 2-3 hours per week'
    },
    {
      icon: <Brain className="h-6 w-6 text-blue-600" />,
      title: 'Better Understanding',
      description: 'Audio format helps you absorb financial information more effectively',
      stat: '3x better retention'
    },
    {
      icon: <Heart className="h-6 w-6 text-red-600" />,
      title: 'Stay Motivated',
      description: 'Regular episodes keep you engaged with your financial goals',
      stat: '85% higher goal completion'
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      title: 'Track Progress',
      description: 'Visual and audio progress tracking keeps you accountable',
      stat: '2.5x more consistent'
    }
  ];

  return (
    <WebsiteLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md border border-orange-200 rounded-full px-6 py-3 mb-6">
              <Headphones size={20} className="text-orange-600" />
              <span className="text-orange-800 font-semibold">Revolutionary Feature</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Personal Financial Podcast
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              Meet your AI podcast hosts - Prime, Goalie, Crystal, and Blitz. They create personalized financial podcasts about YOUR money story, delivered in their unique voices.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                to="/signup"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Start Your Podcast Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button className="inline-flex items-center px-6 py-3 border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white font-medium rounded-lg transition-all duration-300">
                <Play className="mr-2 h-5 w-5" />
                Listen to Sample
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">4</div>
                <div className="text-sm text-gray-600">AI Hosts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">4</div>
                <div className="text-sm text-gray-600">Episode Types</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">5-15</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">100%</div>
                <div className="text-sm text-gray-600">Personalized</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Employee Showcase */}
      <section className="py-20 px-4 bg-white">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Meet Your AI Podcast Hosts</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Each AI employee brings their unique personality and expertise to your financial podcasts
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {aiEmployees.map((employee, index) => (
              <motion.div
                key={employee.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${employee.color} rounded-full flex items-center justify-center text-2xl mb-4 mx-auto`}>
                  {employee.avatar}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{employee.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{employee.role}</p>
                <div className="mb-4">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Voice Style</span>
                  <p className="text-sm text-gray-700">{employee.voice}</p>
                </div>
                <div className="mb-4">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Specialty</span>
                  <p className="text-sm text-gray-700">{employee.specialty}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 italic">"{employee.quote}"</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Episode Types */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Choose Your Episode Type</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Different episode formats for different needs and time constraints
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {episodeTypes.map((episode, index) => (
              <motion.div
                key={episode.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white">
                      {episode.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{episode.type}</h3>
                      <p className="text-sm text-gray-600">{episode.duration}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{episode.description}</p>
                
                <div className="mb-4">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">AI Hosts</span>
                  <div className="flex flex-wrap gap-2">
                    {episode.aiEmployees.map((host) => (
                      <span key={host} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        {host}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Benefits</span>
                  <ul className="space-y-1">
                    {episode.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center text-sm text-gray-700">
                        <Star className="h-4 w-4 text-orange-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Choose Personal Podcasts?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your financial data into engaging audio content that fits your lifestyle
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-700 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-50 to-red-50">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Real Results from Real Users</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how personal podcasts are transforming financial management
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-700 mb-4">{benefit.description}</p>
                <div className="text-2xl font-bold text-orange-600">{benefit.stat}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Start Your Personal Financial Podcast Today
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already listening to their AI employees tell their financial story
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center px-8 py-4 bg-white text-orange-600 hover:bg-gray-100 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Create Your First Episode
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button className="inline-flex items-center px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-orange-600 font-semibold rounded-lg transition-all duration-300">
                <Play className="mr-2 h-5 w-5" />
                Listen to Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
}
