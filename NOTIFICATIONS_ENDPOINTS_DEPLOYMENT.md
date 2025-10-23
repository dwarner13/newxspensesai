# Notifications Endpoints — Deployment Guide

**Status:** ✅ **READY FOR DEPLOYMENT**  
**Date:** October 19, 2025

---

## 📋 Overview

Three Netlify functions power the client-side notification system:

| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `notifications-get` | GET | Fetch notifications with filtering | `{ items, unreadCount, total }` |
| `notifications-read` | POST | Mark single/all as read | `{ updated }` |
| `notifications-orchestrate` | POST | Delegate to Prime | `{ orchestrated, delegations, summary }` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Component                          │
│                  (NotificationBell, etc.)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ useNotifications() hook
                     └─ src/lib/notifications-client.ts
                        │
                        ├─ fetchNotifications(token)
                        ├─ markNotificationRead(token, id)
                        ├─ markAllNotificationsRead(token)
                        └─ orchestrateNotifications(token, items)
                        │
                        ▼
        Bearer Token Auth (from session.access_token)
                        │
        ┌───────────────┼───────────────────────┐
        │               │                       │
        ▼               ▼                       ▼
    GET /notify      POST /notify            POST /notify
    -get             -read                   -orchestrate
        │               │                       │
        └───────────────┼───────────────────────┘
                        │
            (All extract user_id from bearer token)
                        │
                        ▼
        ┌──────────────────────────────────┐
        │  Supabase DB (notifications)     │
        │  - RLS policies enforce user_id  │
        │  - user_id derived from token    │
        └──────────────────────────────────┘
```

---

## 📦 Files to Deploy

```
netlify/functions/
  ├─ notifications-get.ts          (NEW)
  ├─ notifications-read.ts         (NEW)
  ├─ notifications-orchestrate.ts  (NEW)
  └─ _shared/
     ├─ supabase.ts               (existing)
     └─ safeLog.ts                (existing)

src/lib/
  ├─ notifications-client.ts       (NEW)
  └─ notify.ts                     (existing)
```

---

## 🚀 Deployment Steps

### 1. **Deploy Netlify Functions**

```bash
# Verify files exist
ls -la netlify/functions/notifications-*.ts
# Output:
#   notifications-get.ts
#   notifications-read.ts
#   notifications-orchestrate.ts

# Deploy to Netlify (via `netlify deploy` or CI/CD)
netlify deploy --prod
```

### 2. **Verify Environment Variables**

Check `netlify.toml` and Netlify dashboard for:

```env
# .env.local (development)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Netlify Environment (production)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # For batch operations (optional)
```

### 3. **Test Each Endpoint**

```bash
# Get session token from browser console:
# In browser: copy(JSON.parse(localStorage.getItem('sb-xxx-auth-token')).access_token)

TOKEN="your_bearer_token_here"

# Test: Fetch notifications
curl -X GET "https://your-site.netlify.app/.netlify/functions/notifications-get?limit=10&read=false" \
  -H "Authorization: Bearer $TOKEN"
# Expected: { "ok": true, "items": [...], "unreadCount": 5, "total": 12 }

# Test: Mark single as read
curl -X POST "https://your-site.netlify.app/.netlify/functions/notifications-read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "notification-uuid"}'
# Expected: { "ok": true, "updated": 1 }

# Test: Mark all as read
curl -X POST "https://your-site.netlify.app/.netlify/functions/notifications-read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"all": true}'
# Expected: { "ok": true, "updated": 5 }

# Test: Orchestrate (requires at least one notification)
curl -X POST "https://your-site.netlify.app/.netlify/functions/notifications-orchestrate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "notif-1",
        "user_id": "user-uuid",
        "employee": "crystal-analytics",
        "priority": "critical",
        "title": "Budget Alert",
        "description": "Dining 95% of limit",
        "href": "/budgets/dining",
        "payload": null,
        "read_at": null,
        "created_at": "2024-10-19T12:00:00Z"
      }
    ]
  }'
# Expected: { "ok": true, "orchestrated": 1, "delegations": ["prime-boss"], "summary": "..." }
```

---

## 🔑 Authentication Flow

### How Bearer Token → user_id Works

1. **Client sends token:**
   ```typescript
   const token = session.access_token; // from Supabase auth
   fetch(endpoint, {
     headers: { Authorization: `Bearer ${token}` }
   });
   ```

2. **Function extracts token:**
   ```typescript
   const authHeader = event.headers["authorization"] || "";
   const token = authHeader.replace(/^Bearer\s+/i, "");
   ```

3. **Function verifies with Supabase:**
   ```typescript
   const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
   const { data: { user }, error } = await supabase.auth.getUser(token);
   const user_id = user?.id; // Now we have user_id
   ```

4. **All DB queries scoped to user:**
   ```typescript
   await supabase
     .from("notifications")
     .select("*")
     .eq("user_id", user_id)  // ← RLS enforced by this
   ```

---

## 📋 Function-by-Function Details

### 1. notifications-get.ts

**Endpoint:** `GET /.netlify/functions/notifications-get`

**Query Parameters:**

```typescript
?employee=crystal-analytics    // Filter by employee
&priority=critical             // Filter by priority
&read=false                    // false=unread, true=read, omit=all
&limit=50                      // Default 50, max 200
&offset=0                      // Pagination offset
```

**Response:**

```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "employee": "crystal-analytics",
      "priority": "critical",
      "title": "Budget Alert",
      "description": "Dining category 95% spent",
      "href": "/budgets/dining",
      "payload": { "category": "Dining", "spent": 450, "limit": 500 },
      "read_at": null,
      "created_at": "2024-10-19T12:00:00Z"
    }
  ],
  "unreadCount": 5,
  "total": 12
}
```

**Error Responses:**

```json
{ "ok": false, "error": "Missing authorization token" }              // 401
{ "ok": false, "error": "Invalid token" }                            // 401
{ "ok": false, "error": "Invalid query parameters" }                 // 400
{ "ok": false, "error": "Failed to fetch notifications" }            // 500
```

---

### 2. notifications-read.ts

**Endpoint:** `POST /.netlify/functions/notifications-read`

**Request Bodies:**

```json
// Mark single as read
{ "id": "notification-uuid" }

// Mark all unread as read
{ "all": true }
```

**Response:**

```json
{
  "ok": true,
  "updated": 1
}
```

**Error Responses:**

```json
{ "ok": false, "error": "Missing authorization token" }              // 401
{ "ok": false, "error": "Invalid token" }                            // 401
{ "ok": false, "error": "Must provide either 'id' or 'all: true'" }  // 400
{ "ok": false, "error": "Notification not found" }                   // 404
{ "ok": false, "error": "Unauthorized" }                             // 403
{ "ok": false, "error": "Failed to mark notifications as read" }     // 500
```

---

### 3. notifications-orchestrate.ts

**Endpoint:** `POST /.netlify/functions/notifications-orchestrate`

**Request Body:**

```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "employee": "crystal-analytics",
      "priority": "critical",
      "title": "Budget Alert",
      "description": "Dining 95% of limit",
      "href": "/budgets/dining",
      "payload": null,
      "read_at": null,
      "created_at": "2024-10-19T12:00:00Z"
    }
  ]
}
```

**Response:**

```json
{
  "ok": true,
  "orchestrated": 1,
  "delegations": ["prime-boss"],
  "summary": "📋 **Orchestrated Notification Summary**\n\n🚨 **Critical (1)**\n  • Budget Alert: Dining 95% of limit\n\n👥 **By Employee**\n  • crystal-analytics: 1 notification"
}
```

**What Happens:**
1. Validates all items belong to authenticated user
2. Groups by priority and employee
3. Builds markdown summary
4. Inserts optional handoff record in `chat_handoffs` table
5. Returns orchestrated count and delegations

---

## 🔒 Security Checklist

- [x] Bearer token extracted from `Authorization` header
- [x] Token verified with `supabase.auth.getUser(token)`
- [x] user_id extracted from verified token
- [x] All DB queries scoped to user_id
- [x] Single-read operation verifies ownership (403 on mismatch)
- [x] Query parameters validated with Zod
- [x] Request body validated with Zod
- [x] Safe logging (no PII in logs)
- [x] HTTP methods validated (GET for fetch, POST for mutations)

---

## 🧪 Integration Test Script

Create `test-notifications.sh`:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="https://your-site.netlify.app/.netlify/functions"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <bearer_token>"
  echo "Get token from browser console:"
  echo '  copy(JSON.parse(localStorage.getItem("sb-xxx-auth-token")).access_token)'
  exit 1
fi

echo "🧪 Testing Notifications Endpoints"
echo "=================================="

# Test 1: Fetch notifications
echo -e "\n${YELLOW}Test 1: GET /notifications-get${NC}"
RESP=$(curl -s -X GET "$API_BASE/notifications-get?limit=5" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESP" | jq .
if echo "$RESP" | jq -e '.ok' > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

# Test 2: Fetch unread only
echo -e "\n${YELLOW}Test 2: GET /notifications-get?read=false${NC}"
RESP=$(curl -s -X GET "$API_BASE/notifications-get?read=false&limit=5" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESP" | jq .
if echo "$RESP" | jq -e '.ok' > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

# Test 3: Fetch by employee
echo -e "\n${YELLOW}Test 3: GET /notifications-get?employee=crystal-analytics${NC}"
RESP=$(curl -s -X GET "$API_BASE/notifications-get?employee=crystal-analytics&limit=5" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESP" | jq .
if echo "$RESP" | jq -e '.ok' > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

# Test 4: Mark all as read
echo -e "\n${YELLOW}Test 4: POST /notifications-read (all: true)${NC}"
RESP=$(curl -s -X POST "$API_BASE/notifications-read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"all": true}')
echo "$RESP" | jq .
if echo "$RESP" | jq -e '.ok' > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

echo -e "\n${GREEN}✓ Test suite complete${NC}"
```

Run:
```bash
chmod +x test-notifications.sh
./test-notifications.sh "your_token_here"
```

---

## 📊 Monitoring & Logging

All functions use `safeLog()` for structured logging:

```typescript
safeLog("notifications-get.success", {
  user_id,
  count: data?.length || 0,
  total: count,
  unreadCount: unreadCount || 0,
  filters: { employee, priority, read },
});
```

**View logs in Netlify:**
1. Dashboard → Functions → Select function
2. Filter by event name: `notifications-get.success`, `notifications-read.error`, etc.

---

## 🚨 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/missing token | Check bearer token in header |
| 403 Forbidden | Notification doesn't belong to user | Verify notification is owned by user |
| 404 Not Found | Notification deleted | Check notification exists in DB |
| 500 Server Error | DB query failed | Check Supabase connectivity & RLS policies |
| Empty items array | No notifications match filter | Create test notifications |

---

## ✅ Deployment Checklist

- [ ] All 3 functions deployed to Netlify
- [ ] Environment variables set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] `notifications` table exists in Supabase
- [ ] RLS policies enabled on `notifications` table
- [ ] Bearer token auth tested with real session token
- [ ] curl tests pass for all 3 endpoints
- [ ] Client code (`src/lib/notifications-client.ts`) deployed
- [ ] React components updated to use `useNotifications()` hook
- [ ] Logging visible in Netlify dashboard
- [ ] Error responses handled gracefully in UI
- [ ] NotificationBell component renders correctly
- [ ] Auto-polling works (check network tab)

---

**Status:** ✅ Ready for production deployment! 🎉





