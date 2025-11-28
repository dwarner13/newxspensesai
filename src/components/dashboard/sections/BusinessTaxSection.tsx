import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { getThemeClasses } from '../../theme/dashboardTheme';

interface BusinessTaxSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const BusinessTaxSection: React.FC<BusinessTaxSectionProps> = ({ cards }) => {
  return (
    <>
      <div className="text-center">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-1">BUSINESS & TAX</h2>
        <p className="text-xs text-slate-500">Professional tools for business and tax management</p>
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

