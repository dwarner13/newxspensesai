/**
 * Category Management API Routes
 * 
 * Handles category CRUD operations and management
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/categories
 * Get user's categories (including system categories)
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { include_system = true, parent_id } = req.query;

    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (include_system === 'true') {
      query = query.or(`user_id.eq.${user_id},is_system.eq.true`);
    } else {
      query = query.eq('user_id', user_id);
    }

    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data: categories, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const {
      name,
      description,
      color,
      icon,
      parent_id,
      sort_order
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        user_id,
        name,
        description,
        color: color || '#3B82F6',
        icon,
        parent_id,
        sort_order: sort_order || 0
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Category with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to create category' });
    }

    res.status(201).json(category);

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/categories/:id
 * Update a category
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;
    const updateData = req.body;

    // Remove user_id from update data if present
    delete updateData.user_id;
    delete updateData.is_system; // Prevent modification of system categories

    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Category with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to update category' });
    }

    res.json(category);

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;

    // Check if category is a system category
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('is_system')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.is_system) {
      return res.status(403).json({ error: 'Cannot delete system categories' });
    }

    // Check if category has transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (transactionError) {
      return res.status(500).json({ error: 'Failed to check category usage' });
    }

    if (transactions.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete category with existing transactions. Please reassign transactions first.' 
      });
    }

    // Check if category has subcategories
    const { data: subcategories, error: subcategoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', id)
      .limit(1);

    if (subcategoryError) {
      return res.status(500).json({ error: 'Failed to check subcategories' });
    }

    if (subcategories.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete category with subcategories. Please delete subcategories first.' 
      });
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete category' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * POST /api/categories/:id/reassign
 * Reassign transactions from one category to another
 */
router.post('/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;
    const { new_category_id } = req.body;

    if (!new_category_id) {
      return res.status(400).json({ error: 'New category ID is required' });
    }

    // Verify both categories exist and belong to user
    const { data: categories, error: fetchError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', [id, new_category_id])
      .or(`user_id.eq.${user_id},is_system.eq.true`);

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to verify categories' });
    }

    if (categories.length !== 2) {
      return res.status(404).json({ error: 'One or both categories not found' });
    }

    // Reassign transactions
    const { data: transactions, error: updateError } = await supabase
      .from('transactions')
      .update({ category_id: new_category_id })
      .eq('category_id', id)
      .eq('user_id', user_id)
      .select('id');

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reassign transactions' });
    }

    res.json({
      success: true,
      reassigned_count: transactions.length,
      message: `Reassigned ${transactions.length} transactions to new category`
    });

  } catch (error) {
    console.error('Reassign transactions error:', error);
    res.status(500).json({ error: 'Failed to reassign transactions' });
  }
});

/**
 * GET /api/categories/:id/usage
 * Get category usage statistics
 */
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;
    const { start_date, end_date } = req.query;

    // Get category info
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${user_id},is_system.eq.true`)
      .single();

    if (categoryError) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Build transaction query
    let transactionQuery = supabase
      .from('transactions')
      .select('amount, date, type')
      .eq('category_id', id)
      .eq('user_id', user_id);

    if (start_date) {
      transactionQuery = transactionQuery.gte('date', start_date);
    }
    if (end_date) {
      transactionQuery = transactionQuery.lte('date', end_date);
    }

    const { data: transactions, error: transactionError } = await transactionQuery;

    if (transactionError) {
      return res.status(500).json({ error: 'Failed to fetch transaction data' });
    }

    // Calculate usage statistics
    const usage = {
      category,
      total_transactions: transactions.length,
      total_amount: 0,
      income_amount: 0,
      expense_amount: 0,
      monthly_breakdown: {},
      type_breakdown: {}
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      usage.total_amount += amount;

      if (transaction.type === 'income') {
        usage.income_amount += amount;
      } else if (transaction.type === 'expense') {
        usage.expense_amount += amount;
      }

      // Monthly breakdown
      const month = transaction.date.substring(0, 7); // YYYY-MM
      if (!usage.monthly_breakdown[month]) {
        usage.monthly_breakdown[month] = { amount: 0, count: 0 };
      }
      usage.monthly_breakdown[month].amount += amount;
      usage.monthly_breakdown[month].count += 1;

      // Type breakdown
      if (!usage.type_breakdown[transaction.type]) {
        usage.type_breakdown[transaction.type] = { amount: 0, count: 0 };
      }
      usage.type_breakdown[transaction.type].amount += amount;
      usage.type_breakdown[transaction.type].count += 1;
    });

    res.json(usage);

  } catch (error) {
    console.error('Get category usage error:', error);
    res.status(500).json({ error: 'Failed to get category usage' });
  }
});

/**
 * POST /api/categories/reorder
 * Reorder categories
 */
router.post('/reorder', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { category_orders } = req.body; // Array of { id, sort_order }

    if (!Array.isArray(category_orders)) {
      return res.status(400).json({ error: 'Category orders array is required' });
    }

    // Update each category's sort order
    const updates = category_orders.map(({ id, sort_order }) => 
      supabase
        .from('categories')
        .update({ sort_order })
        .eq('id', id)
        .eq('user_id', user_id)
    );

    const results = await Promise.all(updates);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      return res.status(500).json({ error: 'Failed to update some categories' });
    }

    res.json({ success: true, message: 'Categories reordered successfully' });

  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

/**
 * GET /api/categories/suggestions
 * Get category suggestions based on transaction patterns
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { description, merchant, amount, type } = req.query;

    if (!description) {
      return res.status(400).json({ error: 'Description is required for suggestions' });
    }

    // Get similar transactions and their categories
    const { data: similarTransactions, error } = await supabase
      .from('transactions')
      .select(`
        description,
        merchant,
        amount,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('user_id', user_id)
      .not('category_id', 'is', null)
      .ilike('description', `%${description}%`)
      .limit(10);

    if (error) {
      return res.status(500).json({ error: 'Failed to get suggestions' });
    }

    // Count category frequency
    const categoryCounts = {};
    similarTransactions.forEach(transaction => {
      if (transaction.categories) {
        const categoryId = transaction.categories.id;
        if (!categoryCounts[categoryId]) {
          categoryCounts[categoryId] = {
            category: transaction.categories,
            count: 0,
            confidence: 0
          };
        }
        categoryCounts[categoryId].count += 1;
      }
    });

    // Calculate confidence scores
    const totalSimilar = similarTransactions.length;
    Object.values(categoryCounts).forEach(item => {
      item.confidence = item.count / totalSimilar;
    });

    // Sort by confidence and count
    const suggestions = Object.values(categoryCounts)
      .sort((a, b) => b.confidence - a.confidence || b.count - a.count)
      .slice(0, 5);

    res.json({ suggestions });

  } catch (error) {
    console.error('Get category suggestions error:', error);
    res.status(500).json({ error: 'Failed to get category suggestions' });
  }
});

module.exports = router;
