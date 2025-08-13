import { therapistTriggerAtom } from '../lib/uiStore';

// Track user behavior patterns
interface UserBehavior {
  categoryEdits: { [category: string]: number };
  lastVisit: Date;
  spendingPatterns: { [category: string]: number[] };
  moodIndicators: string[];
}

// Simulated user behavior tracking (in real app, this would come from Supabase)
let userBehavior: UserBehavior = {
  categoryEdits: {},
  lastVisit: new Date(),
  spendingPatterns: {},
  moodIndicators: []
};

// Global setter function (will be set by the component that uses this)
let setTherapistTrigger: ((trigger: any) => void) | null = null;

export const setTherapistTriggerFunction = (setter: (trigger: any) => void) => {
  setTherapistTrigger = setter;
};

// Trigger detection functions
export const detectCategoryRepeatedEdit = (category: string) => {
  userBehavior.categoryEdits[category] = (userBehavior.categoryEdits[category] || 0) + 1;
  
  if (userBehavior.categoryEdits[category] >= 3 && setTherapistTrigger) {
    setTherapistTrigger({
      active: true,
      reason: `Noticing some hesitation with "${category}" – want to talk about it?`,
      context: {
        type: 'category_repeated_edit',
        category,
        edits: userBehavior.categoryEdits[category],
        tone: 'uncertainty'
      }
    });
  }
};

export const detectSpendingSpike = (category: string, amount: number) => {
  if (!userBehavior.spendingPatterns[category]) {
    userBehavior.spendingPatterns[category] = [];
  }
  
  userBehavior.spendingPatterns[category].push(amount);
  
  // Keep only last 5 transactions for this category
  if (userBehavior.spendingPatterns[category].length > 5) {
    userBehavior.spendingPatterns[category] = userBehavior.spendingPatterns[category].slice(-5);
  }
  
  // Check for significant increase (40% or more)
  if (userBehavior.spendingPatterns[category].length >= 3) {
    const recent = userBehavior.spendingPatterns[category].slice(-3);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previous = userBehavior.spendingPatterns[category].slice(-6, -3);
    
    if (previous.length >= 3) {
      const previousAverage = previous.reduce((a, b) => a + b, 0) / previous.length;
      const increase = ((average - previousAverage) / previousAverage) * 100;
      
      if (increase >= 40) {
        if (setTherapistTrigger) {
          setTherapistTrigger({
            active: true,
            reason: `Your spending on ${category} is up ${Math.round(increase)}%. Need to talk about it?`,
            context: {
              type: 'spending_spike',
              category,
              amount: average,
              tone: 'anxiety'
            }
          });
        }
      }
    }
  }
};

export const detectTimeBasedAvoidance = () => {
  const now = new Date();
  const daysSinceLastVisit = Math.floor((now.getTime() - userBehavior.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastVisit >= 7 && setTherapistTrigger) {
    setTherapistTrigger({
      active: true,
      reason: `Haven't checked in with your budget in ${daysSinceLastVisit} days. Avoiding it?`,
      context: {
        type: 'time_based',
        daysSinceLastVisit,
        tone: 'avoidance'
      }
    });
  }
  
  // Update last visit
  userBehavior.lastVisit = now;
};

export const detectMoodBasedTriggers = (action: string, details?: any) => {
  // Track mood indicators
  const moodKeywords = ['overwhelmed', 'stressed', 'guilty', 'anxious', 'worried'];
  const actionLower = action.toLowerCase();
  
  for (const keyword of moodKeywords) {
    if (actionLower.includes(keyword)) {
      userBehavior.moodIndicators.push(keyword);
    }
  }
  
  // Check for patterns
  if (userBehavior.moodIndicators.length >= 3 && setTherapistTrigger) {
    const recentMoods = userBehavior.moodIndicators.slice(-3);
    const uniqueMoods = [...new Set(recentMoods)];
    
    if (uniqueMoods.length >= 2) {
      setTherapistTrigger({
        active: true,
        reason: "I picked up on some stress in your recent activity. Want to unpack what's going on?",
        context: {
          type: 'mood_based',
          tone: 'stress'
        }
      });
    }
  }
};

export const detectGuiltPatterns = (action: string, details?: any) => {
  const guiltIndicators = [
    'delete', 'undo', 'fix later', 'temporary', 'wrong category',
    'refund', 'cancel', 'mistake', 'shouldn\'t have'
  ];
  
  const actionLower = action.toLowerCase();
  for (const indicator of guiltIndicators) {
    if (actionLower.includes(indicator)) {
      if (setTherapistTrigger) {
        setTherapistTrigger({
          active: true,
          reason: "I notice some changes that suggest you might be feeling guilty. Guilt around money is very common. Let's talk about it?",
          context: {
            type: 'guilt_pattern',
            tone: 'guilt'
          }
        });
      }
      break;
    }
  }
};

// Main trigger detection function
export const checkForTherapistTriggers = (action: string, details?: any) => {
  // Check different trigger types
  if (action === 'category_edit' && details?.category) {
    detectCategoryRepeatedEdit(details.category);
  }
  
  if (action === 'transaction_added' && details?.category && details?.amount) {
    detectSpendingSpike(details.category, details.amount);
  }
  
  if (action === 'page_visit') {
    detectTimeBasedAvoidance();
  }
  
  if (action === 'mood_indicator' && details?.mood) {
    detectMoodBasedTriggers(action, details);
  }
  
  if (action === 'guilt_indicator') {
    detectGuiltPatterns(action, details);
  }
};

// Reset triggers (for testing)
export const resetTherapistTriggers = () => {
  if (setTherapistTrigger) {
    setTherapistTrigger({
      active: false,
      reason: '',
      context: {
        type: 'category_repeated_edit',
        category: '',
        edits: 0,
        tone: 'uncertainty'
      }
    });
  }
  
  // Reset behavior tracking
  userBehavior = {
    categoryEdits: {},
    lastVisit: new Date(),
    spendingPatterns: {},
    moodIndicators: []
  };
};

// Simulate triggers for demo purposes
export const simulateTherapistTrigger = (type: 'category_repeated_edit' | 'spending_spike' | 'time_based' | 'mood_based' | 'guilt_pattern') => {
  if (setTherapistTrigger) {
    const triggers = {
      category_repeated_edit: {
        reason: "Noticing some hesitation with 'Dining Out' – want to talk about it?",
        context: {
          type: 'category_repeated_edit',
          category: 'Dining Out',
          edits: 4,
          tone: 'uncertainty'
        }
      },
      spending_spike: {
        reason: "Your spending on 'Shopping' is up 45%. Need to talk about it?",
        context: {
          type: 'spending_spike',
          category: 'Shopping',
          amount: 250,
          tone: 'anxiety'
        }
      },
      time_based: {
        reason: "Haven't checked in with your budget in 8 days. Avoiding it?",
        context: {
          type: 'time_based',
          daysSinceLastVisit: 8,
          tone: 'avoidance'
        }
      },
      mood_based: {
        reason: "I picked up on some stress in your recent activity. Want to unpack what's going on?",
        context: {
          type: 'mood_based',
          tone: 'stress'
        }
      },
      guilt_pattern: {
        reason: "I notice some changes that suggest you might be feeling guilty. Guilt around money is very common. Let's talk about it?",
        context: {
          type: 'guilt_pattern',
          tone: 'guilt'
        }
      }
    };
    
    setTherapistTrigger({
      active: true,
      reason: triggers[type].reason,
      context: triggers[type].context
    });
  }
}; 