import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const CaseStudiesPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Case Studies - XspensesAI</title>
      <meta name="description" content="See how XspensesAI transforms financial management for real users and businesses." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Case Studies</h1>
      <p className="text-xl text-purple-100 mb-8">See how XspensesAI transforms financial management for real users and businesses.</p>
      <div className="mt-12 text-lg text-white font-semibold">Case studies coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default CaseStudiesPage; 