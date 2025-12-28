/**
 * PlanningPage Component
 * 
 * Canonical pattern matching AnalyticsPage exactly
 * 
 * Structure:
 * - Top-level: div.space-y-6
 * - Header block: h1.text-2xl.font-semibold.text-white + p.mt-1.text-sm.text-slate-300
 * - Cards grid: div.grid.gap-6.md:grid-cols-2.xl:grid-cols-3
 */

import { useNavigate } from 'react-router-dom';
import { DashboardStatCard } from '../../components/dashboard/DashboardStatCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { DashboardCardGrid } from '../../components/dashboard/DashboardCardGrid';
import { Receipt, Shield, Target, Zap, TrendingUp, PiggyBank, Shield as FreedomIcon, Calendar } from 'lucide-react';

export default function PlanningPage() {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'transactions',
      title: 'Transactions',
      description: 'View and manage all your financial transactions with detailed insights.',
      icon: <Receipt className="w-6 h-6" />,
      stats: { total: '1,234', thisMonth: 156 },
      buttonText: 'View All',
      color: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/dashboard/transactions'),
    },
    {
      id: 'bank-accounts',
      title: 'Bank Accounts',
      description: 'Connect and manage your bank accounts for automatic transaction sync.',
      icon: <Shield className="w-6 h-6" />,
      stats: { connected: 3, lastSync: '2 min ago' },
      buttonText: 'Manage Accounts',
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/dashboard/bank-accounts'),
    },
    {
      id: 'goal-concierge',
      title: 'AI Goal Concierge',
      description: 'Set and track your financial goals with personalized coaching.',
      icon: <Target className="w-6 h-6" />,
      stats: { activeGoals: 3, completionRate: '87%' },
      buttonText: 'Set Goals',
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/dashboard/goal-concierge'),
    },
    {
      id: 'smart-automation',
      title: 'Smart Automation',
      description: 'Automate repetitive financial tasks with AI-powered workflows.',
      icon: <Zap className="w-6 h-6" />,
      stats: { automations: 12, timeSaved: '8h/week' },
      buttonText: 'Configure',
      color: 'from-yellow-500 to-yellow-600',
      onClick: () => navigate('/dashboard/smart-automation'),
    },
    {
      id: 'spending-predictions',
      title: 'Spending Predictions',
      description: 'AI-powered forecasts of your future spending patterns and trends.',
      icon: <TrendingUp className="w-6 h-6" />,
      stats: { accuracy: '94%', predictions: 156 },
      buttonText: 'View Predictions',
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/dashboard/spending-predictions'),
    },
    {
      id: 'debt-payoff-planner',
      title: 'Debt Payoff Planner',
      description: 'Create and track personalized debt elimination strategies.',
      icon: <PiggyBank className="w-6 h-6" />,
      stats: { plans: 3, saved: '$2.4k' },
      buttonText: 'Plan Payoff',
      color: 'from-green-500 to-green-600',
      onClick: () => navigate('/dashboard/debt-payoff-planner'),
    },
    {
      id: 'ai-financial-freedom',
      title: 'AI Financial Freedom',
      description: 'Your personalized path to financial independence with AI guidance.',
      icon: <FreedomIcon className="w-6 h-6" />,
      stats: { progress: '68%', milestones: 5 },
      buttonText: 'View Plan',
      color: 'from-cyan-500 to-cyan-600',
      onClick: () => navigate('/dashboard/ai-financial-freedom'),
    },
    {
      id: 'bill-reminders',
      title: 'Bill Reminder System',
      description: 'Never miss a payment with smart reminders and automation.',
      icon: <Calendar className="w-6 h-6" />,
      stats: { upcoming: 7, automated: 12 },
      buttonText: 'Manage Bills',
      color: 'from-orange-500 to-orange-600',
      onClick: () => navigate('/dashboard/bill-reminders'),
    },
  ];

  return (
    <DashboardPageShell
      center={
        <DashboardCardGrid>
          {cards.map((card) => (
            <DashboardStatCard key={card.id} {...card} />
          ))}
        </DashboardCardGrid>
      }
      right={<ActivityFeedSidebar scope="planning" />}
    />
  );
}
