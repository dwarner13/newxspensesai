# 🎮 XspensesAI Gamification System

## 🌟 Overview

The XspensesAI Gamification System is designed to increase user engagement and build financial habits through game mechanics. Users earn XP, level up, unlock badges, and maintain streaks as they interact with the application.

## 🧩 Core Components

### 1. XP System
- **XP Earning**: Users earn XP for various activities:
  - Upload statements: +15 XP
  - Scan receipts: +10 XP
  - AI categorization: +20 XP
  - Daily login: +2 XP
  - Streak milestones: Variable XP
  - Completing goals: Variable XP

- **Leveling System**: 
  - Users progress through levels as they earn XP
  - Each level requires more XP than the previous (exponential curve)
  - Formula: `XP for Level N = (N * 100)^1.1`
  - Levels unlock titles: Beginner, Explorer, Enthusiast, Expert, Master, Legend

### 2. Streak Tracking
- **Daily Streaks**: Users build streaks by logging in and performing actions daily
- **Streak Rewards**: Milestone rewards at 3, 7, 14, 30, 60, and 90 days
- **Streak Badges**: Special badges for maintaining streaks
- **Streak XP**: 2 XP per day in streak awarded at milestones

### 3. Badge System
- **Achievement Badges**: Awarded for reaching milestones
- **XP Rewards**: Each badge awards bonus XP
- **Categories**: Receipt badges, streak badges, level badges, transaction badges
- **Visual Display**: Badges shown in profile and dashboard

### 4. Daily Goals
- **Daily Tasks**: Set of daily tasks that refresh each day
- **XP Rewards**: Each completed task awards XP
- **Bonus XP**: Complete all daily goals for bonus XP
- **Progress Tracking**: Visual progress indicators

## 🛠️ Technical Implementation

### Database Schema

#### 1. XP Activities Table
```sql
CREATE TABLE xp_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. Weekly Goals Table
```sql
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. Badges Table
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(),
  xp_reward INTEGER DEFAULT 0
);
```

#### 4. Profile Table Extensions
The existing `profiles` table has been extended with:
- `xp` (INTEGER): Total XP earned
- `level` (INTEGER): Current level
- `streak` (INTEGER): Current daily streak
- `last_activity_date` (DATE): Date of last activity for streak tracking

### Database Functions

#### 1. add_user_xp
Adds XP to a user and handles level progression.

#### 2. update_user_streak
Updates a user's daily streak based on activity.

#### 3. check_and_award_badges
Checks for badge eligibility and awards badges.

#### 4. update_weekly_progress
Updates weekly goal progress.

#### 5. handle_transaction_xp
Awards XP for new transactions.

#### 6. handle_receipt_xp
Awards XP for receipt scanning.

### React Components

#### 1. XPProgressRing
Circular progress indicator showing level and progress to next level.

#### 2. LevelCard
Displays user level, title, and XP progress.

#### 3. DailyGoals
Shows daily goals and progress.

#### 4. TaskCard
Reusable component for displaying XP-earning tasks.

#### 5. GamificationDashboard
Comprehensive dashboard showing all gamification elements.

#### 6. StreakTracker
Displays and manages user streaks.

#### 7. BadgeSystem
Shows earned and available badges.

### React Hooks

#### useXpSystem
Custom hook for managing XP-related functionality:
- `awardXp`: Awards XP to the user
- `checkDailyStreak`: Checks and updates daily streak
- `userXp`: Current XP value
- `userLevel`: Current level
- `userStreak`: Current streak days

## 🚀 Usage Examples

### Awarding XP
```tsx
import { useXpSystem } from '../hooks/useXpSystem';

const MyComponent = () => {
  const { awardXp } = useXpSystem();
  
  const handleTaskCompletion = async () => {
    // Award 15 XP for completing a task
    await awardXp(15, 'task_completion', 'Completed important financial task');
  };
  
  return (
    <button onClick={handleTaskCompletion}>
      Complete Task
    </button>
  );
};
```

### Checking Daily Streak
```tsx
import { useXpSystem } from '../hooks/useXpSystem';
import { useEffect } from 'react';

const Dashboard = () => {
  const { checkDailyStreak } = useXpSystem();
  
  useEffect(() => {
    // Check streak when dashboard loads
    checkDailyStreak();
  }, []);
  
  return (
    // Dashboard content
  );
};
```

### Displaying XP Progress
```tsx
import XPProgressRing from '../components/gamification/XPProgressRing';
import LevelCard from '../components/gamification/LevelCard';

const ProfilePage = () => {
  return (
    <div>
      <h2>Your Progress</h2>
      <div className="flex items-center space-x-4">
        <XPProgressRing size="lg" />
        <LevelCard />
      </div>
    </div>
  );
};
```

## 🎯 Best Practices

1. **Balance XP Rewards**: Ensure XP rewards are proportional to the effort required
2. **Prevent Gaming the System**: Implement cooldowns and limits to prevent abuse
3. **Visual Feedback**: Always provide clear visual feedback for XP earned
4. **Meaningful Progression**: Make levels feel meaningful with titles and benefits
5. **Celebrate Achievements**: Use animations and notifications to celebrate milestones
6. **Streak Forgiveness**: Consider implementing "streak freeze" mechanics for retention
7. **Regular Goals**: Refresh goals regularly to maintain engagement
8. **Performance**: Optimize database queries for XP-related operations

## 📊 Analytics Opportunities

The gamification system provides valuable data points for analytics:
- User engagement patterns
- Feature popularity based on XP earned
- Retention correlation with streak length
- Most/least earned badges
- Level progression rates
- Goal completion rates

## 🔮 Future Enhancements

1. **Leaderboards**: Compare XP with friends or all users
2. **Challenges**: Time-limited special challenges for bonus XP
3. **Achievements**: More complex achievement system beyond badges
4. **Personalized Goals**: AI-generated goals based on user behavior
5. **Reward Redemption**: Convert XP to real benefits or discounts
6. **Social Sharing**: Share achievements on social media
7. **Seasonal Events**: Special XP events during holidays or financial milestones
8. **Customization**: Allow users to choose focus areas for XP