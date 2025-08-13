import React from 'react';
import MoneyMoodTracker from './MoneyMoodTracker';
import AIInsightsCarousel from './AIInsightsCarousel';
import UploadCard from './UploadCard';
import AIAssistantCard from './AIAssistantCard';
import PersonalPodcastCard from './PersonalPodcastCard';
import FeatureCards from './FeatureCards';
import SummaryCards from './SummaryCards';

/**
 * MainContent component that orchestrates all dashboard content
 * Manages the layout and arrangement of all dashboard cards
 */
const MainContent = ({ dragOver, onDragOver, onDragLeave, onDrop }) => {
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Row 1: Money Mood Tracker and AI Insights Carousel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MoneyMoodTracker />
          <AIInsightsCarousel />
        </div>

        {/* Row 2: Upload, AI Assistant, Personal Podcast */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <UploadCard 
            dragOver={dragOver}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
          <AIAssistantCard />
          <PersonalPodcastCard />
        </div>

        {/* Row 3: Three Feature Cards */}
        <FeatureCards />

        {/* Row 4: Additional Cards */}
        <SummaryCards />
      </div>
    </main>
  );
};

export default MainContent; 