/**
 * SpotifyUnifiedCard Component
 * 
 * Unified card for Spotify Integration workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Link, Music, Compass } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface SpotifyUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function SpotifyUnifiedCard({ onExpandClick, onChatInputClick }: SpotifyUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Spotify
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'spotify-integration',
      context: {
        page: 'spotify-integration',
        data: {
          source: 'workspace-spotify',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Spotify
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Connect',
      icon: <Link className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Playlists',
      icon: <Music className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Explore',
      icon: <Compass className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="spotify-integration"
      primaryActionLabel="Chat about your music integration"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

