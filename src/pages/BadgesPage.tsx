import { Award, Trophy, Star } from 'lucide-react';
import BadgeSystem from '../components/gamification/BadgeSystem';
import StreakTracker from '../components/gamification/StreakTracker';
import XPDisplay from '../components/gamification/XPDisplay';

const BadgesPage = () => {
  return (
    <div className="space-y-6">
      <div
        className="flex items-center space-x-3 mb-8"
      >
        <Trophy size={32} className="text-yellow-600" />
        <div>
          <h1 className="text-2xl font-bold">Achievements & Badges</h1>
          <p className="text-gray-600">Track your progress and unlock rewards</p>
        </div>
      </div>

      {/* XP Overview */}
      <div
      >
        <XPDisplay showDetails={false} />
      </div>

      {/* Streak Tracker */}
      <div
      >
        <StreakTracker showCalendar={true} />
      </div>

      {/* Badge System */}
      <div
      >
        <BadgeSystem showProgress={true} />
      </div>

      {/* Motivational Section */}
      <div
        className="card bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200"
      >
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Star size={24} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keep Building Your Financial Habits! 🚀
            </h3>
            <p className="text-gray-600 mb-4">
              Every receipt you scan and transaction you track brings you closer to mastering your finances. 
              Stay consistent, earn XP, and unlock achievements that celebrate your progress!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-primary-700">
                <Award size={16} />
                <span>Earn badges for milestones</span>
              </div>
              <div className="flex items-center space-x-2 text-secondary-700">
                <Trophy size={16} />
                <span>Build daily streaks</span>
              </div>
              <div className="flex items-center space-x-2 text-accent-700">
                <Star size={16} />
                <span>Level up with XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgesPage;
