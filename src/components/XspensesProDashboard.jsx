import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User, Play, TrendingUp, Users, Award, Star,
  Calculator, Building2, CreditCard, Eye, Sparkles, TrendingDown, Banknote, GripVertical
} from 'lucide-react';
import DashboardHeader from './ui/DashboardHeader';
import { ConnectedDashboard } from './dashboard/ConnectedDashboard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Card Component
function SortableCard({ id, children, viewMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${viewMode === 'grid' ? 'touch-none' : ''}`}
    >
      {children}
    </div>
  );
}

export default function XspensesProDashboard() {
  const [viewMode, setViewMode] = useState('grid');
  const [cardOrder, setCardOrder] = useState([
    'balance', 'income', 'expenses', 'savings', 'investments', 'debt'
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const cardData = {
    smartImport: {
      title: 'Smart Import AI',
      value: '247 docs',
      icon: '📤',
      trend: '2 hours ago',
      trendIcon: <UploadCloud className="w-3 h-3" />,
      bgClass: 'bg-gradient-to-br from-green-600 to-emerald-700',
      borderClass: 'border-green-500/30',
      valueColor: 'text-white',
      trendColor: 'text-green-300',
      trendBg: 'bg-green-500/20',
      iconBg: 'bg-green-500/20'
    },
    financialAssistant: {
      title: 'AI Financial Assistant',
      value: '99.7%',
      icon: '🤖',
      trend: '24/7',
      trendIcon: <Bot className="w-3 h-3" />,
      bgClass: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      borderClass: 'border-blue-500/30',
      valueColor: 'text-white',
      trendColor: 'text-blue-300',
      trendBg: 'bg-blue-500/20',
      iconBg: 'bg-blue-500/20'
    },
    financialTherapist: {
      title: 'AI Financial Therapist',
      value: 'Low',
      icon: '💖',
      trend: '3 days ago',
      trendIcon: <HeartPulse className="w-3 h-3" />,
      bgClass: 'bg-gradient-to-br from-pink-600 to-rose-700',
      borderClass: 'border-pink-500/30',
      valueColor: 'text-white',
      trendColor: 'text-pink-300',
      trendBg: 'bg-pink-500/20',
      iconBg: 'bg-pink-500/20'
    },
    goalConcierge: {
      title: 'AI Goal Concierge',
      value: '3 goals',
      icon: '🎯',
      trend: '87%',
      trendIcon: <Target className="w-3 h-3" />,
      bgClass: 'bg-gradient-to-br from-purple-600 to-violet-700',
      borderClass: 'border-purple-500/30',
      valueColor: 'text-white',
      trendColor: 'text-purple-300',
      trendBg: 'bg-purple-500/20',
      iconBg: 'bg-purple-500/20'
    },
    spendingPredictions: {
      title: 'Spending Predictions',
      value: '94%',
      icon: '📊',
      trend: '156 pred',
      trendIcon: <LineChart className="w-3 h-3" />,
      bgClass: 'bg-gradient-to-br from-yellow-600 to-orange-700',
      borderClass: 'border-yellow-500/30',
      valueColor: 'text-white',
      trendColor: 'text-yellow-300',
      trendBg: 'bg-yellow-500/20',
      iconBg: 'bg-yellow-500/20'
    },
    debtElimination: {
      title: 'Debt Elimination',
      value: '$12,847',
      icon: '⚡',
      trend: '18 months',
      trendIcon: <TrendingDown className="w-3 h-3" />,
      bgClass: 'bg-gradient-to-br from-red-600 to-rose-700',
      borderClass: 'border-red-500/30',
      valueColor: 'text-white',
      trendColor: 'text-red-300',
      trendBg: 'bg-red-500/20',
      iconBg: 'bg-red-500/20'
    }
  };

  const renderCard = (cardId, isSortable = false) => {
    const card = cardData[cardId];
    if (!card) return null;

    const cardContent = (
      <div 
        className={`${card.bgClass} backdrop-blur-xl rounded-2xl p-6 border ${card.borderClass} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
          viewMode === 'grid' ? 'text-center' : 'flex items-center justify-between'
        }`}
        style={{ 
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          contain: 'layout style paint'
        }}
      >
        {viewMode === 'grid' ? (
          <>
            <div className="flex justify-center mb-3">
              <div className={`p-3 ${card.iconBg || 'bg-white/20'} rounded-xl backdrop-blur-sm`}>
                <div className="text-3xl">{card.icon}</div>
              </div>
            </div>
            <div className={`text-3xl font-bold ${card.valueColor} mb-2 tracking-tight`}>{card.value}</div>
            <div className="text-slate-300 text-sm font-medium mb-2">{card.title}</div>
            <div className={`inline-flex items-center gap-1 px-3 py-1 ${card.trendBg} rounded-full text-xs font-medium ${card.trendColor}`}>
              {card.trendIcon}
              {card.trend}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className={`p-3 ${card.iconBg || 'bg-white/20'} rounded-xl backdrop-blur-sm`}>
                <div className="text-2xl">{card.icon}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{card.title}</div>
                <div className={`${card.trendColor} text-sm flex items-center gap-1`}>
                  {card.trendIcon}
                  {card.trend}
                </div>
              </div>
            </div>
            <div className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</div>
          </>
        )}
      </div>
    );

    if (isSortable) {
      return (
        <SortableCard key={cardId} id={cardId} viewMode={viewMode}>
          {cardContent}
        </SortableCard>
      );
    }

    return cardContent;
  };

  return (
    <div className="w-full" style={{ 
      transform: 'translateZ(0)', 
      WebkitTransform: 'translateZ(0)',
      contain: 'layout style paint'
    }}>
      <DashboardHeader />
      <div className="max-w-7xl mx-auto p-6">
        <ConnectedDashboard />
      </div>
    </div>
  );
}