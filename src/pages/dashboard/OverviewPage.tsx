/**
 * OverviewPage Component
 * 
 * Page title is handled by DashboardHeader - no duplicate title here
 * Uses DashboardSection for consistent spacing
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStatCard } from '../../components/dashboard/DashboardStatCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { DashboardCardGrid } from '../../components/dashboard/DashboardCardGrid';
import { TrendingUp, Target, BarChart3 } from 'lucide-react';

export default function OverviewPage() {
  const navigate = useNavigate();
  
  // Debug: Log when component renders
  useEffect(() => {
    console.log('[OverviewPage] Component mounted/rendered');
    
    // Dev-only: Audit card widths to diagnose layout issue
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const overviewCard = document.querySelector('[data-card="overview-card"]');
        const mainCard = document.querySelector('[data-card="main-card"]');
        
        if (overviewCard) {
          const overviewStyles = window.getComputedStyle(overviewCard);
          const overviewParent = overviewCard.parentElement;
          const overviewParentStyles = overviewParent ? window.getComputedStyle(overviewParent) : null;
          const middleColumn = overviewCard.closest('[data-grid-wrapper]')?.querySelector('div:nth-child(2)');
          const middleColumnStyles = middleColumn ? window.getComputedStyle(middleColumn) : null;
          
          console.log('=== OVERVIEW CARD AUDIT ===');
          console.log('Card offsetWidth:', overviewCard.offsetWidth, 'px');
          console.log('Card computed width:', overviewStyles.width);
          console.log('Card className:', overviewCard.className);
          console.log('Parent gridTemplateColumns:', overviewParentStyles?.gridTemplateColumns);
          console.log('Middle column computed width:', middleColumnStyles?.width);
        }
        
        if (mainCard) {
          const mainStyles = window.getComputedStyle(mainCard);
          const mainParent = mainCard.parentElement;
          const mainParentStyles = mainParent ? window.getComputedStyle(mainParent) : null;
          
          console.log('=== MAIN DASHBOARD CARD AUDIT ===');
          console.log('Card offsetWidth:', mainCard.offsetWidth, 'px');
          console.log('Card computed width:', mainStyles.width);
          console.log('Card className:', mainCard.className);
          console.log('Parent gridTemplateColumns:', mainParentStyles?.gridTemplateColumns);
        }
      }, 500);
    }
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
    <DashboardPageShell
      center={
        <DashboardCardGrid>
          {cards.map((card, index) => (
            <div key={card.id} data-card={index === 0 ? "overview-card" : undefined}>
              <DashboardStatCard {...card} />
            </div>
          ))}
        </DashboardCardGrid>
      }
      right={<ActivityFeedSidebar scope="overview" />}
    />
  );
}
