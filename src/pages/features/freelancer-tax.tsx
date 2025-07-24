import React, { useState, useEffect } from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const FreelancerTaxAssistantPage = () => {
  const [country, setCountry] = useState('US');
  const [annualRevenue, setAnnualRevenue] = useState(75000);
  const [workType, setWorkType] = useState('Graphic Designer');

  // Auto-detect country (optional)
  useEffect(() => {
    const detectCountry = () => {
      const locale = navigator.language;
      if (locale.includes('CA') || locale.includes('ca')) {
        setCountry('CA');
      }
    };
    detectCountry();
  }, []);

  // Calculate savings based on country and revenue
  const calculateSavings = () => {
    const baseRate = country === 'US' ? 0.035 : 0.045;
    const estimated = Math.round(annualRevenue * baseRate);
    return country === 'US' ? `$${estimated.toLocaleString()}` : `$${estimated.toLocaleString()} CAD`;
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Freelancer Tax Assistant - Find $3,200+ in Deductions | XspensesAI</title>
        <meta name="description" content="Revolutionary AI finds missed tax deductions, automates quarterly planning, and provides audit-proof documentation. Average freelancer saves $3,200+ with smart tax optimization." />
        <meta name="keywords" content="freelancer tax assistant, AI tax deduction finder, tax software for freelancers, automated tax tracking, freelance expense tracker, AI tax compliance, AI finds missed tax deductions, automated quarterly tax calculator, freelancer tax audit protection, smart business expense categorization, AI tax optimization for contractors, automated 1099 tax preparation" />
        <meta property="og:title" content="AI Freelancer Tax Assistant - Find $3,200+ in Deductions | XspensesAI" />
        <meta property="og:description" content="Revolutionary AI finds missed tax deductions, automates quarterly planning, and provides audit-proof documentation. Average freelancer saves $3,200+ with smart tax optimization." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Freelancer Tax Assistant - Find $3,200+ in Deductions | XspensesAI" />
        <meta name="twitter:description" content="Revolutionary AI finds missed tax deductions and provides audit-proof documentation." />
      </Helmet>

      {/* Hero Section with Dark Gradient */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            {/* Country Selector */}
            <div className="flex mb-6">
              <div className="bg-white/10 rounded-lg p-1 backdrop-blur-sm">
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    country === 'US' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setCountry('US')}
                >
                  🇺🇸 United States
                </button>
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    country === 'CA' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setCountry('CA')}
                >
                  🇨🇦 Canada
                </button>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">AI Freelancer Tax Assistant</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Find $3,200+ in Hidden Deductions</h2>
            <p className="mb-8 text-lg text-purple-100">
              Revolutionary AI that finds missed tax deductions, automates quarterly planning, and provides audit-proof documentation. 
              {country === 'US' 
                ? ' IRS-compliant tracking for US freelancers, contractors, and gig workers.'
                : ' CRA-compliant tracking for Canadian freelancers, contractors, and self-employed professionals.'
              }
            </p>
            
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg">
                <span className="text-pink-200 text-2xl">🔍</span> 
                AI finds deductions you missed
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-blue-200 text-2xl">📊</span> 
                94% accuracy in expense categorization
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-green-200 text-2xl">🛡️</span> 
                Audit-proof documentation automatically
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/signup" 
                className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300"
              >
                Find My Hidden Deductions
              </Link>
              <a 
                href="#calculator"
                className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Start Saving on Taxes Today
              </a>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
              <div className="flex flex-col items-center mb-4">
                <span className="text-purple-200 text-5xl mb-2">💰</span>
                <span className="font-semibold text-lg text-white">Your Tax Savings Preview</span>
              </div>
              <div className="text-xl font-bold text-green-300 mb-2">
                {country === 'US' ? '$3,247' : '$4,156 CAD'}
              </div>
              <div className="text-purple-200 text-sm mb-4">Average deductions found</div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Home office deduction</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Equipment & software</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Business meals (50%)</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Professional development</span>
                  <span>✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Deduction Discovery Showcase */}
        <section className="max-w-6xl mx-auto px-4 mb-20 pt-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            AI Discovers Deductions You Never Knew Existed
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Real Deduction Discoveries</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Web Designer Sarah</div>
                  <div className="text-sm font-semibold">AI found $847 in home office deductions missed for 3 years</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Consultant Mike</div>
                  <div className="text-sm font-semibold">Discovered $1,200 in vehicle deductions from Uber receipts</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Photographer Lisa</div>
                  <div className="text-sm font-semibold">Found overlooked equipment depreciation worth $580</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">AI Tax Intelligence</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Universal Document Parsing</div>
                    <div className="text-sm text-gray-600">Works with any bank, receipt, or tax document format</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Smart Categorization</div>
                    <div className="text-sm text-gray-600">94% accuracy in business vs personal expense classification</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Audit-Proof Documentation</div>
                    <div className="text-sm text-gray-600">Automatically creates compliant records for {country === 'US' ? 'IRS' : 'CRA'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Tax Savings Calculator */}
        <section id="calculator" className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              See How Much You Could Save This Tax Year
            </h2>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Side */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Your {country === 'US' ? 'Freelance' : 'Self-Employment'} Info
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-100 mb-2">
                        Annual Revenue ({country === 'US' ? 'USD' : 'CAD'})
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
                        Work Type
                      </label>
                      <select 
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value)}
                        className="w-full p-3 rounded-lg text-gray-900"
                      >
                        <option>Graphic Designer</option>
                        <option>Writer/Content Creator</option>
                        <option>Web Developer</option>
                        <option>Consultant</option>
                        <option>Photographer</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Results Side - Country Specific */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI-Predicted Savings</h3>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 space-y-3">
                    {country === 'US' ? (
                      <>
                        <div className="flex justify-between">
                          <span>Home Office Deduction</span>
                          <span className="font-bold">$1,200</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equipment & Software</span>
                          <span className="font-bold">$890</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Business Meals (50%)</span>
                          <span className="font-bold">$456</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Professional Development</span>
                          <span className="font-bold">$340</span>
                        </div>
                        <div className="border-t border-white border-opacity-30 pt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Estimated Savings</span>
                            <span className="text-yellow-300">{calculateSavings()}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Home Office Expenses</span>
                          <span className="font-bold">$1,540 CAD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equipment & Software</span>
                          <span className="font-bold">$1,140 CAD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Business Meals (50%)</span>
                          <span className="font-bold">$585 CAD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Professional Development</span>
                          <span className="font-bold">$435 CAD</span>
                        </div>
                        <div className="border-t border-white border-opacity-30 pt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Estimated Savings</span>
                            <span className="text-yellow-300">{calculateSavings()}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Based on analysis of 10,000+ {country === 'US' ? 'US freelancer' : 'Canadian self-employed'} tax returns
              </p>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                Get My Tax Savings Report
              </Link>
            </div>
          </div>
        </section>

        {/* Problems vs Solutions */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Stop Leaving Money on the Table
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Problems Column */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-6">
                  😰 {country === 'US' ? 'US Freelancer' : 'Canadian Self-Employment'} Tax Nightmares
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Missing Deductions</h4>
                      <p className="text-sm text-gray-600">
                        Average {country === 'US' ? 'US freelancer' : 'Canadian self-employed'} misses{' '}
                        {country === 'US' ? '$3,200' : '$4,100 CAD'} in legitimate deductions annually
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {country === 'US' ? 'Quarterly Estimate Stress' : 'GST/HST & Income Tax Confusion'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {country === 'US' 
                          ? '47% of freelancers underpay quarterly taxes and face penalties'
                          : 'Complex GST/HST registration thresholds and quarterly remittances'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Messy Record Keeping</h4>
                      <p className="text-sm text-gray-600">Shoebox full of receipts and last-minute panic every April</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {country === 'US' ? 'IRS Audit Fear' : 'CRA Review Anxiety'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Constant worry about incorrect categorization and{' '}
                        {country === 'US' ? 'IRS' : 'CRA'} compliance
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Solutions Column */}
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-6">🤖 AI Tax Assistant Solution</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">AI Deduction Finder</h4>
                      <p className="text-sm text-gray-600">Scans every expense and finds deductions other software misses</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {country === 'US' ? 'Smart Quarterly Estimates' : 'GST/HST & Tax Planning'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {country === 'US' 
                          ? 'AI predicts your tax liability and sets aside the right amount automatically'
                          : 'AI handles GST/HST calculations and income tax installments automatically'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Automatic Organization</h4>
                      <p className="text-sm text-gray-600">Every receipt categorized and organized for {country === 'US' ? 'IRS' : 'CRA'} compliance</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {country === 'US' ? 'Audit-Proof' : 'CRA Review-Ready'} Documentation
                      </h4>
                      <p className="text-sm text-gray-600">
                        AI ensures every deduction is properly documented for {country === 'US' ? 'IRS audits' : 'CRA reviews'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Features Showcase */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              AI Features Built Specifically for Freelancers
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🏠</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Home Office Calculator</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {country === 'US' 
                    ? 'AI calculates optimal home office deduction method (simplified vs. actual expense) and tracks usage automatically.'
                    : 'AI calculates home office expenses using CRA guidelines (flat rate or detailed method) and tracks business use percentage.'
                  }
                </p>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> 200 sq ft office in 1,500 sq ft home = 
                    {country === 'US' ? ' $1,200/year deduction' : ' $1,540 CAD/year deduction'}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">💼</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {country === 'US' ? 'Business vs Personal AI' : 'Business Use Percentage AI'}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {country === 'US'
                    ? 'AI learns your patterns and automatically splits mixed-use expenses (phone, internet, meals) correctly.'
                    : 'AI calculates reasonable business use percentage for mixed-use expenses per CRA guidelines.'
                  }
                </p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> Internet bill auto-split 70% business, 30% personal based on usage
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {country === 'US' ? 'Quarterly Tax Predictor' : 'GST/HST & Installment Calculator'}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {country === 'US'
                    ? 'AI forecasts your annual tax liability and recommends optimal quarterly payment amounts.'
                    : 'AI manages GST/HST remittances and calculates income tax installment payments.'
                  }
                </p>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Next Payment:</strong> 
                    {country === 'US' ? ' $2,847 due Jan 15th (AI optimized)' : ' $3,650 CAD due Mar 15th (GST/HST + Tax)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Success Stories & Savings */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Real Freelancers, Real Savings
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold">SR</span>
                  </div>
                  <div>
                    <div className="font-semibold">Sarah R.</div>
                    <div className="text-sm text-gray-600">Graphic Designer, Toronto 🇨🇦</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "Found $5,400 CAD in deductions I missed. AI caught my Adobe subscription and home office expenses perfectly for CRA compliance!"
                </p>
                <div className="text-green-600 font-semibold">Saved: $2,160 CAD in taxes</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">MJ</span>
                  </div>
                  <div>
                    <div className="font-semibold">Mike J.</div>
                    <div className="text-sm text-gray-600">Web Developer, Austin 🇺🇸</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "No more quarterly estimate guessing. AI predicts exactly what I'll owe the IRS and sets money aside automatically."
                </p>
                <div className="text-green-600 font-semibold">Avoided: $890 IRS penalty</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">LC</span>
                  </div>
                  <div>
                    <div className="font-semibold">Lisa C.</div>
                    <div className="text-sm text-gray-600">Copywriter, Vancouver 🇨🇦</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  "From tax procrastination to CRA confidence. AI handles GST/HST and income tax while I focus on clients."
                </p>
                <div className="text-green-600 font-semibold">Time saved: 40 hours</div>
              </div>
            </div>
          </div>
        </section>

        {/* Audio Integration */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Tax Anxiety? Your AI Has Audio Solutions
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🎧</span>
                  <h3 className="text-lg font-semibold">Tax Strategy Podcasts</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  {country === 'US' ? (
                    <>
                      <li>• "Your Q4 Deduction Opportunities"</li>
                      <li>• "Why Your Home Office Deduction Increased"</li>
                      <li>• "Equipment Purchase vs. Lease Analysis"</li>
                      <li>• "Year-End Tax Planning for Your Business"</li>
                    </>
                  ) : (
                    <>
                      <li>• "Your Q4 Business Expense Review"</li>
                      <li>• "GST/HST Registration: Should You Register?"</li>
                      <li>• "Capital vs Current Expense Classification"</li>
                      <li>• "Year-End Tax Planning for Self-Employed"</li>
                    </>
                  )}
                </ul>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-600">Now Playing:</div>
                  <div className="text-xs text-gray-600">
                    {country === 'US' 
                      ? '"Maximizing Your 2024 Deductions - Personal Analysis"'
                      : '"CRA-Compliant Home Office Deductions - Your Situation"'
                    }
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🎵</span>
                  <h3 className="text-lg font-semibold">Tax Season Playlists</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li>• "Focus Flow - Tax Preparation"</li>
                  <li>• "Calm Confidence - {country === 'US' ? 'IRS' : 'CRA'} Stress Relief"</li>
                  <li>• "Victory Vibes - After Filing"</li>
                  <li>• "Planning Power - Quarterly Reviews"</li>
                </ul>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs font-medium text-green-600">Recommended:</div>
                  <div className="text-xs text-gray-600">"Deep Focus Instrumentals - Receipt Organization"</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
          <div className="text-center px-6">
            <h2 className="text-3xl font-bold text-white mb-6">
              Stop Overpaying Taxes. Start Today.
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join 5,000+ freelancers who've eliminated tax stress and maximized deductions with AI-powered tax assistance.
            </p>
            <div className="mb-6">
              <div className="text-yellow-300 text-lg font-semibold">
                Limited Time: Get your first year's tax optimization for ${country === 'US' ? '49' : '59 CAD'}/month
              </div>
              <div className="text-purple-200 text-sm">
                (Reg. ${country === 'US' ? '79' : '89 CAD'}/month • Cancel anytime)
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start My Tax Optimization
              </Link>
              <a
                href="#calculator"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
              >
                See Tax Calculator Demo
              </a>
            </div>
            <div className="mt-6 text-purple-200 text-sm">
              ✓ 14-day free trial  ✓ No setup fees  ✓ Cancel anytime
            </div>
          </div>
        </section>
      </div>
    </WebsiteLayout>
  );
};

export default FreelancerTaxAssistantPage; 