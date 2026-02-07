import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  MessageCircle,
  Zap,
  BarChart3,
  Crown,
  Users,
  ArrowRight,
  CheckCircle2,
  Brain,
  Globe,
  HeartHandshake,
} from 'lucide-react';

const AIAssistantPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <Helmet>
        <title>AI Financial Assistant — Always-On Financial Guidance | XspensesAI</title>
        <meta
          name="description"
          content="Meet your AI Financial Assistant — a 24/7 personal financial guide that turns your data into instant clarity, smarter decisions, and confident action."
        />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-8 border border-white/20">
            <Crown size={18} className="text-yellow-300" />
            <span className="text-sm font-medium">Prime&apos;s Support &amp; Guidance Division</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Meet Your AI Financial
            <br />
            Assistant
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-6">
            Your Personal Financial Guide - Always Available, Always Helpful
          </p>
          <p className="text-white/70 text-lg max-w-4xl mx-auto mb-8">
            Your AI Financial Assistant is your always-available money expert who helps you
            navigate every aspect of your financial life. From answering questions about your{' '}
            <span className="text-white font-semibold">spending patterns</span> to providing{' '}
            <span className="text-white font-semibold">personalized guidance</span> on budgeting,
            saving, and financial planning – your assistant makes managing money{' '}
            <span className="text-cyan-300 font-semibold">simple, clear, and stress-free</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard/ai-chat-assistant"
              className="bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 rounded-xl font-semibold hover:scale-105 transition-transform duration-300 inline-flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              Talk to Your Assistant
            </Link>
            <a
              href="#assistant-in-action"
              className="border-2 border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors duration-300 inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} />
              See It in Action
            </a>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Availability', value: '24/7' },
              { label: 'Response Time', value: 'Instant' },
              { label: 'Data Coverage', value: '100% Connected' },
              { label: 'Guidance Style', value: 'Clear + Actionable' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
              >
                <div className="text-2xl font-bold text-cyan-300">{stat.value}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Benefits */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Financial Clarity, On Demand
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Your assistant doesn’t just answer — it explains, prioritizes, and helps you take
              action with confidence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '💬',
                title: 'Ask Anything About Your Money',
                body:
                  'Get instant answers to any financial question - from understanding a transaction to planning your budget. Your assistant knows your complete financial picture and provides personalized, relevant guidance.',
                color: 'from-purple-500 to-pink-500',
              },
              {
                icon: '🎯',
                title: 'Smart Financial Guidance',
                body:
                  'Receive expert advice on budgeting, saving strategies, debt management, and financial planning tailored specifically to your unique situation and goals.',
                color: 'from-cyan-500 to-blue-500',
              },
              {
                icon: '⚡',
                title: 'Instant Financial Clarity',
                body:
                  'Cut through financial confusion with clear explanations, actionable insights, and straightforward recommendations that help you make confident money decisions.',
                color: 'from-emerald-500 to-teal-500',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:scale-[1.02] transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center mb-4`}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personal Financial Expert */}
      <section className="py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Your Personal Financial Expert At Your Fingertips
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Your AI Financial Assistant combines deep financial knowledge with real-time access to
              your financial data, providing personalized support whenever you need it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: '📊',
                title: 'Explain Your Finances',
                body:
                  'Get clear, easy-to-understand explanations of your spending patterns, income trends, budget performance, and financial health. No confusing jargon - just straight talk.',
              },
              {
                icon: '💡',
                title: 'Answer Your Questions',
                body:
                  'Ask anything - "Why did I spend so much last month?", "Can I afford this purchase?", "How can I save more?" Your assistant provides immediate, personalized answers.',
              },
              {
                icon: '🎯',
                title: 'Create Action Plans',
                body:
                  "Get step-by-step guidance for reaching your financial goals - whether it's paying off debt, building an emergency fund, or saving for a major purchase.",
              },
              {
                icon: '🔍',
                title: 'Find Money Insights',
                body:
                  'Discover opportunities to save money, identify wasteful spending, spot trends in your finances, and uncover insights you might have missed.',
              },
              {
                icon: '📋',
                title: 'Provide Recommendations',
                body:
                  'Receive tailored advice on budgeting strategies, savings plans, spending optimizations, and financial decisions based on your specific situation.',
              },
              {
                icon: '🤝',
                title: 'Guide Your Decisions',
                body:
                  'Make confident financial choices with expert guidance that considers your goals, circumstances, and long-term financial wellbeing.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ask Your Assistant Anything */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ask Your Assistant Anything
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Your AI Financial Assistant can help with any financial question or task. Here are
              just some of the ways your assistant makes your financial life easier.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: '💰 Budget Questions & Planning',
                body:
                  '"How am I tracking against my budget?", "Help me create a realistic budget", "Where can I cut spending?", "Am I spending too much on dining out?"',
              },
              {
                title: '📊 Spending Analysis & Insights',
                body:
                  '"Why was last month so expensive?", "Show me my biggest expenses", "What categories am I overspending in?", "Compare my spending to last year"',
              },
              {
                title: '🎯 Savings Goals & Strategies',
                body:
                  '"How can I save $10K this year?", "Help me build an emergency fund", "What\'s the best way to save for a house?", "Am I on track with my savings goals?"',
              },
              {
                title: '💳 Debt Management Advice',
                body:
                  '"What\'s the fastest way to pay off my credit cards?", "Should I consolidate my debt?", "Help me create a debt payoff plan", "Which debt should I tackle first?"',
              },
              {
                title: '🔍 Transaction Explanations',
                body:
                  '"What was that $47 charge?", "Explain my recent transactions", "Why did I get charged twice?", "Find all my subscriptions and recurring charges"',
              },
              {
                title: '📈 Income & Cash Flow',
                body:
                  '"How much do I earn monthly?", "Am I living beyond my means?", "When will I run out of money at this rate?", "Show me my income vs expenses trend"',
              },
              {
                title: '🛍️ Purchase Decisions',
                body:
                  '"Can I afford this $2,000 purchase?", "Should I buy this now or wait?", "Will this fit in my budget?", "What trade-offs would I need to make?"',
              },
              {
                title: '📅 Financial Planning',
                body:
                  '"Help me plan for next year", "What financial goals should I set?", "Create a 3-month spending plan", "How should I prepare financially for summer vacation?"',
              },
              {
                title: '🔄 Habit & Behavior Improvement',
                body:
                  '"Help me stop impulse buying", "How can I stick to my budget?", "Create better spending habits", "Why do I always overspend on weekends?"',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assistant in Action */}
      <section id="assistant-in-action" className="py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Assistant in Action
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Ask a question. Get a focused answer, a quick summary, and a clear next step.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <p className="text-white font-semibold">You</p>
                  <p className="text-white/60 text-sm">“Can I afford a $2,000 laptop this month?”</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-2">
                  <Sparkles size={18} />
                  AI Financial Assistant
                </div>
                <p className="text-white/80 text-sm mb-4">
                  Based on your current cash flow and budget, you can afford it without exceeding
                  your monthly spending targets — but it will reduce your savings this month by 18%.
                </p>
                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Safe to purchase if savings target is flexible
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Suggested alternative: split payment over 2 months
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="text-white font-semibold">Quick Snapshot</p>
                  <p className="text-white/60 text-sm">Personalized insight summary</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Monthly Buffer', value: '$1,420' },
                  { label: 'Savings Impact', value: '-18%' },
                  { label: 'Budget Health', value: 'Strong' },
                  { label: 'Risk Level', value: 'Low' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-xs">{item.label}</p>
                    <p className="text-white font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <button className="mt-6 w-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl py-3 font-semibold hover:scale-[1.02] transition-transform duration-300">
                Ask Another Question
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Capability Highlights */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <Brain size={22} />,
                title: 'Instant Analysis, Human Clarity',
                body: 'Complex financial data translated into clean, confident decisions in seconds.',
              },
              {
                icon: <Zap size={22} />,
                title: 'Proactive Alerts & Guidance',
                body: 'Spending spikes, budget risks, and opportunity alerts delivered before they cost you.',
              },
              {
                icon: <Globe size={22} />,
                title: 'Always On, Anywhere',
                body: 'Ask from your phone, desktop, or while traveling — your assistant is always ready.',
              },
              {
                icon: <HeartHandshake size={22} />,
                title: 'Supportive, Not Overwhelming',
                body: 'Clear next steps, no jargon, no anxiety — just calm, trusted financial help.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-center gap-3 mb-3 text-cyan-300">
                  {item.icon}
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-white/70 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Your Assistant Works */}
      <section className="py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              How Your Assistant Works
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Your AI Financial Assistant has complete access to your financial data and works 24/7
              to provide instant, personalized guidance whenever you need it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Ask Your Question',
                body:
                  'Simply type or speak your financial question - whether it\'s about a specific transaction, your budget, savings goals, or general financial advice. Your assistant understands natural language, so just ask the way you\'d ask a human financial advisor.',
              },
              {
                step: '2',
                title: 'Instant Analysis',
                body:
                  'Your assistant immediately analyzes your complete financial picture - all your accounts, transactions, budgets, and goals. It considers your unique situation to provide relevant, personalized answers rather than generic advice.',
              },
              {
                step: '3',
                title: 'Clear, Actionable Guidance',
                body:
                  'Receive clear explanations and practical recommendations tailored to your situation. Your assistant breaks down complex financial concepts, shows you the numbers that matter, and suggests specific actions you can take right away.',
              },
              {
                step: '4',
                title: 'Ongoing Support & Follow-Up',
                body:
                  'Your assistant remembers your conversations, tracks your progress toward goals, and proactively offers insights as your financial situation evolves. Ask follow-up questions anytime - your assistant builds on previous conversations to give you continuity.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/40">
            <div className="flex items-start gap-4">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Integrated with Your AI Workforce</h3>
                <p className="text-white/70 text-sm">
                  Your AI Financial Assistant works alongside all your other XspensesAI employees.
                  While Byte processes your documents, Tag categorizes your expenses, and Crystal
                  analyzes trends, your assistant synthesizes all this data to answer your
                  questions and guide your decisions. It&apos;s like having a personal CFO who
                  coordinates with your entire financial team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Team Integration */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Powered by the Full AI Workforce
                </h2>
                <p className="text-white/80 text-lg max-w-2xl">
                  Prime orchestrates Byte, Tag, Crystal, and Finley behind the scenes — so every
                  answer is calculated, verified, and explained in plain language.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Prime', emoji: '👑' },
                  { name: 'Byte', emoji: '📄' },
                  { name: 'Tag', emoji: '🏷️' },
                  { name: 'Crystal', emoji: '🔮' },
                ].map((member) => (
                  <div
                    key={member.name}
                    className="bg-white/10 rounded-2xl p-4 text-center border border-white/10"
                  >
                    <div className="text-2xl mb-2">{member.emoji}</div>
                    <div className="text-white font-semibold text-sm">{member.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Changes Everything */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Why Your AI Financial Assistant Changes Everything
          </h2>
          <div className="space-y-6 text-left mt-10">
            {[
              {
                body:
                  'Most people have financial questions every day- from "Can I afford this?" to "Where did all my money go?" - but getting answers means digging through spreadsheets, waiting for advisor appointments, or just guessing. Your AI Financial Assistant gives you instant expert guidance 24/7, right when you need it.',
              },
              {
                body:
                  'Traditional financial advisors can cost $150-400 per hour and typically only focus on investments and big-picture planning. Your AI Financial Assistant provides comprehensive guidance on everything from daily budgeting to long-term goals, at a fraction of the cost, with zero wait time.',
              },
              {
                body:
                  'Unlike generic financial apps that just show you data, your assistant actually understands your unique situation and provides personalized recommendations. It learns your patterns, remembers your goals, and adapts its guidance to help you make better financial decisions every day.',
              },
            ].map((item, index) => (
              <div
                key={`why-${index}`}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-white/80 text-sm"
              >
                {item.body}
              </div>
            ))}
          </div>
          <div className="mt-12 bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/40">
            <p className="text-white/80 text-lg italic">
              "Your AI Financial Assistant is like having a personal CFO in your pocket - someone
              who knows your entire financial picture and is always ready to help you make smarter
              money decisions."
            </p>
            <p className="text-white/60 text-sm mt-3">— XspensesAI Philosophy</p>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              The Wow: Real Outcomes, Fast
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              The assistant turns your financial complexity into clarity you can act on today.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Faster Decisions', value: '10x', note: 'Answers in seconds' },
              { label: 'Budget Confidence', value: '+42%', note: 'Clarity boost' },
              { label: 'Savings Momentum', value: '+28%', note: 'More consistent' },
              { label: 'Time Saved', value: '6 hrs/mo', note: 'Less manual work' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center"
              >
                <p className="text-3xl font-bold text-cyan-300">{item.value}</p>
                <p className="text-white font-semibold mt-2">{item.label}</p>
                <p className="text-white/60 text-sm mt-1">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Moments That Matter */}
      <section className="py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Moments That Matter
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              The assistant shows up when the decision is real, the stakes are high, and time is
              short.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Before a Big Purchase',
                body: '“Can I afford this right now?” You get a clear answer and the trade-offs.',
                emoji: '🛍️',
              },
              {
                title: 'When Spending Spikes',
                body: 'Instantly see why last month was high and what changed.',
                emoji: '📈',
              },
              {
                title: 'When Goals Slip',
                body: 'Get a rescue plan for savings, debt payoff, or budget recovery.',
                emoji: '🎯',
              },
              {
                title: 'At Tax Time',
                body: 'Know what to set aside and what to expect, without the stress.',
                emoji: '🧾',
              },
              {
                title: 'Planning a Trip',
                body: 'Set a realistic spend plan and track progress week by week.',
                emoji: '✈️',
              },
              {
                title: 'Building Wealth',
                body: 'See what to optimize next to reach your long-term goals faster.',
                emoji: '🏆',
              },
            ].map((moment) => (
              <div
                key={moment.title}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <div className="text-3xl mb-4">{moment.emoji}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{moment.title}</h3>
                <p className="text-white/70 text-sm">{moment.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              People Feel the Difference
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Clear, calm, and confident — the experience users describe most often.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  '“The assistant told me exactly why I overspent and how to fix it — in 30 seconds.”',
                name: 'Jordan R.',
                title: 'Founder',
              },
              {
                quote:
                  '“It feels like a real financial coach. Clear, direct, and never overwhelming.”',
                name: 'Aisha L.',
                title: 'Designer',
              },
              {
                quote:
                  '“I finally know where my money goes every month. The clarity is unreal.”',
                name: 'Miguel T.',
                title: 'Consultant',
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <p className="text-white/80 text-sm leading-relaxed">{testimonial.quote}</p>
                <div className="mt-4 text-white font-semibold">{testimonial.name}</div>
                <div className="text-white/60 text-xs">{testimonial.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Why This Feels Different
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Not a generic chatbot. Not a passive dashboard. A guided financial experience.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Typical Finance Apps',
                points: [
                  'Show data, don’t explain it',
                  'Require manual digging',
                  'Generic tips, little context',
                  'Reactive, not proactive',
                ],
              },
              {
                title: 'Generic AI Chatbots',
                points: [
                  'Lack your real financial data',
                  'Give surface-level answers',
                  'No goal tracking or continuity',
                  'Not built for finance workflows',
                ],
              },
              {
                title: 'XspensesAI Assistant',
                points: [
                  'Understands your full financial picture',
                  'Explains, prioritizes, and guides',
                  'Remembers goals and preferences',
                  'Built for decisions, not just info',
                ],
              },
            ].map((column) => (
              <div
                key={column.title}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <h3 className="text-xl font-semibold text-white mb-4">{column.title}</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  {column.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="text-cyan-300 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Questions People Ask
            </h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Quick answers about how the assistant works and what to expect.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'Does it use my real financial data?',
                a: 'Yes. The assistant pulls from your connected accounts, transactions, budgets, and goals to provide accurate guidance.',
              },
              {
                q: 'Is it available 24/7?',
                a: 'Always. Ask anything at any time, and get an instant, context-aware response.',
              },
              {
                q: 'Can it help with budgeting and debt payoff?',
                a: 'Absolutely. It builds plans, suggests adjustments, and tracks progress over time.',
              },
              {
                q: 'Is it just a chatbot?',
                a: 'No. It’s a decision-support system that explains, prioritizes, and guides you with data-backed reasoning.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                <p className="text-white/70 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-black/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Financial Answers?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Your AI Financial Assistant is ready to answer any question about your money. Get
            instant, personalized guidance that helps you make confident financial decisions every
            day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard/ai-chat-assistant"
              className="bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 rounded-xl font-semibold hover:scale-105 transition-transform duration-300 inline-flex items-center justify-center gap-2"
            >
              💬 Talk to Your Assistant Now
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/ai-employees"
              className="border-2 border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors duration-300 inline-flex items-center justify-center gap-2"
            >
              <Users size={20} />
              Meet the AI Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AIAssistantPage;
