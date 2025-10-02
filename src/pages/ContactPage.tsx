import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Crown, MessageCircle, Mail, Phone, MapPin, Clock, 
  CheckCircle, Sparkles, Bot, Send, Zap, Brain, 
  Users, Award, Star, ArrowRight, Play, RefreshCw
} from 'lucide-react';
interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  contactBenefit: string;
}

interface ContactScenario {
  id: string;
  title: string;
  description: string;
  aiResponse: string;
  responseTime: string;
  satisfaction: number;
}

interface ContactMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  responseTime: string;
  availability: string;
  color: string;
}

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [showAIChat, setShowAIChat] = useState(false);
  const [isAIChatting, setIsAIChatting] = useState(false);
  const [chatProgress, setChatProgress] = useState(0);
  const [currentChatScenarios, setCurrentChatScenarios] = useState<ContactScenario[]>([]);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // AI Contact Team
  const aiContactTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Contact Director',
      avatar: '👑',
      specialty: 'Strategic Support Orchestration',
      color: 'from-purple-500 to-pink-500',
      contactBenefit: 'Orchestrates your perfect support experience and ensures fastest resolution'
    },
    {
      name: 'Byte',
      role: 'AI Response Optimizer',
      avatar: '⚙️',
      specialty: 'Response Speed & Quality',
      color: 'from-blue-500 to-cyan-500',
      contactBenefit: 'Optimizes response times and ensures the most helpful answers'
    },
    {
      name: 'Tag',
      role: 'AI Inquiry Router',
      avatar: '🏷️',
      specialty: 'Smart Routing',
      color: 'from-green-500 to-emerald-500',
      contactBenefit: 'Routes your inquiry to the perfect team member instantly'
    },
    {
      name: 'Crystal',
      role: 'AI Support Predictor',
      avatar: '🔮',
      specialty: 'Predictive Support',
      color: 'from-indigo-500 to-purple-500',
      contactBenefit: 'Predicts and prevents issues before they happen'
    }
  ];

  // Contact Methods
  const contactMethods: ContactMethod[] = [
    {
      id: 'ai-chat',
      name: 'AI Chat Support',
      icon: '🤖',
      description: 'Instant AI responses for common questions',
      responseTime: 'Instant',
      availability: '24/7',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'live-chat',
      name: 'Live Chat',
      icon: '💬',
      description: 'Real human support with AI assistance',
      responseTime: '< 2 minutes',
      availability: '24/7',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'email',
      name: 'Email Support',
      icon: '📧',
      description: 'Detailed responses with AI-powered routing',
      responseTime: '< 2 hours',
      availability: '24/7',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'video-call',
      name: 'Video Support',
      icon: '📹',
      description: 'AI-assisted video calls with screen sharing',
      responseTime: '< 30 minutes',
      availability: 'Business hours',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  // Sample Chat Scenarios
  const chatScenarios: ContactScenario[] = [
    {
      id: '1',
      title: 'Account Setup Question',
      description: 'User asked about connecting their bank account',
      aiResponse: 'I can help you connect your bank account securely. Our AI supports 10,000+ banks with 99.7% accuracy.',
      responseTime: '0.3 seconds',
      satisfaction: 98
    },
    {
      id: '2',
      title: 'Feature Request',
      description: 'User requested a new automation feature',
      aiResponse: 'Great idea! I\'ve logged your request and routed it to our product team. You\'ll get updates on this feature.',
      responseTime: '0.5 seconds',
      satisfaction: 95
    },
    {
      id: '3',
      title: 'Technical Issue',
      description: 'User reported a categorization error',
      aiResponse: 'I\'ve identified the issue and applied a fix. Your categorization accuracy should now be 99.7%.',
      responseTime: '0.8 seconds',
      satisfaction: 99
    }
  ];

  // Demo Functions
  const startAIChat = () => {
    setIsAIChatting(true);
    setChatProgress(0);
    
    const interval = setInterval(() => {
      setChatProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAIChatting(false);
          setCurrentChatScenarios(chatScenarios);
          return 100;
        }
        return prev + 25;
      });
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitting(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setIsFormSubmitting(false);
      setFormSubmitted(true);
    }, 2000);
  };

  return (
    <>
      <Helmet>
        <title>Contact XspensesAI - Revolutionary AI Support | XspensesAI Platform</title>
        <meta name="description" content="Contact XspensesAI with revolutionary AI support. Get instant AI responses, smart routing, and 24/7 support from Prime, Byte, Tag, and Crystal AI team." />
        <meta name="keywords" content="contact XspensesAI, AI support, AI chat, customer support, AI contact team, Prime AI support, Byte AI support, Tag AI support, Crystal AI support" />
        <meta property="og:title" content="Contact XspensesAI - Revolutionary AI Support | XspensesAI Platform" />
        <meta property="og:description" content="Contact XspensesAI with revolutionary AI support and instant responses." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact XspensesAI - Revolutionary AI Support | XspensesAI Platform" />
        <meta name="twitter:description" content="Contact XspensesAI with revolutionary AI support." />
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8"
              >
                <Crown size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Prime's AI Contact Division</span>
              </div>
            </div>

            <h1
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Revolutionary AI Support
            </h1>
            
            <p
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Experience the future of customer support with Prime, Byte, Tag, and Crystal AI team. Get instant AI responses, smart routing, and 24/7 support that's faster and more helpful than ever before.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <button 
                onClick={() => setShowAIChat(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle size={24} />
                Chat with AI Assistant
              </button>
              <button 
                onClick={startAIChat}
                className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play size={24} />
                Watch AI Support Demo
              </button>
            </div>
          </div>

          {/* AI Contact Team Showcase */}
          <div
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-12">Meet Your AI Contact Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aiContactTeam.map((member, index) => (
                <div 
                  key={member.name}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{member.avatar}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                    <p className="text-cyan-400 font-semibold mb-3">{member.role}</p>
                    <p className="text-white/70 text-sm mb-4">{member.specialty}</p>
                    <div className={`w-full h-1 bg-gradient-to-r ${member.color} rounded-full`}></div>
                    <p className="text-white/60 text-xs mt-3">{member.contactBenefit}</p>
                  </div>
                </div>
              ))}
        </div>
          </div>
                  </div>
                </div>

      {/* Live AI Chat Demo */}
      {isAIChatting && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Live AI Support Demo</h2>
              <p className="text-white/80">Watch our AI contact team respond to inquiries in real-time</p>
            </div>

            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Processing Inquiries</h3>
                <span className="text-cyan-400 font-bold">{chatProgress}%</span>
                  </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${chatProgress}%` }}
                ></div>
                </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {chatProgress < 33 && "Prime is analyzing the inquiry..."}
                  {chatProgress >= 33 && chatProgress < 66 && "Byte is optimizing the response..."}
                  {chatProgress >= 66 && chatProgress < 100 && "Tag is routing to the right team..."}
                  {chatProgress >= 100 && "Crystal is predicting follow-up needs..."}
                </p>
                  </div>
                </div>

            {currentChatScenarios.length > 0 && (
              <div
                className="bg-white/10 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-400" />
                  AI Support in Action
                </h3>
                <div className="space-y-4">
                  {currentChatScenarios.map((scenario) => (
                    <div key={scenario.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start justify-between mb-2">
                  <div>
                          <h4 className="font-semibold text-white">{scenario.title}</h4>
                          <p className="text-white/80 text-sm">{scenario.description}</p>
                          <p className="text-white/70 text-xs mt-1">{scenario.aiResponse}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">{scenario.responseTime}</div>
                          <div className="text-cyan-400 text-sm">{scenario.satisfaction}% satisfaction</div>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Methods */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Revolutionary Contact Methods</h2>
            <p className="text-white/80">Choose your preferred way to get AI-powered support</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <div 
                key={method.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">{method.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{method.name}</h3>
                  <p className="text-white/70 text-sm mb-4">{method.description}</p>
                  <div className="space-y-2">
                    <div className="text-cyan-400 font-semibold text-sm">{method.responseTime}</div>
                    <div className="text-white/60 text-xs">{method.availability}</div>
                  </div>
                  <div className={`w-full h-1 bg-gradient-to-r ${method.color} rounded-full mt-4`}></div>
                </div>
              </div>
            ))}
              </div>
        </div>
            </div>

            {/* Contact Form */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">AI-Powered Contact Form</h2>
            <p className="text-white/80">Our AI will route your message to the perfect team member</p>
          </div>

          <div className="max-w-2xl mx-auto">
            {!formSubmitted ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                
                <input
                  type="text"
                  placeholder="Company (Optional)"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                />
                
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.inquiryType}
                  onChange={e => setFormData({...formData, inquiryType: e.target.value})}
                >
                  <option value="general" className="bg-slate-800">General Question</option>
                  <option value="support" className="bg-slate-800">Technical Support</option>
                  <option value="sales" className="bg-slate-800">Sales Inquiry</option>
                  <option value="partnership" className="bg-slate-800">Partnership Opportunity</option>
                  <option value="press" className="bg-slate-800">Press/Media Inquiry</option>
                  <option value="feedback" className="bg-slate-800">Product Feedback</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Subject *"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  required
                />
                
                <textarea
                  placeholder="How can our AI team help you? *"
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  required
                ></textarea>
                
                <button 
                  type="submit" 
                  disabled={isFormSubmitting}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {isFormSubmitting ? (
                    <>
                      <RefreshCw size={24} className="animate-spin" />
                      AI is Processing Your Message...
                    </>
                  ) : (
                    <>
                      <Send size={24} />
                      Send Message to AI Team
                    </>
                  )}
                </button>
                
                <p className="text-white/60 text-sm text-center">
                  Our AI will route your message to the perfect team member within 2 hours
                </p>
              </form>
            ) : (
              <div
                className="text-center bg-white/10 rounded-xl p-8"
              >
                <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Message Sent Successfully!</h3>
                <p className="text-white/80 mb-6">
                  Our AI team has received your message and will route it to the perfect team member. 
                  You'll receive a response within 2 hours.
                </p>
                <button 
                  onClick={() => setFormSubmitted(false)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Send Another Message
                </button>
              </div>
            )}
            </div>
        </div>
          </div>

      {/* Call to Action */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Experience Revolutionary AI Support?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of users who've experienced the future of customer support. Get instant AI responses, smart routing, and 24/7 support from our AI team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowAIChat(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <MessageCircle size={24} />
              Chat with AI Now
            </button>
            <button 
              onClick={startAIChat}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Try Free Demo
            </button>
        </div>
        </div>
            </div>

      {/* AI Chat Modal */}
      
        {showAIChat && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAIChat(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">AI Chat Support</h2>
                <p className="text-white/80">Chat with our AI team for instant support</p>
            </div>

              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-white" />
            </div>
                  <span className="text-white font-semibold">AI Assistant</span>
            </div>
                <p className="text-white/80 text-sm">
                  Hi! I'm your AI assistant. I can help with account setup, feature questions, technical issues, and more. What can I help you with today?
                </p>
            </div>

              <div className="space-y-3 mb-6">
                {[
                  "How do I connect my bank account?",
                  "Can I try the AI features for free?",
                  "How does the AI categorization work?",
                  "I need help with my subscription"
                ].map((question, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-white text-sm"
                  >
                    {question}
                  </button>
                ))}
            </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowAIChat(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setShowAIChat(false);
                    startAIChat();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Start Chat
                </button>
          </div>
            </div>
          </div>
        )}
      
    </>
  );
};

export default ContactPage; 