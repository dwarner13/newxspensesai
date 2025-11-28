import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { getThemeClasses } from '../../theme/dashboardTheme';

interface WellnessEntertainmentSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const WellnessEntertainmentSection: React.FC<WellnessEntertainmentSectionProps> = ({ 
  cards
}) => {
  return (
    <>
      <div className="text-center">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-1">WELLNESS & ENTERTAINMENT</h2>
        <p className="text-xs text-slate-500">Engaging features to make finance enjoyable and improve your financial wellness</p>
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

