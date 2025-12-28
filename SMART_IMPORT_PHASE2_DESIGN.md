> **NOTE: This document is now archived. For the latest system overview, see [XSPENSESAI_SYSTEM.md](./XSPENSESAI_SYSTEM.md).**

# Smart Import Phase 2 - Design Proposal

## Response Shape

### Commit Response
```typescript
interface CommitImportResponse {
  success: boolean;
  ok: boolean; // Backward compatibility
  importId: string;
  committed: number; // Backward compatibility
  insertedCount: number;
  documentId: string | null;
  message: string;
  
  // NEW: Summary data
  summary?: {
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    uncategorizedCount: number;
    topCategories: Array<{
      category: string;
      total: number;
      count: number;
    }>;
  };
  
  // NEW: Fixable issues
  issues?: {
    unassignedCategories: Array<{
      transactionId: string;
      merchant: string;
      amount: number;
      date: string;
    }>;
    possibleDuplicates: Array<{
      transactionIds: string[];
      date: string;
      amount: number;
      description: string;
      similarity: number;
    }>;
  };
}
```

## Implementation Plan

1. **Backend (`commit-import.ts`)**:
   - Add validation: check status='parsed', staged transactions exist, not already committed
   - After commit, query committed transactions to compute summary
   - Detect unassigned categories (category='Uncategorized' or null)
   - Detect possible duplicates (same date + same amount + similar description)
   - Return summary and issues in response

2. **Frontend (`SmartImportAI.tsx`)**:
   - Add loading state during commit
   - Display summary panel after successful commit
   - Display fixable issues section
   - Handle errors with user-friendly messages
   - Refresh transactions list after commit

3. **Types (`src/types/smartImport.ts`)**:
   - Add `CommitImportResponse` interface
   - Add `ImportSummary` interface
   - Add `FixableIssues` interface

