import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const IntegrationsPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Integrations - XspensesAI</title>
      <meta name="description" content="Explore integrations with XspensesAI and connect your favorite tools." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Integrations</h1>
      <p className="text-xl text-purple-100 mb-8">Explore integrations with XspensesAI and connect your favorite tools.</p>
      <div className="mt-12 text-lg text-white font-semibold">Integrations page coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default IntegrationsPage; 