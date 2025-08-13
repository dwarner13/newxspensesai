import { useState, useEffect } from 'react';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const AIDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const scenarios = [
    // ... existing scenarios ...
  ];

  const aiResponses = {
    // ... existing aiResponses ...
  };

  // ... typeMessage, handleScenarioSelect, handleCustomInput ...

  return (
    <WebsiteLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Experience Your AI Financial Assistant</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto mb-8">
            See how XspensesAI combines intelligent financial advice with personalized audio content. This is just a preview - the real experience is even more powerful!
          </p>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-2xl mx-auto mb-8">
            <p className="text-yellow-800">
              🎵 <strong>Demo Mode:</strong> This showcases our AI + Audio concept. The full platform includes real-time analysis, actual Spotify integration, and personalized podcast curation.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        {/* ... rest of the component remains unchanged ... */}
      </div>
    </WebsiteLayout>
  );
};

export default AIDemo; 
