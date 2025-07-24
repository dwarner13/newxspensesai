import React, { useState } from 'react';
import TransactionList from './TransactionList';

const TransactionListExample = () => {
    const [transactions, setTransactions] = useState([
        {
            id: 1,
            description: 'STARBUCKS COFFEE',
            amount: -5.50,
            date: '2024-01-15',
            category: 'Food & Dining',
            confidence: 0.99
        },
        {
            id: 2,
            description: 'UBER RIDE',
            amount: -25.00,
            date: '2024-01-15',
            category: 'Transportation',
            confidence: 0.95
        }
    ]);

    const handleCategoryCorrection = (transactionId, newCategory) => {
        setTransactions(prev => prev.map(t => 
            t.id === transactionId
                ? { ...t, category: newCategory, corrected: true }
                : t
        ));
        
        // Here you would typically also call your AI service
        console.log(`Category corrected: ${transactionId} → ${newCategory}`);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 TransactionList Usage Example
            </h3>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                    <strong>How to use:</strong> Import TransactionList and pass transactions array + correction handler
                </p>
            </div>

            <TransactionList 
                transactions={transactions}
                onCategoryCorrection={handleCategoryCorrection}
            />

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">📝 Code Example:</h4>
                <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
{`import TransactionList from './TransactionList';

const MyComponent = () => {
    const [transactions, setTransactions] = useState([]);
    
    const handleCategoryCorrection = (id, newCategory) => {
        // Update local state
        setTransactions(prev => prev.map(t => 
            t.id === id ? { ...t, category: newCategory } : t
        ));
        
        // Call AI service to learn
        AIService.correctCategory(id, { category: newCategory });
    };
    
    return (
        <TransactionList 
            transactions={transactions}
            onCategoryCorrection={handleCategoryCorrection}
        />
    );
};`}
                </pre>
            </div>
        </div>
    );
};

export default TransactionListExample; 