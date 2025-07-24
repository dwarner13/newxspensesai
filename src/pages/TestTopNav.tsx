import { useState } from 'react';
import { motion } from 'framer-motion';
import TopNav from '../components/layout/TopNav';
import { useAtom } from 'jotai';
import { isDarkModeAtom } from '../lib/uiStore';
import { Link } from 'react-router-dom';

const TestTopNav = () => {
  const [darkMode, setDarkMode] = useAtom(isDarkModeAtom);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <TopNav toggleDarkMode={toggleDarkMode} />
      
      <div className="container  px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>TopNav Component Test</h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            This page demonstrates the TopNav component in isolation. Try clicking on the bell icon and user avatar to see the dropdowns.
          </p>
          
          <div className="space-y-4">
            <div className={`p-4 ${darkMode ? 'bg-primary-900/30' : 'bg-primary-50'} rounded-lg`}>
              <h2 className={`font-semibold ${darkMode ? 'text-primary-300' : 'text-primary-700'} mb-2`}>Features</h2>
              <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>Mobile menu toggle</li>
                <li>Notifications dropdown</li>
                <li>User menu dropdown</li>
                <li>Dark mode toggle</li>
                <li>Responsive design</li>
              </ul>
            </div>
            
            <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}>
              <h2 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Current State</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Dark Mode: <span className="font-mono">{darkMode ? 'true' : 'false'}</span>
              </p>
            </div>
            
            <div className="flex justify-center mt-6">
              <Link 
                to="/"
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-primary-600 hover:bg-primary-700' : 'bg-primary-600 hover:bg-primary-700'} text-white transition-colors`}
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TestTopNav;
