/**
 * DESKTOP REVOLUTION INTEGRATION HOOK
 * Manages desktop enhancement state and interactions
 * 
 * CRITICAL: This is a bridge layer - no business logic changes
 * Only connects desktop UI to existing functions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface DesktopRevolutionState {
  isDesktop: boolean;
  discoveries: Array<{
    icon: string;
    employee: string;
    text: string;
  }>;
  currentHeroIndex: number;
  activities: Array<{
    avatar: string;
    employee: string;
    message: string;
    time: string;
  }>;
  achievements: Array<{
    title: string;
    description: string;
  }>;
}

export const useDesktopRevolution = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<DesktopRevolutionState>({
    isDesktop: false,
    discoveries: [],
    currentHeroIndex: 0,
    activities: [],
    achievements: []
  });

  // Desktop detection
  const checkDesktop = () => {
    return window.innerWidth > 1200;
  };

  // Initialize desktop state
  useEffect(() => {
    const isDesktop = checkDesktop();
    setState(prev => ({ ...prev, isDesktop }));

    if (isDesktop) {
      initializeDiscoveries();
      initializeActivities();
      startHeroRotation();
      startLiveUpdates();
    }

    // Handle resize
    const handleResize = () => {
      const isDesktop = checkDesktop();
      setState(prev => ({ ...prev, isDesktop }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize discoveries
  const initializeDiscoveries = () => {
    const discoveryTemplates = [
      { icon: '🎉', employee: 'Spark', text: 'You saved $127 vs last month!' },
      { icon: '🔮', employee: 'Crystal', text: 'Tuesday spending spike pattern detected' },
      { icon: '💰', employee: 'Ledger', text: 'New tax deduction worth $340 found!' },
      { icon: '📄', employee: 'Byte', text: 'Processed 47 documents today with 99.7% accuracy' },
      { icon: '🎯', employee: 'Goalie', text: '67% progress to vacation goal!' },
      { icon: '⚡', employee: 'Blitz', text: 'New debt payoff plan calculated' },
      { icon: '🧘', employee: 'Harmony', text: 'Stress levels decreased 23%' },
      { icon: '🎙️', employee: 'Narrator', text: 'New podcast episode ready!' }
    ];
    setState(prev => ({ ...prev, discoveries: discoveryTemplates }));
  };

  // Initialize activities
  const initializeActivities = () => {
    const initialActivities = [
      { avatar: '🏷️', employee: 'Tag', message: 'learned a new pattern: "Uber = Transport"', time: '2 minutes ago' },
      { avatar: '🔮', employee: 'Crystal', message: 'predicts overspending next Tuesday', time: '5 minutes ago' },
      { avatar: '⚡', employee: 'Blitz', message: 'calculated new debt payoff plan', time: '12 minutes ago' },
      { avatar: '🎯', employee: 'Goalie', message: 'says you\'re 67% to vacation goal!', time: '1 hour ago' }
    ];
    setState(prev => ({ ...prev, activities: initialActivities }));
  };

  // Hero rotation
  const startHeroRotation = () => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        currentHeroIndex: (prev.currentHeroIndex + 1) % 3
      }));
    }, 5000);
    return () => clearInterval(interval);
  };

  // Live updates
  const startLiveUpdates = () => {
    const activityInterval = setInterval(() => {
      addNewActivity();
    }, 8000);

    const achievementInterval = setInterval(() => {
      checkAchievements();
    }, 15000);

    return () => {
      clearInterval(activityInterval);
      clearInterval(achievementInterval);
    };
  };

  // Add new activity
  const addNewActivity = () => {
    const newActivities = [
      { avatar: '📄', employee: 'Byte', message: 'processed 3 new documents', time: 'Just now' },
      { avatar: '💰', employee: 'Ledger', message: 'found $50 in missed deductions', time: 'Just now' },
      { avatar: '🧘', employee: 'Harmony', message: 'completed wellness check', time: 'Just now' },
      { avatar: '🎙️', employee: 'Narrator', message: 'generated new podcast episode', time: 'Just now' },
      { avatar: '🔮', employee: 'Crystal', message: 'updated spending predictions', time: 'Just now' },
      { avatar: '⚡', employee: 'Spark', message: 'celebrated your progress!', time: 'Just now' }
    ];
    
    const randomActivity = newActivities[Math.floor(Math.random() * newActivities.length)];
    setState(prev => ({
      ...prev,
      activities: [randomActivity, ...prev.activities.slice(0, 3)]
    }));
  };

  // Check achievements
  const checkAchievements = () => {
    const conditions = [
      { 
        check: () => Math.random() > 0.95, 
        title: 'Document Master!', 
        description: 'Processed 100+ documents' 
      },
      { 
        check: () => Math.random() > 0.98, 
        title: 'Savings Superstar!', 
        description: 'Found $500+ in savings' 
      },
      { 
        check: () => Math.random() > 0.99, 
        title: 'Week Warrior!', 
        description: '7-day streak achieved' 
      },
      { 
        check: () => Math.random() > 0.97, 
        title: 'AI Team Leader!', 
        description: 'All employees active' 
      }
    ];
    
    conditions.forEach(condition => {
      if (condition.check()) {
        showAchievement(condition.title, condition.description);
      }
    });
  };

  // Show achievement
  const showAchievement = (title: string, description: string) => {
    setState(prev => ({
      ...prev,
      achievements: [...prev.achievements, { title, description }]
    }));
    
    // Remove after 4 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        achievements: prev.achievements.slice(1)
      }));
    }, 4000);
  };

  // Hero action handler
  const handleHeroAction = (action: string) => {
    switch (action) {
      case 'View Details':
        navigate('/dashboard/transactions');
        break;
      case 'Adjust Budget':
        navigate('/dashboard/analytics');
        break;
      case 'See Progress':
        navigate('/dashboard/goals');
        break;
      default:
        break;
    }
  };

  // Employee follow handler
  const handleEmployeeFollow = (employeeName: string) => {
    console.log(`Following ${employeeName}`);
    // Could trigger follow functionality
  };

  // Activity click handler
  const handleActivityClick = (activity: any) => {
    console.log('Activity clicked:', activity);
    // Could navigate to relevant section
  };

  return {
    ...state,
    handleHeroAction,
    handleEmployeeFollow,
    handleActivityClick
  };
};
