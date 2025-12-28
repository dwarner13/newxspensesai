/**
 * BusinessPage Component
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
import { Receipt, BarChart3 } from 'lucide-react';

export default function BusinessPage() {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'tax-assistant',
      title: 'Tax Assistant',
      description: 'AI-powered tax preparation and optimization for maximum savings.',
      icon: <Receipt className="w-6 h-6" />,
      stats: { savings: '$2,400', accuracy: '99%' },
      buttonText: 'Get Started',
      color: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/dashboard/tax-assistant'),
    },
    {
      id: 'business-intelligence',
      title: 'Business Intelligence',
      description: 'Advanced analytics and insights for business growth and optimization.',
      icon: <BarChart3 className="w-6 h-6" />,
      stats: { reports: 8, insights: 156 },
      buttonText: 'View Reports',
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/dashboard/business-intelligence'),
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
      right={<ActivityFeedSidebar scope="business" />}
    />
  );
}
