/**
 * Transaction Management API Routes
 * 
 * Handles transaction CRUD operations and categorization
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { MultiLayerCategorizationEngine } = require('../../src/lib/multiLayerCategorizationEngine');
const { CategoryLearningSystem } = require('../../src/lib/categoryLearningSystem');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize categorization components
const categorizationEngine = new MultiLayerCategorizationEngine();
const learningSystem = new CategoryLearningSystem();

/**
 * GET /api/transactions
 * Get user's transactions with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { 
      account_id, 
      category_id, 
      start_date, 
      end_date, 
      type, 
      limit = 50, 
      offset = 0,
      search
    } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts (
          id,
          name,
          type,
          institution
        ),
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (account_id) {
      query = query.eq('account_id', account_id);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      query = query.or(`description.ilike.%${search}%,merchant.ilike.%${search}%`);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json({
      transactions,
      count: transactions.length,
      has_more: transactions.length === limit
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction
 */
router.post('/', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const {
      account_id,
      amount,
      description,
      merchant,
      date,
      type,
      category_id,
      reference,
      metadata
    } = req.body;

    // Validate required fields
    if (!account_id || !amount || !description || !date || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: account_id, amount, description, date, type' 
      });
    }

    // Auto-categorize if no category provided
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      const autoCategory = await categorizationEngine.categorizeTransaction({
        description,
        merchant,
        amount,
        type
      }, user_id);
      
      if (autoCategory) {
        finalCategoryId = autoCategory.id;
      }
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id,
        account_id,
        category_id: finalCategoryId,
        amount,
        description,
        merchant,
        date,
        type,
        reference,
        metadata: metadata || {}
      })
      .select(`
        *,
        accounts (
          id,
          name,
          type,
          institution
        ),
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create transaction' });
    }

    res.status(201).json(transaction);

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * PUT /api/transactions/:id
 * Update a transaction
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;
    const updateData = req.body;

    // Remove user_id from update data if present
    delete updateData.user_id;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select(`
        *,
        accounts (
          id,
          name,
          type,
          institution
        ),
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update transaction' });
    }

    res.json(transaction);

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }

    res.json({ success: true, message: 'Transaction deleted successfully' });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

/**
 * POST /api/transactions/bulk
 * Create multiple transactions
 */
router.post('/bulk', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Transactions array is required' });
    }

    // Process each transaction
    const processedTransactions = [];
    for (const transaction of transactions) {
      const {
        account_id,
        amount,
        description,
        merchant,
        date,
        type,
        category_id,
        reference,
        metadata
      } = transaction;

      // Auto-categorize if no category provided
      let finalCategoryId = category_id;
      if (!finalCategoryId) {
        const autoCategory = await categorizationEngine.categorizeTransaction({
          description,
          merchant,
          amount,
          type
        }, user_id);
        
        if (autoCategory) {
          finalCategoryId = autoCategory.id;
        }
      }

      processedTransactions.push({
        user_id,
        account_id,
        category_id: finalCategoryId,
        amount,
        description,
        merchant,
        date,
        type,
        reference,
        metadata: metadata || {}
      });
    }

    const { data: createdTransactions, error } = await supabase
      .from('transactions')
      .insert(processedTransactions)
      .select(`
        *,
        accounts (
          id,
          name,
          type,
          institution
        ),
        categories (
          id,
          name,
          color,
          icon
        )
      `);

    if (error) {
      return res.status(500).json({ error: 'Failed to create transactions' });
    }

    res.status(201).json({
      transactions: createdTransactions,
      count: createdTransactions.length
    });

  } catch (error) {
    console.error('Bulk create transactions error:', error);
    res.status(500).json({ error: 'Failed to create transactions' });
  }
});

/**
 * POST /api/transactions/:id/categorize
 * Manually categorize a transaction
 */
router.post('/:id/categorize', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;
    const { category_id } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    // Get transaction details for learning
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update transaction category
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({ category_id })
      .eq('id', id)
      .eq('user_id', user_id)
      .select(`
        *,
        accounts (
          id,
          name,
          type,
          institution
        ),
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update transaction category' });
    }

    // Learn from this categorization
    await learningSystem.learnFromCategorization({
      description: transaction.description,
      merchant: transaction.merchant,
      amount: transaction.amount,
      type: transaction.type,
      category_id,
      user_id
    });

    res.json(updatedTransaction);

  } catch (error) {
    console.error('Categorize transaction error:', error);
    res.status(500).json({ error: 'Failed to categorize transaction' });
  }
});

/**
 * POST /api/transactions/auto-categorize
 * Auto-categorize uncategorized transactions
 */
router.post('/auto-categorize', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { limit = 100 } = req.body;

    // Get uncategorized transactions
    const { data: uncategorizedTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .is('category_id', null)
      .limit(limit);

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch uncategorized transactions' });
    }

    const categorizedResults = [];

    // Categorize each transaction
    for (const transaction of uncategorizedTransactions) {
      const category = await categorizationEngine.categorizeTransaction({
        description: transaction.description,
        merchant: transaction.merchant,
        amount: transaction.amount,
        type: transaction.type
      }, user_id);

      if (category) {
        // Update transaction
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ category_id: category.id })
          .eq('id', transaction.id);

        if (!updateError) {
          categorizedResults.push({
            transaction_id: transaction.id,
            category_id: category.id,
            category_name: category.name,
            confidence: category.confidence
          });
        }
      }
    }

    res.json({
      processed: categorizedResults.length,
      total: uncategorizedTransactions.length,
      results: categorizedResults
    });

  } catch (error) {
    console.error('Auto-categorize error:', error);
    res.status(500).json({ error: 'Failed to auto-categorize transactions' });
  }
});

/**
 * GET /api/transactions/analytics
 * Get transaction analytics and insights
 */
router.get('/analytics', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { 
      start_date, 
      end_date, 
      group_by = 'category',
      type = 'expense'
    } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        amount,
        date,
        type,
        categories (
          id,
          name,
          color
        )
      `)
      .eq('user_id', user_id)
      .eq('type', type);

    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch analytics data' });
    }

    // Process analytics
    const analytics = {
      total_amount: 0,
      transaction_count: transactions.length,
      category_breakdown: {},
      monthly_trends: {},
      top_merchants: {}
    };

    transactions.forEach(transaction => {
      analytics.total_amount += parseFloat(transaction.amount);

      // Category breakdown
      const categoryName = transaction.categories?.name || 'Uncategorized';
      if (!analytics.category_breakdown[categoryName]) {
        analytics.category_breakdown[categoryName] = {
          amount: 0,
          count: 0,
          color: transaction.categories?.color
        };
      }
      analytics.category_breakdown[categoryName].amount += parseFloat(transaction.amount);
      analytics.category_breakdown[categoryName].count += 1;

      // Monthly trends
      const month = transaction.date.substring(0, 7); // YYYY-MM
      if (!analytics.monthly_trends[month]) {
        analytics.monthly_trends[month] = 0;
      }
      analytics.monthly_trends[month] += parseFloat(transaction.amount);
    });

    res.json(analytics);

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;
