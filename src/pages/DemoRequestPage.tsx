import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const DemoRequestPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Request a Demo - XspensesAI</title>
      <meta name="description" content="Request a personalized demo of XspensesAI for your team or business." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Request a Demo</h1>
      <p className="text-xl text-purple-100 mb-8">Request a personalized demo of XspensesAI for your team or business.</p>
      <div className="mt-12 text-lg text-white font-semibold">Demo request page coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default DemoRequestPage; 