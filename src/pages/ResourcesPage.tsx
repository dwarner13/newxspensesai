import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const ResourcesPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Resources - XspensesAI</title>
      <meta name="description" content="Download guides, whitepapers, and resources for XspensesAI users." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Resources</h1>
      <p className="text-xl text-purple-100 mb-8">Download guides, whitepapers, and resources for XspensesAI users.</p>
      <div className="mt-12 text-lg text-white font-semibold">Resources page coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default ResourcesPage; 