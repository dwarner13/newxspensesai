import React from 'react';
import { DashboardStatCard, DashboardStatCardProps } from '../DashboardStatCard';
import { cardIcons } from '../dashboardCardsConfig';
import { getThemeClasses } from '../../theme/dashboardTheme';

interface ToolsSettingsSectionProps {
  cards: Omit<DashboardStatCardProps, 'icon'>[];
}

export const ToolsSettingsSection: React.FC<ToolsSettingsSectionProps> = ({ cards }) => {
  return (
    <>
      <div className="text-center">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-1">TOOLS & SETTINGS</h2>
        <p className="text-xs text-slate-500">Manage your account and access advanced tools</p>
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

