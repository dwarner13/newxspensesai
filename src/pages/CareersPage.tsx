import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const CareersPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Careers - XspensesAI</title>
      <meta name="description" content="Join the XspensesAI team and help shape the future of financial management." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Careers at XspensesAI</h1>
      <p className="text-xl text-purple-100 mb-8">Join the XspensesAI team and help shape the future of financial management.</p>
      <div className="mt-12 text-lg text-white font-semibold">Careers page coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default CareersPage; 