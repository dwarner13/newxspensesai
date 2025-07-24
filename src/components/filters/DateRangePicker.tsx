import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate: string | undefined, endDate: string | undefined) => void;
}

const DateRangePicker = ({ startDate, endDate, onChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(startDate, e.target.value);
  };

  const clearDates = () => {
    onChange(undefined, undefined);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDateForDisplay = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="relative" ref={pickerRef}>
      <div 
        className="input flex items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={16} className="mr-2 text-gray-500" />
        <span className="flex-1">
          {startDate || endDate ? (
            <span>
              {formatDateForDisplay(startDate)} — {formatDateForDisplay(endDate)}
            </span>
          ) : (
            <span className="text-gray-400">Select date range</span>
          )}
        </span>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearDates();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 w-72">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="input"
                value={startDate || ''}
                onChange={handleStartDateChange}
                max={endDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="input"
                value={endDate || ''}
                onChange={handleEndDateChange}
                min={startDate}
              />
            </div>
            <div className="flex justify-between pt-2">
              <button 
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={clearDates}
              >
                Clear
              </button>
              <button 
                className="btn-primary py-1 px-3 text-sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
