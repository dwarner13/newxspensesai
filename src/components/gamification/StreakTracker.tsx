import { useState, useEffect } from 'react';
import { Flame, Calendar, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StreakTrackerProps {
  current?: number;
  goal?: number;
  showCalendar?: boolean;
  compact?: boolean;
  className?: string;
}

const StreakTracker = ({ 
  current: propCurrent, 
  goal: propGoal = 7,
  showCalendar = true,
  compact = false,
  className = '' 
}: StreakTrackerProps) => {
  const { user } = useAuth();
  const [current, setCurrent] = useState(propCurrent || 0);
  const [goal, setGoal] = useState(propGoal);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState<{day: string; active: boolean; isToday: boolean}[]>([]);

  useEffect(() => {
    if (user && propCurrent === undefined) {
      loadStreakData();
    } else {
      setCurrent(propCurrent || 0);
      setLoading(false);
      generateWeekCalendar(propCurrent || 0);
    }
  }, [user, propCurrent]);

  const loadStreakData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('streak, last_activity_date')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setCurrent(data.streak || 0);
      generateWeekCalendar(data.streak || 0);
      
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWeekCalendar = (streakDays: number) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
    const todayIndex = today === 0 ? 6 : today - 1; // Convert to 0 = Monday, ..., 6 = Sunday
    
    const weekData = days.map((day, index) => {
      // For the streak, we'll consider days before today as active if within the streak count
      const isActive = index <= todayIndex && streakDays > todayIndex - index;
      return {
        day,
        active: isActive,
        isToday: index === todayIndex
      };
    });
    
    setWeekDays(weekData);
  };

  const getStreakMessage = () => {
    if (current === 0) return "Start your streak today!";
    if (current === 1) return "Great start! Keep it going!";
    if (current < goal) return `${current} days strong! 🔥`;
    return `Amazing ${current}-day streak! 🚀`;
  };

  const getProgress = () => {
    return Math.min((current / goal) * 100, 100);
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-20 ${className}`}></div>
    );
  }

  if (compact) {
    return (
      <div className={`p-4 bg-white shadow rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame size={20} className={current > 0 ? "text-orange-500" : "text-gray-400"} />
            <span className="font-medium">Daily Streak</span>
          </div>
          <div className="text-lg font-bold">{current}</div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div
            animate={{ width: `${getProgress()}%` }}
            className="bg-orange-500 h-1.5 rounded-full"
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">
          {goal - current > 0 ? `${goal - current} days to ${goal}-day streak` : "Streak goal reached!"}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white shadow rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Flame size={24} className={current > 0 ? "text-orange-500" : "text-gray-400"} />
          <div>
            <h3 className="font-semibold text-gray-900">Daily Streak</h3>
            <p className="text-sm text-gray-600">{getStreakMessage()}</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-orange-500">{current}</div>
      </div>

      {showCalendar && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">This Week</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`text-center p-1 rounded-md text-xs ${
                  day.active 
                    ? 'bg-orange-500 text-white' 
                    : day.isToday 
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="font-medium">{day.day}</div>
                <div className="mt-1">
                  {day.active ? '🔥' : day.isToday ? '📅' : '⭕'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Target size={16} className="text-orange-500" />
            <span className="font-medium text-gray-700">
              Next Milestone: {goal} days
            </span>
          </div>
          <div className="flex items-center space-x-1 text-orange-500">
            <Flame size={14} />
            <span className="font-medium">+{goal * 5} XP</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            animate={{ width: `${getProgress()}%` }}
            className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
          />
        </div>
        
        <div className="text-xs text-gray-600 text-center">
          {goal - current > 0 ? `${goal - current} more days to earn ${goal * 5} XP` : "Milestone reached! 🎉"}
        </div>
      </div>
    </div>
  );
};

export default StreakTracker;
