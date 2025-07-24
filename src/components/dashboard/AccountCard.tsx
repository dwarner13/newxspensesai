import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Edit } from 'lucide-react';

interface AccountCardProps {
  accountName: string;
  taxSystem: string;
  timeZone: string;
  darkMode?: boolean;
  onEdit?: (field: string, value: string) => void;
}

const AccountCard = ({ 
  accountName = 'Personal Workspace', 
  taxSystem = 'Default', 
  timeZone = 'America/Edmonton',
  darkMode = false,
  onEdit
}: AccountCardProps) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  const taxSystems = ['Default', 'US Tax System', 'EU VAT System', 'UK Tax System', 'Australian Tax System', 'Canadian Tax System'];
  const timeZones = [
    'America/New_York', 
    'America/Chicago', 
    'America/Denver', 
    'America/Los_Angeles', 
    'America/Edmonton',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
  
  const handleEditClick = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };
  
  const handleSave = () => {
    if (editingField && onEdit) {
      onEdit(editingField, tempValue);
    }
    setEditingField(null);
  };
  
  const handleCancel = () => {
    setEditingField(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
    >
      <div className="p-6">
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Account Information</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Account Name</div>
              {editingField === 'accountName' ? (
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className={`px-2 py-1 rounded border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  <div className="flex space-x-1 ml-2">
                    <button 
                      onClick={handleSave}
                      className={`p-1 rounded ${darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleCancel}
                      className={`p-1 rounded ${darkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{accountName}</div>
              )}
            </div>
            {editingField !== 'accountName' && (
              <button 
                onClick={() => handleEditClick('accountName', accountName)}
                className="text-orange-500 hover:text-orange-600"
              >
                <Edit size={18} />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tax System</div>
              {editingField === 'taxSystem' ? (
                <div className="flex items-center mt-1">
                  <select
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className={`px-2 py-1 rounded border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  >
                    {taxSystems.map(system => (
                      <option key={system} value={system}>{system}</option>
                    ))}
                  </select>
                  <div className="flex space-x-1 ml-2">
                    <button 
                      onClick={handleSave}
                      className={`p-1 rounded ${darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleCancel}
                      className={`p-1 rounded ${darkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{taxSystem}</div>
                  <ChevronDown size={16} className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              )}
            </div>
            {editingField !== 'taxSystem' && (
              <button 
                onClick={() => handleEditClick('taxSystem', taxSystem)}
                className="text-orange-500 hover:text-orange-600"
              >
                <Edit size={18} />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time Zone</div>
              {editingField === 'timeZone' ? (
                <div className="flex items-center mt-1">
                  <select
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className={`px-2 py-1 rounded border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  >
                    {timeZones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                  <div className="flex space-x-1 ml-2">
                    <button 
                      onClick={handleSave}
                      className={`p-1 rounded ${darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleCancel}
                      className={`p-1 rounded ${darkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{timeZone}</div>
                  <ChevronDown size={16} className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              )}
            </div>
            {editingField !== 'timeZone' && (
              <button 
                onClick={() => handleEditClick('timeZone', timeZone)}
                className="text-orange-500 hover:text-orange-600"
              >
                <Edit size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AccountCard;
