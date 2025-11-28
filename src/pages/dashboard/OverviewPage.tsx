/**
 * OverviewPage Component
 * 
 * Page title is handled by DashboardHeader - no duplicate title here
 * Uses DashboardSection for consistent spacing
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStatCard } from '../../components/dashboard/DashboardStatCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { TrendingUp, Target, BarChart3 } from 'lucide-react';

export default function OverviewPage() {
  const navigate = useNavigate();
  
  // Debug: Log when component renders
  useEffect(() => {
    console.log('[OverviewPage] Component mounted/rendered');
  }, []);

  const cards = [
    {
      id: 'trends',
      title: 'Spending Trends',
      description: 'AI-powered analysis of your spending patterns and trends over time.',
      icon: <TrendingUp className="w-6 h-6" />,
      stats: { trends: 12, accuracy: '94%' },
      buttonText: 'View Trends',
      color: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/dashboard/analytics'),
    },
    {
      id: 'goals',
      title: 'Goal Progress',
      description: 'Track your financial goals and see progress at a glance.',
      icon: <Target className="w-6 h-6" />,
      stats: { active: 5, completed: 12 },
      buttonText: 'Manage Goals',
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/dashboard/goal-concierge'),
    },
    {
      id: 'insights',
      title: 'AI Insights',
      description: 'Personalized insights and recommendations from your AI financial team.',
      icon: <BarChart3 className="w-6 h-6" />,
      stats: { insights: 24, new: 3 },
      buttonText: 'View Insights',
      color: 'from-green-500 to-green-600',
      onClick: () => navigate('/dashboard/analytics'),
    },
  ];

  return (
    <DashboardSection>
      {/* Hero Cards Row - Three cards matching main dashboard layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
        {cards.map((card) => (
          <DashboardStatCard key={card.id} {...card} />
        ))}
      </div>
    </DashboardSection>
  );
}
