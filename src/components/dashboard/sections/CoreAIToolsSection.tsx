import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { DashboardSection } from '../../ui/DashboardSection';

interface CoreAIToolsSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const CoreAIToolsSection: React.FC<CoreAIToolsSectionProps> = ({ cards }) => {
  return (
    <DashboardSection
      title="CORE AI TOOLS"
      subtitle="Essential AI-powered features for your financial management"
      isFirstSection={true}
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <div key={card.id} data-card={index === 0 ? "main-card" : undefined}>
            <DashboardStatCard
              {...card}
              icon={cardIcons[card.id] || <div />}
            />
          </div>
        ))}
      </div>
    </DashboardSection>
  );
};

