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
import WebsiteLayout from '../../components/layout/WebsiteLayout';

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
    </WebsiteLayout>
  );
};

export default PersonalBusinessGoalsPage;
