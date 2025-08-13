import React from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';

export default function PredictionsFeaturePage() {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Spending Predictions - Know Your Future Expenses | XspensesAI</title>
        <meta name="description" content="Get AI-powered predictions for your future spending. XspensesAI warns you about upcoming financial stress and helps you plan ahead." />
      </Helmet>
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6">AI Spending Predictions</h1>
        <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">Know what you'll spend before you spend it. Our AI predicts next month's expenses and warns about upcoming financial stress periods.</p>
        <div className="mt-8 text-lg text-white font-semibold">This feature page is coming soon!</div>
      </section>
    </WebsiteLayout>
  );
} 
