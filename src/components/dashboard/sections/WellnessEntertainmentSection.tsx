import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { DashboardSection } from '../../ui/DashboardSection';

interface WellnessEntertainmentSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const WellnessEntertainmentSection: React.FC<WellnessEntertainmentSectionProps> = ({ 
  cards
}) => {
  return (
    <DashboardSection
      title="WELLNESS & ENTERTAINMENT"
      subtitle="Engaging features to make finance enjoyable and improve your financial wellness"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardStatCard
            key={card.id}
            {...card}
            icon={cardIcons[card.id] || <div />}
            minHeight="min-h-[280px]"
          />
        ))}
      </div>
    </DashboardSection>
  );
};

