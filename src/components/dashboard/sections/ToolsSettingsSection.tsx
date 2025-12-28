import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { DashboardSection } from '../../ui/DashboardSection';

interface ToolsSettingsSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const ToolsSettingsSection: React.FC<ToolsSettingsSectionProps> = ({ cards }) => {
  return (
    <DashboardSection
      title="TOOLS & SETTINGS"
      subtitle="Manage your account and access advanced tools"
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

