import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Target, 
  TrendingUp, 
  Bell, 
  PieChart, 
  BarChart, 
  DollarSign,
  Briefcase,
  User,
  CheckCircle,
  Calendar,
  AlertCircle,
  Zap,
  Brain
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import PageHeader from '../../components/layout/PageHeader';

const PersonalBusinessGoalsPage = () => {
  // Mock data for personal goals
  const personalGoals = [
    { 
      name: "Emergency Fund", 
      target: 10000, 
      current: 6500, 
      category: "Savings",
      deadline: "2025-12-31",
      progress: 65
    },
    { 
      name: "Vacation Fund", 
      target: 3000, 
      current: 1200, 
      category: "Travel",
      deadline: "2025-08-15",
      progress: 40
    },
    { 
      name: "New Laptop", 
      target: 2000, 
      current: 1800, 
      category: "Electronics",
      deadline: "2025-07-01",
      progress: 90
    }
  ];

  // Mock data for business goals
  const businessGoals = [
    { 
      name: "Marketing Budget", 
      target: 5000, 
      current: 2300, 
      category: "Marketing",
      deadline: "2025-Q2",
      progress: 46
    },
    { 
      name: "Office Supplies", 
      target: 1200, 
      current: 450, 
      category: "Office",
      deadline: "2025-Q2",
      progress: 37.5
    },
    { 
      name: "Tax Savings", 
      target: 8000, 
      current: 3200, 
      category: "Taxes",
      deadline: "2025-Q4",
      progress: 40
    }
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-50 to-secondary-50 py-20 px-4">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Personal & Business Goals</h1>
            <p className="text-xl text-gray-700 max-w-3xl  mb-8">
              Set, track, and achieve your financial goals with AI-powered insights and automated tracking.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Start Setting Goals
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Personal Goals Section */}
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
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Personal Financial Goals</h2>
              <p className="text-lg text-gray-600 mb-6">
                Set personal financial goals that matter to you, from building an emergency fund to saving for your dream vacation. XspensesAI helps you track progress and stay motivated.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Personalized goal recommendations based on your spending habits</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Automatic progress tracking as you save</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Smart alerts when you're off track or approaching milestones</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Celebrate achievements with XP rewards and badges</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Personal Goals</h3>
                  <button className="text-primary-600 text-sm font-medium">+ Add Goal</button>
                </div>
                
                <div className="space-y-6">
                  {personalGoals.map((goal, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.name}</h4>
                          <div className="flex items-center text-xs text-gray-500 space-x-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{goal.category}</span>
                            <span>•</span>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>Due {goal.deadline}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</div>
                          <div className="text-xs text-gray-500">{goal.progress}% complete</div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            goal.progress >= 90 ? 'bg-green-500' : 
                            goal.progress >= 50 ? 'bg-blue-500' : 
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                      
                      {goal.progress >= 90 && (
                        <div className="mt-2 flex items-center text-xs text-green-600">
                          <Zap className="h-3 w-3 mr-1" />
                          <span>Almost there! Just {formatCurrency(goal.target - goal.current)} to go.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Business Goals Section */}
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
                <Briefcase className="h-8 w-8 text-secondary-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Business Expense Goals</h2>
              <p className="text-lg text-gray-600 mb-6">
                Keep your business finances on track with smart budgeting and expense tracking. XspensesAI helps you manage business expenses efficiently and prepare for tax season.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Separate business and personal expenses automatically</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Track expenses by project, client, or category</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Set budget limits with real-time alerts</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">Generate tax-ready reports for deductions</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Business Goals</h3>
                  <div className="flex space-x-2">
                    <button className="text-primary-600 text-sm font-medium">Q2 2025</button>
                    <button className="text-primary-600 text-sm font-medium">+ Add Goal</button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {businessGoals.map((goal, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.name}</h4>
                          <div className="flex items-center text-xs text-gray-500 space-x-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{goal.category}</span>
                            <span>•</span>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{goal.deadline}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</div>
                          <div className="text-xs text-gray-500">{goal.progress}% of budget used</div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            goal.progress >= 90 ? 'bg-red-500' : 
                            goal.progress >= 75 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                      
                      {goal.progress >= 75 && goal.progress < 90 && (
                        <div className="mt-2 flex items-center text-xs text-yellow-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          <span>Approaching budget limit. {formatCurrency(goal.target - goal.current)} remaining.</span>
                        </div>
                      )}
                      
                      {goal.progress >= 90 && (
                        <div className="mt-2 flex items-center text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          <span>Budget almost depleted! Only {formatCurrency(goal.target - goal.current)} left.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI-Driven Budgeting Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">AI-Driven Budgeting</h2>
            <p className="text-xl text-gray-600 max-w-3xl ">
              XspensesAI analyzes your spending patterns to create personalized budgets that actually work for your lifestyle.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Budget Creation",
                description: "AI analyzes your spending history to suggest realistic budgets based on your actual habits.",
                icon: <Brain className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Auto-Categorization",
                description: "Transactions are automatically categorized with 95% accuracy, saving you hours of manual work.",
                icon: <PieChart className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Real-Time Alerts",
                description: "Get notified when you're approaching budget limits or when unusual spending is detected.",
                icon: <Bell className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Goal Progress Tracking",
                description: "Visual progress bars and milestone celebrations keep you motivated toward your goals.",
                icon: <Target className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Spending Insights",
                description: "Understand where your money goes with detailed breakdowns and trend analysis.",
                icon: <BarChart className="h-6 w-6 text-primary-600" />
              },
              {
                title: "Savings Opportunities",
                description: "AI identifies potential savings and suggests adjustments to help you reach goals faster.",
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

      {/* Visual Mockup Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container  max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Track Your Progress Visually</h2>
              <p className="text-lg text-gray-600 mb-6">
                XspensesAI provides beautiful, intuitive visualizations of your financial goals and progress, making it easy to stay motivated and on track.
              </p>
              
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Progress Tracking</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Visual progress bars and charts show exactly how close you are to reaching your goals.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Timeline Projections</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    See when you'll reach your goals based on current savings rates and get suggestions to speed things up.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-2">
                    <Zap className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Milestone Celebrations</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Earn XP, badges, and celebrations when you hit milestones on your financial journey.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="md:w-1/2">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Savings Goal: Home Down Payment</h3>
                
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">$32,500 / $50,000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-4 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <span className="text-gray-500">65% complete</span>
                    <span className="text-gray-500">$17,500 to go</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Timeline</span>
                    <span className="font-medium">8 months left</span>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="h-4 w-4 mr-2 text-primary-600" />
                      <span>Target date: December 15, 2025</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700 mt-2">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                      <span>You're ahead of schedule by 1 month!</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <div className="flex items-start">
                    <Zap className="h-5 w-5 text-primary-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-primary-900 mb-1">AI Suggestion</h4>
                      <p className="text-sm text-primary-700">
                        Increasing your monthly contribution by $250 would help you reach your goal 2 months earlier. Based on your spending patterns, you could save this amount by reducing dining expenses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Achieve Your Financial Goals?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-3xl ">
              Join thousands of users who are reaching their financial goals faster with XspensesAI.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container  px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-lg font-bold">XspensesAI</span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered financial clarity for everyone.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</Link></li>
                <li><a href="mailto:support@xspensesai.com" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} XspensesAI. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0">
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm mr-4 transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PersonalBusinessGoalsPage;
