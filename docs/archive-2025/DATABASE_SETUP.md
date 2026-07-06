# 🗄️ Database Setup Guide

## Quick Setup (Recommended)

### Step 1: Run the Basic Setup
1. Go to your **Supabase Dashboard**
2. Click **"SQL Editor"** in the left sidebar
3. Copy and paste the contents of `database-setup.sql`
4. Click **"Run"**

This will create all the basic tables and security policies you need to get started.

### Step 2: Verify Setup
After running the SQL, you should see:
- ✅ Tables created: `conversations`, `messages`, `profiles`, etc.
- ✅ Security policies enabled
- ✅ Storage buckets created
- ✅ Success message: "Database setup completed successfully! 🎉"

## 🔧 What This Sets Up

### Core Tables
- **conversations**: Chat conversations
- **messages**: Individual messages with redaction support
- **profiles**: User profile information
- **audit_logs**: Compliance and tracking
- **notifications**: User notifications
- **usage_logs**: Cost tracking
- **tool_calls**: Tool execution tracking

### Security Features
- **Row Level Security (RLS)**: Users can only see their own data
- **Storage Policies**: Secure file uploads
- **Audit Logging**: Track all user actions

### Storage Buckets
- **exports**: User data exports
- **uploads**: File uploads
- **reports**: Generated reports

## 🚀 Next Steps

After running the database setup:

1. **Test the connection** in your app
2. **Deploy to Netlify** using the deployment guide
3. **Add environment variables** in Netlify dashboard
4. **Test your bot** at the deployed URL

## 🆘 Troubleshooting

### Common Issues

**"Permission denied" errors:**
- Make sure you're running as the project owner
- Check that RLS policies are enabled

**"Table already exists" warnings:**
- These are normal - the script uses `IF NOT EXISTS`
- Your database is already partially set up

**Storage bucket errors:**
- Check that storage is enabled in your Supabase project
- Verify bucket policies are created

### Need Help?
- Check Supabase logs in the dashboard
- Verify your project is active
- Make sure you have the correct permissions

Your database is now ready for the Prime Agent Kernel! 🎉
