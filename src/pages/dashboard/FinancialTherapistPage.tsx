import React, { useState } from 'react';
import { 
  Heart, Smile, TrendingUp, Brain, MessageCircle, Target, Calendar, 
  AlertTriangle, CheckCircle, Zap, Sun, Moon, Plus, Settings, User, Crown,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import SpecializedChatBot from '../../components/chat/SpecializedChatBot';


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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const wellnessActivities: WellnessActivity[] = [
    {
      id: '1',
      title: 'Daily Affirmation',
      description: 'Start your day with positive money affirmations',
      icon: <Heart size={20} />,
      color: 'from-pink-500 to-rose-600',
      completed: true
    },
    {
      id: '2',
      title: 'Mindfulness Check',
      description: 'Practice mindful spending and decision-making',
      icon: <Brain size={20} />,
      color: 'from-purple-500 to-indigo-600',
      completed: false
    },
    {
      id: '3',
      title: 'Gratitude Journal',
      description: 'Write down 3 things you\'re grateful for financially',
      icon: <Zap size={20} />,
      color: 'from-green-500 to-teal-600',
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
          message: "Thank you for sharing that with me. It's important to acknowledge our feelings about money. Remember, financial wellness is a journey, and every step forward is progress.",
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, therapistResponse]);
      }, 1000);
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 px-10 py-12">
        <h1 className="text-4xl font-bold mb-4">AI Financial Therapist</h1>
        <p className="text-lg text-gray-300 mb-8">
          Let's unpack your financial habits, stress triggers, and money beliefs — with help from your AI therapist.
        </p>

        <div className="rounded-2xl bg-indigo-900/30 border border-indigo-400/30 shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-4">How would you like to begin?</h2>
          <ul className="list-disc list-inside space-y-3 text-indigo-300">
            <li>Talk about your recent financial stress</li>
            <li>Understand why you're overspending</li>
            <li>Get a self-paced financial wellness plan</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default FinancialTherapistPage; 
