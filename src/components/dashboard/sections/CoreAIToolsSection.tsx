import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { SmartImportCard } from '../SmartImportCard';
import { cardIcons } from '../dashboardCardsConfig';
import { DashboardSection } from '../../ui/DashboardSection';

interface CoreAIToolsSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const CoreAIToolsSection: React.FC<CoreAIToolsSectionProps> = ({ cards }) => {
  // Find smart-import card and render it separately with enhanced component
  const smartImportCard = cards.find(card => card.id === 'smart-import');
  const otherCards = cards.filter(card => card.id !== 'smart-import');

  return (
    <DashboardSection
      title="CORE AI TOOLS"
      subtitle="Essential AI-powered features for your financial management"
      isFirstSection={true}
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Enhanced Smart Import Card */}
        {smartImportCard && (
          <div data-card="main-card" className="min-h-[320px] flex flex-col">
            <SmartImportCard className="h-full flex flex-col" />
          </div>
        )}
        
        {/* Other cards */}
        {otherCards.map((card, index) => (
          <div key={card.id}>
            <DashboardStatCard
              {...card}
              icon={cardIcons[card.id] || <div />}
              minHeight="min-h-[320px]"
            />
          </div>
        ))}
      </div>
    </DashboardSection>
  );
};

