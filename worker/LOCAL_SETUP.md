# 🚀 Local Development Setup - Quick Fix

## Problem
You're seeing `ENOTFOUND redis.railway.internal` error because the worker is trying to connect to Railway's internal Redis, which only works in production.

## ✅ Solution

### Option 1: Run Without Redis (Quickest - No Queue Support)
If you don't need queue functionality for testing:

1. **Unset the REDIS_URL environment variable:**
   ```bash
   # Windows Command Prompt
   set REDIS_URL=
   
   # Windows PowerShell
   $env:REDIS_URL=""
   
   # Linux/Mac
   unset REDIS_URL
   ```

2. **Or create a `.env` file in the `worker` directory without REDIS_URL:**
   ```bash
   cd worker
   # Copy the example and comment out REDIS_URL
   cp env.example .env
   ```
   
   Then edit `.env` and remove or comment out the `REDIS_URL` line.

3. **Restart the worker:**
   ```bash
   npm run dev
   ```

The worker will run without queue support but all other features will work.

---

### Option 2: Run With Local Redis (Recommended for Full Testing)

#### Using Docker (Easiest):
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

#### Using Windows:
1. Download from: https://github.com/redis/redis/releases
2. Install and start Redis service
3. Or use WSL2 with Docker

#### After Redis is Running:

1. **Create `.env` file in the `worker` directory:**
   ```bash
   cd worker
   cp env.example .env
   ```

2. **Edit `.env` and set:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. **Restart the worker:**
   ```bash
   npm run dev
   ```

---

## 🔍 Verify Setup

Once the worker starts, you should see:
- ✅ `Redis connected successfully` (if using Redis)
- ✅ `Worker server started` 
- ❌ **No more** `ENOTFOUND redis.railway.internal` errors

Visit: `http://localhost:8080/healthz` to check health status.

---

## 📝 What Changed?

I've updated two files to handle Redis connection issues gracefully:

1. **`worker/src/config.ts`**: Now validates Redis URLs and provides helpful warnings
2. **`worker/src/queue.ts`**: Better error handling with lazy connection and retry logic

The worker will now:
- Start successfully even if Redis is unavailable
- Show clear warnings about missing/invalid Redis configuration
- Continue working for non-queue features

---

## 🚢 Production Deployment

For Railway deployment, the `REDIS_URL` will automatically be set to `redis.railway.internal` and will work correctly in that environment. These changes only affect local development.

---

## 📚 Need More Help?

- Check `worker/SETUP_GUIDE.md` for comprehensive setup instructions
- Check `worker/README.md` for full documentation
- Review `worker/env.example` for all configuration options

