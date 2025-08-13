import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  Download, 
  Settings, 
  Zap,
  Clock,
  AlertCircle,
  Copy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const EmailReceiptsPage = () => {
  const { user } = useAuth();
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailAddress, setShowEmailAddress] = useState(false);

  const generateEmailAddress = () => {
    if (user) {
      // Generate a personalized email forwarding address
      const username = user.email?.split('@')[0] || 'user';
      const randomId = Math.random().toString(36).substring(2, 8);
      return `${username}.${randomId}@xspenses.ai`;
    }
    return 'your-name@xspenses.ai';
  };

  const handleGetAddress = () => {
    if (!user) {
      toast.error('Please sign in to get your forwarding address');
      return;
    }
    
    const newAddress = generateEmailAddress();
    setEmailAddress(newAddress);
    setShowEmailAddress(true);
    
    // In a real app, this would save the address to the user's profile
    toast.success('Your forwarding address is ready!');
  };

  const copyToClipboard = () => {
    if (emailAddress) {
      navigator.clipboard.writeText(emailAddress);
      toast.success('Email address copied to clipboard!');
    }
  };

  return (
    <WebsiteLayout>
      {/* Hero Section */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
              Forward Email Receipts Automatically — Let AI Do the Rest
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl ">
              Every e-receipt, invoice, or billing email scanned and categorized instantly — just by forwarding it to your XspensesAI address.
            </p>
            <button
              onClick={handleGetAddress}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg inline-flex items-center transition-colors"
            >
              <Mail className="mr-2" size={20} />
              Get My Forwarding Address
            </button>
          </motion.div>
          
          {/* Email Address Display */}
          {showEmailAddress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-4  "
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-700 font-medium mb-1">Your Forwarding Address:</p>
                  <p className="text-primary-900 font-mono">{emailAddress}</p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-primary-700 hover:bg-primary-100 rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-8">
              {[
                {
                  step: 1,
                  title: "Forward any email",
                  description: "Send your receipts to yourname@xspenses.ai",
                  icon: <Mail className="text-primary-600" size={24} />
                },
                {
                  step: 2,
                  title: "AI scans content",
                  description: "We process both email body and attachments",
                  icon: <Zap className="text-primary-600" size={24} />
                },
                {
                  step: 3,
                  title: "Extract key data",
                  description: "Vendor, amount, tax, and date identified",
                  icon: <FileText className="text-primary-600" size={24} />
                },
                {
                  step: 4,
                  title: "Auto-categorize",
                  description: "AI assigns the right expense category",
                  icon: <CheckCircle className="text-primary-600" size={24} />
                },
                {
                  step: 5,
                  title: "Dashboard ready",
                  description: "Expense appears in your account, tagged and searchable",
                  icon: <ArrowRight className="text-primary-600" size={24} />
                }
              ].map((step, index) => (
                <div key={step.step} className="relative">
                  {/* Step number */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                      <span className="text-primary-700 font-bold">{step.step}</span>
                    </div>
                    
                    {/* Connector line */}
                    {index < 4 && (
                      <div className="hidden md:block absolute top-6 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5 bg-primary-100"></div>
                    )}
                    
                    {/* Content */}
                    <div className="text-center">
                      <div className="mb-2">{step.icon}</div>
                      <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Can Handle Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              AI Can Handle
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "HTML Receipts",
                  description: "Embedded receipts in email body",
                  icon: <FileText className="text-primary-600" size={24} />
                },
                {
                  title: "PDF Invoices",
                  description: "Attached invoice documents",
                  icon: <FileText className="text-primary-600" size={24} />
                },
                {
                  title: "Subscription Emails",
                  description: "Monthly billing notifications",
                  icon: <Clock className="text-primary-600" size={24} />
                },
                {
                  title: "Service Providers",
                  description: "Uber, Amazon, Google, etc.",
                  icon: <CheckCircle className="text-primary-600" size={24} />
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="mb-4">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Supported Email Clients */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              Supported Email Clients
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-center">
              {["Gmail", "Outlook", "iCloud", "Yahoo", "Any Email"].map((client, index) => (
                <motion.div
                  key={client}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="w-12 h-12  mb-3 flex items-center justify-center">
                    <Mail className="text-primary-600" size={24} />
                  </div>
                  <h3 className="font-medium text-gray-900">{client}</h3>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Auto-Forwarding Tip Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary-50">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-lg shadow-md p-8 border border-primary-100"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Settings className="text-primary-600" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Set It and Forget It</h3>
                <p className="text-gray-600 mb-4">
                  Set up auto-forwarding rules in your inbox to route all receipts through XspensesAI. Never lose a deductible expense again.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Quick Setup Guides:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <a href="#" className="text-primary-600 hover:text-primary-700 flex items-center">
                      <ArrowRight size={16} className="mr-1" />
                      <span>Gmail Auto-Forwarding</span>
                    </a>
                    <a href="#" className="text-primary-600 hover:text-primary-700 flex items-center">
                      <ArrowRight size={16} className="mr-1" />
                      <span>Outlook Rules Setup</span>
                    </a>
                    <a href="#" className="text-primary-600 hover:text-primary-700 flex items-center">
                      <ArrowRight size={16} className="mr-1" />
                      <span>Apple Mail Forwarding</span>
                    </a>
                    <a href="#" className="text-primary-600 hover:text-primary-700 flex items-center">
                      <ArrowRight size={16} className="mr-1" />
                      <span>Yahoo Mail Filters</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              Use Cases
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Freelancers",
                  description: "Manage client invoices and business expenses with ease. Forward all your business receipts to one place.",
                  icon: <FileText className="text-primary-600" size={24} />
                },
                {
                  title: "Small Business Owners",
                  description: "Keep track of multiple vendors and services. Never miss a deductible expense again.",
                  icon: <CheckCircle className="text-primary-600" size={24} />
                },
                {
                  title: "Busy Professionals",
                  description: "Monitor recurring charges and subscriptions. Get alerted to unusual spending patterns.",
                  icon: <AlertCircle className="text-primary-600" size={24} />
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Export Capabilities */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
              Always Organized. Always Exportable.
            </h2>
            <p className="text-lg text-gray-600 mb-8 text-center max-w-3xl ">
              Export forwarded email receipts into clean, accountant-ready PDFs, Excel files, or Google Sheets.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "PDF Reports",
                  description: "Generate professional PDF reports for your accountant or tax filing.",
                  icon: <FileText className="text-primary-600" size={24} />
                },
                {
                  title: "Excel Export",
                  description: "Download your data in Excel format for further analysis and record keeping.",
                  icon: <Download className="text-primary-600" size={24} />
                },
                {
                  title: "Google Sheets",
                  description: "Sync your expense data directly with Google Sheets for collaborative work.",
                  icon: <FileText className="text-primary-600" size={24} />
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4 ">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-5xl  text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Let Your Inbox Do the Work
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-3xl ">
              Forward your first receipt today and see XspensesAI do the rest.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-primary-700 hover:bg-gray-100 font-medium px-6 py-3 rounded-lg inline-flex items-center justify-center transition-colors"
              >
                Start Free
              </Link>
              <button
                onClick={handleGetAddress}
                className="bg-primary-800 hover:bg-primary-900 text-white font-medium px-6 py-3 rounded-lg inline-flex items-center justify-center transition-colors border border-white border-opacity-20"
              >
                <Mail className="mr-2" size={20} />
                Get My Forwarding Address
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4">
        <div className="max-w-5xl  text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">XspensesAI</span>
          </div>
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} XspensesAI. All rights reserved.
          </p>
        </div>
      </footer>
    </WebsiteLayout>
  );
};

export default EmailReceiptsPage;
