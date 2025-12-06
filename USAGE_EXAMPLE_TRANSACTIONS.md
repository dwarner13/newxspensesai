# Usage Example: Adding "Ask Tag" Button to Transactions Page

This example shows how to add a contextual chat button to the Transactions page.

## Implementation

```typescript
// src/pages/dashboard/DashboardTransactionsPage.tsx

import { useUnifiedChatLauncher } from '@/hooks/useUnifiedChatLauncher';

export default function DashboardTransactionsPage() {
  const { openChat } = useUnifiedChatLauncher();
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  
  const handleAskTag = () => {
    openChat({
      initialEmployeeSlug: 'tag-ai',
      context: {
        page: 'transactions',
        filters: {
          month: '2025-01',
          // Add any other filters
        },
        selectionIds: selectedTransactions, // Selected transaction IDs
      },
      initialQuestion: selectedTransactions.length > 0
        ? `Help me categorize these ${selectedTransactions.length} transactions`
        : 'Help me categorize my transactions',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Transactions</h1>
        <button
          onClick={handleAskTag}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <span>🏷️</span>
          <span>Ask Tag</span>
        </button>
      </div>
      
      {/* Transaction list */}
    </div>
  );
}
```

## Result

When user clicks "Ask Tag":
1. Unified chat opens
2. Tag is set as the initial employee
3. Context includes current page and selected transactions
4. Initial question is auto-sent
5. Tag responds with transaction-aware help

## Similar Examples

### Goals Page → Ask Goalie
```typescript
openChat({
  initialEmployeeSlug: 'goalie-goals',
  context: { page: 'goals', data: { goalId: 'goal-123' } },
  initialQuestion: 'Help me set up a savings goal'
});
```

### Debt Page → Ask Liberty
```typescript
openChat({
  initialEmployeeSlug: 'liberty-freedom',
  context: { page: 'debt', data: { loanId: 'loan-123' } },
  initialQuestion: 'Help me create a debt payoff plan'
});
```

### Analytics Page → Ask Crystal
```typescript
openChat({
  initialEmployeeSlug: 'crystal-analytics',
  context: { page: 'analytics', filters: { period: 'last-30-days' } },
  initialQuestion: 'Analyze my spending trends'
});
```













