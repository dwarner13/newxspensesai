import React from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';

export default function VoiceControlFeaturePage() {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Voice-Activated Money - Talk to Your Finances | XspensesAI</title>
        <meta name="description" content="Control your finances with your voice. Ask XspensesAI about your spending, add expenses hands-free, and manage money like never before." />
      </Helmet>
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6">Voice-Activated Money</h1>
        <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">"Hey XspensesAI, how much did I spend on food this week?" Manage your money hands-free with voice commands.</p>
        <div className="mt-8 text-lg text-white font-semibold">This feature page is coming soon!</div>
      </section>
    </WebsiteLayout>
  );
} 
