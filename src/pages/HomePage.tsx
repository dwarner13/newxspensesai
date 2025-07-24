import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  ArrowRight, 
  Brain, 
  FileText, 
  BarChart3, 
  Receipt, 
  MessageSquare,
  Target,
  CheckCircle,
  Menu,
  X,
  DollarSign,
  Briefcase,
  Users,
  Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const HomePage = () => {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const comparisonTable = [
    {
      others: "Manual expense categorization",
      xspensesai: "AI reads ANY financial document instantly"
    },
    {
      others: "Limited to specific bank formats",
      xspensesai: "Universal compatibility - 12,000+ banks worldwide"
    },
    {
      others: "Forget your categorization rules",
      xspensesai: "AI remembers every preference forever"
    },
    {
      others: "Tax season chaos and stress",
      xspensesai: "AI organizes entire year in under 5 minutes"
    }
  ];

  const testimonials = [
    {
      name: "Sarah J.",
      role: "Freelance Designer",
      content: "Uploaded 47 bank statements → AI organized everything for taxes in 3 minutes. Found $3,400 in missed deductions!",
      avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    {
      name: "Michael T.",
      role: "Small Business Owner",
      content: "AI reads ANY financial document. My shoebox of receipts became tax-ready categories in under 5 minutes.",
      avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    {
      name: "Elena R.",
      role: "Realtor",
      content: "The AI remembers every categorization preference. Never categorize 'Starbucks' as coffee again!",
      avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150"
    }
  ];

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign in...');
      await signInWithGoogle();
      // The redirect will happen automatically
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    console.log('Email sign in clicked');
    navigate('/login');
  };

  const handleAppleSignIn = () => {
    console.log('Apple sign in clicked');
    toast.error('Apple sign in is not yet available');
  };

  return (
    <div className="min-h-screen bg-[#f8f6f4] text-gray-900">
      <Helmet>
        <title>XspensesAI - AI Reads Any Statement + Financial Entertainment</title>
        <meta name="description" content="Revolutionary AI reads any bank statement, PDF, or receipt. Creates personal finance podcasts + Spotify integration. Transform expense tracking from pain into entertainment." />
        <meta name="keywords" content="AI expense tracker, smart expense management, AI financial assistant, automated expense categorization, AI statement reader, financial entertainment platform, AI reads bank statements automatically, upload any financial document AI categorizes, smart expense import from any source, AI remembers expense categories forever, entertainment financial management platform, AI that learns your spending patterns" />
        <meta property="og:title" content="XspensesAI - AI Reads Any Statement + Financial Entertainment" />
        <meta property="og:description" content="Revolutionary AI reads any bank statement, PDF, or receipt. Creates personal finance podcasts + Spotify integration. Transform expense tracking from pain into entertainment." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="XspensesAI - AI Reads Any Statement + Financial Entertainment" />
        <meta name="twitter:description" content="Revolutionary AI reads any bank statement, PDF, or receipt. Creates personal finance podcasts + Spotify integration." />
      </Helmet>
      {/* Header */}
      <header className="relative z-10 bg-white shadow-sm">
        <div className="container  px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-xl font-bold">XspensesAI</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">Features</a>
              <a href="#testimonials" className="text-gray-600 hover:text-primary-600 transition-colors">Testimonials</a>
              <a href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">Pricing</a>
              {user ? (
                <Link to="/dashboard" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Sign In
                </Link>
              )}
            </nav>
            
            {/* Mobile Menu Button and Login Button */}
            <div className="md:hidden flex items-center space-x-4">
              {!user && (
                <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-sm rounded-lg transition-colors">
                  Sign In
                </Link>
              )}
              <button 
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white py-4 shadow-lg">
            <div className="container  px-4 space-y-3">
              <a 
                href="#features" 
                className="block text-gray-600 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#testimonials" 
                className="block text-gray-600 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-600 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              {user ? (
                <Link 
                  to="/dashboard" 
                  className="block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-white px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-12 shadow-sm">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 mb-4">
            The Netflix of Personal Finance
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Revolutionary AI reads ANY bank statement, receipt, or financial document instantly. End manual expense categorization forever. Experience financial management as entertainment.
          </p>
          <div className="flex gap-4">
            <Link
              to="/signup"
              className="bg-green-600 hover:bg-green-700 text-white text-lg px-6 py-3 rounded-md inline-block"
            >
              Upload Any Statement - Watch AI Magic
            </Link>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-6 py-3 rounded-md inline-flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Experience AI Magic"
              )}
            </button>
          </div>
        </div>

        {/* App Preview Image */}
        <div className="w-full ">
          <img
            src="https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            alt="AI reads any financial document instantly"
            className="rounded-lg shadow-lg"
          />
        </div>
      </section>

      {/* What Makes XspensesAI Different Section */}
      <section id="features" className="bg-white py-20 px-6">
        <div className="max-w-5xl ">
          <h2 className="text-3xl font-bold mb-10 text-center">Revolutionary Smart Import AI vs. Everything Else</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Others Do This</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary-600 uppercase tracking-wider">XspensesAI Does This</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonTable.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-500">{row.others}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{row.xspensesai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Smart Import AI Superpowers */}
      <section className="bg-gradient-to-r from-purple-50 to-pink-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Smart Import AI Superpowers
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-xl">🌍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Universal Compatibility</h3>
              <p className="text-gray-600 text-sm mb-4">
                Reads statements from 12,000+ banks worldwide. PDFs, CSVs, images, emails, handwritten receipts - AI reads it all.
              </p>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                <div className="text-xs text-gray-700">
                  <strong>Example:</strong> Upload Chase, Wells Fargo, or any international bank statement
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Memory Palace</h3>
              <p className="text-gray-600 text-sm mb-4">
                Never ask you to categorize "Starbucks" as coffee again. AI remembers every preference and learns your financial DNA.
              </p>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                <div className="text-xs text-gray-700">
                  <strong>Example:</strong> AI learned: "Starbucks" = "Business Meals" for you
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tax Season Magic</h3>
              <p className="text-gray-600 text-sm mb-4">
                Organizes entire year of expenses in under 5 minutes. Creates audit-proof categorization for tax season.
              </p>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3">
                <div className="text-xs text-gray-700">
                  <strong>Example:</strong> 47 bank statements → Tax-ready in 3 minutes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20 bg-gray-50">
        <div className="container  px-4 sm:px-6 lg:px-8 ">
          {/* Smart Import AI - Upload Any Document */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">Smart Import AI Reads ANY Financial Document</h2>
                <p className="text-lg text-gray-600 mb-6">
                  Upload messy bank statements, crumpled receipts, PDFs, CSVs, or forward email receipts. Our AI reads and categorizes everything instantly with superhuman accuracy.
                </p>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <FileText className="text-primary-600 mt-1" />
                    <div>
                      <p className="text-gray-700 font-medium">"Uploaded 47 bank statements → AI organized 847 transactions in 12 seconds"</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          Tax-ready in 3 minutes
                        </span>
                        <span className="ml-2 text-gray-500">Found $3,400 in missed deductions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <img 
                  src="https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                  alt="AI reads any financial document instantly" 
                  className="rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>

          {/* AI Learning & Memory */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row-reverse items-center gap-10">
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">AI Remembers Every Preference Forever</h2>
                <p className="text-lg text-gray-600 mb-6">
                  Our AI learns your financial DNA and remembers every categorization decision. Never categorize "Starbucks" as coffee again - AI gets smarter with every document.
                </p>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <Brain className="text-primary-600 mt-1" />
                    <div>
                      <p className="text-gray-700 font-medium">AI learned: "Starbucks" = "Business Meals" for you</p>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary-600 h-2.5 rounded-full w-4/5"></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">94% accuracy after 50 documents</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <img 
                  src="https://images.pexels.com/photos/7821485/pexels-photo-7821485.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                  alt="AI learns and remembers your financial patterns" 
                  className="rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Financial Entertainment Platform */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">Financial Entertainment Platform</h2>
                <p className="text-lg text-gray-600 mb-6">
                  AI creates personal podcasts about YOUR financial journey, integrates with Spotify for focus music, and provides an AI Financial Therapist to eliminate money anxiety.
                </p>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="text-primary-600 mt-1" />
                    <div>
                      <p className="text-gray-700 font-medium">🎧 "How Sarah Conquered Her Credit Card Debt in 6 Months"</p>
                      <p className="text-sm text-gray-500 mt-1">Personal podcast created by AI about your financial journey</p>
                      <button className="mt-2 text-primary-600 text-sm font-medium">Listen Now</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <img 
                  src="https://images.pexels.com/photos/7876303/pexels-photo-7876303.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                  alt="Financial entertainment platform with AI podcasts" 
                  className="rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Built for Personal & Business Use */}
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">Built for Personal & Business Use</h2>
              <p className="text-lg text-gray-600 max-w-3xl ">
                Whether you're managing personal finances or running a business, XspensesAI adapts to your needs with specialized features.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Contractors</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Track expenses by project</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Separate business & personal</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Tax-ready reports</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Realtors</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Client-specific tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Property expense grouping</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Commission tracking</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Brain className="text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Freelancers</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Invoice & payment tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Business expense categories</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Self-employment tax help</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Small Business</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Multi-user access</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Vendor relationship tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                    <span>Profit & loss reporting</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Entertainment Features Showcase */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Financial Management as Entertainment
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Finance Podcasts</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">AI Generated Just For You</div>
                  <div className="text-sm font-semibold">"How Sarah Conquered Her Credit Card Debt in 6 Months"</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Weekly Financial Journey</div>
                  <div className="text-sm font-semibold">"Your Q4 Business Expense Review & Tax Strategy"</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Personalized Insights</div>
                  <div className="text-sm font-semibold">"Maximizing Your 2024 Deductions - Personal Analysis"</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Spotify Integration & AI Therapist</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">🎵</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Focus Music Integration</div>
                    <div className="text-sm text-gray-600">"Tax Season Victory Mix" plays while AI organizes expenses</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">🧠</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">AI Financial Therapist</div>
                    <div className="text-sm text-gray-600">"Let's talk about why expense tracking used to stress you out"</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">🏆</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Gamification</div>
                    <div className="text-sm text-gray-600">Achievement unlocked: "Document Upload Master" - you've imported 100 statements!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container  px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Real Tax Season Transformations</h2>
            <p className="text-xl text-gray-600 max-w-3xl ">
              See how Smart Import AI turned tax season chaos into effortless organization for thousands of users.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-gray-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700">"{testimonial.content}"</p>
                <div className="mt-4 flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container  px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-3xl ">
              Start for free, upgrade when you need more power.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl ">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
            >
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <div className="text-3xl font-bold mb-4">$0<span className="text-gray-500 text-lg font-normal">/month</span></div>
              <p className="text-gray-600 mb-6">Perfect for individuals just getting started.</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>10 receipts/month</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Manual entry only</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Basic categorization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>In-app support</span>
                </li>
              </ul>
              
              <Link 
                to="/signup" 
                className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-6 py-3 rounded-lg transition-colors w-full"
              >
                Get Started
              </Link>
            </motion.div>
            
            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 border-2 border-primary-500 transform scale-105 shadow-lg"
            >
              <div className="bg-primary-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-2 rounded-full inline-block mb-2">Most Popular</div>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <div className="text-3xl font-bold mb-4">$9.99<span className="text-gray-500 text-lg font-normal">/month</span></div>
              <p className="text-gray-600 mb-6">For professionals and small businesses.</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Unlimited transactions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Advanced AI categorization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>CSV, PDF & receipt scanning</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Advanced reports & tax summaries</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Data export (CSV, PDF, Sheets)</span>
                </li>
              </ul>
              
              <Link 
                to="/signup" 
                className="block text-center bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full"
              >
                Start Free Trial
              </Link>
            </motion.div>
            
            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
            >
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <div className="text-3xl font-bold mb-4">$29.99<span className="text-gray-500 text-lg font-normal">/month</span></div>
              <p className="text-gray-600 mb-6">For teams and larger businesses.</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Team collaboration</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Custom categories & rules</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>API access</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              </ul>
              
              <Link 
                to="/contact" 
                className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-6 py-3 rounded-lg transition-colors w-full"
              >
                Contact Sales
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#f4f4f4] py-16 px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">End Expense Categorization Hell Forever</h2>
        <p className="text-gray-600 mb-6">
          Upload any financial document and watch AI magic transform your tax season from nightmare to effortless.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/signup"
            className="bg-green-600 hover:bg-green-700 text-white text-lg px-6 py-3 rounded-md inline-block"
          >
            Upload Any Statement - Watch AI Magic
          </Link>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-6 py-3 rounded-md inline-flex items-center justify-center"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Experience AI Magic
              </span>
            )}
          </button>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleEmailSignIn}
            className="text-gray-700 hover:text-primary-600 transition-colors"
          >
            Sign in with Email
          </button>
          <button
            onClick={handleAppleSignIn}
            className="text-gray-700 hover:text-primary-600 transition-colors"
          >
            Sign in with Apple
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="container  px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-lg font-bold">XspensesAI</span>
              </div>
              <p className="text-gray-500 mb-4">
                Smart budgeting powered by AI.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-500 hover:text-primary-600 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-primary-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">Guides</a></li>
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">Support</a></li>
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">About</a></li>
                <li><a href="#" className="text-gray-500 hover:text-primary-600 transition-colors">Blog</a></li>
                <li><Link to="/terms" className="text-gray-500 hover:text-primary-600 transition-colors">Terms</Link></li>
                <li><Link to="/privacy" className="text-gray-500 hover:text-primary-600 transition-colors">Privacy</Link></li>
                <li><a href="mailto:support@xspensesai.com" className="text-gray-500 hover:text-primary-600 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} XspensesAI. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0">
              <Link to="/terms" className="text-gray-500 hover:text-primary-600 text-sm mr-4 transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
