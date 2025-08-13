import React from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const ComparePage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Compare - XspensesAI</title>
      <meta name="description" content="Compare XspensesAI to other expense management and financial wellness platforms." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Compare XspensesAI</h1>
      <p className="text-xl text-purple-100 mb-8">Compare XspensesAI to other expense management and financial wellness platforms.</p>
      <div className="mt-12 text-lg text-white font-semibold">Compare page coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default ComparePage; 
