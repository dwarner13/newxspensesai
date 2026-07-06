# XspensesAI Mock Data System

## Overview

This comprehensive mock data system provides realistic test data for all XspensesAI functionality without requiring real APIs or database connections. It enables full testing of the application's features, UI components, and user interactions.

## 📁 File Structure

```
src/utils/mockData.ts          # Main mock data exports
src/hooks/useMockData.ts       # Hook for accessing mock data
README-MOCK-DATA.md           # This documentation
```

## 🚀 Quick Start

### 1. Import Mock Data

```typescript
import { useMockData } from '../hooks/useMockData';

// In your component
const { user, transactions, goals, insights, dashboard } = useMockData(true);
```

### 2. Use Mock API Functions

```typescript
const { mockAPI } = useMockData();

// Get user data
const userData = await mockAPI.getUser();

// Get filtered transactions
const filteredTransactions = await mockAPI.getTransactions({
  category: 'Groceries',
  dateRange: { start: '2025-07-01', end: '2025-07-31' }
});

// Upload a receipt
const newReceipt = await mockAPI.uploadReceipt(file);
```

## 📊 Data Structure

### 1. User Data (`mockUser`)

```typescript
{
  id: 'user-123',
  name: 'Darrell Warner',
  email: 'darrell.warner13@gmail.com',
  plan: 'Personal Plan',
  joinDate: '2024-01-15',
  xspensesScore: 541,
  scoreRating: 'Fair',
  avatar: 'https://...',
  preferences: {
    currency: 'USD',
    timezone: 'America/New_York',
    notifications: { email: true, push: true, sms: false }
  }
}
```

### 2. Transactions (`mockTransactions`)

15 realistic transactions with:
- **Categories**: Groceries, Transportation, Entertainment, Shopping, Dining, Healthcare, etc.
- **Merchants**: Whole Foods, Uber, Netflix, Starbucks, REI, Amazon, etc.
- **Features**: Amount, date, category, merchant, source, needsReview flag, tags
- **Realistic amounts**: Income ($4,250), expenses ($5-$156), proper categorization

### 3. Receipts (`mockReceipts`)

Detailed receipt data with:
- **Line items**: Individual products with prices and quantities
- **Tax and tip calculations**
- **Processing status**: 'processed', 'needs_review'
- **Image URLs**: Realistic receipt images

### 4. Financial Goals (`mockGoals`)

4 active financial goals:
- **Emergency Fund**: $10,000 target (65% complete)
- **Vacation Fund**: $3,000 target (40% complete)
- **New Laptop**: $1,500 target (53% complete)
- **Home Down Payment**: $50,000 target (30% complete)

### 5. AI Insights (`mockInsights`)

4 actionable insights:
- **Spending patterns**: Coffee habit analysis
- **Budget alerts**: Entertainment budget exceeded
- **Savings opportunities**: Generic brand switching
- **Income optimization**: Side hustle suggestions

### 6. Dashboard Data (`mockDashboardData`)

Comprehensive dashboard metrics:
- **Summary**: Income, expenses, net savings, savings rate
- **Spending by category**: 9 categories with percentages
- **Recent transactions**: Latest 5 transactions
- **Upcoming bills**: 4 bills with due dates
- **Goals and insights**: Current progress

### 7. Gamification (`mockGamificationData`)

User engagement features:
- **Level system**: Level 8 with XP tracking
- **Badges**: 5 badges (3 earned, 2 in progress)
- **Streaks**: Login, budget tracking, goal progress
- **Achievements**: 2 achievements (1 earned, 1 in progress)

## 🛠️ Available Mock API Functions

### User Management
```typescript
mockAPI.getUser()                    // Get user profile
mockAPI.updateUser(updates)          // Update user data
```

### Transactions
```typescript
mockAPI.getTransactions(filters)     // Get transactions with optional filters
mockAPI.updateTransaction(id, updates) // Update specific transaction
```

### Receipts
```typescript
mockAPI.getReceipts()                // Get all receipts
mockAPI.uploadReceipt(file)          // Upload new receipt
```

### Goals
```typescript
mockAPI.getGoals()                   // Get all goals
mockAPI.createGoal(goalData)         // Create new goal
mockAPI.updateGoal(id, updates)      // Update goal progress
```

### Insights
```typescript
mockAPI.getInsights()                // Get spending insights
mockAPI.getAIInsights()              // Get AI-generated insights
```

### Dashboard & Reports
```typescript
mockAPI.getDashboardData()           // Get dashboard summary
mockAPI.getReportsData()             // Get historical reports
```

### Categories & Merchants
```typescript
mockAPI.getCategories()              // Get expense categories
mockAPI.getMerchants()               // Get merchant list
```

### Accounts
```typescript
mockAPI.getAccounts()                // Get linked accounts
```

### Gamification
```typescript
mockAPI.getGamificationData()        // Get user progress data
```

## 🎯 Use Cases

### 1. Dashboard Development
```typescript
const { dashboard, user, gamification } = useMockData(true);

// Display user welcome message
<h1>Welcome back, {user.name}!</h1>

// Show financial summary
<p>Net Savings: {formatCurrency(dashboard.summary.netSavings)}</p>

// Display gamification progress
<p>Level {gamification.level} • {gamification.xp} XP</p>
```

### 2. Transaction Management
```typescript
const { transactions, mockAPI } = useMockData();

// Filter transactions by category
const groceryTransactions = await mockAPI.getTransactions({
  category: 'Groceries'
});

// Update transaction category
await mockAPI.updateTransaction('txn-001', {
  category: 'Dining',
  needsReview: false
});
```

### 3. Goal Tracking
```typescript
const { goals, mockAPI } = useMockData();

// Display goal progress
goals.map(goal => (
  <div key={goal.id}>
    <h3>{goal.name}</h3>
    <p>{goal.progress}% complete</p>
    <p>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</p>
  </div>
))

// Create new goal
const newGoal = await mockAPI.createGoal({
  name: 'New Car',
  targetAmount: 25000,
  category: 'Transportation',
  deadline: '2026-12-31'
});
```

### 4. AI Insights Integration
```typescript
const { insights, aiInsights } = useMockData();

// Display actionable insights
insights.filter(insight => insight.actionable).map(insight => (
  <div key={insight.id} className={`priority-${insight.priority}`}>
    <h4>{insight.title}</h4>
    <p>{insight.description}</p>
    <p>💡 {insight.action}</p>
  </div>
))
```

### 5. Receipt Processing
```typescript
const { receipts, mockAPI } = useMockData();

// Upload new receipt
const handleFileUpload = async (file) => {
  const newReceipt = await mockAPI.uploadReceipt(file);
  console.log('Receipt uploaded:', newReceipt);
};

// Display receipt details
receipts.map(receipt => (
  <div key={receipt.id}>
    <img src={receipt.imageUrl} alt="Receipt" />
    <h3>{receipt.merchant}</h3>
    <p>{formatCurrency(receipt.amount)}</p>
    <p>Status: {receipt.status}</p>
  </div>
))
```

## 🎨 Styling Integration

The mock data system works seamlessly with the existing CSS styling:

```typescript
// Use priority-based styling for insights
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};
```

## 🔄 Data Updates

### Real-time Updates
The mock data system supports simulated real-time updates:

```typescript
const { setDashboardData, mockAPI } = useMockData();

// Simulate transaction update
const updateTransaction = async (id, updates) => {
  const updated = await mockAPI.updateTransaction(id, updates);
  
  // Update local state
  setDashboardData(prev => ({
    ...prev,
    transactions: prev.transactions.map(t => 
      t.id === id ? { ...t, ...updates } : t
    )
  }));
};
```

### Batch Operations
```typescript
// Bulk categorize transactions
const bulkCategorize = async (transactionIds, category) => {
  const updates = transactionIds.map(id => 
    mockAPI.updateTransaction(id, { category, needsReview: false })
  );
  await Promise.all(updates);
};
```

## 🧪 Testing Scenarios

### 1. Edge Cases
- **Empty data**: Test with no transactions, goals, or insights
- **Large datasets**: Test with hundreds of transactions
- **Invalid data**: Test with malformed transaction data

### 2. User Interactions
- **Transaction categorization**: Test manual and AI categorization
- **Goal creation**: Test goal setting and progress tracking
- **Receipt upload**: Test file upload and processing
- **Insight actions**: Test actionable insight responses

### 3. Performance Testing
- **Large transaction lists**: Test rendering performance
- **Real-time updates**: Test state management efficiency
- **Filter operations**: Test search and filter performance

## 🔧 Customization

### Adding New Data Types
```typescript
// Add new mock data type
export const mockNewData = [
  {
    id: 'new-001',
    name: 'Sample Item',
    value: 100,
    // ... other properties
  }
];

// Export in main mockData object
export const mockData = {
  // ... existing exports
  newData: mockNewData
};
```

### Extending API Functions
```typescript
// Add new API function
const mockAPI = {
  // ... existing functions
  
  getNewData: (filters) => {
    let filtered = [...mockNewData];
    // Apply filters
    return Promise.resolve(filtered);
  }
};
```

## 📈 Data Analytics

The mock data includes realistic patterns for testing analytics features:

- **Seasonal spending patterns**: Higher grocery spending, entertainment variations
- **Category correlations**: Transportation and gas, dining and coffee
- **Income consistency**: Regular salary deposits
- **Goal progress**: Realistic savings rates and progress percentages

## 🎯 Best Practices

1. **Use TypeScript**: All mock data is fully typed for better development experience
2. **Consistent IDs**: Use predictable ID patterns for easy debugging
3. **Realistic Data**: Ensure amounts, dates, and categories make sense together
4. **Edge Cases**: Include data that tests error handling and edge cases
5. **Performance**: Keep data size reasonable for testing performance

## 🚀 Next Steps

1. **Integration Testing**: Test mock data with real API endpoints
2. **Data Validation**: Add validation for mock data consistency
3. **Performance Monitoring**: Track mock data performance impact
4. **User Feedback**: Collect feedback on mock data realism
5. **Automation**: Create scripts to generate additional mock data

---

This mock data system provides a solid foundation for testing and developing XspensesAI features without external dependencies. The comprehensive data structure and API functions enable full application testing and development. 