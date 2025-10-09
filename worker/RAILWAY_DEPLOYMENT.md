# 🚂 Railway Deployment Guide

## Current Issue
The healthcheck is failing because the worker requires environment variables that aren't configured in Railway.

## ✅ Required Environment Variables

Set these in your Railway project settings:

### 1. Supabase Configuration (REQUIRED)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PUBLIC_ANON_KEY=your_anon_key
```

**Where to find these:**
- Go to your Supabase project dashboard
- Click on the gear icon (Project Settings)
- Navigate to API section
- Copy the URL and keys

### 2. Redis Configuration (Automatic in Railway)
```bash
REDIS_URL=redis://redis.railway.internal:6379
```

**Note:** Railway automatically provides this if you have a Redis service in your project. If you don't have Redis:
1. Click "New" in Railway dashboard
2. Select "Database" → "Add Redis"
3. Railway will automatically link it

### 3. OCR Configuration (Optional - defaults to Tesseract)
```bash
OCR_ENGINE=tesseract
# Optional: If using OCR.space
OCRSPACE_API_KEY=your_ocr_space_api_key
```

**Get OCR.space API key (optional):**
- Visit: https://ocr.space/ocrapi
- Sign up for free tier
- Copy API key

### 4. Worker Configuration (Optional - has defaults)
```bash
PORT=8080
WORKER_CONCURRENCY=5
LOG_LEVEL=info
DELETE_ORIGINAL_ON_SUCCESS=true
HEALTH_CHECK_INTERVAL=30000
```

## 🚀 How to Set Environment Variables in Railway

### Method 1: Railway Dashboard
1. Open your Railway project
2. Click on your worker service
3. Go to the "Variables" tab
4. Click "New Variable"
5. Add each variable one by one

### Method 2: Railway CLI
```bash
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
railway variables set SUPABASE_PUBLIC_ANON_KEY=your_key
railway variables set OCR_ENGINE=tesseract
```

## 🔍 Troubleshooting

### Issue: "Supabase URL required"
**Solution:** Set the SUPABASE_URL variable in Railway

### Issue: "Redis connection failed"
**Solutions:**
1. Add a Redis database in Railway dashboard
2. Or set `REDIS_URL=""` to run without queue support

### Issue: "OCR processing failed"
**Solutions:**
1. Keep default `OCR_ENGINE=tesseract` (no API key needed)
2. Or set `OCRSPACE_API_KEY` if using OCR.space

### Issue: Healthcheck still failing
**Check the logs:**
```bash
railway logs
```

Look for specific error messages about missing configuration.

## 📊 Verify Deployment

Once configured, your worker should:
1. ✅ Build successfully (already working)
2. ✅ Pass healthcheck at `/healthz`
3. ✅ Show "Worker server started" in logs
4. ✅ Show Redis connection status in logs

Test the deployment:
```bash
curl https://your-worker.railway.app/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": "2025-10-09T...",
  "services": {
    "supabase": "connected",
    "redis": "connected"
  }
}
```

## 🔄 What I Fixed

1. **Build Process**: Now properly compiles TypeScript (`tsc`)
2. **Module System**: Fixed ES modules configuration
3. **TypeScript**: Moved to production dependencies
4. **Redis**: Made optional with better error handling
5. **OCR**: Made OCR.space API key optional, defaults to Tesseract

## 📝 Next Steps

1. Set the required environment variables in Railway
2. Redeploy (Railway will auto-deploy when you update variables)
3. Check logs: `railway logs`
4. Verify healthcheck passes
5. Test the `/healthz` endpoint

## 🆘 Still Having Issues?

Check these:
- [ ] All required environment variables are set
- [ ] Supabase credentials are correct
- [ ] Redis service is added (or disabled)
- [ ] Railway build logs show successful compilation
- [ ] Runtime logs show what's failing

Common error patterns:
- "Invalid Supabase URL" → Check SUPABASE_URL format
- "getaddrinfo ENOTFOUND" → Check Redis configuration
- "OCR.space API key required" → Set OCR_ENGINE=tesseract

