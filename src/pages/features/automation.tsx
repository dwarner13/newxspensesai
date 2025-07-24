import React from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet';

export default function AutomationFeaturePage() {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Smart Financial Automation - Set It and Forget It | XspensesAI</title>
        <meta name="description" content="AI automatically adjusts budgets, negotiates bills, and optimizes savings. The app that manages money while you live life." />
      </Helmet>
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6">Smart Financial Automation</h1>
        <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">Set it and forget it—but smarter. Let AI optimize your budgets, bills, and savings automatically.</p>
        <div className="mt-8 text-lg text-white font-semibold">This feature page is coming soon!</div>
      </section>
    </WebsiteLayout>
  );
} 