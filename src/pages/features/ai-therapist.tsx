import React from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const AITherapistFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Financial Therapist - Heal Your Money Relationship | XspensesAI</title>
        <meta name="description" content="Overcome money anxiety, spending guilt, and financial shame with XspensesAI's AI Financial Therapist. Get emotional support for your financial journey without judgment." />
        <meta name="keywords" content="financial therapy, money anxiety, spending guilt, financial shame, money mindset, financial mental health" />
        <meta property="og:title" content="AI Financial Therapist - Heal Your Relationship with Money" />
        <meta property="og:description" content="The world's first AI therapist specialized in financial wellness. Address money anxiety and build a healthy relationship with your finances." />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Your AI Financial Therapist</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Heal Your Relationship with Money - No Judgment, Just Help</h2>
            <p className="mb-8 text-lg text-purple-100">Address money anxiety, spending guilt, and financial shame with compassionate AI support that understands both psychology and personal finance.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-green-300 text-2xl">💚</span> Overcome money anxiety and financial stress</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-blue-200 text-2xl">🛡️</span> Work through spending guilt without judgment</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">🌱</span> Build healthy financial habits and mindset</div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Start Healing My Money Relationship</button>
            <p className="mt-4 text-purple-200">Completely confidential • Available 24/7 • No human therapist required</p>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-300 text-2xl">💚</span>
                <span className="font-semibold">AI Financial Therapist</span>
                <span className="ml-auto text-xs bg-green-700/80 text-white px-2 py-1 rounded">Safe Space</span>
              </div>
              <div className="space-y-3">
                <div className="bg-purple-800/60 rounded-lg p-3 text-sm">
                  <span className="font-semibold text-green-200">Therapist:</span> I notice you mentioned feeling guilty about that purchase. Money guilt is very common. Can you tell me more about what triggered that feeling?
                </div>
                <div className="bg-blue-900/60 rounded-lg p-3 text-sm ml-8">
                  <span className="font-semibold text-blue-200">You:</span> I always feel bad when I buy something for myself, even when I can afford it.
                </div>
                <div className="bg-purple-800/60 rounded-lg p-3 text-sm">
                  <span className="font-semibold text-green-200">Therapist:</span> That sounds like you might have some deep-seated beliefs about self-worth and spending. Let's explore where these feelings might come from...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Issues Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Common Money Issues We Address</h2>
          <p className="text-lg text-gray-600 mb-10">Your AI therapist is specially trained to help with financial mental health challenges that traditional apps ignore</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">😰</div>
              <h3 className="font-semibold text-lg mb-2">Money Anxiety</h3>
              <p className="text-gray-600 mb-3">Constant worry about finances, even when you're doing well. Fear of checking bank accounts or making financial decisions.</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Techniques to reduce financial stress</li>
                <li>Mindfulness exercises for money worries</li>
                <li>Building confidence in financial decisions</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">😔</div>
              <h3 className="font-semibold text-lg mb-2">Spending Guilt & Shame</h3>
              <p className="text-gray-600 mb-3">Feeling bad about purchases, even necessary ones. Self-criticism about past financial mistakes.</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Understanding the root of financial guilt</li>
                <li>Learning healthy spending permissions</li>
                <li>Forgiving past financial mistakes</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💸</div>
              <h3 className="font-semibold text-lg mb-2">Emotional Spending</h3>
              <p className="text-gray-600 mb-3">Shopping when stressed, sad, or celebrating. Using money to cope with emotions.</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Identifying emotional spending triggers</li>
                <li>Healthy coping alternatives</li>
                <li>Creating emotional spending boundaries</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">⚖️</div>
              <h3 className="font-semibold text-lg mb-2">Money & Self-Worth</h3>
              <p className="text-gray-600 mb-3">Tying personal value to net worth. Feeling "not good enough" about financial status.</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Separating self-worth from net worth</li>
                <li>Building healthy money beliefs</li>
                <li>Celebrating non-financial achievements</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* Approach Section */}
      <section className="py-20 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How AI Financial Therapy Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Identify Patterns</h3>
              <p className="text-gray-600">AI analyzes both your spending behavior and emotional responses to identify underlying patterns and triggers.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <div className="text-3xl mb-2">💭</div>
              <h3 className="font-semibold text-lg mb-2">Explore Beliefs</h3>
              <p className="text-gray-600">Gentle questioning helps uncover deep-seated beliefs about money that may be holding you back.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <div className="text-3xl mb-2">🛠️</div>
              <h3 className="font-semibold text-lg mb-2">Develop Tools</h3>
              <p className="text-gray-600">Learn practical techniques and coping strategies specifically tailored to your financial triggers.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <div className="text-3xl mb-2">🌟</div>
              <h3 className="font-semibold text-lg mb-2">Practice & Progress</h3>
              <p className="text-gray-600">Regular check-ins and guided practice sessions help reinforce healthy financial mindsets.</p>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default AITherapistFeaturePage; 
