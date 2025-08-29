import React, { useState, useEffect } from 'react';
import { Heart, Brain, Zap, Send } from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface WellnessActivity {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  completed: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'therapist';
  message: string;
  timestamp: string;
}

const FinancialTherapistPage = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'therapist',
      message: "Hello! I'm here to support your financial wellness journey. How are you feeling about money today?",
      timestamp: new Date().toISOString()
    }
  ]);

  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const wellnessActivities: WellnessActivity[] = [
    {
      id: '1',
      title: 'Mindful Spending',
      description: 'Practice conscious spending habits',
      icon: <Brain size={20} />,
      color: 'from-blue-500 to-cyan-500',
      completed: true
    },
    {
      id: '2',
      title: 'Emotional Check-in',
      description: 'Reflect on your money emotions',
      icon: <Heart size={20} />,
      color: 'from-pink-500 to-rose-500',
      completed: false
    },
    {
      id: '3',
      title: 'Goal Visualization',
      description: 'Visualize your financial future',
      icon: <Zap size={20} />,
      color: 'from-yellow-500 to-orange-500',
      completed: false
    }
  ];

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        message: chatMessage,
        timestamp: new Date().toISOString()
      };
      setChatHistory([...chatHistory, newMessage]);
      setChatMessage('');
      
      // Simulate therapist response
      setTimeout(() => {
        const therapistResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'therapist',
          message: "Thank you for sharing that. Let's explore this together. What would you like to focus on next?",
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, therapistResponse]);
      }, 1000);
    }
  };

  return (
    <div className="w-full">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto space-y-8 px-6">
        {/* Wellness Activities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {wellnessActivities.map((activity) => (
            <div
              key={activity.id}
              className={`bg-gradient-to-br ${activity.color} p-6 rounded-2xl text-white ${
                activity.completed ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-white/20 p-2 rounded-lg">
                  {activity.icon}
                </div>
                <h3 className="font-semibold">{activity.title}</h3>
              </div>
              <p className="text-white/90 text-sm mb-4">{activity.description}</p>
              <button
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                  activity.completed
                    ? 'bg-white/20 text-white cursor-not-allowed'
                    : 'bg-white text-gray-800 hover:bg-white/90'
                }`}
                disabled={activity.completed}
              >
                {activity.completed ? 'Completed' : 'Start Activity'}
              </button>
            </div>
          ))}
        </div>

        {/* Chat Interface */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-6">Chat with Your Financial Therapist</h2>
          
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {chatHistory.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Share your thoughts..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialTherapistPage;
