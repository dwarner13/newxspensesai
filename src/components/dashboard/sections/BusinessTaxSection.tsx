import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { DashboardSection } from '../../ui/DashboardSection';

interface BusinessTaxSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const BusinessTaxSection: React.FC<BusinessTaxSectionProps> = ({ cards }) => {
  return (
    <DashboardSection
      title="BUSINESS & TAX"
      subtitle="Professional tools for business and tax management"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardStatCard
            key={card.id}
            {...card}
            icon={cardIcons[card.id] || <div />}
          />
        ))}
      </div>
    </DashboardSection>
  );
};

