import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { DashboardSection } from '../../ui/DashboardSection';

interface PlanningAnalysisSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const PlanningAnalysisSection: React.FC<PlanningAnalysisSectionProps> = ({ cards }) => {
  return (
    <DashboardSection
      title="PLANNING & ANALYSIS"
      subtitle="Advanced tools for financial planning and strategic analysis"
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

