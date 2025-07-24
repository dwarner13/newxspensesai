import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
};

interface EmailData {
  type: 'badge_earned' | 'streak_milestone' | 'weekly_progress' | 'goal_completed' | 'xp_milestone';
  user_email: string;
  user_name: string;
  data: {
    badge_name?: string;
    xp_earned?: number;
    streak_days?: number;
    goal_name?: string;
    progress_percent?: number;
    level_reached?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailData = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate email content based on type
    const emailContent = generateEmailContent(emailData);
    
    // Send email using Resend API (you can replace with your preferred service)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'XspensesAI <achievements@xspensesai.com>',
        to: [emailData.user_email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

function generateEmailContent(emailData: EmailData) {
  const { type, user_name, data } = emailData;
  
  switch (type) {
    case 'badge_earned':
      return {
        subject: `🏆 New Achievement: ${data.badge_name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0284c7; margin-bottom: 10px;">🏆 Congratulations ${user_name}!</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">You've earned a new badge!</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h3 style="font-size: 24px; margin-bottom: 10px; color: #92400e;">${data.badge_name}</h3>
              <p style="color: #78350f; font-size: 18px; margin-bottom: 15px;">+${data.xp_earned} XP Earned!</p>
              <p style="color: #78350f;">Keep up the amazing work on your financial journey!</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://xspensesai.com/badges" style="background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View All Badges</a>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>Keep scanning receipts and tracking expenses to unlock more achievements!</p>
              <p style="margin-top: 20px;">
                <a href="https://xspensesai.com" style="color: #0284c7;">Open XspensesAI</a> | 
                <a href="https://xspensesai.com/settings" style="color: #6b7280;">Unsubscribe</a>
              </p>
            </div>
          </div>
        `
      };
      
    case 'streak_milestone':
      return {
        subject: `🔥 ${data.streak_days}-Day Streak Achievement!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ea580c; margin-bottom: 10px;">🔥 You're on Fire ${user_name}!</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">${data.streak_days} days in a row!</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #fed7aa 0%, #fb923c 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h3 style="font-size: 32px; margin-bottom: 10px; color: #9a3412;">🔥 ${data.streak_days} Days</h3>
              <p style="color: #9a3412; font-size: 18px; margin-bottom: 15px;">+${data.xp_earned} Streak Bonus XP!</p>
              <p style="color: #9a3412;">Your consistency is building great financial habits!</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://xspensesai.com/scan-receipt" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Keep Your Streak Going!</a>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>Don't break the streak! Upload a receipt today to keep your momentum going.</p>
            </div>
          </div>
        `
      };
      
    case 'weekly_progress':
      return {
        subject: `📊 Weekly Progress Update - ${data.progress_percent}% Complete!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0284c7; margin-bottom: 10px;">📊 Great Progress ${user_name}!</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">You're ${data.progress_percent}% towards your weekly goal!</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-bottom: 10px;">${data.goal_name}</h3>
                <div style="background: #1e40af; height: 8px; border-radius: 4px; width: ${data.progress_percent}%; margin: 0 auto;"></div>
                <p style="color: #1e40af; margin-top: 10px; font-weight: bold;">${data.progress_percent}% Complete</p>
              </div>
              <p style="color: #1e40af; text-align: center;">Keep going! You're making excellent progress on your financial goals.</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://xspensesai.com" style="background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Continue Progress</a>
            </div>
          </div>
        `
      };
      
    case 'goal_completed':
      return {
        subject: `🎉 Goal Completed: ${data.goal_name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin-bottom: 10px;">🎉 Congratulations ${user_name}!</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">You've completed your goal!</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h3 style="font-size: 24px; margin-bottom: 10px; color: #065f46;">✅ ${data.goal_name}</h3>
              <p style="color: #065f46; font-size: 18px; margin-bottom: 15px;">+${data.xp_earned} Completion Bonus!</p>
              <p style="color: #065f46;">You're building amazing financial discipline!</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://xspensesai.com/goals" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Set New Goals</a>
            </div>
          </div>
        `
      };
      
    case 'xp_milestone':
      return {
        subject: `⭐ Level Up! You've reached Level ${data.level_reached}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin-bottom: 10px;">⭐ Level Up ${user_name}!</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">Welcome to Level ${data.level_reached}!</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h3 style="font-size: 48px; margin-bottom: 10px; color: #5b21b6;">⭐</h3>
              <h3 style="font-size: 32px; margin-bottom: 10px; color: #5b21b6;">Level ${data.level_reached}</h3>
              <p style="color: #5b21b6; font-size: 18px; margin-bottom: 15px;">Total XP: ${data.xp_earned}</p>
              <p style="color: #5b21b6;">Your financial mastery continues to grow!</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://xspensesai.com/badges" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Progress</a>
            </div>
          </div>
        `
      };
      
    default:
      return {
        subject: '🎯 XspensesAI Achievement Update',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0284c7;">Great job ${user_name}!</h1>
            <p>You've made progress on your financial journey with XspensesAI!</p>
            <a href="https://xspensesai.com" style="background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Dashboard</a>
          </div>
        `
      };
  }
}