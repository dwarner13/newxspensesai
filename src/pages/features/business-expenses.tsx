import React from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const BusinessExpensesFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Small Business Expense Intelligence - AI Business Finance | XspensesAI</title>
        <meta name="description" content="AI-powered expense management for small businesses. Track business spending, optimize cash flow, and make data-driven financial decisions with intelligent insights." />
        <meta name="keywords" content="small business expense tracking, business financial intelligence, AI business accounting, cash flow management, business expense optimization" />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Business Expense Intelligence</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">AI That Understands Your Business Finance</h2>
            <p className="mb-8 text-lg text-purple-100">Get intelligent insights into your business spending patterns, optimize cash flow, and make data-driven decisions with AI that understands small business challenges.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">📈</span> Optimize business cash flow automatically</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-yellow-200 text-2xl">💰</span> Find hidden cost savings opportunities</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-blue-200 text-2xl">📊</span> AI-powered business financial insights</div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Optimize My Business Finances</button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col items-center">
              <div className="w-full mb-4">
                <h4 className="font-semibold text-white mb-2">Cash Flow Intelligence</h4>
                <div className="w-full h-24 bg-gradient-to-r from-purple-200 to-blue-200 rounded-lg flex items-end gap-2 p-2">
                  <div className="bg-green-400 rounded w-1/6" style={{height: '80%'}}></div>
                  <div className="bg-green-300 rounded w-1/6" style={{height: '60%'}}></div>
                  <div className="bg-red-300 rounded w-1/6" style={{height: '40%'}}></div>
                  <div className="bg-green-500 rounded w-1/6" style={{height: '90%'}}></div>
                  <div className="flex-1"></div>
                </div>
                <p className="text-purple-100 text-xs mt-2">AI Insight: "Peak expenses in month 3 due to equipment purchases. Consider spreading major purchases across quarters."</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Business Features Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Smart Business Financial Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💼</div>
              <h3 className="font-semibold text-lg mb-2">Cash Flow Optimization</h3>
              <p className="text-gray-600 mb-3">AI analyzes spending patterns and predicts cash flow needs to optimize business financial health</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Predictive cash flow modeling</li>
                <li>Seasonal spending pattern analysis</li>
                <li>Vendor payment optimization</li>
                <li>Emergency fund recommendations</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-semibold text-lg mb-2">Cost Savings Discovery</h3>
              <p className="text-gray-600 mb-3">Identify recurring expenses that can be optimized and subscriptions that aren't providing value</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Subscription audit and optimization</li>
                <li>Vendor price comparison alerts</li>
                <li>Duplicate expense detection</li>
                <li>Cost per acquisition analysis</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold text-lg mb-2">Business Growth Insights</h3>
              <p className="text-gray-600 mb-3">Understand which expenses drive revenue growth and which ones don't provide ROI</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>ROI tracking by expense category</li>
                <li>Marketing spend effectiveness</li>
                <li>Equipment investment analysis</li>
                <li>Growth opportunity identification</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold text-lg mb-2">Real-Time Financial Health</h3>
              <p className="text-gray-600 mb-3">Monitor business financial health with real-time metrics and early warning systems</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Business financial health score</li>
                <li>Cash burn rate monitoring</li>
                <li>Profitability trend analysis</li>
                <li>Financial risk early warnings</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default BusinessExpensesFeaturePage; 
