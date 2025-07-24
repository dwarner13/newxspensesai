import React from 'react';
import { Helmet } from 'react-helmet';
import XspensesAIDashboard from '../components/XspensesAIDashboard';

const AIDashboardPage = () => {
  return (
    <>
      <Helmet>
        <title>AI Dashboard - Smart Import | XspensesAI</title>
        <meta name="description" content="AI-powered financial dashboard with smart document processing and real-time insights." />
      </Helmet>
      <XspensesAIDashboard />
    </>
  );
};

export default AIDashboardPage; 