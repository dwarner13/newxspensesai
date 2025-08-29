import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PersonalPodcastDashboard } from '../../components/podcast/PersonalPodcastDashboard';
import { motion } from 'framer-motion';
import DashboardHeader from '../../components/ui/DashboardHeader';

export default function PersonalPodcastFeaturePage() {
  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Personal AI Podcast Generator - Your Financial Story | XspensesAI</title>
        <meta
          name="description"
          content="Get monthly AI-generated podcasts about YOUR financial journey. Celebrate wins, understand patterns, and stay motivated with personalized financial storytelling."
        />
        <meta
          name="keywords"
          content="personal finance podcast, AI generated podcast, financial storytelling, money motivation, expense tracking podcast"
        />
      </Helmet>

      {/* Standardized Dashboard Header */}
      <DashboardHeader />
      
      {/* Content Area with Enhanced Styling */}
      <div className="max-w-7xl mx-auto space-y-8 px-6">
        
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-900 via-blue-900 to-emerald-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16 max-w-6xl mx-auto">
        <motion.p
          className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Monthly podcast episodes about <span className="font-bold text-white">YOUR</span> money story. AI analyzes
          your spending patterns and creates personalized audio content that celebrates your wins and motivates your
          financial journey.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <a
            href="#podcast-demo"
            className="inline-block bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-emerald-500 hover:to-blue-500 transition-all duration-300"
          >
            Generate My First Episode Free
          </a>
        </motion.div>
      </section>

      {/* Interactive Podcast Player Demo */}
      <section id="podcast-demo" className="max-w-5xl mx-auto mb-20">
        <PersonalPodcastDashboard />
      </section>

      {/* What Makes It Special */}
      <section className="max-w-4xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-white">The World's First AI-Generated Personal Finance Podcast</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-8 text-center text-white">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-bold text-white mb-2">About YOU Specifically</h3>
            <p className="text-white/80">Not generic financial advice—episodes about your actual spending patterns, goals, and achievements.</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-8 text-center text-white">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Celebration & Motivation</h3>
            <p className="text-white/80">AI celebrates your financial wins and provides encouragement during challenging periods.</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-8 text-center text-white">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Data-Driven Storytelling</h3>
            <p className="text-white/80">Your real financial data transformed into engaging, narrative audio content.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-white">How Real Users Transformed Their Finances</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-6 flex flex-col items-center text-center text-white">
            <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">
              🎧
            </div>
            <p className="text-white/80 italic mb-4">
              "I never thought I'd look forward to my monthly expense review. The podcast makes it fun and personal!"
            </p>
            <div className="font-bold text-white">Alex M.</div>
            <div className="text-sm text-white/60">Freelancer</div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-6 flex flex-col items-center text-center text-white">
            <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">
              🎙️
            </div>
            <p className="text-white/80 italic mb-4">
              "My AI podcast celebrated my first savings goal. It felt like having a coach cheering me on!"
            </p>
            <div className="font-bold text-white">Jamie L.</div>
            <div className="text-sm text-white/60">Designer</div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-6 flex flex-col items-center text-center text-white">
            <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">
              📈
            </div>
            <p className="text-white/80 italic mb-4">
              "I finally understand my spending habits. The podcast makes it easy and enjoyable to improve."
            </p>
            <div className="font-bold text-white">Morgan S.</div>
            <div className="text-sm text-white/60">Entrepreneur</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl mt-16 text-white text-center max-w-4xl mx-auto shadow-xl">
        <motion.h2
          className="text-4xl md:text-5xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Ready to Get Roasted by AI?
        </motion.h2>
        <p className="text-xl text-indigo-100 mb-8">
          Join thousands who turned boring expense reports into engaging, personalized podcasts.
        </p>
        <a
          href="#podcast-demo"
          className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          Generate My First Episode Free
        </a>
      </section>
      </div>
    </>
  );
} 