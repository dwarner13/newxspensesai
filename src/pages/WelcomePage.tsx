import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  Camera, 
  Brain, 
  BarChart3,
  Play
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const WelcomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    // Redirect if no user
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Get user's name from email or profile
    if (user.email) {
      const nameFromEmail = user.email.split('@')[0];
      // Capitalize first letter
      setUserName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
    }
  }, [user, navigate]);
  
  const features = [
    {
      icon: <FileText className="w-5 h-5 text-primary-400" />,
      title: "Upload Statements",
      description: "Import CSV or PDF bank statements"
    },
    {
      icon: <Camera className="w-5 h-5 text-primary-400" />,
      title: "Scan Receipts",
      description: "Use your camera to capture receipts"
    },
    {
      icon: <Brain className="w-5 h-5 text-primary-400" />,
      title: "AI Categorization",
      description: "Let AI organize your transactions"
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-primary-400" />,
      title: "View Reports",
      description: "Get insights into your spending"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container  px-4 py-12 md:py-20">
        <div
          className="max-w-3xl  text-center"
        >
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold">XspensesAI</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Welcome to XspensesAI, {userName}!
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl ">
            You're all set to start tracking your expenses the smart way. Let's get you up and running in just a few minutes.
          </p>
          
          <div className="relative mb-12">
            <div className="aspect-video max-w-2xl  bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src="https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                  alt="XspensesAI Dashboard Preview" 
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <button className="w-16 h-16 bg-primary-600 bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all transform hover:scale-105">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-3">
              Watch our quick intro video to learn how XspensesAI works
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-xl p-5 border border-gray-700"
              >
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
          
          <div
            className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700 mb-8"
          >
            <h3 className="text-xl font-semibold mb-4">Here's what you can do next:</h3>
            <ul className="space-y-4 text-left  ">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-primary-400 mr-3 flex-shrink-0 mt-0.5" />
                <span>Upload your first bank statement or credit card CSV</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-primary-400 mr-3 flex-shrink-0 mt-0.5" />
                <span>Scan a receipt with your phone camera</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-primary-400 mr-3 flex-shrink-0 mt-0.5" />
                <span>Let our AI categorize your transactions automatically</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-primary-400 mr-3 flex-shrink-0 mt-0.5" />
                <span>Explore your spending patterns in the dashboard</span>
              </li>
            </ul>
          </div>
          
          <div
          >
            <Link 
              to="/" 
              className="inline-block bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-medium px-8 py-4 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Get Started
              <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </Link>
            
            <p className="mt-6 text-gray-400 text-sm">
              Need help? <a href="mailto:support@xspensesai.com" className="text-primary-400 hover:text-primary-300">Contact our support team</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
