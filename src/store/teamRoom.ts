import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  postManagerRoute, 
  postAgentRun, 
  fetchMemory, 
  saveMemory as apiSaveMemory,
  fetchTasks,
  saveTask as apiSaveTask
} from '../lib/team-api';

export type Agent = {
  id: string;
  name: string;
  role: string;
  dept: string;
  color: string;
  active: boolean;
  emoji?: string;
};

export type TeamMessage = {
  id: string;
  from: string;
  to?: string;
  kind: 'say' | 'handoff' | 'tool' | 'error' | 'insight';
  text: string;
  tags?: string[];
  confidence?: number;
  ts: number;
};

export type Task = {
  id: string;
  title: string;
  assignee: string;
  status: 'queued' | 'in-progress' | 'done';
  due?: string;
};

export type MemoryMap = {
  session: Array<{ key: string; value: any }>;
  longterm: Array<{ key: string; value: any }>;
  vendors: Array<{ key: string; value: any }>;
};

interface TeamRoomState {
  status: 'idle' | 'running' | 'paused';
  agents: Agent[];
  messages: TeamMessage[];
  tasks: Task[];
  memory: MemoryMap;
  routeMode: 'manager' | 'direct';
  directTarget?: string;
}

interface TeamRoomActions {
  initSeed: () => void;
  toggleAgent: (id: string) => void;
  reorderAgent: (id: string, direction: 'up' | 'down') => void;
  sendMessage: (text: string) => Promise<void>;
  simulate: () => void;
  pause: () => void;
  clear: () => void;
  enqueueTask: (task: Task) => void;
  assignTask: (id: string, agentId: string) => void;
  setTaskStatus: (id: string, status: Task['status']) => void;
  addMemory: (scope: 'session' | 'longterm' | 'vendors', kv: { key: string; value: any }) => void;
  loadMemory: () => Promise<void>;
  saveMemory: () => Promise<void>;
  loadTasks: () => Promise<void>;
  saveTask: (task: Task) => Promise<void>;
  setRouteMode: (mode: 'manager' | 'direct') => void;
  setDirectTarget: (target: string) => void;
}

const seedAgents: Agent[] = [
  // Command
  { id: 'prime', name: 'Prime', role: 'Boss & Strategic Mastermind', dept: 'Command', color: '#f59e0b', active: true, emoji: '👑' },
  
  // Core Finance Ops
  { id: 'finley', name: 'Finley', role: 'Personal Finance AI', dept: 'Core', color: '#0ea5e9', active: true, emoji: '💼' },
  { id: 'byte', name: 'Byte', role: 'Smart Import AI', dept: 'Core', color: '#22d3ee', active: true, emoji: '📄' },
  { id: 'tag', name: 'Tag', role: 'AI Categorization', dept: 'Core', color: '#8b5cf6', active: true, emoji: '🏷️' },
  { id: 'crystal', name: 'Crystal', role: 'Spending Predictions', dept: 'Core', color: '#10b981', active: true, emoji: '🔮' },
  { id: 'chime', name: 'Chime', role: 'Bill Reminder System', dept: 'Core', color: '#60a5fa', active: true, emoji: '🔔' },
  { id: 'blitz', name: 'Blitz', role: 'Debt Payoff Planner', dept: 'Core', color: '#ef4444', active: true, emoji: '⚡' },
  { id: 'ledger', name: 'Ledger', role: 'Tax Assistant', dept: 'Core', color: '#fbbf24', active: true, emoji: '📊' },
  
  // Planning & Guidance
  { id: 'goalie', name: 'Goalie', role: 'AI Goal Concierge', dept: 'Planning', color: '#a3e635', active: true, emoji: '🥅' },
  { id: 'liberty', name: 'Liberty', role: 'AI Financial Freedom', dept: 'Planning', color: '#34d399', active: true, emoji: '🗽' },
  
  // Business & Analytics
  { id: 'intelia', name: 'Intelia', role: 'Business Intelligence', dept: 'Biz', color: '#f472b6', active: true, emoji: '🧠' },
  { id: 'dash', name: 'Dash', role: 'Analytics', dept: 'Biz', color: '#38bdf8', active: true, emoji: '📈' },
  { id: 'automa', name: 'Automa', role: 'Smart Automation', dept: 'Biz', color: '#14b8a6', active: true, emoji: '⚙️' },
  { id: 'custodian', name: 'Custodian', role: 'Security & Privacy', dept: 'Biz', color: '#64748b', active: true, emoji: '🔐' },
  
  // Entertainment & Wellness
  { id: 'harmony', name: 'Harmony', role: 'Financial Wellness Studio', dept: 'Wellness', color: '#a78bfa', active: false, emoji: '🧘' },
  { id: 'wave', name: 'Wave', role: 'Spotify Integration', dept: 'Wellness', color: '#22c55e', active: false, emoji: '🌊' },
  { id: 'djzen', name: 'DJ Zen', role: 'Audio Entertainment', dept: 'Wellness', color: '#10b981', active: false, emoji: '🎧' },
  { id: 'roundtable', name: 'The Roundtable', role: 'Personal Podcast', dept: 'Wellness', color: '#f43f5e', active: false, emoji: '🎙️' },
  
  // Storytellers & Reality Checkers (podcast personalities)
  { id: 'spark', name: 'Spark', role: 'Motivation (Debt & Savings)', dept: 'Voices', color: '#f97316', active: false, emoji: '⚡' },
  { id: 'wisdom', name: 'Wisdom', role: 'Investing & Planning', dept: 'Voices', color: '#22c55e', active: false, emoji: '🧠' },
  { id: 'serenity', name: 'Serenity', role: 'Spending Habits (Behavior)', dept: 'Voices', color: '#60a5fa', active: false, emoji: '🌙' },
  { id: 'fortune', name: 'Fortune', role: 'Budget Truth', dept: 'Voices', color: '#ec4899', active: false, emoji: '💰' },
  { id: 'nova', name: 'Nova', role: 'Side Hustles & Income', dept: 'Voices', color: '#06b6d4', active: false, emoji: '🌱' },
  { id: 'harmony2', name: 'Harmony', role: 'Mindful Balance', dept: 'Voices', color: '#8b5cf6', active: false, emoji: '🧘' },
  { id: 'roastmaster', name: 'Roast Master', role: 'Spending Reality Checks', dept: 'Voices', color: '#ef4444', active: false, emoji: '🔥' },
  { id: 'savagesally', name: 'Savage Sally', role: 'Luxury Spending Roast', dept: 'Voices', color: '#f472b6', active: false, emoji: '💅' },
  { id: 'truthbomber', name: 'Truth Bomber', role: 'Budget Violations', dept: 'Voices', color: '#f59e0b', active: false, emoji: '💣' },
  { id: 'realitychecker', name: 'Reality Checker', role: 'Decision Forensics', dept: 'Voices', color: '#94a3b8', active: false, emoji: '🔍' },
  { id: 'savagesam', name: 'Savage Sam', role: 'Investment Roast', dept: 'Voices', color: '#9333ea', active: false, emoji: '😈' },
  { id: 'roastqueen', name: 'Roast Queen', role: 'Comprehensive Roast', dept: 'Voices', color: '#e879f9', active: false, emoji: '👑' }
];

const seedMemory: MemoryMap = {
  session: [
    { key: 'current_period', value: { month: '2025-09', uploads: 3 } }
  ],
  longterm: [
    { key: 'mileage_rate', value: { cad_per_km: 0.68 } }
  ],
  vendors: [
    { key: 'Tim Hortons', value: { default_category: 'Meals' } }
  ]
};

const seedTasks: Task[] = [
  { id: 't1', title: 'Parse September Visa PDF', assignee: 'byte', status: 'in-progress' },
  { id: 't2', title: 'Reclassify Starbucks as Meals', assignee: 'tag', status: 'queued' },
  { id: 't3', title: 'Estimate Q4 taxes', assignee: 'ledger', status: 'queued' }
];

const seedMessages: TeamMessage[] = [
  { 
    id: 'm1', 
    from: 'prime', 
    kind: 'say', 
    text: 'New statement uploaded. Routing to Byte for OCR.', 
    tags: ['handoff'], 
    confidence: 0.98, 
    ts: Date.now() - 60000 
  },
  { 
    id: 'm2', 
    from: 'byte', 
    kind: 'tool', 
    text: 'Parsed 27 transactions. Handing off to Tag.', 
    tags: ['parse', 'handoff'], 
    confidence: 0.96, 
    ts: Date.now() - 58000 
  },
  { 
    id: 'm3', 
    from: 'tag', 
    kind: 'insight', 
    text: '24 high-confidence categories, 3 need review. Sending tax-relevant items to Ledger.', 
    tags: ['categorize'], 
    confidence: 0.84, 
    ts: Date.now() - 56000 
  },
  { 
    id: 'm4', 
    from: 'ledger', 
    kind: 'insight', 
    text: 'Potential write-offs: $312 Meals (50%), $120 Supplies. Add receipts to maximize claim.', 
    tags: ['tax'], 
    confidence: 0.9, 
    ts: Date.now() - 54000 
  },
  { 
    id: 'm5', 
    from: 'crystal', 
    kind: 'insight', 
    text: 'Forecast: +12% utilities next month. Recommend automation rule via Automa.', 
    tags: ['forecast'], 
    confidence: 0.87, 
    ts: Date.now() - 52000 
  }
];

export const useTeamRoomStore = create<TeamRoomState & TeamRoomActions>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      agents: [],
      messages: [],
      tasks: [],
      memory: { session: [], longterm: [], vendors: [] },
      routeMode: 'manager',
      directTarget: undefined,

      // Actions
      initSeed: () => {
        console.log('Initializing team room store with seed data...');
        set({
          agents: seedAgents,
          messages: seedMessages,
          tasks: seedTasks,
          memory: seedMemory
        });
        console.log('Team room store initialized with', seedAgents.length, 'agents');
      },

      toggleAgent: (id: string) => {
        set((state) => ({
          agents: state.agents.map(agent =>
            agent.id === id ? { ...agent, active: !agent.active } : agent
          )
        }));
      },

      reorderAgent: (id: string, direction: 'up' | 'down') => {
        set((state) => {
          const agents = [...state.agents];
          const currentIndex = agents.findIndex(a => a.id === id);
          if (currentIndex === -1) return state;

          const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          if (newIndex < 0 || newIndex >= agents.length) return state;

          // Swap agents
          [agents[currentIndex], agents[newIndex]] = [agents[newIndex], agents[currentIndex]];
          return { agents };
        });
      },

      sendMessage: async (text: string) => {
        const { routeMode, directTarget, agents } = get();
        
        // Add user message
        const userMessage: TeamMessage = {
          id: `msg_${Date.now()}`,
          from: 'user',
          kind: 'say',
          text,
          ts: Date.now()
        };

        set((state) => ({
          messages: [...state.messages, userMessage]
        }));

        try {
          if (routeMode === 'manager') {
            // Route through Prime
            const response = await postManagerRoute(text);
            
            // Add Prime's response
            const primeMessage: TeamMessage = {
              id: `msg_${Date.now() + 1}`,
              from: 'prime',
              kind: 'say',
              text: response.manager_reply,
              ts: Date.now() + 1000
            };

            set((state) => ({
              messages: [...state.messages, primeMessage]
            }));

            // If there's a handoff, add handoff message and agent response
            if (response.route_to && response.route_to !== 'manager') {
              const targetAgent = agents.find(a => a.id === response.route_to);
              
              const handoffMessage: TeamMessage = {
                id: `msg_${Date.now() + 2}`,
                from: 'prime',
                to: response.route_to,
                kind: 'handoff',
                text: response.handoff_instructions || `Handing off to ${targetAgent?.name}`,
                tags: ['handoff'],
                ts: Date.now() + 2000
              };

              const agentResponse = await postAgentRun(response.route_to, response.handoff_instructions || text);
              
              const agentMessage: TeamMessage = {
                id: `msg_${Date.now() + 3}`,
                from: response.route_to,
                kind: 'insight',
                text: agentResponse.text,
                confidence: agentResponse.confidence,
                ts: Date.now() + 3000
              };

              set((state) => ({
                messages: [...state.messages, handoffMessage, agentMessage]
              }));
            }
          } else {
            // Direct message to specific agent
            if (!directTarget) return;
            
            const response = await postAgentRun(directTarget, text);
            
            const agentMessage: TeamMessage = {
              id: `msg_${Date.now() + 1}`,
              from: directTarget,
              kind: 'insight',
              text: response.text,
              confidence: response.confidence,
              ts: Date.now() + 1000
            };

            set((state) => ({
              messages: [...state.messages, agentMessage]
            }));
          }
        } catch (error) {
          console.error('Error sending message:', error);
          
          const errorMessage: TeamMessage = {
            id: `msg_${Date.now() + 1}`,
            from: 'system',
            kind: 'error',
            text: 'Failed to process message. Please try again.',
            ts: Date.now() + 1000
          };

          set((state) => ({
            messages: [...state.messages, errorMessage]
          }));
        }
      },

      simulate: () => {
        set({ status: 'running' });
        
        // Simulate a realistic workflow
        const simulationMessages: TeamMessage[] = [
          {
            id: `sim_${Date.now()}`,
            from: 'prime',
            kind: 'say',
            text: 'Starting simulation: Processing new bank statement with tax questions...',
            ts: Date.now()
          },
          {
            id: `sim_${Date.now() + 1}`,
            from: 'prime',
            to: 'byte',
            kind: 'handoff',
            text: 'Byte, please parse the September Visa statement and extract all transactions.',
            tags: ['handoff'],
            confidence: 0.95,
            ts: Date.now() + 1000
          },
          {
            id: `sim_${Date.now() + 2}`,
            from: 'byte',
            kind: 'tool',
            text: 'Parsed 34 transactions from Visa statement. Found 8 business expenses, 12 personal items, 14 unclear. Handing off to Tag for categorization.',
            tags: ['parse', 'handoff'],
            confidence: 0.92,
            ts: Date.now() + 2000
          },
          {
            id: `sim_${Date.now() + 3}`,
            from: 'byte',
            to: 'tag',
            kind: 'handoff',
            text: 'Tag, categorize these transactions and flag any tax-deductible items.',
            tags: ['handoff'],
            confidence: 0.90,
            ts: Date.now() + 3000
          },
          {
            id: `sim_${Date.now() + 4}`,
            from: 'tag',
            kind: 'insight',
            text: 'Categorized 32 transactions with 89% confidence. Found 6 potential tax deductions: $450 meals, $120 office supplies, $200 professional development. Sending to Ledger for tax analysis.',
            tags: ['categorize', 'handoff'],
            confidence: 0.89,
            ts: Date.now() + 4000
          },
          {
            id: `sim_${Date.now() + 5}`,
            from: 'tag',
            to: 'ledger',
            kind: 'handoff',
            text: 'Ledger, analyze these transactions for tax optimization opportunities.',
            tags: ['handoff'],
            confidence: 0.88,
            ts: Date.now() + 5000
          },
          {
            id: `sim_${Date.now() + 6}`,
            from: 'ledger',
            kind: 'insight',
            text: 'Tax analysis complete! Potential savings: $285 (50% meals + 100% supplies + 100% professional dev). Recommend keeping detailed receipts for audit trail. Estimated quarterly tax reduction: $71.',
            tags: ['tax', 'insight'],
            confidence: 0.94,
            ts: Date.now() + 6000
          },
          {
            id: `sim_${Date.now() + 7}`,
            from: 'prime',
            kind: 'say',
            text: 'Simulation complete! Workflow processed successfully with 91% confidence. All agents performed optimally.',
            tags: ['summary'],
            confidence: 0.91,
            ts: Date.now() + 7000
          }
        ];

        // Add messages with delays
        simulationMessages.forEach((message, index) => {
          setTimeout(() => {
            set((state) => ({
              messages: [...state.messages, message]
            }));
          }, index * 1000);
        });

        // End simulation after all messages
        setTimeout(() => {
          set({ status: 'idle' });
        }, simulationMessages.length * 1000 + 1000);
      },

      pause: () => {
        set({ status: 'paused' });
      },

      clear: () => {
        set({ messages: [] });
      },

      enqueueTask: (task: Task) => {
        set((state) => ({
          tasks: [...state.tasks, task]
        }));
      },

      assignTask: (id: string, agentId: string) => {
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, assignee: agentId } : task
          )
        }));
      },

      setTaskStatus: (id: string, status: Task['status']) => {
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, status } : task
          )
        }));
      },

      addMemory: (scope: 'session' | 'longterm' | 'vendors', kv: { key: string; value: any }) => {
        set((state) => ({
          memory: {
            ...state.memory,
            [scope]: [...state.memory[scope], kv]
          }
        }));
      },

      loadMemory: async () => {
        try {
          const memory = await fetchMemory();
          set({ memory });
        } catch (error) {
          console.error('Error loading memory:', error);
        }
      },

      saveMemory: async () => {
        try {
          const { memory } = get();
          await apiSaveMemory(memory);
        } catch (error) {
          console.error('Error saving memory:', error);
        }
      },

      loadTasks: async () => {
        try {
          const tasks = await fetchTasks();
          set({ tasks });
        } catch (error) {
          console.error('Error loading tasks:', error);
        }
      },

      saveTask: async (task: Task) => {
        try {
          await apiSaveTask(task);
          set((state) => ({
            tasks: state.tasks.map(t => t.id === task.id ? task : t)
          }));
        } catch (error) {
          console.error('Error saving task:', error);
        }
      },

      setRouteMode: (mode: 'manager' | 'direct') => {
        set({ routeMode: mode });
      },

      setDirectTarget: (target: string) => {
        set({ directTarget: target });
      }
    }),
    {
      name: 'team-room-storage',
      partialize: (state) => ({
        agents: state.agents,
        memory: state.memory,
        tasks: state.tasks
      })
    }
  )
);
