import React from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet';

export default function SocialMoneyFeaturePage() {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Social Money Features - Share Your Financial Wins | XspensesAI</title>
        <meta name="description" content="Share achievement podcasts, join anonymous spending challenges, and get community support. The only app where financial success is social." />
      </Helmet>
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6">Social Money Features</h1>
        <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">Finally, share your financial wins. Join challenges, share podcasts, and get support from the XspensesAI community.</p>
        <div className="mt-8 text-lg text-white font-semibold">This feature page is coming soon!</div>
      </section>
    </WebsiteLayout>
  );
} 