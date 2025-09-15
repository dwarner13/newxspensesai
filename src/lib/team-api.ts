// Team API functions for communication with AI agents
// This file handles all API calls for the Team Room feature

export type MemoryMap = {
  session: Array<{ key: string; value: any }>;
  longterm: Array<{ key: string; value: any }>;
  vendors: Array<{ key: string; value: any }>;
};

export type Task = {
  id: string;
  title: string;
  assignee: string;
  status: 'queued' | 'in-progress' | 'done';
  due?: string;
};

// Check if we're in a production environment with Netlify functions
const isProduction = import.meta.env.PROD;
const API_BASE = isProduction ? '/api' : 'http://localhost:3001/api';

// Mock responses for development/testing
const mockResponses = {
  managerRoute: {
    'parse new statement': {
      route_to: 'byte',
      manager_reply: 'I\'ll route this to Byte for OCR processing. Byte, please parse the uploaded statement and extract all transactions.',
      handoff_instructions: 'Parse the uploaded bank statement and return normalized JSON with all transactions, including dates, descriptions, amounts, and suggested categories.'
    },
    'auto-categorize': {
      route_to: 'tag',
      manager_reply: 'Tag will handle the categorization. I\'m sending this to our AI categorization specialist.',
      handoff_instructions: 'Categorize all uncategorized transactions using our existing rules and AI patterns. Flag any low-confidence items for review.'
    },
    'forecast next month': {
      route_to: 'crystal',
      manager_reply: 'Crystal will generate the forecast. I\'m routing this to our spending predictions AI.',
      handoff_instructions: 'Generate a comprehensive forecast for next month based on current spending patterns and historical data.'
    },
    'find deductions': {
      route_to: 'ledger',
      manager_reply: 'Ledger will identify tax deductions. I\'m sending this to our tax assistant.',
      handoff_instructions: 'Analyze all transactions for potential tax deductions and provide recommendations for maximizing tax savings.'
    },
    'plan debt snowball': {
      route_to: 'blitz',
      manager_reply: 'Blitz will create a debt payoff plan. I\'m routing this to our debt payoff planner.',
      handoff_instructions: 'Create an optimized debt snowball plan based on current debts, interest rates, and available funds.'
    },
    'bill audit': {
      route_to: 'chime',
      manager_reply: 'Chime will audit your bills. I\'m sending this to our bill reminder system.',
      handoff_instructions: 'Audit all recurring bills and subscriptions, identify potential savings, and suggest optimizations.'
    },
    'generate weekly podcast': {
      route_to: 'roundtable',
      manager_reply: 'The Roundtable will create your weekly podcast. I\'m routing this to our personal podcast AI.',
      handoff_instructions: 'Generate a weekly financial podcast episode based on recent transactions, goals, and market insights.'
    },
    'bi snapshot': {
      route_to: 'intelia',
      manager_reply: 'Intelia will create a business intelligence snapshot. I\'m sending this to our BI specialist.',
      handoff_instructions: 'Generate a comprehensive business intelligence report with key metrics, trends, and actionable insights.'
    }
  },
  
  agentRun: {
    byte: {
      'parse the uploaded statement': {
        text: 'Successfully parsed 27 transactions from the bank statement. Found 8 business expenses, 12 personal items, and 7 unclear transactions. All data normalized to JSON format with 96% confidence.',
        confidence: 0.96
      }
    },
    tag: {
      'categorize these transactions': {
        text: 'Categorized 24 transactions with high confidence (89%), 3 transactions need manual review. Identified 6 potential tax deductions: $450 meals, $120 office supplies, $200 professional development.',
        confidence: 0.89
      }
    },
    crystal: {
      'generate a comprehensive forecast': {
        text: 'Forecast complete! Next month projected: +12% utilities, +8% groceries, -5% entertainment. Total spending increase: 3.2%. Recommend setting up automation rules for utilities.',
        confidence: 0.87
      }
    },
    ledger: {
      'analyze all transactions for potential tax deductions': {
        text: 'Tax analysis complete! Potential savings: $285 (50% meals + 100% supplies + 100% professional dev). Recommend keeping detailed receipts for audit trail. Estimated quarterly tax reduction: $71.',
        confidence: 0.94
      }
    },
    blitz: {
      'create an optimized debt snowball plan': {
        text: 'Debt snowball plan created! Pay off $2,400 credit card first (18% APR), then $8,500 car loan (6% APR). Total time to debt freedom: 18 months. Monthly payment: $450.',
        confidence: 0.91
      }
    },
    chime: {
      'audit all recurring bills and subscriptions': {
        text: 'Bill audit complete! Found 3 unused subscriptions ($47/month savings), 2 bills with better rates available ($23/month savings). Total potential savings: $70/month.',
        confidence: 0.88
      }
    },
    roundtable: {
      'generate a weekly financial podcast episode': {
        text: 'Weekly podcast episode generated! "Financial Freedom Friday" - 15 minutes covering your debt progress, investment opportunities, and mindful spending tips. Ready for upload.',
        confidence: 0.85
      }
    },
    intelia: {
      'generate a comprehensive business intelligence report': {
        text: 'BI snapshot complete! Key insights: Revenue up 12% MoM, expenses down 8%, profit margin improved to 23%. Top spending category: Marketing (32%). Recommendations: Increase automation, optimize ad spend.',
        confidence: 0.92
      }
    }
  }
};

// Helper function to find best matching response
function findBestMatch(input: string, responses: Record<string, any>): any {
  const lowerInput = input.toLowerCase();
  
  // Try exact matches first
  for (const [key, value] of Object.entries(responses)) {
    if (lowerInput.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Try partial matches
  for (const [key, value] of Object.entries(responses)) {
    const keyWords = key.toLowerCase().split(' ');
    if (keyWords.some(word => lowerInput.includes(word))) {
      return value;
    }
  }
  
  // Default response
  return {
    route_to: 'prime',
    manager_reply: 'I understand your request. Let me coordinate with the appropriate team member to help you.',
    handoff_instructions: input
  };
}

// Manager routing function
export async function postManagerRoute(input: string): Promise<{
  route_to: string;
  manager_reply: string;
  handoff_instructions?: string;
}> {
  try {
    if (isProduction) {
      // In production, call the actual API
      const response = await fetch(`${API_BASE}/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: 'team_room_manager'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to route message');
      }
      
      return await response.json();
    } else {
      // In development, use mock responses
      const response = findBestMatch(input, mockResponses.managerRoute);
      return response;
    }
  } catch (error) {
    console.error('Error in postManagerRoute:', error);
    // Fallback to mock response
    return findBestMatch(input, mockResponses.managerRoute);
  }
}

// Agent execution function
export async function postAgentRun(agentId: string, input: string): Promise<{
  json?: any;
  text: string;
  confidence?: number;
}> {
  try {
    if (isProduction) {
      // In production, call the actual API
      const response = await fetch(`${API_BASE}/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: 'team_room_agent',
          agent_id: agentId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute agent');
      }
      
      return await response.json();
    } else {
      // In development, use mock responses
      const agentResponses = mockResponses.agentRun[agentId as keyof typeof mockResponses.agentRun];
      if (agentResponses) {
        const response = findBestMatch(input, agentResponses);
        return response;
      } else {
        return {
          text: `${agentId} received your message: "${input}". Processing...`,
          confidence: 0.8
        };
      }
    }
  } catch (error) {
    console.error('Error in postAgentRun:', error);
    // Fallback to mock response
    return {
      text: `${agentId} received your message: "${input}". Processing...`,
      confidence: 0.8
    };
  }
}

// Memory management functions
export async function fetchMemory(): Promise<MemoryMap> {
  try {
    if (isProduction) {
      const response = await fetch(`${API_BASE}/team-memory`);
      if (!response.ok) {
        throw new Error('Failed to fetch memory');
      }
      return await response.json();
    } else {
      // Mock memory data
      return {
        session: [
          { key: 'current_period', value: { month: '2025-09', uploads: 3 } },
          { key: 'last_analysis', value: { date: '2025-09-15', confidence: 0.92 } }
        ],
        longterm: [
          { key: 'mileage_rate', value: { cad_per_km: 0.68 } },
          { key: 'business_goals', value: { target_revenue: 50000, target_savings: 10000 } }
        ],
        vendors: [
          { key: 'Tim Hortons', value: { default_category: 'Meals', frequency: 'daily' } },
          { key: 'Starbucks', value: { default_category: 'Meals', frequency: 'weekly' } },
          { key: 'Amazon', value: { default_category: 'Supplies', frequency: 'monthly' } }
        ]
      };
    }
  } catch (error) {
    console.error('Error fetching memory:', error);
    return { session: [], longterm: [], vendors: [] };
  }
}

export async function saveMemory(payload: MemoryMap): Promise<void> {
  try {
    if (isProduction) {
      const response = await fetch(`${API_BASE}/team-memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save memory');
      }
    } else {
      // In development, just log the save
      console.log('Memory saved:', payload);
    }
  } catch (error) {
    console.error('Error saving memory:', error);
    throw error;
  }
}

// Task management functions
export async function fetchTasks(): Promise<Task[]> {
  try {
    if (isProduction) {
      const response = await fetch(`${API_BASE}/team-tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return await response.json();
    } else {
      // Mock task data
      return [
        { id: 't1', title: 'Parse September Visa PDF', assignee: 'byte', status: 'in-progress' },
        { id: 't2', title: 'Reclassify Starbucks as Meals', assignee: 'tag', status: 'queued' },
        { id: 't3', title: 'Estimate Q4 taxes', assignee: 'ledger', status: 'queued' },
        { id: 't4', title: 'Generate monthly forecast', assignee: 'crystal', status: 'done' },
        { id: 't5', title: 'Audit recurring bills', assignee: 'chime', status: 'queued' }
      ];
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export async function saveTask(task: Task): Promise<void> {
  try {
    if (isProduction) {
      const response = await fetch(`${API_BASE}/team-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save task');
      }
    } else {
      // In development, just log the save
      console.log('Task saved:', task);
    }
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
}

