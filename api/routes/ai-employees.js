/**
 * AI Employee Chat API Routes
 * 
 * Handles AI employee conversations and interactions
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { universalAIEmployeeManager } = require('../../src/lib/universalAIEmployeeConnection');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/ai-employees/chat
 * Chat with a specific AI employee
 */
router.post('/chat', async (req, res) => {
  try {
    const { employeeId, message, userContext, conversationHistory, smartRoute } = req.body;
    const { user_id } = req.headers;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    let response;

    if (smartRoute || !employeeId) {
      // Use smart routing to automatically select best employee
      response = await universalAIEmployeeManager.smartRoute(message, {
        user_id,
        ...userContext
      });
    } else {
      // Chat with specific employee
      response = await universalAIEmployeeManager.chatWithEmployee(employeeId, message, {
        user_id,
        ...userContext
      });
    }

    // Store conversation in database
    try {
      await supabase
        .from('ai_employee_conversations')
        .insert({
          user_id,
          employee_id: response.employee,
          user_message: message,
          ai_response: response.response,
          actions: response.actions,
          user_context: userContext || {},
          conversation_session: userContext?.sessionId
        });
    } catch (dbError) {
      console.log('Failed to store conversation:', dbError);
      // Continue without failing the request
    }

    res.json(response);

  } catch (error) {
    console.error('AI Employee chat error:', error);
    res.status(500).json({ 
      error: 'Chat failed', 
      details: error.message 
    });
  }
});

/**
 * GET /api/ai-employees
 * Get all available AI employees
 */
router.get('/', async (req, res) => {
  try {
    const employees = universalAIEmployeeManager.getAllEmployees();
    res.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

/**
 * GET /api/ai-employees/:id
 * Get specific AI employee information
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employee = universalAIEmployeeManager.getEmployee(id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee.getEmployeeInfo());
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to get employee' });
  }
});

/**
 * GET /api/ai-employees/specialty/:specialty
 * Get employees by specialty
 */
router.get('/specialty/:specialty', async (req, res) => {
  try {
    const { specialty } = req.params;
    const employees = universalAIEmployeeManager.getEmployeesBySpecialty(specialty);
    res.json({ employees });
  } catch (error) {
    console.error('Get employees by specialty error:', error);
    res.status(500).json({ error: 'Failed to get employees by specialty' });
  }
});

/**
 * GET /api/ai-employees/conversations
 * Get user's AI employee conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { employee_id, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('ai_employee_conversations')
      .select(`
        *,
        ai_employees (
          id,
          name,
          personality,
          specialty
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    const { data: conversations, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json({
      conversations,
      count: conversations.length,
      has_more: conversations.length === limit
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

/**
 * POST /api/ai-employees/feedback
 * Submit feedback for AI employee interaction
 */
router.post('/feedback', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { 
      employee_id, 
      conversation_id, 
      satisfaction_score, 
      feedback_text,
      interaction_type = 'feedback'
    } = req.body;

    if (!employee_id || !satisfaction_score) {
      return res.status(400).json({ error: 'Employee ID and satisfaction score are required' });
    }

    // Store feedback
    const { data: interaction, error } = await supabase
      .from('employee_interactions')
      .insert({
        user_id,
        employee_id,
        interaction_type,
        interaction_data: {
          conversation_id,
          satisfaction_score,
          feedback_text
        },
        satisfaction_score,
        feedback: feedback_text
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to store feedback' });
    }

    // Learn from feedback
    try {
      const employee = universalAIEmployeeManager.getEmployee(employee_id);
      if (employee) {
        employee.learnFromFeedback({
          satisfaction_score,
          feedback_text,
          timestamp: new Date().toISOString()
        });
      }
    } catch (learnError) {
      console.log('Failed to learn from feedback:', learnError);
    }

    res.json({ 
      success: true, 
      interaction_id: interaction.id,
      message: 'Feedback submitted successfully' 
    });

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * POST /api/ai-employees/clear-history
 * Clear conversation history for a specific employee
 */
router.post('/clear-history', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Clear in-memory history
    const employee = universalAIEmployeeManager.getEmployee(employee_id);
    if (employee) {
      employee.clearHistory();
    }

    // Optionally clear database history (uncomment if needed)
    // await supabase
    //   .from('ai_employee_conversations')
    //   .delete()
    //   .eq('user_id', user_id)
    //   .eq('employee_id', employee_id);

    res.json({ 
      success: true, 
      message: 'Conversation history cleared' 
    });

  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

/**
 * GET /api/ai-employees/analytics
 * Get AI employee usage analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    // Get conversation counts by employee
    const { data: conversations, error } = await supabase
      .from('ai_employee_conversations')
      .select('employee_id, created_at')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString());

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    // Get satisfaction scores
    const { data: interactions, error: interactionError } = await supabase
      .from('employee_interactions')
      .select('employee_id, satisfaction_score, created_at')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString());

    if (interactionError) {
      console.log('Failed to fetch interactions:', interactionError);
    }

    // Process analytics
    const employeeStats = {};
    
    conversations.forEach(conv => {
      if (!employeeStats[conv.employee_id]) {
        employeeStats[conv.employee_id] = {
          employee_id: conv.employee_id,
          conversation_count: 0,
          avg_satisfaction: 0,
          satisfaction_count: 0
        };
      }
      employeeStats[conv.employee_id].conversation_count++;
    });

    if (interactions) {
      interactions.forEach(interaction => {
        if (employeeStats[interaction.employee_id]) {
          employeeStats[interaction.employee_id].satisfaction_count++;
          employeeStats[interaction.employee_id].avg_satisfaction += interaction.satisfaction_score;
        }
      });

      // Calculate averages
      Object.values(employeeStats).forEach(stat => {
        if (stat.satisfaction_count > 0) {
          stat.avg_satisfaction = stat.avg_satisfaction / stat.satisfaction_count;
        }
      });
    }

    res.json({
      period,
      total_conversations: conversations.length,
      employee_stats: Object.values(employeeStats),
      most_used_employee: Object.values(employeeStats).reduce((max, stat) => 
        stat.conversation_count > max.conversation_count ? stat : max, 
        { conversation_count: 0 }
      )
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;
