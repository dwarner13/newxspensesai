import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Brain, 
  MessageSquare, 
  Zap, 
  Target, 
  BarChart, 
  DollarSign,
  Lightbulb,
  FileText,
  PieChart,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

export default function AIInsightsPage() {
  return (
    <WebsiteLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-50 to-secondary-50 py-20 px-4">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">XspensesAI Brain</h1>
            <p className="text-xl text-gray-700 max-w-3xl  mb-8">
              Harness the power of AI to transform your financial data into actionable insights and intelligent recommendations.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Try It Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Connect Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                <Brain className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Connect</h2>
              <p className="text-lg text-gray-600 mb-6">
                XspensesAI Brain connects to all your financial data sources, creating a unified view of your spending patterns, income streams, and financial habits.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Automatic bank statement processing</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Smart receipt scanning with OCR technology</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Intelligent categorization that learns from your habits</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="AI data connection" 
                className="rounded-xl shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ask Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row-reverse items-center gap-12"
          >
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="h-8 w-8 text-secondary-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ask</h2>
              <p className="text-lg text-gray-600 mb-6">
                Ask natural language questions about your finances and get instant, intelligent answers. No more digging through spreadsheets or guessing where your money went.
              </p>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <p className="text-gray-700 font-medium mb-3">Example questions you can ask:</p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-secondary-500 mr-2" />
                    "How much did I spend on dining last month?"
                  </li>
                  <li className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-secondary-500 mr-2" />
                    "What's my biggest expense category this year?"
                  </li>
                  <li className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-secondary-500 mr-2" />
                    "Show me all transactions over $100 from last week"
                  </li>
                  <li className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-secondary-500 mr-2" />
                    "How am I doing on my savings goal?"
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                    <Brain className="h-5 w-5 text-secondary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">XspensesAI Assistant</h3>
                    <p className="text-xs text-gray-500">Powered by AI</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-4">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p className="text-gray-800">How much did I spend on dining out last month?</p>
                  </div>
                  
                  <div className="bg-secondary-50 rounded-lg p-3 max-w-[80%] ml-auto">
                    <p className="text-gray-800">You spent $342.87 on dining out last month, which is 18% of your total expenses. This is about $58 less than your monthly average for this category.</p>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p className="text-gray-800">How does that compare to my budget?</p>
                  </div>
                  
                  <div className="bg-secondary-50 rounded-lg p-3 max-w-[80%] ml-auto">
                    <p className="text-gray-800">You're under your dining budget of $400 by $57.13. Great job! You've stayed under budget for this category for 3 consecutive months now.</p>
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask about your finances..."
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-600">
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Build Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mb-6">
                <Target className="h-8 w-8 text-accent-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Build</h2>
              <p className="text-lg text-gray-600 mb-6">
                XspensesAI doesn't just track your finances—it helps you build a better financial future with AI-powered recommendations and personalized insights.
              </p>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-2">
                    <BarChart className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Smart Budget Builder</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    AI analyzes your spending patterns and suggests realistic budgets based on your actual habits.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-2">
                    <DollarSign className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Savings Opportunities</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Identifies potential savings by detecting duplicate subscriptions, unusual spending, and better deals.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-2">
                    <Zap className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Goal Accelerator</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Suggests personalized strategies to reach your financial goals faster based on your spending habits.
                  </p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.pexels.com/photos/7821485/pexels-photo-7821485.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="Financial planning" 
                className="rounded-xl shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Write Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row-reverse items-center gap-12"
          >
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Write</h2>
              <p className="text-lg text-gray-600 mb-6">
                Let XspensesAI handle the tedious work of financial documentation and reporting, automatically generating the insights and reports you need.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Tax-ready reports with categorized expenses</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Monthly spending summaries with actionable insights</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Custom reports for business expenses and reimbursements</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Automated financial narratives explaining your trends</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Monthly Financial Summary</h3>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    AI-Generated
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Total Income</span>
                      <span className="text-green-600 font-semibold">$5,280.00</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Total Expenses</span>
                      <span className="text-red-600 font-semibold">$3,142.75</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Net Savings</span>
                      <span className="text-blue-600 font-semibold">$2,137.25</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">AI Insights</h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Your savings rate this month was 40.5%, which is excellent and above your 30% target. Your dining expenses decreased by 18% compared to last month, showing good progress toward your goal of reducing food costs.
                    </p>
                    <p className="text-gray-600 text-sm">
                      I noticed a new recurring charge from Netflix ($19.99) that started this month. You already have a Disney+ subscription - consider if you need both services to optimize your entertainment budget.
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <button className="text-primary-600 text-sm font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Download Full Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">AI-Powered Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl ">
              XspensesAI Brain brings intelligent financial management to your fingertips with these powerful features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Categorization",
                description: "Automatically categorizes transactions with 95% accuracy, learning from your corrections over time.",
                icon: <Brain className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Spending Insights",
                description: "Identifies patterns and anomalies in your spending habits with personalized recommendations.",
                icon: <PieChart className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Receipt Scanner",
                description: "Extract data from receipts automatically with our advanced OCR and AI processing.",
                icon: <FileText className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Budget Optimization",
                description: "Suggests personalized budget adjustments based on your actual spending patterns.",
                icon: <Target className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Financial Forecasting",
                description: "Predicts future expenses and helps you plan for upcoming financial needs.",
                icon: <TrendingUp className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Tax Preparation",
                description: "Automatically identifies tax-deductible expenses and generates tax-ready reports.",
                icon: <DollarSign className="h-6 w-6 text-primary-600" />
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Experience AI-Powered Financial Management?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-3xl ">
              Join thousands of users who are saving time and money with XspensesAI Brain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/features/how-it-works"
                className="inline-flex items-center px-8 py-4 bg-transparent border border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Explore How It Works
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
}
