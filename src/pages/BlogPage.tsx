import React from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const BlogPage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>Blog - XspensesAI</title>
      <meta name="description" content="Insights, news, and updates from the XspensesAI team." />
    </Helmet>
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">XspensesAI Blog</h1>
      <p className="text-xl text-purple-100 mb-8">Insights, news, and updates from the XspensesAI team.</p>
      <div className="mt-12 text-lg text-white font-semibold">Blog coming soon!</div>
    </section>
  </WebsiteLayout>
);

export default BlogPage; 
