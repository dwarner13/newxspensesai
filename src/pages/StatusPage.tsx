import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const StatusPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Status - XspensesAI</title>
      <meta name="description" content="Check the current status of XspensesAI services and uptime." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">XspensesAI Status</h1>
      <p className="text-xl text-purple-100 mb-8">Check the current status of XspensesAI services and uptime.</p>
      <div className="mt-12 text-lg text-white font-semibold">Status page coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default StatusPage; 