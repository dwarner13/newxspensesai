import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const WellnessStudioFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Financial Wellness Made Easy with AI | XspensesAI Platform</title>
        <meta name="description" content="Transform financial stress into confidence with XspensesAI's revolutionary AI-powered financial wellness platform. Get personalized insights, automated tracking, and entertaining money management." />
        <meta name="keywords" content="financial wellness, personal finance management, AI financial advisor, financial stress relief, money management tools, financial planning app, AI financial wellness platform, personalized financial therapy, automated expense tracking with AI, financial anxiety relief app, smart money management software, AI-powered budgeting assistant" />
        <meta property="og:title" content="Financial Wellness Made Easy with AI | XspensesAI Platform" />
        <meta property="og:description" content="Transform financial stress into confidence with XspensesAI's revolutionary AI-powered financial wellness platform. Get personalized insights, automated tracking, and entertaining money management." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Financial Wellness Made Easy with AI | XspensesAI Platform" />
        <meta name="twitter:description" content="Transform financial stress into confidence with XspensesAI's revolutionary AI-powered financial wellness platform." />
      </Helmet>

      {/* Hero Section with Dark Gradient */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Financial Wellness Made Easy with AI</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Transform Financial Stress Into Confidence</h2>
            <p className="mb-8 text-lg text-purple-100">76% of Americans are stressed about money. XspensesAI's revolutionary AI-powered financial wellness platform helps you overcome financial anxiety, build healthy money habits, and achieve lasting financial peace of mind.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">87%</span> <span className="text-purple-100">Reduced financial anxiety</span></div>
              <div className="flex items-center gap-2 text-lg"><span className="text-blue-200 text-2xl">94%</span> <span className="text-purple-100">AI prediction accuracy</span></div>
              <div className="flex items-center gap-2 text-lg"><span className="text-pink-200 text-2xl">8 hrs</span> <span className="text-purple-100">Saved monthly with automation</span></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300">
                Start Your Financial Wellness Journey
              </Link>
              <Link to="/ai-demo" className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300">
                Try AI Financial Therapist
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col items-center">
              <div className="flex flex-col items-center mb-4">
                <div className="text-5xl">🧘‍♀️</div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse mt-2"></div>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-white mb-1">AI Financial Therapist Session</h4>
                <p className="text-purple-200 text-sm mb-2">Personalized stress relief</p>
                <div className="flex items-center gap-2 justify-center">
                  <button className="bg-white/20 text-white px-4 py-2 rounded-full text-lg">▶️ Start Session</button>
                  <span className="text-purple-100 text-sm">10:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Pain Point Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Financial Stress Is Real - And We're Here to Help
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="bg-red-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-red-800 mb-4">The Financial Stress Epidemic</h3>
                <div className="space-y-3 text-red-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">😰</span>
                    <span><strong>76%</strong> of Americans report money as their #1 stress source</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏰</span>
                    <span><strong>5+ hours</strong> monthly spent on financial tasks and worry</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💸</span>
                    <span><strong>68%</strong> live paycheck to paycheck with no emergency fund</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">😴</span>
                    <span><strong>42%</strong> lose sleep due to financial anxiety</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Traditional financial management tools focus on numbers, but ignore the emotional and psychological aspects of money. They leave you feeling overwhelmed, anxious, and alone in your financial journey.
              </p>
              <p className="text-gray-600">
                That's why we created the world's first AI-powered financial wellness platform that addresses both your financial data AND your financial wellbeing.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">How AI Transforms Financial Wellness</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI Analyzes Your Patterns</h4>
                    <p className="text-sm text-gray-600">Advanced algorithms understand your spending triggers and emotional money patterns</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Creates Personalized Wellness Plan</h4>
                    <p className="text-sm text-gray-600">Your AI therapist develops a custom approach to your unique financial challenges</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Provides Ongoing Support & Entertainment</h4>
                    <p className="text-sm text-gray-600">Daily guidance, meditation sessions, and personalized audio content keep you motivated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Solution Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            The World's First AI Financial Therapist
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Emotional Intelligence</h3>
              <p className="text-gray-600 text-center mb-4">
                Our AI understands the psychology behind your spending decisions and provides compassionate, judgment-free support.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Recognizes spending triggers</li>
                <li>• Addresses money anxiety</li>
                <li>• Builds healthy money mindset</li>
                <li>• Provides emotional support</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Personalized Therapy</h3>
              <p className="text-gray-600 text-center mb-4">
                Every session is tailored to your unique financial situation, goals, and emotional relationship with money.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Custom meditation sessions</li>
                <li>• Personalized breathing exercises</li>
                <li>• Targeted stress relief</li>
                <li>• Individual progress tracking</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🎵</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Entertainment-First Approach</h3>
              <p className="text-gray-600 text-center mb-4">
                Financial wellness doesn't have to be boring. Enjoy personalized podcasts, music, and engaging content.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• AI-generated financial podcasts</li>
                <li>• Calming money meditation music</li>
                <li>• Engaging wellness content</li>
                <li>• Gamified progress tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Wellness Programs Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">Comprehensive Financial Wellness Programs</h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            From quick stress relief to deep financial healing, our AI-powered programs address every aspect of your financial wellness journey.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🧘</div>
              <h3 className="font-semibold text-lg mb-2">Money Meditation Sessions</h3>
              <p className="text-gray-600 mb-3">Guided meditations specifically designed to address financial stress and money anxiety</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• 5-30 minute sessions</div>
                <div>• Reduces financial stress</div>
                <div>• Improves money mindset</div>
                <div>• Better financial decisions</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💨</div>
              <h3 className="font-semibold text-lg mb-2">Financial Stress Breathing</h3>
              <p className="text-gray-600 mb-3">Quick breathing exercises to use when financial anxiety strikes or before making big money decisions</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• 2-5 minute exercises</div>
                <div>• Instant stress relief</div>
                <div>• Use anywhere, anytime</div>
                <div>• Guided breathing patterns</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💭</div>
              <h3 className="font-semibold text-lg mb-2">Money Mindfulness Practice</h3>
              <p className="text-gray-600 mb-3">Develop awareness of your spending triggers and build conscious money habits</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• Daily mindfulness prompts</div>
                <div>• Spending trigger awareness</div>
                <div>• Conscious money decisions</div>
                <div>• Habit transformation</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🌙</div>
              <h3 className="font-semibold text-lg mb-2">Financial Sleep Stories</h3>
              <p className="text-gray-600 mb-3">Calming bedtime stories focused on financial success and abundance to reduce money worries at night</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• 15-45 minute stories</div>
                <div>• Reduces nighttime money worry</div>
                <div>• Positive financial visualization</div>
                <div>• Better sleep quality</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Real Results from Real Users
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">94%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">AI Prediction Accuracy</div>
              <div className="text-gray-600">Our AI financial advisor provides insights with industry-leading accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">87%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Reduced Financial Anxiety</div>
              <div className="text-gray-600">Users report significantly less stress about money after 30 days</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">8 hrs</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Monthly Time Saved</div>
              <div className="text-gray-600">Automated tracking and AI insights save hours of manual work</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 font-bold">MK</span>
                </div>
                <div>
                  <div className="font-semibold">Maria K.</div>
                  <div className="text-sm text-gray-600">Marketing Manager</div>
                </div>
              </div>
              <p className="text-gray-700 mb-3">
                "The AI financial therapist helped me understand why I was overspending on coffee when stressed. Now I have healthy coping mechanisms and save $200/month!"
              </p>
              <div className="text-green-600 font-semibold">Stress Level: 9/10 → 3/10</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold">JC</span>
                </div>
                <div>
                  <div className="font-semibold">James C.</div>
                  <div className="text-sm text-gray-600">Freelance Designer</div>
                </div>
              </div>
              <p className="text-gray-700 mb-3">
                "I used to lose sleep worrying about money. The financial sleep stories and meditation sessions have completely changed my relationship with finances."
              </p>
              <div className="text-green-600 font-semibold">Sleep Quality: 4/10 → 8/10</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Transform Your Financial Life with AI-Powered Wellness
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Immediate Benefits</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Instant Stress Relief</h4>
                    <p className="text-gray-600">Quick breathing exercises and meditation sessions provide immediate financial anxiety relief</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Better Sleep</h4>
                    <p className="text-gray-600">Financial sleep stories and relaxation techniques help you rest without money worries</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Improved Decision Making</h4>
                    <p className="text-gray-600">Clear mind leads to better financial choices and reduced impulse spending</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Long-Term Transformation</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600">🎯</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Healthy Money Mindset</h4>
                    <p className="text-gray-600">Develop a positive relationship with money through consistent mindfulness practice</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600">💰</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Increased Savings</h4>
                    <p className="text-gray-600">Reduced stress and better habits lead to more money saved and invested</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600">🌟</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Financial Confidence</h4>
                    <p className="text-gray-600">Build lasting confidence in your ability to manage money and achieve goals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Financial Wellness?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands who've eliminated financial stress and built healthy money relationships with XspensesAI's revolutionary AI-powered financial wellness platform.
          </p>
          <div className="mb-6">
            <div className="text-yellow-300 text-lg font-semibold">
              🌟 Limited Time: Complete Financial Wellness for $29/month
            </div>
            <div className="text-purple-200 text-sm">
              (Regular $49/month • AI Financial Therapist • Personalized Wellness Programs • Cancel anytime)
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start My Financial Wellness Journey
            </Link>
            <Link to="/ai-demo" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors">
              Try AI Financial Therapist Free
            </Link>
          </div>
          <div className="mt-6 text-purple-200 text-sm">
            ✓ 14-day free trial ✓ No credit card required ✓ Instant access to all wellness programs
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default WellnessStudioFeaturePage; 
