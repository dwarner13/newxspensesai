/**
 * EntertainmentPage Component
 * 
 * Canonical pattern matching AnalyticsPage exactly
 * 
 * Structure:
 * - Top-level: div.space-y-6
 * - Header block: h1.text-2xl.font-semibold.text-white + p.mt-1.text-sm.text-slate-300
 * - Cards grid: div.grid.gap-6.md:grid-cols-2.xl:grid-cols-3
 */

import { useNavigate } from 'react-router-dom';
import { DashboardStatCard } from '../../components/dashboard/DashboardStatCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { Mic, BookOpen, Heart, Music } from 'lucide-react';

export default function EntertainmentPage() {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'personal-podcast',
      title: 'Personal Podcast',
      description: 'Your own personalized financial podcast with AI-generated insights.',
      icon: <Mic className="w-6 h-6" />,
      stats: { episodes: 24, listeners: '1.2k' },
      buttonText: 'Listen Now',
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/dashboard/personal-podcast'),
    },
    {
      id: 'financial-story',
      title: 'Financial Story',
      description: 'Transform your financial data into engaging stories with AI storytellers.',
      icon: <BookOpen className="w-6 h-6" />,
      stats: { stories: 4, lastCreated: '1 hour ago' },
      buttonText: 'Create Story',
      color: 'from-pink-500 to-pink-600',
      onClick: () => navigate('/dashboard/financial-story'),
    },
    {
      id: 'financial-therapist',
      title: 'AI Financial Therapist',
      description: 'Emotional and behavioral coaching to improve your financial wellness.',
      icon: <Heart className="w-6 h-6" />,
      stats: { lastSession: '3 days ago', stressLevel: 'Low' },
      buttonText: 'Start Session',
      color: 'from-pink-500 to-pink-600',
      onClick: () => navigate('/dashboard/financial-therapist'),
    },
    {
      id: 'wellness-studio',
      title: 'Wellness Studio',
      description: 'Educational content and guided sessions for financial health and wellness.',
      icon: <Heart className="w-6 h-6" />,
      stats: { sessions: 12, wellnessScore: '85%' },
      buttonText: 'Start Session',
      color: 'from-pink-500 to-pink-600',
      onClick: () => navigate('/dashboard/wellness-studio'),
    },
    {
      id: 'spotify-integration',
      title: 'Spotify Integration',
      description: 'Curated playlists for focus, relaxation, and financial motivation.',
      icon: <Music className="w-6 h-6" />,
      stats: { status: 'Connected', playlists: 8 },
      buttonText: 'Connect',
      color: 'from-green-500 to-green-600',
      onClick: () => navigate('/dashboard/spotify-integration'),
    },
  ];

  return (
    <DashboardSection>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
        {cards.map((card) => (
          <DashboardStatCard key={card.id} {...card} />
        ))}
      </div>
    </DashboardSection>
  );
}
