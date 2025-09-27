# 🚀 Prime Agent Kernel Deployment Guide

## Quick Deploy to Netlify

### Method 1: One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/dwarner13/newxspensesai)

### Method 2: Manual Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy Prime Agent Kernel"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Select your repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

4. **Set Environment Variables**
   Add these in Netlify Site Settings > Environment Variables:

   **Required:**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ENCRYPTION_MASTER_KEY=your_32_char_key
   ```

   **Optional (for full features):**
   ```
   STRIPE_SECRET_KEY=your_stripe_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   VITE_STRIPE_PUBLISHABLE_KEY=your_publishable_key
   SENTRY_DSN=your_sentry_dsn
   ```

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete
   - Your bot will be live!

## 🛠️ Pre-Deployment Checklist

### Database Setup
1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Run the SQL migrations:
     ```sql
     -- Run these in order:
     -- 1. supabase/schema.step1.sql
     -- 2. supabase/schema.step2.sql
     -- 3. supabase/schema.step3-enhanced.sql
     -- 4. supabase/schema.step4-enhanced.sql
     -- 5. supabase/schema.step5-production.sql
     -- 6. supabase/schema.step6-production.sql
     -- 7. supabase/schema.step7-security.sql
     ```

2. **Enable Extensions**
   ```sql
   -- Enable required extensions
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```

### API Keys Setup
1. **OpenAI API Key**
   - Get from [platform.openai.com](https://platform.openai.com)
   - Add to environment variables

2. **Stripe Keys** (if using billing)
   - Get from [dashboard.stripe.com](https://dashboard.stripe.com)
   - Add webhook endpoint: `https://your-app.netlify.app/.netlify/functions/billing-webhooks-enhanced`

### Security Setup
1. **Generate Encryption Key**
   ```bash
   # Generate a 32-character encryption key
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

2. **Configure CORS**
   - Add your Netlify domain to Supabase CORS settings
   - Update `ALLOWED_ORIGINS` environment variable

## 🎯 Post-Deployment

### Test Your Deployment
1. **Basic Functionality**
   - Visit your Netlify URL
   - Try the chat interface
   - Test tool execution

2. **Advanced Features**
   - Test voice interface (if enabled)
   - Test team collaboration
   - Test knowledge pack management

### Monitor Your Deployment
1. **Netlify Dashboard**
   - Check build logs
   - Monitor function logs
   - View analytics

2. **Supabase Dashboard**
   - Monitor database performance
   - Check authentication logs
   - Review API usage

## 🔧 Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version (should be 18+)
- Verify all dependencies are installed
- Check for TypeScript errors

**Function Errors:**
- Verify environment variables are set
- Check function logs in Netlify dashboard
- Ensure Supabase connection is working

**Database Issues:**
- Verify Supabase project is active
- Check RLS policies are enabled
- Ensure migrations ran successfully

### Getting Help
- Check Netlify function logs
- Review Supabase logs
- Test locally first: `npm run dev`

## 🚀 Production Optimization

### Performance
- Enable Netlify Edge Functions for faster response
- Configure CDN caching
- Optimize bundle size

### Security
- Enable Netlify's security headers
- Configure rate limiting
- Set up monitoring

### Monitoring
- Add Sentry for error tracking
- Configure uptime monitoring
- Set up performance monitoring

## 📊 Analytics Setup

### Optional Analytics
1. **Google Analytics**
   - Add GA4 tracking code
   - Configure conversion tracking

2. **Custom Analytics**
   - Use the built-in telemetry system
   - Monitor user engagement
   - Track feature usage

Your Prime Agent Kernel is now ready for production! 🎉
