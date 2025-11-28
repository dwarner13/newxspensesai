import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { getThemeClasses } from '../../theme/dashboardTheme';

interface CoreAIToolsSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const CoreAIToolsSection: React.FC<CoreAIToolsSectionProps> = ({ cards }) => {
  return (
    <>
      <div className="text-center mt-10">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-1">CORE AI TOOLS</h2>
        <p className="text-xs text-slate-500">Essential AI-powered features for your financial management</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardStatCard
            key={card.id}
            {...card}
            icon={cardIcons[card.id] || <div />}
          />
        ))}
      </div>
    </>
  );
};

