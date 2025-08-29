import React, { useState, useEffect } from 'react';
import { 
  Bell, Calendar, DollarSign, AlertTriangle, CheckCircle, 
  Plus, Edit3, Trash2, Settings, TrendingUp,
  CreditCard, Home, Car, ShoppingCart, Heart,
  Brain, Mail, Upload, FileText, X, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardHeader from '../../components/ui/DashboardHeader';
import SpecializedChatBot from '../../components/chat/SpecializedChatBot';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: 'upcoming' | 'overdue' | 'paid' | 'auto-paid' | 'ai_predicted';
  priority: 'high' | 'medium' | 'low';
  isRecurring: boolean;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  account: string;
  lastPaid?: string;
  nextDue: string;
  autoPay: boolean;
  reminderDays: number[];
}

interface BillAlert {
  id: string;
  type: 'due_soon' | 'overdue' | 'payment_success' | 'auto_pay_scheduled';
  message: string;
  billId: string;
  timestamp: string;
  read: boolean;
}

interface AIRecurringBill {
  id: string;
  vendor: string;
  amount: number;
  frequency: string;
  lastDetected: string;
  confidence: number;
  suggestedReminder: number;
}

interface ReminderSettings {
  emailReminders: boolean;
  dashboardNotifications: boolean;
  calendarSync: boolean;
  reminderTime: string;
}

const BillRemindersPage = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [alerts, setAlerts] = useState<BillAlert[]>([]);
  const [showAddBill, setShowAddBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'paid'>('all');
  const [showAIMemory, setShowAIMemory] = useState(true);
  const [aiRecurringBills, setAiRecurringBills] = useState<AIRecurringBill[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    emailReminders: true,
    dashboardNotifications: true,
    calendarSync: false,
    reminderTime: '8:00 AM'
  });

  // Mock data - replace with real data from Supabase
  useEffect(() => {
    const mockBills: Bill[] = [
      {
        id: '1',
        name: 'Rent',
        amount: 1200,
        dueDate: '2024-01-15',
        category: 'Housing',
        status: 'upcoming',
        priority: 'high',
        isRecurring: true,
        frequency: 'monthly',
        account: 'Chase Checking',
        nextDue: '2024-01-15',
        autoPay: true,
        reminderDays: [7, 3, 1]
      },
      {
        id: '2',
        name: 'Car Payment',
        amount: 350,
        dueDate: '2024-01-20',
        category: 'Transportation',
        status: 'upcoming',
        priority: 'high',
        isRecurring: true,
        frequency: 'monthly',
        account: 'Wells Fargo',
        nextDue: '2024-01-20',
        autoPay: true,
        reminderDays: [7, 3, 1]
      },
      {
        id: '3',
        name: 'Netflix Subscription',
        amount: 15.99,
        dueDate: '2024-01-10',
        category: 'Entertainment',
        status: 'paid',
        priority: 'low',
        isRecurring: true,
        frequency: 'monthly',
        account: 'Chase Credit Card',
        lastPaid: '2024-01-10',
        nextDue: '2024-02-10',
        autoPay: true,
        reminderDays: [3]
      },
      {
        id: '4',
        name: 'Electric Bill',
        amount: 89.50,
        dueDate: '2024-01-05',
        category: 'Utilities',
        status: 'overdue',
        priority: 'medium',
        isRecurring: true,
        frequency: 'monthly',
        account: 'Chase Checking',
        nextDue: '2024-02-05',
        autoPay: false,
        reminderDays: [7, 3, 1]
      }
    ];

    const mockAlerts: BillAlert[] = [
      {
        id: '1',
        type: 'due_soon',
        message: 'Rent payment due in 3 days - $1,200',
        billId: '1',
        timestamp: '2024-01-12T10:00:00Z',
        read: false
      },
      {
        id: '2',
        type: 'overdue',
        message: 'Electric bill is overdue - $89.50',
        billId: '4',
        timestamp: '2024-01-06T09:00:00Z',
        read: false
      },
      {
        id: '3',
        type: 'payment_success',
        message: 'Netflix payment processed successfully',
        billId: '3',
        timestamp: '2024-01-10T14:30:00Z',
        read: true
      }
    ];

    const mockAIRecurringBills: AIRecurringBill[] = [
      {
        id: '1',
        vendor: 'Visa Credit Card',
        amount: 450,
        frequency: '12th of every month',
        lastDetected: '2024-01-12',
        confidence: 95,
        suggestedReminder: 3
      },
      {
        id: '2',
        vendor: 'Spotify Premium',
        amount: 9.99,
        frequency: '15th of every month',
        lastDetected: '2024-01-15',
        confidence: 88,
        suggestedReminder: 1
      }
    ];

    setBills(mockBills);
    setAlerts(mockAlerts);
    setAiRecurringBills(mockAIRecurringBills);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-500 bg-blue-500/10';
      case 'overdue': return 'text-red-500 bg-red-500/10';
      case 'paid': return 'text-green-500 bg-green-500/10';
      case 'auto-paid': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'housing': return <Home size={16} />;
      case 'transportation': return <Car size={16} />;
      case 'utilities': return <Zap size={16} />;
      case 'entertainment': return <ShoppingCart size={16} />;
      case 'healthcare': return <Heart size={16} />;
      default: return <CreditCard size={16} />;
    }
  };

  const handleMarkAsPaid = (billId: string) => {
    setBills(bills.map(bill => 
      bill.id === billId 
        ? { ...bill, status: 'paid' as any }
        : bill
    ));
  };

  const handleToggleReminder = (billId: string) => {
    setBills(bills.map(bill => 
      bill.id === billId 
        ? { ...bill, autoPay: !bill.autoPay }
        : bill
    ));
  };

  const handleSetReminder = (aiBill: AIRecurringBill) => {
    // Add to bills list
    const newBill: Bill = {
      id: `ai-${aiBill.id}`,
      name: aiBill.vendor,
      amount: aiBill.amount,
      dueDate: new Date().toISOString().split('T')[0], // Today's date
      category: 'Subscription',
      status: 'upcoming',
      priority: 'medium',
      isRecurring: true,
      frequency: 'monthly',
      account: 'AI Detected',
      nextDue: new Date().toISOString().split('T')[0],
      autoPay: false,
      reminderDays: [aiBill.suggestedReminder]
    };
    
    setBills([...bills, newBill]);
    setAiRecurringBills(aiRecurringBills.filter(bill => bill.id !== aiBill.id));
  };

  const handleSnoozeReminder = (aiBill: AIRecurringBill) => {
    setAiRecurringBills(aiRecurringBills.filter(bill => bill.id !== aiBill.id));
  };

  const handleNeverRemind = (aiBill: AIRecurringBill) => {
    // Create AI memory ignore rule
    setAiRecurringBills(aiRecurringBills.filter(bill => bill.id !== aiBill.id));
  };

  const totalUpcoming = bills.filter(bill => bill.status === 'upcoming').length;
  const totalOverdue = bills.filter(bill => bill.status === 'overdue').length;
  const totalPaid = bills.filter(bill => bill.status === 'paid').length;
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalDueThisWeek = bills
    .filter(bill => bill.status === 'upcoming')
    .filter(bill => {
      const dueDate = new Date(bill.dueDate);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate <= weekFromNow;
    })
    .reduce((sum, bill) => sum + bill.amount, 0);

  const filteredBills = bills.filter(bill => {
    if (filter === 'all') return true;
    return bill.status === filter;
  });

  const getBillStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-700 bg-blue-100';
      case 'overdue': return 'text-red-700 bg-red-100';
      case 'paid': return 'text-gray-700 bg-gray-100';
      case 'ai_predicted': return 'text-yellow-800 bg-yellow-100 animate-pulse';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getBillStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return '✅';
      case 'overdue': return '⚠️';
      case 'ai_predicted': return '🤖';
      default: return '';
    }
  };

  // Simple error boundary to prevent component crash
  if (!bills || bills.length === 0) {
    return (
      <div className="w-full">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-12">
            <p className="text-white/60">Loading bills...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Standardized Dashboard Header */}
      <DashboardHeader />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setShowAddBill(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus size={20} />
            Add Bill
          </button>
          <button className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <Settings size={20} />
          </button>
        </div>
        
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* 🧠 AI Memory Panel */}
            {showAIMemory && aiRecurringBills.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border-l-4 border-indigo-500 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Brain size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Smart Reminders from AI</h3>
                      <p className="text-white/60 text-sm">I detected these recurring payments from your uploads</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAIMemory(false)}
                    className="text-white/60 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {aiRecurringBills.map((aiBill) => (
                    <motion.div
                      key={aiBill.id}
                      className="bg-white/10 rounded-lg p-4 border border-white/20"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white font-semibold">{aiBill.vendor}</p>
                          <p className="text-white/60 text-sm">
                            ${aiBill.amount} • {aiBill.frequency} • {aiBill.confidence}% confidence
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-sm">Want me to remind you {aiBill.suggestedReminder} days before?</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetReminder(aiBill)}
                          className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                          Set Reminder
                        </button>
                        <button
                          onClick={() => handleSnoozeReminder(aiBill)}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                          Snooze for now
                        </button>
                        <button
                          onClick={() => handleNeverRemind(aiBill)}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                          Never remind me
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 📊 Enhanced Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-indigo-600/20 to-blue-700/20 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Due This Week</p>
                    <p className="text-2xl font-bold text-white">${totalDueThisWeek.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <DollarSign size={24} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-600/20 to-teal-700/20 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Paid This Month</p>
                    <p className="text-2xl font-bold text-white">${totalPaid * 500}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={24} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-700/20 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Next Bill Date</p>
                    <p className="text-2xl font-bold text-white">
                      {bills.filter(b => b.status === 'upcoming').length > 0 
                        ? new Date(bills.filter(b => b.status === 'upcoming')[0].dueDate).getDate()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <Calendar size={24} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-600/20 to-red-700/20 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Forecasted Monthly</p>
                    <p className="text-2xl font-bold text-white">${totalAmount.toFixed(0)}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* 🧠 AI Forecast Strip */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-l-4 border-indigo-500 rounded-xl shadow-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <Brain size={20} className="text-indigo-400" />
                <p className="text-white/80 text-sm">
                  💡 This month, your expected bill total is <strong className="text-white">${totalAmount.toFixed(0)}</strong> across <strong className="text-white">{bills.length}</strong> bills.
                  {bills.filter(b => b.status === 'upcoming').length > 0 && (
                    <> Your highest due date is <strong className="text-white">{
                      new Date(bills.filter(b => b.status === 'upcoming')[0].dueDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    }</strong>.</>
                  )}
                </p>
              </div>
            </div>

            {/* �� Recent Alerts */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recent Reminders</h3>
                <button className="text-blue-400 hover:text-blue-300 text-sm">View All</button>
              </div>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <motion.div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.read ? 'bg-white/5 border-white/10' : 'bg-blue-500/10 border-blue-500/20'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          alert.type === 'overdue' ? 'bg-red-400' :
                          alert.type === 'due_soon' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`}></div>
                        <div>
                          <p className="text-white text-sm">{alert.message}</p>
                          <p className="text-white/60 text-xs mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ⚙️ Reminder Preferences */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-6">Reminder Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-white" />
                      <div>
                        <p className="text-white font-medium">Email Reminders</p>
                        <p className="text-white/60 text-sm">Get notified via email</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReminderSettings({...reminderSettings, emailReminders: !reminderSettings.emailReminders})}
                      className={`w-12 h-6 rounded-full transition-all ${
                        reminderSettings.emailReminders 
                          ? 'bg-blue-500' 
                          : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                        reminderSettings.emailReminders ? 'ml-6' : 'ml-1'
                      }`}></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell size={20} className="text-white" />
                      <div>
                        <p className="text-white font-medium">Dashboard Notifications</p>
                        <p className="text-white/60 text-sm">Show alerts in dashboard</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReminderSettings({...reminderSettings, dashboardNotifications: !reminderSettings.dashboardNotifications})}
                      className={`w-12 h-6 rounded-full transition-all ${
                        reminderSettings.dashboardNotifications 
                          ? 'bg-blue-500' 
                          : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                        reminderSettings.dashboardNotifications ? 'ml-6' : 'ml-1'
                      }`}></div>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-white" />
                      <div>
                        <p className="text-white font-medium">Calendar Sync</p>
                        <p className="text-white/60 text-sm">Sync with Google/Apple Calendar</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReminderSettings({...reminderSettings, calendarSync: !reminderSettings.calendarSync})}
                      className={`w-12 h-6 rounded-full transition-all ${
                        reminderSettings.calendarSync 
                          ? 'bg-blue-500' 
                          : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                        reminderSettings.calendarSync ? 'ml-6' : 'ml-1'
                      }`}></div>
                    </button>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-lg">
                    <label className="text-white font-medium mb-2 block">Reminder Time</label>
                    <select
                      value={reminderSettings.reminderTime}
                      onChange={(e) => setReminderSettings({...reminderSettings, reminderTime: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="8:00 AM">8:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="6:00 PM">6:00 PM</option>
                      <option value="9:00 PM">9:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 📋 Bills List */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Your Bills</h3>
                  <div className="flex gap-2">
                    {['all', 'upcoming', 'overdue', 'paid'].map((filterOption) => (
                      <button
                        key={filterOption}
                        onClick={() => setFilter(filterOption as any)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          filter === filterOption
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">Bill</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Amount</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Due Date</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Priority</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Auto Pay</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredBills.map((bill) => (
                      <motion.tr 
                        key={bill.id}
                        className="hover:bg-white/5 transition-colors"
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                              {getCategoryIcon(bill.category)}
                            </div>
                            <div>
                              <div className="text-white font-medium">{bill.name}</div>
                              <div className="text-white/60 text-sm">{bill.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">
                          ${bill.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-white text-sm">
                          {new Date(bill.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {bill.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${getPriorityColor(bill.priority)}`}>
                            {bill.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {bill.autoPay ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <AlertTriangle size={16} className="text-yellow-500" />
                            )}
                            <span className="text-white/60 text-sm">
                              {bill.autoPay ? 'Enabled' : 'Manual'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Settings"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>

          {/* Specialized Bill Reminder Chatbot */}
          <SpecializedChatBot
            name="BillReminderBot"
            expertise="Bill tracking, reminders, and payment management"
            avatar="📅"
            welcomeMessage="Hi! I'm BillReminderBot, your bill management specialist. I can help you track upcoming bills, set payment reminders, manage recurring payments, and ensure you never miss a due date. What bill-related questions do you have today?"
            color="red"
          />
        </div>
      </div>
    </div>
  );
};

export default BillRemindersPage; 