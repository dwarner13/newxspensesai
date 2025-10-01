import React, { useState } from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const BusinessExpenseIntelligencePage = () => {
  const [businessType, setBusinessType] = useState('SaaS');
  const [annualRevenue, setAnnualRevenue] = useState(500000);
  const [teamSize, setTeamSize] = useState(25);

  // Calculate business savings
  const calculateBusinessSavings = () => {
    const baseRate = 0.017; // 1.7% of revenue typically saved
    const estimated = Math.round(annualRevenue * baseRate);
    return `$${estimated.toLocaleString()}`;
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Business Intelligence - Save $8,400+ Annually | XspensesAI</title>
        <meta name="description" content="Revolutionary AI Business Intelligence finds hidden deductions, automates expense management, and provides real-time financial insights. Average business saves $8,400+ with smart automation." />
        <meta name="keywords" content="business intelligence AI, AI expense management, automated business analytics, smart business expense tracker, AI financial reporting, business expense intelligence, AI finds business tax deductions automatically, smart business expense categorization, automated financial insights for business, AI business expense audit protection, intelligent business spending analytics, automated business tax compliance" />
        <meta property="og:title" content="AI Business Intelligence - Save $8,400+ Annually | XspensesAI" />
        <meta property="og:description" content="Revolutionary AI Business Intelligence finds hidden deductions, automates expense management, and provides real-time financial insights." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Business Intelligence - Save $8,400+ Annually | XspensesAI" />
        <meta name="twitter:description" content="Revolutionary AI Business Intelligence finds hidden deductions and provides real-time financial insights." />
      </Helmet>

      {/* Hero Section with Dark Gradient */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            {/* Business Type Selector */}
            <div className="flex mb-6">
              <div className="bg-white/10 rounded-lg p-1 backdrop-blur-sm">
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    businessType === 'SaaS' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setBusinessType('SaaS')}
                >
                  🚀 SaaS/Tech
                </button>
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    businessType === 'Manufacturing' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setBusinessType('Manufacturing')}
                >
                  🏭 Manufacturing
                </button>
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    businessType === 'Consulting' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setBusinessType('Consulting')}
                >
                  💼 Consulting
                </button>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Business Intelligence Assistant</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Transform Expenses Into Profit</h2>
            <p className="mb-8 text-lg text-purple-100">
              Revolutionary AI that turns your business expenses into strategic intelligence. Automate expense management, 
              discover hidden deductions, and get real-time insights that drive profitability. 
              {businessType === 'SaaS' && ' Perfect for scaling tech companies and SaaS businesses.'}
              {businessType === 'Manufacturing' && ' Optimized for manufacturing operations and equipment deductions.'}
              {businessType === 'Consulting' && ' Ideal for consulting firms and professional services.'}
            </p>
            
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg">
                <span className="text-pink-200 text-2xl">📊</span> 
                AI discovers $8,400+ in hidden business deductions
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-blue-200 text-2xl">⚡</span> 
                Automates 12+ hours of monthly financial work
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-green-200 text-2xl">🎯</span> 
                Real-time spending analytics and predictive insights
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/signup" 
                className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300"
              >
                Transform My Business Intelligence
              </Link>
              <a 
                href="#calculator"
                className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Calculate My Business Savings
              </a>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
              <div className="flex flex-col items-center mb-4">
                <span className="text-purple-200 text-5xl mb-2">📈</span>
                <span className="font-semibold text-lg text-white">Your Business Intelligence Preview</span>
              </div>
              <div className="text-xl font-bold text-green-300 mb-2">
                {calculateBusinessSavings()}
              </div>
              <div className="text-purple-200 text-sm mb-4">Annual savings potential</div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>R&D tax credits</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Equipment depreciation</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Team expense automation</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Predictive cash flow</span>
                  <span>✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Business Intelligence Showcase */}
        <section className="max-w-6xl mx-auto px-4 mb-20 pt-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            AI Discovers Business Intelligence You Never Knew Existed
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Real Business Intelligence Discoveries</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Tech Startup - SaaS</div>
                  <div className="text-sm font-semibold">AI found $12,000 in missed R&D tax credits and $8,400 in equipment deductions</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Manufacturing Company</div>
                  <div className="text-sm font-semibold">Discovered $18,000 in equipment depreciation and $6,200 in operational deductions</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Consulting Firm</div>
                  <div className="text-sm font-semibold">Automated expense categorization saved 15 hours weekly for accounting team</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">AI Business Intelligence Engine</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Universal Business Document Parsing</div>
                    <div className="text-sm text-gray-600">Works with any business system, ERP, or accounting software</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Multi-Entity Intelligence</div>
                    <div className="text-sm text-gray-600">Manages complex business structures and multiple entities</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Predictive Business Analytics</div>
                    <div className="text-sm text-gray-600">Real-time insights and cash flow predictions for strategic decisions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Business Savings Calculator */}
        <section id="calculator" className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Calculate Your Business Intelligence ROI
            </h2>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Side */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Business Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-100 mb-2">
                        Annual Revenue (USD)
                      </label>
                      <input 
                        type="number" 
                        value={annualRevenue}
                        onChange={(e) => setAnnualRevenue(parseInt(e.target.value) || 0)}
                        className="w-full p-3 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-100 mb-2">
                        Team Size
                      </label>
                      <select 
                        value={teamSize}
                        onChange={(e) => setTeamSize(parseInt(e.target.value) || 0)}
                        className="w-full p-3 rounded-lg text-gray-900"
                      >
                        <option value={5}>1-10 employees</option>
                        <option value={25}>11-50 employees</option>
                        <option value={75}>51-200 employees</option>
                        <option value={250}>200+ employees</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-100 mb-2">
                        Business Type
                      </label>
                      <select 
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full p-3 rounded-lg text-gray-900"
                      >
                        <option value="SaaS">SaaS/Tech</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Consulting">Consulting</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Results Side */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI-Predicted Business Intelligence ROI</h3>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span>Annual Tax Savings</span>
                      <span className="font-bold">{calculateBusinessSavings()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Savings (Monthly)</span>
                      <span className="font-bold">{Math.round(teamSize * 0.5)} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Productivity Gain</span>
                      <span className="font-bold">{Math.round(teamSize * 0.15)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance Cost Reduction</span>
                      <span className="font-bold">${Math.round(teamSize * 120)}</span>
                    </div>
                    <div className="border-t border-white border-opacity-30 pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Annual Value</span>
                        <span className="text-yellow-300">${Math.round(parseInt(calculateBusinessSavings().replace(/[$,]/g, '')) + (teamSize * 120 * 12)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Based on analysis of 5,000+ businesses using AI Business Intelligence
              </p>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                Get My Business Intelligence Report
              </Link>
            </div>
          </div>
        </section>

        {/* Business Pain Points vs AI Solutions */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Stop Losing Money to Manual Processes
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Problems Column */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-6">
                  😰 Business Intelligence Nightmares
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Manual Expense Categorization</h4>
                      <p className="text-sm text-gray-600">
                        Accounting teams spend 15+ hours weekly manually categorizing expenses, leading to errors and missed deductions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Hidden Deduction Blind Spots</h4>
                      <p className="text-sm text-gray-600">
                        Average business misses $8,400+ annually in legitimate deductions due to complex tax codes and oversight
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Inconsistent Team Reporting</h4>
                      <p className="text-sm text-gray-600">Different employees categorize expenses differently, creating compliance risks and audit exposure</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Financial Blind Spots</h4>
                      <p className="text-sm text-gray-600">
                        No real-time visibility into spending patterns, leading to budget overruns and missed optimization opportunities
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Solutions Column */}
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-6">🤖 AI Business Intelligence Solution</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Automated Expense Intelligence</h4>
                      <p className="text-sm text-gray-600">AI categorizes expenses with 94% accuracy, saving 15+ hours weekly and eliminating manual errors</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">AI Deduction Discovery</h4>
                      <p className="text-sm text-gray-600">
                        AI scans every transaction and finds deductions other systems miss, averaging $8,400+ in annual savings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Team Standardization</h4>
                      <p className="text-sm text-gray-600">AI ensures consistent categorization across all team members, reducing compliance risks</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Real-Time Business Intelligence</h4>
                      <p className="text-sm text-gray-600">
                        Live spending analytics and predictive insights help prevent budget overruns and optimize cash flow
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Business Intelligence Features */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Enterprise-Grade Business Intelligence Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Expense Categorization</h3>
                <p className="text-gray-600 text-sm mb-4">
                  AI automatically categorizes business expenses with 94% accuracy, learning your business patterns and industry-specific requirements.
                </p>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> R&D expenses, equipment depreciation, team travel, and operational costs automatically identified and categorized
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Multi-Entity Management</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Manage complex business structures with multiple entities, subsidiaries, and departments through unified AI intelligence.
                </p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> Consolidated reporting across 5 subsidiaries with automatic intercompany expense allocation
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Predictive Cash Flow Analytics</h3>
                <p className="text-gray-600 text-sm mb-4">
                  AI analyzes spending patterns and provides predictive insights for cash flow management and strategic planning.
                </p>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> Predicts cash flow needs 30 days ahead with 92% accuracy based on historical patterns
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business Success Stories */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Real Businesses, Real Intelligence Results
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold">TS</span>
                  </div>
                  <div>
                    <div className="font-semibold">TechStart Inc.</div>
                    <div className="text-sm text-gray-600">SaaS Company, 50 employees</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "AI discovered $12,000 in missed R&D tax credits and automated our expense categorization. Our accounting team now focuses on strategic analysis instead of data entry."
                </p>
                <div className="text-green-600 font-semibold">Result: 40% reduction in accounting overhead</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">MF</span>
                  </div>
                  <div>
                    <div className="font-semibold">ManufacturePro</div>
                    <div className="text-sm text-gray-600">Manufacturing, 200 employees</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "Found $18,000 in equipment depreciation and $6,200 in operational deductions. Real-time spending alerts prevented a $25,000 budget overrun."
                </p>
                <div className="text-green-600 font-semibold">Result: $24,200 in annual savings</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">CF</span>
                  </div>
                  <div>
                    <div className="font-semibold">ConsultFirst</div>
                    <div className="text-sm text-gray-600">Consulting Firm, 75 employees</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "Multi-entity management reduced compliance costs by 60%. Team expense accuracy improved to 98% with automated categorization."
                </p>
                <div className="text-green-600 font-semibold">Result: 15 hours weekly time savings</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-yellow-600 font-bold">EC</span>
                  </div>
                  <div>
                    <div className="font-semibold">EcomBoost</div>
                    <div className="text-sm text-gray-600">E-commerce, 30 employees</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "Predictive cash flow analytics helped us optimize inventory purchasing. AI insights increased our profit margins by 8% through better expense management."
                </p>
                <div className="text-green-600 font-semibold">Result: 8% profit margin increase</div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Intelligence Integration */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Enterprise-Grade Business Intelligence Integration
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🔗</span>
                  <h3 className="text-lg font-semibold">Seamless System Integration</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li>• QuickBooks, Xero, Sage integration</li>
                  <li>• ERP system connectivity (NetSuite, SAP)</li>
                  <li>• API access for custom integrations</li>
                  <li>• Real-time data synchronization</li>
                </ul>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-600">Integration Time:</div>
                  <div className="text-xs text-gray-600">Setup in under 2 hours, full sync in 24 hours</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🛡️</span>
                  <h3 className="text-lg font-semibold">Enterprise Security & Compliance</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li>• SOC 2 Type II certified</li>
                  <li>• GDPR and CCPA compliant</li>
                  <li>• Bank-level encryption (256-bit AES)</li>
                  <li>• Role-based access controls</li>
                </ul>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs font-medium text-green-600">Security Level:</div>
                  <div className="text-xs text-gray-600">Enterprise-grade with 99.9% uptime SLA</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
          <div className="text-center px-6">
            <h2 className="text-3xl font-bold text-white mb-6">
              Transform Your Business Intelligence Today
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join 2,000+ businesses that have turned expense management from a cost center into a profit driver with AI-powered business intelligence.
            </p>
            <div className="mb-6">
              <div className="text-yellow-300 text-lg font-semibold">
                Limited Time: Enterprise Business Intelligence for $199/month
              </div>
              <div className="text-purple-200 text-sm">
                (Reg. $299/month • Includes unlimited users and entities • Cancel anytime)
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start My Business Intelligence
              </Link>
              <a
                href="#calculator"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
              >
                Calculate My Business ROI
              </a>
            </div>
            <div className="mt-6 text-purple-200 text-sm">
              ✓ 30-day free trial  ✓ No setup fees  ✓ Enterprise support  ✓ Cancel anytime
            </div>
          </div>
        </section>
      </div>
    </WebsiteLayout>
  );
};

export default BusinessExpenseIntelligencePage; 
