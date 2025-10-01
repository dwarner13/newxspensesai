import { Info, TrendingUp, TrendingDown } from 'lucide-react';

interface CreditScoreCardProps {
  score: number;
  change?: number;
  lastUpdated: string;
  nextUpdate: string;
}

const CreditScoreCard = ({ score, change = 0, lastUpdated, nextUpdate }: CreditScoreCardProps) => {
  return (
    <div
      className="bg-white rounded-xl shadow-lg p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
            <div className="text-indigo-600 font-bold text-lg">{score}</div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Welcome, Darrell</h3>
            <div className="flex items-center">
              <p className="text-sm text-gray-600">Your score is good</p>
              <Info size={14} className="ml-1 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          {change > 0 ? (
            <div className="flex items-center text-green-600">
              <TrendingUp size={16} className="mr-1" />
              <span className="text-sm font-medium">+{change} pts</span>
            </div>
          ) : change < 0 ? (
            <div className="flex items-center text-red-600">
              <TrendingDown size={16} className="mr-1" />
              <span className="text-sm font-medium">{change} pts</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No change</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-600">
        <div className="flex items-center">
          <span className="mr-1">Updated {lastUpdated}</span>
          <span className="mx-2">•</span>
          <span>Next update {nextUpdate}</span>
        </div>
      </div>
      
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center text-sm text-yellow-800">
          <div className="w-5 h-5 bg-yellow-200 rounded-full flex items-center justify-center mr-2">
            <span className="text-yellow-700">⚠️</span>
          </div>
          <span>2 new credit inquiries</span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <button className="text-indigo-600 font-semibold text-sm">
          VIEW MORE DETAILS
        </button>
      </div>
    </div>
  );
};

export default CreditScoreCard;
