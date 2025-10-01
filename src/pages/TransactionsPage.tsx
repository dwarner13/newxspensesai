import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Download, Upload, Trash2, Edit2, X, Check, ChevronDown, Calendar, Tag, Settings, Eye, Receipt, DollarSign } from 'lucide-react';
import { getTransactions, updateTransaction, deleteTransaction, getCategories, getCategoryRules } from '../lib/supabase';
import { Transaction, TransactionFilter, CategorizationRule } from '../types/database.types';
import { formatDate } from '../utils/formatters';
import DateRangePicker from '../components/filters/DateRangePicker';

import toast from 'react-hot-toast';
import MobileHeader from '../components/layout/MobileHeader';
import { useAtom } from 'jotai';
import { mockModeAtom } from '../utils/mockState';
import { mockDashboardData } from '../utils/mockDashboardData';

import { HighlightAIAssistant } from '../components/transactions/HighlightAIAssistant';
import PageHeader from '../components/layout/PageHeader';
import CreateExpenseModal from '../components/modals/CreateExpenseModal';
import { useCreateExpenseModal } from '../hooks/useCreateExpenseModal';

// Flag to enable mock mode
const useMockData = true;

const TransactionsPage = () => {
  const [mockMode] = useAtom(mockModeAtom);
  const { isOpen, openModal, closeModal, handleSubmit } = useCreateExpenseModal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>(['All', 'Uncategorized']);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editedCategory, setEditedCategory] = useState('');
  const [editedSubcategory, setEditedSubcategory] = useState<string>('');
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [categoryRules, setCategoryRules] = useState<CategorizationRule[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  
  // For bulk operations
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchCategoryRules();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const handleOpenModal = () => {
      openModal();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('openCreateExpenseModal', handleOpenModal);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('openCreateExpenseModal', handleOpenModal);
    };
  }, [filters, mockMode, openModal]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      if (mockMode) {
        // Use mock data
        const mockTransactions = mockDashboardData.transactions;

        // Apply filters if provided
        let filteredTransactions = [...mockTransactions];
        
        if (filters.category && filters.category !== 'All') {
          filteredTransactions = filteredTransactions.filter(t => 
            t.category.toLowerCase() === filters.category?.toLowerCase());
        }
        
        if (filters.startDate) {
          filteredTransactions = filteredTransactions.filter(t => 
            t.date >= filters.startDate);
        }
        
        if (filters.endDate) {
          filteredTransactions = filteredTransactions.filter(t => 
            t.date <= filters.endDate);
        }
        
        if (filters.sourceFile) {
          filteredTransactions = filteredTransactions.filter(t => 
            t.file_name.toLowerCase().includes(filters.sourceFile?.toLowerCase() || ''));
        }

        setTransactions(filteredTransactions);
      } else {
        const data = await getTransactions(filters);
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      if (mockMode) {
        // Use mock categories
        const mockCategories = [
          'All', 
          'Uncategorized', 
          'Food & Drink', 
          'Transportation', 
          'Shopping', 
          'Business Expenses', 
          'Entertainment', 
          'Housing', 
          'Groceries', 
          'Food Delivery', 
          'Income', 
          'Utilities'
        ];
        
        // Mock subcategories
        const mockSubcategories = {
          'Food & Drink': ['Coffee', 'Restaurants', 'Fast Food'],
          'Transportation': ['Fuel', 'Public Transit', 'Rideshare', 'Parking'],
          'Shopping': ['Online', 'Clothing', 'Electronics'],
          'Entertainment': ['Streaming', 'Movies', 'Games'],
          'Housing': ['Mortgage', 'Rent', 'Insurance'],
          'Utilities': ['Phone', 'Internet', 'Electricity', 'Water']
        };
        
        setCategories(mockCategories);
        setSubcategories(mockSubcategories);
      } else {
        const data = await getCategories();
        setCategories(['All', 'Uncategorized', ...data.filter(c => c !== 'Uncategorized')]);
        
        // Group subcategories by category
        const subcategoryGroups: Record<string, string[]> = {};
        transactions.forEach(t => {
          if (t.category && t.subcategory) {
            if (!subcategoryGroups[t.category]) {
              subcategoryGroups[t.category] = [];
            }
            if (!subcategoryGroups[t.category].includes(t.subcategory)) {
              subcategoryGroups[t.category].push(t.subcategory);
            }
          }
        });
        setSubcategories(subcategoryGroups);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCategoryRules = async () => {
    try {
      if (mockMode) {
        // Use mock category rules
        const mockRules = [
          {
            id: 'rule_001',
            keyword: 'starbucks',
            category: 'Food & Drink',
            subcategory: 'Coffee',
            match_count: 5
          },
          {
            id: 'rule_002',
            keyword: 'netflix',
            category: 'Entertainment',
            subcategory: 'Streaming',
            match_count: 3
          },
          {
            id: 'rule_003',
            keyword: 'amazon',
            category: 'Shopping',
            subcategory: 'Online',
            match_count: 8
          },
          {
            id: 'rule_004',
            keyword: 'shell',
            category: 'Transportation',
            subcategory: 'Fuel',
            match_count: 4
          },
          {
            id: 'rule_005',
            keyword: 'telus',
            category: 'Utilities',
            subcategory: 'Phone',
            match_count: 6
          }
        ];
        
        setCategoryRules(mockRules as CategorizationRule[]);
      } else {
        const rules = await getCategoryRules();
        setCategoryRules(rules);
      }
    } catch (error) {
      console.error('Error fetching category rules:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        if (mockMode) {
          // Simulate deletion in mock mode
          setTransactions(transactions.filter(t => t.id !== id));
          toast.success('Transaction deleted');
        } else {
          await deleteTransaction(id);
          setTransactions(transactions.filter(t => t.id !== id));
          toast.success('Transaction deleted');
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Failed to delete transaction');
      }
    }
  };

  const handleEditTransaction = async (id: string) => {
    if (editingTransaction === id) {
      try {
        if (mockMode) {
          // Simulate update in mock mode
          setTransactions(transactions.map(t => 
            t.id === id ? { 
              ...t, 
              category: editedCategory,
              subcategory: editedSubcategory || null
            } : t
          ));
          
          setEditingTransaction(null);
          toast.success('Transaction updated');
        } else {
          await updateTransaction(id, { 
            category: editedCategory,
            subcategory: editedSubcategory || null});
          
          setTransactions(transactions.map(t => 
            t.id === id ? { 
              ...t, 
              category: editedCategory,
              subcategory: editedSubcategory || null
            } : t
          ));
          
          setEditingTransaction(null);
          toast.success('Transaction updated');
          
          // Refresh categories and rules
          fetchCategories();
          fetchCategoryRules();
        }
      } catch (error) {
        console.error('Error updating transaction:', error);
        toast.error('Failed to update transaction');
      }
    } else {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setEditedCategory(transaction.category);
        setEditedSubcategory(transaction.subcategory || '');
        setEditingTransaction(id);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditedCategory('');
    setEditedSubcategory('');
  };

  const handleBulkCategorize = async (category: string, subcategory?: string) => {
    if (selectedTransactions.length === 0) return;
    
    try {
      if (mockMode) {
        // Simulate bulk update in mock mode
        setTransactions(transactions.map(t => 
          selectedTransactions.includes(t.id) 
            ? { ...t, category, subcategory: subcategory || null } 
            : t
        ));
        
        setSelectedTransactions([]);
        setSelectAll(false);
        toast.success(`Updated ${selectedTransactions.length} transactions`);
      } else {
        const updatePromises = selectedTransactions.map(id => 
          updateTransaction(id, { 
            category,
            subcategory: subcategory || null
          })
        );
        
        await Promise.all(updatePromises);
        
        setTransactions(transactions.map(t => 
          selectedTransactions.includes(t.id) 
            ? { ...t, category, subcategory: subcategory || null } 
            : t
        ));
        
        setSelectedTransactions([]);
        setSelectAll(false);
        toast.success(`Updated ${selectedTransactions.length} transactions`);
        
        // Refresh categories and rules
        fetchCategories();
        fetchCategoryRules();
      }
    } catch (error) {
      console.error('Error updating transactions:', error);
      toast.error('Failed to update transactions');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTransaction = (id: string) => {
    if (selectedTransactions.includes(id)) {
      setSelectedTransactions(selectedTransactions.filter(tid => tid !== id));
    } else {
      setSelectedTransactions([...selectedTransactions, id]);
    }
  };

  const handleViewReceipt = (receiptUrl: string) => {
    setViewingReceipt(receiptUrl);
  };

  const formatCurrency = (amount: number, type: 'Credit' | 'Debit') => {
    const value = type === 'Credit' ? amount : -Math.abs(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const isAutoCategorized = (transaction: Transaction) => {
    return categoryRules.some(rule => 
      transaction.description.toLowerCase().includes(rule.keyword.toLowerCase()) &&
      transaction.category === rule.category &&
      transaction.subcategory === rule.subcategory
    );
  };

  const exportTransactions = () => {
    const data = transactions.map(t => ({
      Date: formatDate(t.date),
      Description: t.description,
      Amount: t.amount,
      Type: t.type,
      Category: t.category,
      Subcategory: t.subcategory || '',
      'Source File': t.file_name,
      'Auto Categorized': isAutoCategorized(t) ? 'Yes' : 'No',
      'Has Receipt': t.receipt_url ? 'Yes' : 'No'
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-6">
      <PageHeader />
      {isMobile && (
        <MobileHeader title="Transactions" showSearch={true} />
      )}
      
      <div className="max-w-7xl mx-auto space-y-8">
        {!isMobile && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div
            className="flex flex-wrap justify-center sm:justify-end gap-3"
          >
            <button 
              className="btn-outline flex items-center"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} className="mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <Link to="/settings/categories" className="btn-outline flex items-center">
              <Settings size={16} className="mr-2" />
              Category Rules
            </Link>
            
            <button 
              className="btn-outline flex items-center"
              onClick={exportTransactions}
              disabled={transactions.length === 0}
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </button>
            
            <Link to="/upload" className="btn-primary flex items-center mt-3 sm:mt-0 w-full sm:w-auto">
              <Upload size={16} className="mr-2" />
              Upload New
            </Link>
            
            <button 
              onClick={openModal}
              className="btn-primary flex items-center bg-orange-500 hover:bg-orange-600"
            >
              <DollarSign size={16} className="mr-2" />
              Add New Expense
            </button>
            

          </div>
        </div>
      )}
      
      
        {showFilters && (
          <div
            className="card overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Filter Transactions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <DateRangePicker
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onChange={(startDate, endDate) => {
                      setFilters({ ...filters, startDate, endDate});
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="input"
                    value={filters.category || 'All'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value !== 'All' ? e.target.value : undefined })}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source File
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter filename"
                    value={filters.sourceFile || ''}
                    onChange={(e) => setFilters({ ...filters, sourceFile: e.target.value || undefined })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  className="btn-outline mr-3"
                  onClick={() => setFilters({})}
                >
                  Clear Filters
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setShowFilters(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      
      
      {selectedTransactions.length > 0 && (
        <div
          className="flex items-center justify-between bg-primary-50 p-3 rounded-lg"
        >
          <span className="text-primary-800 font-medium">
            {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <div className="relative inline-block group">
              <button className="btn-outline flex items-center">
                Categorize <ChevronDown size={16} className="ml-2" />
              </button>
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {categories.filter(c => c !== 'All').map(category => (
                    <div key={category} className="relative group/sub">
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleBulkCategorize(category)}
                      >
                        {category}
                      </button>
                      {subcategories[category] && subcategories[category].length > 0 && (
                        <div className="absolute left-full top-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden group-hover/sub:block">
                          {subcategories[category].map(sub => (
                            <button
                              key={sub}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => handleBulkCategorize(category, sub)}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button 
              className="btn-danger flex items-center"
              onClick={() => setSelectedTransactions([])}
            >
              <X size={16} className="mr-2" />
              Clear Selection
            </button>
          </div>
        </div>
      )}
      
      <div className="card">
        {loading ? (
          <div className="p-4">
            {/* Mobile Skeleton Loader */}
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center p-4 border-b border-gray-100">
                  <div className="w-4 h-4 bg-gray-200 rounded mr-3"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            {isMobile ? (
              // Mobile Transaction List
              <div className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.hash_id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                      />
                      <span className="text-sm text-gray-500">{formatDate(transaction.date)}</span>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">
                            {transaction.description}
                          </p>
                          {transaction.receipt_url && (
                            <Receipt size={14} className="text-primary-500" title="Has receipt" />
                          )}
                        </div>
                        
                        {editingTransaction === transaction.id ? (
                          <div className="flex flex-col space-y-2 mt-2">
                            <div className="flex items-center space-x-2">
                              <select
                                className="input py-1 px-2 text-sm"
                                value={editedCategory}
                                onChange={(e) => setEditedCategory(e.target.value)}
                              >
                                {categories.filter(c => c !== 'All').map(category => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleEditTransaction(transaction.id)}
                                className="p-1 text-success-600 hover:text-success-800"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-error-600 hover:text-error-800"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <input
                              type="text"
                              className="input py-1 px-2 text-sm"
                              placeholder="Subcategory (optional)"
                              value={editedSubcategory}
                              onChange={(e) => setEditedSubcategory(e.target.value)}
                              list={`subcategories-${transaction.id}`}
                            />
                            <datalist id={`subcategories-${transaction.id}`}>
                              {subcategories[editedCategory]?.map(sub => (
                                <option key={sub} value={sub} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {transaction.category}
                            </span>
                            {isAutoCategorized(transaction) && (
                              <Tag size={12} className="text-primary-500" title="Auto-categorized" />
                            )}
                            {transaction.subcategory && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                                {transaction.subcategory}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end">
                        <span className={`font-semibold ${
                          transaction.type === 'Credit' 
                            ? 'text-success-700' 
                            : 'text-error-700'
                        }`}>
                          {formatCurrency(transaction.amount, transaction.type)}
                        </span>
                        
                        <div className="flex mt-2 space-x-2">
                          {transaction.receipt_url && (
                            <button
                              onClick={() => handleViewReceipt(transaction.receipt_url!)}
                              className="text-primary-600 hover:text-primary-900 p-1"
                              title="View Receipt"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditTransaction(transaction.id)}
                            className="text-primary-600 hover:text-primary-900 p-1"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-error-600 hover:text-error-900 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Desktop Table View
              <motion.table 
                variants={container}
                initial="hidden"
                animate="show"
                className="min-w-full divide-y divide-gray-200"
              >
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <motion.tr 
                      key={transaction.hash_id}
                      variants={item}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {transaction.description}
                          </div>
                          {transaction.receipt_url && (
                            <Receipt size={14} className="text-primary-500" title="Has receipt" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex text-sm font-semibold ${
                          transaction.type === 'Credit' 
                            ? 'text-success-700' 
                            : 'text-error-700'
                        }`}>
                          {formatCurrency(transaction.amount, transaction.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTransaction === transaction.id ? (
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                              <select
                                className="input py-1 px-2 text-sm"
                                value={editedCategory}
                                onChange={(e) => setEditedCategory(e.target.value)}
                              >
                                {categories.filter(c => c !== 'All').map(category => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleEditTransaction(transaction.id)}
                                className="p-1 text-success-600 hover:text-success-800"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-error-600 hover:text-error-800"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <input
                              type="text"
                              className="input py-1 px-2 text-sm"
                              placeholder="Subcategory (optional)"
                              value={editedSubcategory}
                              onChange={(e) => setEditedSubcategory(e.target.value)}
                              list={`subcategories-${transaction.id}`}
                            />
                            <datalist id={`subcategories-${transaction.id}`}>
                              {subcategories[editedCategory]?.map(sub => (
                                <option key={sub} value={sub} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {transaction.category}
                              </span>
                              {isAutoCategorized(transaction) && (
                                <Tag size={14} className="text-primary-500" title="Auto-categorized" />
                              )}
                            </div>
                            {transaction.subcategory && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                                {transaction.subcategory}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="truncate max-w-[100px] inline-block" title={transaction.file_name}>
                          {transaction.file_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {transaction.receipt_url && (
                            <button
                              onClick={() => handleViewReceipt(transaction.receipt_url!)}
                              className="text-primary-600 hover:text-primary-900"
                              title="View Receipt"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditTransaction(transaction.id)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-error-600 hover:text-error-900"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </motion.table>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-6">
              {Object.keys(filters).length > 0 
                ? 'Try changing your filters or upload new statements.'
                : 'Upload your first bank statement to see transactions here.'}
            </p>
            <Link to="/upload" className="btn-primary inline-flex items-center">
              <Upload size={16} className="mr-2" />
              Upload Statement
            </Link>
          </div>
        )}
        


        {/* HighlightAIAssistant Component */}
        <HighlightAIAssistant transactions={transactions} />
      </div>

      {/* Receipt Viewer Modal */}
      
        {viewingReceipt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingReceipt(null)}
          >
            <div
              className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold flex items-center">
                  <Receipt size={20} className="mr-2 text-primary-600" />
                  Receipt View
                </h3>
                <div className="flex items-center space-x-2">
                  <a
                    href={viewingReceipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-sm"
                  >
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => setViewingReceipt(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 max-h-[80vh] overflow-auto">
                {viewingReceipt.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={viewingReceipt}
                    className="w-full h-[70vh] border rounded"
                    title="Receipt PDF"
                  />
                ) : (
                  <img
                    src={viewingReceipt}
                    alt="Receipt"
                    className="max-w-full h-auto  rounded"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      

      {/* Create Expense Modal */}
      <CreateExpenseModal
        isOpen={isOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default TransactionsPage;
